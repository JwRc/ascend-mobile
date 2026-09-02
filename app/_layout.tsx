// @ts-ignore - CSS import handled by NativeWind/metro
import '../src/global.css';
import React from 'react';
import { Animated, View, useColorScheme } from 'react-native';
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
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient } from '@/lib/query-client';
import { persistOptions, reconcileCacheOwner } from '@/lib/query-persist';
import { ThemeContext, buildTheme } from '@/theme';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore, type UserRole } from '@/store/auth.store';
import { useStrengthStore } from '@/store/strength.store';
import { GlobalPrCelebration } from '@/components/strength/GlobalPrCelebration';
import {
  authClient,
  getRememberMeToken,
  parseRememberMeJwt,
  isRememberMeValid,
  refreshRememberMeToken,
  clearToken,
  clearRememberMeToken,
} from '@/lib/auth';
import { stashOrphanedWorkout } from '@/lib/orphaned-session';
import { getLastUser } from '@/lib/last-user';
import { OfflineSync } from '@/components/OfflineSync';
import { OfflineBanner } from '@/components/OfflineBanner';
import { StripeProvider } from '@stripe/stripe-react-native';
import { PostHogProvider } from 'posthog-react-native';
import { posthog, identify } from '@/lib/analytics';
import { registerPushToken, configureNotificationHandling } from '@/lib/notifications';

SplashScreen.preventAutoHideAsync();

async function getSessionOnce() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    return await authClient.getSession({ fetchOptions: { signal: controller.signal } });
  } finally {
    clearTimeout(timeout);
  }
}

