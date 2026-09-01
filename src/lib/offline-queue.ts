import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { isNetworkError } from '@/lib/net';
import type { BodyRecord, Goal } from '@/types/api';

/**
 * Fila de escritas feitas offline (registro de peso e meta). Persistida no disco e
 * marcada por `userId` — só é reproduzida quando o mesmo usuário está autenticado,
 * pra não gravar dado de uma conta em outra no mesmo aparelho.
 *
 * Todos os replays são idempotentes no backend:
 *  - `POST /body-records` faz upsert por dia (último valor do dia vence)
 *  - `POST /goals` substitui a meta ativa
 *  - `DELETE /body-records/:id` — 404 é tratado como já-feito
 */

const KEY = 'ascentio-offline-queue';

type LogWeightOp = { id: string; kind: 'log-weight'; userId: string; ts: number; weight: number; date: string };
type DeleteWeightOp = { id: string; kind: 'delete-weight'; userId: string; ts: number; recordId: string };
type SetGoalOp = {
  id: string;
  kind: 'set-goal';
  userId: string;
  ts: number;
  targetWeight: number;
  goalType: 'LOSE' | 'GAIN' | 'MAINTAIN';
};

export type QueuedOp = LogWeightOp | DeleteWeightOp | SetGoalOp;

function uid() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** id sintético de um registro de peso ainda não sincronizado (chaveado pelo dia). */
export function localRecordId(date: string) {
  return `local:${date}`;
}
export function isLocalRecordId(id: string) {
  return id.startsWith('local:');
}
function dateFromLocalId(id: string) {
  return id.slice('local:'.length);
}

async function read(): Promise<QueuedOp[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedOp[]) : [];
  } catch {
    return [];
  }
}

async function write(queue: QueuedOp[]): Promise<void> {
  try {
    if (queue.length) await AsyncStorage.setItem(KEY, JSON.stringify(queue));
    else await AsyncStorage.removeItem(KEY);
  } catch {
    // sem espaço — a operação otimista já foi refletida na UI; nada a fazer
  }
}

export async function hasQueuedOps(userId: string): Promise<boolean> {
  return (await read()).some((op) => op.userId === userId);
}

async function enqueue(op: QueuedOp): Promise<void> {
  const queue = await read();
  let next = queue;
  if (op.kind === 'log-weight') {
    // um registro por dia — o último valor informado offline vence
    next = queue.filter((o) => !(o.kind === 'log-weight' && o.userId === op.userId && o.date === op.date));
  } else if (op.kind === 'set-goal') {
    next = queue.filter((o) => !(o.kind === 'set-goal' && o.userId === op.userId));
  } else if (op.kind === 'delete-weight') {
    next = queue.filter((o) => !(o.kind === 'delete-weight' && o.recordId === op.recordId));
  }
  next.push(op);
  await write(next);
}

// ─── Enfileiramento a partir das mutations (chamado no catch de erro de rede) ──

export async function queueLogWeight(
  qc: QueryClient,
  userId: string,
  args: { weight: number; date: string },
): Promise<BodyRecord> {
  await enqueue({ id: uid(), kind: 'log-weight', userId, ts: Date.now(), ...args });
  const recordedAt = new Date(args.date + 'T12:00:00').toISOString();
  const optimistic: BodyRecord = { id: localRecordId(args.date), weight: args.weight, recordedAt };
  qc.setQueryData<BodyRecord[]>(['body-records'], (prev = []) => {
    const rest = prev.filter(
      (r) => r.id !== optimistic.id && localCalendarDate(r.recordedAt) !== args.date,
    );
    return [...rest, optimistic].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  });
  return optimistic;
}

/** @returns `true` se a exclusão foi resolvida offline (nada mais a fazer). */
export async function queueDeleteWeight(
  qc: QueryClient,
  userId: string,
  recordId: string,
): Promise<void> {
  if (isLocalRecordId(recordId)) {
    // registro que só existe na fila — some com ele sem tocar no servidor
    const date = dateFromLocalId(recordId);
    const queue = await read();
    await write(queue.filter((o) => !(o.kind === 'log-weight' && o.userId === userId && o.date === date)));
  } else {
    await enqueue({ id: uid(), kind: 'delete-weight', userId, ts: Date.now(), recordId });
  }
  qc.setQueryData<BodyRecord[]>(['body-records'], (prev = []) => prev.filter((r) => r.id !== recordId));
}

export async function queueSetGoal(
  qc: QueryClient,
  userId: string,
  args: { targetWeight: number; goalType: 'LOSE' | 'GAIN' | 'MAINTAIN' },
): Promise<Goal> {
  await enqueue({ id: uid(), kind: 'set-goal', userId, ts: Date.now(), ...args });
  const optimistic: Goal = {
    id: 'local',
    targetWeight: args.targetWeight,
    goalType: args.goalType,
    setBy: 'ATHLETE',
    updatedAt: new Date().toISOString(),
  };
  qc.setQueryData<Goal>(['goals', 'active'], optimistic);
  return optimistic;
}

function localCalendarDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA');
}

// ─── Replay ──────────────────────────────────────────────────────────────────

async function replay(op: QueuedOp): Promise<void> {
  if (op.kind === 'log-weight') {
    const recordedAt = new Date(op.date + 'T12:00:00').toISOString();
    await api.post('/body-records', { weight: op.weight, recordedAt });
  } else if (op.kind === 'set-goal') {
    await api.post('/goals', { targetWeight: op.targetWeight, goalType: op.goalType });
  } else if (op.kind === 'delete-weight') {
    try {
      await api.delete(`/body-records/${op.recordId}`);
    } catch (err) {
      if ((err as any)?.response?.status === 404) return; // já não existe — ok
      throw err;
    }
  }
}

let flushing = false;

/**
 * Reproduz, em ordem, as operações do usuário autenticado. Para no primeiro erro
 * de rede (mantém o resto pra próxima tentativa); descarta a operação em erro real
 * do servidor (dado inválido não deve travar a fila pra sempre).
 */
export async function flushOfflineQueue(userId: string, qc: QueryClient): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    let queue = await read();
    const mine = queue.filter((op) => op.userId === userId).sort((a, b) => a.ts - b.ts);
    let changed = false;

    for (const op of mine) {
      try {
        await replay(op);
      } catch (err) {
        if (isNetworkError(err)) break; // ainda offline — tenta de novo depois
        // erro real do servidor — descarta essa operação e segue
      }
      queue = queue.filter((o) => o.id !== op.id);
      await write(queue);
      changed = true;
    }

    if (changed) {
      qc.invalidateQueries({ queryKey: ['body-records'] });
      qc.invalidateQueries({ queryKey: ['goals', 'active'] });
      qc.invalidateQueries({ queryKey: ['student', 'profile'] });
    }
  } finally {
    flushing = false;
  }
}
