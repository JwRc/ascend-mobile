import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * O JWT remember-me não carrega o `name` do usuário. Pra que o cold start offline
 * mostre o nome certo (e não um cabeçalho vazio até a rede voltar), guardamos
 * `{ userId, name }` no disco a cada login/restauração online bem-sucedida e
 * reusamos no restore offline — só quando o `userId` bate com o das claims.
 */
const KEY = 'ascentio-last-user';

export type LastUser = { userId: string; name: string | null };

export async function saveLastUser(user: LastUser): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export async function getLastUser(): Promise<LastUser | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LastUser) : null;
  } catch {
    return null;
  }
}

export async function clearLastUser(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
