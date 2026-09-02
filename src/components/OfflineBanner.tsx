import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, semanticColors } from '@/theme';
import { useOnline } from '@/lib/useOnline';
import { useSyncStore } from '@/store/sync.store';

/**
 * Faixa fina no topo, montada uma vez no root layout. Aparece só quando há algo a
 * comunicar: offline, sincronizando, ou escritas pendentes na fila.
 */
export function OfflineBanner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const online = useOnline();
  const { pendingCount, syncing } = useSyncStore();

  let text: string | null = null;
  let bg = colors.ink;
  if (!online) {
    text = 'Sem conexão — modo offline';
    bg = colors.ink;
  } else if (syncing) {
    text = 'Sincronizando…';
    bg = semanticColors.accentCobalt;
  } else if (pendingCount > 0) {
    text =
      pendingCount === 1
        ? '1 alteração pendente de sincronização'
        : `${pendingCount} alterações pendentes de sincronização`;
    bg = semanticColors.warning;
  }

  if (!text) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        { paddingTop: insets.top + 2, backgroundColor: bg },
      ]}
    >
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingBottom: 4,
    alignItems: 'center',
  },
  text: {
    fontFamily: 'HankenGrotesk_700Bold',
    fontSize: 11.5,
    letterSpacing: 0.3,
    color: '#fff',
  },
});
