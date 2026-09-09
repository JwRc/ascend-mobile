import { useQuery } from '@tanstack/react-query';
import { api } from '../client';
import type { Workout } from '../../types/api';

// O fluxo real de escrita de um treino é `useWorkoutSession.ts` (PUT idempotente
// por clientId, disparado por ActiveWorkoutScreen). Este hook cuida só da leitura.
export function useWorkouts() {
  return useQuery({
    queryKey: ['workouts'],
    queryFn: async () => {
      const res = await api.get<Workout[]>('/workouts');
      return res.data;
    },
  });
}
