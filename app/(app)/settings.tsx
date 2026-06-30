import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { Card } from '@/components/shared/Card';
import { useStudentProfile, useUpdateStudentProfile } from '@/api/hooks/useStudentProfile';
import { authClient } from '@/lib/auth';

const ACTIVITY_OPTIONS: { value: 'sed' | 'light' | 'mod' | 'high'; label: string }[] = [
  { value: 'sed', label: 'Sedentário' },
  { value: 'light', label: 'Levemente ativo' },
  { value: 'mod', label: 'Moderadamente ativo' },
  { value: 'high', label: 'Muito ativo' },
];

export default function SettingsScreen() {
  const { colors, direction } = useTheme();
  const { data: profile } = useStudentProfile();
  const updateProfile = useUpdateStudentProfile();

  const u = profile?.units ?? 'kg';

  const [height, setHeight] = React.useState('');
  const [pwCurrent, setPwCurrent] = React.useState('');
  const [pwNew, setPwNew] = React.useState('');
  const [pwConfirm, setPwConfirm] = React.useState('');
  const [pwStatus, setPwStatus] = React.useState<'idle' | 'ok' | 'err'>('idle');
  const [pwErr, setPwErr] = React.useState('');

  React.useEffect(() => {
    if (profile?.heightCm) setHeight(String(Math.round(profile.heightCm)));
  }, [profile?.heightCm]);

  function handleSaveHeight() {
    const h = parseInt(height, 10);
    if (!h || h < 50 || h > 250) {
      Alert.alert('Altura inválida', 'Insira um valor entre 50 e 250 cm.');
      return;
    }
    updateProfile.mutate({ heightCm: h });
  }

  async function handleChangePassword() {
    if (!pwNew || !pwCurrent) return;
    if (pwNew !== pwConfirm) {
      setPwStatus('err');
      setPwErr('As senhas não coincidem.');
      return;
    }
    try {
      await authClient.changePassword({ currentPassword: pwCurrent, newPassword: pwNew });
      setPwStatus('ok');
      setPwCurrent('');
      setPwNew('');
      setPwConfirm('');
    } catch {
      setPwStatus('err');
      setPwErr('Senha atual incorreta.');
    }
  }

  const labelStyle = {
    fontFamily: 'Archivo_800ExtraBold' as const,
    fontSize: 17,
    letterSpacing: direction === 'A' ? 0 : -0.2,
    color: colors.ink,
  };

  const descStyle = {
    fontFamily: 'HankenGrotesk_400Regular' as const,
    fontSize: 13,
    color: colors.ink3,
    lineHeight: 19,
  };

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
        {/* ── Unidade de peso ───────────────────────────────────────── */}
        <Card style={{ gap: 14 }}>
          <View style={{ gap: 4 }}>
            <Text style={labelStyle}>Unidade de peso</Text>
            <Text style={descStyle}>
              Afeta como você registra pesos futuros e como os valores são exibidos. Registros históricos ficam com o valor original.
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(['kg', 'lb'] as const).map((unit) => (
              <TouchableOpacity
                key={unit}
                onPress={() => { if (unit !== u) updateProfile.mutate({ units: unit }); }}
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
                <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 18, letterSpacing: 0.5, color: u === unit ? '#fff' : colors.ink2 }}>
                  {unit.toUpperCase()}
                </Text>
                <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 11.5, color: u === unit ? 'rgba(255,255,255,0.75)' : colors.ink3, marginTop: 2 }}>
                  {unit === 'kg' ? 'Quilogramas' : 'Libras'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* ── Altura ────────────────────────────────────────────────── */}
        <Card style={{ gap: 14 }}>
          <View style={{ gap: 4 }}>
            <Text style={labelStyle}>Altura</Text>
            <Text style={descStyle}>Usada para calcular o IMC e métricas corporais.</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TextInput
              value={height}
              onChangeText={setHeight}
              keyboardType="numeric"
              placeholder="—"
              placeholderTextColor={colors.ink3}
              style={{
                flex: 1,
                fontFamily: 'HankenGrotesk_600SemiBold',
                fontSize: 16,
                color: colors.ink,
                backgroundColor: colors.surface,
                borderWidth: 1.5,
                borderColor: colors.line,
                borderRadius: direction === 'A' ? 4 : 10,
                paddingHorizontal: 14,
                paddingVertical: 11,
              }}
            />
            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: colors.ink3 }}>cm</Text>
            <TouchableOpacity
              onPress={handleSaveHeight}
              style={{
                backgroundColor: colors.accent,
                borderRadius: direction === 'A' ? 4 : 10,
                paddingHorizontal: 18,
                paddingVertical: 12,
              }}
            >
              <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, color: '#fff' }}>Salvar</Text>
            </TouchableOpacity>
          </View>

          {updateProfile.isPending && (
            <Text style={{ fontFamily: 'HankenGrotesk_500Medium', fontSize: 12.5, color: colors.ink3 }}>
              Salvando…
            </Text>
          )}
        </Card>

        {/* ── Nível de atividade ────────────────────────────────────── */}
        <Card style={{ gap: 14 }}>
          <View style={{ gap: 4 }}>
            <Text style={labelStyle}>Nível de atividade</Text>
            <Text style={descStyle}>Ajuda a estimar seu gasto calórico diário.</Text>
          </View>

          <View style={{ gap: 8 }}>
            {ACTIVITY_OPTIONS.map((opt) => {
              const selected = (profile?.activityLevel ?? null) === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => updateProfile.mutate({ activityLevel: opt.value })}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: direction === 'A' ? 4 : 10,
                    borderWidth: 2,
                    borderColor: selected ? colors.accent : colors.line,
                    backgroundColor: selected ? colors.accent : colors.surface,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'HankenGrotesk_600SemiBold',
                      fontSize: 14,
                      color: selected ? '#fff' : colors.ink,
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* ── Lembretes ─────────────────────────────────────────────── */}
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={labelStyle}>Lembretes de pesagem</Text>
              <Text style={descStyle}>Receba lembretes diários para registrar seu peso.</Text>
            </View>
            <Switch
              value={profile?.reminders ?? true}
              onValueChange={(v) => updateProfile.mutate({ reminders: v })}
              trackColor={{ false: colors.line, true: colors.accent }}
              thumbColor="#fff"
            />
          </View>
        </Card>

        {/* ── Alterar senha ─────────────────────────────────────────── */}
        <Card style={{ gap: 14 }}>
          <Text style={labelStyle}>Alterar senha</Text>

          {(['Senha atual', 'Nova senha', 'Confirmar nova senha'] as const).map((label, i) => {
            const value = [pwCurrent, pwNew, pwConfirm][i];
            const setter = [setPwCurrent, setPwNew, setPwConfirm][i];
            return (
              <TextInput
                key={label}
                value={value}
                onChangeText={(t) => { setter(t); setPwStatus('idle'); }}
                placeholder={label}
                placeholderTextColor={colors.ink3}
                secureTextEntry
                style={{
                  fontFamily: 'HankenGrotesk_400Regular',
                  fontSize: 15,
                  color: colors.ink,
                  backgroundColor: colors.surface,
                  borderWidth: 1.5,
                  borderColor: colors.line,
                  borderRadius: direction === 'A' ? 4 : 10,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                }}
              />
            );
          })}

          {pwStatus === 'ok' && (
            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#22c55e' }}>
              Senha alterada com sucesso!
            </Text>
          )}
          {pwStatus === 'err' && (
            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#e5484d' }}>
              {pwErr}
            </Text>
          )}

          <TouchableOpacity
            onPress={handleChangePassword}
            disabled={!pwCurrent || !pwNew || !pwConfirm}
            style={{
              backgroundColor: (!pwCurrent || !pwNew || !pwConfirm) ? colors.line : colors.accent,
              borderRadius: direction === 'A' ? 4 : 10,
              paddingVertical: 13,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, color: '#fff' }}>
              Salvar senha
            </Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
