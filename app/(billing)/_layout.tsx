import React from 'react';
import { Stack, router } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';

export default function BillingLayout() {
  const { isAuthenticated, hydrated, role, tenantId } = useAuthStore();

  React.useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) { router.replace('/(auth)/login'); return; }
    // Alunos vinculados a um coach não têm assinatura própria
    if (role === 'STUDENT' && tenantId !== null) { router.replace('/(app)'); return; }
  }, [isAuthenticated, hydrated, role, tenantId]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
