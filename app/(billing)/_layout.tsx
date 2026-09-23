import React from 'react';
import { Stack, router } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { needsOnboarding } from '@/lib/onboarding';

export default function BillingLayout() {
  const { isAuthenticated, hydrated, role, tenantId, userPlan, onboardingCompleted } = useAuthStore();
  const needsOnb = needsOnboarding({ role, tenantId, userPlan, onboardingCompleted });
  const blocked = !hydrated || !isAuthenticated || needsOnb || (role === 'STUDENT' && tenantId !== null);

  React.useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) { router.replace('/(auth)/login'); return; }
    // Coach sem onboarding concluído não deve regularizar cartão por fora do wizard
    if (needsOnb) { router.replace('/(onboarding)'); return; }
    // Alunos vinculados a um coach não têm assinatura própria
    if (role === 'STUDENT' && tenantId !== null) { router.replace('/(app)'); return; }
  }, [isAuthenticated, hydrated, role, tenantId, needsOnb]);

  // Evita qualquer flash do conteúdo de billing enquanto a checagem acima não permite
  if (blocked) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
