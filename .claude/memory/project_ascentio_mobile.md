---
name: project-ascentio-mobile
description: Estado atual do projeto frontend-mobile do Ascentio — estrutura, o que foi implementado e o que falta
metadata:
  type: project
---

App nomeado **Ascentio** (era ASCEND). Projeto React Native / Expo em `/home/jwrc/weight-tracker/ascend/frontend-mobile/`.

**Why:** App mobile para atletas registrarem peso e treinos; coaches monitoram alunos.

**Estrutura criada:**
- `app/_layout.tsx` — root layout com ThemeContext, fontes (Archivo + Hanken Grotesk), expo-splash-screen
- `app/index.tsx` — tela Welcome
- `app/(auth)/login.tsx` — tela de login
- `app/(onboarding)/index.tsx` — wizard 8 passos completo
- `app/(app)/index.tsx` — dashboard aluno (Weight tab completo + placeholder Strength)
- `app/(coach)/index.tsx` — placeholder coach

**Componentes base em `src/components/shared/`:**
Logo, Btn, Card, SegmentedControl (Reanimated), Stepper, Field/StyledInput, OptRow, Switch, ToggleCard, Avatar, AppModal, Chip

**Componentes de peso em `src/components/weight/`:**
WeightChart (react-native-svg), LogModal, GoalEditModal

**Design system em `src/theme/`:**
ThemeContext com `buildTheme(isDark, direction, accent)`, tokens light/dark, tipografia

**Stores Zustand:**
- `src/store/ui.store.ts` — direction, accent, isDark
- `src/store/auth.store.ts` — profile, entries, coach, role

**Utils em `src/lib/utils.ts`:** round1, todayISO, movingAverage, weighInStreak, last7Days, convert, hexAlpha, epley1RM

**O que FALTA implementar:**
- Módulo de Força: WorkoutEntry, ActiveSession, ExerciseBlock, AddSetForm, PrCelebration, StrengthDashboard, TrainingStreakCard, StrengthChart
- Coach Shell completo: Overview, Roster, Programs, AthleteDetail, InviteModal
- Integração real com backend (tudo é demo/estado local por enquanto)

**How to apply:** Ao retomar, começar pelo módulo de força na sprint seguinte.
