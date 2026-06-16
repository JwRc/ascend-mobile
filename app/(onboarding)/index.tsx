import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { Btn } from '@/components/shared/Btn';
import { Stepper } from '@/components/shared/Stepper';
import { SegmentedControl } from '@/components/shared/SegmentedControl';
import { OptRow } from '@/components/shared/OptRow';
import { ToggleCard } from '@/components/shared/ToggleCard';
import { StyledInput } from '@/components/shared/Field';
import { round1, convert } from '@/lib/utils';
import { useUpdateStudentProfile } from '@/api/hooks/useStudentProfile';
import { useSetGoal } from '@/api/hooks/useGoals';

// ---------- step types ----------
const STEPS = ['name', 'units', 'current', 'goaltype', 'height', 'goal', 'activity', 'reminders'] as const;
type Step = (typeof STEPS)[number];

const GOAL_TYPES = [
  { value: 'lose', label: 'Perder peso', note: 'Chegar a um peso alvo' },
  { value: 'strength', label: 'Ganhar força', note: 'Evoluir nos treinos' },
  { value: 'maintain', label: 'Manter', note: 'Manter consistência' },
] as const;

const ACTIVITY = [
  { value: 'sed', label: 'Sedentário', note: 'Trabalho de mesa, pouco exercício' },
  { value: 'light', label: 'Leve', note: '1–3 treinos por semana' },
  { value: 'mod', label: 'Ativo', note: '4–5 treinos por semana' },
  { value: 'high', label: 'Atleta', note: 'Treino diário' },
] as const;

type FormData = {
  name: string;
  units: 'kg' | 'lb';
  current: number;
  heightCm: number;
  goalType: 'lose' | 'strength' | 'maintain';
  goal: number;
  activity: 'sed' | 'light' | 'mod' | 'high';
  reminders: boolean;
};

