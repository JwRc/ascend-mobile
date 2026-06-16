import React from 'react';
import { View, Text } from 'react-native';
import Svg, {
  Circle,
  Line,
  Path,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useTheme } from '@/theme';
import { round1 } from '@/lib/utils';

export type ChartPoint = { x: number; y: number };
export type ChartDot = ChartPoint & { tipTitle?: string; tipSub?: string };

type Props = {
  dots: ChartDot[];
  trend: ChartPoint[] | null;
  xTicks?: { x: number; label: string }[];
  unit: 'kg' | 'lb';
  area?: boolean;
  legend?: { trend: string; dots: string };
  emptyText?: string;
};

const W = 340;
const H = 180;
const PAD_L = 16;
const PAD_R = 16;
const PAD_T = 18;
const PAD_B = 30;

function buildPath(pts: [number, number][]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
}

function buildArea(pts: [number, number][]): string {
  const base = H - PAD_B;
  return (
    buildPath(pts) +
    ` L${pts[pts.length - 1][0].toFixed(1)} ${base} L${pts[0][0].toFixed(1)} ${base} Z`
  );
}

export function StrengthChart({ dots, trend, xTicks, unit, area, legend, emptyText }: Props) {
  const { colors } = useTheme();
  const gradId = React.useId().replace(/[^a-zA-Z0-9]/g, '');

  if (!dots || dots.length === 0) {
    return (
      <View style={{ paddingVertical: 28, alignItems: 'center' }}>
        <Text style={{ fontFamily: 'HankenGrotesk_500Medium', fontSize: 13.5, color: colors.ink3 }}>
          {emptyText ?? 'Sem dados ainda.'}
        </Text>
      </View>
    );
  }

  const xsAll = dots.map((d) => d.x).concat(trend ? trend.map((p) => p.x) : []);
  const ysAll = dots.map((d) => d.y).concat(trend ? trend.map((p) => p.y) : []);
  const minX = Math.min(...xsAll);
  const maxX = Math.max(...xsAll);
  let minY = Math.min(...ysAll);
  let maxY = Math.max(...ysAll);
  const padY = Math.max((maxY - minY) * 0.18, unit === 'kg' ? 1.5 : 3);
  minY -= padY;
  maxY += padY;
  if (maxY - minY < 1) { maxY += 1; minY -= 1; }

  const sx = (x: number) =>
    PAD_L + ((x - minX) / (maxX - minX || 1)) * (W - PAD_L - PAD_R);
  const sy = (v: number) =>
    PAD_T + (1 - (v - minY) / (maxY - minY || 1)) * (H - PAD_T - PAD_B);

  const dpts = dots.map((d): [number, number] => [sx(d.x), sy(d.y)]);
  const tpts = trend ? trend.map((p): [number, number] => [sx(p.x), sy(p.y)]) : [];

  const yTicks: { v: number; y: number }[] = [];
  for (let i = 0; i <= 3; i++) {
    const v = minY + ((maxY - minY) * i) / 3;
    yTicks.push({ v, y: sy(v) });
  }

  return (
    <View style={{ gap: 8 }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.accent} stopOpacity={0.22} />
            <Stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* y gridlines */}
        {yTicks.map((t, i) => (
          <React.Fragment key={i}>
            <Line x1={PAD_L} y1={t.y} x2={W - PAD_R} y2={t.y} stroke={colors.line} strokeWidth={1} />
            <SvgText
              x={W - PAD_R}
              y={t.y - 5}
              fontSize={9}
              fill={colors.ink3}
              textAnchor="end"
              fontFamily="HankenGrotesk_600SemiBold"
            >
              {round1(t.v)}
            </SvgText>
          </React.Fragment>
        ))}

        {/* area fill */}
        {area && tpts.length > 1 && (
          <Path d={buildArea(tpts)} fill={`url(#${gradId})`} />
        )}

        {/* raw dots */}
        {dpts.map((p, i) => (
          <Circle key={i} cx={p[0]} cy={p[1]} r={3.4} fill={colors.line2} stroke={colors.ink3} strokeWidth={1} />
        ))}

        {/* trend line */}
        {tpts.length > 1 && (
          <Path d={buildPath(tpts)} stroke={colors.accent} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* x labels */}
        {(xTicks ?? []).map((t, i) => (
          <SvgText
            key={i}
            x={sx(t.x)}
            y={H - 10}
            fontSize={9}
            fill={colors.ink3}
            textAnchor={i === 0 ? 'start' : i === (xTicks!.length - 1) ? 'end' : 'middle'}
            fontFamily="HankenGrotesk_600SemiBold"
          >
            {t.label}
          </SvgText>
        ))}
      </Svg>

      {/* legend */}
      {legend && (
        <View style={{ flexDirection: 'row', gap: 16, paddingTop: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 20, height: 2, backgroundColor: colors.accent, borderRadius: 1 }} />
            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 11, color: colors.ink3 }}>
              {legend.trend}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line2, borderWidth: 1, borderColor: colors.ink3 }} />
            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 11, color: colors.ink3 }}>
              {legend.dots}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
