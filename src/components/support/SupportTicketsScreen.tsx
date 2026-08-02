import React from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { useSupportTickets, type SupportTicket } from '@/api/hooks/useSupportTickets';
import { TicketStatusPill } from './TicketStatusPill';
import { NewTicketModal } from './NewTicketModal';

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

type Props = { basePath: string };

export function SupportTicketsScreen({ basePath }: Props) {
  const { colors, direction } = useTheme();
  const { data: tickets, isFetching, refetch } = useSupportTickets();
  const [showNew, setShowNew] = React.useState(false);

  function openTicket(id: string) {
    router.push({ pathname: `${basePath}/[ticketId]` as any, params: { ticketId: id } });
  }

  function renderItem({ item }: { item: SupportTicket }) {
    return (
      <TouchableOpacity
        onPress={() => openTicket(item.id)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.line,
        }}
        activeOpacity={0.6}
      >
        <View style={{ flex: 1, gap: 6 }}>
          <Text
            style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 14.5, color: colors.ink }}
            numberOfLines={1}
          >
            {item.subject}
          </Text>
          <TicketStatusPill status={item.status} />
        </View>
        <Text style={{ fontFamily: 'HankenGrotesk_500Medium', fontSize: 11.5, color: colors.ink3 }}>
          {formatDate(item.lastUpdatedAt)}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* top bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1.5,
          borderBottomColor: colors.line,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink2 }}>
              ← Voltar
            </Text>
          </TouchableOpacity>
          <Text
            style={{
              fontFamily: 'Archivo_800ExtraBold',
              fontSize: 20,
              letterSpacing: direction === 'A' ? 0 : -0.3,
              color: colors.ink,
            }}
          >
            Suporte
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowNew(true)}
          style={{
            backgroundColor: colors.accent,
            borderRadius: direction === 'A' ? 4 : 10,
            paddingHorizontal: 14,
            paddingVertical: 9,
          }}
        >
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, color: '#fff' }}>
            Abrir ticket
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tickets ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.ink3} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text
              style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink3 }}
            >
              {tickets === undefined ? 'Carregando…' : 'Nenhum ticket aberto ainda.'}
            </Text>
          </View>
        }
      />

      <NewTicketModal
        visible={showNew}
        onClose={() => setShowNew(false)}
        onCreated={(ticketId) => openTicket(ticketId)}
      />
    </SafeAreaView>
  );
}
