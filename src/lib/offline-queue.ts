import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { isNetworkError } from '@/lib/net';
import { useSyncStore } from '@/store/sync.store';
import type {
  BodyRecord,
  Goal,
  Program,
  ProgramDay,
  StudentProfile,
  StudentSummary,
  WorkoutTemplate,
} from '@/types/api';

/**
 * Fila de escritas feitas offline. Persistida no disco e marcada por `userId` —
 * só é reproduzida quando o mesmo usuário está autenticado, pra não gravar dado
 * de uma conta em outra no mesmo aparelho.
 *
 * Todos os replays são idempotentes no backend:
 *  - `POST /body-records` faz upsert por dia (último valor do dia vence)
 *  - `POST /goals` substitui a meta ativa
 *  - `POST /workout-templates` e `POST /programs` fazem upsert por `clientId`
 *  - `PATCH /students/me` e `PATCH /students/:id/{goal,program,notes}` são last-write-wins
 *  - `PATCH /notify/:id/read` / `/notify/read-all` são idempotentes
 *  - `DELETE` — 404 é tratado como já-feito
 *
 * O coalescing garante que `update-*`/`delete-*` só carregam um id REAL do
 * servidor: um recurso ainda não sincronizado sempre tem um `create-*` na fila
 * (com o `clientId` que também é o `id` otimista), então a edição/remoção cai no
 * branch que mexe no create — nenhuma reconciliação temp-id → server-id em runtime.
 */

const KEY = 'ascentio-offline-queue';

type GoalType = 'LOSE' | 'GAIN' | 'MAINTAIN';
type ProfilePatch = Partial<
  Pick<StudentProfile, 'name' | 'units' | 'heightCm' | 'activityLevel' | 'reminders'>
>;
type TemplateFields = { name: string; exercises: string[]; targetMin: number | null };
type ProgramBody = {
  name: string;
  focus: string;
  perWeek: number;
  notes: string;
  days: ProgramDay[];
};

type Base = { id: string; userId: string; ts: number };

type LogWeightOp = Base & { kind: 'log-weight'; weight: number; date: string };
type DeleteWeightOp = Base & { kind: 'delete-weight'; recordId: string };
type SetGoalOp = Base & { kind: 'set-goal'; targetWeight: number; goalType: GoalType };

type PatchProfileOp = Base & { kind: 'patch-profile'; patch: ProfilePatch };
type CreateTemplateOp = Base & { kind: 'create-template'; clientId: string } & TemplateFields;
type UpdateTemplateOp = Base & { kind: 'update-template'; templateId: string } & TemplateFields;
type DeleteTemplateOp = Base & { kind: 'delete-template'; templateId: string };
type NotifReadOp = Base & { kind: 'notif-read'; notifId: string };
type NotifReadAllOp = Base & { kind: 'notif-read-all' };

type CoachStudentGoalOp = Base & {
  kind: 'coach-student-goal';
  studentId: string;
  targetWeight: number;
  goalType: GoalType;
};
type CoachStudentProgramOp = Base & {
  kind: 'coach-student-program';
  studentId: string;
  programId: string | null;
  programName: string | null;
};
type CoachStudentNotesOp = Base & { kind: 'coach-student-notes'; studentId: string; notes: string };
type CoachRemoveStudentOp = Base & { kind: 'coach-remove-student'; studentId: string };
type CreateProgramOp = Base & { kind: 'create-program'; clientId: string; body: ProgramBody };
type UpdateProgramOp = Base & { kind: 'update-program'; programId: string; body: ProgramBody };
type DeleteProgramOp = Base & { kind: 'delete-program'; programId: string };

export type QueuedOp =
  | LogWeightOp
  | DeleteWeightOp
  | SetGoalOp
  | PatchProfileOp
  | CreateTemplateOp
  | UpdateTemplateOp
  | DeleteTemplateOp
  | NotifReadOp
  | NotifReadAllOp
  | CoachStudentGoalOp
  | CoachStudentProgramOp
  | CoachStudentNotesOp
  | CoachRemoveStudentOp
  | CreateProgramOp
  | UpdateProgramOp
  | DeleteProgramOp;

