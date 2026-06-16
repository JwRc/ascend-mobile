import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import { semanticColors } from '@/theme';
import { Card } from '@/components/shared/Card';
import { FlagBadge } from './FlagBadge';
import {
  COACH_ACCOUNT,
  STALE_DAYS,
  billingFor,
  type CoachAthlete,
  type CoachStats,
} from '@/store/coach.store';

// ─── Sub-components ───────────────────────────────────────────────────────────

function BillingStrip({ activeCount }: { activeCount: number }) {
  const { colors } = useTheme();
  const billing = billingFor(activeCount);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.line,
      }}
    >
      <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink2 }}>
        <Text style={{ fontFamily: 'HankenGrotesk_700Bold', color: colors.ink }}>{activeCount}</Text>
        {' '}atletas ativos
      </Text>
      <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink2 }}>
        R$ {COACH_ACCOUNT.basePrice}
        {billing.extra > 0 && ` + ${billing.extra}×R$${COACH_ACCOUNT.pricePerExtra}`}
        <Text style={{ fontFamily: 'HankenGrotesk_700Bold', color: colors.ink }}>
          {' '}= R$ {billing.total}/mês
        </Text>
      </Text>
    </View>
  );
}

function StatCard({
  label,
  value,
  unit,
  sub,
  warn,
}: {
  label: string;
  value: number | string;
  unit?: string;
  sub?: string;
  warn?: boolean;
}) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface2,
        borderWidth: 1.5,
        borderColor: warn ? `${semanticColors.warning}60` : colors.line,
        borderRadius: radius.card,
        padding: 14,
        gap: 4,
      }}
    >
      <Text
        style={{
          fontFamily: 'HankenGrotesk_600SemiBold',
          fontSize: 11.5,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: colors.ink3,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: 'Archivo_800ExtraBold',
          fontSize: 28,
          letterSpacing: -0.5,
          color: warn ? semanticColors.warning : colors.ink,
        }}
      >
        {value}
        {unit && (
          <Text style={{ fontSize: 14, fontFamily: 'HankenGrotesk_700Bold', color: colors.ink3 }}>
            {unit}
          </Text>
        )}
      </Text>
      {sub && (
        <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: colors.ink3 }}>
          {sub}
        </Text>
      )}
    </View>
  );
}

function AttentionRow({
  a,
  onPress,
}: {
  a: CoachAthlete;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const daysLabel =
    a.daysSinceLog == null
      ? 'nunca logou'
      : a.daysSinceLog === 0
      ? 'logou hoje'
      : `último log ${a.daysSinceLog}d atrás`;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 13,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.line,
      }}
      activeOpacity={0.65}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.ink,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 14, color: colors.bg }}>
          {a.name.slice(0, 1)}
        </Text>
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 14.5, color: colors.ink }}>
          {a.name}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
          {a.flags.map((f, i) => (
            <FlagBadge key={i} flag={f} />
          ))}
        </View>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: colors.ink3 }}>
          {daysLabel}
        </Text>
        <Text style={{ fontSize: 18, color: colors.ink3 }}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  stats: CoachStats;
  onOpenAthlete: (a: CoachAthlete) => void;
  onGoRoster: (filter?: string) => void;
};

