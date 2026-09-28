import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sanitizeCareTeam, type CareTeam } from '@/lib/urgency';
import type { DueDateSource } from '@/lib/pregnancy';

export interface UserProfile {
  role: "mama" | "papa";
  name: string;
  /**
   * Semana completa. Con `dueDate` es un valor DERIVADO (useGestationalAge lo mantiene al día en
   * este store local); se conserva por compatibilidad con el código que aún lo lee.
   */
  week: number;
  /**
   * true si la semana no está confirmada (se omitió el registro o la pareja se unió sin semana).
   * Las reglas clínicas que dependen de la semana deben tratarla como desconocida.
   */
  weekUnknown?: boolean;
  /** Fecha probable de parto, día local "aaaa-mm-dd". Si existe, manda sobre `week`. */
  dueDate?: string;
  /** De dónde salió la FPP: ecografía, fecha de la última regla o estimada por la semana elegida a mano. */
  dueDateSource?: DueDateSource;
  location?: string;
  notes?: string;
  pregnancyId?: string;
  inviteCode?: string;
  comparisonTheme?: "frutas" | "geek";
}

/** Lo que eligió la persona: seguir al sistema o fijar claro/oscuro. */
export type ThemePreference = "system" | "light" | "dark";
/** Tema que se ve de verdad (con "system" depende de prefers-color-scheme). */
export type ResolvedTheme = "light" | "dark";

/** Clave antigua que escribía el interruptor de page.tsx: rastro de una elección explícita. */
export const LEGACY_THEME_KEY = "pandajr_theme";

export function isThemePreference(v: unknown): v is ThemePreference {
  return v === "system" || v === "light" || v === "dark";
}

/** Tema visible para una preferencia. Pura: el script de arranque de layout.tsx replica esta regla. */
export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

/**
 * Migración del estado antiguo (versión 0, solo `isDark`). `isDark: true` solo lo producía el
 * interruptor → oscuro. Si no, manda el rastro explícito `pandajr_theme`. Sin rastro → sistema
 * (el `false` por defecto no era una elección). El script de arranque de layout.tsx replica esta regla.
 */
export function migrateThemePreference(isDark: unknown, legacyChoice: string | null | undefined): ThemePreference {
  if (isDark === true) return "dark";
  if (legacyChoice === "dark" || legacyChoice === "light") return legacyChoice;
  return "system";
}

/** prefers-color-scheme del sistema; false fuera del navegador. Solo se llama en tiempo de ejecución. */
export function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try { return window.matchMedia("(prefers-color-scheme: dark)").matches; } catch { return false; }
}

function readLegacyThemeChoice(): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(LEGACY_THEME_KEY); } catch { return null; }
}

interface PandaState {
  profile: UserProfile;
  /** Equipo de salud (obstetra, hospital, número de emergencias). Persistido y compartido con la pareja. */
  careTeam: CareTeam;
  /** Preferencia de tema (persistida). "system" sigue a prefers-color-scheme en vivo (ThemeSync). */
  themePreference: ThemePreference;
  /** Tema visible ahora. Derivado (ThemeSync lo mantiene); no se persiste. */
  resolvedTheme: ResolvedTheme;
  /** Compatibilidad: `resolvedTheme === "dark"`. Derivado; no se persiste. */
  isDark: boolean;
  hasHydrated: boolean;

  // Acciones
  setProfile: (profile: Partial<UserProfile>) => void;
  /** Mezcla campos; un campo vacío o undefined se elimina. */
  setCareTeam: (partial: Partial<CareTeam>) => void;
  /** Elige sistema, claro u oscuro. ThemeSync aplica la clase `.dark` y escucha el sistema. */
  setThemePreference: (preference: ThemePreference) => void;
  /** Uso interno de ThemeSync (y de la rehidratación): fija el tema visible. */
  setResolvedTheme: (theme: ResolvedTheme) => void;
  /**
   * Compatibilidad con el interruptor de dos estados: fija explícitamente el contrario del tema
   * visible. Se retira cuando Ajustes tenga el control de tres estados.
   */
  toggleTheme: () => void;
  setHasHydrated: (state: boolean) => void;
}

type PersistedPandaState = Pick<PandaState, "profile" | "careTeam" | "themePreference">;

const resolvedPatch = (theme: ResolvedTheme) => ({ resolvedTheme: theme, isDark: theme === "dark" });

export const usePandaStore = create<PandaState>()(
  persist(
    (set) => ({
      profile: {
        role: "papa",
        name: "",
        week: 14,
        location: "",
        notes: ""
      },
      careTeam: {},
      themePreference: "system",
      resolvedTheme: "light",
      isDark: false,
      hasHydrated: false,

      setProfile: (updates) => set((state) => ({
        profile: { ...state.profile, ...updates }
      })),

      setCareTeam: (partial) => set((state) => ({
        careTeam: sanitizeCareTeam({ ...state.careTeam, ...partial })
      })),

      setThemePreference: (preference) => set(() => {
        if (!isThemePreference(preference)) return {};
        return { themePreference: preference, ...resolvedPatch(resolveTheme(preference, systemPrefersDark())) };
      }),

      setResolvedTheme: (theme) => set((state) =>
        state.resolvedTheme === theme && state.isDark === (theme === "dark") ? state : resolvedPatch(theme)
      ),

      toggleTheme: () => set((state) => {
        const next: ResolvedTheme = state.resolvedTheme === "dark" ? "light" : "dark";
        return { themePreference: next, ...resolvedPatch(next) };
      }),

      setHasHydrated: (state) => set({ hasHydrated: state })
    }),
    {
      name: 'pandajr-storage', // nombre en localStorage
      // v1: `isDark` (booleano) → `themePreference` (sistema/claro/oscuro).
      version: 1,
      partialize: (state): PersistedPandaState => ({
        profile: state.profile,
        careTeam: state.careTeam,
        themePreference: state.themePreference,
      }),
      migrate: (persisted, version): PersistedPandaState => {
        const old = (persisted && typeof persisted === "object" ? persisted : {}) as Partial<PersistedPandaState> & { isDark?: unknown };
        const { isDark, ...rest } = old;
        const themePreference = version < 1 || !isThemePreference(rest.themePreference)
          ? migrateThemePreference(isDark, readLegacyThemeChoice())
          : rest.themePreference;
        return { ...rest, themePreference } as PersistedPandaState;
      },
      // Mezcla superficial (como la de zustand) sin aceptar una preferencia de tema inválida.
      merge: (persisted, current) => {
        const p = (persisted && typeof persisted === "object" ? persisted : {}) as Partial<PandaState>;
        return { ...current, ...p, themePreference: isThemePreference(p.themePreference) ? p.themePreference : current.themePreference };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // Tema visible desde el primer render del cliente; ThemeSync aplica la clase y escucha cambios.
        if (state) state.setResolvedTheme(resolveTheme(state.themePreference, systemPrefersDark()));
      }
    }
  )
);
