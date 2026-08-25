import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';

export function StepEyebrow({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        fontFamily: 'HankenGrotesk_700Bold',
        fontSize: 11.5,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: colors.ink3,
      }}
    >
      {children}
    </Text>
  );
}

export function StepQuestion({ children }: { children: React.ReactNode }) {
  const { colors, direction } = useTheme();
  return (
    <Text
      style={{
        fontFamily: 'Archivo_900Black',
        fontSize: 36,
        lineHeight: 38,
        letterSpacing: direction === 'A' ? -0.5 : -1.5,
        textTransform: direction === 'A' ? 'uppercase' : 'none',
        color: colors.ink,
      }}
    >
      {children}
    </Text>
  );
}

export function OnboardingHeader({
  step,
  total,
  onBack,
  backHidden,
}: {
  step: number;
  total: number;
  onBack: () => void;
  backHidden?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 8 }}>
      <TouchableOpacity onPress={onBack} disabled={backHidden} style={{ paddingVertical: 6 }}>
        <Text
          style={{
            fontFamily: 'HankenGrotesk_600SemiBold',
            fontSize: 14.5,
            color: backHidden ? 'transparent' : colors.ink2,
          }}
        >
          ← Voltar
        </Text>
      </TouchableOpacity>
      <View style={{ flex: 1, flexDirection: 'row', gap: 5 }}>
        {Array.from({ length: total }).map((_, i) => (
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
  );
}
