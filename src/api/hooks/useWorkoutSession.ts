import { useMutation } from '@tanstack/react-query';
import { api } from '../client';
import type { WorkoutSessionSnapshot, WorkoutSessionSyncResult } from '../../types/api';
import { capture } from '../../lib/analytics';

export function useSyncWorkoutSession() {
  return useMutation({
    mutationFn: async ({
      clientId,
      snapshot,
      studentId,
    }: {
      clientId: string;
      snapshot: WorkoutSessionSnapshot;
      studentId?: string;
    }) => {
      const url = studentId
        ? `/workouts/session/for-student/${studentId}/${clientId}`
        : `/workouts/session/${clientId}`;
      const res = await api.put<WorkoutSessionSyncResult>(url, snapshot);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.newPRs.length) capture('pr_achieved_live', { count: data.newPRs.length });
    },
  });
}

export function useDiscardWorkoutSession() {
  return useMutation({
    mutationFn: async ({ clientId, studentId }: { clientId: string; studentId?: string }) => {
      const url = studentId
        ? `/workouts/session/for-student/${studentId}/${clientId}`
        : `/workouts/session/${clientId}`;
      await api.delete(url);
    },
  });
}
