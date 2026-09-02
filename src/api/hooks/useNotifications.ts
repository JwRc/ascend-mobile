import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { isNetworkError } from '../../lib/net';
import { useAuthStore } from '../../store/auth.store';
import { queueNotifRead, queueNotifReadAll } from '../../lib/offline-queue';

export type Notification = {
  id: string;
  type: string;
  payload: { title: string; body: string; data?: Record<string, string> };
  createdAt: string;
  readAt: string | null;
};

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get<Notification[]>('/notify');
      return res.data ?? [];
    },
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.patch(`/notify/${id}/read`);
      } catch (err) {
        const userId = useAuthStore.getState().userId;
        if (!isNetworkError(err) || !userId) throw err;
        await queueNotifRead(qc, userId, id);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        await api.patch('/notify/read-all');
      } catch (err) {
        const userId = useAuthStore.getState().userId;
        if (!isNetworkError(err) || !userId) throw err;
        await queueNotifReadAll(qc, userId);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
