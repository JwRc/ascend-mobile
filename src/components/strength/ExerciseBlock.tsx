import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import { Card } from '@/components/shared/Card';
import { AddSetForm } from './AddSetForm';
import { WorkSet, SetType } from '@/store/strength.store';
import { round1, epley1RM } from '@/lib/utils';

const SET_TYPE_LABEL: Record<string, string> = {
  warmup: 'AQ',
  prep: 'PR',
  feeder: 'FD',
  work: 'WK',
};

const SET_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  work: { bg: '#ff5a1f', text: '#fff' },
  feeder: { bg: '#fff0eb', text: '#ff5a1f' },
  prep: { bg: '#f5f4f2', text: '#5a5a60' },
  warmup: { bg: '#f5f4f2', text: '#9a9aa1' },
};

type Props = {
  name: string;
  sets: WorkSet[];
  unit: 'kg' | 'lb';
  defaultWeight: number;
  defaultReps: number;
  onAddSet: (s: WorkSet) => void;
  onRemoveSet: (i: number) => void;
};

export function ExerciseBlock({ name, sets, unit, defaultWeight, defaultReps, onAddSet, onRemoveSet }: Props) {
  const { colors, direction, radius } = useTheme();
  const [addingSet, setAddingSet] = React.useState(false);

  return (
    <Card style={{ gap: 14 }}>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text
          style={{
            fontFamily: 'Archivo_800ExtraBold',
            fontSize: 18,
            letterSpacing: direction === 'A' ? 0 : -0.3,
            textTransform: direction === 'A' ? 'uppercase' : 'none',
            color: colors.ink,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12, color: colors.ink3 }}>
          {sets.length} {sets.length === 1 ? 'série' : 'séries'}
        </Text>
      </View>

      {/* set log table */}
      {sets.length > 0 && (
        <View>
          {/* header row */}
          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              paddingBottom: 8,
              borderBottomWidth: 1.5,
              borderBottomColor: colors.line,
            }}
          >
            {['#', 'Tipo', 'Carga', '1RM', ''].map((h, i) => (
              <Text
                key={i}
                style={{
                  fontFamily: 'HankenGrotesk_700Bold',
                  fontSize: 10.5,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  color: colors.ink3,
                  width: i === 0 ? 20 : i === 1 ? 36 : i === 4 ? 28 : undefined,
                  flex: i === 2 || i === 3 ? 1 : undefined,
                }}
              >
                {h}
              </Text>
            ))}
          </View>

          {sets.map((s, i) => {
            const typeKey = s.type || 'warmup';
            const typeStyle = SET_TYPE_COLORS[typeKey] || SET_TYPE_COLORS.warmup;
            const estimated = round1(epley1RM(s.weight, s.reps));

            return (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 10,
                  borderBottomWidth: i < sets.length - 1 ? 1.5 : 0,
                  borderBottomColor: colors.line,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Archivo_800ExtraBold',
                    fontSize: 14,
                    color: colors.ink3,
                    width: 20,
                  }}
                >
                  {i + 1}
                </Text>
                <View
                  style={{
                    width: 36,
                    paddingVertical: 3,
                    paddingHorizontal: 4,
                    borderRadius: direction === 'A' ? 2 : 5,
                    backgroundColor: typeStyle.bg,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'HankenGrotesk_700Bold',
                      fontSize: 9,
                      letterSpacing: 0.4,
                      color: typeStyle.text,
                    }}
                  >
                    {SET_TYPE_LABEL[typeKey] || '—'}
                  </Text>
                </View>
                <Text style={{ flex: 1, fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: colors.ink }}>
                  {s.weight}
                  <Text style={{ fontSize: 11, color: colors.ink3 }}>{unit}</Text>
                  {' × '}
                  {s.reps}
                </Text>
                <Text style={{ flex: 1, fontFamily: 'Archivo_800ExtraBold', fontSize: 15, color: colors.ink2 }}>
                  ~{estimated}
                  <Text style={{ fontSize: 11, fontFamily: 'HankenGrotesk_700Bold', color: colors.ink3 }}>{unit}</Text>
                </Text>
                <TouchableOpacity onPress={() => onRemoveSet(i)} style={{ width: 28 }}>
                  <Text style={{ fontSize: 18, color: colors.ink3, textAlign: 'center' }}>×</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* add set */}
      {addingSet ? (
        <AddSetForm
          unit={unit}
          defaultWeight={defaultWeight}
          defaultReps={defaultReps}
          onAdd={(set) => { onAddSet(set); setAddingSet(false); }}
          onCancel={() => setAddingSet(false)}
        />
      ) : (
        <TouchableOpacity onPress={() => setAddingSet(true)}>
          <Text
            style={{
              fontFamily: 'HankenGrotesk_700Bold',
              fontSize: 14,
              color: colors.accent,
              textTransform: direction === 'A' ? 'uppercase' : 'none',
              letterSpacing: direction === 'A' ? 0.5 : 0,
            }}
          >
            + Adicionar série
          </Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}
