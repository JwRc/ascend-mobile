import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/theme';
import { semanticColors } from '@/theme';
import { FlagBadge } from './FlagBadge';
import { StatusPill } from './StatusPill';
import type { CoachAthlete } from '@/store/coach.store';
import { STALE_DAYS } from '@/store/coach.store';

// ─── Types ────────────────────────────────────────────────────────────────────

type Filter = 'all' | 'attention' | 'ontrack' | 'inactive' | 'invited';
type SortKey = 'name' | 'trend' | 'goal' | 'last' | 'attention';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'attention', label: 'Atenção' },
  { value: 'ontrack', label: 'No caminho' },
  { value: 'inactive', label: 'Inativos' },
  { value: 'invited', label: 'Convidados' },
];

// ─── RosterRow ────────────────────────────────────────────────────────────────

function RosterRow({ a, onPress }: { a: CoachAthlete; onPress: () => void }) {
  const { colors } = useTheme();
  const u = a.units;
  const losing = a.goalDir === 'lose';
  const deltaGood = a.goalDir === 'maintain' ? null : losing ? a.weekDelta < 0 : a.weekDelta > 0;
  const deltaColor =
    deltaGood == null ? colors.ink3 : deltaGood ? semanticColors.success : semanticColors.danger;
  const arrow = a.weekDelta === 0 ? '—' : a.weekDelta < 0 ? '▾' : '▴';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.65}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.line,
        gap: 10,
      }}
    >
      {/* avatar + name */}
      <View style={{ flex: 1.8, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: colors.ink,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 13, color: colors.bg }}>
            {a.name.slice(0, 1)}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text
              numberOfLines={1}
              style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, color: colors.ink, flex: 1 }}
            >
              {a.name}
            </Text>
            {a.flags.length > 0 && (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: semanticColors.danger,
                  flexShrink: 0,
                }}
              />
            )}
          </View>
          <Text
            numberOfLines={1}
            style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 11.5, color: colors.ink3 }}
          >
            {a.email}
          </Text>
        </View>
      </View>

      {/* trend */}
      <View style={{ width: 70, alignItems: 'flex-end' }}>
        {a.status === 'invited' ? (
          <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink3 }}>—</Text>
        ) : (
          <>
            <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 15, color: colors.ink }}>
              {a.trend}
              <Text style={{ fontSize: 11, fontFamily: 'HankenGrotesk_700Bold', color: colors.ink3 }}>{u}</Text>
            </Text>
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12, color: deltaColor }}>
              {arrow} {Math.abs(a.weekDelta)}
            </Text>
          </>
        )}
      </View>

      {/* goal % */}
      <View style={{ width: 50, alignItems: 'flex-end' }}>
        {a.status === 'invited' ? (
          <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink3 }}>—</Text>
        ) : (
          <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 15, color: colors.ink }}>
            {a.goalPct}
            <Text style={{ fontSize: 11, fontFamily: 'HankenGrotesk_700Bold', color: colors.ink3 }}>%</Text>
          </Text>
        )}
      </View>

      {/* last log */}
      <View style={{ width: 46, alignItems: 'flex-end' }}>
        {a.daysSinceLog == null ? (
          <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: colors.ink3 }}>—</Text>
        ) : (
          <Text
            style={{
              fontFamily: 'HankenGrotesk_700Bold',
              fontSize: 12.5,
              color: a.daysSinceLog >= STALE_DAYS ? semanticColors.danger : colors.ink2,
            }}
          >
            {a.daysSinceLog === 0 ? 'hoje' : `${a.daysSinceLog}d`}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Table header ─────────────────────────────────────────────────────────────

function TableHeader({
  sort,
  onSort,
}: {
  sort: { key: SortKey; dir: 'asc' | 'desc' };
  onSort: (k: SortKey) => void;
}) {
  const { colors } = useTheme();
  const mark = (k: SortKey) => (sort.key === k ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '');
  const col = (label: string, k: SortKey, width?: number, align?: 'right') => (
    <TouchableOpacity
      onPress={() => onSort(k)}
      style={{ width, flex: width ? undefined : 1.8, alignItems: align === 'right' ? 'flex-end' : 'flex-start' }}
    >
      <Text
        style={{
          fontFamily: 'HankenGrotesk_700Bold',
          fontSize: 11,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: sort.key === k ? colors.accent : colors.ink3,
        }}
      >
        {label}
        {mark(k)}
      </Text>
    </TouchableOpacity>
  );
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.line,
        backgroundColor: colors.surface2,
        gap: 10,
      }}
    >
      {col('Atleta', 'name')}
      {col('Tendência', 'trend', 70, 'right')}
      {col('Meta', 'goal', 50, 'right')}
      {col('Log', 'last', 46, 'right')}
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Props = {
  athletes: CoachAthlete[];
  initialFilter?: Filter;
  onOpenAthlete: (a: CoachAthlete) => void;
  onInvite: () => void;
};

