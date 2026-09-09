import React, { forwardRef } from 'react';
import { View, Text } from 'react-native';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';
import { round1, kgToUnit } from '@/lib/utils';

// Paleta do card de compartilhamento — alinhada ao card de "Novo recorde pessoal"
// (fundo quase-preto quente, laranja de acento, tons de bege esmaecido).
const COLORS = {
  bg: '#0E0D0C',
  text: '#F2F0EA',
  accent: '#E8622C',
  muted: '#7A7670',
  mutedDark: '#5C5852',
  barBase: '#3A2A20',
  barHighlight: '#6B4A32',
};

const CARD_W = 380;

// Escala de subida estática — reforça a identidade "Ascentio" sem depender de
// histórico real de PRs. As duas últimas barras são destacadas.
const RISE_BARS = [26, 42, 60, 80, 100];

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

function LogoMark() {
  const heights = [9, 14, 20];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 20 }}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={{
            width: 4,
            height: h,
            borderRadius: 1,
            backgroundColor: i === 2 ? COLORS.accent : COLORS.text,
          }}
        />
      ))}
    </View>
  );
}

function RiseScale() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 44, marginTop: 22 }}>
      {RISE_BARS.map((pct, i) => {
        const isLast = i === RISE_BARS.length - 1;
        const isSecondToLast = i === RISE_BARS.length - 2;
        return (
          <View
            key={i}
            style={{
              width: 14,
              height: `${pct}%`,
              borderTopLeftRadius: 3,
              borderTopRightRadius: 3,
              backgroundColor: isLast
                ? COLORS.accent
                : isSecondToLast
                  ? COLORS.barHighlight
                  : COLORS.barBase,
            }}
          />
        );
      })}
    </View>
  );
}

// Card capturado como imagem para compartilhamento — mesma linguagem visual
// do canvas gerado no web (lib/shareImage.js). Fica fora da árvore visível, só é
// renderizado enquanto o modal de PR está aberto (ver PrCelebration.tsx).
export const PrShareCard = forwardRef<ViewShotRef, Props>(({ prs, unit }, ref) => {
  const shown = prs.slice(0, 4);
  const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <ViewShot ref={ref} options={{ format: 'png', quality: 1 }} style={{ width: CARD_W, backgroundColor: COLORS.bg }}>
      <View style={{ width: CARD_W, backgroundColor: COLORS.bg, paddingHorizontal: 26, paddingVertical: 28 }}>
        {/* header / marca */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <LogoMark />
          <Text
            style={{
              fontFamily: 'Archivo_900Black',
              fontSize: 15,
              letterSpacing: 2,
              color: COLORS.text,
              textTransform: 'uppercase',
            }}
          >
            Ascentio
          </Text>
        </View>

        {/* eyebrow */}
        <Text
          style={{
            marginTop: 26,
            fontFamily: 'HankenGrotesk_700Bold',
            fontSize: 12,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: COLORS.accent,
          }}
        >
          {shown.length === 1 ? 'Novo recorde pessoal' : `${shown.length} recordes pessoais`}
        </Text>

        {/* PRs — e/prevBest/weight vêm do backend em kg */}
        {shown.map((p, i) => {
          const e = kgToUnit(p.e, unit);
          const prevBest = kgToUnit(p.prevBest, unit);
          const weight = p.weight != null ? round1(kgToUnit(p.weight, unit)) : null;
          const delta = round1(e - prevBest);
          const [wholePart, decimalPart] = e.toFixed(1).split('.');
          return (
            <View
              key={i}
              style={{
                marginTop: 20,
                paddingTop: i > 0 ? 20 : 0,
                borderTopWidth: i > 0 ? 1 : 0,
                borderTopColor: 'rgba(242,240,234,0.12)',
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
                <Text
                  style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 18, color: COLORS.text, flexShrink: 1 }}
                  numberOfLines={1}
                >
                  {p.exercise}
                </Text>
                {weight != null && (
                  <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: COLORS.muted }}>
                    {weight}{unit} × {p.reps}
                  </Text>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 12 }}>
                <Text style={{ fontFamily: 'Archivo_900Black', fontSize: 60, letterSpacing: -1, color: COLORS.text }}>
                  {wholePart}
                  <Text style={{ fontSize: 36, color: COLORS.text }}>.{decimalPart}</Text>
                </Text>
                <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 20, color: COLORS.accent, marginBottom: 8 }}>
                  {unit}
                </Text>
              </View>

              <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: COLORS.muted, marginTop: 8 }}>
                recorde anterior {round1(prevBest)}{unit}{'  '}
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', color: COLORS.accent }}>+{delta}{unit}</Text>
              </Text>
            </View>
          );
        })}

        <RiseScale />

        <Text style={{ marginTop: 22, fontFamily: 'HankenGrotesk_700Bold', fontSize: 12, color: COLORS.mutedDark }}>
          {dateStr}
        </Text>
      </View>
    </ViewShot>
  );
});
