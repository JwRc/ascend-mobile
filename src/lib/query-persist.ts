import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import type { QueryClient } from '@tanstack/react-query';
import {
  removeOldestQuery,
  type PersistQueryClientOptions,
} from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

/**
 * Persistência do cache do React Query em AsyncStorage — é o que faz TODA tela de
 * leitura (aluno e coach) abrir offline com o último dado sincronizado, mesmo
 * depois de um kill do app.
 *
 * Bump `CACHE_SCHEMA_VERSION` sempre que o shape de alguma query mudar de forma
 * incompatível — o cache antigo é descartado no próximo boot (via `buster`).
 */
export const CACHE_SCHEMA_VERSION = 1;

const CACHE_KEY = 'ascentio-rq-cache';
const CACHE_OWNER_KEY = 'ascentio-rq-cache-owner';

// Query keys que NÃO vão pro disco: billing (Stripe) e support (Libredesk)
// são serviços externos, online-only — cachear dado stale deles só confunde.
const NON_PERSISTED_ROOTS = new Set(['billing', 'support']);

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: CACHE_KEY,
  throttleTime: 1000,
  retry: removeOldestQuery,
});

const persistBuster = `${Constants.expoConfig?.version ?? '0'}::${CACHE_SCHEMA_VERSION}`;

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: queryPersister,
  maxAge: 1000 * 60 * 60 * 24 * 7,
  buster: persistBuster,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      if (query.state.status !== 'success') return false;
      const root = query.queryKey[0];
      return typeof root === 'string' ? !NON_PERSISTED_ROOTS.has(root) : true;
    },
    shouldDehydrateMutation: () => false,
  },
};

/**
 * O cache persistido pertence a quem logou por último no aparelho. Ao trocar de
 * conta, zera tudo pra não vazar dado de uma conta pra outra. Chamado no
 * _layout.tsx assim que o `userId` da sessão é conhecido.
 */
export async function reconcileCacheOwner(
  qc: QueryClient,
  userId: string,
): Promise<void> {
  try {
    const prev = await AsyncStorage.getItem(CACHE_OWNER_KEY);
    if (prev === userId) return;
    if (prev !== null) {
      qc.clear();
      await queryPersister.removeClient();
    }
    await AsyncStorage.setItem(CACHE_OWNER_KEY, userId);
  } catch {
    // sem storage — segue sem persistência, não trava o boot
  }
}

/** Limpa o cache persistido e o marcador de dono. Chamado no logout. */
export async function clearPersistedCache(): Promise<void> {
  try {
    await queryPersister.removeClient();
    await AsyncStorage.removeItem(CACHE_OWNER_KEY);
  } catch {
    // ignore
  }
}
