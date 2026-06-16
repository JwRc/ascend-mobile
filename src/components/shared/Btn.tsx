import React from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme';

type BtnKind = 'primary' | 'ghost' | 'danger';

type Props = {
  kind?: BtnKind;
  full?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
};

export function Btn({ kind = 'primary', full, disabled, loading, onPress, children, style }: Props) {
  const { colors, radius, direction } = useTheme();

  const base: ViewStyle = {
    borderRadius: radius.cardSm,
    paddingVertical: 16,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    opacity: disabled ? 0.4 : 1,
    ...(full ? { width: '100%' } : {}),
    ...style,
  };

  const variants: Record<BtnKind, ViewStyle> = {
    primary: { backgroundColor: colors.ink },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.line2,
    },
    danger: { backgroundColor: '#e5484d' },
  };

  const textBase: TextStyle = {
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: 16,
    lineHeight: 16,
  };

  const textColor: Record<BtnKind, string> = {
    primary: colors.bg,
    ghost: colors.ink2,
    danger: '#ffffff',
  };

  const isUppercase = direction === 'A' && kind !== 'ghost';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[base, variants[kind]]}
    >
      {loading ? (
        <ActivityIndicator color={textColor[kind]} size="small" />
      ) : (
        <Text
          style={[
            textBase,
            { color: textColor[kind] },
            isUppercase ? { textTransform: 'uppercase', letterSpacing: 0.6 } : {},
          ]}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}
