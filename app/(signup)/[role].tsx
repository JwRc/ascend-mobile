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
import { useConfirmSetupIntent } from '@stripe/stripe-react-native';
import { useTheme } from '@/theme';
import { Btn } from '@/components/shared/Btn';
import { Stepper } from '@/components/shared/Stepper';
import { OptRow } from '@/components/shared/OptRow';
import { ToggleCard } from '@/components/shared/ToggleCard';
import { Field, StyledInput } from '@/components/shared/Field';
import { StripeCardWebView, type StripeCardWebViewRef } from '@/components/shared/StripeCardWebView';
import { round1, getApiError } from '@/lib/utils';
import { authClient, persistToken, persistRememberMeToken } from '@/lib/auth';
import { api } from '@/api/client';
import { useAuthStore, type UserRole } from '@/store/auth.store';

type Role = 'coach' | 'standalone';

const STEPS_BY_ROLE: Record<Role, readonly string[]> = {
  coach:      ['account', 'checkout'],
  standalone: ['account', 'current', 'goaltype', 'height', 'goal', 'activity', 'reminders', 'checkout'],
};

const GOAL_TYPES = [
  { value: 'lose',     label: 'Perder peso',  note: 'Chegar a um peso alvo' },
  { value: 'strength', label: 'Ganhar força',  note: 'Evoluir nos treinos' },
  { value: 'maintain', label: 'Manter',        note: 'Manter consistência' },
] as const;

const ACTIVITY = [
  { value: 'sed',   label: 'Sedentário', note: 'Trabalho de mesa, pouco exercício' },
  { value: 'light', label: 'Leve',       note: '1–3 treinos por semana' },
  { value: 'mod',   label: 'Ativo',      note: '4–5 treinos por semana' },
  { value: 'high',  label: 'Atleta',     note: 'Treino diário' },
] as const;

type FormData = {
  name: string;
  email: string;
  phone: string;
  password: string;
  current: number;
  goalType: 'lose' | 'strength' | 'maintain';
  heightCm: number;
  goal: number;
  activity: 'sed' | 'light' | 'mod' | 'high';
  reminders: boolean;
  billingPeriod: 'monthly' | 'annual';
  cardholderName: string;
  cpf: string;
};

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}

function formatCpf(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 28);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

function passwordOk(p: string) {
  return p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p);
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

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

async function fetchRememberMeToken() {
  try {
    const res = await fetch(`${API_URL}/remember-me`, { method: 'POST' });
    if (res.ok) {
      const { token } = await res.json();
      if (token) await persistRememberMeToken(token);
    }
  } catch { }
}

