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
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme';
import { Btn } from '@/components/shared/Btn';
import { Stepper } from '@/components/shared/Stepper';
import { OptRow } from '@/components/shared/OptRow';
import { ToggleCard } from '@/components/shared/ToggleCard';
import { Field, StyledInput } from '@/components/shared/Field';
import { round1, getApiError } from '@/lib/utils';
import { authClient, persistToken, persistRememberMeToken } from '@/lib/auth';
import { api } from '@/api/client';
import { useAuthStore, type UserRole } from '@/store/auth.store';

const STEPS = ['confirm', 'current', 'goaltype', 'height', 'goal', 'activity', 'reminders', 'password'] as const;
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
  email: string;
  password: string;
  current: number;
  goalType: 'lose' | 'strength' | 'maintain';
  heightCm: number;
  goal: number;
  activity: 'sed' | 'light' | 'mod' | 'high';
  reminders: boolean;
};

function passwordOk(p: string) {
  return p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p);
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

async function fetchRememberMeToken() {
  try {
    const res = await fetch(`${API_URL}/remember-me`, { method: 'POST' });
    if (res.ok) {
      const { token } = await res.json();
      if (token) await persistRememberMeToken(token);
    }
  } catch {}
}

export default function InvitedSignupScreen() {
  const { colors, direction, radius } = useTheme();
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
  const inviteUnits = (params.units ?? 'kg') as 'kg' | 'lb';
  const coachName = params.coachName ?? '';
  const programName = params.programName ?? '';

  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const [d, setD] = React.useState<FormData>({
    name: params.name ?? '',
    email: params.email ?? '',
    password: '',
    current: inviteUnits === 'lb' ? 165 : 75,
    goalType: 'lose',
    heightCm: 175,
    goal: inviteUnits === 'lb' ? 154 : 70,
    activity: 'light',
    reminders: true,
  });

  const set = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setD((s) => ({ ...s, [key]: val }));

  const total = STEPS.length;
  const key = STEPS[step];

  const unit = inviteUnits;
  const diff = round1(Math.abs(d.current - d.goal));
  const goalDir = d.goal < d.current ? 'perder' : d.goal > d.current ? 'ganhar' : 'manter';

  const cmToFtIn = (cm: number) => {
    const inch = cm / 2.54;
    return { ft: Math.floor(inch / 12), inch: Math.round(inch % 12) };
  };

  const isNextDisabled =
    (key === 'confirm' && (!d.name.trim() || !/.+@.+\..+/.test(d.email))) ||
    (key === 'password' && !passwordOk(d.password));

  async function next() {
    setError('');
    if (step < total - 1) {
      setStep(step + 1);
    } else {
      await finish();
    }
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

      const targetKg =
        unit === 'lb' ? round1(d.goal * 0.453592) : round1(d.goal);
      const startKg =
        unit === 'lb' ? round1(d.current * 0.453592) : round1(d.current);

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
      setSession(u?.id ?? '', u?.email ?? d.email, role);
      await fetchRememberMeToken();

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
                  <Text style={{ fontFamily: 'HankenGrotesk_400Regular', color: colors.ink2 }}>
                    {' '}· {programName}
                  </Text>
                ) : null}
              </Text>
            </View>
          ) : null}

          {/* header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 8 }}>
            <TouchableOpacity onPress={back} style={{ paddingVertical: 6 }}>
              <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14.5, color: colors.ink2 }}>
                ← Voltar
              </Text>
            </TouchableOpacity>
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
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12, letterSpacing: 0.6, color: colors.ink3 }}>
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
              {key === 'confirm' && <StepLabel>Confirme seus dados</StepLabel>}
              {key === 'current' && <StepLabel>Onde você está agora</StepLabel>}
              {key === 'goaltype' && <StepLabel>Seu objetivo principal</StepLabel>}
              {key === 'height' && <StepLabel>Um pouco sobre você</StepLabel>}
              {key === 'goal' && <StepLabel>Sua meta</StepLabel>}
              {key === 'activity' && <StepLabel>Seu nível de atividade</StepLabel>}
              {key === 'reminders' && <StepLabel>Consistência</StepLabel>}
              {key === 'password' && <StepLabel>Crie sua senha</StepLabel>}

              {/* question */}
              <OnbQuestion direction={direction} colors={colors}>
                {key === 'confirm' && 'Seus\ndados'}
                {key === 'current' && 'Seu peso\natual'}
                {key === 'goaltype' && 'Para o que\nvocê treina?'}
                {key === 'height' && 'Qual é\nsua altura?'}
                {key === 'goal' && 'Sua meta\nde peso'}
                {key === 'activity' && 'Seu nível\nde atividade'}
                {key === 'reminders' && 'Lembrete\ndiário'}
                {key === 'password' && 'Última\netapa'}
              </OnbQuestion>

              {/* confirm step */}
              {key === 'confirm' && (
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
              )}

              {/* current weight */}
              {key === 'current' && (
                <Stepper
                  value={d.current}
                  onChange={(v) => set('current', v)}
                  min={unit === 'lb' ? 66 : 30}
                  max={unit === 'lb' ? 550 : 250}
                  step={unit === 'lb' ? 0.5 : 0.5}
                  unit={unit}
                />
              )}

              {/* goal type */}
              {key === 'goaltype' && (
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
              )}

              {/* height */}
              {key === 'height' && (
                <View style={{ gap: 14 }}>
                  {unit === 'kg' ? (
                    <Stepper
                      value={d.heightCm}
                      onChange={(v) => set('heightCm', Math.round(v))}
                      min={120}
                      max={230}
                      step={1}
                      unit="cm"
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
                  <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13.5, color: colors.ink3, textAlign: 'center' }}>
                    {unit === 'kg'
                      ? (() => { const { ft, inch } = cmToFtIn(d.heightCm); return `${ft}'${inch}"`; })()
                      : `${d.heightCm} cm`}
                  </Text>
                </View>
              )}

              {/* goal weight */}
              {key === 'goal' && (
                <View style={{ gap: 14 }}>
                  <Stepper
                    value={d.goal}
                    onChange={(v) => set('goal', v)}
                    min={unit === 'lb' ? 66 : 30}
                    max={unit === 'lb' ? 550 : 250}
                    step={unit === 'lb' ? 0.5 : 0.5}
                    unit={unit}
                  />
                  {d.goalType !== 'strength' && (
                    <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink2, textAlign: 'center' }}>
                      {diff} {unit} para {goalDir}
                    </Text>
                  )}
                </View>
              )}

              {/* activity */}
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

              {/* reminders */}
              {key === 'reminders' && (
                <ToggleCard
                  label="Lembrete diário de peso"
                  note="Receba uma notificação para registrar seu peso"
                  value={d.reminders}
                  onChange={(v) => set('reminders', v)}
                />
              )}

              {/* password */}
              {key === 'password' && (
                <View style={{ gap: 14 }}>
                  <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.ink2, lineHeight: 22 }}>
                    Crie uma senha para acessar sua conta no {coachName ? `grupo de ${coachName}` : 'Ascend'}.
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
              )}

              {error !== '' && (
                <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13.5, color: '#e5484d' }}>
                  {error}
                </Text>
              )}
            </Animated.View>
          </ScrollView>

          {/* footer */}
          <View style={{ paddingTop: 16 }}>
            <Btn
              kind="primary"
              full
              onPress={next}
              loading={loading}
              disabled={isNextDisabled || loading}
            >
              {step === total - 1 ? 'Criar minha conta' : 'Continuar'}
            </Btn>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StepLabel({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 11.5, letterSpacing: 2, textTransform: 'uppercase', color: colors.ink3 }}>
      {children}
    </Text>
  );
}

function OnbQuestion({ children, colors, direction }: { children: React.ReactNode; colors: any; direction: string }) {
  return (
    <Text style={{ fontFamily: 'Archivo_900Black', fontSize: 36, lineHeight: 38, letterSpacing: direction === 'A' ? -0.5 : -1.5, textTransform: direction === 'A' ? 'uppercase' : 'none', color: colors.ink }}>
      {children}
    </Text>
  );
}
