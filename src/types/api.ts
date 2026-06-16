export type UserRole = 'STUDENT' | 'COACH';

export type StudentProfile = {
  id: string;
  name: string;
  email: string;
  units: 'kg' | 'lb';
  heightCm: number | null;
  activityLevel: 'sed' | 'light' | 'mod' | 'high' | null;
  reminders: boolean;
  startWeight: number | null;
  programId: string | null;
  programName: string | null;
  goal: {
    id: string;
    targetWeight: number;
    goalType: 'LOSE' | 'GAIN' | 'MAINTAIN';
    setBy: 'ATHLETE' | 'COACH';
    updatedAt: string;
  } | null;
};

export type BodyRecord = {
  id: string;
  weight: number;
  recordedAt: string;
};

export type Goal = {
  id: string;
  targetWeight: number;
  goalType: 'LOSE' | 'GAIN' | 'MAINTAIN';
  setBy: 'ATHLETE' | 'COACH';
  updatedAt: string;
};

export type WorkoutSetType = 'WARMUP' | 'PREP' | 'FEEDER' | 'WORK';

export type WorkoutSet = {
  setNumber: number;
  setType: WorkoutSetType;
  reps: number;
  weight: number;
  estimated1RM?: number;
  isPR?: boolean;
};

export type WorkoutExercise = {
  name: string;
  sets: WorkoutSet[];
};

export type PR = {
  exerciseName: string;
  estimated1RM: number;
  prevBest: number;
};

export type Workout = {
  id: string;
  performedAt: string;
  durationSec: number;
  templateId: string | null;
  templateName: string | null;
  programId: string | null;
  programName: string | null;
  exercises: WorkoutExercise[];
  prs: PR[];
};

export type WorkoutInput = {
  performedAt: string;
  durationSec: number;
  templateId?: string | null;
  templateName?: string | null;
  programId?: string | null;
  programName?: string | null;
  exercises: {
    name: string;
    sets: {
      setNumber: number;
      setType: WorkoutSetType;
      reps: number;
      weight: number;
    }[];
  }[];
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  exercises: string[];
  targetMin: number | null;
};

export type StudentFlag = {
  type: 'stale' | 'trend' | 'missed';
  label: string;
};

export type StudentSummary = {
  id: string;
  name: string;
  email: string;
  initial: string;
  units: 'kg' | 'lb';
  status: 'active' | 'invited' | 'inactive';
  trend: number;
  weekDelta: number;
  goal: number;
  goalType: 'LOSE' | 'GAIN' | 'MAINTAIN';
  goalPct: number;
  toGo: number;
  daysSinceLog: number | null;
  program: string | null;
  programId: string | null;
  assignedPerWeek: number | null;
  sessionsThisWeek: number;
  flags: StudentFlag[];
  onTrack: boolean;
  severity: number;
};

export type Invite = {
  id: string;
  name: string;
  contactType: 'email' | 'phone';
  contact: string;
  units: 'kg' | 'lb';
  programId: string | null;
  programName: string | null;
  status: 'PENDING';
  token: string;
  createdAt: string;
};

export type ProgramDay = {
  id?: string;
  name: string;
  order: number;
  exercises: string[];
};

export type Program = {
  id: string;
  name: string;
  focus: string;
  perWeek: number;
  notes: string;
  days: ProgramDay[];
  assignedCount?: number;
};

export type CoachDashboard = {
  billing: {
    activeCount: number;
    invitedCount: number;
    extra: number;
    total: number;
  };
  adherence: {
    adherencePct: number;
    loggedThisWeek: number;
    sessionPct: number;
    totalDone: number;
    totalAssigned: number;
    quiet: number;
  };
  progress: {
    onTrack: number;
    activeCount: number;
    flaggedCount: number;
  };
  flagged: StudentSummary[];
};

export type ExerciseGoal = {
  exerciseId: string;
  exerciseName: string;
  targetKg: number;
};

export type ApiError = {
  statusCode: number;
  error: string;
  message: string;
};

export type WeightEntry = { date: string; weight: number };