function uid() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** id de cliente pra um recurso criado offline (também vira o `id` otimista). */
export function newClientId(prefix: string) {
  return `local:${prefix}:${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
  useSyncStore.getState().setPendingCount(queue.length);
}

export async function hasQueuedOps(userId: string): Promise<boolean> {
  return (await read()).some((op) => op.userId === userId);
}

export async function queuedOpCount(userId: string): Promise<number> {
  return (await read()).filter((op) => op.userId === userId).length;
}

/** Reconta a fila do disco pro indicador de pendências (chamado no boot). */
export async function refreshPendingCount(): Promise<void> {
  useSyncStore.getState().setPendingCount((await read()).length);
}

// ─── Coalescing ──────────────────────────────────────────────────────────────

function coalesce(queue: QueuedOp[], op: QueuedOp): QueuedOp[] {
  const mine = (o: QueuedOp) => o.userId === op.userId;

  switch (op.kind) {
    case 'log-weight':
      // um registro por dia — o último valor informado offline vence
      return [
        ...queue.filter((o) => !(o.kind === 'log-weight' && mine(o) && o.date === op.date)),
        op,
      ];

    case 'set-goal':
      return [...queue.filter((o) => !(o.kind === 'set-goal' && mine(o))), op];

    case 'delete-weight':
      return [...queue.filter((o) => !(o.kind === 'delete-weight' && o.recordId === op.recordId)), op];

    case 'patch-profile': {
      const prev = queue.find((o): o is PatchProfileOp => o.kind === 'patch-profile' && mine(o));
      const merged: PatchProfileOp = prev
        ? { ...prev, patch: { ...prev.patch, ...op.patch }, ts: op.ts }
        : op;
      return [...queue.filter((o) => o !== prev), merged];
    }

    case 'create-template':
      return [
        ...queue.filter(
          (o) => !(o.kind === 'create-template' && o.clientId === op.clientId),
        ),
        op,
      ];

    case 'update-template': {
      const create = queue.find(
        (o): o is CreateTemplateOp =>
          o.kind === 'create-template' && o.clientId === op.templateId,
      );
      if (create) {
        // template ainda não sincronizado — atualiza os campos do create
        const next: CreateTemplateOp = {
          ...create,
          name: op.name,
          exercises: op.exercises,
          targetMin: op.targetMin,
          ts: op.ts,
        };
        return [...queue.filter((o) => o !== create), next];
      }
      return [
        ...queue.filter(
          (o) => !(o.kind === 'update-template' && o.templateId === op.templateId),
        ),
        op,
      ];
    }

    case 'delete-template': {
      const create = queue.find(
        (o): o is CreateTemplateOp =>
          o.kind === 'create-template' && o.clientId === op.templateId,
      );
      if (create) {
        // nunca chegou ao servidor — some com o create e seus updates, sem op
        return queue.filter(
          (o) =>
            o !== create &&
            !(o.kind === 'update-template' && o.templateId === op.templateId),
        );
      }
      return [
        ...queue.filter(
          (o) =>
            !(o.kind === 'update-template' && o.templateId === op.templateId) &&
            !(o.kind === 'delete-template' && o.templateId === op.templateId),
        ),
        op,
      ];
    }

    case 'notif-read':
      return [...queue.filter((o) => !(o.kind === 'notif-read' && o.notifId === op.notifId)), op];

    case 'notif-read-all':
      return [
        ...queue.filter((o) => !(mine(o) && (o.kind === 'notif-read' || o.kind === 'notif-read-all'))),
        op,
      ];

    case 'coach-student-goal':
      return [
        ...queue.filter(
          (o) => !(o.kind === 'coach-student-goal' && o.studentId === op.studentId),
        ),
        op,
      ];

    case 'coach-student-program':
      return [
        ...queue.filter(
          (o) => !(o.kind === 'coach-student-program' && o.studentId === op.studentId),
        ),
        op,
      ];

    case 'coach-student-notes':
      return [
        ...queue.filter(
          (o) => !(o.kind === 'coach-student-notes' && o.studentId === op.studentId),
        ),
        op,
      ];

    case 'coach-remove-student':
      // remover o aluno torna metas/notas/programa pendentes irrelevantes
      return [
        ...queue.filter(
          (o) =>
            !(
              (o.kind === 'coach-student-goal' ||
                o.kind === 'coach-student-program' ||
                o.kind === 'coach-student-notes' ||
                o.kind === 'coach-remove-student') &&
              o.studentId === op.studentId
            ),
        ),
        op,
      ];

    case 'create-program':
      return [
        ...queue.filter((o) => !(o.kind === 'create-program' && o.clientId === op.clientId)),
        op,
      ];

    case 'update-program': {
      const create = queue.find(
        (o): o is CreateProgramOp =>
          o.kind === 'create-program' && o.clientId === op.programId,
      );
      if (create) {
        return [...queue.filter((o) => o !== create), { ...create, body: op.body, ts: op.ts }];
      }
      return [
        ...queue.filter((o) => !(o.kind === 'update-program' && o.programId === op.programId)),
        op,
      ];
    }

    case 'delete-program': {
      const create = queue.find(
        (o): o is CreateProgramOp =>
          o.kind === 'create-program' && o.clientId === op.programId,
      );
      if (create) {
        return queue.filter(
          (o) =>
            o !== create && !(o.kind === 'update-program' && o.programId === op.programId),
        );
      }
      return [
        ...queue.filter(
          (o) =>
            !(o.kind === 'update-program' && o.programId === op.programId) &&
            !(o.kind === 'delete-program' && o.programId === op.programId),
        ),
        op,
      ];
    }
  }
}

async function enqueue(op: QueuedOp): Promise<void> {
  await write(coalesce(await read(), op));
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
  args: { targetWeight: number; goalType: GoalType },
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
  qc.setQueryData<StudentProfile>(['student', 'profile'], (prev) =>
    prev
      ? {
          ...prev,
          goal: {
            id: 'local',
            targetWeight: args.targetWeight,
            goalType: args.goalType,
            setBy: 'ATHLETE',
            updatedAt: optimistic.updatedAt,
          },
        }
      : prev,
  );
  return optimistic;
}

export async function queuePatchProfile(
  qc: QueryClient,
  userId: string,
  patch: ProfilePatch,
): Promise<StudentProfile | undefined> {
  await enqueue({ id: uid(), kind: 'patch-profile', userId, ts: Date.now(), patch });
  let next: StudentProfile | undefined;
  qc.setQueryData<StudentProfile>(['student', 'profile'], (prev) => {
    next = prev ? { ...prev, ...patch } : prev;
    return next;
  });
  return next;
}

export async function queueCreateTemplate(
  qc: QueryClient,
  userId: string,
  fields: TemplateFields,
): Promise<WorkoutTemplate> {
  const clientId = newClientId('tpl');
  await enqueue({ id: uid(), kind: 'create-template', userId, ts: Date.now(), clientId, ...fields });
  const optimistic: WorkoutTemplate = { id: clientId, ...fields };
  qc.setQueryData<WorkoutTemplate[]>(['workout-templates'], (prev = []) => [...prev, optimistic]);
  return optimistic;
}

export async function queueUpdateTemplate(
  qc: QueryClient,
  userId: string,
  args: { templateId: string } & TemplateFields,
): Promise<void> {
  const { templateId, ...fields } = args;
  await enqueue({ id: uid(), kind: 'update-template', userId, ts: Date.now(), templateId, ...fields });
  qc.setQueryData<WorkoutTemplate[]>(['workout-templates'], (prev = []) =>
    prev.map((t) => (t.id === templateId ? { ...t, ...fields } : t)),
  );
}

export async function queueDeleteTemplate(
  qc: QueryClient,
  userId: string,
  templateId: string,
): Promise<void> {
  await enqueue({ id: uid(), kind: 'delete-template', userId, ts: Date.now(), templateId });
  qc.setQueryData<WorkoutTemplate[]>(['workout-templates'], (prev = []) =>
    prev.filter((t) => t.id !== templateId),
  );
}

export async function queueNotifRead(
  qc: QueryClient,
  userId: string,
  notifId: string,
): Promise<void> {
  await enqueue({ id: uid(), kind: 'notif-read', userId, ts: Date.now(), notifId });
  qc.setQueryData<{ id: string }[]>(['notifications'], (prev = []) =>
    prev.filter((n) => n.id !== notifId),
  );
}

export async function queueNotifReadAll(qc: QueryClient, userId: string): Promise<void> {
  await enqueue({ id: uid(), kind: 'notif-read-all', userId, ts: Date.now() });
  qc.setQueryData(['notifications'], []);
}

// ─── Coach ───────────────────────────────────────────────────────────────────

function patchStudentCaches(qc: QueryClient, studentId: string, patch: Partial<StudentSummary>) {
  qc.setQueryData<StudentSummary[]>(['students'], (prev) =>
    prev?.map((s) => (s.id === studentId ? { ...s, ...patch } : s)),
  );
  qc.setQueryData<StudentSummary>(['students', studentId], (prev) =>
    prev ? { ...prev, ...patch } : prev,
  );
}

export async function queueCoachStudentGoal(
  qc: QueryClient,
  userId: string,
  args: { studentId: string; targetWeight: number; goalType: GoalType },
): Promise<void> {
  await enqueue({ id: uid(), kind: 'coach-student-goal', userId, ts: Date.now(), ...args });
  patchStudentCaches(qc, args.studentId, { goal: args.targetWeight, goalType: args.goalType });
}

export async function queueCoachStudentProgram(
  qc: QueryClient,
  userId: string,
  args: { studentId: string; programId: string | null; programName: string | null },
): Promise<void> {
  await enqueue({ id: uid(), kind: 'coach-student-program', userId, ts: Date.now(), ...args });
  patchStudentCaches(qc, args.studentId, {
    programId: args.programId,
    program: args.programName,
  });
}

export async function queueCoachStudentNotes(
  qc: QueryClient,
  userId: string,
  args: { studentId: string; notes: string },
): Promise<void> {
  await enqueue({ id: uid(), kind: 'coach-student-notes', userId, ts: Date.now(), ...args });
  patchStudentCaches(qc, args.studentId, { notes: args.notes });
}

export async function queueCoachRemoveStudent(
  qc: QueryClient,
  userId: string,
  studentId: string,
): Promise<void> {
  await enqueue({ id: uid(), kind: 'coach-remove-student', userId, ts: Date.now(), studentId });
  qc.setQueryData<StudentSummary[]>(['students'], (prev) =>
    prev?.filter((s) => s.id !== studentId),
  );
}

export async function queueCreateProgram(
  qc: QueryClient,
  userId: string,
  body: ProgramBody,
): Promise<Program> {
  const clientId = newClientId('prog');
  await enqueue({ id: uid(), kind: 'create-program', userId, ts: Date.now(), clientId, body });
  const optimistic: Program = {
    id: clientId,
    ...body,
    days: body.days.map((d, i) => ({ ...d, id: `${clientId}:${i}` })),
    assignedCount: 0,
  };
  qc.setQueryData<Program[]>(['programs'], (prev = []) => [...prev, optimistic]);
  return optimistic;
}

export async function queueUpdateProgram(
  qc: QueryClient,
  userId: string,
  args: { programId: string; body: ProgramBody },
): Promise<void> {
  await enqueue({ id: uid(), kind: 'update-program', userId, ts: Date.now(), ...args });
  qc.setQueryData<Program[]>(['programs'], (prev = []) =>
    prev.map((p) => (p.id === args.programId ? { ...p, ...args.body } : p)),
  );
}

export async function queueDeleteProgram(
  qc: QueryClient,
  userId: string,
  programId: string,
): Promise<void> {
  await enqueue({ id: uid(), kind: 'delete-program', userId, ts: Date.now(), programId });
  qc.setQueryData<Program[]>(['programs'], (prev = []) => prev.filter((p) => p.id !== programId));
}

function localCalendarDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA');
}

// ─── Replay ──────────────────────────────────────────────────────────────────

/** Query keys tocadas por um replay — acumuladas pra invalidar uma vez no fim. */
function touchedKeys(op: QueuedOp): unknown[][] {
  switch (op.kind) {
    case 'log-weight':
    case 'delete-weight':
      return [['body-records'], ['student', 'profile']];
    case 'set-goal':
      return [['goals', 'active'], ['student', 'profile']];
    case 'patch-profile':
      return [['student', 'profile']];
    case 'create-template':
    case 'update-template':
    case 'delete-template':
      return [['workout-templates']];
    case 'notif-read':
    case 'notif-read-all':
      return [['notifications']];
    case 'coach-student-goal':
    case 'coach-student-program':
    case 'coach-student-notes':
      return [['students'], ['students', op.studentId], ['dashboard', 'coach']];
    case 'coach-remove-student':
      return [['students'], ['dashboard', 'coach']];
    case 'create-program':
    case 'update-program':
    case 'delete-program':
      return [['programs'], ['students']];
  }
}

async function replay(op: QueuedOp): Promise<void> {
  switch (op.kind) {
    case 'log-weight': {
      const recordedAt = new Date(op.date + 'T12:00:00').toISOString();
      await api.post('/body-records', { weight: op.weight, recordedAt });
      return;
    }
    case 'set-goal':
      await api.post('/goals', { targetWeight: op.targetWeight, goalType: op.goalType });
      return;
    case 'delete-weight':
      await deleteTolerant(`/body-records/${op.recordId}`);
      return;
    case 'patch-profile':
      await api.patch('/students/me', op.patch);
      return;
    case 'create-template':
      await api.post('/workout-templates', {
        clientId: op.clientId,
        name: op.name,
        exercises: op.exercises,
        targetMin: op.targetMin,
      });
      return;
    case 'update-template':
      await api.patch(`/workout-templates/${op.templateId}`, {
        name: op.name,
        exercises: op.exercises,
        targetMin: op.targetMin,
      });
      return;
    case 'delete-template':
      await deleteTolerant(`/workout-templates/${op.templateId}`);
      return;
    case 'notif-read':
      await patchTolerant(`/notify/${op.notifId}/read`);
      return;
    case 'notif-read-all':
      await api.patch('/notify/read-all');
      return;
    case 'coach-student-goal':
      await api.patch(`/students/${op.studentId}/goal`, {
        targetWeight: op.targetWeight,
        goalType: op.goalType,
      });
      return;
    case 'coach-student-program':
      await api.patch(`/students/${op.studentId}/program`, { programId: op.programId });
      return;
    case 'coach-student-notes':
      await api.patch(`/students/${op.studentId}/notes`, { notes: op.notes });
      return;
    case 'coach-remove-student':
      await deleteTolerant(`/students/${op.studentId}`);
      return;
    case 'create-program':
      await api.post('/programs', { clientId: op.clientId, ...op.body });
      return;
    case 'update-program':
      await api.patch(`/programs/${op.programId}`, op.body);
      return;
    case 'delete-program':
      await deleteTolerant(`/programs/${op.programId}`);
      return;
  }
}

async function deleteTolerant(url: string): Promise<void> {
  try {
    await api.delete(url);
  } catch (err) {
    if ((err as any)?.response?.status === 404) return; // já não existe — ok
    throw err;
  }
}

async function patchTolerant(url: string): Promise<void> {
  try {
    await api.patch(url);
  } catch (err) {
    if ((err as any)?.response?.status === 404) return;
    throw err;
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
    const touched = new Set<string>();

    for (const op of mine) {
      try {
        await replay(op);
      } catch (err) {
        if (isNetworkError(err)) break; // ainda offline — tenta de novo depois
        // erro real do servidor — descarta essa operação e segue
      }
      queue = queue.filter((o) => o.id !== op.id);
      await write(queue);
      for (const k of touchedKeys(op)) touched.add(JSON.stringify(k));
    }

    for (const k of touched) {
      qc.invalidateQueries({ queryKey: JSON.parse(k) as unknown[] });
    }
  } finally {
    flushing = false;
  }
}
