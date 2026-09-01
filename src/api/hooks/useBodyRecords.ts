import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type { BodyRecord } from '../../types/api';
import { capture } from '../../lib/analytics';
import { isNetworkError } from '../../lib/net';
import { queueLogWeight, queueDeleteWeight, isLocalRecordId } from '../../lib/offline-queue';
import { useAuthStore } from '../../store/auth.store';

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
      try {
        const res = await api.post<BodyRecord>('/body-records', { weight, recordedAt });
        return res.data;
      } catch (err) {
        const userId = useAuthStore.getState().userId;
        if (!isNetworkError(err) || !userId) throw err;
        // offline: enfileira e reflete otimisticamente — ressincroniza ao reconectar
        return queueLogWeight(qc, userId, { weight, date });
      }
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
      const userId = useAuthStore.getState().userId;
      // registro que só existe na fila offline — resolve sem tocar no servidor
      if (isLocalRecordId(id) && userId) {
        await queueDeleteWeight(qc, userId, id);
        return;
      }
      try {
        await api.delete(`/body-records/${id}`);
      } catch (err) {
        if (!isNetworkError(err) || !userId) throw err;
        await queueDeleteWeight(qc, userId, id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['body-records'] });
    },
  });
}
