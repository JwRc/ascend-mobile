import { onlineManager, type QueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { refreshRememberMeToken } from '@/lib/auth';
import { flushOfflineQueue, refreshPendingCount } from '@/lib/offline-queue';
import { flushPendingWorkout, flushOrphanedWorkout } from '@/lib/workout-sync';
import { peekOrphanedWorkout, clearOrphanedWorkout } from '@/lib/orphaned-session';
import { useStrengthStore } from '@/store/strength.store';
import { useSyncStore } from '@/store/sync.store';

function isOnline(state: { isConnected: boolean | null; isInternetReachable: boolean | null }) {
  return !!state.isConnected && state.isInternetReachable !== false;
}

let onlineManagerWired = false;

/**
 * Liga o onlineManager do React Query ao NetInfo — o refetch automático das queries
 * volta a acontecer quando a conexão retorna. Idempotente; deve ser chamado só
 * depois que a ponte nativa subiu (de dentro de um componente), nunca no import,
 * pra não acessar o módulo nativo cedo demais.
 */
export function wireOnlineManager() {
  if (onlineManagerWired) return;
  onlineManagerWired = true;
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(isOnline(state))),
  );
}

/**
 * Roda toda vez que a rede volta com um usuário autenticado, e uma vez logo após
 * o login/restauração de sessão. Renova a janela offline e escoa tudo que ficou
 * pendente (fila de peso/meta + treino não sincronizado).
 */
export async function runOfflineSync(userId: string, qc: QueryClient): Promise<void> {
  useSyncStore.getState().setSyncing(true);
  try {
    await refreshRememberMeToken(true);
    await flushOfflineQueue(userId, qc);
    await flushPendingWorkout(qc);
  } finally {
    await refreshPendingCount();
    useSyncStore.getState().setSyncing(false);
  }
}

/**
 * Chamado uma vez quando um usuário passa a estar autenticado. Restaura uma
 * eventual sessão de treino órfã (preservada num logout forçado) antes de escoar.
 */
export async function onAuthenticated(userId: string, qc: QueryClient): Promise<void> {
  const orphan = await peekOrphanedWorkout(userId);
  if (orphan) {
    if (!useStrengthStore.getState().activeSession) {
      // sem treino ativo concorrente — restaura na store e deixa o flush abaixo cuidar
      useStrengthStore.getState().setActiveSession(orphan);
      await clearOrphanedWorkout();
    } else {
      // já há um treino ativo — sincroniza a órfã direto, sem tocar na store.
      // Só remove do disco se o envio foi aceito (ou rejeitado pelo servidor);
      // se ainda estiver offline, fica pra próxima reconexão.
      const done = await flushOrphanedWorkout(orphan, qc);
      if (done) await clearOrphanedWorkout();
    }
  }
  await runOfflineSync(userId, qc);
}

export { isOnline };
