import type { QueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { isNetworkError } from '@/lib/net';
import { round1 } from '@/lib/utils';
import { useStrengthStore, type ActiveSession } from '@/store/strength.store';
import type {
  StudentProfile,
  Workout,
  WorkoutSessionSnapshot,
  WorkoutSessionSyncResult,
  WorkoutStatus,
} from '@/types/api';

/** Monta o snapshot enviado pro backend a partir da sessão ativa local. Função pura. */
export function buildWorkoutSnapshot(
  session: ActiveSession,
  status: WorkoutStatus,
): WorkoutSessionSnapshot {
  const live = session.startedAt
    ? Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000))
    : 0;
  return {
    performedAt: new Date(session.date + 'T12:00:00').toISOString(),
    durationSec: (session.accumulatedSec || 0) + live,
    templateId: session.templateId,
    templateName: session.templateName,
    programId: session.programId,
    programName: session.programName,
    status,
    exercises: session.exercises
      .filter((ex) => ex.sets.length > 0)
      .map((ex) => ({
        name: ex.name,
        sets: ex.sets.map((s, i) => ({
          clientSetId: s.id,
          setNumber: i + 1,
          setType: (s.type?.toUpperCase() ??
            'WORK') as WorkoutSessionSnapshot['exercises'][0]['sets'][0]['setType'],
          reps: s.reps,
          weight: s.weight,
        })),
      })),
  };
}

/**
 * Constrói uma entrada otimista de `['workouts']` a partir da sessão local, pro
 * treino não sumir da lista enquanto o reenvio não teve sucesso. Usa `session.id`
 * como `id` — o mesmo id usado como `clientId` no PUT idempotente — então quando
 * o reenvio dá certo, `invalidateQueries(['workouts'])` refaz o fetch e troca o
 * array inteiro pelo dado real, sem risco de duplicata.
 */
export function buildOptimisticWorkout(session: ActiveSession): Workout {
  const snapshot = buildWorkoutSnapshot(session, 'COMPLETED');
  return {
    id: session.id,
    performedAt: snapshot.performedAt,
    durationSec: snapshot.durationSec,
    templateId: snapshot.templateId ?? null,
    templateName: snapshot.templateName ?? null,
    programId: snapshot.programId ?? null,
    programName: snapshot.programName ?? null,
    exercises: snapshot.exercises.map((ex) => ({
      name: ex.name,
      sets: ex.sets.map((s) => ({
        setNumber: s.setNumber,
        setType: s.setType,
        reps: s.reps,
        weight: s.weight,
      })),
    })),
    prs: [], // desconhecido até o servidor responder — a celebração de PR é tratada à parte
  };
}

/** Insere/atualiza um treino otimista em `['workouts']` (só sessões próprias — as
 *  lançadas pelo coach em nome de um aluno vivem em `['dashboard','student',id]`,
 *  uma estrutura agregada; refletir otimista lá é um problema à parte). */
export function upsertOptimisticWorkout(qc: QueryClient, workout: Workout): void {
  qc.setQueryData<Workout[]>(['workouts'], (prev = []) => [
    ...prev.filter((w) => w.id !== workout.id),
    workout,
  ]);
}

function sessionUrl(session: Pick<ActiveSession, 'id' | 'forStudent'>): string {
  const studentId = session.forStudent?.id;
  return studentId
    ? `/workouts/session/for-student/${studentId}/${session.id}`
    : `/workouts/session/${session.id}`;
}

async function putSnapshot(session: ActiveSession): Promise<WorkoutSessionSyncResult> {
  const snapshot = buildWorkoutSnapshot(session, session.status);
  const res = await api.put<WorkoutSessionSyncResult>(sessionUrl(session), snapshot);
  return res.data;
}

let flushing = false;

/**
 * Reenvia a sessão ativa persistida quando um sync anterior falhou (offline).
 * O `PUT /workouts/session/:clientId` é idempotente (chaveado por clientId +
 * clientSetId), então repetir não duplica treino nem séries.
 *
 * - `IN_PROGRESS`: só faz o checkpoint, mantém a sessão ativa.
 * - `COMPLETED`: finaliza de verdade — no sucesso limpa o activeSession, invalida
 *   as queries e dispara a celebração de PR que não chegou a aparecer offline.
 *
 * Silencioso: nunca lança. Se continuar offline, a sessão permanece pendente.
 */
export async function flushPendingWorkout(qc: QueryClient): Promise<void> {
  if (flushing) return;
  const session = useStrengthStore.getState().activeSession;
  if (!session) return;
  if (!session.exercises.some((e) => e.sets.length > 0)) return;

  flushing = true;
  try {
    const result = await putSnapshot(session);
    if (session.status !== 'COMPLETED') return;

    // só limpa se a sessão ativa ainda for a mesma que acabamos de enviar
    if (useStrengthStore.getState().activeSession?.id !== session.id) return;
    useStrengthStore.getState().setActiveSession(null);

    const studentId = session.forStudent?.id;
    if (studentId) {
      qc.invalidateQueries({ queryKey: ['dashboard', 'student', studentId] });
    } else {
      qc.invalidateQueries({ queryKey: ['workouts'] });
    }

    if (result.newPRs.length > 0) {
      const unit =
        session.forStudent?.units ??
        qc.getQueryData<StudentProfile>(['student', 'profile'])?.units ??
        'kg';
      useStrengthStore.getState().setPendingCelebration({
        prs: result.newPRs.map((pr) => ({
          exercise: pr.exerciseName,
          e: round1(pr.estimated1RM),
          prevBest: round1(pr.prevBest),
          weight: null,
          reps: null,
        })),
        unit,
      });
    }
  } catch (err) {
    if (!isNetworkError(err)) {
      // erro real do servidor (ex.: sessão já finalizada noutro device) — não
      // adianta reter pra sempre. Descarta a sessão presa em COMPLETED.
      if (
        session.status === 'COMPLETED' &&
        useStrengthStore.getState().activeSession?.id === session.id
      ) {
        useStrengthStore.getState().setActiveSession(null);
        qc.invalidateQueries({ queryKey: ['workouts'] });
      }
    } else if (session.status === 'COMPLETED' && !session.forStudent) {
      // ainda offline — reflete o treino na lista mesmo sem ter sincronizado.
      upsertOptimisticWorkout(qc, buildOptimisticWorkout(session));
    }
  } finally {
    flushing = false;
  }
}

/**
 * Sincroniza uma sessão órfã (preservada num logout forçado) sem tocar no estado
 * global — usado quando já existe outra sessão ativa e não dá pra restaurá-la na
 * store. Idempotente pelo mesmo motivo de flushPendingWorkout.
 */
export async function flushOrphanedWorkout(
  session: ActiveSession,
  qc: QueryClient,
): Promise<boolean> {
  if (!session.exercises.some((e) => e.sets.length > 0)) return true;
  try {
    await putSnapshot({ ...session, status: 'COMPLETED' });
    if (session.forStudent?.id) {
      qc.invalidateQueries({ queryKey: ['dashboard', 'student', session.forStudent.id] });
    } else {
      qc.invalidateQueries({ queryKey: ['workouts'] });
    }
    return true;
  } catch (err) {
    if (isNetworkError(err) && !session.forStudent) {
      // ainda offline — reflete o treino na lista mesmo sem ter sincronizado.
      upsertOptimisticWorkout(qc, buildOptimisticWorkout({ ...session, status: 'COMPLETED' }));
    }
    return !isNetworkError(err); // rede: falhou, tentar de novo depois
  }
}
