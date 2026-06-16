import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useTheme } from '@/theme';
import { semanticColors } from '@/theme';
import { Card } from '@/components/shared/Card';
import { AppModal } from '@/components/shared/AppModal';
import type { CoachProgram, TrainingDay, CoachAthlete } from '@/store/coach.store';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

const EXERCISE_SUGGESTIONS = [
  'Supino', 'Supino Inclinado', 'Supino Declinado', 'Peck Deck', 'Crossover',
  'Desenvolvimento', 'Elevação Lateral', 'Elevação Frontal', 'Face Pull',
  'Puxada', 'Remada Curvada', 'Remada Máquina', 'Remada Unilateral',
  'Agachamento', 'Leg Press', 'Cadeira Extensora', 'Leg Curl', 'Terra Romeno',
  'Afundo', 'Stiff', 'Levantamento Terra', 'Hip Thrust', 'Panturrilha',
  'Rosca Direta', 'Rosca Martelo', 'Rosca Alternada',
  'Tríceps Corda', 'Tríceps Testa', 'Tríceps Pulley',
];

const FOCUS_OPTIONS = ['Hipertrofia', 'Força', 'Volume', 'Definição', 'Ganho', 'Manutenção', 'Geral'];
const PER_WEEK_OPTIONS = [2, 3, 4, 5, 6];

// ─── Program builder modal ────────────────────────────────────────────────────

type BuilderProps = {
  program: CoachProgram | null; // null = new
  onSave: (p: CoachProgram) => void;
  onClose: () => void;
};

