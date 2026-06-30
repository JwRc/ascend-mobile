import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type { BodyRecord } from '../../types/api';
import { capture } from '../../lib/analytics';

export function useBodyRecords() {
  return useQuery({
    queryKey: ['body-records'],
    queryFn: async () => {
      const res = await api.get<BodyRecord[]>('/body-records');
      return res.data;
    },
  });
}

export function useLogWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ weight, date }: { weight: number; date: string }) => {
      // Send local noon to avoid UTC day mismatch across timezones
      const recordedAt = new Date(date + 'T12:00:00').toISOString();
      const res = await api.post<BodyRecord>('/body-records', { weight, recordedAt });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['body-records'] });
      capture('weight_logged');
    },
  });
}

export function useDeleteBodyRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/body-records/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['body-records'] });
    },
  });
}
