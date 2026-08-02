import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme';
import type { TicketStatus } from '@/api/hooks/useSupportTickets';

const LABELS: Record<TicketStatus, string> = {
  new: 'Novo',
  open: 'Aberto',
  stalled: 'Em espera',
  resolved: 'Solucionado',
  rejected: 'Não solucionado',
  deleted: 'Removido',
};

export function isTicketClosed(status: TicketStatus): boolean {
  return status === 'resolved' || status === 'rejected';
}

export function TicketStatusPill({ status }: { status: TicketStatus }) {
  const { colors } = useTheme();
  const closed = isTicketClosed(status);

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: closed ? colors.surface2 : `${colors.accent}1a`,
        borderWidth: 1,
        borderColor: closed ? colors.line : colors.accent,
      }}
    >
      <Text
        style={{
          fontFamily: 'HankenGrotesk_700Bold',
          fontSize: 11.5,
          color: closed ? colors.ink3 : colors.accent,
        }}
      >
        {LABELS[status] ?? status}
      </Text>
    </View>
  );
}