function ProgramBuilder({ program, onSave, onClose }: BuilderProps) {
  const { colors, radius } = useTheme();
  const [name, setName] = React.useState(program?.name ?? '');
  const [focus, setFocus] = React.useState(program?.focus ?? 'Hipertrofia');
  const [perWeek, setPerWeek] = React.useState(program?.perWeek ?? 4);
  const [days, setDays] = React.useState<TrainingDay[]>(
    program?.days ?? [{ id: uid(), name: 'Dia A', exercises: [] }]
  );
  const [exInput, setExInput] = React.useState<Record<string, string>>({});

  function addDay() {
    setDays((ds) => [...ds, { id: uid(), name: `Dia ${String.fromCharCode(65 + ds.length)}`, exercises: [] }]);
  }
  function removeDay(id: string) {
    setDays((ds) => ds.filter((d) => d.id !== id));
  }
  function updateDayName(id: string, name: string) {
    setDays((ds) => ds.map((d) => (d.id === id ? { ...d, name } : d)));
  }
  function addExercise(dayId: string, ex: string) {
    if (!ex.trim()) return;
    setDays((ds) =>
      ds.map((d) => (d.id === dayId ? { ...d, exercises: [...d.exercises, ex.trim()] } : d))
    );
    setExInput((m) => ({ ...m, [dayId]: '' }));
  }
  function removeExercise(dayId: string, exIdx: number) {
    setDays((ds) =>
      ds.map((d) =>
        d.id === dayId ? { ...d, exercises: d.exercises.filter((_, i) => i !== exIdx) } : d
      )
    );
  }

  function handleSave() {
    if (!name.trim() || days.length === 0) return;
    onSave({
      id: program?.id ?? `prog_${uid()}`,
      name: name.trim(),
      focus,
      perWeek,
      days,
    });
  }

  const valid = name.trim().length > 0 && days.length > 0 && days.every((d) => d.name.trim());

  return (
    <>
      <View style={{ gap: 16 }}>
        {/* name */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.ink3 }}>
            Nome do programa
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ex: Hipertrofia A"
            placeholderTextColor={colors.ink3}
            style={{
              fontFamily: 'HankenGrotesk_600SemiBold',
              fontSize: 15,
              color: colors.ink,
              backgroundColor: colors.surface2,
              borderWidth: 1.5,
              borderColor: colors.line,
              borderRadius: radius.cardSm,
              paddingHorizontal: 14,
              paddingVertical: 11,
            }}
          />
        </View>

        {/* focus */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.ink3 }}>
            Foco
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 7 }}>
              {FOCUS_OPTIONS.map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFocus(f)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: focus === f ? colors.ink : colors.surface2,
                    borderWidth: 1.5,
                    borderColor: focus === f ? colors.ink : colors.line,
                  }}
                >
                  <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12.5, color: focus === f ? colors.bg : colors.ink2 }}>
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* per week */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.ink3 }}>
            Sessões por semana
          </Text>
          <View style={{ flexDirection: 'row', gap: 7 }}>
            {PER_WEEK_OPTIONS.map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => setPerWeek(n)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: radius.cardSm,
                  backgroundColor: perWeek === n ? colors.accent : colors.surface2,
                  borderWidth: 1.5,
                  borderColor: perWeek === n ? colors.accent : colors.line,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 18, color: perWeek === n ? '#fff' : colors.ink }}>
                  {n}
                </Text>
                <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 10, color: perWeek === n ? 'rgba(255,255,255,0.8)' : colors.ink3 }}>
                  ×/sem
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* training days */}
        <View style={{ gap: 10 }}>
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.ink3 }}>
            Dias de treino
          </Text>
          {days.map((day, idx) => (
            <View
              key={day.id}
              style={{
                backgroundColor: colors.surface2,
                borderWidth: 1.5,
                borderColor: colors.line,
                borderRadius: radius.card,
                padding: 14,
                gap: 10,
              }}
            >
              {/* day header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TextInput
                  value={day.name}
                  onChangeText={(t) => updateDayName(day.id, t)}
                  style={{
                    flex: 1,
                    fontFamily: 'HankenGrotesk_700Bold',
                    fontSize: 15,
                    color: colors.ink,
                  }}
                />
                {days.length > 1 && (
                  <TouchableOpacity onPress={() => removeDay(day.id)}>
                    <Text style={{ fontSize: 20, color: colors.ink3 }}>×</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* exercises */}
              {day.exercises.map((ex, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ flex: 1, fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink }}>
                    {i + 1}. {ex}
                  </Text>
                  <TouchableOpacity onPress={() => removeExercise(day.id, i)}>
                    <Text style={{ fontSize: 18, color: colors.ink3 }}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* add exercise input */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={exInput[day.id] ?? ''}
                  onChangeText={(t) => setExInput((m) => ({ ...m, [day.id]: t }))}
                  onSubmitEditing={() => addExercise(day.id, exInput[day.id] ?? '')}
                  placeholder="Adicionar exercício…"
                  placeholderTextColor={colors.ink3}
                  style={{
                    flex: 1,
                    fontFamily: 'HankenGrotesk_600SemiBold',
                    fontSize: 13.5,
                    color: colors.ink,
                    backgroundColor: colors.surface,
                    borderWidth: 1.5,
                    borderColor: colors.line,
                    borderRadius: radius.cardSm,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                  }}
                />
                <TouchableOpacity
                  onPress={() => addExercise(day.id, exInput[day.id] ?? '')}
                  style={{
                    backgroundColor: colors.accent,
                    borderRadius: radius.cardSm,
                    paddingHorizontal: 14,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 18, color: '#fff', lineHeight: 22 }}>+</Text>
                </TouchableOpacity>
              </View>

              {/* suggestion chips */}
              {(exInput[day.id] ?? '').length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {EXERCISE_SUGGESTIONS.filter((s) =>
                      s.toLowerCase().includes((exInput[day.id] ?? '').toLowerCase())
                    )
                      .slice(0, 6)
                      .map((s) => (
                        <TouchableOpacity
                          key={s}
                          onPress={() => addExercise(day.id, s)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            backgroundColor: colors.surface,
                            borderWidth: 1.5,
                            borderColor: colors.line,
                            borderRadius: 14,
                          }}
                        >
                          <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12.5, color: colors.ink2 }}>
                            {s}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                </ScrollView>
              )}
            </View>
          ))}

          <TouchableOpacity
            onPress={addDay}
            style={{
              borderWidth: 1.5,
              borderColor: colors.line,
              borderStyle: 'dashed',
              borderRadius: radius.card,
              paddingVertical: 14,
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 20, color: colors.ink3, lineHeight: 22 }}>+</Text>
            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink3 }}>
              Adicionar dia
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* actions */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
        <TouchableOpacity
          onPress={onClose}
          style={{
            flex: 1,
            paddingVertical: 15,
            borderRadius: radius.cardSm,
            borderWidth: 1.5,
            borderColor: colors.line,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: colors.ink2 }}>
            Cancelar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!valid}
          style={{
            flex: 2,
            paddingVertical: 15,
            borderRadius: radius.cardSm,
            backgroundColor: valid ? colors.accent : colors.line2,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: '#fff' }}>
            {program ? 'Salvar alterações' : 'Criar programa'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

// ─── Assign modal ─────────────────────────────────────────────────────────────

type AssignModalProps = {
  program: CoachProgram;
  athletes: CoachAthlete[];
  onAssign: (athleteId: string, programId: string | null) => void;
  onClose: () => void;
};

function AssignModal({ program, athletes, onAssign, onClose }: AssignModalProps) {
  const { colors, radius } = useTheme();
  const activeAthletes = athletes.filter((a) => a.status === 'active');

  return (
    <>
      <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink2 }}>
        Atribuir <Text style={{ fontFamily: 'HankenGrotesk_700Bold', color: colors.ink }}>{program.name}</Text> a atletas.
        Toque para alternar.
      </Text>
      <View style={{ gap: 2, maxHeight: 360 }}>
        <FlatList
          data={activeAthletes}
          keyExtractor={(a) => a.id}
          renderItem={({ item: a }) => {
            const assigned = a.programId === program.id;
            return (
              <TouchableOpacity
                onPress={() => onAssign(a.id, assigned ? null : program.id)}
                activeOpacity={0.65}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 13,
                  gap: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.line,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: assigned ? colors.accent : colors.surface2,
                    borderWidth: 1.5,
                    borderColor: assigned ? colors.accent : colors.line,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 13, color: assigned ? '#fff' : colors.ink }}>
                    {a.name.slice(0, 1)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, color: colors.ink }}>
                    {a.name}
                  </Text>
                  {a.programName && !assigned && (
                    <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: colors.ink3 }}>
                      Em: {a.programName}
                    </Text>
                  )}
                </View>
                {assigned && (
                  <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, color: colors.accent }}>✓ Atribuído</Text>
                )}
              </TouchableOpacity>
            );
          }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        />
      </View>
      <TouchableOpacity
        onPress={onClose}
        style={{
          paddingVertical: 15,
          borderRadius: radius.cardSm,
          backgroundColor: colors.ink,
          alignItems: 'center',
          marginTop: 6,
        }}
      >
        <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: colors.bg }}>
          Feito
        </Text>
      </TouchableOpacity>
    </>
  );
}

