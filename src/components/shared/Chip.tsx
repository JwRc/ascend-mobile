import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@/theme';
import { hexAlpha } from '@/lib/utils';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, selected, onPress }: Props) {
  const { colors, direction } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 13,
        borderRadius: direction === 'A' ? 4 : 30,
        borderWidth: 1.5,
        borderColor: selected ? colors.accent : colors.line,
        backgroundColor: selected ? hexAlpha(colors.accent, 0.1) : colors.surface2,
      }}
    >
      <Text
        style={{
          fontFamily: 'HankenGrotesk_700Bold',
          fontSize: 13,
          color: selected ? colors.accent : colors.ink2,
          textTransform: direction === 'A' ? 'uppercase' : 'none',
          letterSpacing: direction === 'A' ? 0.4 : 0,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
