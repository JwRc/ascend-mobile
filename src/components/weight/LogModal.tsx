import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AppModal } from '@/components/shared/AppModal';
import { Btn } from '@/components/shared/Btn';
import { Stepper } from '@/components/shared/Stepper';
import { Field } from '@/components/shared/Field';
import { StyledInput } from '@/components/shared/Field';
import { useTheme } from '@/theme';
import { WeightEntry } from '@/types/api';
import { todayISO, round1, kgToUnit, unitToKg } from '@/lib/utils';

type Props = {
  visible: boolean;
  unit: 'kg' | 'lb';
  lastWeight: number | null;
  entries: WeightEntry[];
  onSave: (date: string, weight: number) => void;
  onClose: () => void;
};

export function LogModal({ visible, unit, lastWeight, entries, onSave, onClose }: Props) {
  const { colors } = useTheme();
  const [date, setDate] = React.useState(todayISO());
  const [weight, setWeight] = React.useState(
    lastWeight != null ? round1(kgToUnit(lastWeight, unit)) : unit === 'kg' ? 75 : 165
  );
  const minW = unit === 'kg' ? 30 : 66;
  const maxW = unit === 'kg' ? 250 : 550;

  const existing = entries.find((e) => e.date === date);

  React.useEffect(() => {
    if (existing) setWeight(round1(kgToUnit(existing.weight, unit)));
  }, [date]);

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Registrar peso"
      footer={
        <Btn
          kind="primary"
          full
          onPress={() =>
            onSave(date, round1(unitToKg(Math.min(maxW, Math.max(minW, weight)), unit)))
          }
        >
          {existing ? 'Atualizar registro' : 'Salvar registro'}
        </Btn>
      }
    >
      <Field label="Data">
        <StyledInput
          value={date}
          onChangeText={setDate}
          placeholder="AAAA-MM-DD"
          keyboardType="numbers-and-punctuation"
        />
      </Field>

      <Field label="Peso">
        <Stepper
          value={weight}
          step={unit === 'kg' ? 0.1 : 0.2}
          unit={unit}
          min={unit === 'kg' ? 30 : 66}
          max={unit === 'kg' ? 250 : 550}
          onChange={setWeight}
        />
      </Field>

      {existing && (
        <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink3 }}>
          Substituindo o registro já feito para este dia.
        </Text>
      )}
    </AppModal>
  );
}
