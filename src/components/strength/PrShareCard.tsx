import React, { forwardRef } from 'react';
import { View, Text } from 'react-native';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';
import { round1 } from '@/lib/utils';

const BG = '#0b0b0d';
const ACCENT = '#ff5a1f';
const INK = '#f5f4f2';
const INK_2 = '#9a9aa1';
const CARD_W = 380;

type PR = {
  exercise: string;
  e: number;
  prevBest: number;
  weight: number | null;
  reps: number | null;
};

type Props = {
  prs: PR[];
  unit: 'kg' | 'lb';
};

function Bars() {
  const h = 22;
  const heights = [h * 0.45, h * 0.72, h];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: h }}>
      {heights.map((bh, i) => (
        <View
          key={i}
          style={{
            width: 6,
            height: bh,
            borderRadius: 1,
            backgroundColor: i === 2 ? ACCENT : '#fff',
          }}
        />
      ))}
    </View>
  );
}

// Card capturado como imagem para compartilhamento — mesma linguagem visual
// do canvas gerado no web (lib/shareImage.js): fundo escuro, número em
// destaque, recorde anterior + delta. Fica fora da árvore visível, só é
// renderizado enquanto o modal de PR está aberto (ver PrCelebration.tsx).
export const PrShareCard = forwardRef<ViewShotRef, Props>(({ prs, unit }, ref) => {
  const shown = prs.slice(0, 4);
  const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <ViewShot ref={ref} options={{ format: 'png', quality: 1 }} style={{ width: CARD_W, backgroundColor: BG }}>
      <View style={{ width: CARD_W, backgroundColor: BG, padding: 28 }}>
        {/* glow aproximado */}
        <View
          style={{
            position: 'absolute',
            top: -80,
            left: CARD_W / 2 - 160,
            width: 320,
            height: 320,
            borderRadius: 160,
            backgroundColor: ACCENT,
            opacity: 0.14,
          }}
        />

        {/* logo */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Bars />
          <Text style={{ fontFamily: 'Archivo_900Black', fontSize: 15, letterSpacing: 1.4, color: '#fff', textTransform: 'uppercase' }}>
            Ascentio
          </Text>
        </View>

        {/* kicker */}
        <Text
          style={{
            marginTop: 26,
            fontFamily: 'HankenGrotesk_700Bold',
            fontSize: 12,
            letterSpacing: 1.8,
            textTransform: 'uppercase',
            color: ACCENT,
          }}
        >
          {shown.length === 1 ? 'Novo recorde pessoal' : `${shown.length} recordes pessoais`}
        </Text>

        {/* PRs */}
        {shown.map((p, i) => {
          const delta = round1(p.e - p.prevBest);
          return (
            <View
              key={i}
              style={{
                marginTop: 22,
                paddingTop: i > 0 ? 20 : 0,
                borderTopWidth: i > 0 ? 1 : 0,
                borderTopColor: 'rgba(255,255,255,0.14)',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: INK, flexShrink: 1 }} numberOfLines={1}>
                  {p.exercise}
                </Text>
                {p.weight != null && (
                  <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: INK_2 }}>
                    {p.weight}{unit} × {p.reps}
                  </Text>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 10 }}>
                <Text style={{ fontFamily: 'Archivo_900Black', fontSize: 52, letterSpacing: -1, color: ACCENT }}>
                  {p.e}
                </Text>
                <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 17, color: ACCENT, marginLeft: 4 }}>
                  {unit}
                </Text>
              </View>

              <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: INK_2, marginTop: 6 }}>
                recorde anterior {p.prevBest}{unit}{'  '}
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', color: ACCENT }}>+{delta}{unit}</Text>
              </Text>
            </View>
          );
        })}

        <Text style={{ marginTop: 28, fontFamily: 'HankenGrotesk_700Bold', fontSize: 12, color: INK_2 }}>
          {dateStr}
        </Text>
      </View>
    </ViewShot>
  );
});