export default function SignupScreen() {
  const { role: rawRole } = useLocalSearchParams<{ role: string }>();
  const role: Role = rawRole === 'coach' ? 'coach' : 'standalone';

  const { colors, direction, radius } = useTheme();
  const { setSession } = useAuthStore();
  const { confirmSetupIntent } = useConfirmSetupIntent();
  const cardWebViewRef = React.useRef<StripeCardWebViewRef>(null);

  const STEPS = STEPS_BY_ROLE[role];
  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [cardReady, setCardReady] = React.useState(false);

  const [d, setD] = React.useState<FormData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    current: 75,
    goalType: 'lose',
    heightCm: 175,
    goal: 70,
    activity: 'light',
    reminders: true,
    billingPeriod: 'monthly',
    cardholderName: '',
    cpf: '',
  });

  const set = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setD((s) => ({ ...s, [key]: val }));

  const total = STEPS.length;
  const key = STEPS[step];

  async function next() {
    setError('');
    if (key === 'account') {
      if (!d.name.trim()) { setError('Informe seu nome.'); return; }
      if (!/.+@.+\..+/.test(d.email)) { setError('Informe um e-mail válido.'); return; }
      if (!passwordOk(d.password)) { setError('A senha deve ter 8+ caracteres, maiúscula, minúscula e número.'); return; }
    }
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
      const token = (signupData as any).session?.token ?? (signupData as any).token;
      if (token) await persistToken(token);

      if (role === 'coach') {
        await api.post('/tenants', { name: d.name.trim(), slug: generateSlug(d.name.trim()) });
      } else {
        await api.post('/users/me/activate-standalone', {
          startWeight: round1(d.current),
          heightCm: d.heightCm,
          activityLevel: d.activity,
          units: 'kg',
          reminders: d.reminders,
        });
        const GOAL_TYPE_MAP: Record<string, string> = {
          lose: 'LOSE',
          strength: 'GAIN',
          maintain: 'MAINTAIN',
        };
        await api.post('/goals', {
          targetWeight: round1(d.goal),
          goalType: GOAL_TYPE_MAP[d.goalType],
        });
      }

      const intentRes = await api.post<{ clientSecret: string }>('/billing/setup-intent', {
        period: d.billingPeriod,
      });
      const clientSecret = intentRes.data.clientSecret;

      const paymentMethodId = await cardWebViewRef.current!.createPaymentMethod({
        name: d.cardholderName.trim(),
      });

      const { error: stripeErr } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: { paymentMethodId },
      });
      if (stripeErr) {
        setError(stripeErr.message ?? 'Erro ao configurar pagamento.');
        return;
      }

      const { data: sessionData } = await authClient.getSession();
      const u = (sessionData as any)?.user;
      const userRole: UserRole = role === 'coach' ? 'COACH' : 'STUDENT';
      setSession(u?.id ?? '', u?.email ?? d.email, userRole);
      await fetchRememberMeToken();

      router.replace(role === 'coach' ? '/(coach)' : '/(app)');
    } catch (e: any) {
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
  }

  const diff = round1(Math.abs(d.current - d.goal));
  const goalDir = d.goal < d.current ? 'perder' : d.goal > d.current ? 'ganhar' : 'manter';

  const cmToFtIn = (cm: number) => {
    const inch = cm / 2.54;
    return { ft: Math.floor(inch / 12), inch: Math.round(inch % 12) };
  };

  const isNextDisabled =
    (key === 'account' && (!d.name.trim() || !d.email.trim() || !d.password)) ||
    (key === 'checkout' && (!cardReady || !d.cardholderName.trim() || d.cpf.replace(/\D/g, '').length < 11));

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 30);
  const trialEndStr = trialEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

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
          {/* header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 8 }}>
            <TouchableOpacity onPress={back} style={{ paddingVertical: 6 }}>
              <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14.5, color: colors.ink2 }}>
                ← Voltar
              </Text>
            </TouchableOpacity>
            <View style={{ flex: 1, flexDirection: 'row', gap: 5 }}>
              {STEPS.map((_, i) => (
                <View key={i} style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: i <= step ? colors.accent : colors.line2 }} />
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

              {key === 'account'   && <StepLabel>Sua conta</StepLabel>}
              {key === 'current'   && <StepLabel>Onde você está agora</StepLabel>}
              {key === 'goaltype'  && <StepLabel>Seu objetivo principal</StepLabel>}
              {key === 'height'    && <StepLabel>Um pouco sobre você</StepLabel>}
              {key === 'goal'      && <StepLabel>Sua meta</StepLabel>}
              {key === 'activity'  && <StepLabel>Seu nível de atividade</StepLabel>}
              {key === 'reminders' && <StepLabel>Consistência</StepLabel>}
              {key === 'checkout'  && <StepLabel>30 dias grátis</StepLabel>}

              <OnbQuestion direction={direction} colors={colors}>
                {key === 'account'   && 'Crie\nsua conta'}
                {key === 'current'   && 'Seu peso\natual'}
                {key === 'goaltype'  && 'Para o que\nvocê treina?'}
                {key === 'height'    && 'Qual é\nsua altura?'}
                {key === 'goal'      && 'Sua meta\nde peso'}
                {key === 'activity'  && 'Seu nível\nde atividade'}
                {key === 'reminders' && 'Lembrete\ndiário'}
                {key === 'checkout'  && 'Configure\nseu plano'}
              </OnbQuestion>

              {key === 'account' && (
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
                  <Field label="Telefone (opcional)">
                    <StyledInput
                      value={d.phone}
                      onChangeText={(t) => set('phone', formatPhone(t))}
                      placeholder="(11) 91234-5678"
                      keyboardType="phone-pad"
                    />
                  </Field>
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
                        { ok: d.password.length >= 8,      label: '8 ou mais caracteres' },
                        { ok: /[A-Z]/.test(d.password),    label: 'Uma letra maiúscula' },
                        { ok: /[a-z]/.test(d.password),    label: 'Uma letra minúscula' },
                        { ok: /[0-9]/.test(d.password),    label: 'Um número' },
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

              {key === 'current' && (
                <Stepper
                  value={d.current}
                  onChange={(v) => set('current', v)}
                  min={30}
                  max={250}
                  step={0.5}
                  unit="kg"
                />
              )}

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

              {key === 'height' && (
                <View style={{ gap: 14 }}>
                  <Stepper
                    value={d.heightCm}
                    onChange={(v) => set('heightCm', v)}
                    min={120}
                    max={230}
                    step={1}
                    unit="cm"
                  />
                  <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13.5, color: colors.ink3, textAlign: 'center' }}>
                    {(() => { const { ft, inch } = cmToFtIn(d.heightCm); return `${ft}'${inch}"`; })()}
                  </Text>
                </View>
              )}

              {key === 'goal' && (
                <View style={{ gap: 14 }}>
                  <Stepper
                    value={d.goal}
                    onChange={(v) => set('goal', v)}
                    min={30}
                    max={250}
                    step={0.5}
                    unit="kg"
                  />
                  {d.goalType !== 'strength' && (
                    <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink2, textAlign: 'center' }}>
                      {diff} kg para {goalDir}
                    </Text>
                  )}
                </View>
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
                <ToggleCard
                  label="Lembrete diário de peso"
                  note="Receba uma notificação para registrar seu peso"
                  value={d.reminders}
                  onChange={(v) => set('reminders', v)}
                />
              )}

              {key === 'checkout' && (
                <View style={{ gap: 20 }}>
                  <View
                    style={{
                      backgroundColor: colors.accent + '18',
                      borderRadius: radius.card / 2,
                      padding: 14,
                      flexDirection: 'row',
                      gap: 10,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 20 }}>🎁</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, color: colors.accent }}>
                        30 dias grátis
                      </Text>
                      <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: colors.ink2 }}>
                        Primeira cobrança em {trialEndStr}
                      </Text>
                    </View>
                  </View>

                  <View style={{ gap: 8 }}>
                    <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink3 }}>
                      Período de cobrança
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {(['monthly', 'annual'] as const).map((p) => (
                        <TouchableOpacity
                          key={p}
                          onPress={() => set('billingPeriod', p)}
                          style={{
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: radius.card / 2,
                            borderWidth: 1.5,
                            borderColor: d.billingPeriod === p ? colors.accent : colors.line,
                            backgroundColor: d.billingPeriod === p ? colors.accent + '12' : colors.surface,
                            alignItems: 'center',
                            gap: 2,
                          }}
                        >
                          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, color: d.billingPeriod === p ? colors.accent : colors.ink }}>
                            {p === 'monthly' ? 'Mensal' : 'Anual'}
                          </Text>
                          {p === 'annual' && (
                            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 11, color: colors.accent }}>
                              20% de desconto
                            </Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={{ gap: 14 }}>
                    <StripeCardWebView
                      ref={cardWebViewRef}
                      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''}
                      colors={colors}
                      radiusSm={radius.cardSm}
                      onComplete={setCardReady}
                    />
                    <Field label="Nome no cartão">
                      <StyledInput
                        value={d.cardholderName}
                        onChangeText={(t) => { set('cardholderName', t); setError(''); }}
                        placeholder="Como aparece no cartão"
                        autoCapitalize="characters"
                        autoComplete="name"
                      />
                    </Field>
                    <Field label="CPF">
                      <StyledInput
                        value={d.cpf}
                        onChangeText={(t) => set('cpf', formatCpf(t))}
                        placeholder="000.000.000-00"
                        keyboardType="numeric"
                      />
                    </Field>
                  </View>

                  <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: colors.ink3, textAlign: 'center', lineHeight: 18 }}>
                    Cartão cadastrado com segurança via Stripe. Você não será cobrado durante o período de teste.
                  </Text>
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
              {step === total - 1 ? 'Finalizar' : 'Continuar'}
            </Btn>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
