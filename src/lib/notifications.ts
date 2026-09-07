import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router } from 'expo-router';
import { api } from '@/api/client';

const PUSH_TOKEN_KEY = 'pushToken';
const PROJECT_ID = 'd1b4c973-825b-483f-8ea2-8d9a7849e3a6';

// expo-notifications não suporta push remoto no Android Expo Go (removido no SDK 53)
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export async function registerPushToken(): Promise<void> {
  if (isExpoGo && Platform.OS === 'android') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Notificações',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
    await api.post('/notify/devices', {
      token,
      platform: Platform.OS as 'ios' | 'android',
    });
  } catch {
    // Falha silenciosa — push não é crítico para a UX
  }
}

export async function deregisterPushToken(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    if (!token) return;
    await api.delete(`/notify/devices/${encodeURIComponent(token)}`);
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
  } catch {
    // Falha silenciosa — token será desativado em próximo login
  }
}

function routeForNotification(data: Record<string, any> | undefined, role: 'STUDENT' | 'COACH' | null) {
  const isCoach = role === 'COACH';
  const ticketId = data?.ticketId;
  if (ticketId) {
    const encodedTicketId = encodeURIComponent(ticketId as string);
    router.push(
      (isCoach
        ? `/(coach)/support/${encodedTicketId}`
        : `/(app)/support/${encodedTicketId}`) as any,
    );
    return;
  }
  router.push((isCoach ? '/(coach)' : '/(app)/notifications') as any);
}

let handlingConfigured = false;

// Configura o comportamento de notificações push: alerta em primeiro plano e
// navegação ao tocar (app em background ou fechado) — chamado uma vez no boot.
// `getRole` é passado pelo chamador para evitar import circular com auth.store.
export function configureNotificationHandling(getRole: () => 'STUDENT' | 'COACH' | null) {
  if (handlingConfigured) return;
  if (isExpoGo && Platform.OS === 'android') return;
  handlingConfigured = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, any> | undefined;
      routeForNotification(data, getRole());
    });

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
      const data = lastResponse.notification.request.content.data as Record<string, any> | undefined;
      routeForNotification(data, getRole());
    }
  } catch {
    // Falha silenciosa — push não é crítico para a UX
  }
}
