import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { Card } from '@/components/shared/Card';
import { useStudentProfile, useUpdateStudentProfile } from '@/api/hooks/useStudentProfile';

export default function SettingsScreen() {
  const { colors, direction } = useTheme();
  const { data: profile } = useStudentProfile();
  const updateProfile = useUpdateStudentProfile();
  const u = profile?.units ?? 'kg';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* top bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1.5,
          borderBottomColor: colors.line,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink2 }}>
            ← Voltar
          </Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 20, letterSpacing: direction === 'A' ? 0 : -0.3, color: colors.ink }}>
          Configurações
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* unidade de peso */}
        <Card style={{ gap: 14 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 17, letterSpacing: direction === 'A' ? 0 : -0.2, color: colors.ink }}>
              Unidade de peso
            </Text>
            <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: colors.ink3, lineHeight: 19 }}>
              Afeta como você registra pesos futuros e como os valores são exibidos. Registros históricos ficam com o valor original.
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(['kg', 'lb'] as const).map((unit) => (
              <TouchableOpacity
                key={unit}
                onPress={() => {
                  if (unit !== u) updateProfile.mutate({ units: unit });
                }}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: direction === 'A' ? 4 : 10,
                  borderWidth: 2,
                  borderColor: u === unit ? colors.accent : colors.line,
                  backgroundColor: u === unit ? colors.accent : colors.surface,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Archivo_800ExtraBold',
                    fontSize: 18,
                    letterSpacing: 0.5,
                    color: u === unit ? '#fff' : colors.ink2,
                  }}
                >
                  {unit.toUpperCase()}
                </Text>
                <Text
                  style={{
                    fontFamily: 'HankenGrotesk_600SemiBold',
                    fontSize: 11.5,
                    color: u === unit ? 'rgba(255,255,255,0.75)' : colors.ink3,
                    marginTop: 2,
                  }}
                >
                  {unit === 'kg' ? 'Quilogramas' : 'Libras'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {updateProfile.isPending && (
            <Text style={{ fontFamily: 'HankenGrotesk_500Medium', fontSize: 12.5, color: colors.ink3, textAlign: 'center' }}>
              Salvando…
            </Text>
          )}
        </Card>

        {/* placeholder para futuras configurações */}
        <Card style={{ gap: 12, opacity: 0.5 }}>
          <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 17, color: colors.ink }}>
            Lembretes
          </Text>
          <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: colors.ink3 }}>
            Em breve — controle de lembretes diários de pesagem.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
