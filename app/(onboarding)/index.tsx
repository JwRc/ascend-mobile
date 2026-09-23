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
import { useConfirmSetupIntent } from '@stripe/stripe-react-native';
import { useTheme } from '@/theme';
import { Btn } from '@/components/shared/Btn';
import { SegmentedControl } from '@/components/shared/SegmentedControl';
import { StyledInput, Field } from '@/components/shared/Field';
import { round1, convert, unitToKg, getApiError } from '@/lib/utils';
import { api } from '@/api/client';
import { generateSlug } from '@/lib/slug';
import { authClient, refreshRememberMeToken } from '@/lib/auth';
import { useAuthStore } from '@/store/auth.store';
import { resolveOnboardingKind, type OnboardingKind } from '@/lib/onboarding';
import { useUpdateStudentProfile } from '@/api/hooks/useStudentProfile';
import { useSetGoal } from '@/api/hooks/useGoals';
import { useCreateSetupIntent, usePrices } from '@/api/hooks/useBilling';
import { useCompleteOnboarding } from '@/api/hooks/useOnboarding';
import { CardCaptureForm, type CardCaptureFormRef } from '@/components/billing/CardCaptureForm';
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

const STEPS_BY_KIND: Record<Exclude<OnboardingKind, 'choose'>, readonly string[]> = {
  standalone: ['units', 'current', 'goaltype', 'height', 'goal', 'activity', 'reminders', 'checkout'],
  'linked-student': ['units', 'current', 'goaltype', 'height', 'goal', 'activity', 'reminders'],
  coach: ['studio', 'checkout'],
};

const GOAL_TYPE_MAP: Record<GoalType, 'LOSE' | 'GAIN' | 'MAINTAIN'> = {
  lose: 'LOSE',
  strength: 'GAIN',
  maintain: 'MAINTAIN',
};

type FormData = {
  name: string;
  studioName: string;
  units: Unit;
  current: number;
  heightCm: number;
  goalType: GoalType;
  goal: number;
  activity: ActivityLevel;
  reminders: boolean;
  cardholderName: string;
  cpf: string;
};

