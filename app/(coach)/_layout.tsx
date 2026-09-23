import React from 'react';
import { Stack, router } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { needsOnboarding } from '@/lib/onboarding';

export default function CoachLayout() {
  const { isAuthenticated, hydrated, role, tenantId, userPlan, onboardingCompleted, subscriptionExpired } = useAuthStore();

  React.useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) { router.replace('/(auth)/login'); return; }
    if (needsOnboarding({ role, tenantId, userPlan, onboardingCompleted })) { router.replace('/(onboarding)'); return; }
    if (subscriptionExpired) { router.replace('/(billing)'); return; }
    if (role !== 'COACH') { router.replace('/(app)'); return; }
  }, [isAuthenticated, hydrated, role, tenantId, userPlan, onboardingCompleted, subscriptionExpired]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
