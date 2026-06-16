import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme';

type Props = { size?: number };

export function Logo({ size = 22 }: Props) {
  const { colors, direction } = useTheme();
  const barRadius = direction === 'B' ? 3 : 1;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.4 }}>
      {/* bar chart icon */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: size * 0.1, height: size }}>
        <View
          style={{
            width: size * 0.26,
            height: size * 0.45,
            backgroundColor: colors.ink,
            borderRadius: barRadius,
          }}
        />
        <View
          style={{
            width: size * 0.26,
            height: size * 0.72,
            backgroundColor: colors.ink,
            borderRadius: barRadius,
          }}
        />
        <View
          style={{
            width: size * 0.26,
            height: size,
            backgroundColor: colors.accent,
            borderRadius: barRadius,
          }}
        />
      </View>
      <Text
        style={{
          fontFamily: 'Archivo_900Black',
          fontSize: size * 0.62,
          letterSpacing: size * 0.09,
          color: colors.ink,
          textTransform: 'uppercase',
        }}
      >
        Ascentio
      </Text>
    </View>
  );
}
