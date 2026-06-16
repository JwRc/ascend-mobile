import { createAuthClient } from 'better-auth/client';
import * as SecureStore from 'expo-secure-store';

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_BETTER_AUTH_URL ?? '',
  fetchOptions: {
    customFetchImpl: async (url, options) => {
      const token = await SecureStore.getItemAsync('auth_token');
      const headers = new Headers(options?.headers);
      if (token) headers.set('Authorization', `Bearer ${token}`);
      // React Native's fetch doesn't send Origin — better-auth requires it for CSRF validation
      headers.set('Origin', process.env.EXPO_PUBLIC_BETTER_AUTH_URL ?? '');
      return fetch(url, { ...options, headers });
    },
  },
});

export async function persistToken(token: string) {
  await SecureStore.setItemAsync('auth_token', token);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync('auth_token');
}
