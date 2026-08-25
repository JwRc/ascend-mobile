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
import { Field, StyledInput } from '@/components/shared/Field';
import { StripeCardWebView, type StripeCardWebViewRef } from '@/components/shared/StripeCardWebView';
import { CreditCardVisual } from '@/components/shared/CreditCardVisual';
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
} from '@/components/onboarding/ProfileSteps';

type Role = 'coach' | 'standalone';

const STEPS_BY_ROLE: Record<Role, readonly string[]> = {
  coach:      ['account', 'checkout'],
  standalone: ['account', 'current', 'goaltype', 'height', 'goal', 'activity', 'reminders', 'checkout'],
};

type FormData = {
  name: string;
  email: string;
  phone: string;
  password: string;
  current: number;
  goalType: GoalType;
  heightCm: number;
  goal: number;
  activity: ActivityLevel;
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

export default function SignupScreen() {
  const { role: rawRole } = useLocalSearchParams<{ role: string }>();
  const role: Role = rawRole === 'coach' ? 'coach' : 'standalone';

  const { colors, radius } = useTheme();
  const { setSession } = useAuthStore();
  const { confirmSetupIntent } = useConfirmSetupIntent();
  const cardWebViewRef = React.useRef<StripeCardWebViewRef>(null);

  const STEPS = STEPS_BY_ROLE[role];
  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [cardReady, setCardReady] = React.useState(false);
  const [cardBrand, setCardBrand] = React.useState('unknown');
  const [cvvFocused, setCvvFocused] = React.useState(false);

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
      setSession(u?.id ?? '', u?.email ?? d.email, userRole, { name: u?.name ?? d.name ?? null });
      await refreshRememberMeToken(true);

      router.replace(role === 'coach' ? '/(coach)' : '/(app)');
    } catch (e: any) {
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
  }

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
          <OnboardingHeader step={step} total={total} onBack={back} />

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingVertical: 20, gap: 22 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View key={step} entering={FadeInDown.duration(280).springify()} style={{ gap: 22 }}>
              {key === 'account' && (
                <>
                  <StepEyebrow>Sua conta</StepEyebrow>
                  <StepQuestion>{'Crie\nsua conta'}</StepQuestion>
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

              {key === 'current' && <CurrentWeightStep value={d.current} unit="kg" onChange={(v) => set('current', v)} />}
              {key === 'goaltype' && <GoalTypeStep value={d.goalType} onChange={(v) => set('goalType', v)} />}
              {key === 'height' && <HeightStep heightCm={d.heightCm} unit="kg" onChange={(v) => set('heightCm', v)} />}
              {key === 'goal' && (
                <GoalWeightStep value={d.goal} unit="kg" current={d.current} goalType={d.goalType} onChange={(v) => set('goal', v)} />
              )}
              {key === 'activity' && <ActivityStep value={d.activity} onChange={(v) => set('activity', v)} />}
              {key === 'reminders' && <RemindersStep value={d.reminders} onChange={(v) => set('reminders', v)} />}

              {key === 'checkout' && (
                <>
                  <StepEyebrow>30 dias grátis</StepEyebrow>
                  <StepQuestion>{'Configure\nseu plano'}</StepQuestion>
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
                      <CreditCardVisual
                        colors={colors}
                        radius={radius.card / 2}
                        brand={cardBrand}
                        holderName={d.cardholderName}
                        cvvFocused={cvvFocused}
                      />
                      <StripeCardWebView
                        ref={cardWebViewRef}
                        publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''}
                        colors={colors}
                        radiusSm={radius.cardSm}
                        onComplete={setCardReady}
                        onBrandChange={setCardBrand}
                        onCvcFocusChange={setCvvFocused}
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
              {step === total - 1 ? 'Finalizar' : 'Continuar'}
            </Btn>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
