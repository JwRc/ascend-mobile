import React from 'react';
import { Modal, View, Text, TouchableOpacity, Share } from 'react-native';
import * as Sharing from 'expo-sharing';
import type { ViewShotRef } from 'react-native-view-shot';
import { useTheme } from '@/theme';
import { Btn } from '@/components/shared/Btn';
import { capture } from '@/lib/analytics';
import { PrShareCard } from './PrShareCard';

type PR = {
  exercise: string;
  e: number;
  prevBest: number;
  weight: number | null;
  reps: number | null;
};

type Props = {
  visible: boolean;
  prs: PR[];
  unit: 'kg' | 'lb';
  onClose: () => void;
};

export function PrCelebration({ visible, prs, unit, onClose }: Props) {
  const { colors, radius } = useTheme();
  const shotRef = React.useRef<ViewShotRef>(null);
  const [sharing, setSharing] = React.useState(false);

  async function shareAsText() {
    const lines = prs.map(
      (p) => `${p.exercise}: ${p.prevBest}${unit} → ${p.e}${unit}${p.weight != null ? ` (${p.weight}${unit} × ${p.reps})` : ''}`
    );
    const message =
      prs.length === 1
        ? `Novo recorde pessoal no ASCENTIO! 🏆\n\n${lines[0]}`
        : `${prs.length} recordes pessoais no ASCENTIO! 🏆\n\n${lines.join('\n')}`;
    try {
      await Share.share({ message });
      capture('pr_shared', { count: prs.length, mode: 'text' });
    } catch {
      // usuário cancelou o share sheet
    }
  }

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    try {
      const rawUri = await shotRef.current?.capture?.();
      // no iOS o módulo às vezes devolve o path sem o esquema file:// — o
      // expo-sharing exige a URI completa para localizar o arquivo.
      const uri = rawUri && !rawUri.startsWith('file://') && !rawUri.startsWith('content://')
        ? `file://${rawUri}`
        : rawUri;
      const canShare = uri ? await Sharing.isAvailableAsync() : false;
      if (uri && canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Compartilhar recorde',
          UTI: 'public.png',
        });
        capture('pr_shared', { count: prs.length, mode: 'image' });
      } else {
        await shareAsText();
      }
    } catch {
      // captura/compartilhamento de imagem falhou (ex.: sem share sheet no dispositivo) — cai pro texto
      await shareAsText();
    } finally {
      setSharing(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {visible && (
        <View style={{ position: 'absolute', top: -9999, left: -9999, opacity: 0 }} pointerEvents="none">
          <PrShareCard ref={shotRef} prs={prs} unit={unit} />
        </View>
      )}
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <TouchableOpacity activeOpacity={1}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1.5,
              borderColor: colors.line,
              borderRadius: radius.card,
              overflow: 'hidden',
              gap: 20,
            }}
          >
            {/* accent header */}
            <View
              style={{
                backgroundColor: colors.accent,
                padding: 26,
                paddingBottom: 22,
                gap: 4,
              }}
            >
              <Text
                style={{
                  fontFamily: 'HankenGrotesk_700Bold',
                  fontSize: 12,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.92)',
                }}
              >
                {prs.length === 1 ? 'Novo recorde pessoal' : `${prs.length} recordes pessoais`}
              </Text>
              <Text
                style={{
                  fontFamily: 'Archivo_900Black',
                  fontSize: 52,
                  lineHeight: 46,
                  letterSpacing: -1,
                  color: '#fff',
                }}
              >
                {prs.length === 1 ? 'PR!' : 'PRs!'}
              </Text>
            </View>

            {/* PR list */}
            <View style={{ paddingHorizontal: 24, gap: 0 }}>
              {prs.map((p, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    paddingVertical: 13,
                    borderBottomWidth: i < prs.length - 1 ? 1.5 : 0,
                    borderBottomColor: colors.line,
                  }}
                >
                  <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
                    <Text
                      style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 15.5, color: colors.ink }}
                      numberOfLines={1}
                    >
                      {p.exercise}
                    </Text>
                    {p.weight != null && (
                      <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12.5, color: colors.ink3 }}>
                        {p.weight}{unit} × {p.reps}
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                    <Text
                      style={{
                        fontFamily: 'HankenGrotesk_700Bold',
                        fontSize: 14,
                        color: colors.ink3,
                        textDecorationLine: 'line-through',
                      }}
                    >
                      {p.prevBest}{unit}
                    </Text>
                    <Text style={{ color: colors.ink3, fontSize: 13 }}>→</Text>
                    <Text
                      style={{
                        fontFamily: 'Archivo_900Black',
                        fontSize: 24,
                        letterSpacing: -0.5,
                        color: colors.accent,
                      }}
                    >
                      {p.e}
                      <Text style={{ fontSize: 13, fontFamily: 'HankenGrotesk_700Bold', fontWeight: '700' }}>{unit}</Text>
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* action */}
            <View style={{ paddingHorizontal: 24, paddingBottom: 24, gap: 10 }}>
              <Btn kind="ghost" full onPress={handleShare} loading={sharing} disabled={sharing}>
                Compartilhar ↗
              </Btn>
              <Btn kind="primary" full onPress={onClose}>
                Ver progresso →
              </Btn>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
