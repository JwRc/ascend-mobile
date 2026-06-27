import React from 'react';
import { View, Text, ActivityIndicator, BackHandler, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/theme';
import { Logo } from '@/components/shared/Logo';
import { SegmentedControl } from '@/components/shared/SegmentedControl';
import { CoachOverview } from '@/components/coach/CoachOverview';
import { CoachRoster } from '@/components/coach/CoachRoster';
import { CoachPrograms } from '@/components/coach/CoachPrograms';
import { InviteModal } from '@/components/coach/InviteModal';
import { useAuthStore } from '@/store/auth.store';
import { authClient } from '@/lib/auth';
import {
  COACH_ACCOUNT,
  billingFor,
  type CoachAthlete,
  type CoachProgram,
  type CoachStats,
  type Flag,
} from '@/store/coach.store';
import { useCoachDashboard } from '@/api/hooks/useDashboard';
import { useStudents, useUpdateStudentGoal, useAssignStudentProgram } from '@/api/hooks/useStudents';
import { usePrograms, useCreateProgram, useUpdateProgram, useDeleteProgram } from '@/api/hooks/usePrograms';
import { useCreateInvite } from '@/api/hooks/useInvites';
import type { StudentSummary, Program, CoachDashboard } from '@/types/api';

type Tab = 'overview' | 'roster' | 'programs';

const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Visão Geral' },
  { value: 'roster', label: 'Atletas' },
  { value: 'programs', label: 'Programas' },
];

// ─── Adapters ────────────────────────────────────────────────────────────────

function studentToAthlete(s: StudentSummary): CoachAthlete {
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    contactType: 'email',
    status: s.status,
    units: s.units,
    programId: s.programId,
    programName: s.program ?? null,
    trend: s.trend,
    weekDelta: s.weekDelta,
    goal: s.goal,
    goalDir: s.goalType === 'LOSE' ? 'lose' : s.goalType === 'GAIN' ? 'gain' : 'maintain',
    goalPct: s.goalPct,
    daysSinceLog: s.daysSinceLog,
    sessionsThisWeek: s.sessionsThisWeek,
    assignedPerWeek: s.assignedPerWeek,
    flags: s.flags as Flag[],
    severity: s.severity,
    onTrack: s.onTrack,
    notes: '',
    goalSetBy: 'athlete',
  };
}

function apiProgramToCoach(p: Program): CoachProgram {
  return {
    id: p.id,
    name: p.name,
    focus: p.focus,
    perWeek: p.perWeek,
    days: p.days.map((d, i) => ({ id: d.id ?? `day_${i}`, name: d.name, exercises: d.exercises })),
  };
}

