import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { persistOptions, reconcileCacheOwner } from '@/lib/query-persist';

const OWNER_KEY = 'ascentio-rq-cache-owner';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('shouldDehydrateQuery', () => {
  const should = persistOptions.dehydrateOptions!.shouldDehydrateQuery!;
  const q = (queryKey: unknown[], status = 'success') =>
    ({ queryKey, state: { status } }) as any;

  it('persiste queries de negócio bem-sucedidas', () => {
    expect(should(q(['student', 'profile']))).toBe(true);
    expect(should(q(['body-records']))).toBe(true);
    expect(should(q(['students']))).toBe(true);
    expect(should(q(['dashboard', 'coach']))).toBe(true);
    expect(should(q(['workout-templates']))).toBe(true);
  });

  it('NÃO persiste billing nem support (serviços externos, online-only)', () => {
    expect(should(q(['billing', 'cards']))).toBe(false);
    expect(should(q(['support', 'tickets']))).toBe(false);
  });

  it('NÃO persiste queries que não deram success', () => {
    expect(should(q(['student', 'profile'], 'error'))).toBe(false);
    expect(should(q(['student', 'profile'], 'pending'))).toBe(false);
  });
});

describe('reconcileCacheOwner', () => {
  it('primeira conta: só grava o dono, sem limpar', async () => {
    const qc = new QueryClient();
    qc.setQueryData(['x'], 1);
    await reconcileCacheOwner(qc, 'u1');
    expect(qc.getQueryData(['x'])).toBe(1);
    expect(await AsyncStorage.getItem(OWNER_KEY)).toBe('u1');
  });

  it('mesma conta: no-op', async () => {
    await AsyncStorage.setItem(OWNER_KEY, 'u1');
    const qc = new QueryClient();
    qc.setQueryData(['x'], 1);
    await reconcileCacheOwner(qc, 'u1');
    expect(qc.getQueryData(['x'])).toBe(1);
  });

  it('troca de conta: zera o cache e regrava o dono', async () => {
    await AsyncStorage.setItem(OWNER_KEY, 'u1');
    const qc = new QueryClient();
    qc.setQueryData(['x'], 1);
    await reconcileCacheOwner(qc, 'u2');
    expect(qc.getQueryData(['x'])).toBeUndefined();
    expect(await AsyncStorage.getItem(OWNER_KEY)).toBe('u2');
  });
});
