import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import { AppModal } from '@/components/shared/AppModal';
import { useCreateTicket } from '@/api/hooks/useSupportTickets';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated: (ticketId: string) => void;
};

export function NewTicketModal({ visible, onClose, onCreated }: Props) {
  const { colors, radius } = useTheme();
  const createTicket = useCreateTicket();
  const [subject, setSubject] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [err, setErr] = React.useState('');

  React.useEffect(() => {
    if (!visible) {
      setSubject('');
      setMessage('');
      setErr('');
    }
  }, [visible]);

  async function handleSubmit() {
    if (!subject.trim() || !message.trim()) {
      setErr('Preencha o assunto e a mensagem.');
      return;
    }
    try {
      const created = await createTicket.mutateAsync({ subject: subject.trim(), message: message.trim() });
      onClose();
      if (created?.id) onCreated(created.id);
    } catch {
      setErr('Não foi possível abrir o ticket. Tente novamente.');
    }
  }

  const inputStyle = {
    fontFamily: 'HankenGrotesk_600SemiBold' as const,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surface2,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.cardSm,
    paddingHorizontal: 14,
    paddingVertical: 12,
  };

  const labelStyle = {
    fontFamily: 'HankenGrotesk_700Bold' as const,
    fontSize: 12.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    color: colors.ink3,
  };

  return (
    <AppModal visible={visible} onClose={onClose} title="Abrir ticket">
      <View style={{ gap: 6 }}>
        <Text style={labelStyle}>Assunto</Text>
        <TextInput
          value={subject}
          onChangeText={(t) => { setSubject(t); setErr(''); }}
          placeholder="Resuma o problema em poucas palavras"
          placeholderTextColor={colors.ink3}
          style={inputStyle}
        />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={labelStyle}>Mensagem</Text>
        <TextInput
          value={message}
          onChangeText={(t) => { setMessage(t); setErr(''); }}
          placeholder="Descreva o que está acontecendo…"
          placeholderTextColor={colors.ink3}
          multiline
          numberOfLines={5}
          style={[inputStyle, { minHeight: 110, textAlignVertical: 'top' }]}
        />
      </View>

      {!!err && (
        <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#e5484d' }}>
          {err}
        </Text>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          onPress={onClose}
          disabled={createTicket.isPending}
          style={{
            flex: 1,
            paddingVertical: 15,
            borderRadius: radius.cardSm,
            borderWidth: 1.5,
            borderColor: colors.line,
            alignItems: 'center',
            opacity: createTicket.isPending ? 0.5 : 1,
          }}
        >
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: colors.ink2 }}>
            Cancelar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={createTicket.isPending}
          style={{
            flex: 2,
            paddingVertical: 15,
            borderRadius: radius.cardSm,
            backgroundColor: colors.accent,
            alignItems: 'center',
            opacity: createTicket.isPending ? 0.6 : 1,
          }}
        >
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: '#fff' }}>
            {createTicket.isPending ? 'Enviando…' : 'Abrir ticket'}
          </Text>
        </TouchableOpacity>
      </View>
    </AppModal>
  );
}