function dashboardToStats(d: CoachDashboard): CoachStats {
  return {
    activeCount: d.billing.activeCount,
    invitedCount: d.billing.invitedCount,
    flaggedCount: d.progress.flaggedCount,
    flagged: d.flagged.map(studentToAthlete),
    onTrack: d.progress.onTrack,
    loggedThisWeek: d.adherence.loggedThisWeek,
    adherencePct: d.adherence.adherencePct,
    totalDone: d.adherence.totalDone,
    totalAssigned: d.adherence.totalAssigned,
    sessionPct: d.adherence.sessionPct,
    quiet: d.adherence.quiet,
  };
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CoachHomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { clearSession } = useAuthStore();

  useFocusEffect(
    React.useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        BackHandler.exitApp();
        return true;
      });
      return () => sub.remove();
    }, [])
  );

  const [tab, setTab] = React.useState<Tab>('overview');
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [rosterFilter, setRosterFilter] = React.useState<string | undefined>(undefined);
  const [menuOpen, setMenuOpen] = React.useState(false);

  // API queries
  const { data: dashboard, isLoading: dashLoading } = useCoachDashboard();
  const { data: studentsRaw = [], isLoading: studentsLoading } = useStudents();
  const { data: programsRaw = [], isLoading: programsLoading } = usePrograms();

  // API mutations
  const createInvite = useCreateInvite();
  const updateStudentGoal = useUpdateStudentGoal();
  const assignStudentProgram = useAssignStudentProgram();
  const createProgramMut = useCreateProgram();
  const updateProgramMut = useUpdateProgram();
  const deleteProgramMut = useDeleteProgram();

  // Adapted data
  const athletes = React.useMemo(() => studentsRaw.map(studentToAthlete), [studentsRaw]);
  const programs = React.useMemo(() => programsRaw.map(apiProgramToCoach), [programsRaw]);
  const stats = React.useMemo(
    () => dashboard ? dashboardToStats(dashboard) : null,
    [dashboard]
  );
  const activeCount = stats?.activeCount ?? 0;

  function openAthlete(a: CoachAthlete) {
    router.push({ pathname: '/(coach)/athlete/[id]' as any, params: { id: a.id } });
  }

  function goRoster(filter?: string) {
    setRosterFilter(filter);
    setTab('roster');
  }

  async function handleLogout() {
    try { await authClient.signOut(); } catch { /* ignore */ }
    await clearSession();
    queryClient.clear();
    router.replace('/(auth)/login');
  }

  function handleInvite(payload: {
    name: string;
    email: string;
    contactType: 'email' | 'phone';
    units: 'kg' | 'lb';
    programId: string | null;
  }) {
    createInvite.mutate({
      name: payload.name,
      contactType: payload.contactType,
      contact: payload.email,
      units: payload.units,
      programId: payload.programId,
    }, {
      onSuccess: () => setInviteOpen(false),
    });
  }

  function handleUpdateGoal(athleteId: string, goal: number) {
    const student = studentsRaw.find((s) => s.id === athleteId);
    updateStudentGoal.mutate({
      id: athleteId,
      targetWeight: goal,
      goalType: student?.goalType ?? 'LOSE',
    });
  }

  function handleAssignProgram(athleteId: string, programId: string | null) {
    assignStudentProgram.mutate({ id: athleteId, programId });
  }

  function handleCreateProgram(p: CoachProgram) {
    createProgramMut.mutate({
      name: p.name,
      focus: p.focus,
      perWeek: p.perWeek,
      notes: '',
      days: p.days.map((d, i) => ({ name: d.name, order: i, exercises: d.exercises })),
    });
  }

  function handleUpdateProgram(p: CoachProgram) {
    updateProgramMut.mutate({
      id: p.id,
      name: p.name,
      focus: p.focus,
      perWeek: p.perWeek,
      notes: '',
      days: p.days.map((d, i) => ({ id: d.id, name: d.name, order: i, exercises: d.exercises })),
    });
  }

  const isLoading = dashLoading || studentsLoading || programsLoading;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: 12,
          borderBottomWidth: 1.5,
          borderBottomColor: colors.line,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Logo size={20} />
          <View
            style={{
              backgroundColor: colors.accent,
              borderRadius: 6,
              paddingHorizontal: 7,
              paddingVertical: 3,
            }}
          >
            <Text
              style={{
                fontFamily: 'HankenGrotesk_700Bold',
                fontSize: 10.5,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                color: '#fff',
              }}
            >
              Coach
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12.5, color: colors.ink3 }}>
            R$ {billingFor(activeCount).total}/mês
          </Text>
          <TouchableOpacity onPress={() => setMenuOpen(!menuOpen)}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: colors.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 13, color: colors.bg }}>
                {COACH_ACCOUNT.coachName.slice(0, 1)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {menuOpen && (
        <TouchableOpacity
          style={[StyleSheet.absoluteFill, { zIndex: 20 }]}
          onPress={() => setMenuOpen(false)}
          activeOpacity={1}
        />
      )}

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
          <TouchableOpacity
            onPress={() => { setMenuOpen(false); handleLogout(); }}
            style={{ padding: 11, borderRadius: 6 }}
          >
            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink2 }}>
              Sair
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Tab switcher ─────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 }}>
        <SegmentedControl
          options={TABS}
          value={tab}
          onChange={(v) => setTab(v as Tab)}
        />
      </View>

      {/* ── Content ──────────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {tab === 'overview' && stats && (
            <CoachOverview
              stats={stats}
              onOpenAthlete={openAthlete}
              onGoRoster={goRoster}
            />
          )}
          {tab === 'roster' && (
            <CoachRoster
              athletes={athletes}
              initialFilter={rosterFilter as any}
              onOpenAthlete={openAthlete}
              onInvite={() => setInviteOpen(true)}
            />
          )}
          {tab === 'programs' && (
            <CoachPrograms
              programs={programs}
              athletes={athletes}
              onCreateProgram={handleCreateProgram}
              onUpdateProgram={handleUpdateProgram}
              onDeleteProgram={(id) => deleteProgramMut.mutate(id)}
              onAssignProgram={handleAssignProgram}
            />
          )}
        </View>
      )}

      {/* ── Invite modal ─────────────────────────────────────────────── */}
      <InviteModal
        visible={inviteOpen}
        programs={programs}
        activeCount={activeCount}
        onInvite={handleInvite}
        onClose={() => setInviteOpen(false)}
        loading={createInvite.isPending}
        error={createInvite.error ? (createInvite.error as any)?.response?.data?.message ?? 'Erro ao enviar convite.' : null}
      />
    </SafeAreaView>
  );
}
