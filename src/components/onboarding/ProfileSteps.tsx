import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme';
import { Stepper } from '@/components/shared/Stepper';
import { OptRow } from '@/components/shared/OptRow';
import { ToggleCard } from '@/components/shared/ToggleCard';
import { round1 } from '@/lib/utils';
import { StepEyebrow, StepQuestion } from './OnboardingChrome';

export type GoalType = 'lose' | 'strength' | 'maintain';
export type ActivityLevel = 'sed' | 'light' | 'mod' | 'high';
export type Unit = 'kg' | 'lb';

export const GOAL_TYPES: { value: GoalType; label: string; note: string }[] = [
  { value: 'lose', label: 'Perder peso', note: 'Chegar a um peso alvo' },
  { value: 'strength', label: 'Ganhar força', note: 'Evoluir nos treinos' },
  { value: 'maintain', label: 'Manter', note: 'Manter consistência' },
];

export const ACTIVITY: { value: ActivityLevel; label: string; note: string }[] = [
  { value: 'sed', label: 'Sedentário', note: 'Trabalho de mesa, pouco exercício' },
  { value: 'light', label: 'Leve', note: '1–3 treinos por semana' },
  { value: 'mod', label: 'Ativo', note: '4–5 treinos por semana' },
  { value: 'high', label: 'Atleta', note: 'Treino diário' },
];

export function cmToFtIn(cm: number) {
  const inch = cm / 2.54;
  return { ft: Math.floor(inch / 12), inch: Math.round(inch % 12) };
}

export function weightRange(unit: Unit) {
  return unit === 'kg' ? { min: 30, max: 250, step: 0.5 } : { min: 66, max: 550, step: 0.5 };
}

// ─── Onde você está agora ───────────────────────────────────────────────────

export function CurrentWeightStep({
  value,
  unit,
  onChange,
}: {
  value: number;
  unit: Unit;
  onChange: (v: number) => void;
}) {
  const range = weightRange(unit);
  return (
    <>
      <StepEyebrow>Onde você está agora</StepEyebrow>
      <StepQuestion>{'Seu peso\natual'}</StepQuestion>
      <Stepper value={value} step={range.step} unit={unit} min={range.min} max={range.max} onChange={onChange} />
    </>
  );
}

// ─── Objetivo ────────────────────────────────────────────────────────────────

export function GoalTypeStep({
  value,
  onChange,
}: {
  value: GoalType;
  onChange: (v: GoalType) => void;
}) {
  return (
    <>
      <StepEyebrow>Seu objetivo principal</StepEyebrow>
      <StepQuestion>{'Para o que\nvocê treina?'}</StepQuestion>
      <View style={{ gap: 10 }}>
        {GOAL_TYPES.map((g) => (
          <OptRow key={g.value} label={g.label} note={g.note} selected={value === g.value} onPress={() => onChange(g.value)} />
        ))}
      </View>
    </>
  );
}

// ─── Altura ──────────────────────────────────────────────────────────────────

export function HeightStep({
  heightCm,
  unit,
  onChange,
}: {
  heightCm: number;
  unit: Unit;
  onChange: (cm: number) => void;
}) {
  const { colors } = useTheme();
  return (
    <>
      <StepEyebrow>Um pouco sobre você</StepEyebrow>
      <StepQuestion>{'Qual é\nsua altura?'}</StepQuestion>
      <View style={{ gap: 14 }}>
        {unit === 'kg' ? (
          <Stepper value={heightCm} step={1} unit="cm" min={120} max={230} onChange={(v) => onChange(Math.round(v))} />
        ) : (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Stepper
                value={cmToFtIn(heightCm).ft}
                step={1}
                unit="ft"
                min={3}
                max={7}
                onChange={(v) => {
                  const { inch } = cmToFtIn(heightCm);
                  onChange(Math.round((v * 12 + inch) * 2.54));
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Stepper
                value={cmToFtIn(heightCm).inch}
                step={1}
                unit="in"
                min={0}
                max={11}
                onChange={(v) => {
                  const { ft } = cmToFtIn(heightCm);
                  onChange(Math.round((ft * 12 + v) * 2.54));
                }}
              />
            </View>
          </View>
        )}
        <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13.5, color: colors.ink3, textAlign: 'center' }}>
          {unit === 'kg'
            ? (() => { const { ft, inch } = cmToFtIn(heightCm); return `${ft}'${inch}"`; })()
            : `${heightCm} cm`}
          {' · '}Usado para estimar seu IMC no dashboard.
        </Text>
      </View>
    </>
  );
}

// ─── Meta de peso ────────────────────────────────────────────────────────────

export function GoalWeightStep({
  value,
  unit,
  current,
  goalType,
  onChange,
}: {
  value: number;
  unit: Unit;
  current: number;
  goalType: GoalType;
  onChange: (v: number) => void;
}) {
  const { colors } = useTheme();
  const range = weightRange(unit);
  const diff = round1(Math.abs(current - value));
  const goalDir = value < current ? 'perder' : value > current ? 'ganhar' : 'manter';
  return (
    <>
      <StepEyebrow>Sua meta</StepEyebrow>
      <StepQuestion>{'Qual é\nseu peso\nideal?'}</StepQuestion>
      <Stepper value={value} step={range.step} unit={unit} min={range.min} max={range.max} onChange={onChange} />
      {goalType !== 'strength' && (
        <View
          style={{
            padding: 14,
            paddingLeft: 18,
            backgroundColor: colors.surface2,
            borderRadius: 10,
            borderLeftWidth: 4,
            borderLeftColor: colors.accent,
          }}
        >
          <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 17, color: colors.ink2 }}>
            {goalDir === 'manter' ? (
              `Manter em ${round1(value)}${unit}.`
            ) : (
              <>São <Text style={{ fontFamily: 'HankenGrotesk_700Bold', color: colors.ink }}>{diff}{unit}</Text> para {goalDir}. Vamos lá.</>
            )}
          </Text>
        </View>
      )}
    </>
  );
}

// ─── Nível de atividade ──────────────────────────────────────────────────────

export function ActivityStep({
  value,
  onChange,
}: {
  value: ActivityLevel;
  onChange: (v: ActivityLevel) => void;
}) {
  return (
    <>
      <StepEyebrow>Seu nível de atividade</StepEyebrow>
      <StepQuestion>{'Quão ativo\nvocê é?'}</StepQuestion>
      <View style={{ gap: 10 }}>
        {ACTIVITY.map((a) => (
          <OptRow key={a.value} label={a.label} note={a.note} selected={value === a.value} onPress={() => onChange(a.value)} />
        ))}
      </View>
    </>
  );
}

// ─── Lembretes ───────────────────────────────────────────────────────────────

export function RemindersStep({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <>
      <StepEyebrow>Consistência</StepEyebrow>
      <StepQuestion>{'Lembrete\ndiário de\npesagem?'}</StepQuestion>
      <ToggleCard
        label="Lembrete matinal"
        note="Um aviso gentil às 8h para registrar antes do café."
        value={value}
        onChange={onChange}
      />
      <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13.5, color: colors.ink3 }}>
        {value ? 'Vamos te lembrar toda manhã.' : 'Sem lembretes — registre quando quiser.'}
      </Text>
    </>
  );
}
