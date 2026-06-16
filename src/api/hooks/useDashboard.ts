import { useQuery } from '@tanstack/react-query';
import { api } from '../client';
import type { CoachDashboard, StudentSummary } from '../../types/api';

export function useCoachDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'coach'],
    queryFn: async () => {
      const res = await api.get<CoachDashboard>('/dashboard/coach');
      return res.data;
    },
  });
}

export function useStudentDashboard(id: string) {
  return useQuery({
    queryKey: ['dashboard', 'student', id],
    queryFn: async () => {
      const res = await api.get<StudentSummary>(`/dashboard/student/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}
