import { create } from 'zustand';
import type { WorkoutInput } from '@/types/api';
import { todayISO, epley1RM, round1 } from '@/lib/utils';

export type WorkoutSetType = 'WARMUP' | 'PREP' | 'FEEDER' | 'WORK';

export type ActiveSet = {
  weight: number;
  reps: number;
  type: WorkoutSetType | null;
};

export type ActiveExercise = {
  name: string;
  sets: ActiveSet[];
};

export type ActiveWorkoutSession = {
  id: string;
  date: string;
  templateId: string | null;
  templateName: string;
  programId: string | null;
  programName: string | null;
  yolo: boolean;
  startedAt: number | null;
  accumulatedSec: number;
  targetMin: number | null;
  exercises: ActiveExercise[];
};

type WorkoutStore = {
  activeSession: ActiveWorkoutSession | null;
  pendingSync: WorkoutInput[];

  startSession: (params: {
    templateId: string | null;
    templateName: string;
    programId: string | null;
    programName: string | null;
    exerciseNames: string[];
    targetMin: number | null;
    yolo: boolean;
  }) => void;
  resumeTimer: () => void;
  pauseTimer: () => void;
  addExercise: (name: string) => void;
  addSet: (exerciseName: string, set: ActiveSet) => void;
  discardSession: () => void;
  buildWorkoutInput: () => WorkoutInput | null;
  enqueuePending: (input: WorkoutInput) => void;
  dequeuePending: (count: number) => void;
  clearSession: () => void;
};

function uid() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  activeSession: null,
  pendingSync: [],

  startSession: ({ templateId, templateName, programId, programName, exerciseNames, targetMin, yolo }) =>
    set({
      activeSession: {
        id: uid(),
        date: todayISO(),
        templateId,
        templateName,
        programId,
        programName,
        yolo,
        startedAt: null,
        accumulatedSec: 0,
        targetMin,
        exercises: exerciseNames.map((name) => ({ name, sets: [] })),
      },
    }),

  resumeTimer: () =>
    set((s) => {
      if (!s.activeSession || s.activeSession.startedAt !== null) return {};
      return { activeSession: { ...s.activeSession, startedAt: Date.now() } };
    }),

  pauseTimer: () =>
    set((s) => {
      const session = s.activeSession;
      if (!session || session.startedAt === null) return {};
      const elapsed = Math.floor((Date.now() - session.startedAt) / 1000);
      return {
        activeSession: {
          ...session,
          startedAt: null,
          accumulatedSec: session.accumulatedSec + elapsed,
        },
      };
    }),

  addExercise: (name) =>
    set((s) => {
      if (!s.activeSession) return {};
      return {
        activeSession: {
          ...s.activeSession,
          exercises: [...s.activeSession.exercises, { name, sets: [] }],
        },
      };
    }),

  addSet: (exerciseName, newSet) =>
    set((s) => {
      if (!s.activeSession) return {};
      const exercises = s.activeSession.exercises.map((ex) => {
        if (ex.name !== exerciseName) return ex;
        return { ...ex, sets: [...ex.sets, newSet] };
      });
      return { activeSession: { ...s.activeSession, exercises } };
    }),

  buildWorkoutInput: () => {
    const session = get().activeSession;
    if (!session) return null;
    const live = session.startedAt
      ? Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000))
      : 0;
    const durationSec = session.accumulatedSec + live;

    return {
      performedAt: new Date(session.date + 'T12:00:00').toISOString(),
      durationSec,
      templateId: session.templateId,
      templateName: session.templateName,
      programId: session.programId,
      programName: session.programName,
      exercises: session.exercises
        .filter((ex) => ex.sets.length > 0)
        .map((ex) => ({
          name: ex.name,
          sets: ex.sets.map((s, i) => ({
            setNumber: i + 1,
            setType: (s.type?.toUpperCase() ?? 'WORK') as WorkoutInput['exercises'][0]['sets'][0]['setType'],
            reps: s.reps,
            weight: s.weight,
          })),
        })),
    };
  },

  discardSession: () => set({ activeSession: null }),

  clearSession: () => set({ activeSession: null }),

  enqueuePending: (input) =>
    set((s) => ({ pendingSync: [...s.pendingSync, input] })),

  dequeuePending: (count) =>
    set((s) => ({ pendingSync: s.pendingSync.slice(count) })),
}));
