import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type { Goal } from '../../types/api';

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
      const res = await api.post<Goal>('/goals', { targetWeight, goalType });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals', 'active'] });
      qc.invalidateQueries({ queryKey: ['student', 'profile'] });
    },
  });
}
