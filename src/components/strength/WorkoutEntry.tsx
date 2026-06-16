import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/theme';
import { Card } from '@/components/shared/Card';
import { Template } from '@/store/strength.store';

type Props = {
  templates: Template[];
  onStartTemplate: (t: Template) => void;
  onStartYolo: () => void;
  onNewTemplate: () => void;
  onEditTemplate: (id: string) => void;
};

export function WorkoutEntry({ templates, onStartTemplate, onStartYolo, onNewTemplate, onEditTemplate }: Props) {
  const { colors, direction, radius } = useTheme();

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text
          style={{
            fontFamily: 'Archivo_800ExtraBold',
            fontSize: 24,
            letterSpacing: direction === 'A' ? 0 : -0.5,
            textTransform: direction === 'A' ? 'uppercase' : 'none',
            color: colors.ink,
          }}
        >
          Iniciar treino
        </Text>
        <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: colors.ink3, marginTop: 4 }}>
          Escolha um template ou freestyle
        </Text>
      </View>

      {/* template list */}
      <View style={{ flexDirection: 'column', gap: 12 }}>
        {templates.map((t) => (
          <TouchableOpacity
            key={t.id}
            onPress={() => onStartTemplate(t)}
            activeOpacity={0.85}
          >
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <Text
                  style={{
                    fontFamily: 'Archivo_800ExtraBold',
                    fontSize: 19,
                    letterSpacing: direction === 'A' ? 0 : -0.3,
                    textTransform: direction === 'A' ? 'uppercase' : 'none',
                    color: colors.ink,
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {t.name}
                </Text>
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12, color: colors.ink3, flexShrink: 0 }}>
                  {t.exercises.length} ex
                </Text>
              </View>

              <View style={{ gap: 6 }}>
                {t.exercises.slice(0, 4).map((n, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: direction === 'A' ? 3 : 5,
                        backgroundColor: colors.surface2,
                        borderWidth: 1.5,
                        borderColor: colors.line,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 9, color: colors.ink3 }}>
                        {i + 1}
                      </Text>
                    </View>
                    <Text
                      style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink2 }}
                      numberOfLines={1}
                    >
                      {n}
                    </Text>
                  </View>
                ))}
                {t.exercises.length > 4 && (
                  <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: colors.ink3, fontStyle: 'italic' }}>
                    +{t.exercises.length - 4} exercícios
                  </Text>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text
                  style={{
                    fontFamily: 'HankenGrotesk_700Bold',
                    fontSize: 12.5,
                    color: colors.accent,
                    textTransform: direction === 'A' ? 'uppercase' : 'none',
                    letterSpacing: direction === 'A' ? 0.5 : 0,
                  }}
                >
                  Iniciar →
                </Text>
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation?.(); onEditTemplate(t.id); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12, color: colors.ink3 }}>
                    Editar
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        {/* add template card */}
        <TouchableOpacity
          onPress={onNewTemplate}
          activeOpacity={0.8}
        >
          <View
            style={{
              borderWidth: 1.5,
              borderColor: colors.line2,
              borderStyle: 'dashed',
              borderRadius: radius.card,
              padding: 20,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              minHeight: 100,
            }}
          >
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 26, color: colors.ink3 }}>+</Text>
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, color: colors.ink3 }}>
              Novo template
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* divider */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 4 }}>
        <View style={{ flex: 1, height: 1.5, backgroundColor: colors.line }} />
        <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12.5, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.ink3 }}>
          ou
        </Text>
        <View style={{ flex: 1, height: 1.5, backgroundColor: colors.line }} />
      </View>

      {/* YOLO card */}
      <TouchableOpacity onPress={onStartYolo} activeOpacity={0.85}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderColor: colors.ink }}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: 'HankenGrotesk_700Bold',
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: colors.accent,
              }}
            >
              Sem plano
            </Text>
            <Text
              style={{
                fontFamily: 'Archivo_800ExtraBold',
                fontSize: 22,
                letterSpacing: direction === 'A' ? 0 : -0.5,
                textTransform: direction === 'A' ? 'uppercase' : 'none',
                color: colors.ink,
                marginTop: 3,
                marginBottom: 5,
              }}
            >
              YOLO SESSION
            </Text>
            <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: colors.ink2 }}>
              Comece vazio e adicione exercícios na hora.
            </Text>
          </View>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.bg, fontSize: 20 }}>→</Text>
          </View>
        </Card>
      </TouchableOpacity>
    </View>
  );
}
