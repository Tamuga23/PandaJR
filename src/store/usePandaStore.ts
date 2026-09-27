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

interface PandaState {
  profile: UserProfile;
  /** Equipo de salud (obstetra, hospital, número de emergencias). Persistido y compartido con la pareja. */
  careTeam: CareTeam;
  isDark: boolean;
  hasHydrated: boolean;
  
  // Acciones
  setProfile: (profile: Partial<UserProfile>) => void;
  /** Mezcla campos; un campo vacío o undefined se elimina. */
  setCareTeam: (partial: Partial<CareTeam>) => void;
  toggleTheme: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const usePandaStore = create<PandaState>()(
  persist(
    (set, get) => ({
      profile: {
        role: "papa",
        name: "",
        week: 14,
        location: "",
        notes: ""
      },
      careTeam: {},
      isDark: false,
      hasHydrated: false,

      setProfile: (updates) => set((state) => ({
        profile: { ...state.profile, ...updates }
      })),

      setCareTeam: (partial) => set((state) => ({
        careTeam: sanitizeCareTeam({ ...state.careTeam, ...partial })
      })),

      toggleTheme: () => set((state) => {
        const nextDark = !state.isDark;
        if (typeof window !== 'undefined') {
          if (nextDark) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }
        return { isDark: nextDark };
      }),

      setHasHydrated: (state) => set({ hasHydrated: state })
    }),
    {
      name: 'pandajr-storage', // nombre en localStorage
            onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        if (typeof window !== 'undefined') {
          if (state?.isDark) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }
      }
    }
  )
);
