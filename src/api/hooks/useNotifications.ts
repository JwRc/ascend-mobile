import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';

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
    mutationFn: (id: string) => api.patch(`/notify/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/notify/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
