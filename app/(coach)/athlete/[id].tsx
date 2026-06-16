import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { AthleteDetail } from '@/components/coach/AthleteDetail';
import { useStudentById, useUpdateStudentGoal, useAssignStudentProgram } from '@/api/hooks/useStudents';
import { usePrograms } from '@/api/hooks/usePrograms';
import { useInvites, useRevokeInvite, useResendInvite } from '@/api/hooks/useInvites';
import type { CoachAthlete, CoachProgram, Flag } from '@/store/coach.store';
import type { StudentSummary, Program } from '@/types/api';

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

export default function AthleteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const { data: studentRaw, isLoading: studentLoading } = useStudentById(id ?? '');
  const { data: programsRaw = [] } = usePrograms();
  const { data: invites = [] } = useInvites();

  const updateStudentGoal = useUpdateStudentGoal();
  const assignStudentProgram = useAssignStudentProgram();
  const revokeInvite = useRevokeInvite();
  const resendInvite = useResendInvite();

  const athlete = React.useMemo(
    () => studentRaw ? studentToAthlete(studentRaw) : null,
    [studentRaw]
  );
  const programs = React.useMemo(() => programsRaw.map(apiProgramToCoach), [programsRaw]);

  function findInviteId(): string | null {
    if (!studentRaw) return null;
    const inv = invites.find((i) => i.contact === studentRaw.email);
    return inv?.id ?? null;
  }

  function handleUpdateGoal(athleteId: string, goal: number) {
    updateStudentGoal.mutate({
      id: athleteId,
      targetWeight: goal,
      goalType: studentRaw?.goalType ?? 'LOSE',
    });
  }

  function handleAssignProgram(athleteId: string, programId: string | null) {
    assignStudentProgram.mutate({ id: athleteId, programId });
  }

  function handleCancelInvite(_athleteId: string) {
    const inviteId = findInviteId();
    if (inviteId) revokeInvite.mutate(inviteId);
  }

  function handleResendInvite(_athleteId: string) {
    const inviteId = findInviteId();
    if (inviteId) resendInvite.mutate(inviteId);
  }

  if (studentLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (!athlete) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: colors.ink3 }}>
          Atleta não encontrado.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 12,
          borderBottomWidth: 1.5,
          borderBottomColor: colors.line,
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.surface2,
            borderWidth: 1.5,
            borderColor: colors.line,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 18, color: colors.ink }}>‹</Text>
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontFamily: 'Archivo_800ExtraBold',
            fontSize: 19,
            letterSpacing: -0.3,
            color: colors.ink,
          }}
          numberOfLines={1}
        >
          {athlete.name}
        </Text>
      </View>

      <AthleteDetail
        athlete={athlete}
        programs={programs}
        onAssignProgram={handleAssignProgram}
        onUpdateGoal={handleUpdateGoal}
        onUpdateNotes={() => {}} // notes not supported by API yet
        onResendInvite={handleResendInvite}
        onCancelInvite={handleCancelInvite}
      />
    </SafeAreaView>
  );
}
