import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';

// api mockado — os replays só verificam que a chamada certa foi feita.
jest.mock('@/api/client', () => ({
  api: {
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
  },
}));

// net: erro de rede = objeto com flag; erro de servidor = tem response.status
jest.mock('@/lib/net', () => ({
  isNetworkError: (e: any) => !!e?.__network,
}));
const netErr = () => ({ __network: true });
const serverErr = (status = 400) => ({ response: { status } });

import { api } from '@/api/client';
const post = api.post as jest.Mock;
const patch = api.patch as jest.Mock;
const del = api.delete as jest.Mock;

import {
  queueCreateTemplate,
  queueUpdateTemplate,
  queueDeleteTemplate,
  queuePatchProfile,
  queueNotifRead,
  queueNotifReadAll,
  flushOfflineQueue,
  queuedOpCount,
} from '@/lib/offline-queue';

const KEY = 'ascentio-offline-queue';
const USER = 'u1';

async function rawQueue(): Promise<any[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

function qc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

beforeEach(async () => {
  await AsyncStorage.clear();
  post.mockReset().mockResolvedValue({ data: {} });
  patch.mockReset().mockResolvedValue({ data: {} });
  del.mockReset().mockResolvedValue({ data: {} });
});

describe('coalescing de templates', () => {
  it('create + 2 updates + delete de OUTRO template = 1 create com últimos valores', async () => {
    const client = qc();
    client.setQueryData(['workout-templates'], []);

    const t1 = await queueCreateTemplate(client, USER, {
      name: 'A',
      exercises: [],
      targetMin: null,
    });
    await queueUpdateTemplate(client, USER, {
      templateId: t1.id,
      name: 'A2',
      exercises: ['Supino'],
      targetMin: 60,
    });
    await queueUpdateTemplate(client, USER, {
      templateId: t1.id,
      name: 'A3',
      exercises: ['Supino', 'Remada'],
      targetMin: 55,
    });
    const t2 = await queueCreateTemplate(client, USER, {
      name: 'B',
      exercises: [],
      targetMin: null,
    });
    await queueDeleteTemplate(client, USER, t2.id);

    const q = await rawQueue();
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({
      kind: 'create-template',
      name: 'A3',
      exercises: ['Supino', 'Remada'],
      targetMin: 55,
      clientId: t1.id,
    });

    await flushOfflineQueue(USER, client);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      '/workout-templates',
      expect.objectContaining({ clientId: t1.id, name: 'A3' }),
    );
  });

  it('create + delete do MESMO template = fila vazia, nenhuma chamada', async () => {
    const client = qc();
    client.setQueryData(['workout-templates'], []);
    const t = await queueCreateTemplate(client, USER, {
      name: 'X',
      exercises: [],
      targetMin: null,
    });
    await queueDeleteTemplate(client, USER, t.id);

    expect(await rawQueue()).toHaveLength(0);
    await flushOfflineQueue(USER, client);
    expect(post).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });
});

describe('coalescing de perfil e notificações', () => {
  it('patch-profile faz merge dos campos', async () => {
    const client = qc();
    client.setQueryData(['student', 'profile'], { name: 'Old', units: 'kg' });
    await queuePatchProfile(client, USER, { name: 'Novo' });
    await queuePatchProfile(client, USER, { units: 'lb' });

    const q = await rawQueue();
    expect(q).toHaveLength(1);
    expect(q[0].patch).toEqual({ name: 'Novo', units: 'lb' });
  });

  it('notif-read-all descarta os notif-read pendentes', async () => {
    const client = qc();
    client.setQueryData(['notifications'], [{ id: 'n1' }, { id: 'n2' }]);
    await queueNotifRead(client, USER, 'n1');
    await queueNotifRead(client, USER, 'n2');
    await queueNotifReadAll(client, USER);

    const q = await rawQueue();
    expect(q).toHaveLength(1);
    expect(q[0].kind).toBe('notif-read-all');
  });
});

describe('flushOfflineQueue', () => {
  it('replay em ordem de ts', async () => {
    const client = qc();
    client.setQueryData(['student', 'profile'], { name: 'x' });
    client.setQueryData(['notifications'], [{ id: 'n1' }]);
    await queuePatchProfile(client, USER, { name: 'a' });
    await queueNotifRead(client, USER, 'n1');

    const calls: string[] = [];
    patch.mockImplementation((url: string) => {
      calls.push(url);
      return Promise.resolve({ data: {} });
    });

    await flushOfflineQueue(USER, client);
    expect(calls).toEqual(['/students/me', '/notify/n1/read']);
    expect(await rawQueue()).toHaveLength(0);
  });

  it('para no primeiro erro de rede, mantém o resto', async () => {
    const client = qc();
    client.setQueryData(['student', 'profile'], { name: 'x' });
    client.setQueryData(['notifications'], [{ id: 'n1' }]);
    await queuePatchProfile(client, USER, { name: 'a' });
    await queueNotifRead(client, USER, 'n1');

    patch.mockRejectedValueOnce(netErr());
    await flushOfflineQueue(USER, client);

    // o patch-profile falhou por rede → fila intacta
    expect(await rawQueue()).toHaveLength(2);
  });

  it('descarta a op em erro real do servidor e segue', async () => {
    const client = qc();
    client.setQueryData(['student', 'profile'], { name: 'x' });
    client.setQueryData(['notifications'], [{ id: 'n1' }]);
    await queuePatchProfile(client, USER, { name: 'a' });
    await queueNotifRead(client, USER, 'n1');

    patch.mockRejectedValueOnce(serverErr(422)); // patch-profile
    patch.mockResolvedValueOnce({ data: {} }); // notif-read (na verdade patchTolerant)
    await flushOfflineQueue(USER, client);

    expect(await rawQueue()).toHaveLength(0);
  });

  it('só reproduz ops do userId autenticado', async () => {
    const client = qc();
    client.setQueryData(['student', 'profile'], { name: 'x' });
    await queuePatchProfile(client, USER, { name: 'a' });
    await queuePatchProfile(client, 'outra-conta', { name: 'b' });

    await flushOfflineQueue(USER, client);
    expect(patch).toHaveBeenCalledTimes(1);
    expect(await queuedOpCount('outra-conta')).toBe(1);
  });
});
