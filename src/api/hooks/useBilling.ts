import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';

type Prices = {
  coach: { basePrice: number; baseStudents: number; extraStudentPrice: number; currency: string };
  standalone: { price: number; currency: string };
};

type Card = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
};

export function usePrices() {
  return useQuery({
    queryKey: ['billing', 'prices'],
    queryFn: async () => {
      const res = await api.get<Prices>('/billing/prices');
      return res.data;
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useCards() {
  return useQuery({
    queryKey: ['billing', 'cards'],
    queryFn: async () => {
      const res = await api.get<Card[]>('/billing/cards');
      return res.data;
    },
  });
}

export function useCreateSetupIntent() {
  return useMutation({
    mutationFn: async ({ setAsDefault }: { setAsDefault?: boolean } = {}) => {
      const res = await api.post<{ clientSecret: string }>('/billing/setup-intent', { setAsDefault });
      return res.data;
    },
  });
}

export function useDeleteCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/billing/cards/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing', 'cards'] });
    },
  });
}

export function useSetDefaultCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/billing/cards/${id}/default`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing', 'cards'] });
    },
  });
}

export function useGetPortalUrl() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.get<{ url: string }>('/billing/portal');
      return res.data;
    },
  });
}

export function useCancelSubscription() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<{ cancelAtPeriodEnd: boolean }>('/billing/cancel');
      return res.data;
    },
  });
}
