import React from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme';
import { Btn } from '@/components/shared/Btn';
import { Field, StyledInput } from '@/components/shared/Field';
import { round1, getApiError } from '@/lib/utils';
import { authClient, persistToken, refreshRememberMeToken } from '@/lib/auth';
import { api } from '@/api/client';
import { useAuthStore, type UserRole } from '@/store/auth.store';
import { OnboardingHeader, StepEyebrow, StepQuestion } from '@/components/onboarding/OnboardingChrome';
import {
  CurrentWeightStep,
  GoalTypeStep,
  HeightStep,
  GoalWeightStep,
  ActivityStep,
  RemindersStep,
  type GoalType,
  type ActivityLevel,
  type Unit,
} from '@/components/onboarding/ProfileSteps';

const STEPS = ['confirm', 'current', 'goaltype', 'height', 'goal', 'activity', 'reminders', 'password'] as const;

type FormData = {
  name: string;
  email: string;
  password: string;
  current: number;
  goalType: GoalType;
  heightCm: number;
  goal: number;
  activity: ActivityLevel;
  reminders: boolean;
};

function passwordOk(p: string) {
  return p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p);
}

export default function InvitedSignupScreen() {
  const { colors } = useTheme();
  const { setSession } = useAuthStore();
  const params = useLocalSearchParams<{
    token: string;
    name: string;
    email: string;
    units: string;
    coachName: string;
    programName: string;
  }>();

  const inviteToken = params.token ?? '';
  const unit = (params.units ?? 'kg') as Unit;
  const coachName = params.coachName ?? '';
  const programName = params.programName ?? '';

  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const [d, setD] = React.useState<FormData>({
    name: params.name ?? '',
    email: params.email ?? '',
    password: '',
    current: unit === 'lb' ? 165 : 75,
    goalType: 'lose',
    heightCm: 175,
    goal: unit === 'lb' ? 154 : 70,
    activity: 'light',
    reminders: true,
  });

  const set = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setD((s) => ({ ...s, [key]: val }));

  const total = STEPS.length;
  const key = STEPS[step];

  const isNextDisabled =
    (key === 'confirm' && (!d.name.trim() || !/.+@.+\..+/.test(d.email))) ||
    (key === 'password' && !passwordOk(d.password));

  async function next() {
    setError('');
    if (step < total - 1) setStep(step + 1);
    else await finish();
  }

  function back() {
    setError('');
    if (step > 0) setStep(step - 1);
    else router.back();
  }

  async function finish() {
    setLoading(true);
    setError('');
    try {
      const { data: signupData, error: signupErr } = await authClient.signUp.email({
        email: d.email.trim().toLowerCase(),
        password: d.password,
        name: d.name.trim(),
      });
      if (signupErr || !signupData) {
        setError(signupErr?.message ?? 'Erro ao criar conta. Tente novamente.');
        return;
      }
      const authToken = (signupData as any).session?.token ?? (signupData as any).token;
      if (authToken) await persistToken(authToken);

      await api.post('/invites/accept', { token: inviteToken });

      const targetKg = unit === 'lb' ? round1(d.goal * 0.453592) : round1(d.goal);
      const startKg = unit === 'lb' ? round1(d.current * 0.453592) : round1(d.current);

      await api.patch('/students/me', {
        name: d.name.trim(),
        units: unit,
        heightCm: d.heightCm,
        activityLevel: d.activity,
        reminders: d.reminders,
        startWeight: startKg,
      });

      await api.post('/goals', {
        targetWeight: targetKg,
        goalType: d.goalType === 'lose' ? 'LOSE' : d.goalType === 'strength' ? 'GAIN' : 'MAINTAIN',
      });

      const { data: sessionData } = await authClient.getSession();
      const u = (sessionData as any)?.user;
      const role: UserRole = 'STUDENT';
      setSession(u?.id ?? '', u?.email ?? d.email, role, { name: u?.name ?? d.name ?? null });
      await refreshRememberMeToken(true);

      router.replace('/(app)');
    } catch (e: any) {
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
  }

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
          {/* coach banner */}
          {coachName ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: colors.accent + '18',
                borderRadius: 8,
                paddingHorizontal: 14,
                paddingVertical: 8,
                marginBottom: 10,
              }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
              <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.accent, flex: 1 }}>
                Entrando no grupo de <Text style={{ fontFamily: 'HankenGrotesk_700Bold' }}>{coachName}</Text>
                {programName ? (
                  <Text style={{ fontFamily: 'HankenGrotesk_400Regular', color: colors.ink2 }}> · {programName}</Text>
                ) : null}
              </Text>
            </View>
          ) : null}

          <OnboardingHeader step={step} total={total} onBack={back} />

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingVertical: 20, gap: 22 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View key={step} entering={FadeInDown.duration(280).springify()} style={{ gap: 22 }}>
              {key === 'confirm' && (
                <>
                  <StepEyebrow>Confirme seus dados</StepEyebrow>
                  <StepQuestion>{'Seus\ndados'}</StepQuestion>
                  <View style={{ gap: 14 }}>
                    <Field label="Nome completo">
                      <StyledInput
                        value={d.name}
                        onChangeText={(t) => { set('name', t); setError(''); }}
                        placeholder="Seu nome"
                        autoCapitalize="words"
                        autoComplete="name"
                      />
                    </Field>
                    <Field label="E-mail">
                      <StyledInput
                        value={d.email}
                        onChangeText={(t) => { set('email', t); setError(''); }}
                        placeholder="voce@email.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                      />
                    </Field>
                  </View>
                </>
              )}

              {key === 'current' && <CurrentWeightStep value={d.current} unit={unit} onChange={(v) => set('current', v)} />}
              {key === 'goaltype' && <GoalTypeStep value={d.goalType} onChange={(v) => set('goalType', v)} />}
              {key === 'height' && <HeightStep heightCm={d.heightCm} unit={unit} onChange={(v) => set('heightCm', v)} />}
              {key === 'goal' && (
                <GoalWeightStep value={d.goal} unit={unit} current={d.current} goalType={d.goalType} onChange={(v) => set('goal', v)} />
              )}
              {key === 'activity' && <ActivityStep value={d.activity} onChange={(v) => set('activity', v)} />}
              {key === 'reminders' && <RemindersStep value={d.reminders} onChange={(v) => set('reminders', v)} />}

              {key === 'password' && (
                <>
                  <StepEyebrow>Crie sua senha</StepEyebrow>
                  <StepQuestion>{'Última\netapa'}</StepQuestion>
                  <View style={{ gap: 14 }}>
                    <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.ink2, lineHeight: 22 }}>
                      Crie uma senha para acessar sua conta no {coachName ? `grupo de ${coachName}` : 'ASCENTIO'}.
                    </Text>
                    <Field label="Senha">
                      <StyledInput
                        value={d.password}
                        onChangeText={(t) => { set('password', t); setError(''); }}
                        placeholder="••••••••"
                        secureTextEntry
                      />
                    </Field>
                    {d.password.length > 0 && (
                      <View style={{ gap: 4 }}>
                        {[
                          { ok: d.password.length >= 8, label: '8 ou mais caracteres' },
                          { ok: /[A-Z]/.test(d.password), label: 'Uma letra maiúscula' },
                          { ok: /[a-z]/.test(d.password), label: 'Uma letra minúscula' },
                          { ok: /[0-9]/.test(d.password), label: 'Um número' },
                        ].map((rule) => (
                          <Text
                            key={rule.label}
                            style={{
                              fontFamily: 'HankenGrotesk_600SemiBold',
                              fontSize: 12.5,
                              color: rule.ok ? colors.accent : colors.ink3,
                            }}
                          >
                            {rule.ok ? '✓' : '○'} {rule.label}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                </>
              )}

              {error !== '' && (
                <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13.5, color: '#e5484d' }}>
                  {error}
                </Text>
              )}
            </Animated.View>
          </ScrollView>

          <View style={{ paddingTop: 16 }}>
            <Btn kind="primary" full onPress={next} loading={loading} disabled={isNextDisabled || loading}>
              {step === total - 1 ? 'Criar minha conta' : 'Continuar'}
            </Btn>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
