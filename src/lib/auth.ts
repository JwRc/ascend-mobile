import { createAuthClient } from 'better-auth/client';
import * as SecureStore from 'expo-secure-store';

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_BETTER_AUTH_URL ?? '',
  basePath: '/auth',
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
  tenantId: string | null;
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

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const REFRESH_THROTTLE_MS = 6 * 60 * 60 * 1000; // 6h
const RETRY_DELAYS_MS = [2000, 6000];

let lastRememberMeAttemptAt = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reemite o JWT de remember-me. Só funciona enquanto a sessão de auth ainda é
 * válida (POST /remember-me exige sessão ativa) — por isso é chamado tanto em
 * momentos-chave (login, cold start online) quanto oportunisticamente a cada
 * resposta autenticada bem-sucedida, pra manter o fallback offline sempre fresco.
 * Fire-and-forget: nunca lança, e o throttle evita chamadas repetidas em sessões
 * longas em foreground.
 */
export async function refreshRememberMeToken(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastRememberMeAttemptAt < REFRESH_THROTTLE_MS) return;
  lastRememberMeAttemptAt = now;

  // POST /remember-me passa pelo AuthGuard global — sem o Bearer aqui, o backend
  // nunca resolve request.user e o endpoint sempre retorna 401.
  const authToken = await SecureStore.getItemAsync('auth_token');
  if (!authToken) return;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(`${API_URL}/remember-me`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const { token } = await res.json();
        if (token) await persistRememberMeToken(token);
        return;
      }
    } catch {
      // tentativa falhou — tenta de novo abaixo, se ainda houver backoff disponível
    }
    if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
  }
}
