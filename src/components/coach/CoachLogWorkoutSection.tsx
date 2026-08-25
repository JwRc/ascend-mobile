import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { Card } from '@/components/shared/Card';
import { useStrengthStore } from '@/store/strength.store';
import { todayISO } from '@/lib/utils';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

type Props = {
  studentId: string;
  studentName: string;
  units: 'kg' | 'lb';
};

// Permite ao coach registrar, em tempo real, um treino em nome de um aluno —
// equivalente ao /coach/roster/:id/treino/ativo do web. A tela em si é a mesma
// tela dedicada de treino (ActiveWorkoutScreen) usada pelo aluno — `forStudent`
// na sessão ativa é o que a direciona pras rotas for-student do backend.
export function CoachLogWorkoutSection({ studentId, studentName, units }: Props) {
  const { colors, radius, direction } = useTheme();
  const { activeSession, setActiveSession } = useStrengthStore();

  const isMine = activeSession?.forStudent?.id === studentId;
  const blockedByOther = !!activeSession && !isMine;

  function startSession() {
    if (blockedByOther) return;
    setActiveSession({
      id: uid(),
      date: todayISO(),
      templateId: null,
      templateName: `Treino · ${studentName}`,
      programId: null,
      programName: null,
      yolo: true,
      startedAt: null,
      accumulatedSec: 0,
      targetMin: null,
      exercises: [],
      status: 'IN_PROGRESS',
      forStudent: { id: studentId, name: studentName, units },
    });
    router.push('/(coach)/workout/active' as any);
  }

  return (
    <View style={{ gap: 10 }}>
      <Text
        style={{
          fontFamily: 'HankenGrotesk_700Bold',
          fontSize: 11.5,
          letterSpacing: 0.7,
          textTransform: 'uppercase',
          color: colors.ink3,
        }}
      >
        Treino
      </Text>
      <Card style={{ gap: 12 }}>
        <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13.5, color: colors.ink2, lineHeight: 19 }}>
          {isMine
            ? `Você tem uma sessão em andamento para ${studentName}.`
            : blockedByOther
            ? `Você já tem uma sessão em andamento (${activeSession?.forStudent?.name ?? 'sua própria'}). Finalize ou descarte antes de registrar um treino para ${studentName}.`
            : `Registre em tempo real um treino enquanto acompanha ${studentName} na academia.`}
        </Text>
        <TouchableOpacity
          onPress={isMine ? () => router.push('/(coach)/workout/active' as any) : startSession}
          disabled={blockedByOther}
          style={{
            backgroundColor: blockedByOther ? colors.line : colors.accent,
            borderRadius: direction === 'A' ? 4 : radius.cardSm,
            paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, color: '#fff' }}>
            {isMine ? 'Continuar sessão' : `Iniciar sessão para ${studentName.split(' ')[0]}`}
          </Text>
        </TouchableOpacity>
      </Card>
    </View>
  );
}
