import { create } from 'zustand';

export type UserRole = 'STUDENT' | 'COACH';

type AuthState = {
  isAuthenticated: boolean;
  hydrated: boolean;
  userId: string | null;
  email: string | null;
  role: UserRole | null;
  setSession: (userId: string, email: string, role: UserRole) => void;
  clearSession: () => void;
  markHydrated: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  hydrated: false,
  userId: null,
  email: null,
  role: null,

  setSession: (userId, email, role) =>
    set({ isAuthenticated: true, userId, email, role }),

  clearSession: () =>
    set({ isAuthenticated: false, userId: null, email: null, role: null }),

  markHydrated: () => set({ hydrated: true }),
}));
