import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type { StudentProfile } from '../../types/api';

export function useStudentProfile() {
  return useQuery({
    queryKey: ['student', 'profile'],
    queryFn: async () => {
      const res = await api.get<StudentProfile>('/students/me');
      return res.data;
    },
  });
}

export function useUpdateStudentProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Pick<StudentProfile, 'name' | 'units' | 'heightCm' | 'activityLevel' | 'reminders'>>) => {
      const res = await api.patch<StudentProfile>('/students/me', body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', 'profile'] });
    },
  });
}
