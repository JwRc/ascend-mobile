import axios from 'axios';

/**
 * `true` quando o erro veio de falta de rede (timeout, sem conexão, DNS) — ou seja,
 * o servidor nunca respondeu. Distingue "offline" de uma resposta HTTP de erro real
 * (401/402/4xx/5xx), que deve ser tratada normalmente e nunca enfileirada offline.
 */
export function isNetworkError(err: unknown): boolean {
  if (axios.isAxiosError(err)) {
    return !err.response;
  }
  // fetch() cru (better-auth) rejeita com TypeError em falha de rede
  return err instanceof TypeError;
}
