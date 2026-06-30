import React from 'react';
import { View, Text, ScrollView, Platform, KeyboardAvoidingView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { Logo } from '@/components/shared/Logo';
import { Btn } from '@/components/shared/Btn';
import { Field, StyledInput } from '@/components/shared/Field';
import { authClient } from '@/lib/auth';

export default function ForgotPasswordScreen() {
  const { colors, radius } = useTheme();
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function handleSubmit() {
    if (!/.+@.+\..+/.test(email)) {
      setError('Informe um e-mail válido.');
      return;
    }
    setLoading(true);
    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: 'ascentio://reset-password',
      });
      setSent(true);
    } catch {
      setError('Não foi possível enviar o link. Tente novamente.');
    } finally {
      setLoading(false);
    }
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
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/login')} style={{ paddingVertical: 6, alignSelf: 'flex-start' }}>
            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink2 }}>
              ← Voltar
            </Text>
          </TouchableOpacity>

          <View style={{ backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.card, padding: 30, gap: 18 }}>
            <Logo size={24} />

            <Text style={{ fontFamily: 'Archivo_900Black', fontSize: 34, letterSpacing: -0.5, color: colors.ink, marginTop: 4 }}>
              Esqueci minha senha.
            </Text>

            {sent ? (
              <View style={{ gap: 16 }}>
                <Text style={{ fontFamily: 'HankenGrotesk_500Medium', fontSize: 15, color: colors.ink2, lineHeight: 24 }}>
                  Enviamos um link para <Text style={{ fontFamily: 'HankenGrotesk_700Bold', color: colors.ink }}>{email}</Text>. Verifique sua caixa de entrada — o link expira em 1 hora.
                </Text>
                <Btn kind="ghost" full onPress={() => router.replace('/(auth)/login')}>
                  Voltar ao login
                </Btn>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                <Text style={{ fontFamily: 'HankenGrotesk_500Medium', fontSize: 14, color: colors.ink2, lineHeight: 22 }}>
                  Digite seu email e enviaremos um link para criar uma nova senha.
                </Text>
                <Field label="E-mail">
                  <StyledInput
                    value={email}
                    onChangeText={(t) => { setEmail(t); setError(''); }}
                    placeholder="voce@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoFocus
                  />
                </Field>
                {error !== '' && (
                  <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13.5, color: '#e5484d' }}>
                    {error}
                  </Text>
                )}
                <Btn kind="primary" full onPress={handleSubmit} loading={loading}>
                  Enviar link
                </Btn>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
