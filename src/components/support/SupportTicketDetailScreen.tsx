import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/theme';
import { useSupportTicket, useReplyToTicket, useCloseTicket } from '@/api/hooks/useSupportTickets';
import { TicketStatusPill, isTicketClosed } from './TicketStatusPill';
import { SendIcon } from '@/components/shared/SendIcon';

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('pt-BR');
}

type Props = { ticketId: string };

export function SupportTicketDetailScreen({ ticketId }: Props) {
  const { colors, direction } = useTheme();
  const { data: ticket, isError, isLoading } = useSupportTicket(ticketId);
  const replyToTicket = useReplyToTicket(ticketId);
  const closeTicket = useCloseTicket(ticketId);
  const [message, setMessage] = React.useState('');
  const scrollRef = React.useRef<ScrollView>(null);

  async function handleSend() {
    if (!message.trim() || replyToTicket.isPending) return;
    const text = message.trim();
    setMessage('');
    await replyToTicket.mutateAsync(text).catch(() => setMessage(text));
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink3 }}>Carregando…</Text>
      </SafeAreaView>
    );
  }

  if (isError || !ticket) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink3 }}>
          Ticket não encontrado.
        </Text>
      </SafeAreaView>
    );
  }

  const closed = isTicketClosed(ticket.status);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* top bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderBottomWidth: 1.5,
            borderBottomColor: colors.line,
          }}
        >
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink2 }}>
              ← Meus tickets
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6, gap: 8 }}>
          <TicketStatusPill status={ticket.status} />
          <Text
            style={{
              fontFamily: 'Archivo_800ExtraBold',
              fontSize: 19,
              letterSpacing: direction === 'A' ? 0 : -0.3,
              color: colors.ink,
            }}
          >
            {ticket.subject}
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 14, gap: 10 }}
        >
          {ticket.messages.map((m, i) => (
            <View
              key={i}
              style={{
                maxWidth: '82%',
                alignSelf: m.isFromSupport ? 'flex-start' : 'flex-end',
                backgroundColor: m.isFromSupport ? colors.surface2 : colors.accent,
                borderRadius: direction === 'A' ? 4 : 14,
                paddingHorizontal: 14,
                paddingVertical: 10,
                gap: 4,
              }}
            >
              <Text
                style={{
                  fontFamily: 'HankenGrotesk_500Medium',
                  fontSize: 14.5,
                  lineHeight: 20,
                  color: m.isFromSupport ? colors.ink : '#fff',
                }}
              >
                {m.content}
              </Text>
              <Text
                style={{
                  fontFamily: 'HankenGrotesk_500Medium',
                  fontSize: 10.5,
                  color: m.isFromSupport ? colors.ink3 : 'rgba(255,255,255,0.75)',
                  alignSelf: 'flex-end',
                }}
              >
                {formatDateTime(m.createdAt)}
              </Text>
            </View>
          ))}
        </ScrollView>

        {!closed && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: 10,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderTopWidth: 1.5,
              borderTopColor: colors.line,
            }}
          >
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Escreva uma mensagem…"
              placeholderTextColor={colors.ink3}
              multiline
              style={{
                flex: 1,
                maxHeight: 100,
                fontFamily: 'HankenGrotesk_500Medium',
                fontSize: 14.5,
                color: colors.ink,
                backgroundColor: colors.surface2,
                borderWidth: 1.5,
                borderColor: colors.line,
                borderRadius: direction === 'A' ? 4 : 18,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={replyToTicket.isPending || !message.trim()}
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: message.trim() ? colors.accent : colors.line,
              }}
            >
              <SendIcon size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {!closed && (
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingBottom: 16 }}>
            <TouchableOpacity
              onPress={() => closeTicket.mutate(false)}
              disabled={closeTicket.isPending}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: direction === 'A' ? 4 : 10,
                borderWidth: 1.5,
                borderColor: colors.line,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink2 }}>
                Marcar como não solucionado
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => closeTicket.mutate(true)}
              disabled={closeTicket.isPending}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: direction === 'A' ? 4 : 10,
                borderWidth: 1.5,
                borderColor: colors.line,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink2 }}>
                Marcar como solucionado
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
