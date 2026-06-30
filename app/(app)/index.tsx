import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/store/auth.store';
import { useStrengthStore } from '@/store/strength.store';
import { useStudentProfile } from '@/api/hooks/useStudentProfile';
import { useBodyRecords, useLogWeight, useDeleteBodyRecord } from '@/api/hooks/useBodyRecords';
import { useNotifications } from '@/api/hooks/useNotifications';
import { useSetGoal } from '@/api/hooks/useGoals';
import { useWorkoutTemplates, useCreateWorkoutTemplate } from '@/api/hooks/useWorkoutTemplates';
import { useWorkouts, useLogWorkout } from '@/api/hooks/useWorkouts';
import { authClient } from '@/lib/auth';
import { resetAnalytics, capture } from '@/lib/analytics';
import type { WorkoutInput, Workout } from '@/types/api';
import { Logo } from '@/components/shared/Logo';
import { Avatar } from '@/components/shared/Avatar';
import { SegmentedControl } from '@/components/shared/SegmentedControl';
import { Card } from '@/components/shared/Card';
import { WeightChart } from '@/components/weight/WeightChart';
import { LogModal } from '@/components/weight/LogModal';
import { GoalEditModal } from '@/components/weight/GoalEditModal';
import { WorkoutEntry } from '@/components/strength/WorkoutEntry';
import { ActiveSession } from '@/components/strength/ActiveSession';
import { StrengthDashboard } from '@/components/strength/StrengthDashboard';
import { PrCelebration } from '@/components/strength/PrCelebration';
import {
  round1,
  movingAverage,
  weighInStreak,
  last7Days,
  convert,
  fmtDateLong,
  todayISO,
} from '@/lib/utils';
import { semanticColors } from '@/theme';
import type { ActiveSession as ActiveSessionType, Session, SetType, WorkSet } from '@/store/strength.store';
import { exercisePeak1RM } from '@/store/strength.store';

function workoutToSession(w: Workout): Session {
  return {
    id: w.id,
    date: new Date(w.performedAt).toLocaleDateString('en-CA'),
    templateId: w.templateId,
    templateName: w.templateName ?? '',
    programId: w.programId,
    programName: w.programName,
    durationSec: w.durationSec,
    targetMin: null,
    exercises: w.exercises.map((ex) => ({
      name: ex.name,
      sets: ex.sets.map((s) => ({
        weight: s.weight,
        reps: s.reps,
        type: (s.setType?.toLowerCase() ?? null) as SetType,
      })) as WorkSet[],
    })),
    prs: w.prs.map((pr) => ({
      exercise: pr.exerciseName,
      e: round1(pr.estimated1RM),
      prevBest: round1(pr.prevBest),
      weight: null,
      reps: null,
    })),
  };
}

type TabView = 'weight' | 'strength';
type StrengthView = 'entry' | 'active';
type GoalLocalType = 'lose' | 'strength' | 'maintain';

function apiGoalTypeToLocal(gt: 'LOSE' | 'GAIN' | 'MAINTAIN' | undefined): GoalLocalType {
  if (gt === 'LOSE') return 'lose';
  if (gt === 'GAIN') return 'strength';
  return 'maintain';
}

function localGoalTypeToApi(gt: GoalLocalType): 'LOSE' | 'GAIN' | 'MAINTAIN' {
  if (gt === 'lose') return 'LOSE';
  if (gt === 'strength') return 'GAIN';
  return 'MAINTAIN';
}

