import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type { Program } from '../../types/api';
import { isNetworkError } from '../../lib/net';
import { useAuthStore } from '../../store/auth.store';
import {
  queueCreateProgram,
  queueUpdateProgram,
  queueDeleteProgram,
} from '../../lib/offline-queue';

type ProgramBody = {
  name: string;
  focus: string;
  perWeek: number;
  notes: string;
  days: Program['days'];
};

function toBody(input: { name: string; focus?: string; perWeek: number; notes?: string; days: Program['days'] }): ProgramBody {
  return {
    name: input.name,
    focus: input.focus ?? '',
    perWeek: input.perWeek,
    notes: input.notes ?? '',
    days: input.days,
  };
}

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
    mutationFn: async (input: Omit<Program, 'id' | 'assignedCount'>) => {
      const body = toBody(input);
      try {
        const res = await api.post<Program>('/programs', body);
        return res.data;
      } catch (err) {
        const userId = useAuthStore.getState().userId;
        if (!isNetworkError(err) || !userId) throw err;
        return queueCreateProgram(qc, userId, body);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}

export function useUpdateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Omit<Program, 'assignedCount'>) => {
      const body = toBody(input);
      try {
        const res = await api.patch<Program>(`/programs/${id}`, body);
        return res.data;
      } catch (err) {
        const userId = useAuthStore.getState().userId;
        if (!isNetworkError(err) || !userId) throw err;
        await queueUpdateProgram(qc, userId, { programId: id, body });
      }
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
      try {
        await api.delete(`/programs/${id}`);
      } catch (err) {
        const userId = useAuthStore.getState().userId;
        if (!isNetworkError(err) || !userId) throw err;
        await queueDeleteProgram(qc, userId, id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programs'] });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
  });
}