export function CoachRoster({ athletes, initialFilter, onOpenAthlete, onInvite }: Props) {
  const { colors, radius } = useTheme();
  const [q, setQ] = React.useState('');
  const [filter, setFilter] = React.useState<Filter>(initialFilter ?? 'all');
  const [sort, setSort] = React.useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'attention',
    dir: 'desc',
  });

  React.useEffect(() => {
    if (initialFilter) setFilter(initialFilter);
  }, [initialFilter]);

  const rows = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    let r = athletes.filter((a) => {
      if (filter === 'attention') return a.status === 'active' && a.flags.length > 0;
      if (filter === 'ontrack') return a.onTrack;
      if (filter === 'inactive') return a.status === 'active' && a.daysSinceLog != null && a.daysSinceLog >= STALE_DAYS;
      if (filter === 'invited') return a.status === 'invited';
      return true;
    });
    if (needle) {
      r = r.filter(
        (a) => a.name.toLowerCase().includes(needle) || a.email.toLowerCase().includes(needle)
      );
    }
    const dir = sort.dir === 'asc' ? 1 : -1;
    const getVal = (a: CoachAthlete): number | string => {
      if (sort.key === 'name') return a.name.toLowerCase();
      if (sort.key === 'trend') return a.trend;
      if (sort.key === 'goal') return a.goalPct;
      if (sort.key === 'last') return a.daysSinceLog ?? -1;
      return a.severity;
    };
    return [...r].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return a.name.localeCompare(b.name);
    });
  }, [athletes, q, filter, sort]);

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'name' || key === 'last' ? 'asc' : 'desc' }
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* controls */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 10 }}>
        {/* search + invite */}
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderWidth: 1.5,
              borderColor: colors.line,
              borderRadius: radius.cardSm,
              paddingHorizontal: 12,
              paddingVertical: 10,
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 16, color: colors.ink3 }}>⌕</Text>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Buscar atletas…"
              placeholderTextColor={colors.ink3}
              style={{
                flex: 1,
                fontFamily: 'HankenGrotesk_600SemiBold',
                fontSize: 14,
                color: colors.ink,
              }}
            />
            {q.length > 0 && (
              <TouchableOpacity onPress={() => setQ('')}>
                <Text style={{ fontSize: 20, color: colors.ink3 }}>×</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={onInvite}
            style={{
              backgroundColor: colors.accent,
              borderRadius: radius.cardSm,
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 20, color: '#fff', lineHeight: 22 }}>+</Text>
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, color: '#fff' }}>
              Convidar
            </Text>
          </TouchableOpacity>
        </View>

        {/* filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 7 }}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.value}
                onPress={() => setFilter(f.value)}
                style={{
                  paddingHorizontal: 13,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: filter === f.value ? colors.ink : colors.surface2,
                  borderWidth: 1.5,
                  borderColor: filter === f.value ? colors.ink : colors.line,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'HankenGrotesk_700Bold',
                    fontSize: 12.5,
                    color: filter === f.value ? colors.bg : colors.ink2,
                  }}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* meta */}
        <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: colors.ink3 }}>
          Exibindo{' '}
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', color: colors.ink2 }}>{rows.length}</Text>
          {' '}de {athletes.length} atletas
        </Text>
      </View>

      {/* table */}
      <TableHeader sort={sort} onSort={toggleSort} />
      <FlatList
        data={rows}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => (
          <RosterRow a={item} onPress={() => onOpenAthlete(item)} />
        )}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink3 }}>
              Nenhum atleta encontrado.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
