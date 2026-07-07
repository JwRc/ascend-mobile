import { useMutation } from '@tanstack/react-query';
import { api } from '../client';
import type { WorkoutSessionSnapshot, WorkoutSessionSyncResult } from '../../types/api';
import { capture } from '../../lib/analytics';

export function useSyncWorkoutSession() {
  return useMutation({
    mutationFn: async ({
      clientId,
      snapshot,
    }: {
      clientId: string;
      snapshot: WorkoutSessionSnapshot;
    }) => {
      const res = await api.put<WorkoutSessionSyncResult>(`/workouts/session/${clientId}`, snapshot);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.newPRs.length) capture('pr_achieved_live', { count: data.newPRs.length });
    },
  });
}

export function useDiscardWorkoutSession() {
  return useMutation({
    mutationFn: async (clientId: string) => {
      await api.delete(`/workouts/session/${clientId}`);
    },
  });
}
