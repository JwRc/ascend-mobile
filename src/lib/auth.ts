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

// ─── Remember-Me JWT ──────────────────────────────────────

export type RememberMeClaims = {
  userId: string;
  email: string;
  role: string;
  plan: 'BASE' | 'CUSTOM';
  subscriptionExpiresAt: number | null;
  offlineGraceUntil: number;
  iat: number;
  exp: number;
};

export async function persistRememberMeToken(token: string) {
  await SecureStore.setItemAsync('remember_me_token', token);
}

export async function clearRememberMeToken() {
  await SecureStore.deleteItemAsync('remember_me_token');
}

export async function getRememberMeToken(): Promise<string | null> {
  return SecureStore.getItemAsync('remember_me_token');
}

export function parseRememberMeJwt(token: string): RememberMeClaims | null {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as RememberMeClaims;
  } catch {
    return null;
  }
}

export function isRememberMeValid(claims: RememberMeClaims): boolean {
  return claims.offlineGraceUntil > Math.floor(Date.now() / 1000);
}
