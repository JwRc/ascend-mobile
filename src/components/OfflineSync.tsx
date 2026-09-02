import React from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { onAuthenticated, runOfflineSync, isOnline, wireOnlineManager } from '@/lib/offline-sync';
import { refreshPendingCount } from '@/lib/offline-queue';

/**
 * Sem UI. Montado uma vez no root layout (dentro do QueryClientProvider). Escoa as
 * escritas feitas offline — logo após o login e sempre que a rede volta.
 */
export function OfflineSync() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const wasOnline = React.useRef<boolean | null>(null);
  const handledUser = React.useRef<string | null>(null);

  React.useEffect(() => {
    wireOnlineManager();
    void refreshPendingCount();
  }, []);

  // uma vez por usuário autenticado
  React.useEffect(() => {
    if (!userId || handledUser.current === userId) return;
    handledUser.current = userId;
    void onAuthenticated(userId, qc);
  }, [userId, qc]);

  React.useEffect(() => {
    if (!userId) handledUser.current = null;
  }, [userId]);

  // reconexão de fundo
  React.useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const online = isOnline(state);
      const reconnected = wasOnline.current === false && online;
      wasOnline.current = online;
      const currentUser = useAuthStore.getState().userId;
      if (reconnected && currentUser) void runOfflineSync(currentUser, qc);
    });
    return unsub;
  }, [qc]);

  return null;
}
