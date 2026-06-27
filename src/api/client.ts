import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import {
  getRememberMeToken,
  parseRememberMeJwt,
  isRememberMeValid,
} from "@/lib/auth";
import { useAuthStore } from "@/store/auth.store";

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    // Sem resposta do servidor = erro de rede (offline)
    if (!err.response) {
      const authToken = await SecureStore.getItemAsync("auth_token");
      // Rota pública (sem token) — não redireciona, deixa o caller tratar
      if (!authToken) return Promise.reject(err);

      const rmToken = await getRememberMeToken();
      if (rmToken) {
        const claims = parseRememberMeJwt(rmToken);
        if (claims && isRememberMeValid(claims)) {
          // Sessão offline ainda válida — deixa o caller tratar o erro de rede
          return Promise.reject(err);
        }
      }
      // Grace period expirado — força logout
      await SecureStore.deleteItemAsync("auth_token");
      router.replace("/(auth)/login");
      return Promise.reject(err);
    }

    if (err.response?.status === 402) {
      useAuthStore.getState().setSubscriptionExpired(true);
      router.replace("/(billing)");
      return Promise.reject(err);
    }

    if (err.response?.status === 401) {
      await useAuthStore.getState().clearSession();
      router.replace("/(auth)/login");
    }

    return Promise.reject(err);
  },
);
