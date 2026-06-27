// @ts-ignore - CSS import handled by NativeWind/metro
import '../src/global.css';
import React from 'react';
import { Animated, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  Archivo_800ExtraBold,
  Archivo_900Black,
} from '@expo-google-fonts/archivo';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from '@expo-google-fonts/hanken-grotesk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeContext, buildTheme } from '@/theme';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore, type UserRole } from '@/store/auth.store';
import {
  authClient,
  getRememberMeToken,
  parseRememberMeJwt,
  isRememberMeValid,
  persistRememberMeToken,
} from '@/lib/auth';
import { StripeProvider } from '@stripe/stripe-react-native';

SplashScreen.preventAutoHideAsync();

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

async function fetchAndStoreRememberMeToken() {
  try {
    const res = await fetch(`${API_URL}/remember-me`, { method: 'POST' });
    if (res.ok) {
      const { token } = await res.json();
      if (token) await persistRememberMeToken(token);
    }
  } catch {
    // sem internet ou backend indisponível — não é crítico
  }
}

// Sem dependência de fontes — usa apenas Views para renderizar imediatamente
function BootScreen({ accent }: { accent: string }) {
  const p1 = React.useRef(new Animated.Value(0)).current;
  const p2 = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const run = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );

    const a1 = run(p1, 0);
    const a2 = run(p2, 750);
    a1.start();
    a2.start();
    return () => {
      a1.stop();
      a2.stop();
    };
  }, []);

  const iconSize = 44;
  const ringSize = iconSize * 1.7;

  const ringStyle = (val: Animated.Value) => ({
    position: 'absolute' as const,
    width: ringSize,
    height: ringSize,
    borderRadius: ringSize / 2,
    borderWidth: 1.5,
    borderColor: accent,
    opacity: val.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.5, 0] }),
    transform: [{ scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.0] }) }],
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#efeeec', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={ringStyle(p1)} />
        <Animated.View style={ringStyle(p2)} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: iconSize * 0.1, height: iconSize }}>
          <View style={{ width: iconSize * 0.26, height: iconSize * 0.45, backgroundColor: '#0e0e10', borderRadius: 1 }} />
          <View style={{ width: iconSize * 0.26, height: iconSize * 0.72, backgroundColor: '#0e0e10', borderRadius: 1 }} />
          <View style={{ width: iconSize * 0.26, height: iconSize, backgroundColor: accent, borderRadius: 1 }} />
        </View>
      </View>
    </View>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

export default function RootLayout() {
  const { isDark, direction, accent } = useUIStore();
  const theme = buildTheme(isDark, direction, accent);
  const { setSession, markHydrated, setSubscriptionExpired } = useAuthStore();
  const [sessionChecked, setSessionChecked] = React.useState(false);

  const [fontsLoaded] = useFonts({
    Archivo_800ExtraBold,
    Archivo_900Black,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
  });

  React.useEffect(() => {
    async function restoreSession() {
      console.log('RESTORE SESSION - início');
      // serverResponded = true quando o servidor devolveu qualquer resposta HTTP
      // (incluindo "sem sessão"). Só usamos offline quando não há resposta de rede.
      let serverResponded = false;
      try {
        const { data } = await authClient.getSession();
        console.log('RESTORE SESSION - resposta', data);

        serverResponded = true;
        if (data?.session && data?.user) {
          console.log('RESTORE SESSION - setSession');
          const u = data.user as { id: string; email: string; role?: string };
          const role: UserRole = u.role === 'COACH' ? 'COACH' : 'STUDENT';
          setSession(u.id, u.email, role);
          fetchAndStoreRememberMeToken();
          return;
        }
        // Servidor respondeu mas não há sessão válida → não usar modo offline
        console.log('RESTORE SESSION - sem sessão');
        return;
      } catch (err: any) {
         console.log('RESTORE SESSION - erro', err);
        const status = err?.status ?? err?.response?.status ?? err?.statusCode;
        if (status === 402) {
          
          setSubscriptionExpired(true);
          router.replace('/(billing)');
          return;
        }
        // status presente = servidor respondeu com erro HTTP → não usar offline
        if (status) serverResponded = true;
        // sem status = erro de rede → servidor inacessível → tenta offline abaixo
      }

      // Só chega aqui quando o servidor estava inacessível (sem internet)
      if (serverResponded) return;

      try {
        const token = await getRememberMeToken();
        if (token) {
          const claims = parseRememberMeJwt(token);
          if (claims && isRememberMeValid(claims)) {
            const role: UserRole = claims.role === 'COACH' ? 'COACH' : 'STUDENT';
            setSession(claims.userId, claims.email, role, {
              plan: claims.plan,
              offlineGraceUntil: claims.offlineGraceUntil,
              isOfflineSession: true,
            });
            return;
          }
        }
      } catch {
        // JWT corrompido ou expirado
      }
    }

    restoreSession().finally(() => {
      markHydrated();
      setSessionChecked(true);
    });
  }, []);

  // Esconde o splash nativo no primeiro render — o BootScreen cobre tudo com o mesmo fundo
  React.useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  if (!fontsLoaded || !sessionChecked) return <BootScreen accent={accent} />;

  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeContext.Provider value={theme}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="invite" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(signup)" />
              <Stack.Screen name="(app)" />
              <Stack.Screen name="(coach)" />
              <Stack.Screen name="(billing)" />
            </Stack>
          </ThemeContext.Provider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </StripeProvider>
  );
}
