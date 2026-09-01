import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { AppModal } from '@/components/shared/AppModal';
import { Field, StyledInput } from '@/components/shared/Field';
import { Btn } from '@/components/shared/Btn';
import { useTheme } from '@/theme';
import { useUpdateWorkoutTemplate, useDeleteWorkoutTemplate } from '@/api/hooks/useWorkoutTemplates';
import type { WorkoutTemplate } from '@/types/api';

const DURATION_CHIPS = [30, 45, 60, 75, 90];

type Props = {
  visible: boolean;
  template: WorkoutTemplate | null;
  onClose: () => void;
  suggestions: string[];
};

export function TemplateEditorModal({ visible, template, onClose, suggestions }: Props) {
  const { colors, radius } = useTheme();
  const updateTemplate = useUpdateWorkoutTemplate();
  const deleteTemplate = useDeleteWorkoutTemplate();

  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<string[]>([]);
  const [targetMin, setTargetMin] = useState('');
  const [adding, setAdding] = useState('');

  useEffect(() => {
    if (template) {
      setName(template.name);
      setExercises([...template.exercises]);
      setTargetMin(template.targetMin != null ? String(template.targetMin) : '');
      setAdding('');
    }
  }, [template?.id]);

  function addExercise(ex: string) {
    const trimmed = ex.trim();
    if (!trimmed) return;
    if (exercises.some((e) => e.toLowerCase() === trimmed.toLowerCase())) return;
    setExercises((prev) => [...prev, trimmed]);
    setAdding('');
  }

  function removeAt(idx: number) {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setExercises((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }

  function moveDown(idx: number) {
    setExercises((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }

  async function handleSave() {
    if (!template) return;
    const tm = targetMin === '' ? null : (Math.max(0, Math.round(Number(targetMin))) || null);
    await updateTemplate.mutateAsync({
      id: template.id,
      name: name.trim() || template.name,
      exercises,
      targetMin: tm,
    });
    onClose();
  }

  function handleDelete() {
    if (!template) return;
    Alert.alert(
      'Excluir template',
      `Deseja excluir "${template.name}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteTemplate.mutateAsync(template.id);
            onClose();
          },
        },
      ],
    );
  }

  const visibleSuggestions = suggestions
    .filter((s) => !exercises.some((e) => e.toLowerCase() === s.toLowerCase()))
    .slice(0, 8);

  if (!template) return null;

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Editar template"
      footer={
        <>
          <Btn kind="primary" full loading={updateTemplate.isPending} onPress={handleSave}>
            Salvar
          </Btn>
          <Btn kind="danger" full onPress={handleDelete}>
            Excluir template
          </Btn>
        </>
      }
    >
      <Field label="Nome">
        <StyledInput
          value={name}
          onChangeText={setName}
          placeholder="Nome do template"
          returnKeyType="done"
        />
      </Field>

      <Field label="Duração estimada">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, flexDirection: 'row' }}
        >
          {DURATION_CHIPS.map((m) => {
            const selected = targetMin === String(m);
            return (
              <TouchableOpacity
                key={m}
                onPress={() => setTargetMin(selected ? '' : String(m))}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: radius.cardSm,
                  backgroundColor: selected ? colors.accent : colors.surface2,
                  borderWidth: 1.5,
                  borderColor: selected ? colors.accent : colors.line,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'HankenGrotesk_700Bold',
                    fontSize: 13,
                    color: selected ? '#fff' : colors.ink2,
                  }}
                >
                  {m}m
                </Text>
              </TouchableOpacity>
            );
          })}
          <TextInput
            value={!DURATION_CHIPS.includes(Number(targetMin)) && targetMin !== '' ? targetMin : ''}
            onChangeText={(v) => setTargetMin(v.replace(/[^0-9]/g, ''))}
            placeholder="Outro"
            placeholderTextColor={colors.ink3}
            keyboardType="numeric"
            style={{
              backgroundColor: colors.surface2,
              borderWidth: 1.5,
              borderColor: colors.line,
              borderRadius: radius.cardSm,
              paddingHorizontal: 14,
              paddingVertical: 10,
              fontFamily: 'HankenGrotesk_500Medium',
              fontSize: 13,
              color: colors.ink,
              minWidth: 70,
            }}
          />
        </ScrollView>
      </Field>

      <Field label="Exercícios">
        <View style={{ gap: 8 }}>
          {exercises.map((ex, idx) => (
            <View
              key={`${idx}-${ex}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: colors.surface2,
                borderWidth: 1.5,
                borderColor: colors.line,
                borderRadius: radius.cardSm,
                paddingHorizontal: 12,
                paddingVertical: 11,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  fontFamily: 'HankenGrotesk_600SemiBold',
                  fontSize: 14,
                  color: colors.ink,
                }}
              >
                {idx + 1}. {ex}
              </Text>
              <TouchableOpacity
                onPress={() => moveUp(idx)}
                disabled={idx === 0}
                hitSlop={8}
                style={{ padding: 4 }}
              >
                <Text style={{ fontSize: 15, color: idx === 0 ? colors.line : colors.ink2 }}>↑</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => moveDown(idx)}
                disabled={idx === exercises.length - 1}
                hitSlop={8}
                style={{ padding: 4 }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    color: idx === exercises.length - 1 ? colors.line : colors.ink2,
                  }}
                >
                  ↓
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeAt(idx)} hitSlop={8} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: colors.ink3, lineHeight: 20 }}>×</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <StyledInput
                value={adding}
                onChangeText={setAdding}
                placeholder="Novo exercício..."
                returnKeyType="done"
                onSubmitEditing={() => addExercise(adding)}
              />
            </View>
            <TouchableOpacity
              onPress={() => addExercise(adding)}
              style={{
                backgroundColor: colors.ink,
                borderRadius: radius.cardSm,
                paddingHorizontal: 18,
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: 'HankenGrotesk_700Bold',
                  fontSize: 20,
                  color: colors.bg,
                  lineHeight: 24,
                }}
              >
                +
              </Text>
            </TouchableOpacity>
          </View>

          {visibleSuggestions.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, flexDirection: 'row' }}
            >
              {visibleSuggestions.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => addExercise(s)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: radius.cardSm,
                    backgroundColor: colors.surface2,
                    borderWidth: 1.5,
                    borderColor: colors.line,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'HankenGrotesk_600SemiBold',
                      fontSize: 12.5,
                      color: colors.ink2,
                    }}
                  >
                    + {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </Field>
    </AppModal>
  );
}
