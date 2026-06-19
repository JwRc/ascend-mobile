import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useTheme } from '@/theme';
import { Logo } from '@/components/shared/Logo';
import { Btn } from '@/components/shared/Btn';
import { useAuthStore } from '@/store/auth.store';

export default function WelcomeScreen() {
  const { colors, direction } = useTheme();
  const { isAuthenticated, role } = useAuthStore();

  if (isAuthenticated) {
    return <Redirect href={role === 'COACH' ? '/(coach)' : '/(app)'} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          flex: 1,
          maxWidth: 480,
          width: '100%',
          alignSelf: 'center',
          paddingHorizontal: 26,
          paddingTop: 32,
          paddingBottom: 28,
        }}
      >
        {/* top */}
        <View style={{ paddingTop: 8 }}>
          <Logo size={26} />
        </View>

        {/* hero */}
        <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 28 }}>
          <Text
            style={{
              fontFamily: 'HankenGrotesk_700Bold',
              fontSize: 12,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: colors.ink3,
              marginBottom: 14,
            }}
          >
            Tracking de peso, sem ruído
          </Text>

          <Text
            style={{
              fontFamily: 'Archivo_900Black',
              fontSize: 72,
              lineHeight: 66,
              letterSpacing: direction === 'A' ? -0.5 : -2,
              textTransform: direction === 'A' ? 'uppercase' : 'none',
              color: colors.ink,
              marginBottom: 22,
            }}
          >
            {'CADA\nGRAMA\nCONTA.'}
          </Text>

          <Text
            style={{
              fontFamily: 'HankenGrotesk_400Regular',
              fontSize: 17,
              lineHeight: 26,
              color: colors.ink2,
              maxWidth: 320,
              marginBottom: 34,
            }}
          >
            Registre em um toque. Acompanhe a tendência — não o ruído diário — rumo à sua meta.
          </Text>

          <View style={{ gap: 12 }}>
            <Btn kind="primary" full onPress={() => router.push('/(auth)/login')}>
              Entrar
            </Btn>
          </View>

          <Text
            style={{
              marginTop: 18,
              fontFamily: 'HankenGrotesk_600SemiBold',
              fontSize: 13.5,
              color: colors.ink3,
              textAlign: 'center',
              lineHeight: 20,
            }}
          >
            Atletas entram por convite — abra o link que seu coach enviou.
          </Text>
        </View>

        {/* footer */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            paddingTop: 18,
            borderTopWidth: 1.5,
            borderTopColor: colors.line,
          }}
        >
          {['Tendência 56 dias', '·', 'Média móvel', '·', 'Seus números, seu celular'].map((t, i) => (
            <Text
              key={i}
              style={{
                fontFamily: 'HankenGrotesk_600SemiBold',
                fontSize: 11.5,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                color: colors.ink3,
              }}
            >
              {t}
            </Text>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
