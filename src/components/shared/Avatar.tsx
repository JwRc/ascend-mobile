import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme';

type Props = { name: string; size?: number };

export function Avatar({ name, size = 40 }: Props) {
  const { colors, direction } = useTheme();
  const initial = name.slice(0, 1).toUpperCase();
  const borderRadius = direction === 'A' ? 4 : size / 2;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor: colors.ink,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: 'Archivo_800ExtraBold',
          fontSize: size * 0.4,
          color: colors.bg,
          fontWeight: '800',
        }}
      >
        {initial}
      </Text>
    </View>
  );
}
