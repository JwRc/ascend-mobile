import { create } from "zustand";
import { clearToken, clearRememberMeToken } from "@/lib/auth";
import { deregisterPushToken } from "@/lib/notifications";
import { stashOrphanedWorkout } from "@/lib/orphaned-session";
import { useStrengthStore } from "@/store/strength.store";
import { queryClient } from "@/lib/query-client";
import { clearPersistedCache } from "@/lib/query-persist";
import { saveLastUser, clearLastUser } from "@/lib/last-user";

export type UserRole = "STUDENT" | "COACH";

type AuthState = {
  isAuthenticated: boolean;
  hydrated: boolean;
  userId: string | null;
  email: string | null;
  name: string | null;
  role: UserRole | null;
  tenantId: string | null;
  userPlan: "STANDALONE" | null;
  plan: "BASE" | "CUSTOM" | null;
  offlineGraceUntil: number | null;
  isOfflineSession: boolean;
  subscriptionExpired: boolean;
  // null = desconhecido (claim ausente numa sessão offline antiga) — ver
  // src/lib/onboarding.ts needsOnboarding() para a semântica do tri-state.
  onboardingCompleted: boolean | null;
  setSession: (
    userId: string,
    email: string,
    role: UserRole,
    opts?: {
      name?: string | null;
      tenantId?: string | null;
      userPlan?: "STANDALONE" | null;
      plan?: "BASE" | "CUSTOM";
      offlineGraceUntil?: number;
      isOfflineSession?: boolean;
      onboardingCompleted?: boolean | null;
    },
  ) => void;
  clearSession: () => Promise<void>;
  markHydrated: () => void;
  setSubscriptionExpired: (val: boolean) => void;
  setOnboardingCompleted: (val: boolean) => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  hydrated: false,
  userId: null,
  email: null,
  name: null,
  role: null,
  tenantId: null,
  userPlan: null,
  plan: null,
  offlineGraceUntil: null,
  isOfflineSession: false,
  subscriptionExpired: false,
  onboardingCompleted: null,

  setSession: (userId, email, role, opts) => {
    // Guarda {userId, name} pro cold start offline mostrar o nome certo antes da
    // rede voltar (o JWT remember-me não carrega name). Só quando temos um name.
    if (opts?.name) void saveLastUser({ userId, name: opts.name });
    set({
      isAuthenticated: true,
      userId,
      email,
      name: opts?.name ?? null,
      role,
      tenantId: opts?.tenantId ?? null,
      userPlan: opts?.userPlan ?? null,
      plan: opts?.plan ?? null,
      offlineGraceUntil: opts?.offlineGraceUntil ?? null,
      isOfflineSession: opts?.isOfflineSession ?? false,
      onboardingCompleted: opts?.onboardingCompleted ?? null,
    });
  },

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
    // Zera o cache do React Query (memória + disco) e o marcador de última conta
    // pra nenhum dado desta conta aparecer num login seguinte de outra conta.
    queryClient.clear();
    await clearPersistedCache();
    await clearLastUser();
    set({
      isAuthenticated: false,
      userId: null,
      email: null,
      name: null,
      role: null,
      tenantId: null,
      userPlan: null,
      plan: null,
      offlineGraceUntil: null,
      isOfflineSession: false,
      subscriptionExpired: false,
      onboardingCompleted: null,
    });
  },

  markHydrated: () => set({ hydrated: true }),

  setSubscriptionExpired: (val) => set({ subscriptionExpired: val }),

  setOnboardingCompleted: (val) => set({ onboardingCompleted: val }),
}));
