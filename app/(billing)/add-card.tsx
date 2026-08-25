import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useConfirmSetupIntent } from '@stripe/stripe-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/theme';
import { Btn } from '@/components/shared/Btn';
import { Field, StyledInput } from '@/components/shared/Field';
import { StripeCardWebView, type StripeCardWebViewRef } from '@/components/shared/StripeCardWebView';
import { CreditCardVisual } from '@/components/shared/CreditCardVisual';
import { useCreateSetupIntent, useCards, useSetDefaultCard } from '@/api/hooks/useBilling';
import { getApiError } from '@/lib/utils';

function formatCpf(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export default function AddCardScreen() {
  const { colors, radius } = useTheme();
  const { confirmSetupIntent } = useConfirmSetupIntent();
  const createIntent = useCreateSetupIntent();
  const setDefaultCard = useSetDefaultCard();
  const qc = useQueryClient();
  const cardWebViewRef = React.useRef<StripeCardWebViewRef>(null);

  const { data: existingCards } = useCards();
  const isFirstCard = !existingCards || existingCards.length === 0;

  const [cardReady, setCardReady] = React.useState(false);
  const [cardBrand, setCardBrand] = React.useState('unknown');
  const [cvvFocused, setCvvFocused] = React.useState(false);
  const [cardholderName, setCardholderName] = React.useState('');
  const [cpf, setCpf] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [makeDefault, setMakeDefault] = React.useState(false);

  const canSave = cardReady && cardholderName.trim().length > 1 && cpf.replace(/\D/g, '').length === 11;

  async function handleSave() {
    setLoading(true);
    setError('');
    try {
      const { clientSecret } = await createIntent.mutateAsync({
        setAsDefault: isFirstCard,
      });

      const paymentMethodId = await cardWebViewRef.current!.createPaymentMethod({
        name: cardholderName.trim(),
      });

      const { setupIntent, error: stripeErr } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: { paymentMethodId },
      });
      if (stripeErr) {
        setError(stripeErr.message ?? 'Erro ao salvar cartão.');
        return;
      }

      // Se o usuário marcou o toggle, define como padrão explicitamente
      if (makeDefault && !isFirstCard) {
        const pmId =
          typeof setupIntent?.paymentMethodId === 'string'
            ? setupIntent.paymentMethodId
            : null;
        if (pmId) {
          await setDefaultCard.mutateAsync(pmId);
        }
      }

      qc.invalidateQueries({ queryKey: ['billing', 'cards'] });
      router.back();
    } catch (e: any) {
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
  }

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
          gap: 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ paddingVertical: 6 }}>
            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink2 }}>
              ← Voltar
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 11.5, letterSpacing: 2, textTransform: 'uppercase', color: colors.ink3 }}>
            Pagamento
          </Text>
          <Text style={{ fontFamily: 'Archivo_900Black', fontSize: 30, color: colors.ink, letterSpacing: -0.5 }}>
            Adicionar cartão
          </Text>
        </View>

        <View style={{ gap: 14 }}>
          <CreditCardVisual
            colors={colors}
            radius={radius.card / 2}
            brand={cardBrand}
            holderName={cardholderName}
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
              value={cardholderName}
              onChangeText={setCardholderName}
              placeholder="Como aparece no cartão"
              autoCapitalize="characters"
              autoComplete="name"
            />
          </Field>
          <Field label="CPF">
            <StyledInput
              value={cpf}
              onChangeText={(t) => setCpf(formatCpf(t))}
              placeholder="000.000.000-00"
              keyboardType="numeric"
            />
          </Field>
        </View>

        {!isFirstCard && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.surface,
            borderRadius: radius.card / 2,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderWidth: 1,
            borderColor: colors.line,
          }}>
            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink }}>
              Definir como cartão padrão
            </Text>
            <Switch
              value={makeDefault}
              onValueChange={setMakeDefault}
              trackColor={{ false: colors.line, true: colors.accent }}
              thumbColor={colors.bg}
            />
          </View>
        )}

        {error !== '' && (
          <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13.5, color: '#e5484d' }}>
            {error}
          </Text>
        )}

        <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: colors.ink3, lineHeight: 18 }}>
          Cartão cadastrado com segurança via Stripe.
        </Text>

        <Btn
          kind="primary"
          full
          onPress={handleSave}
          loading={loading}
          disabled={!canSave || loading}
        >
          Salvar cartão
        </Btn>
      </ScrollView>
    </SafeAreaView>
  );
}
