import { create } from "zustand";
import { clearToken, clearRememberMeToken } from "@/lib/auth";
import { deregisterPushToken } from "@/lib/notifications";
import { useOfflineStore } from "./offline.store";

export type UserRole = "STUDENT" | "COACH";

type AuthState = {
  isAuthenticated: boolean;
  hydrated: boolean;
  userId: string | null;
  email: string | null;
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

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  hydrated: false,
  userId: null,
  email: null,
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
      role,
      tenantId: opts?.tenantId ?? null,
      plan: opts?.plan ?? null,
      offlineGraceUntil: opts?.offlineGraceUntil ?? null,
      isOfflineSession: opts?.isOfflineSession ?? false,
    }),

  clearSession: async () => {
    console.log("Clearing session...");
    await deregisterPushToken();
    await clearToken();
    await clearRememberMeToken();
    useOfflineStore.getState().clearAll();
    set({
      isAuthenticated: false,
      userId: null,
      email: null,
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
