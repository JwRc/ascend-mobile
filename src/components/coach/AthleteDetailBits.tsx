import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme, semanticColors } from '@/theme';
import type { CoachProgram } from '@/store/coach.store';

// ─── Stat chip ────────────────────────────────────────────────────────────────

export function StatChip({
  label,
  value,
  unit,
  warn,
}: {
  label: string;
  value: string | number;
  unit?: string;
  warn?: boolean;
}) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        minWidth: 72,
        backgroundColor: colors.surface2,
        borderWidth: 1.5,
        borderColor: warn ? `${semanticColors.warning}60` : colors.line,
        borderRadius: radius.card,
        padding: 12,
        gap: 3,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: 'HankenGrotesk_600SemiBold',
          fontSize: 10,
          letterSpacing: 0.7,
          textTransform: 'uppercase',
          color: colors.ink3,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: 'Archivo_800ExtraBold',
          fontSize: 22,
          letterSpacing: -0.5,
          color: warn ? semanticColors.warning : colors.ink,
        }}
      >
        {value}
        {unit && (
          <Text style={{ fontSize: 11, fontFamily: 'HankenGrotesk_700Bold', color: colors.ink3 }}>
            {unit}
          </Text>
        )}
      </Text>
    </View>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

export function SectionLabel({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        fontFamily: 'HankenGrotesk_700Bold',
        fontSize: 11.5,
        letterSpacing: 0.7,
        textTransform: 'uppercase',
        color: colors.ink3,
      }}
    >
      {title}
    </Text>
  );
}

// ─── Program picker ───────────────────────────────────────────────────────────

export function ProgramPicker({
  programs,
  value,
  onChange,
}: {
  programs: CoachProgram[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const { colors, radius } = useTheme();
  const [open, setOpen] = React.useState(false);
  const selected = programs.find((p) => p.id === value) ?? null;

  return (
    <View style={{ gap: 6 }}>
      <TouchableOpacity
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.7}
        style={{
          backgroundColor: colors.surface2,
          borderWidth: 1.5,
          borderColor: colors.line,
          borderRadius: radius.cardSm,
          paddingHorizontal: 14,
          paddingVertical: 13,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{
            fontFamily: 'HankenGrotesk_700Bold',
            fontSize: 15,
            color: selected ? colors.ink : colors.ink3,
          }}
        >
          {selected ? selected.name : 'Sem programa atribuído'}
        </Text>
        <Text style={{ fontSize: 14, color: colors.ink3 }}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1.5,
            borderColor: colors.line,
            borderRadius: radius.card,
            overflow: 'hidden',
          }}
        >
          <TouchableOpacity
            onPress={() => { onChange(null); setOpen(false); }}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 13,
              borderBottomWidth: 1,
              borderBottomColor: colors.line,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: colors.ink3 }}>
              Sem programa
            </Text>
            {!value && <Text style={{ color: colors.accent }}>✓</Text>}
          </TouchableOpacity>
          {programs.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => { onChange(p.id); setOpen(false); }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 13,
                borderBottomWidth: 1,
                borderBottomColor: colors.line,
                backgroundColor: p.id === value ? `${colors.accent}10` : undefined,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View>
                <Text style={{ fontFamily: 'HankenGrotesk_700Bold', fontSize: 14, color: colors.ink }}>
                  {p.name}
                </Text>
                <Text style={{ fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: colors.ink3 }}>
                  {p.focus} · {p.perWeek}×/sem
                </Text>
              </View>
              {p.id === value && <Text style={{ color: colors.accent }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
