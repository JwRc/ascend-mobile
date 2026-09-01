import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type { Goal } from '../../types/api';
import { capture } from '../../lib/analytics';
import { isNetworkError } from '../../lib/net';
import { queueSetGoal } from '../../lib/offline-queue';
import { useAuthStore } from '../../store/auth.store';

export function useActiveGoal() {
  return useQuery({
    queryKey: ['goals', 'active'],
    queryFn: async () => {
      const res = await api.get<Goal>('/goals/active');
      return res.data;
    },
  });
}

export function useSetGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ targetWeight, goalType }: { targetWeight: number; goalType: 'LOSE' | 'GAIN' | 'MAINTAIN' }) => {
      try {
        const res = await api.post<Goal>('/goals', { targetWeight, goalType });
        return res.data;
      } catch (err) {
        const userId = useAuthStore.getState().userId;
        if (!isNetworkError(err) || !userId) throw err;
        return queueSetGoal(qc, userId, { targetWeight, goalType });
      }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['goals', 'active'] });
      qc.invalidateQueries({ queryKey: ['student', 'profile'] });
      capture('goal_set', { goalType: data.goalType });
    },
  });
}
