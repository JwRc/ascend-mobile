import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '@/theme';
import { Btn } from '@/components/shared/Btn';
import { Card } from '@/components/shared/Card';
import { AppModal } from '@/components/shared/AppModal';
import {
  useCards,
  useDeleteCard,
  useSetDefaultCard,
  useGetPortalUrl,
  useCancelSubscription,
} from '@/api/hooks/useBilling';
import { useAuthStore } from '@/store/auth.store';

function Badge({ label, active }: { label: string; active: boolean }) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.card / 2,
        backgroundColor: active ? '#22c55e20' : '#e5484d20',
      }}
    >
      <Text
        style={{
          fontFamily: 'HankenGrotesk_700Bold',
          fontSize: 11.5,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: active ? '#22c55e' : '#e5484d',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function BillingScreen() {
  const { colors, radius } = useTheme();
  const { role, subscriptionExpired, setSubscriptionExpired } = useAuthStore();

  const { data: cards, isLoading: cardsLoading } = useCards();
  const deleteCard = useDeleteCard();
  const setDefault = useSetDefaultCard();
  const getPortalUrl = useGetPortalUrl();
  const cancelSub = useCancelSubscription();

  const [cancelModalVisible, setCancelModalVisible] = React.useState(false);
  const [deleteModalCard, setDeleteModalCard] = React.useState<string | null>(null);

  async function handleOpenPortal() {
    try {
      const { url } = await getPortalUrl.mutateAsync();
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o portal. Tente novamente.');
    }
  }

  async function handleCancel() {
    try {
      await cancelSub.mutateAsync();
      setCancelModalVisible(false);
      Alert.alert('Assinatura cancelada', 'Seu acesso continua até o fim do período pago.');
    } catch {
      Alert.alert('Erro', 'Não foi possível cancelar. Tente novamente.');
    }
  }

  async function handleDeleteCard() {
    if (!deleteModalCard) return;
    try {
      await deleteCard.mutateAsync(deleteModalCard);
      setDeleteModalCard(null);
    } catch {
      Alert.alert('Erro', 'Não foi possível remover o cartão. Tente novamente.');
    }
  }

  function goToDashboard() {
    setSubscriptionExpired(false);
    router.replace(role === 'COACH' ? '/(coach)' : '/(app)');
  }

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
        {/* header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: 'Archivo_900Black', fontSize: 28, color: colors.ink, letterSpacing: -0.5 }}>
            Assinatura
          </Text>
          {!subscriptionExpired && (
            <TouchableOpacity onPress={goToDashboard} style={{ paddingVertical: 6 }}>
              <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink2 }}>
                ← Voltar
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* expired banner */}
        {subscriptionExpired && (
          <View
            style={{
              backgroundColor: '#e5484d18',
              borderRadius: radius.card / 2,
              padding: 16,
              gap: 6,
            }}
          >
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: '#e5484d' }}>
              Assinatura expirada
            </Text>
            <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13.5, color: colors.ink2, lineHeight: 20 }}>
              Adicione ou atualize seu método de pagamento para continuar usando o Ascend.
            </Text>
          </View>
        )}

        {/* plano atual */}
        <Card>
          <View style={{ padding: 20, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, color: colors.ink3, textTransform: 'uppercase', letterSpacing: 1 }}>
                Plano atual
              </Text>
              <Badge
                label={subscriptionExpired ? 'Expirado' : 'Ativo'}
                active={!subscriptionExpired}
              />
            </View>
            <Text style={{ fontFamily: 'Archivo_900Black', fontSize: 22, color: colors.ink }}>
              {role === 'COACH' ? 'Coach' : 'Individual'}
            </Text>
          </View>
        </Card>

        {/* cartões */}
        <View style={{ gap: 14 }}>
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: colors.ink }}>
            Métodos de pagamento
          </Text>

          {cardsLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : cards && cards.length > 0 ? (
            <View style={{ gap: 10 }}>
              {cards.map((card) => (
                <Card key={card.id}>
                  <View
                    style={{
                      padding: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                    }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: colors.ink }}>
                        {card.brand} ···· {card.last4}
                      </Text>
                      <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: colors.ink3 }}>
                        Expira {String(card.expMonth).padStart(2, '0')}/{card.expYear}
                      </Text>
                      {card.isDefault && (
                        <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: colors.accent }}>
                          Padrão
                        </Text>
                      )}
                    </View>
                    <View style={{ gap: 8, alignItems: 'flex-end' }}>
                      {!card.isDefault && (
                        <TouchableOpacity onPress={() => setDefault.mutate(card.id)}>
                          <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink2 }}>
                            Definir padrão
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => setDeleteModalCard(card.id)}>
                        <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#e5484d' }}>
                          Remover
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          ) : (
            <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.ink3 }}>
              Nenhum cartão cadastrado.
            </Text>
          )}

          <Btn kind="ghost" full onPress={() => router.push('/(billing)/add-card')}>
            + Adicionar cartão
          </Btn>
        </View>

        {/* histórico / portal */}
        <View style={{ gap: 10 }}>
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: colors.ink }}>
            Histórico de faturas
          </Text>
          <Btn
            kind="ghost"
            full
            onPress={handleOpenPortal}
            loading={getPortalUrl.isPending}
          >
            Abrir portal de faturas
          </Btn>
        </View>

        {/* cancelar */}
        <View style={{ gap: 10, paddingTop: 8, borderTopWidth: 1.5, borderTopColor: colors.line }}>
          <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: colors.ink3, lineHeight: 19 }}>
            Ao cancelar, seu acesso continua até o fim do período pago. Não há reembolso proporcional.
          </Text>
          <Btn kind="danger" full onPress={() => setCancelModalVisible(true)}>
            Cancelar assinatura
          </Btn>
        </View>
      </ScrollView>

      {/* modal confirmação cancelamento */}
      <AppModal
        visible={cancelModalVisible}
        onClose={() => setCancelModalVisible(false)}
        title="Cancelar assinatura"
      >
        <View style={{ gap: 16 }}>
          <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 14.5, color: colors.ink2, lineHeight: 22 }}>
            Tem certeza? Seu acesso continuará até o fim do período pago.
          </Text>
          <Btn kind="danger" full onPress={handleCancel} loading={cancelSub.isPending}>
            Confirmar cancelamento
          </Btn>
          <Btn kind="ghost" full onPress={() => setCancelModalVisible(false)}>
            Manter assinatura
          </Btn>
        </View>
      </AppModal>

      {/* modal confirmação exclusão de cartão */}
      <AppModal
        visible={!!deleteModalCard}
        onClose={() => setDeleteModalCard(null)}
        title="Remover cartão"
      >
        <View style={{ gap: 16 }}>
          <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 14.5, color: colors.ink2, lineHeight: 22 }}>
            Tem certeza que deseja remover este cartão?
          </Text>
          <Btn kind="danger" full onPress={handleDeleteCard} loading={deleteCard.isPending}>
            Remover cartão
          </Btn>
          <Btn kind="ghost" full onPress={() => setDeleteModalCard(null)}>
            Cancelar
          </Btn>
        </View>
      </AppModal>
    </SafeAreaView>
  );
}
