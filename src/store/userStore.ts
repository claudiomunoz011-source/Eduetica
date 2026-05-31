import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AgeTheme = 'kid' | 'teen' | null;
export type AppLanguage = 'es' | 'de' | 'fr' | 'en';

export interface UserProfile {
  id: string;
  name: string;
  establishment: string;
  course: string;
  age: number;
  avatar: string;
  language: AppLanguage;
  selectedTopic: string | null;
  startedAt: string;
}

interface UserState {
  profile: UserProfile | null;
  theme: AgeTheme;
  language: AppLanguage;
  isRegistered: boolean;
  seenDilemmas: string[];
  customApiKey: string | null;
  
  // Actions
  setProfile: (profile: UserProfile) => void;
  setTheme: (age: number) => void;
  setLanguage: (lang: AppLanguage) => void;
  setSelectedTopic: (topic: string) => void;
  clearProfile: () => void;
  addSeenDilemma: (scenario: string) => void;
  clearSeenDilemmas: () => void;
  setCustomApiKey: (key: string | null) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      profile: null,
      theme: null,
      language: 'es',
      isRegistered: false,
      seenDilemmas: [],
      customApiKey: null,

      setProfile: (profile) => {
        const theme: AgeTheme = profile.age < 14 ? 'kid' : 'teen';
        set({ profile, theme, isRegistered: true, language: profile.language, seenDilemmas: [] });
      },

      setTheme: (age: number) => {
        const theme: AgeTheme = age < 14 ? 'kid' : 'teen';
        set({ theme });
      },

      setLanguage: (lang: AppLanguage) => {
        set({ language: lang });
        const profile = get().profile;
        if (profile) {
          set({ profile: { ...profile, language: lang } });
        }
      },

      setSelectedTopic: (topic: string) => {
        const profile = get().profile;
        if (profile) {
          set({ profile: { ...profile, selectedTopic: topic } });
        }
      },

      clearProfile: () => {
        set({ profile: null, theme: null, isRegistered: false, seenDilemmas: [] });
      },

      addSeenDilemma: (scenario) => {
        const current = get().seenDilemmas;
        if (!current.includes(scenario)) {
          set({ seenDilemmas: [...current, scenario] });
        }
      },

      clearSeenDilemmas: () => {
        set({ seenDilemmas: [] });
      },

      setCustomApiKey: (key) => {
        set({ customApiKey: key });
      },
    }),
    {
      name: 'edeuetica-user',
      skipHydration: true,
    }
  )
);
