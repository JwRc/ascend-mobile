export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function fmtDateShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function fmtDateLong(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function convert(val: number, from: 'kg' | 'lb', to: 'kg' | 'lb'): number {
  if (from === to) return val;
  return from === 'kg' ? val * 2.20462 : val / 2.20462;
}

export function movingAverage(
  entries: { date: string; weight: number }[],
  window: number
): { date: string; weight: number }[] {
  if (!entries.length) return [];
  return entries.map((e, i) => {
    const slice = entries.slice(Math.max(0, i - window + 1), i + 1);
    const avg = slice.reduce((sum, x) => sum + x.weight, 0) / slice.length;
    return { date: e.date, weight: round1(avg) };
  });
}

export function weighInStreak(entries: { date: string }[]): { count: number; todayLogged: boolean } {
  const today = todayISO();
  const dateSet = new Set(entries.map((e) => e.date));
  const todayLogged = dateSet.has(today);

  let count = 0;
  const d = new Date(today + 'T00:00:00');
  while (true) {
    const iso = d.toISOString().slice(0, 10);
    if (!dateSet.has(iso)) break;
    count++;
    d.setDate(d.getDate() - 1);
  }
  return { count: todayLogged ? count : 0, todayLogged };
}

export function last7Days(entries: { date: string }[]): { date: string; logged: boolean; isToday: boolean }[] {
  const dateSet = new Set(entries.map((e) => e.date));
  const today = todayISO();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today + 'T00:00:00');
    d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().slice(0, 10);
    return { date: iso, logged: dateSet.has(iso), isToday: iso === today };
  });
}

/** Hex color with alpha overlay on white (approximate color-mix) */
export function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function epley1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return round1(weight * (1 + reps / 30));
}

export function classifySets(sets: { weight: number; reps: number; type: string | null }[]): (string | null)[] {
  if (!sets || !sets.length) return [];
  const es = sets.map((s) => epley1RM(s.weight, s.reps));
  const peak = Math.max(...es);
  const anyManual = sets.some((s) => s.type);

  if (sets.length === 2 && !anyManual) {
    const hi = es[0] >= es[1] ? 0 : 1;
    return sets.map((_, i) => (i === hi ? 'work' : null));
  }

  return sets.map((s, i) => {
    if (s.type) return s.type;
    const diff = peak > 0 ? (peak - es[i]) / peak : 0;
    if (diff < 0.05) return 'work';
    if (diff < 0.2) return 'feeder';
    return 'warmup';
  });
}

export function getApiError(e: unknown, fallback = 'Erro inesperado. Tente novamente.'): string {
  const msg = (e as any)?.response?.data?.message;
  if (typeof msg === 'string') return msg;
  if (typeof (msg as any)?.message === 'string') return (msg as any).message;
  const err = (e as any)?.message;
  if (typeof err === 'string') return err;
  return fallback;
}
