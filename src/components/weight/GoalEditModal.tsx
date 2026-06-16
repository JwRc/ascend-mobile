import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AppModal } from '@/components/shared/AppModal';
import { Btn } from '@/components/shared/Btn';
import { Stepper } from '@/components/shared/Stepper';
import { Field } from '@/components/shared/Field';
import { useTheme } from '@/theme';
import { round1 } from '@/lib/utils';

type GoalType = 'lose' | 'strength' | 'maintain';

const TYPES: { value: GoalType; label: string }[] = [
  { value: 'lose', label: 'Perder peso' },
  { value: 'strength', label: 'Ganhar força' },
  { value: 'maintain', label: 'Manter' },
];

type Props = {
  visible: boolean;
  unit: 'kg' | 'lb';
  goal: number;
  goalType: GoalType;
  onSave: (goal: number, type: GoalType) => void;
  onClose: () => void;
};

export function GoalEditModal({ visible, unit, goal, goalType, onSave, onClose }: Props) {
  const { colors, radius } = useTheme();
  const [g, setG] = React.useState(goal);
  const [gt, setGt] = React.useState<GoalType>(goalType);

  return (
    <AppModal visible={visible} onClose={onClose} title="Editar meta">
      <Field label="Treinando para">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              onPress={() => setGt(t.value)}
              style={{
                flex: 1,
                paddingVertical: 11,
                paddingHorizontal: 6,
                alignItems: 'center',
                borderRadius: radius.cardSm,
                borderWidth: 1.5,
                borderColor: gt === t.value ? colors.accent : colors.line,
                backgroundColor: gt === t.value ? colors.accent : 'transparent',
              }}
            >
              <Text
                style={{
                  fontFamily: 'HankenGrotesk_700Bold',
                  fontSize: 13,
                  color: gt === t.value ? '#fff' : colors.ink2,
                }}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Field>

      <Field label="Peso alvo">
        <Stepper
          value={g}
          step={unit === 'kg' ? 0.5 : 1}
          unit={unit}
          min={unit === 'kg' ? 30 : 66}
          max={unit === 'kg' ? 250 : 550}
          onChange={setG}
        />
      </Field>

      <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink3 }}>
        Atualizar aqui marca a meta como definida por você.
      </Text>

      <Btn kind="primary" full onPress={() => onSave(round1(g), gt)}>
        Salvar meta
      </Btn>
    </AppModal>
  );
}
