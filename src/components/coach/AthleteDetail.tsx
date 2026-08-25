import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useTheme } from '@/theme';
import { semanticColors } from '@/theme';
import { Card } from '@/components/shared/Card';
import { StatusPill } from './StatusPill';
import { FlagBadge } from './FlagBadge';
import { Stepper } from '@/components/shared/Stepper';
import { CoachLogWorkoutSection } from './CoachLogWorkoutSection';
import { StatChip, SectionLabel, ProgramPicker } from './AthleteDetailBits';
import type { CoachAthlete, CoachProgram } from '@/store/coach.store';
import { STALE_DAYS } from '@/store/coach.store';

// ─── Invited detail ───────────────────────────────────────────────────────────

function InvitedDetail({
  athlete,
  onResend,
  onCancel,
}: {
  athlete: CoachAthlete;
  onResend: () => void;
  onCancel: () => void;
}) {
  const { colors, radius } = useTheme();
  const ago = athlete.invitedAt
    ? Math.floor((Date.now() - athlete.invitedAt) / 86_400_000)
    : null;

  return (
    <Card style={{ gap: 16, alignItems: 'center' }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          borderWidth: 2,
          borderColor: semanticColors.accentCobalt,
          borderStyle: 'dashed',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 26, color: semanticColors.accentCobalt }}>
          {athlete.name.slice(0, 1)}
        </Text>
      </View>

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 20, color: colors.ink, textAlign: 'center' }}>
          Convite pendente
        </Text>
        <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13.5, color: colors.ink3, textAlign: 'center' }}>
          {athlete.name} ainda não aceitou o convite.
          {ago != null && ` Enviado há ${ago === 0 ? 'menos de 1' : ago} dia${ago !== 1 ? 's' : ''}.`}
        </Text>
        <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13.5, color: semanticColors.accentCobalt }}>
          {athlete.contactType === 'phone' ? '☎ ' : '✉ '}
          {athlete.email}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
        <TouchableOpacity
          onPress={onCancel}
          style={{
            flex: 1,
            paddingVertical: 14,
            borderRadius: radius.cardSm,
            borderWidth: 1.5,
            borderColor: semanticColors.danger,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, color: semanticColors.danger }}>
            Cancelar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onResend}
          style={{
            flex: 2,
            paddingVertical: 14,
            borderRadius: radius.cardSm,
            backgroundColor: semanticColors.accentCobalt,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, color: '#fff' }}>
            Reenviar convite
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Props = {
  athlete: CoachAthlete;
  programs: CoachProgram[];
  onAssignProgram: (athleteId: string, programId: string | null) => void;
  onUpdateGoal: (athleteId: string, goal: number) => void;
  onUpdateNotes: (athleteId: string, notes: string) => void;
  onResendInvite: (athleteId: string) => void;
  onCancelInvite: (athleteId: string) => void;
  onRemoveStudent?: (athleteId: string) => void;
  isMe?: boolean;
  extraContent?: React.ReactNode;
};