function uid() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function DashboardScreen() {
  const { colors, direction } = useTheme();
  const { clearSession } = useAuthStore();
  const queryClient = useQueryClient();

  useFocusEffect(
    React.useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        BackHandler.exitApp();
        return true;
      });
      return () => sub.remove();
    }, [])
  );

  // API data
  const { data: studentProfile, isLoading: profileLoading } = useStudentProfile();
  const { data: bodyRecords, isLoading: recordsLoading } = useBodyRecords();
  const { data: notifications = [] } = useNotifications();
  const unreadCount = notifications.length;
  const logWeight = useLogWeight();
  const deleteRecord = useDeleteBodyRecord();
  const setGoalMutation = useSetGoal();
  // Strength store — only active session state; data comes from API
  const { activeSession, setActiveSession, updateActiveSession } = useStrengthStore();

  // Strength API hooks
  const { data: templatesRaw = [] } = useWorkoutTemplates();
  const { data: workoutsRaw = [] } = useWorkouts();
  const createTemplate = useCreateWorkoutTemplate();
  const logWorkout = useLogWorkout();

  const templates = templatesRaw;
  const sessions = React.useMemo(() => workoutsRaw.map(workoutToSession), [workoutsRaw]);

  const [view, setView] = React.useState<TabView>('weight');
  const [weightSubView, setWeightSubView] = React.useState<'log' | 'charts'>('log');
  const [strengthSubView, setStrengthSubView] = React.useState<'workout' | 'dashboard'>('workout');
  const [strengthView, setStrengthView] = React.useState<StrengthView>('entry');
  const [pendingPRs, setPendingPRs] = React.useState<Session['prs']>([]);
  const [showPRs, setShowPRs] = React.useState(false);
  const [logging, setLogging] = React.useState(false);
  const [editingGoal, setEditingGoal] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [nudgeDismissed, setNudgeDismissed] = React.useState(false);

  // Derived data
  const u = studentProfile?.units ?? 'kg';

  const sortedRecords = [...(bodyRecords ?? [])].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt)
  );
  const entries = sortedRecords.map((r) => ({
    id: r.id,
    date: new Date(r.recordedAt).toLocaleDateString('en-CA'),
    weight: r.weight,
  }));

  const latest = entries[entries.length - 1];
  const ma = movingAverage(entries, 7);
  const latestMA = ma.length ? ma[ma.length - 1].weight : (latest?.weight ?? 0);
  const prevIdx = Math.max(0, ma.length - 8);
  const prevMA = ma.length ? ma[prevIdx].weight : latestMA;
  const weekDelta = ma.length > 1 ? round1(latestMA - prevMA) : 0;

  const goal = studentProfile?.goal?.targetWeight ?? 0;
  const goalApiType = studentProfile?.goal?.goalType;
  const goalLocalType = apiGoalTypeToLocal(goalApiType);
  const goalSetBy = studentProfile?.goal?.setBy ?? 'ATHLETE';
  const startWeight = studentProfile?.startWeight ?? (entries[0]?.weight ?? goal);

  const span = Math.abs(startWeight - goal) || 1;
  const done = Math.abs(startWeight - latestMA);
  const pct = Math.max(0, Math.min(100, Math.round((done / span) * 100)));
  const toGo = round1(Math.abs(latestMA - goal));
  const losing = goal <= startWeight;

  const heightM = (studentProfile?.heightCm ?? 170) / 100;
  const kg = convert(latestMA, u, 'kg');
  const bmi = round1(kg / (heightM * heightM));

  const streak = weighInStreak(entries);
  const last7 = last7Days(entries);
  const showNudge = (studentProfile?.reminders ?? false) && !streak.todayLogged && !nudgeDismissed;

  const recent = [...entries].reverse().slice(0, 8);

  const trendColor =
    weekDelta < 0
      ? semanticColors.success
      : weekDelta > 0
      ? semanticColors.warning
      : colors.ink3;

  async function handleLogout() {
    try {
      await authClient.signOut();
    } catch { /* ignore */ }
    resetAnalytics();
    await clearSession();
    queryClient.clear();
    router.replace('/(auth)/login');
  }

  function startTemplate(t: import('@/store/strength.store').Template) {
    setActiveSession({
      id: uid(),
      date: todayISO(),
      templateId: t.id,
      templateName: t.name,
      programId: null,
      programName: null,
      yolo: false,
      startedAt: null,
      accumulatedSec: 0,
      targetMin: t.targetMin,
      exercises: t.exercises.map((name) => ({ name, sets: [] })),
    });
    setStrengthView('active');
  }

  function startYolo() {
    setActiveSession({
      id: uid(),
      date: todayISO(),
      templateId: null,
      templateName: 'YOLO SESSION',
      programId: null,
      programName: null,
      yolo: true,
      startedAt: null,
      accumulatedSec: 0,
      targetMin: null,
      exercises: [],
    });
    setStrengthView('active');
  }

  async function finishSession() {
    if (!activeSession) return;
    const live = activeSession.startedAt
      ? Math.max(0, Math.floor((Date.now() - activeSession.startedAt) / 1000))
      : 0;
    const durationSec = (activeSession.accumulatedSec || 0) + live;

    const input: WorkoutInput = {
      performedAt: new Date(activeSession.date + 'T12:00:00').toISOString(),
      durationSec,
      templateId: activeSession.templateId,
      templateName: activeSession.templateName,
      programId: activeSession.programId,
      programName: activeSession.programName,
      exercises: activeSession.exercises
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

    setActiveSession(null);
    setStrengthView('entry');

    try {
      const workout = await logWorkout.mutateAsync(input);
      capture('workout_logged', { exerciseCount: input.exercises.length });
      if (workout.prs && workout.prs.length > 0) {
        for (const pr of workout.prs) {
          capture('pr_achieved', { exerciseName: pr.exerciseName });
        }
        const mappedPRs = workout.prs.map((pr) => ({
          exercise: pr.exerciseName,
          e: round1(pr.estimated1RM),
          prevBest: round1(pr.prevBest),
          weight: null as number | null,
          reps: null as number | null,
        }));
        setPendingPRs(mappedPRs);
        setShowPRs(true);
      }
    } catch {
      // offline: will sync when reconnected via useWorkoutSync
    }
  }

  function discardSession() {
    setActiveSession(null);
    setStrengthView('entry');
  }

  if (profileLoading && recordsLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* top bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 14,
        }}
      >
        <Logo size={22} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink2 }}>
            Olá, {studentProfile?.name ?? ''}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(app)/notifications')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={{ position: 'relative' }}>
              <Text style={{ fontSize: 22 }}>🔔</Text>
              {unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -6,
                    backgroundColor: '#e5484d',
                    borderRadius: 8,
                    minWidth: 16,
                    height: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 3,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Archivo_800ExtraBold',
                      fontSize: 9,
                      color: '#fff',
                      lineHeight: 14,
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuOpen(!menuOpen)}>
            <Avatar name={studentProfile?.name ?? ''} size={40} />
          </TouchableOpacity>
        </View>
      </View>

      {/* dropdown backdrop */}
      {menuOpen && (
        <TouchableOpacity
          style={[StyleSheet.absoluteFill, { zIndex: 20 }]}
          onPress={() => setMenuOpen(false)}
          activeOpacity={1}
        />
      )}

      {/* dropdown menu */}
      {menuOpen && (
        <View
          style={{
            position: 'absolute',
            top: 70,
            right: 20,
            zIndex: 30,
            backgroundColor: colors.surface,
            borderWidth: 1.5,
            borderColor: colors.line,
            borderRadius: 10,
            padding: 6,
            minWidth: 160,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 8,
          }}
        >
          {[
            {
              label: 'Configurações',
              onPress: () => {
                setMenuOpen(false);
                router.push('/(app)/settings');
              },
            },
            { label: 'Sair', onPress: handleLogout },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={item.onPress}
              style={{ padding: 11, borderRadius: 6 }}
            >
              <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink2 }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* main tab selector — Peso | Força */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
        <SegmentedControl
          options={[
            { value: 'weight', label: 'Peso' },
            { value: 'strength', label: 'Força' },
          ]}
          value={view}
          onChange={(v) => setView(v as TabView)}
        />
      </View>

      {/* sub-tab selector — only when no active workout */}
      {strengthView !== 'active' && (
        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          {view === 'weight' ? (
            <SegmentedControl
              options={[
                { value: 'log', label: 'Registrar' },
                { value: 'charts', label: 'Gráficos' },
              ]}
              value={weightSubView}
              onChange={(v) => setWeightSubView(v as 'log' | 'charts')}
            />
          ) : (
            <SegmentedControl
              options={[
                { value: 'workout', label: 'Treinar' },
                { value: 'dashboard', label: 'Gráficos' },
              ]}
              value={strengthSubView}
              onChange={(v) => setStrengthSubView(v as 'workout' | 'dashboard')}
            />
          )}
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── PESO ── */}
        {view === 'weight' && weightSubView === 'log' && (
          <>
            {/* streak nudge */}
            {showNudge && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 13,
                  padding: 14,
                  backgroundColor: colors.surface,
                  borderWidth: 1.5,
                  borderColor: colors.line,
                  borderRadius: 16,
                  borderLeftWidth: 4,
                  borderLeftColor: colors.accent,
                }}
              >
                <View style={{ width: 9, height: 9, borderRadius: 50, backgroundColor: colors.accent }} />
                <Text style={{ flex: 1, fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14.5, color: colors.ink }}>
                  {streak.count > 0
                    ? `Registre hoje — mantenha sua sequência de ${streak.count} dias.`
                    : 'Registre hoje para começar uma nova sequência.'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setLogging(true)}
                    style={{ backgroundColor: colors.accent, paddingVertical: 9, paddingHorizontal: 15, borderRadius: 8 }}
                  >
                    <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, color: '#fff', textTransform: direction === 'A' ? 'uppercase' : 'none' }}>
                      Registrar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setNudgeDismissed(true)}>
                    <Text style={{ fontSize: 20, color: colors.ink3 }}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* HERO CARD */}
            <Card>
              <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12.5, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.ink3 }}>
                Tendência · média 7 dias
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6, marginBottom: 4 }}>
                <Text style={{ fontFamily: 'Archivo_900Black', fontSize: 80, lineHeight: 72, letterSpacing: -1, color: colors.ink }}>
                  {ma.length ? round1(latestMA) : '—'}
                </Text>
                <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 24, color: colors.ink3 }}>{u}</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14, color: trendColor }}>{weekDelta < 0 ? '▾' : weekDelta > 0 ? '▴' : '—'}</Text>
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: trendColor }}>{Math.abs(weekDelta)}{u}</Text>
                <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: colors.ink3 }}>esta semana</Text>
              </View>

              {/* mini stats */}
              <View style={{ flexDirection: 'row', gap: 28, marginTop: 22, paddingTop: 20, borderTopWidth: 1.5, borderTopColor: colors.line }}>
                <View style={{ gap: 3 }}>
                  <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 11.5, letterSpacing: 1, textTransform: 'uppercase', color: colors.ink3 }}>
                    Último registro
                  </Text>
                  <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 26, letterSpacing: -0.5, color: colors.ink }}>
                    {latest ? round1(latest.weight) : '—'}
                    <Text style={{ fontSize: 14, color: colors.ink3, fontFamily: 'HankenGrotesk_700Bold' }}>{' '}{u}</Text>
                  </Text>
                </View>
                <View style={{ gap: 3 }}>
                  <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 11.5, letterSpacing: 1, textTransform: 'uppercase', color: colors.ink3 }}>
                    IMC · tendência
                  </Text>
                  <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 26, letterSpacing: -0.5, color: colors.ink }}>
                    {entries.length && isFinite(bmi) ? bmi : '—'}
                  </Text>
                </View>
              </View>

              {/* streak strip */}
              <View style={{ marginTop: 18, paddingTop: 18, borderTopWidth: 1.5, borderTopColor: colors.line, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 11.5, letterSpacing: 1, textTransform: 'uppercase', color: colors.ink3 }}>
                    Sequência de pesagem
                  </Text>
                  <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 26, letterSpacing: -0.5, color: colors.ink }}>
                    {streak.count}
                    <Text style={{ fontSize: 13, fontFamily: 'HankenGrotesk_700Bold', color: colors.ink3 }}>{' '}{streak.count === 1 ? 'dia' : 'dias'}</Text>
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 5 }}>
                  {last7.map((d, i) => (
                    <View
                      key={i}
                      style={{
                        flex: 1, height: 8,
                        borderRadius: direction === 'A' ? 2 : 4,
                        backgroundColor: d.logged ? colors.accent : colors.line2,
                        ...(d.isToday ? { borderWidth: 2, borderColor: colors.accent } : {}),
                      }}
                    />
                  ))}
                </View>
              </View>

              {/* log button */}
              <TouchableOpacity
                onPress={() => setLogging(true)}
                style={{ marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accent, paddingVertical: 16, borderRadius: 10 }}
              >
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 22, color: '#fff', lineHeight: 22 }}>+</Text>
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: '#fff', textTransform: direction === 'A' ? 'uppercase' : 'none', letterSpacing: direction === 'A' ? 0.6 : 0 }}>
                  Registrar peso
                </Text>
              </TouchableOpacity>
            </Card>

            {/* RECENT ENTRIES */}
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 19, letterSpacing: direction === 'A' ? 0.4 : -0.3, textTransform: direction === 'A' ? 'uppercase' : 'none', color: colors.ink }}>
                  Registros recentes
                </Text>
                <TouchableOpacity onPress={() => setLogging(true)}>
                  <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13.5, color: colors.accent }}>+ Adicionar</Text>
                </TouchableOpacity>
              </View>

              {recent.map((e, i) => {
                const idxInSorted = entries.findIndex((x) => x.date === e.date);
                const prev = idxInSorted > 0 ? entries[idxInSorted - 1].weight : null;
                const delta = prev != null ? round1(e.weight - prev) : null;
                const deltaColor = delta == null ? colors.ink3 : delta < 0 ? semanticColors.success : delta > 0 ? semanticColors.warning : colors.ink3;
                return (
                  <View key={e.date} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, borderBottomWidth: i < recent.length - 1 ? 1.5 : 0, borderBottomColor: colors.line }}>
                    <Text style={{ flex: 1, fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14.5, color: colors.ink2 }}>{fmtDateLong(e.date)}</Text>
                    <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 20, letterSpacing: -0.3, color: colors.ink }}>
                      {round1(e.weight)}<Text style={{ fontSize: 12, fontFamily: 'HankenGrotesk_700Bold', color: colors.ink3 }}>{u}</Text>
                    </Text>
                    <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13.5, minWidth: 52, textAlign: 'right', color: deltaColor }}>
                      {delta == null ? '—' : (delta > 0 ? '+' : '') + delta}
                    </Text>
                    <TouchableOpacity onPress={() => deleteRecord.mutate(e.id)}>
                      <Text style={{ fontSize: 20, color: colors.ink3 }}>×</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </Card>
          </>
        )}

        {view === 'weight' && weightSubView === 'charts' && (
          <>
            {/* GOAL CARD */}
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.ink2 }}>
                  Meta · {round1(goal)}{u}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontFamily: 'Archivo_900Black', fontSize: 30, letterSpacing: -1, color: colors.ink }}>{pct}%</Text>
                  <TouchableOpacity
                    onPress={() => setEditingGoal(true)}
                    style={{ paddingVertical: 5, paddingHorizontal: 11, borderRadius: direction === 'A' ? 3 : 30, borderWidth: 1.5, borderColor: colors.accent }}
                  >
                    <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.accent }}>Editar</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ height: 12, backgroundColor: colors.surface2, borderWidth: 1.5, borderColor: colors.line, borderRadius: direction === 'A' ? 3 : 30, overflow: 'hidden', marginVertical: 10 }}>
                <View style={{ height: '100%', width: `${pct}%`, backgroundColor: colors.accent, borderRadius: direction === 'A' ? 0 : 30 }} />
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13.5, color: colors.ink3 }}>
                  {toGo <= 0.05 ? 'Meta atingida — ótimo trabalho.' : `${toGo}${u} para a meta · ${losing ? 'em queda' : 'subindo'}`}
                </Text>
                <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink3 }}>
                  {goalSetBy === 'COACH' ? 'Definido pelo coach' : 'Definido por você'}
                </Text>
              </View>
            </Card>

            {/* PROGRESS CHART */}
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 19, letterSpacing: direction === 'A' ? 0.4 : -0.3, textTransform: direction === 'A' ? 'uppercase' : 'none', color: colors.ink }}>
                  Progresso
                </Text>
                <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12.5, color: colors.ink3 }}>{entries.length} registros</Text>
              </View>
              <WeightChart entries={entries} unit={u} />
            </Card>
          </>
        )}

        {/* ── FORÇA ── */}
        {view === 'strength' && strengthView === 'active' && activeSession && (
          <ActiveSession
            active={activeSession}
            sessions={sessions}
            unit={u}
            onUpdateActive={updateActiveSession}
            onFinish={finishSession}
            onDiscard={discardSession}
          />
        )}

        {view === 'strength' && strengthView !== 'active' && strengthSubView === 'workout' && (
          <WorkoutEntry
            templates={templates}
            onStartTemplate={startTemplate}
            onStartYolo={startYolo}
            onNewTemplate={() => {
              createTemplate.mutate({ name: `Treino ${templates.length + 1}`, exercises: [], targetMin: null });
            }}
            onEditTemplate={() => {}}
          />
        )}

        {view === 'strength' && strengthView !== 'active' && strengthSubView === 'dashboard' && (
          <StrengthDashboard
            sessions={sessions}
            templates={templates}
            unit={u}
            onStartWorkout={startYolo}
          />
        )}
      </ScrollView>

      <LogModal
        visible={logging}
        unit={u}
        lastWeight={latest?.weight ?? null}
        entries={entries}
        onSave={(date, weight) => {
          logWeight.mutate({ date, weight });
          setLogging(false);
        }}
        onClose={() => setLogging(false)}
      />

      <GoalEditModal
        visible={editingGoal}
        unit={u}
        goal={round1(goal)}
        goalType={goalLocalType}
        onSave={(newGoal, newType) => {
          setGoalMutation.mutate({ targetWeight: newGoal, goalType: localGoalTypeToApi(newType) });
          setEditingGoal(false);
        }}
        onClose={() => setEditingGoal(false)}
      />

      <PrCelebration
        visible={showPRs}
        prs={pendingPRs ?? []}
        unit={u}
        onClose={() => { setShowPRs(false); setPendingPRs([]); }}
      />
    </SafeAreaView>
  );
}
