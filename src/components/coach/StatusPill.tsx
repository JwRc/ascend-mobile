import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme';
import { semanticColors } from '@/theme';
import type { CoachAthlete } from '@/store/coach.store';

const STATUS_COLOR: Record<CoachAthlete['status'], string> = {
  active: semanticColors.success,
  invited: semanticColors.accentCobalt,
  inactive: semanticColors.warning,
};

const STATUS_LABEL: Record<CoachAthlete['status'], string> = {
  active: 'Ativo',
  invited: 'Convidado',
  inactive: 'Inativo',
};

type Props = { status: CoachAthlete['status'] };

export function StatusPill({ status }: Props) {
  const { radius } = useTheme();
  const color = STATUS_COLOR[status];
  return (
    <View
      style={{
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
          fontSize: 11,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color,
        }}
      >
        {STATUS_LABEL[status]}
      </Text>
    </View>
  );
}
