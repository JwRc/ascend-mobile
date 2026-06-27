import React from 'react';
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/theme';
import { Btn } from '@/components/shared/Btn';
import { Logo } from '@/components/shared/Logo';
import { api } from '@/api/client';

type InviteData = {
  id: string;
  invite: {
    name: string;
    contact: string;
    contactType: 'email' | 'phone';
    units: 'kg' | 'lb';
  };
  coach: { coachName: string };
  program?: { id: string; name: string } | null;
  accepted?: boolean;
};

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { colors, radius } = useTheme();
  const [invite, setInvite] = React.useState<InviteData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);

  React.useEffect(() => {
    if (!token) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    api
      .post<InviteData>('/invites/resolve', { token })
      .then((res) => {
        if (!res.data || res.data.accepted) {
          setNotFound(true);
        } else {
          setInvite(res.data);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  if (notFound || !invite) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26, gap: 20 }}>
          <Logo size={24} />
          <Text
            style={{
              fontFamily: 'Archivo_900Black',
              fontSize: 28,
              color: colors.ink,
              textAlign: 'center',
              letterSpacing: -0.5,
            }}
          >
            Convite não encontrado
          </Text>
          <Text
            style={{
              fontFamily: 'HankenGrotesk_400Regular',
              fontSize: 15,
              color: colors.ink2,
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            Este convite pode ter expirado ou já foi utilizado.
          </Text>
          <Btn kind="ghost" full onPress={() => router.replace('/')}>
            Voltar ao início
          </Btn>
        </View>
      </SafeAreaView>
    );
  }

  function handleAccept() {
    router.push({
      pathname: '/(signup)/invited',
      params: {
        token: token ?? '',
        name: invite!.invite.name ?? '',
        email: invite!.invite.contactType === 'email' ? invite!.invite.contact : '',
        units: invite!.invite.units ?? 'kg',
        coachName: invite!.coach.coachName ?? '',
        programName: invite!.program?.name ?? '',
      },
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          maxWidth: 480,
          width: '100%',
          alignSelf: 'center',
          paddingHorizontal: 26,
          paddingTop: 32,
          paddingBottom: 40,
          gap: 28,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Logo size={24} />

        <View style={{ gap: 8 }}>
          <Text
            style={{
              fontFamily: 'HankenGrotesk_700Bold',
              fontSize: 12,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: colors.ink3,
            }}
          >
            Convite
          </Text>
          <Text
            style={{
              fontFamily: 'Archivo_900Black',
              fontSize: 34,
              color: colors.ink,
              letterSpacing: -0.5,
              lineHeight: 36,
            }}
          >
            {invite.coach.coachName} convidou você.
          </Text>
          {invite.program && (
            <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.ink2 }}>
              Programa: {invite.program.name}
            </Text>
          )}
        </View>

        <View
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1.5,
            borderColor: colors.line,
            borderRadius: radius.card,
            padding: 20,
            gap: 16,
          }}
        >
          {invite.invite.name ? (
            <InviteRow label="Nome" value={invite.invite.name} colors={colors} />
          ) : null}
          <InviteRow
            label={invite.invite.contactType === 'email' ? 'E-mail' : 'Telefone'}
            value={invite.invite.contact}
            colors={colors}
          />
          <InviteRow
            label="Unidades"
            value={invite.invite.units === 'kg' ? 'Quilogramas (kg)' : 'Libras (lb)'}
            colors={colors}
          />
        </View>

        <View style={{ gap: 10 }}>
          <Btn kind="primary" full onPress={handleAccept}>
            Aceitar e configurar
          </Btn>
          <Btn kind="ghost" full onPress={() => router.replace('/')}>
            Agora não
          </Btn>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InviteRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={{ gap: 3 }}>
      <Text
        style={{
          fontFamily: 'HankenGrotesk_600SemiBold',
          fontSize: 11,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: colors.ink3,
        }}
      >
        {label}
      </Text>
      <Text style={{ fontFamily: 'HankenGrotesk_500Medium', fontSize: 16, color: colors.ink }}>
        {value}
      </Text>
    </View>
  );
}
