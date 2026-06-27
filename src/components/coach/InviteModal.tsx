import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/theme';
import { AppModal } from '@/components/shared/AppModal';
import { SegmentedControl } from '@/components/shared/SegmentedControl';
import { COACH_ACCOUNT, billingFor, type CoachProgram } from '@/store/coach.store';

type Props = {
  visible: boolean;
  programs: CoachProgram[];
  activeCount: number;
  loading?: boolean;
  error?: string | null;
  onInvite: (payload: {
    name: string;
    email: string;
    contactType: 'email' | 'phone';
    units: 'kg' | 'lb';
    programId: string | null;
  }) => void;
  onClose: () => void;
};

export function InviteModal({ visible, programs, activeCount, loading, error, onInvite, onClose }: Props) {
  const { colors, radius } = useTheme();
  const [name, setName] = React.useState('');
  const [contact, setContact] = React.useState('');
  const [contactType, setContactType] = React.useState<'email' | 'phone'>('email');
  const [units, setUnits] = React.useState<'kg' | 'lb'>('kg');
  const [programId, setProgramId] = React.useState<string | null>(null);
  const [progOpen, setProgOpen] = React.useState(false);

  function reset() {
    setName('');
    setContact('');
    setContactType('email');
    setUnits('kg');
    setProgramId(null);
    setProgOpen(false);
  }

  React.useEffect(() => {
    if (!visible) reset();
  }, [visible]);

  function handleClose() {
    onClose();
  }

  function handleSend() {
    if (!name.trim() || !contact.trim() || loading) return;
    onInvite({ name: name.trim(), email: contact.trim(), contactType, units, programId });
  }

  const billing = billingFor(activeCount + 1);
  const overSeats = activeCount >= COACH_ACCOUNT.includedSeats;
  const selectedProg = programs.find((p) => p.id === programId) ?? null;
  const valid = name.trim().length > 0 && contact.trim().length > 0;

  return (
    <AppModal visible={visible} onClose={handleClose} title="Convidar atleta">
      <View style={{ gap: 18 }}>
            {/* name */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12.5, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.ink3 }}>
                Nome
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nome completo"
                placeholderTextColor={colors.ink3}
                style={{
                  fontFamily: 'HankenGrotesk_600SemiBold',
                  fontSize: 15,
                  color: colors.ink,
                  backgroundColor: colors.surface2,
                  borderWidth: 1.5,
                  borderColor: colors.line,
                  borderRadius: radius.cardSm,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              />
            </View>

            {/* contact type toggle */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12.5, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.ink3 }}>
                Contato
              </Text>
              <SegmentedControl
                options={[
                  { value: 'email', label: 'E-mail' },
                  { value: 'phone', label: 'Telefone' },
                ]}
                value={contactType}
                onChange={(v) => { setContactType(v as 'email' | 'phone'); setContact(''); }}
              />
              <TextInput
                value={contact}
                onChangeText={setContact}
                placeholder={contactType === 'email' ? 'email@exemplo.com' : '+55 11 99999-9999'}
                placeholderTextColor={colors.ink3}
                keyboardType={contactType === 'email' ? 'email-address' : 'phone-pad'}
                autoCapitalize="none"
                style={{
                  fontFamily: 'HankenGrotesk_600SemiBold',
                  fontSize: 15,
                  color: colors.ink,
                  backgroundColor: colors.surface2,
                  borderWidth: 1.5,
                  borderColor: colors.line,
                  borderRadius: radius.cardSm,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              />
            </View>

            {/* units */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12.5, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.ink3 }}>
                Unidades
              </Text>
              <SegmentedControl
                options={[
                  { value: 'kg', label: 'kg' },
                  { value: 'lb', label: 'lb' },
                ]}
                value={units}
                onChange={(v) => setUnits(v as 'kg' | 'lb')}
              />
            </View>

            {/* program (optional) */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12.5, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.ink3 }}>
                Programa (opcional)
              </Text>
              <TouchableOpacity
                onPress={() => setProgOpen(!progOpen)}
                style={{
                  backgroundColor: colors.surface2,
                  borderWidth: 1.5,
                  borderColor: colors.line,
                  borderRadius: radius.cardSm,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: selectedProg ? colors.ink : colors.ink3 }}>
                  {selectedProg ? selectedProg.name : 'Selecionar programa…'}
                </Text>
                <Text style={{ fontSize: 16, color: colors.ink3 }}>{progOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {progOpen && (
                <View
                  style={{
                    backgroundColor: colors.surface,
                    borderWidth: 1.5,
                    borderColor: colors.line,
                    borderRadius: radius.card,
                    overflow: 'hidden',
                  }}
                >
                  <TouchableOpacity
                    onPress={() => { setProgramId(null); setProgOpen(false); }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.line,
                    }}
                  >
                    <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink3 }}>
                      Sem programa
                    </Text>
                  </TouchableOpacity>
                  {programs.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => { setProgramId(p.id); setProgOpen(false); }}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.line,
                        backgroundColor: p.id === programId ? `${colors.accent}12` : undefined,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View>
                        <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, color: colors.ink }}>
                          {p.name}
                        </Text>
                        <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: colors.ink3 }}>
                          {p.focus} · {p.perWeek}×/sem
                        </Text>
                      </View>
                      {p.id === programId && (
                        <Text style={{ fontSize: 16, color: colors.accent }}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* seat note */}
            {overSeats && (
              <View
                style={{
                  backgroundColor: `${colors.accent}12`,
                  borderWidth: 1.5,
                  borderColor: `${colors.accent}40`,
                  borderRadius: radius.cardSm,
                  padding: 12,
                  gap: 3,
                }}
              >
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, color: colors.accent }}>
                  + R$ {COACH_ACCOUNT.pricePerExtra}/mês
                </Text>
                <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12.5, color: colors.ink2 }}>
                  Convidar este atleta adicionará + R$ {COACH_ACCOUNT.pricePerExtra} à sua assinatura
                  (total: R$ {billing.total}/mês).
                </Text>
              </View>
            )}
      </View>

      {/* error */}
      {!!error && (
        <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#e5484d' }}>
          {error}
        </Text>
      )}

      {/* actions */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={handleClose}
            disabled={loading}
            style={{
              flex: 1,
              paddingVertical: 15,
              borderRadius: radius.cardSm,
              borderWidth: 1.5,
              borderColor: colors.line,
              alignItems: 'center',
              opacity: loading ? 0.5 : 1,
            }}
          >
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: colors.ink2 }}>
              Cancelar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSend}
            disabled={!valid || !!loading}
            style={{
              flex: 2,
              paddingVertical: 15,
              borderRadius: radius.cardSm,
              backgroundColor: valid && !loading ? colors.accent : colors.line2,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: '#fff' }}>
              {loading ? 'Enviando...' : 'Enviar convite'}
            </Text>
          </TouchableOpacity>
      </View>
    </AppModal>
  );
}
