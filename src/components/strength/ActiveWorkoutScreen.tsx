import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, BackHandler, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { useTheme } from '@/theme';
import { Logo } from '@/components/shared/Logo';
import { ActiveSession } from './ActiveSession';
import { PrCelebration } from './PrCelebration';
import { NewTicketModal } from '@/components/support/NewTicketModal';
import { useStudentProfile } from '@/api/hooks/useStudentProfile';
import { useWorkouts } from '@/api/hooks/useWorkouts';
import { useSyncWorkoutSession, useDiscardWorkoutSession } from '@/api/hooks/useWorkoutSession';
import { useStrengthStore } from '@/store/strength.store';
import { round1 } from '@/lib/utils';
import { debounce } from '@/lib/debounce';
import { capture } from '@/lib/analytics';
import type { WorkoutSessionSnapshot, WorkoutSessionSyncResult, WorkoutStatus, Workout } from '@/types/api';
import type { ActiveSession as ActiveSessionType, Session, SetType, WorkSet } from '@/store/strength.store';

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
      sets: ex.sets.map((s, i) => ({
        id: `${w.id}_${ex.name}_${i}`,
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

// Tela dedicada de treino ativo — equivalente ao /coach/roster/:id/treino/ativo e ao
// fluxo próprio do aluno no web (ActiveWorkoutScreen). Fica fora das rotas de tab
// (montada tanto em app/(app)/workout/active.tsx quanto em app/(coach)/workout/active.tsx)
// e é inteiramente auto-contida: lê a sessão ativa direto da store global — nenhum
// parâmetro de rota é necessário. `activeSession.forStudent` distingue "treino próprio"
// de "coach registrando em nome de um aluno" e direciona pras rotas de API corretas.
export function ActiveWorkoutScreen({ homeHref }: { homeHref: '/(app)' | '/(coach)' }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { activeSession, setActiveSession, updateActiveSession, setPendingCelebration } = useStrengthStore();
  const forStudent = activeSession?.forStudent ?? null;

  // Em cold start / reload com sessão persistida retomada via redirect, esta tela pode
  // ser a primeira da pilha de navegação — sem histórico para `router.back()` voltar.
  // Cai pro replace da home do grupo de rotas correto nesse caso.
  function safeBack() {
    if (router.canGoBack()) router.back();
    else router.replace(homeHref as any);
  }

  // finishSession/discardSession limpam activeSession e navegam de volta por conta própria
  // (já chamando safeBack) — o efeito abaixo não deve navegar de novo nesses casos. Ele
  // existe só pro caso de a sessão ser limpa por fora desse fluxo, ex.: em background.
  const suppressAutoExitRef = React.useRef(false);

  const { data: profile } = useStudentProfile();
  const { data: workoutsRaw = [] } = useWorkouts();
  const syncSession = useSyncWorkoutSession();
  const discardRemoteSession = useDiscardWorkoutSession();

  const [pendingPRs, setPendingPRs] = React.useState<Session['prs']>([]);
  const [showPRs, setShowPRs] = React.useState(false);
  const [supportOpen, setSupportOpen] = React.useState(false);

  const unit = forStudent?.units ?? profile?.units ?? 'kg';
  const sessions = React.useMemo(
    () => (forStudent ? [] : workoutsRaw.map(workoutToSession)),
    [forStudent, workoutsRaw],
  );

  function buildSnapshot(session: ActiveSessionType, status: WorkoutStatus): WorkoutSessionSnapshot {
    const live = session.startedAt
      ? Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000))
      : 0;
    return {
      performedAt: new Date(session.date + 'T12:00:00').toISOString(),
      durationSec: (session.accumulatedSec || 0) + live,
      templateId: session.templateId,
      templateName: session.templateName,
      programId: session.programId,
      programName: session.programName,
      status,
      exercises: session.exercises
        .filter((ex) => ex.sets.length > 0)
        .map((ex) => ({
          name: ex.name,
          sets: ex.sets.map((s, i) => ({
            clientSetId: s.id,
            setNumber: i + 1,
            setType: (s.type?.toUpperCase() ?? 'WORK') as WorkoutSessionSnapshot['exercises'][0]['sets'][0]['setType'],
            reps: s.reps,
            weight: s.weight,
          })),
        })),
    };
  }

  function handleSyncResult(result: WorkoutSessionSyncResult) {
    if (result.newPRs.length > 0) {
      capture(forStudent ? 'pr_achieved_for_student' : 'pr_achieved_live', { count: result.newPRs.length });
      setPendingPRs(
        result.newPRs.map((pr) => ({
          exercise: pr.exerciseName,
          e: round1(pr.estimated1RM),
          prevBest: round1(pr.prevBest),
          weight: null,
          reps: null,
        })),
      );
      setShowPRs(true);
    }
  }

  const debouncedSync = React.useMemo(
    () =>
      debounce((session: ActiveSessionType) => {
        syncSession.mutate(
          { clientId: session.id, snapshot: buildSnapshot(session, session.status), studentId: forStudent?.id },
          { onSuccess: handleSyncResult },
        );
      }, 400),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- forStudent.id só muda entre montagens (nova sessão)
    [syncSession, forStudent?.id],
  );

  React.useEffect(() => {
    if (!activeSession || activeSession.status === 'COMPLETED') return;
    if (activeSession.exercises.every((e) => e.sets.length === 0)) return;
    debouncedSync(activeSession);
    return () => debouncedSync.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intencionalmente não observa startedAt/accumulatedSec
  }, [activeSession?.exercises]);

  React.useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      if (!state.isConnected || !activeSession) return;
      const hasContent = activeSession.exercises.some((e) => e.sets.length > 0);
      if (hasContent) debouncedSync(activeSession);
    });
    return unsub;
  }, [activeSession, debouncedSync]);

  async function finishSession() {
    if (!activeSession) return;
    suppressAutoExitRef.current = true;
    debouncedSync.cancel();
    updateActiveSession((a) => ({ ...a, status: 'COMPLETED' }));

    const snapshot = buildSnapshot(activeSession, 'COMPLETED');
    try {
      const result = await syncSession.mutateAsync({
        clientId: activeSession.id,
        snapshot,
        studentId: forStudent?.id,
      });
      setActiveSession(null);
      if (forStudent) {
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'student', forStudent.id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['workouts'] });
      }
      capture(forStudent ? 'workout_logged_for_student' : 'workout_logged', {
        exerciseCount: snapshot.exercises.length,
      });
      if (result.newPRs.length > 0) {
        capture(forStudent ? 'pr_achieved_for_student' : 'pr_achieved_live', { count: result.newPRs.length });
        setPendingCelebration({
          prs: result.newPRs.map((pr) => ({
            exercise: pr.exerciseName,
            e: round1(pr.estimated1RM),
            prevBest: round1(pr.prevBest),
            weight: null,
            reps: null,
          })),
          unit,
        });
      }
      safeBack();
    } catch {
      // offline: a sessão com status COMPLETED continua persistida em disco; o listener
      // de reconexão acima reenvia automaticamente quando a rede voltar. Sai da tela
      // otimisticamente — não faz sentido prender o usuário esperando a rede.
      safeBack();
    }
  }

  function discardSession() {
    suppressAutoExitRef.current = true;
    debouncedSync.cancel();
    const clientId = activeSession?.id;
    setActiveSession(null);
    if (clientId) discardRemoteSession.mutate({ clientId, studentId: forStudent?.id });
  }

  function handleBackPress() {
    if (!activeSession || activeSession.startedAt) return; // sem volta depois de iniciado o cronômetro
    const hasSets = activeSession.exercises.some((e) => e.sets.length > 0);
    if (hasSets) {
      Alert.alert(
        'Descartar treino?',
        'As séries registradas serão perdidas. Isso não pode ser desfeito.',
        [
          { text: 'Continuar', style: 'cancel' },
          {
            text: 'Descartar',
            style: 'destructive',
            onPress: () => { discardSession(); safeBack(); },
          },
        ],
      );
    } else {
      discardSession();
      safeBack();
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (activeSession?.startedAt) return true; // bloqueia — sem saída até finalizar/descartar
        handleBackPress();
        return true;
      });
      return () => sub.remove();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSession])
  );

  // Não deveria acontecer em uso normal (só se navega pra cá com uma sessão setada),
  // mas evita ficar preso numa tela em branco caso a sessão seja limpa em outro lugar
  // enquanto montada. Navegação disparada em efeito, não durante o render.
  React.useEffect(() => {
    if (!activeSession && !suppressAutoExitRef.current) safeBack();
  }, [activeSession]);

  if (!activeSession) return null;

  const showBack = !activeSession.startedAt;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* topbar */}
      <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingHorizontal: 20,
              paddingVertical: 14,
            }}
          >
            {showBack && (
              <TouchableOpacity
                onPress={handleBackPress}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
            )}
            <Logo size={20} />
            {forStudent && (
              <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, color: colors.ink3 }}>
                · {forStudent.name}
              </Text>
            )}
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, gap: 14 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <ActiveSession
              active={activeSession}
              sessions={sessions}
              unit={unit}
              onUpdateActive={updateActiveSession}
              onFinish={finishSession}
              onDiscard={() => { discardSession(); safeBack(); }}
            />
          </ScrollView>

          {/* Suporte FAB */}
          <TouchableOpacity
            onPress={() => setSupportOpen(true)}
            style={{
              position: 'absolute',
              right: 18,
              bottom: 24,
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: colors.ink,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            <Text style={{ fontSize: 20 }}>💬</Text>
          </TouchableOpacity>

          <NewTicketModal
            visible={supportOpen}
            onClose={() => setSupportOpen(false)}
            onCreated={() => setSupportOpen(false)}
          />

      {/* PR batido em pleno treino (fora do finalizar) — celebra na hora, sem sair da tela */}
      <PrCelebration
        visible={showPRs}
        prs={pendingPRs ?? []}
        unit={unit}
        onClose={() => { setShowPRs(false); setPendingPRs([]); }}
      />
    </SafeAreaView>
  );
}
