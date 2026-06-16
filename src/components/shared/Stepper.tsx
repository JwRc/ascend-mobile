import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '@/theme';
import { round1 } from '@/lib/utils';

type Props = {
  value: number;
  step: number;
  unit: string;
  min: number;
  max: number;
  onChange: (v: number) => void;
};

export function Stepper({ value, step, unit, min, max, onChange }: Props) {
  const { colors, radius } = useTheme();
  const [inputVal, setInputVal] = React.useState(String(value));

  React.useEffect(() => {
    setInputVal(String(value));
  }, [value]);

  function increment() {
    const next = round1(Math.min(max, value + step));
    onChange(next);
  }
  function decrement() {
    const next = round1(Math.max(min, value - step));
    onChange(next);
  }
  function handleBlur() {
    const parsed = parseFloat(inputVal);
    if (!isNaN(parsed)) {
      onChange(round1(Math.min(max, Math.max(min, parsed))));
    } else {
      setInputVal(String(value));
    }
  }

  const btnStyle = {
    width: 60,
    backgroundColor: colors.surface2,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.cardSm,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 12,
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 10 }}>
      <TouchableOpacity onPress={decrement} style={btnStyle}>
        <Text style={{ fontSize: 28, fontFamily: 'HankenGrotesk_700Bold', color: colors.ink, lineHeight: 32 }}>
          −
        </Text>
      </TouchableOpacity>

      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'center',
          gap: 6,
          backgroundColor: colors.surface2,
          borderWidth: 1.5,
          borderColor: colors.line,
          borderRadius: radius.cardSm,
          paddingVertical: 8,
          paddingHorizontal: 12,
        }}
      >
        <TextInput
          value={inputVal}
          onChangeText={setInputVal}
          onBlur={handleBlur}
          keyboardType="decimal-pad"
          style={{
            fontFamily: 'Archivo_900Black',
            fontSize: 46,
            letterSpacing: -1,
            color: colors.ink,
            textAlign: 'center',
            minWidth: 80,
          }}
          selectTextOnFocus
        />
        <Text
          style={{
            fontFamily: 'Archivo_800ExtraBold',
            fontSize: 18,
            color: colors.ink3,
            fontWeight: '700',
          }}
        >
          {unit}
        </Text>
      </View>

      <TouchableOpacity onPress={increment} style={btnStyle}>
        <Text style={{ fontSize: 28, fontFamily: 'HankenGrotesk_700Bold', color: colors.ink, lineHeight: 32 }}>
          +
        </Text>
      </TouchableOpacity>
    </View>
  );
}
