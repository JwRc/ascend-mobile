import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { capture } from '@/lib/analytics';

export type TicketStatus = 'new' | 'open' | 'stalled' | 'resolved' | 'rejected' | 'deleted';

export type SupportMessage = {
  content: string;
  isFromSupport: boolean;
  createdAt: string;
};

export type SupportTicket = {
  id: string;
  subject: string;
  status: TicketStatus;
  lastUpdatedAt: string;
  messages: SupportMessage[];
};

export function useSupportTickets() {
  return useQuery({
    queryKey: ['support', 'tickets'],
    queryFn: async () => {
      const res = await api.get<SupportTicket[]>('/support/tickets');
      return res.data ?? [];
    },
    refetchInterval: 15_000,
  });
}

export function useSupportTicket(id: string) {
  return useQuery({
    queryKey: ['support', 'tickets', id],
    queryFn: async () => {
      const res = await api.get<SupportTicket>(`/support/tickets/${id}`);
      return res.data;
    },
    refetchInterval: 15_000,
    enabled: !!id,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { subject: string; message: string }) => {
      const res = await api.post<SupportTicket>('/support/tickets', payload);
      return res.data;
    },
    onSuccess: () => {
      capture('support_ticket_created');
      qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
  });
}

export function useReplyToTicket(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (message: string) => {
      const res = await api.patch<SupportTicket>(`/support/tickets/${id}`, { message });
      return res.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(['support', 'tickets', id], data);
      qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
  });
}

export function useCloseTicket(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (resolved: boolean) => {
      const status = resolved ? 'solucionado' : 'nao_solucionado';
      const res = await api.patch<SupportTicket>(`/support/tickets/${id}`, { status });
      return { data: res.data, resolved };
    },
    onSuccess: ({ data, resolved }) => {
      capture('support_ticket_closed', { resolved });
      qc.setQueryData(['support', 'tickets', id], data);
      qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
  });
}
