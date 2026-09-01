import { create } from "zustand";
import { clearToken, clearRememberMeToken } from "@/lib/auth";
import { deregisterPushToken } from "@/lib/notifications";
import { stashOrphanedWorkout } from "@/lib/orphaned-session";
import { useStrengthStore } from "@/store/strength.store";

export type UserRole = "STUDENT" | "COACH";

type AuthState = {
  isAuthenticated: boolean;
  hydrated: boolean;
  userId: string | null;
  email: string | null;
  name: string | null;
  role: UserRole | null;
  tenantId: string | null;
  plan: "BASE" | "CUSTOM" | null;
  offlineGraceUntil: number | null;
  isOfflineSession: boolean;
  subscriptionExpired: boolean;
  setSession: (
    userId: string,
    email: string,
    role: UserRole,
    opts?: {
      name?: string | null;
      tenantId?: string | null;
      plan?: "BASE" | "CUSTOM";
      offlineGraceUntil?: number;
      isOfflineSession?: boolean;
    },
  ) => void;
  clearSession: () => Promise<void>;
  markHydrated: () => void;
  setSubscriptionExpired: (val: boolean) => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  hydrated: false,
  userId: null,
  email: null,
  name: null,
  role: null,
  tenantId: null,
  plan: null,
  offlineGraceUntil: null,
  isOfflineSession: false,
  subscriptionExpired: false,

  setSession: (userId, email, role, opts) =>
    set({
      isAuthenticated: true,
      userId,
      email,
      name: opts?.name ?? null,
      role,
      tenantId: opts?.tenantId ?? null,
      plan: opts?.plan ?? null,
      offlineGraceUntil: opts?.offlineGraceUntil ?? null,
      isOfflineSession: opts?.isOfflineSession ?? false,
    }),

  clearSession: async () => {
    console.log("Clearing session...");
    // Preserva um treino ainda não sincronizado (marcado com o userId) antes de
    // limpar, e zera o activeSession em memória pra não vazar pra outra conta no
    // mesmo aparelho. A cópia órfã é ressincronizada no próximo login do usuário.
    await stashOrphanedWorkout(get().userId);
    useStrengthStore.getState().setActiveSession(null);
    await deregisterPushToken();
    await clearToken();
    await clearRememberMeToken();
    set({
      isAuthenticated: false,
      userId: null,
      email: null,
      name: null,
      role: null,
      tenantId: null,
      plan: null,
      offlineGraceUntil: null,
      isOfflineSession: false,
      subscriptionExpired: false,
    });
  },

  markHydrated: () => set({ hydrated: true }),

  setSubscriptionExpired: (val) => set({ subscriptionExpired: val }),
}));
