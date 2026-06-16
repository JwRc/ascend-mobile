import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { useTheme } from '@/theme';
import { Switch } from './Switch';

type Props = {
  label: string;
  note?: string;
  value: boolean;
  onChange: (v: boolean) => void;
};

export function ToggleCard({ label, note, value, onChange }: Props) {
  const { colors, radius } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => onChange(!value)}
      activeOpacity={0.85}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 20,
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: value ? colors.ink : colors.line,
        borderRadius: radius.cardSm,
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 17, color: colors.ink }}>
          {label}
        </Text>
        {note && (
          <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: colors.ink3, lineHeight: 18 }}>
            {note}
          </Text>
        )}
      </View>
      <Switch value={value} onChange={onChange} />
    </TouchableOpacity>
  );
}
