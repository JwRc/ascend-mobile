import type { UserRole } from '@/store/auth.store';

export type OnboardingKind = 'choose' | 'standalone' | 'coach' | 'linked-student';

export type OnboardingGate = {
  role: UserRole | null;
  tenantId: string | null;
  userPlan: 'STANDALONE' | null;
  // null = desconhecido (ex.: sessão offline restaurada de um JWT sem esse
  // claim) — NÃO bloqueia. Só `false`, confirmado pelo servidor, manda ao
  // wizard. Evita que uma atualização do app trave usuários existentes offline.
  onboardingCompleted: boolean | null;
};

export function needsOnboarding(gate: OnboardingGate): boolean {
  return gate.onboardingCompleted === false;
}

export function resolveOnboardingKind(gate: OnboardingGate): OnboardingKind {
  if (gate.role === 'COACH') return 'coach';
  if (gate.tenantId) return 'linked-student';
  if (gate.userPlan === 'STANDALONE') return 'standalone';
  return 'choose';
}

export function resolveHomeRoute(
  gate: OnboardingGate,
): '/(onboarding)' | '/(coach)' | '/(app)' {
  if (needsOnboarding(gate)) return '/(onboarding)';
  return gate.role === 'COACH' ? '/(coach)' : '/(app)';
}
