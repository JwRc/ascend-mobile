import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type { WorkoutTemplate } from '../../types/api';
import { isNetworkError } from '../../lib/net';
import { useAuthStore } from '../../store/auth.store';
import {
  queueCreateTemplate,
  queueUpdateTemplate,
  queueDeleteTemplate,
} from '../../lib/offline-queue';

type TemplateBody = { name: string; exercises: string[]; targetMin?: number | null };

export function useWorkoutTemplates() {
  return useQuery({
    queryKey: ['workout-templates'],
    queryFn: async () => {
      const res = await api.get<WorkoutTemplate[]>('/workout-templates');
      return res.data;
    },
  });
}

export function useCreateWorkoutTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: TemplateBody) => {
      const fields = {
        name: body.name,
        exercises: body.exercises,
        targetMin: body.targetMin ?? null,
      };
      try {
        const res = await api.post<WorkoutTemplate>('/workout-templates', fields);
        return res.data;
      } catch (err) {
        const userId = useAuthStore.getState().userId;
        if (!isNetworkError(err) || !userId) throw err;
        return queueCreateTemplate(qc, userId, fields);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout-templates'] });
    },
  });
}

export function useUpdateWorkoutTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & TemplateBody) => {
      const fields = {
        name: body.name,
        exercises: body.exercises,
        targetMin: body.targetMin ?? null,
      };
      try {
        const res = await api.patch<WorkoutTemplate>(`/workout-templates/${id}`, fields);
        return res.data;
      } catch (err) {
        const userId = useAuthStore.getState().userId;
        if (!isNetworkError(err) || !userId) throw err;
        await queueUpdateTemplate(qc, userId, { templateId: id, ...fields });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout-templates'] });
    },
  });
}

export function useDeleteWorkoutTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.delete(`/workout-templates/${id}`);
      } catch (err) {
        const userId = useAuthStore.getState().userId;
        if (!isNetworkError(err) || !userId) throw err;
        await queueDeleteTemplate(qc, userId, id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout-templates'] });
    },
  });
}