export function CoachOverview({ stats, onOpenAthlete, onGoRoster }: Props) {
  const { colors } = useTheme();
  const topFlags = stats.flagged.slice(0, 7);
  const rest = Math.max(0, stats.flaggedCount - topFlags.length);

  const active = stats.activeCount || 1;
  const segOn = (stats.onTrack / active) * 100;
  const segFlag = (stats.flaggedCount / active) * 100;
  const segSteady = Math.max(0, 100 - segOn - segFlag);

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 14 }}
      showsVerticalScrollIndicator={false}
    >
      {/* RED FLAGS — hero */}
      <Card style={{ gap: 0, padding: 0, overflow: 'hidden' }}>
        <View style={{ padding: 20, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text
              style={{
                fontFamily: 'Archivo_800ExtraBold',
                fontSize: 17,
                textTransform: 'uppercase',
                letterSpacing: 0.4,
                color: colors.ink,
              }}
            >
              Atenção necessária
            </Text>
            <View
              style={{
                backgroundColor: stats.flaggedCount > 0 ? semanticColors.danger : semanticColors.success,
                borderRadius: 20,
                minWidth: 28,
                paddingHorizontal: 8,
                paddingVertical: 4,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 14, color: '#fff' }}>
                {stats.flaggedCount}
              </Text>
            </View>
          </View>
          <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12.5, color: colors.ink3 }}>
            Sem log há {STALE_DAYS}+ dias · tendência oposta à meta · sessões perdidas
          </Text>
        </View>

        {topFlags.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 26 }}>✓</Text>
            <Text
              style={{
                fontFamily: 'HankenGrotesk_600SemiBold',
                fontSize: 14,
                color: colors.ink3,
                textAlign: 'center',
              }}
            >
              Todos os atletas estão no caminho certo.
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
            {topFlags.map((a) => (
              <AttentionRow key={a.id} a={a} onPress={() => onOpenAthlete(a)} />
            ))}
            {rest > 0 && (
              <TouchableOpacity
                onPress={() => onGoRoster('attention')}
                style={{ paddingVertical: 14 }}
              >
                <Text
                  style={{
                    fontFamily: 'HankenGrotesk_700Bold',
                    fontSize: 14,
                    color: colors.accent,
                  }}
                >
                  Ver todos os {stats.flaggedCount} no roster →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Card>

      {/* ADHERENCE */}
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text
            style={{
              fontFamily: 'Archivo_800ExtraBold',
              fontSize: 15,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              color: colors.ink,
            }}
          >
            Aderência
          </Text>
          <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: colors.ink3 }}>
            esta semana
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StatCard
            label="Registraram peso"
            value={stats.adherencePct}
            unit="%"
            sub={`${stats.loggedThisWeek} de ${stats.activeCount} atletas`}
          />
          <StatCard
            label="Sessões feitas"
            value={stats.sessionPct}
            unit="%"
            sub={`${stats.totalDone} de ${stats.totalAssigned} asg.`}
          />
          <StatCard
            label="Inativos"
            value={stats.quiet}
            sub={`${STALE_DAYS}+ dias`}
            warn={stats.quiet > 0}
          />
        </View>
      </View>

      {/* PROGRESS (light) */}
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            style={{
              fontFamily: 'Archivo_800ExtraBold',
              fontSize: 15,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              color: colors.ink,
            }}
          >
            Progresso
          </Text>
          <TouchableOpacity onPress={() => onGoRoster('ontrack')}>
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13.5, color: colors.accent }}>
              Abrir roster →
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text
            style={{
              fontFamily: 'Archivo_900Black',
              fontSize: 52,
              letterSpacing: -1,
              color: colors.ink,
            }}
          >
            {stats.onTrack}
          </Text>
          <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: colors.ink3 }}>
            de {stats.activeCount} no caminho da meta
          </Text>
        </View>

        {/* tricolor bar */}
        <View
          style={{
            height: 12,
            borderRadius: 6,
            overflow: 'hidden',
            flexDirection: 'row',
            backgroundColor: colors.surface2,
          }}
        >
          <View style={{ width: `${segOn}%`, backgroundColor: semanticColors.success }} />
          <View style={{ width: `${segFlag}%`, backgroundColor: semanticColors.danger }} />
          <View style={{ width: `${segSteady}%`, backgroundColor: colors.line2 }} />
        </View>

        {/* legend */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {[
            { color: semanticColors.success, label: `No caminho ${stats.onTrack}` },
            { color: semanticColors.danger, label: `Atenção ${stats.flaggedCount}` },
            { color: colors.line2, label: `Estável ${Math.max(0, stats.activeCount - stats.onTrack - stats.flaggedCount)}` },
          ].map((item) => (
            <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: item.color }}
              />
              <Text
                style={{
                  fontFamily: 'HankenGrotesk_600SemiBold',
                  fontSize: 12.5,
                  color: colors.ink2,
                }}
              >
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}