export default function OnboardingScreen() {
  const { colors, radius } = useTheme();
  const { role, tenantId, userPlan, onboardingCompleted, name: authName, setSession, userId, email } = useAuthStore();
  const gate = { role, tenantId, userPlan, onboardingCompleted };

  const [kind, setKind] = React.useState<OnboardingKind>(() => resolveOnboardingKind(gate));
  const needsNameStep = !authName;

  const updateProfile = useUpdateStudentProfile();
  const setGoal = useSetGoal();
  const createSetupIntent = useCreateSetupIntent();
  const completeOnboarding = useCompleteOnboarding();
  const { confirmSetupIntent } = useConfirmSetupIntent();
  const { data: prices } = usePrices();
  const cardRef = React.useRef<CardCaptureFormRef>(null);

  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [cardReady, setCardReady] = React.useState(false);
  const [d, setD] = React.useState<FormData>({
    name: '',
    studioName: authName ?? '',
    units: 'kg',
    current: 75,
    heightCm: 175,
    goalType: 'lose',
    goal: 70,
    activity: 'light',
    reminders: true,
    cardholderName: '',
    cpf: '',
  });

  const set = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setD((s) => ({ ...s, [key]: val }));

  // Reentrada após interrupção (app fechado no passo de cartão): se o tenant do
  // coach já foi criado numa tentativa anterior, pula direto pro checkout — repetir
  // POST /tenants falharia (usuário já é COACH).
  const coachTenantAlreadyCreated = kind === 'coach' && tenantId != null;

  const STEPS = React.useMemo<readonly string[]>(() => {
    if (kind === 'choose') return ['plan'];
    const base = coachTenantAlreadyCreated ? ['checkout'] : STEPS_BY_KIND[kind];
    return needsNameStep ? ['name', ...base] : base;
  }, [kind, needsNameStep, coachTenantAlreadyCreated]);

  const total = STEPS.length;
  const key = STEPS[step];
  const u = d.units;

  function next() {
    setError('');
    if (step < total - 1) setStep(step + 1);
    else void finish();
  }

  function back() {
    setError('');
    if (step > 0) setStep(step - 1);
  }

  function choosePlan(chosen: 'standalone' | 'coach') {
    setKind(chosen);
    setStep(0);
  }

  async function runCheckoutAndComplete() {
    const { clientSecret } = await createSetupIntent.mutateAsync({});
    const paymentMethodId = await cardRef.current!.createPaymentMethod();
    const { error: stripeErr, setupIntent } = await confirmSetupIntent(clientSecret, {
      paymentMethodType: 'Card',
      paymentMethodData: { paymentMethodId },
    });
    if (stripeErr) {
      setError(stripeErr.message ?? 'Erro ao configurar pagamento.');
      return false;
    }
    await completeOnboarding.mutateAsync({ setupIntentId: setupIntent?.id });
    return true;
  }

  async function finishStandalone() {
    const range = weightRange(u);
    await api.post('/users/me/activate-standalone', {
      startWeight: round1(unitToKg(d.current, u)),
      heightCm: d.heightCm,
      activityLevel: d.activity,
      units: d.units,
      reminders: d.reminders,
    });
    const goalInUnit = round1(Math.min(range.max, Math.max(range.min, d.goal)));
    await setGoal.mutateAsync({
      targetWeight: round1(unitToKg(goalInUnit, u)),
      goalType: GOAL_TYPE_MAP[d.goalType],
    });
    return runCheckoutAndComplete();
  }

  async function finishLinkedStudent() {
    const range = weightRange(u);
    await updateProfile.mutateAsync({
      name: needsNameStep ? d.name.trim() || 'Atleta' : undefined,
      units: d.units,
      heightCm: d.heightCm,
      activityLevel: d.activity,
      reminders: d.reminders,
      startWeight: round1(unitToKg(d.current, u)),
    });
    const goalInUnit = round1(Math.min(range.max, Math.max(range.min, d.goal)));
    await setGoal.mutateAsync({
      targetWeight: round1(unitToKg(goalInUnit, u)),
      goalType: GOAL_TYPE_MAP[d.goalType],
    });
    await completeOnboarding.mutateAsync({});
    return true;
  }

  async function finishCoach() {
    if (!coachTenantAlreadyCreated) {
      const studioName = d.studioName.trim() || authName || 'Meu Studio';
      await api.post('/tenants', { name: studioName, slug: generateSlug(studioName) });
    }
    return runCheckoutAndComplete();
  }

  async function finish() {
    setLoading(true);
    setError('');
    try {
      const ok =
        kind === 'coach'
          ? await finishCoach()
          : kind === 'standalone'
            ? await finishStandalone()
            : await finishLinkedStudent();
      if (!ok) return;

      // Rebusca a sessão em vez de montar os campos na mão — pega tenantId/role
      // já atualizados no backend (POST /tenants, activate-standalone) em vez de
      // arriscar valores stale do store local.
      const { data: sessionData } = await authClient.getSession();
      const u2 = (sessionData as any)?.user;
      const freshRole = u2?.role === 'COACH' ? 'COACH' : 'STUDENT';
      setSession(u2?.id ?? userId ?? '', u2?.email ?? email ?? '', freshRole, {
        name: u2?.name ?? authName ?? null,
        tenantId: u2?.tenantId ?? null,
        userPlan: u2?.userPlan ?? null,
        onboardingCompleted: true,
      });
      await refreshRememberMeToken(true);
      router.replace(freshRole === 'COACH' ? '/(coach)' : '/(app)');
    } catch (e: any) {
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
  }

  const isNextDisabled =
    (key === 'name' && d.name.trim().length === 0) ||
    (key === 'studio' && d.studioName.trim().length === 0) ||
    (key === 'checkout' && (!cardReady || !d.cardholderName.trim() || d.cpf.replace(/\D/g, '').length < 11));

  if (kind === 'choose') {
    const standalonePrice = prices?.standalone
      ? `R$ ${prices.standalone.price.toFixed(2).replace('.', ',')}`
      : 'R$ —';
    const coachPrice = prices?.coach
      ? `R$ ${prices.coach.basePrice.toFixed(2).replace('.', ',')}`
      : 'R$ —';

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView
          contentContainerStyle={{
            maxWidth: 480,
            width: '100%',
            alignSelf: 'center',
            paddingHorizontal: 26,
            paddingTop: 24,
            paddingBottom: 40,
            gap: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: 6 }}>
            <StepEyebrow>Quase lá</StepEyebrow>
            <StepQuestion>{'Como você\nvai usar o\nASCENTIO?'}</StepQuestion>
          </View>

          {(['standalone', 'coach'] as const).map((opt) => (
            <TouchableOpacity
              key={opt}
              onPress={() => choosePlan(opt)}
              activeOpacity={0.85}
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1.5,
                borderColor: colors.line,
                borderRadius: radius.card,
                padding: 22,
                gap: 10,
              }}
            >
              <Text style={{ fontFamily: 'Archivo_900Black', fontSize: 20, color: colors.ink }}>
                {opt === 'standalone' ? 'Individual' : 'Coach'}
              </Text>
              <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.ink2 }}>
                {opt === 'standalone'
                  ? 'Acompanhe seu próprio progresso de peso e força.'
                  : 'Gerencie seus alunos, treinos e progresso num só lugar.'}
              </Text>
              <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: colors.accent }}>
                {opt === 'standalone' ? standalonePrice : coachPrice}/mês · 30 dias grátis
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
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

              {key === 'studio' && (
                <>
                  <StepEyebrow>Seu studio</StepEyebrow>
                  <StepQuestion>{'Como se\nchama seu\nstudio?'}</StepQuestion>
                  <Field label="Nome do studio">
                    <StyledInput
                      value={d.studioName}
                      onChangeText={(t) => set('studioName', t)}
                      placeholder="Nome do studio"
                      autoCapitalize="words"
                    />
                  </Field>
                </>
              )}

              {key === 'units' && (
                <>
                  <StepEyebrow>Suas unidades</StepEyebrow>
                  <StepQuestion>{'Como você\nmede peso?'}</StepQuestion>
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

              {key === 'checkout' && (
                <>
                  <StepEyebrow>30 dias grátis</StepEyebrow>
                  <StepQuestion>{'Configure\nseu plano'}</StepQuestion>
                  <View
                    style={{
                      backgroundColor: colors.accent + '18',
                      borderRadius: radius.card / 2,
                      padding: 14,
                      flexDirection: 'row',
                      gap: 10,
                      alignItems: 'center',
                      marginBottom: 6,
                    }}
                  >
                    <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 20 }}>🎁</Text>
                    <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, color: colors.accent, flex: 1 }}>
                      30 dias grátis — você não será cobrado agora.
                    </Text>
                  </View>
                  <CardCaptureForm
                    ref={cardRef}
                    cardholderName={d.cardholderName}
                    onCardholderNameChange={(t) => set('cardholderName', t)}
                    cpf={d.cpf}
                    onCpfChange={(t) => set('cpf', t)}
                    onReadyChange={setCardReady}
                  />
                  <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: colors.ink3, textAlign: 'center', lineHeight: 18 }}>
                    Cartão cadastrado com segurança via Stripe.
                  </Text>
                </>
              )}

              {error !== '' && (
                <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13.5, color: '#e5484d' }}>
                  {error}
                </Text>
              )}
            </Animated.View>
          </ScrollView>

          <View style={{ paddingTop: 8 }}>
            <Btn kind="primary" full onPress={next} loading={loading} disabled={isNextDisabled || loading}>
              {step === total - 1 ? 'Concluir' : 'Continuar'}
            </Btn>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
