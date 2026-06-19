import React from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useOfflineStore } from '@/store/offline.store';
import { useLogWorkout } from './useWorkouts';
import type { WorkoutInput } from '@/types/api';

export function useWorkoutSync() {
  const { queue, dequeue } = useOfflineStore();
  const logWorkout = useLogWorkout();

  const pendingWorkouts = queue.filter((m) => m.type === 'LOG_WORKOUT');

  React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (!state.isConnected || pendingWorkouts.length === 0) return;
      const processed: string[] = [];
      try {
        for (const mutation of pendingWorkouts) {
          await logWorkout.mutateAsync(mutation.payload as WorkoutInput);
          processed.push(mutation.id);
        }
      } catch {
        // será retentado na próxima reconexão
      } finally {
        if (processed.length > 0) dequeue(processed);
      }
    });
    return unsubscribe;
  }, [pendingWorkouts]);
}
