import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type { Program, StudentSummary } from '../../types/api';
import { isNetworkError } from '../../lib/net';
import { useAuthStore } from '../../store/auth.store';
import {
  queueCoachStudentGoal,
  queueCoachStudentProgram,
  queueCoachStudentNotes,
  queueCoachRemoveStudent,
} from '../../lib/offline-queue';

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
      try {
        await api.patch(`/students/${id}/goal`, { targetWeight, goalType });
      } catch (err) {
        const userId = useAuthStore.getState().userId;
        if (!isNetworkError(err) || !userId) throw err;
        await queueCoachStudentGoal(qc, userId, { studentId: id, targetWeight, goalType });
      }
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
      try {
        await api.patch(`/students/${id}/program`, { programId });
      } catch (err) {
        const userId = useAuthStore.getState().userId;
        if (!isNetworkError(err) || !userId) throw err;
        const programName =
          programId != null
            ? qc.getQueryData<Program[]>(['programs'])?.find((p) => p.id === programId)?.name ?? null
            : null;
        await queueCoachStudentProgram(qc, userId, { studentId: id, programId, programName });
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['students', vars.id] });
    },
  });
}

export function useUpdateStudentNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ athleteId, notes }: { athleteId: string; notes: string }) => {
      try {
        await api.patch(`/students/${athleteId}/notes`, { notes });
      } catch (err) {
        const userId = useAuthStore.getState().userId;
        if (!isNetworkError(err) || !userId) throw err;
        await queueCoachStudentNotes(qc, userId, { studentId: athleteId, notes });
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['students', vars.athleteId] });
    },
  });
}

export function useRemoveStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.delete(`/students/${id}`);
      } catch (err) {
        const userId = useAuthStore.getState().userId;
        if (!isNetworkError(err) || !userId) throw err;
        await queueCoachRemoveStudent(qc, userId, id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'coach'] });
    },
  });
}
