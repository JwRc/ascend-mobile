import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { Card } from '@/components/shared/Card';
import { SegmentedControl } from '@/components/shared/SegmentedControl';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore, type ColorScheme } from '@/store/ui.store';
import { authClient } from '@/lib/auth';

const APPEARANCE_OPTIONS: { value: ColorScheme; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
];

export default function CoachSettingsScreen() {
  const { colors, direction } = useTheme();
  const { name, email } = useAuthStore();
  const { colorScheme, setColorScheme } = useUIStore();

  const [pwCurrent, setPwCurrent] = React.useState('');
  const [pwNew, setPwNew] = React.useState('');
  const [pwConfirm, setPwConfirm] = React.useState('');
  const [pwStatus, setPwStatus] = React.useState<'idle' | 'ok' | 'err'>('idle');
  const [pwErr, setPwErr] = React.useState('');

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
        {/* ── Aparência ─────────────────────────────────────────────── */}
        <Card style={{ gap: 14 }}>
          <View style={{ gap: 4 }}>
            <Text style={labelStyle}>Aparência</Text>
            <Text style={descStyle}>Tema claro, escuro ou de acordo com o sistema do aparelho.</Text>
          </View>
          <SegmentedControl options={APPEARANCE_OPTIONS} value={colorScheme} onChange={(v) => setColorScheme(v as ColorScheme)} />
        </Card>

        {/* ── Perfil ────────────────────────────────────────────────── */}
        <Card style={{ gap: 10 }}>
          <Text style={labelStyle}>Perfil</Text>
          <View style={{ gap: 2 }}>
            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: colors.ink }}>
              {name || '—'}
            </Text>
            <Text style={descStyle}>{email}</Text>
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

        {/* ── Assinatura ────────────────────────────────────────────── */}
        <Card style={{ gap: 10 }}>
          <Text style={labelStyle}>Assinatura</Text>
          <Text style={descStyle}>Cartões salvos, faturas e cancelamento.</Text>
          <TouchableOpacity
            onPress={() => router.push('/(billing)')}
            style={{
              backgroundColor: colors.surface2,
              borderWidth: 1.5,
              borderColor: colors.line,
              borderRadius: direction === 'A' ? 4 : 10,
              paddingVertical: 13,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, color: colors.ink }}>
              Gerenciar assinatura →
            </Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
