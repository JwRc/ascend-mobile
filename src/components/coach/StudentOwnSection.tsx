import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme, semanticColors } from '@/theme';
import { SegmentedControl } from '@/components/shared/SegmentedControl';
import { Card } from '@/components/shared/Card';
import { LogModal } from '@/components/weight/LogModal';
import { WeightChart } from '@/components/weight/WeightChart';
import { WorkoutEntry } from '@/components/strength/WorkoutEntry';
import { ActiveSession } from '@/components/strength/ActiveSession';
import { StrengthDashboard } from '@/components/strength/StrengthDashboard';
import { PrCelebration } from '@/components/strength/PrCelebration';
import { useBodyRecords, useLogWeight, useDeleteBodyRecord } from '@/api/hooks/useBodyRecords';
import { useStudentProfile } from '@/api/hooks/useStudentProfile';
import { useWorkoutTemplates, useCreateWorkoutTemplate } from '@/api/hooks/useWorkoutTemplates';
import { useWorkouts, useLogWorkout } from '@/api/hooks/useWorkouts';
import { useStrengthStore } from '@/store/strength.store';
import {
  round1, movingAverage, weighInStreak, last7Days, convert, fmtDateLong, todayISO,
} from '@/lib/utils';
import type { WorkoutInput, Workout } from '@/types/api';
import type { Session, SetType, WorkSet, Template } from '@/store/strength.store';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

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

type Props = { units: 'kg' | 'lb' };

