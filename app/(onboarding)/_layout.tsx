import React from 'react';
import { Stack, router } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { needsOnboarding, resolveHomeRoute } from '@/lib/onboarding';

export default function OnboardingLayout() {
  const { isAuthenticated, hydrated, role, tenantId, userPlan, onboardingCompleted } = useAuthStore();
  const gate = { role, tenantId, userPlan, onboardingCompleted };
  const blocked = !hydrated || !isAuthenticated || !needsOnboarding(gate);

  React.useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) { router.replace('/(auth)/login'); return; }
    // Onboarding já concluído — não deixa o wizard reaparecer
    if (!needsOnboarding(gate)) { router.replace(resolveHomeRoute(gate)); return; }
  }, [isAuthenticated, hydrated, role, tenantId, userPlan, onboardingCompleted]);

  if (blocked) return null;

  return <Stack screenOptions={{ headerShown: false, animation: 'none' }} />;
}
