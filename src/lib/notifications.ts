import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { api } from '@/api/client';

const PUSH_TOKEN_KEY = 'pushToken';
const PROJECT_ID = 'd1b4c973-825b-483f-8ea2-8d9a7849e3a6';

export async function registerPushToken(): Promise<void> {
  try {
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
