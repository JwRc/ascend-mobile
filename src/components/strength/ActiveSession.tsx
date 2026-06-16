import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useTheme } from '@/theme';
import { Card } from '@/components/shared/Card';
import { Btn } from '@/components/shared/Btn';
import { AppModal } from '@/components/shared/AppModal';
import { ExerciseBlock } from './ExerciseBlock';
import {
  ActiveSession as ActiveSessionType,
  WorkSet,
  exercisePeak1RM,
  sessionsWithExercise,
  Session,
} from '@/store/strength.store';
import { fmtDateLong, round1, epley1RM } from '@/lib/utils';

function useElapsed(active: ActiveSessionType) {
  const running = !!active.startedAt;
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running, active.startedAt]);

  const acc = active.accumulatedSec || 0;
  const live = active.startedAt ? Math.max(0, Math.floor((now - active.startedAt) / 1000)) : 0;
  return acc + live;
}

function fmtClock(total: number) {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

type Props = {
  active: ActiveSessionType;
  sessions: Session[];
  unit: 'kg' | 'lb';
  onUpdateActive: (fn: (prev: ActiveSessionType) => ActiveSessionType) => void;
  onFinish: () => void;
  onDiscard: () => void;
};

export function ActiveSession({ active, sessions, unit, onUpdateActive, onFinish, onDiscard }: Props) {
  const { colors, direction, radius } = useTheme();
  const [addingEx, setAddingEx] = React.useState(false);
  const [newEx, setNewEx] = React.useState('');
  const [confirmDiscard, setConfirmDiscard] = React.useState(false);
  const elapsed = useElapsed(active);
  const running = !!active.startedAt;

  const totalSets = active.exercises.reduce((n, e) => n + e.sets.length, 0);
  const canFinish = active.exercises.some((e) => e.sets.length > 0);
  const overTarget = active.targetMin != null && elapsed > Math.round(active.targetMin * 60);

  function startTimer() {
    if (active.startedAt) return;
    onUpdateActive((a) => ({ ...a, startedAt: Date.now() }));
  }

  function pauseTimer() {
    if (!active.startedAt) return;
    const live = Math.max(0, Math.floor((Date.now() - active.startedAt) / 1000));
    onUpdateActive((a) => ({
      ...a,
      accumulatedSec: (a.accumulatedSec || 0) + live,
      startedAt: null,
    }));
  }

  function addSet(exIdx: number, set: WorkSet) {
    onUpdateActive((a) => ({
      ...a,
      exercises: a.exercises.map((e, i) =>
        i === exIdx ? { ...e, sets: [...e.sets, set] } : e
      ),
    }));
  }

  function removeSet(exIdx: number, setIdx: number) {
    onUpdateActive((a) => ({
      ...a,
      exercises: a.exercises.map((e, i) =>
        i === exIdx ? { ...e, sets: e.sets.filter((_, k) => k !== setIdx) } : e
      ),
    }));
  }

  function addExercise() {
    const v = newEx.trim();
    if (!v) { setAddingEx(false); setNewEx(''); return; }
    onUpdateActive((a) => ({
      ...a,
      exercises: [...a.exercises, { name: v, sets: [] }],
    }));
    setNewEx('');
    setAddingEx(false);
  }

  function getDefaults(name: string) {
    const hist = sessionsWithExercise(sessions, name);
    if (hist.length) {
      const lastSess = hist[hist.length - 1];
      const ex = lastSess.exercises.find((e) => e.name.toLowerCase() === name.toLowerCase());
      if (ex && ex.sets.length) {
        const last = ex.sets[ex.sets.length - 1];
        return { weight: last.weight, reps: last.reps };
      }
    }
    return { weight: unit === 'kg' ? 20 : 45, reps: 8 };
  }

  return (
    <View style={{ gap: 14 }}>
      {/* sticky top bar */}
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <View style={{ flex: 1, minWidth: 120 }}>
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.accent }}>
              {active.yolo ? 'Freestyle' : active.templateName}
            </Text>
            <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 20, letterSpacing: -0.3, color: colors.ink, marginTop: 3, marginBottom: 4 }}>
              {fmtDateLong(active.date)}
            </Text>
            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12.5, color: colors.ink3 }}>
              {active.exercises.length} exercícios · {totalSets} séries
            </Text>
          </View>

          {/* timer */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={running ? pauseTimer : startTimer}
              style={{
                width: 52,
                height: 52,
                borderRadius: radius.cardSm,
                backgroundColor: running ? colors.surface2 : colors.accent,
                borderWidth: running ? 1.5 : 0,
                borderColor: running ? colors.line2 : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 22, color: running ? colors.ink2 : '#fff' }}>
                {running ? '⏸' : '▶'}
              </Text>
            </TouchableOpacity>

            <View>
              <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.ink3 }}>
                {running ? 'Decorrido' : 'Tap para iniciar'}
              </Text>
              <Text
                style={{
                  fontFamily: 'Archivo_900Black',
                  fontSize: 32,
                  letterSpacing: -1,
                  color: overTarget ? colors.accent : colors.ink,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {fmtClock(elapsed)}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'flex-end' }}>
            <TouchableOpacity onPress={() => totalSets >= 1 ? setConfirmDiscard(true) : onDiscard()}>
              <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, color: '#e5484d' }}>
                Descartar
              </Text>
            </TouchableOpacity>
            <Btn kind="primary" onPress={onFinish} disabled={!canFinish} style={{ paddingVertical: 12 }}>
              Finalizar
            </Btn>
          </View>
        </View>

        {/* target progress bar */}
        {active.targetMin != null && (
          <View style={{ gap: 6 }}>
            <View
              style={{
                height: 12,
                backgroundColor: colors.surface2,
                borderWidth: 1.5,
                borderColor: colors.line,
                borderRadius: direction === 'A' ? 3 : 30,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${Math.min(100, (elapsed / Math.max(1, active.targetMin * 60)) * 100)}%`,
                  backgroundColor: colors.accent,
                  borderRadius: direction === 'A' ? 0 : 30,
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12.5, color: colors.ink3 }}>
                Alvo {fmtClock(active.targetMin * 60)}
              </Text>
              <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12.5, color: overTarget ? colors.accent : colors.ink3 }}>
                {overTarget
                  ? `+${fmtClock(elapsed - active.targetMin * 60)} além`
                  : `${fmtClock(Math.max(0, active.targetMin * 60 - elapsed))} restando`}
              </Text>
            </View>
          </View>
        )}
      </Card>

      {/* exercise blocks */}
      {active.exercises.map((block, i) => (
        <ExerciseBlock
          key={i}
          name={block.name}
          sets={block.sets}
          unit={unit}
          defaultWeight={getDefaults(block.name).weight}
          defaultReps={getDefaults(block.name).reps}
          onAddSet={(set) => addSet(i, set)}
          onRemoveSet={(k) => removeSet(i, k)}
        />
      ))}

      {/* add exercise */}
      {addingEx || active.exercises.length === 0 ? (
        <Card style={{ gap: 12 }}>
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: colors.ink3 }}>
            Adicionar exercício
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              value={newEx}
              onChangeText={setNewEx}
              placeholder="Nome do exercício…"
              autoFocus
              onSubmitEditing={addExercise}
              style={{
                flex: 1,
                backgroundColor: colors.surface2,
                borderWidth: 1.5,
                borderColor: colors.line,
                borderRadius: radius.cardSm,
                paddingVertical: 14,
                paddingHorizontal: 16,
                fontSize: 16,
                fontFamily: 'HankenGrotesk_500Medium',
                color: colors.ink,
              }}
              placeholderTextColor={colors.ink3}
            />
            <Btn kind="primary" onPress={addExercise} style={{ paddingVertical: 14, paddingHorizontal: 18 }}>
              Adicionar
            </Btn>
          </View>
        </Card>
      ) : (
        <TouchableOpacity onPress={() => setAddingEx(true)}>
          <View
            style={{
              borderWidth: 1.5,
              borderColor: colors.line2,
              borderStyle: 'dashed',
              borderRadius: radius.card,
              padding: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, color: colors.accent }}>
              + Adicionar Exercício
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* discard confirmation */}
      <AppModal
        visible={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="Descartar treino?"
      >
        <Text style={{ fontFamily: 'HankenGrotesk_500Medium', fontSize: 15, lineHeight: 22, color: colors.ink2 }}>
          As {totalSets} {totalSets === 1 ? 'série' : 'séries'} registradas serão perdidas. Isso não pode ser desfeito.
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn kind="ghost" onPress={() => setConfirmDiscard(false)} style={{ flex: 1 }}>
            Continuar
          </Btn>
          <Btn kind="danger" onPress={() => { setConfirmDiscard(false); onDiscard(); }} style={{ flex: 1 }}>
            Descartar
          </Btn>
        </View>
      </AppModal>
    </View>
  );
}
