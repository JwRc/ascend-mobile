import { create } from 'zustand';
import { round1, todayISO } from '@/lib/utils';
import type { WeightEntry } from '@/types/api';

// ─── Constants ───────────────────────────────────────────────────────────────

export const STALE_DAYS = 5;

export const COACH_ACCOUNT = {
  coachName: 'Marcus',
  email: 'marcus@ascend.coach',
  basePrice: 49,
  pricePerExtra: 9,
  includedSeats: 3,
};

export function billingFor(activeCount: number) {
  const extra = Math.max(0, activeCount - COACH_ACCOUNT.includedSeats);
  return { extra, total: COACH_ACCOUNT.basePrice + extra * COACH_ACCOUNT.pricePerExtra };
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type Flag = {
  type: 'stale' | 'trend' | 'missed';
  label: string;
};

export type TrainingDay = {
  id: string;
  name: string;
  exercises: string[];
};

export type CoachProgram = {
  id: string;
  name: string;
  focus: string;
  perWeek: number;
  days: TrainingDay[];
};

export type CoachAthlete = {
  id: string;
  name: string;
  email: string;
  contactType: 'email' | 'phone';
  status: 'active' | 'invited' | 'inactive';
  units: 'kg' | 'lb';
  programId: string | null;
  programName: string | null;
  trend: number;
  weekDelta: number;
  goal: number;
  goalDir: 'lose' | 'gain' | 'maintain';
  goalPct: number;
  daysSinceLog: number | null;
  sessionsThisWeek: number;
  assignedPerWeek: number | null;
  flags: Flag[];
  severity: number;
  onTrack: boolean;
  notes: string;
  goalSetBy: 'athlete' | 'coach';
  weightEntries?: WeightEntry[];
  invitedAt?: number;
};

export type CoachStats = {
  activeCount: number;
  invitedCount: number;
  flaggedCount: number;
  flagged: CoachAthlete[];
  onTrack: number;
  loggedThisWeek: number;
  adherencePct: number;
  totalDone: number;
  totalAssigned: number;
  sessionPct: number;
  quiet: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function flagsFor(a: Omit<CoachAthlete, 'flags' | 'severity' | 'onTrack'>): Flag[] {
  if (a.status !== 'active') return [];
  const out: Flag[] = [];
  if (a.daysSinceLog != null && a.daysSinceLog >= STALE_DAYS) {
    out.push({ type: 'stale', label: `Sem log · ${a.daysSinceLog}d` });
  }
  const goingWrong =
    a.goalDir === 'lose' ? a.weekDelta > 0.3
    : a.goalDir === 'gain' ? a.weekDelta < -0.3
    : false;
  if (goingWrong) out.push({ type: 'trend', label: 'Tendência oposta à meta' });
  if (a.assignedPerWeek && a.assignedPerWeek - a.sessionsThisWeek >= 2) {
    out.push({ type: 'missed', label: `${a.assignedPerWeek - a.sessionsThisWeek} sessões perdidas` });
  }
  return out;
}

function severity(flags: Flag[]): number {
  return flags.reduce((s, f) => s + (f.type === 'stale' ? 30 : f.type === 'trend' ? 20 : 10), 0);
}

export function buildAthlete(
  base: Omit<CoachAthlete, 'flags' | 'severity' | 'onTrack'>
): CoachAthlete {
  const flags = flagsFor(base);
  const sev = severity(flags);
  return { ...base, flags, severity: sev, onTrack: base.status === 'active' && flags.length === 0 && base.goalPct > 0 };
}

export function rosterStats(athletes: CoachAthlete[]): CoachStats {
  const active = athletes.filter((a) => a.status === 'active');
  const invited = athletes.filter((a) => a.status === 'invited');
  const flagged = active.filter((a) => a.flags.length > 0).sort((a, b) => b.severity - a.severity);
  const loggedThisWeek = active.filter((a) => a.daysSinceLog != null && a.daysSinceLog <= 6).length;
  const totalAssigned = active.reduce((s, a) => s + (a.assignedPerWeek ?? 0), 0);
  const totalDone = active.reduce((s, a) => s + Math.min(a.sessionsThisWeek, a.assignedPerWeek ?? 0), 0);
  return {
    activeCount: active.length,
    invitedCount: invited.length,
    flaggedCount: flagged.length,
    flagged,
    onTrack: active.filter((a) => a.onTrack).length,
    loggedThisWeek,
    adherencePct: active.length ? Math.round((loggedThisWeek / active.length) * 100) : 0,
    totalDone,
    totalAssigned,
    sessionPct: totalAssigned ? Math.round((totalDone / totalAssigned) * 100) : 0,
    quiet: active.filter((a) => a.daysSinceLog != null && a.daysSinceLog >= STALE_DAYS).length,
  };
}

// ─── Seed programs ────────────────────────────────────────────────────────────

let _pid = 1;
let _did = 1;
const pid = () => `prog_${_pid++}`;
const did = () => `day_${_did++}`;

export function seedPrograms(): CoachProgram[] {
  return [
    {
      id: pid(), name: 'Hipertrofia A', focus: 'Hipertrofia', perWeek: 4,
      days: [
        { id: did(), name: 'Push', exercises: ['Supino', 'Incline Press', 'Elevação Lateral', 'Tríceps Corda'] },
        { id: did(), name: 'Pull', exercises: ['Puxada', 'Remada Máquina', 'Face Pull', 'Rosca Alternada'] },
        { id: did(), name: 'Legs', exercises: ['Agachamento', 'Leg Press', 'Cadeira Extensora', 'Panturrilha'] },
      ],
    },
    {
      id: pid(), name: 'Força 5x5', focus: 'Força', perWeek: 3,
      days: [
        { id: did(), name: 'A', exercises: ['Agachamento', 'Supino', 'Remada Curvada'] },
        { id: did(), name: 'B', exercises: ['Agachamento', 'Desenvolvimento', 'Levantamento Terra'] },
      ],
    },
    {
      id: pid(), name: 'PPL', focus: 'Volume', perWeek: 6,
      days: [
        { id: did(), name: 'Push', exercises: ['Supino', 'Desenvolvimento', 'Elevação Lateral', 'Tríceps'] },
        { id: did(), name: 'Pull', exercises: ['Puxada', 'Remada', 'Face Pull', 'Rosca'] },
        { id: did(), name: 'Legs', exercises: ['Agachamento', 'Leg Press', 'Cadeira', 'Panturrilha'] },
      ],
    },
    {
      id: pid(), name: 'Cutting', focus: 'Definição', perWeek: 4,
      days: [
        { id: did(), name: 'Upper A', exercises: ['Supino', 'Remada', 'Desenvolvimento', 'Rosca'] },
        { id: did(), name: 'Lower A', exercises: ['Agachamento', 'Leg Press', 'Cadeira', 'Panturrilha'] },
        { id: did(), name: 'Upper B', exercises: ['Supino Inclinado', 'Puxada', 'Elevação Lateral', 'Tríceps'] },
        { id: did(), name: 'Lower B', exercises: ['Terra Romeno', 'Leg Curl', 'Afundo', 'Panturrilha'] },
      ],
    },
    {
      id: pid(), name: 'Off-season', focus: 'Ganho', perWeek: 3,
      days: [
        { id: did(), name: 'Full A', exercises: ['Agachamento', 'Supino', 'Remada', 'Desenvolvimento'] },
        { id: did(), name: 'Full B', exercises: ['Terra', 'Supino Inclinado', 'Puxada', 'Rosca'] },
      ],
    },
    {
      id: pid(), name: 'Full Body', focus: 'Manutenção', perWeek: 3,
      days: [
        { id: did(), name: 'A', exercises: ['Agachamento', 'Supino', 'Remada', 'Desenvolvimento', 'Rosca'] },
        { id: did(), name: 'B', exercises: ['Terra', 'Supino Inclinado', 'Puxada', 'Elevação', 'Tríceps'] },
      ],
    },
  ];
}

// ─── Seed athletes ────────────────────────────────────────────────────────────

const NAMES = [
  'Ana Lima', 'Carlos Souza', 'Beatriz Ferreira', 'Diego Rocha', 'Fernanda Costa',
  'Gabriel Silva', 'Helena Martins', 'Igor Alves', 'Juliana Pereira', 'Lucas Oliveira',
  'Mariana Nunes', 'Nathan Santos', 'Olivia Castro', 'Pedro Mendes', 'Renata Torres',
  'Sérgio Lima', 'Thaís Barbosa', 'Ulisses Cardoso', 'Vanessa Reis', 'Wagner Melo',
  'André Moura', 'Bruna Teixeira', 'Claudio Araújo', 'Dani Lopes', 'Eduardo Gomes',
  'Flávia Correia', 'Gustavo Freitas', 'Hanna Borges', 'Igor Pinto', 'Joana Vieira',
];

export function seedAthletes(programs: CoachProgram[]): CoachAthlete[] {
  function prog(i: number) { return programs[i % programs.length]; }

  function add(
    idx: number,
    status: CoachAthlete['status'],
    daysSinceLog: number | null,
    trend: number,
    weekDelta: number,
    goal: number,
    goalDir: CoachAthlete['goalDir'],
    sessionsThisWeek: number,
    progIdx: number | null
  ): CoachAthlete {
    const name = NAMES[idx % NAMES.length];
    const p = progIdx !== null ? prog(progIdx) : null;
    const span = Math.max(1, Math.abs(trend - goal));
    const moved = Math.abs(trend - (trend + weekDelta * 4));
    const goalPct = Math.max(0, Math.min(100, Math.round((1 - Math.abs(trend - goal) / (span + 8)) * 100)));
    const base: Omit<CoachAthlete, 'flags' | 'severity' | 'onTrack'> = {
      id: `ath_${idx}`,
      name,
      email: `${name.split(' ')[0].toLowerCase()}.${name.split(' ')[1].toLowerCase()}@email.com`,
      contactType: 'email',
      status,
      units: idx % 7 === 0 ? 'lb' : 'kg',
      programId: p?.id ?? null,
      programName: p?.name ?? null,
      trend: round1(trend),
      weekDelta: round1(weekDelta),
      goal: round1(goal),
      goalDir,
      goalPct: status === 'invited' ? 0 : goalPct,
      daysSinceLog,
      sessionsThisWeek: status === 'invited' ? 0 : sessionsThisWeek,
      assignedPerWeek: p?.perWeek ?? null,
      notes: '',
      goalSetBy: 'athlete',
      invitedAt: status === 'invited' ? Date.now() - 1000 * 60 * 60 * 24 * (idx % 5 + 1) : undefined,
    };
    return buildAthlete(base);
  }

  // active — on track
  const athletes: CoachAthlete[] = [
    add(0,  'active', 0,  72.4, -0.3, 68.0, 'lose',     4, 0),
    add(1,  'active', 1,  85.1, -0.5, 78.0, 'lose',     3, 1),
    add(2,  'active', 0,  65.8, -0.2, 60.0, 'lose',     4, 2),
    add(3,  'active', 2,  90.0,  0.4, 95.0, 'gain',     3, 1),
    add(4,  'active', 0,  78.3, -0.6, 70.0, 'lose',     6, 2),
    add(5,  'active', 1,  68.5,  0.2, 72.0, 'gain',     3, 3),
    add(6,  'active', 3,  55.2, -0.1, 52.0, 'lose',     4, 0),
    add(7,  'active', 0, 102.0, -0.8, 92.0, 'lose',     3, 4),
    add(8,  'active', 1,  74.7, -0.4, 70.0, 'lose',     4, 5),
    add(9,  'active', 2,  81.0,  0.3, 85.0, 'gain',     3, 1),
    add(10, 'active', 0,  63.5, -0.3, 60.0, 'lose',     4, 0),
    add(11, 'active', 1,  95.2, -0.5, 88.0, 'lose',     6, 2),
    add(12, 'active', 3,  58.8, -0.2, 55.0, 'lose',     3, 3),
    add(13, 'active', 0, 110.5, -1.0, 98.0, 'lose',     4, 4),
    add(27, 'active', 0,  77.0, -0.3, 72.0, 'lose',     4, 5),
    add(28, 'active', 1,  84.5, -0.4, 80.0, 'lose',     3, 1),
    add(29, 'active', 2,  59.0, -0.1, 56.0, 'lose',     3, 3),
    // active — needs attention: stale
    add(14, 'active',  8, 76.1,  0.0, 70.0, 'lose',     0, 0),
    add(15, 'active',  6, 88.4,  0.2, 82.0, 'lose',     1, 1),
    add(16, 'active', 12, 65.0,  0.0, 60.0, 'lose',     0, null),
    // active — needs attention: trending wrong
    add(17, 'active',  1, 73.2,  0.8, 68.0, 'lose',     4, 2),
    add(18, 'active',  2, 92.0,  1.2, 85.0, 'lose',     3, 0),
    add(19, 'active',  0, 61.0, -0.6, 65.0, 'gain',     4, 3),
    // active — needs attention: missed sessions
    add(20, 'active',  1, 80.5, -0.3, 75.0, 'lose',     0, 0),
    add(21, 'active',  3, 67.0, -0.1, 63.0, 'lose',     0, 1),
    // active — inactive (very stale)
    add(25, 'active', 18, 69.0,  0.0, 65.0, 'lose',     0, null),
    add(26, 'active', 22, 88.0,  0.0, 80.0, 'lose',     0, 0),
    // invited
    add(22, 'invited', null, 0, 0, 0, 'lose', 0, 0),
    add(23, 'invited', null, 0, 0, 0, 'lose', 0, 2),
    add(24, 'invited', null, 0, 0, 0, 'gain', 0, null),
  ];

  return athletes;
}

// ─── Zustand Store ───────────────────────────────────────────────────────────

const _seedPrograms = seedPrograms();
const _seedAthletes = seedAthletes(_seedPrograms);

type CoachState = {
  athletes: CoachAthlete[];
  programs: CoachProgram[];

  updateAthleteGoal: (id: string, goal: number) => void;
  updateAthleteNotes: (id: string, notes: string) => void;
  assignProgram: (athleteId: string, programId: string | null) => void;
  addInvite: (payload: {
    name: string;
    email: string;
    contactType: 'email' | 'phone';
    units: 'kg' | 'lb';
    programId: string | null;
  }) => void;
  cancelInvite: (id: string) => void;
  resendInvite: (id: string) => void;
  createProgram: (p: CoachProgram) => void;
  updateProgram: (p: CoachProgram) => void;
  deleteProgram: (id: string) => void;
};

export const useCoachStore = create<CoachState>((set, get) => ({
  athletes: _seedAthletes,
  programs: _seedPrograms,

  updateAthleteGoal: (id, goal) =>
    set((s) => ({
      athletes: s.athletes.map((a) =>
        a.id !== id ? a : buildAthlete({ ...a, goal: round1(goal), goalSetBy: 'coach' })
      ),
    })),

  updateAthleteNotes: (id, notes) =>
    set((s) => ({
      athletes: s.athletes.map((a) => (a.id === id ? { ...a, notes } : a)),
    })),

  assignProgram: (athleteId, programId) =>
    set((s) => {
      const prog = programId ? s.programs.find((p) => p.id === programId) ?? null : null;
      return {
        athletes: s.athletes.map((a) =>
          a.id !== athleteId
            ? a
            : buildAthlete({
                ...a,
                programId: prog?.id ?? null,
                programName: prog?.name ?? null,
                assignedPerWeek: prog?.perWeek ?? null,
              })
        ),
      };
    }),

  addInvite: (payload) =>
    set((s) => {
      const prog = payload.programId ? s.programs.find((p) => p.id === payload.programId) ?? null : null;
      const newAthlete = buildAthlete({
        id: `inv_${Date.now()}`,
        name: payload.name,
        email: payload.email,
        contactType: payload.contactType,
        status: 'invited',
        units: payload.units,
        programId: prog?.id ?? null,
        programName: prog?.name ?? null,
        trend: 0,
        weekDelta: 0,
        goal: 0,
        goalDir: 'lose',
        goalPct: 0,
        daysSinceLog: null,
        sessionsThisWeek: 0,
        assignedPerWeek: prog?.perWeek ?? null,
        notes: '',
        goalSetBy: 'athlete',
        invitedAt: Date.now(),
      });
      return { athletes: [newAthlete, ...s.athletes] };
    }),

  cancelInvite: (id) =>
    set((s) => ({ athletes: s.athletes.filter((a) => a.id !== id) })),

  resendInvite: (id) =>
    set((s) => ({
      athletes: s.athletes.map((a) =>
        a.id === id ? { ...a, invitedAt: Date.now() } : a
      ),
    })),

  createProgram: (p) => set((s) => ({ programs: [...s.programs, p] })),

  updateProgram: (p) =>
    set((s) => ({ programs: s.programs.map((x) => (x.id === p.id ? p : x)) })),

  deleteProgram: (id) =>
    set((s) => ({
      programs: s.programs.filter((p) => p.id !== id),
      athletes: s.athletes.map((a) =>
        a.programId === id
          ? buildAthlete({ ...a, programId: null, programName: null, assignedPerWeek: null })
          : a
      ),
    })),
}));
