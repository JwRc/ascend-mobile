import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import { Btn } from '@/components/shared/Btn';

type PR = {
  exercise: string;
  e: number;
  prevBest: number;
  weight: number | null;
  reps: number | null;
};

type Props = {
  visible: boolean;
  prs: PR[];
  unit: 'kg' | 'lb';
  onClose: () => void;
};

export function PrCelebration({ visible, prs, unit, onClose }: Props) {
  const { colors, radius } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
          padding: 16,
        }}
      >
        <TouchableOpacity activeOpacity={1}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1.5,
              borderColor: colors.line,
              borderRadius: radius.card,
              overflow: 'hidden',
              gap: 20,
            }}
          >
            {/* accent header */}
            <View
              style={{
                backgroundColor: colors.accent,
                padding: 26,
                paddingBottom: 22,
                gap: 4,
              }}
            >
              <Text
                style={{
                  fontFamily: 'HankenGrotesk_700Bold',
                  fontSize: 12,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.92)',
                }}
              >
                {prs.length === 1 ? 'Novo recorde pessoal' : `${prs.length} recordes pessoais`}
              </Text>
              <Text
                style={{
                  fontFamily: 'Archivo_900Black',
                  fontSize: 52,
                  lineHeight: 46,
                  letterSpacing: -1,
                  color: '#fff',
                }}
              >
                {prs.length === 1 ? 'PR!' : 'PRs!'}
              </Text>
            </View>

            {/* PR list */}
            <View style={{ paddingHorizontal: 24, gap: 0 }}>
              {prs.map((p, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    paddingVertical: 13,
                    borderBottomWidth: i < prs.length - 1 ? 1.5 : 0,
                    borderBottomColor: colors.line,
                  }}
                >
                  <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
                    <Text
                      style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 15.5, color: colors.ink }}
                      numberOfLines={1}
                    >
                      {p.exercise}
                    </Text>
                    {p.weight != null && (
                      <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12.5, color: colors.ink3 }}>
                        {p.weight}{unit} × {p.reps}
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                    <Text
                      style={{
                        fontFamily: 'HankenGrotesk_700Bold',
                        fontSize: 14,
                        color: colors.ink3,
                        textDecorationLine: 'line-through',
                      }}
                    >
                      {p.prevBest}{unit}
                    </Text>
                    <Text style={{ color: colors.ink3, fontSize: 13 }}>→</Text>
                    <Text
                      style={{
                        fontFamily: 'Archivo_900Black',
                        fontSize: 24,
                        letterSpacing: -0.5,
                        color: colors.accent,
                      }}
                    >
                      {p.e}
                      <Text style={{ fontSize: 13, fontFamily: 'HankenGrotesk_700Bold', fontWeight: '700' }}>{unit}</Text>
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* action */}
            <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
              <Btn kind="primary" full onPress={onClose}>
                Ver progresso →
              </Btn>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
