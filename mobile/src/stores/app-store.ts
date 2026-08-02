import { create } from 'zustand';

interface AppState {
  isAuthenticated: boolean;
  isOnboarded: boolean;
  user: {
    id: string;
    email: string;
    displayName: string;
  } | null;
  activeSemesterId: string | null;

  setAuthenticated: (value: boolean) => void;
  setOnboarded: (value: boolean) => void;
  setUser: (user: AppState['user']) => void;
  setActiveSemesterId: (id: string | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isAuthenticated: false,
  isOnboarded: false,
  user: null,
  activeSemesterId: null,

  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setOnboarded: (value) => set({ isOnboarded: value }),
  setUser: (user) => set({ user }),
  setActiveSemesterId: (id) => set({ activeSemesterId: id }),
  logout: () =>
    set({
      isAuthenticated: false,
      isOnboarded: false,
      user: null,
      activeSemesterId: null,
    }),
}));
