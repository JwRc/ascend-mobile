import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStrengthStore, type ActiveSession } from '@/store/strength.store';

// Chave do zustand-persist da strength.store (name: 'ascentio-active-session').
const PERSIST_KEY = 'ascentio-active-session';
// Cópia crua da sessão ativa preservada quando a sessão de auth é derrubada com
// treino ainda não sincronizado — não é gerida pelo zustand, então sobrevive ao
// clearSession() (que zera o activeSession em memória e, por tabela, o PERSIST_KEY).
const ORPHAN_KEY = 'ascentio-orphaned-session';
const ORPHAN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

type OrphanPayload = { userId: string; session: ActiveSession; ts: number };

function sessionHasContent(s: ActiveSession | null | undefined): s is ActiveSession {
  return !!s && s.exercises.some((e) => e.sets.length > 0);
}

/** Lê a sessão ativa mesmo que o zustand ainda não tenha hidratado (cold start). */
async function readActiveSession(): Promise<ActiveSession | null> {
  const inMem = useStrengthStore.getState().activeSession;
  if (inMem) return inMem;
  try {
    const raw = await AsyncStorage.getItem(PERSIST_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.state?.activeSession ?? null;
  } catch {
    return null;
  }
}

/**
 * Chamado antes de derrubar a sessão de auth (logout normal ou forçado por grace
 * expirado). Se houver treino com séries ainda não sincronizadas, guarda uma cópia
 * marcada com o userId e remove a sessão do armazenamento gerido pelo zustand, pra
 * ela não vazar pra outra conta no mesmo aparelho. A cópia órfã é ressincronizada
 * no próximo login do mesmo usuário (ver takeOrphanedWorkout).
 */
export async function stashOrphanedWorkout(userId: string | null): Promise<void> {
  if (!userId) return;
  // garante que o zustand terminou de hidratar antes de ler/zerar o activeSession
  try {
    await useStrengthStore.persist.rehydrate();
  } catch {
    // segue com o fallback de leitura crua do disco
  }
  const session = await readActiveSession();
  if (!sessionHasContent(session)) return;

  const payload: OrphanPayload = { userId, session, ts: Date.now() };
  try {
    await AsyncStorage.setItem(ORPHAN_KEY, JSON.stringify(payload));
  } catch {
    return; // sem espaço em disco — nada a fazer, melhor não bloquear o logout
  }
  useStrengthStore.getState().setActiveSession(null);
  await AsyncStorage.removeItem(PERSIST_KEY).catch(() => {});
}

/**
 * Lê (sem remover) a sessão órfã se pertencer ao usuário informado. Órfã de outro
 * usuário é mantida (ele pode logar de volta depois); expirada pelo TTL é descartada.
 * O caller remove com `clearOrphanedWorkout` só depois de sincronizar com sucesso.
 */
export async function peekOrphanedWorkout(userId: string): Promise<ActiveSession | null> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(ORPHAN_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const payload = JSON.parse(raw) as OrphanPayload;
    if (Date.now() - payload.ts > ORPHAN_TTL_MS) {
      await AsyncStorage.removeItem(ORPHAN_KEY).catch(() => {});
      return null;
    }
    if (payload.userId !== userId) return null;
    return payload.session ?? null;
  } catch {
    await AsyncStorage.removeItem(ORPHAN_KEY).catch(() => {});
    return null;
  }
}

export async function clearOrphanedWorkout(): Promise<void> {
  await AsyncStorage.removeItem(ORPHAN_KEY).catch(() => {});
}
