import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  role: "mama" | "papa";
  name: string;
  week: number;
  location?: string;
  notes?: string;
  pregnancyId?: string;
  inviteCode?: string;
}

interface PandaState {
  profile: UserProfile;
  isDark: boolean;
  hasHydrated: boolean;
  
  // Acciones
  setProfile: (profile: Partial<UserProfile>) => void;
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
      isDark: false,
      hasHydrated: false,

      setProfile: (updates) => set((state) => ({
        profile: { ...state.profile, ...updates }
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
        // Aplicar el tema inmediatamente después de hidratar
        if (state?.isDark && typeof window !== 'undefined') {
          document.documentElement.classList.add("dark");
        }
      }
    }
  )
);