export function StudentOwnSection({ units }: Props) {
  const { colors, direction } = useTheme();
  const u = units;

  const { data: bodyRecords = [] } = useBodyRecords();
  const { data: profile } = useStudentProfile();
  const { data: templatesRaw = [] } = useWorkoutTemplates();
  const { data: workoutsRaw = [] } = useWorkouts();
  const logWeight = useLogWeight();
  const deleteRecord = useDeleteBodyRecord();
  const logWorkout = useLogWorkout();
  const createTemplate = useCreateWorkoutTemplate();
  const { activeSession, setActiveSession, updateActiveSession } = useStrengthStore();

  const [tab, setTab] = React.useState<'weight' | 'strength'>('strength');
  const [weightSubTab, setWeightSubTab] = React.useState<'log' | 'charts'>('log');
  const [strengthSubTab, setStrengthSubTab] = React.useState<'workout' | 'dashboard'>('workout');
  const [strengthView, setStrengthView] = React.useState<'entry' | 'active'>('entry');
  const [showLogModal, setShowLogModal] = React.useState(false);
  const [pendingPRs, setPendingPRs] = React.useState<{ exercise: string; e: number; prevBest: number; weight: number | null; reps: number | null }[]>([]);
  const [showPRs, setShowPRs] = React.useState(false);

  // weight data
  const sortedRecords = [...bodyRecords].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const entries = sortedRecords.map((r) => ({
    id: r.id,
    date: new Date(r.recordedAt).toLocaleDateString('en-CA'),
    weight: r.weight,
  }));
  const chartEntries = entries.map(({ date, weight }) => ({ date, weight }));
  const latest = entries[entries.length - 1] ?? null;
  const ma = movingAverage(chartEntries, 7);
  const latestMA = ma.length ? ma[ma.length - 1].weight : (latest?.weight ?? 0);
  const prevMA = ma.length ? ma[Math.max(0, ma.length - 8)].weight : latestMA;
  const weekDelta = ma.length > 1 ? round1(latestMA - prevMA) : 0;
  const streak = weighInStreak(chartEntries);
  const last7 = last7Days(chartEntries);
  const recent = [...entries].reverse().slice(0, 8);

  // goal
  const goal = profile?.goal?.targetWeight ?? 0;
  const goalType = profile?.goal?.goalType ?? 'LOSE';
  const goalSetBy = profile?.goal?.setBy ?? 'ATHLETE';
  const startWeight = profile?.startWeight ?? (entries[0]?.weight ?? goal);
  const losing = goal <= startWeight;
  const span = Math.abs(startWeight - goal) || 1;
  const done = Math.abs(startWeight - latestMA);
  const pct = Math.max(0, Math.min(100, Math.round((done / span) * 100)));
  const toGo = round1(Math.abs(latestMA - goal));

  // bmi
  const hM = (profile?.heightCm ?? 0) / 100;
  const kg = convert(latestMA, u, 'kg');
  const bmi = hM > 0 ? round1(kg / (hM * hM)) : 0;

  // strength data
  const sessions: Session[] = React.useMemo(() => workoutsRaw.map(workoutToSession), [workoutsRaw]);
  const templates: Template[] = templatesRaw;

  // colors
  const trendGood = goalType === 'GAIN' ? weekDelta > 0 : weekDelta < 0;
  const trendNeutral = weekDelta === 0;
  const trendColor = trendNeutral ? colors.ink3 : trendGood ? semanticColors.success : semanticColors.warning;

  function startTemplate(t: Template) {
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
      if (workout.prs && workout.prs.length > 0) {
        setPendingPRs(
          workout.prs.map((pr) => ({
            exercise: pr.exerciseName,
            e: round1(pr.estimated1RM),
            prevBest: round1(pr.prevBest),
            weight: null,
            reps: null,
          })),
        );
        setShowPRs(true);
      }
    } catch { /* offline — will sync */ }
  }

  function discardSession() {
    setActiveSession(null);
    setStrengthView('entry');
  }

  return (
    <View style={{ marginTop: 8, gap: 16 }}>
      {/* divider */}
      <View style={{ height: 1.5, backgroundColor: colors.line }} />

      {/* Peso / Força main tabs */}
      <SegmentedControl
        options={[
          { value: 'weight', label: 'Peso' },
          { value: 'strength', label: 'Força' },
        ]}
        value={tab}
        onChange={(v) => setTab(v as 'weight' | 'strength')}
      />

      {/* sub-tabs */}
      {tab === 'weight' && (
        <SegmentedControl
          options={[
            { value: 'log', label: 'Registrar' },
            { value: 'charts', label: 'Gráficos' },
          ]}
          value={weightSubTab}
          onChange={(v) => setWeightSubTab(v as 'log' | 'charts')}
        />
      )}

      {tab === 'strength' && strengthView !== 'active' && (
        <SegmentedControl
          options={[
            { value: 'workout', label: 'Treinar' },
            { value: 'dashboard', label: 'Gráficos' },
          ]}
          value={strengthSubTab}
          onChange={(v) => setStrengthSubTab(v as 'workout' | 'dashboard')}
        />
      )}

      {/* ── PESO · REGISTRAR ── */}
      {tab === 'weight' && weightSubTab === 'log' && (
        <>
          <Card>
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12.5, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.ink3 }}>
              Tendência · média 7 dias
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6, marginBottom: 4 }}>
              <Text style={{ fontFamily: 'Archivo_900Black', fontSize: 72, lineHeight: 66, letterSpacing: -1, color: colors.ink }}>
                {ma.length ? round1(latestMA) : '—'}
              </Text>
              <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 22, color: colors.ink3 }}>{u}</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14, color: trendColor }}>{weekDelta < 0 ? '▾' : weekDelta > 0 ? '▴' : '—'}</Text>
              <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: trendColor }}>{Math.abs(weekDelta)}{u}</Text>
              <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: colors.ink3 }}>esta semana</Text>
            </View>

            {/* mini stats */}
            <View style={{ flexDirection: 'row', gap: 28, marginTop: 20, paddingTop: 18, borderTopWidth: 1.5, borderTopColor: colors.line }}>
              <View style={{ gap: 3 }}>
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 11.5, letterSpacing: 1, textTransform: 'uppercase', color: colors.ink3 }}>
                  Último registro
                </Text>
                <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 24, letterSpacing: -0.5, color: colors.ink }}>
                  {latest ? round1(latest.weight) : '—'}
                  <Text style={{ fontSize: 13, color: colors.ink3, fontFamily: 'HankenGrotesk_700Bold' }}>{' '}{u}</Text>
                </Text>
              </View>
              {bmi > 0 && (
                <View style={{ gap: 3 }}>
                  <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 11.5, letterSpacing: 1, textTransform: 'uppercase', color: colors.ink3 }}>
                    IMC · tendência
                  </Text>
                  <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 24, letterSpacing: -0.5, color: colors.ink }}>
                    {bmi}
                  </Text>
                </View>
              )}
            </View>

            {/* streak */}
            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1.5, borderTopColor: colors.line, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 11.5, letterSpacing: 1, textTransform: 'uppercase', color: colors.ink3 }}>
                  Sequência de pesagem
                </Text>
                <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 24, letterSpacing: -0.5, color: colors.ink }}>
                  {streak.count}
                  <Text style={{ fontSize: 13, fontFamily: 'HankenGrotesk_700Bold', color: colors.ink3 }}>{' '}{streak.count === 1 ? 'dia' : 'dias'}</Text>
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                {last7.map((d, i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 8,
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
              onPress={() => setShowLogModal(true)}
              style={{
                marginTop: 22,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: colors.accent,
                paddingVertical: 16,
                borderRadius: 10,
              }}
            >
              <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 22, color: '#fff', lineHeight: 22 }}>+</Text>
              <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: '#fff', textTransform: direction === 'A' ? 'uppercase' : 'none', letterSpacing: direction === 'A' ? 0.6 : 0 }}>
                Registrar peso
              </Text>
            </TouchableOpacity>
          </Card>

          {/* recent records */}
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 19, letterSpacing: direction === 'A' ? 0.4 : -0.3, textTransform: direction === 'A' ? 'uppercase' : 'none', color: colors.ink }}>
                Registros recentes
              </Text>
              <TouchableOpacity onPress={() => setShowLogModal(true)}>
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13.5, color: colors.accent }}>+ Adicionar</Text>
              </TouchableOpacity>
            </View>

            {recent.map((e, i) => {
              const idxInSorted = entries.findIndex((x) => x.date === e.date);
              const prev = idxInSorted > 0 ? entries[idxInSorted - 1].weight : null;
              const delta = prev != null ? round1(e.weight - prev) : null;
              const dc = delta == null ? colors.ink3 : delta < 0 ? semanticColors.success : delta > 0 ? semanticColors.warning : colors.ink3;
              return (
                <View
                  key={e.date}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    paddingVertical: 13,
                    borderBottomWidth: i < recent.length - 1 ? 1.5 : 0,
                    borderBottomColor: colors.line,
                  }}
                >
                  <Text style={{ flex: 1, fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14.5, color: colors.ink2 }}>
                    {fmtDateLong(e.date)}
                  </Text>
                  <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 20, letterSpacing: -0.3, color: colors.ink }}>
                    {round1(e.weight)}
                    <Text style={{ fontSize: 12, fontFamily: 'HankenGrotesk_700Bold', color: colors.ink3 }}>{u}</Text>
                  </Text>
                  <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13.5, minWidth: 52, textAlign: 'right', color: dc }}>
                    {delta == null ? '—' : (delta > 0 ? '+' : '') + delta}
                  </Text>
                  <TouchableOpacity onPress={() => deleteRecord.mutate(e.id)}>
                    <Text style={{ fontSize: 20, color: colors.ink3 }}>×</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            {recent.length === 0 && (
              <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink3, textAlign: 'center', paddingVertical: 20 }}>
                Nenhum registro ainda.
              </Text>
            )}
          </Card>
        </>
      )}

      {/* ── PESO · GRÁFICOS ── */}
      {tab === 'weight' && weightSubTab === 'charts' && (
        <>
          {goal > 0 && (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.ink2 }}>
                  Meta · {round1(goal)}{u}
                </Text>
                <Text style={{ fontFamily: 'Archivo_900Black', fontSize: 30, letterSpacing: -1, color: colors.ink }}>{pct}%</Text>
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
          )}

          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 19, letterSpacing: direction === 'A' ? 0.4 : -0.3, textTransform: direction === 'A' ? 'uppercase' : 'none', color: colors.ink }}>
                Progresso
              </Text>
              <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12.5, color: colors.ink3 }}>
                {chartEntries.length} registros
              </Text>
            </View>
            <WeightChart entries={chartEntries} unit={u} />
          </Card>
        </>
      )}

      {/* ── FORÇA · ACTIVE SESSION ── */}
      {tab === 'strength' && strengthView === 'active' && activeSession && (
        <ActiveSession
          active={activeSession}
          sessions={sessions}
          unit={u}
          onUpdateActive={updateActiveSession}
          onFinish={finishSession}
          onDiscard={discardSession}
        />
      )}

      {/* ── FORÇA · TREINAR ── */}
      {tab === 'strength' && strengthView !== 'active' && strengthSubTab === 'workout' && (
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

      {/* ── FORÇA · GRÁFICOS ── */}
      {tab === 'strength' && strengthView !== 'active' && strengthSubTab === 'dashboard' && (
        <StrengthDashboard
          sessions={sessions}
          templates={templates}
          unit={u}
          onStartWorkout={startYolo}
        />
      )}

      {/* Modals */}
      <LogModal
        visible={showLogModal}
        unit={u}
        lastWeight={latest?.weight ?? null}
        entries={chartEntries}
        onSave={(date, weight) => {
          logWeight.mutate({ weight, date });
          setShowLogModal(false);
        }}
        onClose={() => setShowLogModal(false)}
      />

      {showPRs && pendingPRs.length > 0 && (
        <PrCelebration
          visible={showPRs}
          prs={pendingPRs}
          unit={u}
          onClose={() => { setShowPRs(false); setPendingPRs([]); }}
        />
      )}
    </View>
  );
}
