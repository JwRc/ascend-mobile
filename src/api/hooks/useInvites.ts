import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type { Invite } from '../../types/api';

export function useInvites() {
  return useQuery({
    queryKey: ['invites'],
    queryFn: async () => {
      const res = await api.get<Invite[]>('/invites');
      return res.data;
    },
  });
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      contactType: 'email' | 'phone';
      contact: string;
      units: 'kg' | 'lb';
      programId?: string | null;
    }) => {
      const res = await api.post<Invite>('/invites', body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invites'] });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/invites/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invites'] });
    },
  });
}

export function useResendInvite() {
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/invites/${id}/resend`);
    },
  });
}
