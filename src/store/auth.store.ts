import { create } from 'zustand';
import { clearToken, clearRememberMeToken } from '@/lib/auth';
import { useOfflineStore } from './offline.store';

export type UserRole = 'STUDENT' | 'COACH';

type AuthState = {
  isAuthenticated: boolean;
  hydrated: boolean;
  userId: string | null;
  email: string | null;
  role: UserRole | null;
  plan: 'BASE' | 'CUSTOM' | null;
  offlineGraceUntil: number | null;
  isOfflineSession: boolean;
  setSession: (
    userId: string,
    email: string,
    role: UserRole,
    opts?: { plan?: 'BASE' | 'CUSTOM'; offlineGraceUntil?: number; isOfflineSession?: boolean },
  ) => void;
  clearSession: () => Promise<void>;
  markHydrated: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  hydrated: false,
  userId: null,
  email: null,
  role: null,
  plan: null,
  offlineGraceUntil: null,
  isOfflineSession: false,

  setSession: (userId, email, role, opts) =>
    set({
      isAuthenticated: true,
      userId,
      email,
      role,
      plan: opts?.plan ?? null,
      offlineGraceUntil: opts?.offlineGraceUntil ?? null,
      isOfflineSession: opts?.isOfflineSession ?? false,
    }),

  clearSession: async () => {
    await clearToken();
    await clearRememberMeToken();
    useOfflineStore.getState().clearAll();
    set({
      isAuthenticated: false,
      userId: null,
      email: null,
      role: null,
      plan: null,
      offlineGraceUntil: null,
      isOfflineSession: false,
    });
  },

  markHydrated: () => set({ hydrated: true }),
}));
