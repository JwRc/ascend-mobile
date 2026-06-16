import { create } from 'zustand';
import { epley1RM, round1, todayISO } from '@/lib/utils';

export type SetType = 'warmup' | 'prep' | 'feeder' | 'work' | null;

export type WorkSet = {
  weight: number;
  reps: number;
  type: SetType;
};

export type Exercise = {
  name: string;
  sets: WorkSet[];
};

export type Session = {
  id: string;
  date: string;
  templateId: string | null;
  templateName: string;
  programId: string | null;
  programName: string | null;
  durationSec: number;
  targetMin: number | null;
  exercises: Exercise[];
  prs?: { exercise: string; e: number; prevBest: number; weight: number | null; reps: number | null }[];
};

export type Template = {
  id: string;
  name: string;
  exercises: string[];
  targetMin: number | null;
};

export type ActiveSession = {
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
  exercises: Exercise[];
};

type StrengthState = {
  templates: Template[];
  sessions: Session[];
  activeSession: ActiveSession | null;

  setTemplates: (t: Template[]) => void;
  addTemplate: (t: Template) => void;
  updateTemplate: (t: Template) => void;
  deleteTemplate: (id: string) => void;

  setSessions: (s: Session[]) => void;
  addSession: (s: Session) => void;
  deleteSession: (id: string) => void;

  setActiveSession: (s: ActiveSession | null) => void;
  updateActiveSession: (fn: (prev: ActiveSession) => ActiveSession) => void;
};

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function seedTemplates(): Template[] {
  return [
    { id: uid('tpl'), name: 'Push', exercises: ['Supino', 'Incline Press', 'Elevação Lateral', 'Tríceps'], targetMin: 60 },
    { id: uid('tpl'), name: 'Pull', exercises: ['Puxada', 'Remada', 'Face Pull', 'Rosca'], targetMin: 55 },
    { id: uid('tpl'), name: 'Legs', exercises: ['Agachamento', 'Leg Press', 'Cadeira', 'Panturrilha'], targetMin: 65 },
  ];
}

export function exercisePeak1RM(sets: WorkSet[]): number {
  return Math.max(0, ...sets.map((s) => epley1RM(s.weight, s.reps)));
}

export function sessionsWithExercise(sessions: Session[], name: string): Session[] {
  return sessions.filter((s) =>
    s.exercises.some((e) => e.name.toLowerCase() === name.toLowerCase())
  );
}

export function allExerciseNames(sessions: Session[], templates: Template[]): string[] {
  const set = new Set<string>();
  sessions.forEach((s) => s.exercises.forEach((e) => set.add(e.name)));
  templates.forEach((t) => t.exercises.forEach((n) => set.add(n)));
  return Array.from(set).sort();
}

export const useStrengthStore = create<StrengthState>((set) => ({
  templates: seedTemplates(),
  sessions: [],
  activeSession: null,

  setTemplates: (templates) => set({ templates }),
  addTemplate: (t) => set((s) => ({ templates: [...s.templates, t] })),
  updateTemplate: (t) =>
    set((s) => ({ templates: s.templates.map((x) => (x.id === t.id ? t : x)) })),
  deleteTemplate: (id) => set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),

  setSessions: (sessions) => set({ sessions }),
  addSession: (session) =>
    set((s) => ({
      sessions: [...s.sessions, session].sort((a, b) => a.date.localeCompare(b.date)),
    })),
  deleteSession: (id) => set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) })),

  setActiveSession: (activeSession) => set({ activeSession }),
  updateActiveSession: (fn) =>
    set((s) => (s.activeSession ? { activeSession: fn(s.activeSession) } : {})),
}));
