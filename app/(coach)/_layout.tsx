import React from 'react';
import { Stack, router } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';

export default function CoachLayout() {
  const { isAuthenticated, hydrated, role, subscriptionExpired } = useAuthStore();

  React.useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) { router.replace('/(auth)/login'); return; }
    if (subscriptionExpired) { router.replace('/(billing)'); return; }
    if (role !== 'COACH') { router.replace('/(app)'); return; }
  }, [isAuthenticated, hydrated, role, subscriptionExpired]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
