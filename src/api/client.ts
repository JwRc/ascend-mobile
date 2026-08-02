import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import {
  authClient,
  getRememberMeToken,
  parseRememberMeJwt,
  isRememberMeValid,
  refreshRememberMeToken,
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

// Um 401 isolado (ex: refetch de fundo pego no meio de uma rotação de token)
// não deve derrubar a sessão inteira — revalida uma vez antes de desistir.
// 401s concorrentes (vários refetches em paralelo no resume do app) compartilham
// essa mesma checagem em vez de disparar N chamadas e N navegações.
let sessionRevalidation: Promise<boolean> | null = null;
function hasLiveSession(): Promise<boolean> {
  if (!sessionRevalidation) {
    sessionRevalidation = authClient
      .getSession()
      .then(({ data }) => !!(data?.session && data?.user))
      .catch(() => false)
      .finally(() => {
        sessionRevalidation = null;
      });
  }
  return sessionRevalidation;
}

api.interceptors.response.use(
  (res) => {
    // Renova o remember-me a cada resposta autenticada bem-sucedida (throttled
    // internamente) — mantém o fallback offline sempre fresco em sessões longas.
    void refreshRememberMeToken();
    return res;
  },
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
      if (err.response?.data?.code === "COACH_SUBSCRIPTION_EXPIRED") {
        // Grace period do aluno vencido — sem sessão utilizável, manda para o login com a mensagem.
        const message = err.response?.data?.message;
        await useAuthStore.getState().clearSession();
        router.replace({ pathname: "/(auth)/login", params: { notice: message } });
        return Promise.reject(err);
      }
      useAuthStore.getState().setSubscriptionExpired(true);
      router.replace("/(billing)");
      return Promise.reject(err);
    }

    if (err.response?.status === 401) {
      const stillValid = await hasLiveSession();
      if (!stillValid) {
        await useAuthStore.getState().clearSession();
        router.replace("/(auth)/login");
      }
    }

    return Promise.reject(err);
  },
);
