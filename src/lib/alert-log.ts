import { Alert, type AlertButton, type AlertOptions } from 'react-native';
import { capture } from './analytics';

/**
 * Espelha todo `Alert.alert(...)` como um evento `debug_alert` no PostHog.
 *
 * Usado pra acompanhar Alerts de diagnóstico em device real / build de produção,
 * onde não há `console.log`. Chamar `installAlertLogging()` uma vez no boot —
 * a partir daí todo call site de `Alert.alert` no app é capturado sem alteração.
 *
 * Vários Alerts de debug despejam o payload cru da sessão, então título e mensagem
 * passam por `scrub()` antes de sair do aparelho.
 */

function scrub(value: string): string {
  return value
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/(bearer\s+|"?(?:token|jwt|authorization)"?\s*[:=]\s*"?)[A-Za-z0-9._-]{8,}/gi, '$1[redacted]')
    .slice(0, 500);
}

let patched = false;

export function installAlertLogging() {
  if (patched) return;
  patched = true;

  const original = Alert.alert.bind(Alert);

  Alert.alert = ((
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions,
  ) => {
    try {
      capture('debug_alert', {
        title: scrub(String(title ?? '')),
        message: message != null ? scrub(String(message)) : '',
      });
    } catch {
      // logging nunca pode quebrar um Alert
    }
    return original(title, message as string | undefined, buttons, options);
  }) as typeof Alert.alert;
}