export default function OnboardingScreen() {
  const { colors, direction } = useTheme();
  const updateProfile = useUpdateStudentProfile();
  const setGoal = useSetGoal();

  const [step, setStep] = React.useState(0);
  const [d, setD] = React.useState<FormData>({
    name: '',
    units: 'kg',
    current: 75,
    heightCm: 175,
    goalType: 'lose',
    goal: 70,
    activity: 'light',
    reminders: true,
  });

  const set = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setD((s) => ({ ...s, [key]: val }));

  const total = STEPS.length;
  const key = STEPS[step];

  function next() {
    if (step < total - 1) {
      setStep(step + 1);
    } else {
      finish();
    }
  }
  function back() {
    if (step > 0) setStep(step - 1);
  }

  async function finish() {
    await updateProfile.mutateAsync({
      name: d.name.trim() || 'Atleta',
      units: d.units,
      heightCm: d.heightCm,
      activityLevel: d.activity,
      reminders: d.reminders,
    });
    const goalType =
      d.goalType === 'lose' ? 'LOSE' : d.goalType === 'strength' ? 'GAIN' : 'MAINTAIN';
    await setGoal.mutateAsync({ targetWeight: round1(d.goal), goalType });
    router.replace('/(app)');
  }

  // helpers
  const u = d.units;
  const diff = round1(Math.abs(d.current - d.goal));
  const goalDir = d.goal < d.current ? 'perder' : d.goal > d.current ? 'ganhar' : 'manter';

  const cmToFtIn = (cm: number) => {
    const inch = cm / 2.54;
    return { ft: Math.floor(inch / 12), inch: Math.round(inch % 12) };
  };

  const isNextDisabled = key === 'name' && d.name.trim().length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            maxWidth: 480,
            width: '100%',
            alignSelf: 'center',
            paddingHorizontal: 26,
            paddingTop: 24,
            paddingBottom: 28,
          }}
        >
          {/* header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 8 }}>
            <TouchableOpacity
              onPress={back}
              style={{ visibility: step === 0 ? 'hidden' : 'visible', paddingVertical: 6 } as any}
              disabled={step === 0}
            >
              <Text
                style={{
                  fontFamily: 'HankenGrotesk_600SemiBold',
                  fontSize: 14.5,
                  color: step === 0 ? 'transparent' : colors.ink2,
                }}
              >
                ← Voltar
              </Text>
            </TouchableOpacity>

            {/* progress dots */}
            <View style={{ flex: 1, flexDirection: 'row', gap: 5 }}>
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 4,
                    backgroundColor: i <= step ? colors.accent : colors.line2,
                  }}
                />
              ))}
            </View>

            <Text
              style={{
                fontFamily: 'HankenGrotesk_700Bold',
                fontSize: 12,
                letterSpacing: 0.6,
                color: colors.ink3,
              }}
            >
              {step + 1}/{total}
            </Text>
          </View>

          {/* body */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingVertical: 20, gap: 22 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View key={step} entering={FadeInDown.duration(280).springify()} style={{ gap: 22 }}>
              {/* eyebrow */}
              {key === 'name' && <StepLabel>Vamos nos conhecer</StepLabel>}
              {key === 'units' && <StepLabel>Suas unidades</StepLabel>}
              {key === 'current' && <StepLabel>Onde você está agora</StepLabel>}
              {key === 'goaltype' && <StepLabel>Seu objetivo principal</StepLabel>}
              {key === 'height' && <StepLabel>Um pouco sobre você</StepLabel>}
              {key === 'goal' && <StepLabel>Sua meta</StepLabel>}
              {key === 'activity' && <StepLabel>Seu nível de atividade</StepLabel>}
              {key === 'reminders' && <StepLabel>Consistência</StepLabel>}

              {/* question */}
              <OnbQuestion direction={direction} colors={colors}>
                {key === 'name' && 'Como\ndevemos te\nchamar?'}
                {key === 'units' && `${d.name ? d.name + ', como' : 'Como'} você\nmede peso?`}
                {key === 'current' && 'Seu peso\natual'}
                {key === 'goaltype' && 'Para o que\nvocê treina?'}
                {key === 'height' && 'Qual é\nsua altura?'}
                {key === 'goal' && 'Qual é\nseu peso\nideal?'}
                {key === 'activity' && 'Quão ativo\nvocê é?'}
                {key === 'reminders' && 'Lembrete\ndiário de\npesagem?'}
              </OnbQuestion>

              {/* step content */}
              {key === 'name' && (
                <StyledInput
                  big
                  placeholder="Seu nome"
                  value={d.name}
                  onChangeText={(t) => set('name', t)}
                  onSubmitEditing={next}
                  returnKeyType="next"
                  autoFocus
                />
              )}

              {key === 'units' && (
                <>
                  <SegmentedControl
                    options={[
                      { value: 'kg', label: 'Quilogramas' },
                      { value: 'lb', label: 'Libras' },
                    ]}
                    value={u}
                    onChange={(nu) => {
                      if (nu === u) return;
                      const from = u as 'kg' | 'lb';
                      const to = nu as 'kg' | 'lb';
                      set('current', round1(convert(d.current, from, to)));
                      set('goal', round1(convert(d.goal, from, to)));
                      set('units', to);
                    }}
                  />
                  <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13.5, color: colors.ink3 }}>
                    Você pode alterar depois nas configurações.
                  </Text>
                </>
              )}

              {key === 'current' && (
                <Stepper
                  value={d.current}
                  step={u === 'kg' ? 0.1 : 0.2}
                  unit={u}
                  min={u === 'kg' ? 30 : 66}
                  max={u === 'kg' ? 250 : 550}
                  onChange={(v) => set('current', v)}
                />
              )}

              {key === 'goaltype' && (
                <>
                  <View style={{ gap: 10 }}>
                    {GOAL_TYPES.map((g) => (
                      <OptRow
                        key={g.value}
                        label={g.label}
                        note={g.note}
                        selected={d.goalType === g.value}
                        onPress={() => set('goalType', g.value)}
                      />
                    ))}
                  </View>
                  <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13.5, color: colors.ink3 }}>
                    Define o foco do seu dashboard. Pode alterar a qualquer hora.
                  </Text>
                </>
              )}

              {key === 'height' && (
                <>
                  {u === 'kg' ? (
                    <Stepper
                      value={d.heightCm}
                      step={1}
                      unit="cm"
                      min={120}
                      max={230}
                      onChange={(v) => set('heightCm', Math.round(v))}
                    />
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Stepper
                          value={cmToFtIn(d.heightCm).ft}
                          step={1}
                          unit="ft"
                          min={3}
                          max={7}
                          onChange={(v) => {
                            const { inch } = cmToFtIn(d.heightCm);
                            set('heightCm', Math.round((v * 12 + inch) * 2.54));
                          }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Stepper
                          value={cmToFtIn(d.heightCm).inch}
                          step={1}
                          unit="in"
                          min={0}
                          max={11}
                          onChange={(v) => {
                            const { ft } = cmToFtIn(d.heightCm);
                            set('heightCm', Math.round((ft * 12 + v) * 2.54));
                          }}
                        />
                      </View>
                    </View>
                  )}
                  <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13.5, color: colors.ink3 }}>
                    Usado para estimar seu IMC no dashboard.
                  </Text>
                </>
              )}

              {key === 'goal' && (
                <>
                  <Stepper
                    value={d.goal}
                    step={u === 'kg' ? 0.5 : 1}
                    unit={u}
                    min={u === 'kg' ? 30 : 66}
                    max={u === 'kg' ? 250 : 550}
                    onChange={(v) => set('goal', v)}
                  />
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
                      {goalDir === 'manter'
                        ? `Manter em ${round1(d.goal)}${u}.`
                        : <>São <Text style={{ fontFamily: 'HankenGrotesk_700Bold', color: colors.ink }}>{diff}{u}</Text> para {goalDir}. Vamos lá.</>}
                    </Text>
                  </View>
                </>
              )}

              {key === 'activity' && (
                <View style={{ gap: 10 }}>
                  {ACTIVITY.map((a) => (
                    <OptRow
                      key={a.value}
                      label={a.label}
                      note={a.note}
                      selected={d.activity === a.value}
                      onPress={() => set('activity', a.value)}
                    />
                  ))}
                </View>
              )}

              {key === 'reminders' && (
                <>
                  <ToggleCard
                    label="Lembrete matinal"
                    note="Um aviso gentil às 8h para registrar antes do café."
                    value={d.reminders}
                    onChange={(v) => set('reminders', v)}
                  />
                  <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13.5, color: colors.ink3 }}>
                    {d.reminders
                      ? 'Vamos te lembrar toda manhã.'
                      : 'Sem lembretes — registre quando quiser.'}
                  </Text>
                </>
              )}
            </Animated.View>
          </ScrollView>

          {/* footer */}
          <View style={{ paddingTop: 8 }}>
            <Btn kind="primary" full onPress={next} disabled={isNextDisabled}>
              {step === total - 1 ? 'Começar a rastrear →' : 'Continuar'}
            </Btn>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------- helpers ----------
function StepLabel({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        fontFamily: 'HankenGrotesk_700Bold',
        fontSize: 12,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: colors.ink3,
      }}
    >
      {children}
    </Text>
  );
}

function OnbQuestion({
  children,
  direction,
  colors,
}: {
  children: React.ReactNode;
  direction: string;
  colors: any;
}) {
  return (
    <Text
      style={{
        fontFamily: 'Archivo_900Black',
        fontSize: 42,
        lineHeight: 40,
        letterSpacing: direction === 'A' ? -0.5 : -1.5,
        textTransform: direction === 'A' ? 'uppercase' : 'none',
        color: colors.ink,
      }}
    >
      {children}
    </Text>
  );
}
