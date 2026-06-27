import React from 'react';
import { Stack, router } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';

export default function AppLayout() {
  const { isAuthenticated, hydrated, role, subscriptionExpired } = useAuthStore();
  console.log(isAuthenticated, hydrated, role, subscriptionExpired);

  React.useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) { router.replace('/(auth)/login'); return; }
    if (subscriptionExpired) { router.replace('/(billing)'); return; }
    if (role !== 'STUDENT') { router.replace('/(coach)'); return; }
  }, [isAuthenticated, hydrated, role, subscriptionExpired]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
