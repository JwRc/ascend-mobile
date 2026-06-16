import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/theme';
import { Card } from '@/components/shared/Card';
import { SegmentedControl } from '@/components/shared/SegmentedControl';
import { AutocompleteSelect } from '@/components/shared/AutocompleteSelect';
import { StrengthChart, type ChartDot, type ChartPoint } from './StrengthChart';
import {
  type Session,
  type Template,
  exercisePeak1RM,
  allExerciseNames,
  sessionsWithExercise,
} from '@/store/strength.store';
import { fmtDateShort, round1, epley1RM } from '@/lib/utils';

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  if (m === 0) return `${sec}s`;
  return `${m}min`;
}

function trainingStreak(sessions: Session[]): number {
  if (!sessions.length) return 0;
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const today = new Date().toISOString().slice(0, 10);
  let streak = 0;
  const cursor = new Date(today + 'T00:00:00');
  for (let i = 0; i < 365; i++) {
    const iso = cursor.toISOString().slice(0, 10);
    if (sorted.some((s) => s.date === iso)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (i === 0) {
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function topLifts(sessions: Session[]): { name: string; e: number }[] {
  const map = new Map<string, number>();
  sessions.forEach((s) =>
    s.exercises.forEach((ex) => {
      const peak = exercisePeak1RM(ex.sets);
      if (peak > 0 && peak > (map.get(ex.name) ?? 0)) map.set(ex.name, peak);
    })
  );
  return Array.from(map.entries())
    .map(([name, e]) => ({ name, e }))
    .sort((a, b) => b.e - a.e)
    .slice(0, 5);
}

function sessionScore(s: Session): number {
  const vals = s.exercises.map((ex) => exercisePeak1RM(ex.sets)).filter((v) => v > 0);
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function movingAverageN(values: number[], n: number): number[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - n + 1), i + 1);
    return round1(slice.reduce((a, b) => a + b, 0) / slice.length);
  });
}

function dateMs(iso: string): number {
  return new Date(iso + 'T00:00:00').getTime();
}

function tickDates(dates: string[]): { x: number; label: string }[] {
  if (!dates.length) return [];
  const idxs = [0, Math.floor((dates.length - 1) / 2), dates.length - 1].filter(
    (v, i, a) => a.indexOf(v) === i
  );
  return idxs.map((i) => ({ x: dateMs(dates[i]), label: fmtDateShort(dates[i]) }));
}

type FilterMode = 'exercise' | 'template';
type ChartMode = 'overtime' | 'setbyset';

type Props = {
  sessions: Session[];
  templates: Template[];
  unit: 'kg' | 'lb';
  onStartWorkout: () => void;
};

export function StrengthDashboard({ sessions, templates, unit, onStartWorkout }: Props) {
  const { colors, direction } = useTheme();
  const streak = trainingStreak(sessions);
  const recent = [...sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const lifts = topLifts(sessions);
  const exNames = allExerciseNames(sessions, templates);

  const [filterMode, setFilterMode] = React.useState<FilterMode>('exercise');
  const [selectedEx, setSelectedEx] = React.useState<string>(exNames[0] ?? '');
  const [selectedTplId, setSelectedTplId] = React.useState<string>(templates[0]?.id ?? '');
  const [chartMode, setChartMode] = React.useState<ChartMode>('overtime');

  // keep selections valid as data changes
  React.useEffect(() => {
    if (exNames.length && !exNames.includes(selectedEx)) setSelectedEx(exNames[0]);
  }, [exNames.join('|')]);
  React.useEffect(() => {
    if (templates.length && !templates.find((t) => t.id === selectedTplId))
      setSelectedTplId(templates[0]?.id ?? '');
  }, [templates.map((t) => t.id).join('|')]);

  if (!sessions.length) {
    return (
      <Card style={{ alignItems: 'center', gap: 16, paddingVertical: 36 }}>
        <Text style={{ fontSize: 36 }}>🏋️</Text>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 20, letterSpacing: -0.3, color: colors.ink }}>
            Sem treinos ainda
          </Text>
          <Text style={{ fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: colors.ink3, textAlign: 'center' }}>
            Complete seu primeiro treino para ver{'\n'}seu progresso aqui.
          </Text>
        </View>
        <TouchableOpacity
          onPress={onStartWorkout}
          style={{ backgroundColor: colors.accent, paddingVertical: 14, paddingHorizontal: 28, borderRadius: direction === 'A' ? 4 : 30 }}
        >
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: '#fff' }}>
            Iniciar treino
          </Text>
        </TouchableOpacity>
      </Card>
    );
  }

  // ── build chart data ─────────────────────────────────────────────────────
  let chartDots: ChartDot[] = [];
  let chartTrend: ChartPoint[] | null = null;
  let chartXTicks: { x: number; label: string }[] | undefined;
  let chartLegend: { trend: string; dots: string } | undefined;
  let chartArea = false;
  let chartEmpty = '';

  if (filterMode === 'exercise' && selectedEx) {
    const scopedAsc = sessionsWithExercise(sessions, selectedEx).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    if (chartMode === 'overtime') {
      const pts = scopedAsc.map((s) => {
        const block = s.exercises.find((e) => e.name.toLowerCase() === selectedEx.toLowerCase());
        return { date: s.date, value: block ? exercisePeak1RM(block.sets) : 0 };
      });
      const ma = movingAverageN(pts.map((p) => p.value), 3);
      chartDots = pts.map((p) => ({
        x: dateMs(p.date),
        y: p.value,
        tipTitle: fmtDateShort(p.date),
        tipSub: '1RM estimado',
      }));
      chartTrend = pts.map((p, i) => ({ x: dateMs(p.date), y: ma[i] }));
      chartXTicks = tickDates(pts.map((p) => p.date));
      chartLegend = { trend: 'Média · 3 sessões', dots: '1RM estimado' };
      chartArea = true;
      chartEmpty = 'Faça algumas sessões para ver a progressão.';
    } else {
      // set by set: use most recent session for this exercise
      const latest = scopedAsc[scopedAsc.length - 1];
      if (latest) {
        const block = latest.exercises.find((e) => e.name.toLowerCase() === selectedEx.toLowerCase());
        const sets = block?.sets ?? [];
        chartDots = sets.map((s, i) => ({
          x: i + 1,
          y: epley1RM(s.weight, s.reps),
          tipTitle: `Série ${i + 1}`,
          tipSub: `${round1(s.weight)}${unit} × ${s.reps}`,
        }));
        chartTrend = chartDots.map((d) => ({ x: d.x, y: d.y }));
        chartXTicks = chartDots.map((d) => ({ x: d.x, label: `S${d.x}` }));
        chartLegend = { trend: 'Curva intra-sessão', dots: '1RM por série' };
        chartEmpty = 'Nenhuma série nesta sessão.';
      }
    }
  } else if (filterMode === 'template' && selectedTplId) {
    const tpl = templates.find((t) => t.id === selectedTplId);
    const scopedAsc = sessions
      .filter((s) => s.templateId === selectedTplId)
      .sort((a, b) => a.date.localeCompare(b.date));
    const scores = scopedAsc.map((s) => sessionScore(s));
    const ma = movingAverageN(scores, 3);
    chartDots = scopedAsc.map((s, i) => ({
      x: dateMs(s.date),
      y: scores[i],
      tipTitle: fmtDateShort(s.date),
      tipSub: 'score da sessão',
    }));
    chartTrend = scopedAsc.map((s, i) => ({ x: dateMs(s.date), y: ma[i] }));
    chartXTicks = tickDates(scopedAsc.map((s) => s.date));
    chartLegend = { trend: 'Média · 3 sessões', dots: 'Score da sessão' };
    chartArea = true;
    chartEmpty = `Nenhuma sessão com template "${tpl?.name ?? ''}" ainda.`;
  }

  return (
    <View style={{ gap: 14 }}>
      {/* streak + count */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.ink3 }}>
            Sequência
          </Text>
          <Text style={{ fontFamily: 'Archivo_900Black', fontSize: 42, letterSpacing: -1, color: colors.ink, lineHeight: 44 }}>
            {streak}
          </Text>
          <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12.5, color: colors.ink3 }}>
            {streak === 1 ? 'dia' : 'dias'} seguidos
          </Text>
        </Card>
        <Card style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.ink3 }}>
            Total de treinos
          </Text>
          <Text style={{ fontFamily: 'Archivo_900Black', fontSize: 42, letterSpacing: -1, color: colors.ink, lineHeight: 44 }}>
            {sessions.length}
          </Text>
          <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12.5, color: colors.ink3 }}>
            sessões registradas
          </Text>
        </Card>
      </View>

      {/* progressão — chart card */}
      <Card style={{ gap: 14 }}>
        <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 19, letterSpacing: direction === 'A' ? 0.4 : -0.3, textTransform: direction === 'A' ? 'uppercase' : 'none', color: colors.ink }}>
          Progressão
        </Text>

        {/* filter mode */}
        <SegmentedControl
          options={[
            { value: 'exercise', label: 'Por exercício' },
            { value: 'template', label: 'Por template' },
          ]}
          value={filterMode}
          onChange={(v) => setFilterMode(v as FilterMode)}
        />

        {/* exercise autocomplete / template chips */}
        {filterMode === 'exercise' ? (
          exNames.length > 0 ? (
            <AutocompleteSelect
              options={exNames}
              value={selectedEx}
              onChange={setSelectedEx}
              placeholder="Buscar exercício…"
            />
          ) : (
            <Text style={{ fontFamily: 'HankenGrotesk_500Medium', fontSize: 13, color: colors.ink3 }}>
              Nenhum exercício registrado ainda.
            </Text>
          )
        ) : (
          templates.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
                {templates.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setSelectedTplId(t.id)}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 13,
                      borderRadius: direction === 'A' ? 3 : 20,
                      borderWidth: 1.5,
                      borderColor: selectedTplId === t.id ? colors.accent : colors.line,
                      backgroundColor: selectedTplId === t.id ? colors.accent : colors.surface,
                    }}
                  >
                    <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12.5, color: selectedTplId === t.id ? '#fff' : colors.ink2 }}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          ) : (
            <Text style={{ fontFamily: 'HankenGrotesk_500Medium', fontSize: 13, color: colors.ink3 }}>
              Nenhum template criado ainda.
            </Text>
          )
        )}

        {/* chart view toggle (exercise mode only) */}
        {filterMode === 'exercise' && (
          <SegmentedControl
            options={[
              { value: 'overtime', label: 'Ao longo do tempo' },
              { value: 'setbyset', label: 'Série a série' },
            ]}
            value={chartMode}
            onChange={(v) => setChartMode(v as ChartMode)}
          />
        )}

        {/* chart subtitle */}
        <View>
          <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 11.5, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.ink3 }}>
            {filterMode === 'exercise'
              ? chartMode === 'overtime'
                ? 'Pico de 1RM estimado por sessão'
                : 'Curva de fadiga intra-sessão'
              : 'Comparativo de sessões por dia'}
          </Text>
        </View>

        <StrengthChart
          dots={chartDots}
          trend={chartTrend}
          xTicks={chartXTicks}
          unit={unit}
          area={chartArea}
          legend={chartLegend}
          emptyText={chartEmpty}
        />
      </Card>

      {/* top 1RMs */}
      {lifts.length > 0 && (
        <Card style={{ gap: 0 }}>
          <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 18, letterSpacing: direction === 'A' ? 0.4 : -0.3, textTransform: direction === 'A' ? 'uppercase' : 'none', color: colors.ink, marginBottom: 14 }}>
            Melhores 1RM estimados
          </Text>
          {lifts.map((l, i) => (
            <View
              key={l.name}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 13,
                borderBottomWidth: i < lifts.length - 1 ? 1.5 : 0,
                borderBottomColor: colors.line,
                gap: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: direction === 'A' ? 4 : 14,
                    backgroundColor: i === 0 ? colors.accent : colors.surface2,
                    borderWidth: i > 0 ? 1.5 : 0,
                    borderColor: colors.line,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 11, color: i === 0 ? '#fff' : colors.ink3 }}>
                    {i + 1}
                  </Text>
                </View>
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: colors.ink, flex: 1 }} numberOfLines={1}>
                  {l.name}
                </Text>
              </View>
              <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 22, letterSpacing: -0.5, color: i === 0 ? colors.accent : colors.ink }}>
                {round1(l.e)}
                <Text style={{ fontSize: 13, fontFamily: 'HankenGrotesk_700Bold', color: colors.ink3 }}>{unit}</Text>
              </Text>
            </View>
          ))}
        </Card>
      )}

      {/* recent sessions */}
      <Card style={{ gap: 0 }}>
        <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 18, letterSpacing: direction === 'A' ? 0.4 : -0.3, textTransform: direction === 'A' ? 'uppercase' : 'none', color: colors.ink, marginBottom: 14 }}>
          Treinos recentes
        </Text>
        {recent.map((s, i) => {
          const totalSets = s.exercises.reduce((n, e) => n + e.sets.length, 0);
          return (
            <View
              key={s.id}
              style={{ paddingVertical: 13, borderBottomWidth: i < recent.length - 1 ? 1.5 : 0, borderBottomColor: colors.line, gap: 6 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 15.5, color: colors.ink, flex: 1 }} numberOfLines={1}>
                  {s.templateName}
                </Text>
                <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12.5, color: colors.ink3 }}>
                  {fmtDateShort(s.date)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Text style={{ fontFamily: 'HankenGrotesk_500Medium', fontSize: 12.5, color: colors.ink3 }}>
                  {s.exercises.length} exercícios · {totalSets} séries
                </Text>
                {s.durationSec > 0 && (
                  <Text style={{ fontFamily: 'HankenGrotesk_500Medium', fontSize: 12.5, color: colors.ink3 }}>
                    {formatDuration(s.durationSec)}
                  </Text>
                )}
                {s.prs && s.prs.length > 0 && (
                  <View style={{ backgroundColor: colors.accent, paddingVertical: 2, paddingHorizontal: 7, borderRadius: direction === 'A' ? 3 : 10 }}>
                    <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 10, color: '#fff', letterSpacing: 0.5 }}>
                      {s.prs.length} PR{s.prs.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </Card>
    </View>
  );
}
