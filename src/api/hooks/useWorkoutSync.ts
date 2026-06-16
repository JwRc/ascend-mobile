import React from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useWorkoutStore } from '@/store/workout.store';
import { useLogWorkout } from './useWorkouts';

export function useWorkoutSync() {
  const { pendingSync, dequeuePending } = useWorkoutStore();
  const logWorkout = useLogWorkout();

  React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (!state.isConnected || pendingSync.length === 0) return;
      try {
        for (const input of pendingSync) {
          await logWorkout.mutateAsync(input);
        }
        dequeuePending(pendingSync.length);
      } catch {
        // será retentado na próxima reconexão
      }
    });
    return unsubscribe;
  }, [pendingSync]);
}
