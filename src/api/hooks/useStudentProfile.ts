import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type { StudentProfile } from '../../types/api';
import { isNetworkError } from '../../lib/net';
import { queuePatchProfile } from '../../lib/offline-queue';
import { useAuthStore } from '../../store/auth.store';

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
      try {
        const res = await api.patch<StudentProfile>('/students/me', body);
        return res.data;
      } catch (err) {
        const userId = useAuthStore.getState().userId;
        if (!isNetworkError(err) || !userId) throw err;
        // offline: enfileira e reflete otimisticamente — ressincroniza ao reconectar
        return queuePatchProfile(qc, userId, body);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', 'profile'] });
    },
  });
}
