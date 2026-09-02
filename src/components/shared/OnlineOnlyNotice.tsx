import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/theme';

/**
 * Placeholder pra seções que dependem de serviços externos (Suporte / Request
 * Tracker, Billing / Stripe) e não têm como funcionar offline.
 */
export function OnlineOnlyNotice({ title, message }: { title: string; message: string }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 20, paddingVertical: 14 }}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink2 }}>
            ← Voltar
          </Text>
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 }}>
        <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 18, color: colors.ink, textAlign: 'center' }}>
          {title}
        </Text>
        <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.ink3, textAlign: 'center', lineHeight: 20 }}>
          {message}
        </Text>
      </View>
    </SafeAreaView>
  );
}
