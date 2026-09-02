/**
 * Config plugin: engole a NPE upstream do React Native 0.85.x em
 * `ReactActivityDelegate.onUserLeaveHint()` (chama `Objects.requireNonNull(mReactDelegate)`
 * sem null-check). Quando a Activity é pausada antes do delegate inicializar — app mandado
 * pro background durante o boot, dev client recarregando — o app quebra.
 *
 * Injeta um override de `onUserLeaveHint()` na MainActivity.kt com try/catch.
 * Necessário porque `android/` é gerado por prebuild (gitignored) — editar o arquivo
 * direto não sobrevive a `expo prebuild --clean`.
 */
const { withMainActivity } = require('@expo/config-plugins');

const OVERRIDE = `
  // [withUserLeaveHintFix] Workaround p/ NPE upstream do RN 0.85.x em onUserLeaveHint()
  override fun onUserLeaveHint() {
    try {
      super.onUserLeaveHint()
    } catch (e: NullPointerException) {
      // ReactDelegate ainda não inicializado — nada a fazer
    }
  }
`;

module.exports = function withUserLeaveHintFix(config) {
  return withMainActivity(config, (cfg) => {
    const { modResults } = cfg;
    if (modResults.language !== 'kt') {
      throw new Error('withUserLeaveHintFix: espera MainActivity em Kotlin (.kt)');
    }
    if (modResults.contents.includes('[withUserLeaveHintFix]')) {
      return cfg; // já aplicado
    }
    // insere logo após a linha do getMainComponentName()
    const anchor = /override fun getMainComponentName\(\): String = "main"/;
    if (!anchor.test(modResults.contents)) {
      throw new Error('withUserLeaveHintFix: âncora getMainComponentName() não encontrada');
    }
    modResults.contents = modResults.contents.replace(anchor, (m) => `${m}\n${OVERRIDE}`);
    return cfg;
  });
};
