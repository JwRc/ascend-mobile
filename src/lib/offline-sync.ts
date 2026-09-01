import { onlineManager, type QueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { refreshRememberMeToken } from '@/lib/auth';
import { flushOfflineQueue } from '@/lib/offline-queue';
import { flushPendingWorkout, flushOrphanedWorkout } from '@/lib/workout-sync';
import { peekOrphanedWorkout, clearOrphanedWorkout } from '@/lib/orphaned-session';
import { useStrengthStore } from '@/store/strength.store';

function isOnline(state: { isConnected: boolean | null; isInternetReachable: boolean | null }) {
  return !!state.isConnected && state.isInternetReachable !== false;
}

/**
 * Faz o React Query pausar queries/mutations quando o aparelho está offline e
 * refazer o fetch sozinho ao reconectar. Registrado uma única vez, no import.
 */
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(isOnline(state))),
);

/**
 * Roda toda vez que a rede volta com um usuário autenticado, e uma vez logo após
 * o login/restauração de sessão. Renova a janela offline e escoa tudo que ficou
 * pendente (fila de peso/meta + treino não sincronizado).
 */
export async function runOfflineSync(userId: string, qc: QueryClient): Promise<void> {
  await refreshRememberMeToken(true);
  await flushOfflineQueue(userId, qc);
  await flushPendingWorkout(qc);
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