// ─── Program card ─────────────────────────────────────────────────────────────

function ProgramCard({
  program,
  assignedCount,
  onEdit,
  onAssign,
  onDelete,
}: {
  program: CoachProgram;
  assignedCount: number;
  onEdit: () => void;
  onAssign: () => void;
  onDelete: () => void;
}) {
  const { colors, radius } = useTheme();
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 18, letterSpacing: -0.2, color: colors.ink }}>
            {program.name}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View
              style={{
                backgroundColor: colors.surface2,
                borderRadius: 10,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 11.5, color: colors.ink2 }}>
                {program.focus}
              </Text>
            </View>
            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink3 }}>
              {program.perWeek}×/sem · {program.days.length} dias
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onDelete} style={{ padding: 4 }}>
          <Text style={{ fontSize: 18, color: colors.ink3 }}>×</Text>
        </TouchableOpacity>
      </View>

      {/* day chips */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {program.days.map((d) => (
          <View
            key={d.id}
            style={{
              backgroundColor: colors.surface2,
              borderWidth: 1.5,
              borderColor: colors.line,
              borderRadius: radius.cardSm,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12, color: colors.ink2 }}>
              {d.name}
            </Text>
          </View>
        ))}
      </View>

      {/* footer */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink3 }}>
          {assignedCount} atleta{assignedCount !== 1 ? 's' : ''}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={onEdit}
            style={{
              paddingHorizontal: 13,
              paddingVertical: 8,
              borderRadius: radius.cardSm,
              borderWidth: 1.5,
              borderColor: colors.line,
            }}
          >
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, color: colors.ink2 }}>
              Editar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onAssign}
            style={{
              paddingHorizontal: 13,
              paddingVertical: 8,
              borderRadius: radius.cardSm,
              backgroundColor: colors.accent,
            }}
          >
            <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, color: '#fff' }}>
              Atribuir
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Props = {
  programs: CoachProgram[];
  athletes: CoachAthlete[];
  onCreateProgram: (p: CoachProgram) => void;
  onUpdateProgram: (p: CoachProgram) => void;
  onDeleteProgram: (id: string) => void;
  onAssignProgram: (athleteId: string, programId: string | null) => void;
};

