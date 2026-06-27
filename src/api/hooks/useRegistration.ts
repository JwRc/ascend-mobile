import { useMutation } from '@tanstack/react-query';
import { api } from '../client';

type StandaloneProfile = {
  startWeight: number;
  heightCm: number;
  activityLevel: 'sed' | 'light' | 'mod' | 'high';
  units: 'kg' | 'lb';
  reminders: boolean;
};

export function useActivateStandalone() {
  return useMutation({
    mutationFn: async (profile: StandaloneProfile) => {
      const res = await api.post('/users/me/activate-standalone', profile);
      return res.data;
    },
  });
}

export function useCreateTenant() {
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post('/tenants', { name });
      return res.data;
    },
  });
}
