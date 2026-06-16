import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type { Program } from '../../types/api';

export function usePrograms() {
  return useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const res = await api.get<Program[]>('/programs');
      return res.data;
    },
  });
}

export function useAssignedProgram() {
  return useQuery({
    queryKey: ['programs', 'assigned'],
    queryFn: async () => {
      try {
        const res = await api.get<Program>('/programs/assigned');
        return res.data;
      } catch (err: any) {
        if (err?.response?.status === 404) return null;
        throw err;
      }
    },
  });
}

export function useCreateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Omit<Program, 'id' | 'assignedCount'>) => {
      const res = await api.post<Program>('/programs', body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}

export function useUpdateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Omit<Program, 'assignedCount'>) => {
      const res = await api.patch<Program>(`/programs/${id}`, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}

export function useDeleteProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/programs/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programs'] });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
  });
}
