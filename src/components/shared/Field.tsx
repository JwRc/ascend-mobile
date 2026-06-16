import React from 'react';
import { View, Text, TextInput as RNTextInput, TextInputProps, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

type FieldProps = {
  label: string;
  hint?: string;
  children: React.ReactNode;
  style?: ViewStyle;
};

export function Field({ label, hint, children, style }: FieldProps) {
  const { colors } = useTheme();
  return (
    <View style={[{ gap: 8 }, style]}>
      <Text
        style={{
          fontFamily: 'HankenGrotesk_700Bold',
          fontSize: 12.5,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: colors.ink3,
        }}
      >
        {label}
      </Text>
      {children}
      {hint && (
        <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 12.5, color: colors.ink3 }}>
          {hint}
        </Text>
      )}
    </View>
  );
}

type StyledInputProps = TextInputProps & { big?: boolean };

export function StyledInput({ big, style, ...props }: StyledInputProps) {
  const { colors, radius } = useTheme();
  const [focused, setFocused] = React.useState(false);
  return (
    <RNTextInput
      {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      style={[
        {
          width: '100%',
          backgroundColor: colors.surface2,
          color: colors.ink,
          borderWidth: 1.5,
          borderColor: focused ? colors.ink : colors.line,
          borderRadius: radius.cardSm,
          paddingVertical: big ? 18 : 14,
          paddingHorizontal: big ? 18 : 16,
          fontSize: big ? 30 : 16,
          fontFamily: big ? 'Archivo_800ExtraBold' : 'HankenGrotesk_500Medium',
          letterSpacing: big ? -0.5 : 0,
        },
        style as object,
      ]}
      placeholderTextColor={colors.ink3}
    />
  );
}
