import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  accentLeft?: boolean;
};

export function Card({ children, style, accentLeft }: Props) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderWidth: 1.5,
          borderColor: colors.line,
          borderRadius: radius.card,
          padding: 20,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 10,
          elevation: 2,
        },
        accentLeft ? { borderLeftWidth: 4, borderLeftColor: colors.accent } : {},
        style,
      ]}
    >
      {children}
    </View>
  );
}
