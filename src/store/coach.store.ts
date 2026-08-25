// ─── Constants ───────────────────────────────────────────────────────────────

export const STALE_DAYS = 5;

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
  weightEntries?: import('@/types/api').WeightEntry[];
  invitedAt?: number;
  isMe?: boolean;
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
  billingTotal: number;
  billingExtra: number;
};
