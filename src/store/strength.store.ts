import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { classifySets, epley1RM, round1, todayISO } from '@/lib/utils';

export type SetType = 'warmup' | 'prep' | 'feeder' | 'work' | null;

export type WorkSet = {
  id: string; // clientSetId — estável entre syncs, gerado na criação
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
  id: string; // também usado como clientId no sync com o backend
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
  // 'COMPLETED' marca que o usuário já tocou em Finalizar — a sessão fica persistida
  // até o checkpoint final ter sucesso, mesmo offline (ver finishSession em index.tsx)
  status: 'IN_PROGRESS' | 'COMPLETED';
  // presente quando o coach está registrando a sessão em nome de um aluno — direciona
  // o sync/discard para as rotas for-student em vez das rotas da própria sessão.
  // Carrega os dados que a tela dedicada de treino precisa e não teria de outra forma,
  // já que ela só lê o estado global (nenhum param de rota é passado).
  forStudent?: { id: string; name: string; units: 'kg' | 'lb' } | null;
};

export type PrCelebrationData = {
  prs: { exercise: string; e: number; prevBest: number; weight: number | null; reps: number | null }[];
  unit: 'kg' | 'lb';
};

type StrengthState = {
  templates: Template[];
  sessions: Session[];
  activeSession: ActiveSession | null;
  // PRs batidos ao finalizar um treino — setado pela tela dedicada de treino antes de
  // navegar de volta pra lista, e consumido/exibido por um único modal global montado
  // no root layout, já que a tela que disparou o PR não existe mais depois do back.
  pendingCelebration: PrCelebrationData | null;

  setTemplates: (t: Template[]) => void;
  addTemplate: (t: Template) => void;
  updateTemplate: (t: Template) => void;
  deleteTemplate: (id: string) => void;

  setSessions: (s: Session[]) => void;
  addSession: (s: Session) => void;
  deleteSession: (id: string) => void;

  setActiveSession: (s: ActiveSession | null) => void;
  updateActiveSession: (fn: (prev: ActiveSession) => ActiveSession) => void;
  setPendingCelebration: (c: PrCelebrationData | null) => void;
};

export function uid(prefix: string) {
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

export type BestSet = { weight: number; reps: number };

export function bestWorkSet(sets: WorkSet[]): BestSet | null {
  const types = classifySets(sets);
  let best: (BestSet & { e: number }) | null = null;
  sets.forEach((s, i) => {
    if (types[i] !== 'work') return;
    const e = epley1RM(s.weight, s.reps);
    if (!best || e > best.e) best = { weight: s.weight, reps: s.reps, e };
  });
  return best;
}

export function bestAnySet(sets: WorkSet[]): BestSet | null {
  let best: (BestSet & { e: number }) | null = null;
  sets.forEach((s) => {
    const e = epley1RM(s.weight, s.reps);
    if (!best || e > best.e) best = { weight: s.weight, reps: s.reps, e };
  });
  return best;
}

/** Melhor série (peso × reps) já registrada pra um exercício, combinando histórico + séries ainda não salvas da sessão ativa. */
export function currentPR(sessions: Session[], name: string, liveSets: WorkSet[] = []): BestSet | null {
  const historicalSets = sessionsWithExercise(sessions, name).flatMap((s) => {
    const ex = s.exercises.find((e) => e.name.toLowerCase() === name.toLowerCase());
    return ex ? ex.sets : [];
  });
  const allSets = [...historicalSets, ...liveSets];
  if (!allSets.length) return null;
  return bestWorkSet(allSets) || bestAnySet(allSets);
}

export function allExerciseNames(sessions: Session[], templates: Template[]): string[] {
  const set = new Set<string>();
  sessions.forEach((s) => s.exercises.forEach((e) => set.add(e.name)));
  templates.forEach((t) => t.exercises.forEach((n) => set.add(n)));
  return Array.from(set).sort();
}

export const useStrengthStore = create<StrengthState>()(
  persist(
    (set) => ({
      templates: seedTemplates(),
      sessions: [],
      activeSession: null,
      pendingCelebration: null,

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
      setPendingCelebration: (pendingCelebration) => set({ pendingCelebration }),
    }),
    {
      name: 'ascentio-active-session',
      storage: createJSONStorage(() => AsyncStorage),
      // templates/sessions vêm da API (React Query) — só a sessão ativa precisa
      // sobreviver a um kill do app, então é só ela que vai pro disco.
      partialize: (state) => ({ activeSession: state.activeSession }),
      version: 1,
    },
  ),
);
