import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import { Btn } from '@/components/shared/Btn';
import { WorkSet, SetType } from '@/store/strength.store';
import { round1, epley1RM } from '@/lib/utils';

const SET_TYPES: { value: SetType; label: string }[] = [
  { value: null, label: 'Auto' },
  { value: 'warmup', label: 'Aquec.' },
  { value: 'prep', label: 'Prep' },
  { value: 'feeder', label: 'Feeder' },
  { value: 'work', label: 'Work' },
];

type Props = {
  unit: 'kg' | 'lb';
  defaultWeight: number;
  defaultReps: number;
  onAdd: (set: WorkSet) => void;
  onCancel: () => void;
};

export function AddSetForm({ unit, defaultWeight, defaultReps, onAdd, onCancel }: Props) {
  const { colors, radius } = useTheme();
  const [type, setType] = React.useState<SetType>(null);
  const [weight, setWeight] = React.useState(String(defaultWeight));
  const [reps, setReps] = React.useState(String(defaultReps));

  const w = parseFloat(weight) || 0;
  const r = parseInt(reps) || 0;
  const est = w > 0 && r > 0 ? round1(epley1RM(w, r)) : 0;

  function confirm() {
    if (w <= 0 || r <= 0) return;
    onAdd({ weight: round1(w), reps: r, type });
  }

  return (
    <View style={{ gap: 14 }}>
      {/* set type */}
      <View>
        <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.ink3, marginBottom: 8 }}>
          Tipo de série <Text style={{ opacity: 0.7, letterSpacing: 0.2 }}>· opcional</Text>
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {SET_TYPES.map((opt) => (
            <TouchableOpacity
              key={String(opt.value)}
              onPress={() => setType(opt.value)}
              style={{
                flex: 1,
                minWidth: 52,
                paddingVertical: 9,
                paddingHorizontal: 6,
                alignItems: 'center',
                borderRadius: radius.cardSm,
                borderWidth: 1.5,
                borderColor: type === opt.value ? colors.ink : colors.line,
                backgroundColor: type === opt.value ? colors.ink : colors.surface2,
              }}
            >
              <Text
                style={{
                  fontFamily: 'HankenGrotesk_700Bold',
                  fontSize: 12.5,
                  color: type === opt.value ? colors.bg : colors.ink2,
                }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* weight + reps */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.ink3 }}>
            Carga
          </Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              style={{
                backgroundColor: colors.surface2,
                borderWidth: 1.5,
                borderColor: colors.line,
                borderRadius: radius.cardSm,
                paddingVertical: 14,
                paddingHorizontal: 16,
                paddingRight: 36,
                fontSize: 16,
                fontFamily: 'HankenGrotesk_700Bold',
                color: colors.ink,
              }}
            />
            <Text
              style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: [{ translateY: -8 }],
                fontFamily: 'HankenGrotesk_700Bold',
                fontSize: 12,
                color: colors.ink3,
              }}
            >
              {unit}
            </Text>
          </View>
        </View>

        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.ink3 }}>
            Reps
          </Text>
          <TextInput
            value={reps}
            onChangeText={setReps}
            keyboardType="number-pad"
            style={{
              backgroundColor: colors.surface2,
              borderWidth: 1.5,
              borderColor: colors.line,
              borderRadius: radius.cardSm,
              paddingVertical: 14,
              paddingHorizontal: 16,
              fontSize: 16,
              fontFamily: 'HankenGrotesk_700Bold',
              color: colors.ink,
            }}
          />
        </View>
      </View>

      {/* footer */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink3 }}>
          1RM est.{' '}
          <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 16, color: colors.ink }}>
            {est > 0 ? `${est}${unit}` : '—'}
          </Text>
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn kind="ghost" onPress={onCancel} style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
            Cancelar
          </Btn>
          <Btn kind="primary" onPress={confirm} disabled={w <= 0 || r <= 0} style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
            Confirmar
          </Btn>
        </View>
      </View>
    </View>
  );
}