export function AthleteDetail({
  athlete,
  programs,
  onAssignProgram,
  onUpdateGoal,
  onUpdateNotes,
  onResendInvite,
  onCancelInvite,
  onRemoveStudent,
  isMe,
  extraContent,
}: Props) {
  const { colors, radius } = useTheme();
  const [notes, setNotes] = React.useState(athlete.notes);
  const [notesDirty, setNotesDirty] = React.useState(false);
  const [confirmRemove, setConfirmRemove] = React.useState(false);

  React.useEffect(() => {
    setNotes(athlete.notes);
    setNotesDirty(false);
  }, [athlete.id]);

  const lostGood = athlete.goalDir === 'lose' ? athlete.weekDelta < 0 : athlete.weekDelta > 0;
  const arrow = athlete.weekDelta === 0 ? '—' : athlete.weekDelta < 0 ? '▾' : '▴';
  const u = athlete.units;
  const sessionLabel =
    athlete.assignedPerWeek != null
      ? `${athlete.sessionsThisWeek}/${athlete.assignedPerWeek}`
      : `${athlete.sessionsThisWeek}`;

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 48, gap: 0 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Identity header ─────────────────────────────────────────── */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 18,
          gap: 12,
          borderBottomWidth: 1.5,
          borderBottomColor: colors.line,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.ink,
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Text style={{ fontFamily: 'Archivo_800ExtraBold', fontSize: 22, color: colors.bg }}>
              {athlete.name.slice(0, 1)}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{
                fontFamily: 'Archivo_800ExtraBold',
                fontSize: 22,
                letterSpacing: -0.3,
                color: colors.ink,
              }}
            >
              {athlete.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <StatusPill status={athlete.status} />
              <Text
                style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12.5, color: colors.ink3 }}
              >
                {athlete.email}
              </Text>
            </View>
          </View>
        </View>

        {/* flags */}
        {(athlete.flags?.length ?? 0) > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {athlete.flags!.map((f, i) => (
              <FlagBadge key={i} flag={f} />
            ))}
          </View>
        )}
      </View>

      {/* Para o próprio perfil do coach (isMe), peso/programa/notas vivem dentro da
          aba Métricas de StudentOwnSection (extraContent) — evita duplicar e permite
          alternar pra Força sem rolar por tudo isso primeiro. */}
      {!isMe && (
        <>
          {/* ── Stat strip ──────────────────────────────────────────────── */}
          {athlete.status === 'active' && (
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 16,
                borderBottomWidth: 1.5,
                borderBottomColor: colors.line,
              }}
            >
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <StatChip label={`Peso (${u})`} value={athlete.trend} />
                  <StatChip
                    label="Δ semana"
                    value={`${arrow} ${Math.abs(athlete.weekDelta)}`}
                    warn={athlete.goalDir !== 'maintain' && !lostGood}
                  />
                  <StatChip label="Meta %" value={athlete.goalPct} unit="%" />
                  <StatChip
                    label="Último log"
                    value={
                      athlete.daysSinceLog == null
                        ? '—'
                        : athlete.daysSinceLog === 0
                        ? 'hoje'
                        : `${athlete.daysSinceLog}d`
                    }
                    warn={athlete.daysSinceLog != null && athlete.daysSinceLog >= STALE_DAYS}
                  />
                  <StatChip label="Sessões/sem" value={sessionLabel} />
                </View>
              </ScrollView>
            </View>
          )}
        </>
      )}

      {/* ── Body ───────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 24 }}>
        {athlete.status === 'invited' ? (
          <InvitedDetail
            athlete={athlete}
            onResend={() => onResendInvite(athlete.id)}
            onCancel={() => onCancelInvite(athlete.id)}
          />
        ) : (
          <>
            {!isMe && (
              <>
                {/* programa */}
                <View style={{ gap: 10 }}>
                  <SectionLabel title="Programa" />
                  <ProgramPicker
                    programs={programs}
                    value={athlete.programId}
                    onChange={(id) => onAssignProgram(athlete.id, id)}
                  />
                  {athlete.programId && (() => {
                    const prog = programs.find((p) => p.id === athlete.programId);
                    if (!prog) return null;
                    return (
                      <View
                        style={{
                          backgroundColor: colors.surface2,
                          borderRadius: radius.cardSm,
                          padding: 12,
                          gap: 6,
                        }}
                      >
                        <Text
                          style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 12.5, color: colors.ink3 }}
                        >
                          {prog.focus} · {prog.perWeek}×/sem · {prog.days.length} dias
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                          {prog.days.map((d) => (
                            <View
                              key={d.id}
                              style={{
                                backgroundColor: colors.surface,
                                borderRadius: 10,
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderWidth: 1,
                                borderColor: colors.line,
                              }}
                            >
                              <Text
                                style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 11.5, color: colors.ink2 }}
                              >
                                {d.name}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })()}
                </View>

                {/* meta */}
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <SectionLabel title="Meta de peso" />
                    <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: colors.ink3 }}>
                      {athlete.goalDir === 'lose' ? 'Emagrecimento' : athlete.goalDir === 'gain' ? 'Ganho de massa' : 'Manutenção'} · {u}
                    </Text>
                  </View>
                  <Stepper
                    value={athlete.goal ?? athlete.trend ?? 70}
                    step={0.5}
                    unit={u}
                    min={30}
                    max={250}
                    onChange={(v) => onUpdateGoal(athlete.id, v)}
                  />
                </View>

                {/* notas */}
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <SectionLabel title="Notas do coach" />
                    {notesDirty && (
                      <TouchableOpacity
                        onPress={() => {
                          onUpdateNotes(athlete.id, notes);
                          setNotesDirty(false);
                        }}
                      >
                        <Text
                          style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13, color: colors.accent }}
                        >
                          Salvar
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    value={notes}
                    onChangeText={(t) => { setNotes(t); setNotesDirty(true); }}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    placeholder="Observações, restrições, histórico relevante…"
                    placeholderTextColor={colors.ink3}
                    style={{
                      fontFamily: 'HankenGrotesk_600SemiBold',
                      fontSize: 14,
                      color: colors.ink,
                      backgroundColor: colors.surface2,
                      borderWidth: 1.5,
                      borderColor: notesDirty ? colors.accent : colors.line,
                      borderRadius: radius.card,
                      padding: 14,
                      minHeight: 110,
                    }}
                  />
                </View>

                {/* treino ao vivo */}
                <CoachLogWorkoutSection
                  studentId={athlete.id}
                  studentName={athlete.name}
                  units={athlete.units}
                />
              </>
            )}
          </>
        )}

        {extraContent}

        {/* ── Zona de perigo ──────────────────────────────────────────── */}
        {athlete.status !== 'invited' && !isMe && onRemoveStudent && (
          <View style={{ gap: 10, marginTop: 8 }}>
            <SectionLabel title="Zona de perigo" />
            {!confirmRemove ? (
              <TouchableOpacity
                onPress={() => setConfirmRemove(true)}
                style={{
                  paddingVertical: 13,
                  borderRadius: radius.cardSm,
                  borderWidth: 1.5,
                  borderColor: semanticColors.danger,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, color: semanticColors.danger }}>
                  Remover aluno
                </Text>
              </TouchableOpacity>
            ) : (
              <View
                style={{
                  gap: 10,
                  padding: 14,
                  borderRadius: radius.card,
                  borderWidth: 1.5,
                  borderColor: `${semanticColors.danger}60`,
                  backgroundColor: `${semanticColors.danger}0c`,
                }}
              >
                <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: colors.ink2, lineHeight: 19 }}>
                  {athlete.name} deixará de aparecer no seu roster. O histórico de treinos e pesagens do aluno é preservado.
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => setConfirmRemove(false)}
                    style={{ flex: 1, paddingVertical: 12, borderRadius: radius.cardSm, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center' }}
                  >
                    <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13.5, color: colors.ink2 }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onRemoveStudent(athlete.id)}
                    style={{ flex: 1, paddingVertical: 12, borderRadius: radius.cardSm, backgroundColor: semanticColors.danger, alignItems: 'center' }}
                  >
                    <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 13.5, color: '#fff' }}>Confirmar remoção</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