// Uma lentidão pontual de rede (comum em wifi de academia) não deve empurrar
// direto pro fallback offline — tenta mais uma vez antes de desistir.
async function getSessionWithRetry() {
  try {
    return await getSessionOnce();
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status ?? err?.statusCode;
    if (status) throw err; // erro de servidor de verdade — não é transitório, não repete
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return getSessionOnce();
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

export default function RootLayout() {
  const { colorScheme, direction, accent } = useUIStore();
  const systemColorScheme = useColorScheme();
  const isDark = colorScheme === 'system' ? systemColorScheme === 'dark' : colorScheme === 'dark';
  const theme = buildTheme(isDark, direction, accent);
  const { setSession, markHydrated, setSubscriptionExpired } = useAuthStore();
  const userId = useAuthStore((s) => s.userId);
  const [sessionChecked, setSessionChecked] = React.useState(false);
  const [cacheRestored, setCacheRestored] = React.useState(false);
  const [strengthHydrated, setStrengthHydrated] = React.useState(
    () => useStrengthStore.persist.hasHydrated(),
  );

  // Ao trocar de conta no mesmo aparelho, zera o cache persistido de quem logou
  // antes (o persist-client restaura o último cache salvo, seja de quem for).
  React.useEffect(() => {
    if (userId) void reconcileCacheOwner(queryClient, userId);
  }, [userId]);

  React.useEffect(() => {
    if (strengthHydrated) return;
    const unsub = useStrengthStore.persist.onFinishHydration(() => setStrengthHydrated(true));
    return unsub;
  }, [strengthHydrated]);

  const [fontsLoaded, fontError] = useFonts({
    Archivo_800ExtraBold,
    Archivo_900Black,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
  });
  const fontsReady = fontsLoaded || !!fontError;

  React.useEffect(() => {
    configureNotificationHandling(() => useAuthStore.getState().role);
  }, []);

  React.useEffect(() => {
    let released = false;
    const releaseBoot = () => {
      if (released) return;
      released = true;
      markHydrated();
      setSessionChecked(true);
    };

    // Consulta o servidor e concilia a sessão. Usada tanto no caminho bloqueante
    // (sem token offline válido) quanto em background (já liberamos o boot a
    // partir do token). Retorna true se o servidor respondeu qualquer coisa.
    async function syncWithServer(): Promise<boolean> {
      try {
        const { data } = await getSessionWithRetry();
        if (data?.session && data?.user) {
          const u = data.user as { id: string; email: string; name?: string | null; role?: string; tenantId?: string | null };
          const role: UserRole = u.role === 'COACH' ? 'COACH' : 'STUDENT';
          setSession(u.id, u.email, role, { name: u.name ?? null, tenantId: u.tenantId ?? null });
          identify(u.id, role.toLowerCase());
          void registerPushToken();
          void refreshRememberMeToken(true);
          return true;
        }
        // Servidor respondeu mas não há sessão → derruba a sessão offline otimista
        await useAuthStore.getState().clearSession();
        return true;
      } catch (err: any) {
        const status = err?.status ?? err?.response?.status ?? err?.statusCode;
        if (status === 402) {
          setSubscriptionExpired(true);
          router.replace('/(billing)');
          return true;
        }
        return !!status; // status presente = servidor respondeu com erro HTTP
      }
    }

    async function restoreSession() {
      // 1) Sessão offline a partir do JWT remember-me (rápido, sem rede). Se
      // válida (regra de grace intocada em isRememberMeValid), libera o boot
      // IMEDIATAMENTE e concilia com o servidor em background.
      let hydratedFromToken = false;
      try {
        const token = await getRememberMeToken();
        const claims = token ? parseRememberMeJwt(token) : null;
        if (claims && isRememberMeValid(claims)) {
          const role: UserRole = claims.role === 'COACH' ? 'COACH' : 'STUDENT';
          const last = await getLastUser();
          setSession(claims.userId, claims.email, role, {
            name: last?.userId === claims.userId ? last.name : null,
            tenantId: claims.tenantId ?? null,
            plan: claims.plan,
            offlineGraceUntil: claims.offlineGraceUntil,
            isOfflineSession: true,
          });
          identify(claims.userId, role.toLowerCase());
          void registerPushToken();
          hydratedFromToken = true;
          releaseBoot();
          // background: promove/corrige a sessão (name real, role, tenantId),
          // trata 402 e "sem sessão". Não bloqueia o boot.
          void syncWithServer();
        } else if (claims) {
          // Janela offline (7 dias) vencida — expira localmente. Preserva um
          // treino não sincronizado sob o userId e limpa os tokens.
          void (async () => {
            try {
              await stashOrphanedWorkout(claims.userId);
            } finally {
              await clearToken().catch(() => {});
              await clearRememberMeToken().catch(() => {});
            }
          })();
        }
      } catch {
        // JWT corrompido — segue pro caminho bloqueante
      }

      if (hydratedFromToken) return;

      // 2) Sem token offline utilizável — caminho bloqueante: só libera o boot
      // depois da resposta do servidor (ou do timeout de rede).
      await syncWithServer();
    }

    restoreSession().finally(releaseBoot);
  }, []);

  // Esconde o splash nativo no primeiro render — o BootScreen cobre tudo com o mesmo fundo
  React.useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  // Rede de segurança: se a restauração do cache travar (persister com problema),
  // não deixa o BootScreen preso pra sempre — segue sem cache persistido.
  React.useEffect(() => {
    const t = setTimeout(() => setCacheRestored(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // O PersistQueryClientProvider precisa estar MONTADO pra restaurar o cache do
  // disco — por isso o BootScreen renderiza dentro dele, não antes. `ready` só
  // libera quando sessão, fontes, strength store e cache do React Query estão
  // prontos.
  const ready = fontsReady && sessionChecked && strengthHydrated && cacheRestored;

  return (
    <PostHogProvider client={posthog ?? undefined}>
      <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''}>
        <SafeAreaProvider>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={persistOptions}
            onSuccess={() => setCacheRestored(true)}
          >
            <ThemeContext.Provider value={theme}>
              <StatusBar style={isDark ? 'light' : 'dark'} />
              {ready ? (
                <>
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
                  <GlobalPrCelebration />
                  <OfflineSync />
                  <OfflineBanner />
                </>
              ) : (
                <BootScreen accent={accent} />
              )}
            </ThemeContext.Provider>
          </PersistQueryClientProvider>
        </SafeAreaProvider>
      </StripeProvider>
    </PostHogProvider>
  );
}
