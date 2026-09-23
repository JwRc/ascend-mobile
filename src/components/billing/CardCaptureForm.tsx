import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Field, StyledInput } from '@/components/shared/Field';
import { CreditCardVisual } from '@/components/shared/CreditCardVisual';
import { StripeCardWebView, type StripeCardWebViewRef } from '@/components/shared/StripeCardWebView';

// Extraído de app/(signup)/[role].tsx (passo "checkout") pra não duplicar essa
// UI uma terceira vez — a segunda cópia já existe em app/(billing)/add-card.tsx.

export interface CardCaptureFormRef {
  createPaymentMethod(): Promise<string>;
}

interface Props {
  cardholderName: string;
  onCardholderNameChange(v: string): void;
  cpf: string;
  onCpfChange(v: string): void;
  onReadyChange?(ready: boolean): void;
}

function formatCpf(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export const CardCaptureForm = forwardRef<CardCaptureFormRef, Props>(
  ({ cardholderName, onCardholderNameChange, cpf, onCpfChange, onReadyChange }, ref) => {
    const { colors, radius } = useTheme();
    const cardWebViewRef = useRef<StripeCardWebViewRef>(null);
    const [cardReady, setCardReady] = React.useState(false);
    const [cardBrand, setCardBrand] = React.useState('unknown');
    const [cvvFocused, setCvvFocused] = React.useState(false);

    React.useEffect(() => {
      const ready = cardReady && cardholderName.trim().length > 0 && cpf.replace(/\D/g, '').length >= 11;
      onReadyChange?.(ready);
    }, [cardReady, cardholderName, cpf, onReadyChange]);

    useImperativeHandle(ref, () => ({
      async createPaymentMethod() {
        return cardWebViewRef.current!.createPaymentMethod({ name: cardholderName.trim() });
      },
    }));

    return (
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
            onChangeText={onCardholderNameChange}
            placeholder="Como aparece no cartão"
            autoCapitalize="characters"
            autoComplete="name"
          />
        </Field>
        <Field label="CPF">
          <StyledInput
            value={cpf}
            onChangeText={(t) => onCpfChange(formatCpf(t))}
            placeholder="000.000.000-00"
            keyboardType="numeric"
          />
        </Field>
      </View>
    );
  },
);
