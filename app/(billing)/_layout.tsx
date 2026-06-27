import React from 'react';
import { Stack, router } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';

export default function BillingLayout() {
  const { isAuthenticated, hydrated } = useAuthStore();

  React.useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) router.replace('/(auth)/login');
  }, [isAuthenticated, hydrated]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
