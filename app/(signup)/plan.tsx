import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { Logo } from '@/components/shared/Logo';
import { usePrices } from '@/api/hooks/useBilling';

function PlanCard({
  title,
  subtitle,
  price,
  period,
  features,
  onPress,
  colors,
  radius,
}: {
  title: string;
  subtitle: string;
  price: string;
  period: string;
  features: string[];
  onPress: () => void;
  colors: any;
  radius: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.line,
        borderRadius: radius.card,
        padding: 24,
        gap: 16,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: 'Archivo_900Black', fontSize: 22, color: colors.ink }}>
          {title}
        </Text>
        <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.ink2 }}>
          {subtitle}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text style={{ fontFamily: 'Archivo_900Black', fontSize: 32, color: colors.accent }}>
          {price}
        </Text>
        <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: colors.ink3 }}>
          {period}
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        {features.map((f, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, color: colors.accent }}>
              ✓
            </Text>
            <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13.5, color: colors.ink2, flex: 1 }}>
              {f}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={{
          backgroundColor: colors.accent,
          borderRadius: radius.card / 2,
          paddingVertical: 14,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: '#fff' }}>
          Escolher {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function PlanScreen() {
  const { colors, radius } = useTheme();
  const { data: prices } = usePrices();

  const standalonePrice = prices?.standalone
    ? `R$ ${prices.standalone.price.toFixed(2).replace('.', ',')}`
    : 'R$ —';

  const coachPrice = prices?.coach
    ? `R$ ${prices.coach.basePrice.toFixed(2).replace('.', ',')}`
    : 'R$ —';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          maxWidth: 480,
          width: '100%',
          alignSelf: 'center',
          paddingHorizontal: 26,
          paddingTop: 24,
          paddingBottom: 40,
          gap: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ paddingVertical: 6 }}>
            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink2 }}>
              ← Voltar
            </Text>
          </TouchableOpacity>
          <Logo size={22} />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: colors.ink3 }}>
            Escolha seu plano
          </Text>
          <Text style={{ fontFamily: 'Archivo_900Black', fontSize: 30, color: colors.ink, letterSpacing: -0.5 }}>
            Como você vai usar o Ascend?
          </Text>
          <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, color: colors.ink2, lineHeight: 22 }}>
            30 dias grátis · Cancele quando quiser
          </Text>
        </View>

        <PlanCard
          title="Individual"
          subtitle="Acompanhe seu próprio progresso"
          price={standalonePrice}
          period="/mês"
          features={[
            'Tracking de peso com tendência de 56 dias',
            'Monitoramento de força e PRs',
            'Metas e progresso personalizado',
            'Lembretes diários',
          ]}
          onPress={() => router.push('/(signup)/standalone')}
          colors={colors}
          radius={radius}
        />

        <PlanCard
          title="Coach"
          subtitle="Gerencie seus alunos e treinos"
          price={coachPrice}
          period={`/mês · até ${prices?.coach?.baseStudents ?? 5} alunos`}
          features={[
            `Inclui ${prices?.coach?.baseStudents ?? 5} alunos (+ R$ ${prices?.coach?.extraStudentPrice?.toFixed(2).replace('.', ',') ?? '10,00'}/aluno extra)`,
            'Dashboard com progresso de todos os alunos',
            'Criação de programas de treino',
            'Convite de alunos por link ou e-mail',
          ]}
          onPress={() => router.push('/(signup)/coach')}
          colors={colors}
          radius={radius}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
