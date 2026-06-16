import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { useTheme } from '@/theme';

type Props = {
  label: string;
  note?: string;
  selected: boolean;
  onPress: () => void;
};

export function OptRow({ label, note, selected, onPress }: Props) {
  const { colors, radius } = useTheme();
  const checkRadius = radius.cardSm < 5 ? 2 : 50;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingRight: 48,
        backgroundColor: selected ? colors.surface2 : colors.surface,
        borderWidth: 1.5,
        borderColor: selected ? colors.ink : colors.line,
        borderRadius: radius.cardSm,
        gap: 0,
      }}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 17, color: colors.ink }}>
          {label}
        </Text>
        {note && (
          <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: colors.ink3 }}>
            {note}
          </Text>
        )}
      </View>
      <View
        style={{
          position: 'absolute',
          right: 18,
          width: 20,
          height: 20,
          borderRadius: checkRadius,
          borderWidth: 2,
          borderColor: selected ? colors.accent : colors.line2,
          backgroundColor: selected ? colors.accent : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected && (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: checkRadius,
              backgroundColor: colors.surface2,
            }}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}
