import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import Svg, { Line, Circle, Polyline, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/theme';
import { WeightEntry } from '@/types/api';
import { movingAverage, round1, fmtDateShort } from '@/lib/utils';

type Props = {
  entries: WeightEntry[];
  unit: 'kg' | 'lb';
};

export function WeightChart({ entries, unit }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  if (entries.length < 2) {
    return (
      <View style={{ paddingVertical: 60, alignItems: 'center' }}>
        <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink3 }}>
          Registre pelo menos 2 pesos para ver o gráfico.
        </Text>
      </View>
    );
  }

  const ma = movingAverage(entries, 7);
  const allWeights = [...entries.map((e) => e.weight), ...ma.map((e) => e.weight)];
  const minW = Math.min(...allWeights);
  const maxW = Math.max(...allWeights);
  const range = maxW - minW || 1;

  const chartH = 200;
  const chartW = width - 72; // account for card padding
  const padLeft = 42;
  const padRight = 12;
  const padTop = 12;
  const padBottom = 24;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const xPos = (i: number, total: number) =>
    padLeft + (i / Math.max(total - 1, 1)) * plotW;
  const yPos = (w: number) =>
    padTop + plotH - ((w - minW) / range) * plotH;

  const maPointsStr = ma
    .map((e, i) => `${xPos(i, ma.length)},${yPos(e.weight)}`)
    .join(' ');

  const yLabels = [
    round1(minW),
    round1((minW + maxW) / 2),
    round1(maxW),
  ];

  const xIdxs = [0, Math.floor((entries.length - 1) / 2), entries.length - 1];

  return (
    <View>
      <Svg width={chartW} height={chartH}>
        {/* grid lines + Y labels */}
        {yLabels.map((w, i) => {
          const y = yPos(w);
          return (
            <React.Fragment key={i}>
              <Line
                x1={padLeft}
                y1={y}
                x2={chartW - padRight}
                y2={y}
                stroke={colors.line}
                strokeWidth={1}
              />
              <SvgText
                x={padLeft - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={10}
                fill={colors.ink3}
                fontFamily="HankenGrotesk_600SemiBold"
              >
                {w}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* daily dots */}
        {entries.map((e, i) => (
          <Circle
            key={e.date}
            cx={xPos(i, entries.length)}
            cy={yPos(e.weight)}
            r={3}
            fill={colors.ink3}
            opacity={0.7}
          />
        ))}

        {/* moving average line */}
        <Polyline
          points={maPointsStr}
          fill="none"
          stroke={colors.accent}
          strokeWidth={3.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* X labels */}
        {xIdxs.map((idx) => (
          <SvgText
            key={idx}
            x={xPos(idx, entries.length)}
            y={chartH - 4}
            textAnchor="middle"
            fontSize={10}
            fill={colors.ink3}
            fontFamily="HankenGrotesk_600SemiBold"
          >
            {fmtDateShort(entries[idx].date)}
          </SvgText>
        ))}
      </Svg>

      {/* legend */}
      <View
        style={{
          flexDirection: 'row',
          gap: 20,
          marginTop: 8,
          paddingTop: 14,
          borderTopWidth: 1.5,
          borderTopColor: colors.line,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{ width: 9, height: 9, borderRadius: 50, backgroundColor: colors.ink3, opacity: 0.8 }}
          />
          <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12.5, color: colors.ink2 }}>
            Peso diário
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 18, height: 3.5, borderRadius: 2, backgroundColor: colors.accent }} />
          <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12.5, color: colors.ink2 }}>
            Média 7 dias
          </Text>
        </View>
      </View>
    </View>
  );
}
