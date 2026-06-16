Login bem-sucedido
↓
Salva token + dados do usuário localmente (criptografado)
↓
App inicia → verifica sessão local primeiro
↓
┌── tem sessão local? → deixa o usuário usar o app
└── não tem? → mostra tela de login
↓
Em background, quando tiver internet → valida/renova o token com o backend

Validar o JWT localmente no mobile:
import \* as jose from 'jose'; // funciona no React Native

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
...sua chave pública RSA...
-----END PUBLIC KEY-----`;

async function validateOfflineSession(): Promise<SessionStatus> {
const raw = await SecureStore.getItemAsync('offline_token');
if (!raw) return { valid: false, reason: 'no_session' };

try {
const { payload } = await jose.jwtVerify(raw, await jose.importSPKI(PUBLIC_KEY, 'RS256'));

    const now = Date.now() / 1000;

    // assinatura expirou → precisa ir online para renovar
    if (payload.offlineGraceUntil < now) {
      return { valid: false, reason: 'grace_expired' };
    }

    // assinatura do plano expirou mesmo dentro do grace period
    if (payload.subscriptionExpiresAt < now) {
      return { valid: false, reason: 'subscription_expired' };
    }

    return { valid: true, payload };

} catch {
return { valid: false, reason: 'invalid_token' };
}
}

Proteção extra: impedir adulteração do token salvo
tsimport \* as SecureStore from 'expo-secure-store';

// SecureStore já usa Keychain (iOS) e EncryptedSharedPreferences (Android)
// o token não é acessível fora do app, nem com root básico
await SecureStore.setItemAsync('offline_token', token, {
keychainAccessible: SecureStore.WHEN_UNLOCKED, // só com device desbloqueado
});
