import React from 'react';
import { View, Text, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme';
import { Logo } from '@/components/shared/Logo';
import { Btn } from '@/components/shared/Btn';
import { Field, StyledInput } from '@/components/shared/Field';
import { authClient } from '@/lib/auth';

export default function ResetPasswordScreen() {
  const { colors, radius } = useTheme();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function handleSubmit() {
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      await authClient.resetPassword({ newPassword: password, token: token! });
      setDone(true);
    } catch {
      setError('Não foi possível redefinir a senha. O link pode ter expirado.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, maxWidth: 460, width: '100%', alignSelf: 'center', paddingHorizontal: 26, paddingVertical: 24, justifyContent: 'center', gap: 18 }}>
          <View style={{ backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.card, padding: 30, gap: 18 }}>
            <Logo size={24} />
            <Text style={{ fontFamily: 'Archivo_900Black', fontSize: 34, letterSpacing: -0.5, color: colors.ink, marginTop: 4 }}>
              Link inválido.
            </Text>
            <Text style={{ fontFamily: 'HankenGrotesk_500Medium', fontSize: 15, color: colors.ink2, lineHeight: 24 }}>
              Este link de redefinição é inválido ou expirou. Solicite um novo.
            </Text>
            <Btn kind="primary" full onPress={() => router.replace('/(auth)/forgot-password')}>
              Solicitar novo link
            </Btn>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (done) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, maxWidth: 460, width: '100%', alignSelf: 'center', paddingHorizontal: 26, paddingVertical: 24, justifyContent: 'center', gap: 18 }}>
          <View style={{ backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.card, padding: 30, gap: 18 }}>
            <Logo size={24} />
            <Text style={{ fontFamily: 'Archivo_900Black', fontSize: 34, letterSpacing: -0.5, color: colors.ink, marginTop: 4 }}>
              Senha redefinida!
            </Text>
            <Text style={{ fontFamily: 'HankenGrotesk_500Medium', fontSize: 15, color: colors.ink2, lineHeight: 24 }}>
              Sua nova senha foi salva com sucesso. Faça login para continuar.
            </Text>
            <Btn kind="primary" full onPress={() => router.replace('/(auth)/login')}>
              Ir para o login
            </Btn>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            maxWidth: 460,
            width: '100%',
            alignSelf: 'center',
            paddingHorizontal: 26,
            paddingVertical: 24,
            justifyContent: 'center',
            gap: 18,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.card, padding: 30, gap: 18 }}>
            <Logo size={24} />

            <Text style={{ fontFamily: 'Archivo_900Black', fontSize: 34, letterSpacing: -0.5, color: colors.ink, marginTop: 4 }}>
              Nova senha.
            </Text>

            <View style={{ gap: 16 }}>
              <Field label="Nova senha">
                <StyledInput
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(''); }}
                  placeholder="Mínimo 8 caracteres"
                  secureTextEntry
                  autoFocus
                />
              </Field>

              <Field label="Confirmar senha">
                <StyledInput
                  value={confirm}
                  onChangeText={(t) => { setConfirm(t); setError(''); }}
                  placeholder="Repita a nova senha"
                  secureTextEntry
                />
              </Field>

              {error !== '' && (
                <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13.5, color: '#e5484d' }}>
                  {error}
                </Text>
              )}

              <Btn kind="primary" full onPress={handleSubmit} loading={loading}>
                Salvar nova senha
              </Btn>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
