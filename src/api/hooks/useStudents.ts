import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type { StudentSummary } from '../../types/api';

export function useStudents() {
  return useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const res = await api.get<StudentSummary[]>('/students');
      return res.data;
    },
  });
}

export function useStudentById(id: string) {
  return useQuery({
    queryKey: ['students', id],
    queryFn: async () => {
      const res = await api.get<StudentSummary>(`/students/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useUpdateStudentGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, targetWeight, goalType }: { id: string; targetWeight: number; goalType: 'LOSE' | 'GAIN' | 'MAINTAIN' }) => {
      await api.patch(`/students/${id}/goal`, { targetWeight, goalType });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['students', vars.id] });
    },
  });
}

export function useAssignStudentProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, programId }: { id: string; programId: string | null }) => {
      await api.patch(`/students/${id}/program`, { programId });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['students', vars.id] });
    },
  });
}

export function useRemoveStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/students/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
    },
  });
}