export function CoachPrograms({
  programs,
  athletes,
  onCreateProgram,
  onUpdateProgram,
  onDeleteProgram,
  onAssignProgram,
}: Props) {
  const { colors } = useTheme();
  const [builderOpen, setBuilderOpen] = React.useState(false);
  const [editingProgram, setEditingProgram] = React.useState<CoachProgram | null>(null);
  const [assigningProgram, setAssigningProgram] = React.useState<CoachProgram | null>(null);

  function openNew() {
    setEditingProgram(null);
    setBuilderOpen(true);
  }
  function openEdit(p: CoachProgram) {
    setEditingProgram(p);
    setBuilderOpen(true);
  }
  function handleSave(p: CoachProgram) {
    if (editingProgram) onUpdateProgram(p);
    else onCreateProgram(p);
    setBuilderOpen(false);
    setEditingProgram(null);
  }

  function countAssigned(progId: string) {
    return athletes.filter((a) => a.programId === progId).length;
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 14 }}
      showsVerticalScrollIndicator={false}
    >
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
        <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink3 }}>
          {programs.length} programa{programs.length !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity
          onPress={openNew}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: colors.accent,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 8,
          }}
        >
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 18, color: '#fff', lineHeight: 20 }}>+</Text>
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13.5, color: '#fff' }}>
            Novo programa
          </Text>
        </TouchableOpacity>
      </View>

      {programs.map((p) => (
        <ProgramCard
          key={p.id}
          program={p}
          assignedCount={countAssigned(p.id)}
          onEdit={() => openEdit(p)}
          onAssign={() => setAssigningProgram(p)}
          onDelete={() => onDeleteProgram(p.id)}
        />
      ))}

      {programs.length === 0 && (
        <View style={{ paddingTop: 40, alignItems: 'center', gap: 12 }}>
          <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink3, textAlign: 'center' }}>
            Nenhum programa ainda.{'\n'}Crie o primeiro para atribuir aos atletas.
          </Text>
        </View>
      )}

      {/* builder modal */}
      <AppModal
        visible={builderOpen}
        onClose={() => { setBuilderOpen(false); setEditingProgram(null); }}
        title={editingProgram ? 'Editar programa' : 'Novo programa'}
      >
        <ProgramBuilder
          program={editingProgram}
          onSave={handleSave}
          onClose={() => { setBuilderOpen(false); setEditingProgram(null); }}
        />
      </AppModal>

      {/* assign modal */}
      {assigningProgram && (
        <AppModal
          visible={!!assigningProgram}
          onClose={() => setAssigningProgram(null)}
          title="Atribuir programa"
        >
          <AssignModal
            program={assigningProgram}
            athletes={athletes}
            onAssign={onAssignProgram}
            onClose={() => setAssigningProgram(null)}
          />
        </AppModal>
      )}
    </ScrollView>
  );
}
