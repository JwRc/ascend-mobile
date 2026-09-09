import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { Btn } from '@/components/shared/Btn';
import { SegmentedControl } from '@/components/shared/SegmentedControl';
import { StyledInput } from '@/components/shared/Field';
import { round1, convert, unitToKg } from '@/lib/utils';
import { useUpdateStudentProfile } from '@/api/hooks/useStudentProfile';
import { useSetGoal } from '@/api/hooks/useGoals';
import { OnboardingHeader, StepEyebrow, StepQuestion } from '@/components/onboarding/OnboardingChrome';
import {
  CurrentWeightStep,
  GoalTypeStep,
  HeightStep,
  GoalWeightStep,
  ActivityStep,
  RemindersStep,
  weightRange,
  type GoalType,
  type ActivityLevel,
  type Unit,
} from '@/components/onboarding/ProfileSteps';

const STEPS = ['name', 'units', 'current', 'goaltype', 'height', 'goal', 'activity', 'reminders'] as const;

type FormData = {
  name: string;
  units: Unit;
  current: number;
  heightCm: number;
  goalType: GoalType;
  goal: number;
  activity: ActivityLevel;
  reminders: boolean;
};

export default function OnboardingScreen() {
  const { colors } = useTheme();
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
  const u = d.units;

  function next() {
    if (step < total - 1) setStep(step + 1);
    else finish();
  }
  function back() {
    if (step > 0) setStep(step - 1);
  }

  async function finish() {
    const range = weightRange(u);
    await updateProfile.mutateAsync({
      name: d.name.trim() || 'Atleta',
      units: d.units,
      heightCm: d.heightCm,
      activityLevel: d.activity,
      reminders: d.reminders,
    });
    const goalType = d.goalType === 'lose' ? 'LOSE' : d.goalType === 'strength' ? 'GAIN' : 'MAINTAIN';
    // d.goal está na unidade escolhida pelo usuário — backend guarda a meta sempre em kg.
    const goalInUnit = round1(Math.min(range.max, Math.max(range.min, d.goal)));
    await setGoal.mutateAsync({ targetWeight: round1(unitToKg(goalInUnit, u)), goalType });
    router.replace('/(app)');
  }

  const isNextDisabled = key === 'name' && d.name.trim().length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
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
          <OnboardingHeader step={step} total={total} onBack={back} backHidden={step === 0} />

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingVertical: 20, gap: 22 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View key={step} entering={FadeInDown.duration(280).springify()} style={{ gap: 22 }}>
              {key === 'name' && (
                <>
                  <StepEyebrow>Vamos nos conhecer</StepEyebrow>
                  <StepQuestion>{'Como\ndevemos te\nchamar?'}</StepQuestion>
                  <StyledInput
                    big
                    placeholder="Seu nome"
                    value={d.name}
                    onChangeText={(t) => set('name', t)}
                    onSubmitEditing={next}
                    returnKeyType="next"
                    autoFocus
                  />
                </>
              )}

              {key === 'units' && (
                <>
                  <StepEyebrow>Suas unidades</StepEyebrow>
                  <StepQuestion>{`${d.name ? d.name + ', como' : 'Como'} você\nmede peso?`}</StepQuestion>
                  <SegmentedControl
                    options={[
                      { value: 'kg', label: 'Quilogramas' },
                      { value: 'lb', label: 'Libras' },
                    ]}
                    value={u}
                    onChange={(nu) => {
                      if (nu === u) return;
                      const from = u;
                      const to = nu as Unit;
                      set('current', round1(convert(d.current, from, to)));
                      set('goal', round1(convert(d.goal, from, to)));
                      set('units', to);
                    }}
                  />
                </>
              )}

              {key === 'current' && <CurrentWeightStep value={d.current} unit={u} onChange={(v) => set('current', v)} />}
              {key === 'goaltype' && <GoalTypeStep value={d.goalType} onChange={(v) => set('goalType', v)} />}
              {key === 'height' && <HeightStep heightCm={d.heightCm} unit={u} onChange={(v) => set('heightCm', v)} />}
              {key === 'goal' && (
                <GoalWeightStep value={d.goal} unit={u} current={d.current} goalType={d.goalType} onChange={(v) => set('goal', v)} />
              )}
              {key === 'activity' && <ActivityStep value={d.activity} onChange={(v) => set('activity', v)} />}
              {key === 'reminders' && <RemindersStep value={d.reminders} onChange={(v) => set('reminders', v)} />}
            </Animated.View>
          </ScrollView>

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
