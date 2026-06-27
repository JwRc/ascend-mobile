import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useTheme } from '@/theme';
import { Logo } from '@/components/shared/Logo';
import { Btn } from '@/components/shared/Btn';
import { Field, StyledInput } from '@/components/shared/Field';
import { useAuthStore, type UserRole } from '@/store/auth.store';
import { authClient, persistToken, persistRememberMeToken } from '@/lib/auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

async function fetchRememberMeToken() {
  try {
    const res = await fetch(`${API_URL}/remember-me`, { method: 'POST' });
    if (res.ok) {
      const { token } = await res.json();
      if (token) await persistRememberMeToken(token);
    }
  } catch {
    // não crítico — usuário ainda está autenticado online
  }
}

WebBrowser.maybeCompleteAuthSession();

const BETTER_AUTH_URL = process.env.EXPO_PUBLIC_BETTER_AUTH_URL ?? '';
const APP_SCHEME = 'ascentio';

export default function LoginScreen() {
  const { colors, radius, direction } = useTheme();
  const { setSession, setSubscriptionExpired } = useAuthStore();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [socialLoading, setSocialLoading] = React.useState<'google' | 'apple' | null>(null);

  function validate() {
    if (!/.+@.+\..+/.test(email)) {
      setError('Informe um e-mail válido.');
      return false;
    }
    if (password.length < 4) {
      setError('A senha deve ter pelo menos 4 caracteres.');
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: authError } = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });
      if (authError || !data) {
        const status = (authError as any)?.status ?? (authError as any)?.statusCode;
        if (status === 402) {
          setSubscriptionExpired(true);
          router.replace('/(billing)');
          return;
        }
        setError(authError?.message ?? 'Falha no login. Tente novamente.');
        return;
      }
      const token = (data as any).session?.token ?? (data as any).token;
      if (token) await persistToken(token);
      const user = (data as any).user;
      const role: UserRole = user?.role === 'COACH' ? 'COACH' : 'STUDENT';
      setSession(user?.id ?? '', user?.email ?? email, role);
      await fetchRememberMeToken();
      router.replace(role === 'COACH' ? '/(coach)' : '/(app)');
    } catch (e: any) {
      const status = e?.status ?? e?.response?.status ?? e?.statusCode;
      if (status === 402) {
        setSubscriptionExpired(true);
        router.replace('/(billing)');
        return;
      }
      setError(e?.message ?? 'Falha no login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSocialSession(token: string) {
    await persistToken(token);
    const { data } = await authClient.getSession();
    const user = (data as any)?.user;
    const role: UserRole = user?.role === 'COACH' ? 'COACH' : 'STUDENT';
    setSession(user?.id ?? '', user?.email ?? '', role);
    await fetchRememberMeToken();
    router.replace(role === 'COACH' ? '/(coach)' : '/(app)');
  }

  async function handleGoogleLogin() {
    setSocialLoading('google');
    setError('');
    try {
      const callbackURL = `${APP_SCHEME}://auth-callback`;
      // Request the OAuth redirect URL from better-auth
      const res = await fetch(`${BETTER_AUTH_URL}/auth/sign-in/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'google', callbackURL }),
        redirect: 'manual',
      });
      const location = res.headers.get('location') ?? (await res.json().catch(() => ({}))).url;
      if (!location) {
        setError('Google ainda não configurado. Aguarde.');
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(location, callbackURL);
      if (result.type === 'success') {
        const token = new URL(result.url).searchParams.get('token');
        if (token) await handleSocialSession(token);
      }
    } catch {
      setError('Não foi possível entrar com Google.');
    } finally {
      setSocialLoading(null);
    }
  }

  async function handleAppleLogin() {
    setSocialLoading('apple');
    setError('');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        setError('Apple não retornou token. Tente novamente.');
        return;
      }
      // Send the identity token to better-auth for verification
      const res = await fetch(`${BETTER_AUTH_URL}/auth/sign-in/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'apple',
          idToken: credential.identityToken,
          callbackURL: `${APP_SCHEME}://auth-callback`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      const token = data?.session?.token ?? data?.token;
      if (token) {
        await handleSocialSession(token);
      } else {
        setError('Apple ainda não configurado. Aguarde.');
      }
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        setError('Não foi possível entrar com Apple.');
      }
    } finally {
      setSocialLoading(null);
    }
  }

  const btnRadius = direction === 'A' ? 4 : 10;

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
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={{ paddingVertical: 6, alignSelf: 'flex-start' }}>
          <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink2 }}>
            ← Voltar
          </Text>
        </TouchableOpacity>

        {/* card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1.5,
            borderColor: colors.line,
            borderRadius: radius.card,
            padding: 30,
            gap: 18,
          }}
        >
          <Logo size={24} />

          <Text
            style={{
              fontFamily: 'Archivo_900Black',
              fontSize: 34,
              letterSpacing: -0.5,
              color: colors.ink,
              marginTop: 4,
            }}
          >
            Entrar.
          </Text>

          {/* social buttons */}
          <View style={{ gap: 10 }}>
            <TouchableOpacity
              onPress={handleGoogleLogin}
              disabled={socialLoading !== null}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                height: 50,
                borderRadius: btnRadius,
                borderWidth: 1.5,
                borderColor: colors.line,
                backgroundColor: colors.surface,
                opacity: socialLoading === 'google' ? 0.6 : 1,
              }}
            >
              {/* Google "G" mark */}
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: '#4285F4',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12, color: '#fff', lineHeight: 14 }}>
                  G
                </Text>
              </View>
              <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14.5, color: colors.ink }}>
                {socialLoading === 'google' ? 'Abrindo…' : 'Continuar com Google'}
              </Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={
                  colors.bg === '#08080a'
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={btnRadius}
                style={{ height: 50 }}
                onPress={handleAppleLogin}
              />
            )}
          </View>

          {/* divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, height: 1.5, backgroundColor: colors.line }} />
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.ink3 }}>
              ou
            </Text>
            <View style={{ flex: 1, height: 1.5, backgroundColor: colors.line }} />
          </View>

          <View style={{ gap: 16 }}>
            <Field label="E-mail">
              <StyledInput
                value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }}
                placeholder="voce@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </Field>

            <Field label="Senha">
              <StyledInput
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                placeholder="••••••••"
                secureTextEntry
              />
            </Field>

            {error !== '' && (
              <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13.5, color: '#e5484d' }}>
                {error}
              </Text>
            )}

            <Btn kind="primary" full onPress={handleSubmit} loading={loading}>
              Entrar
            </Btn>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
