import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme';
import { semanticColors } from '@/theme';
import type { Flag } from '@/store/coach.store';

const FLAG_COLORS: Record<Flag['type'], string> = {
  stale: semanticColors.warning,
  trend: semanticColors.danger,
  missed: semanticColors.accentCobalt,
};

type Props = { flag: Flag };

export function FlagBadge({ flag }: Props) {
  const { colors, radius } = useTheme();
  const color = FLAG_COLORS[flag.type];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${color}18`,
        borderWidth: 1,
        borderColor: `${color}50`,
        borderRadius: radius.cardSm,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      <Text
        style={{
          fontFamily: 'HankenGrotesk_700Bold',
          fontSize: 11.5,
          letterSpacing: 0.3,
          color,
        }}
      >
        {flag.label}
      </Text>
    </View>
  );
}
