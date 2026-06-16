---
name: backend-integration-status
description: Estado da integração com o backend no frontend mobile — o que foi feito e o que falta
metadata:
  type: project
---

Integração com o backend implementada nas Fases 1-5.

**Why:** Substituir dados mockados nos stores Zustand por chamadas reais à API NestJS do ASCEND.

**O que foi feito:**

Fase 1 — Fundação:
- `.env` criado com `EXPO_PUBLIC_API_URL` e `EXPO_PUBLIC_BETTER_AUTH_URL` apontando para localhost
- `src/types/api.ts` — todos os tipos TypeScript espelhando os contratos de `/docs/api-contracts.md`
- `src/api/client.ts` — instância Axios com interceptor de auth (Bearer token do SecureStore) e 401 → redirect
- `src/lib/auth.ts` — `authClient` via `better-auth/client` com `fetchOptions.customFetchImpl` para injetar token

Fase 2 — Auth real:
- `src/store/auth.store.ts` — slim: só `isAuthenticated`, `hydrated`, `userId`, `email`, `role` (`STUDENT`|`COACH`)
- `app/_layout.tsx` — adicionado `QueryClientProvider` (cliente criado fora do componente)
- `app/index.tsx` — chama `authClient.getSession()` no mount; popula store e redireciona por role
- `app/(app)/_layout.tsx` — guard: espera `hydrated`, verifica `STUDENT`
- `app/(coach)/_layout.tsx` — guard: espera `hydrated`, verifica `COACH`
- `app/(auth)/login.tsx` — usa `authClient.signIn.email()`, persiste token com `persistToken()`, navega por role

Fase 3 — Hooks TanStack Query em `src/api/hooks/`:
- `useStudentProfile`, `useUpdateStudentProfile`
- `useBodyRecords`, `useLogWeight`, `useDeleteBodyRecord`
- `useGoals` (`useActiveGoal`, `useSetGoal`)
- `useWorkouts`, `useLogWorkout`, `useDeleteWorkout`
- `useWorkoutTemplates` (+ create/update/delete)
- `usePrograms`, `useAssignedProgram` (+ create/update/delete)
- `useStudents`, `useStudentById`, `useUpdateStudentGoal`, `useAssignStudentProgram`
- `useInvites`, `useCreateInvite`, `useRevokeInvite`, `useResendInvite`
- `useDashboard` (`useCoachDashboard`, `useStudentDashboard`)

Fase 4 — Telas migradas:
- `app/(app)/index.tsx` — seção de peso usa hooks API; seção força ainda usa `strength.store` (mock)
- `app/(onboarding)/index.tsx` — chama `PATCH /students/me` + `POST /goals` ao completar
- Helpers `apiGoalTypeToLocal` / `localGoalTypeToApi` para converter entre `'LOSE'|'GAIN'|'MAINTAIN'` e `'lose'|'strength'|'maintain'`

Fase 5 — Offline-first:
- `src/store/workout.store.ts` — sessão ativa + fila `pendingSync` em memória
- `src/api/hooks/useWorkoutSync.ts` — ouve NetInfo, processa fila ao reconectar

**Migração completa — todos os dados são reais:**
- Seção Força no dashboard do aluno: templates via `useWorkoutTemplates()`, workouts via `useWorkouts()`, finish chama `useLogWorkout()` e recebe PRs da API
- Telas do coach: `app/(coach)/index.tsx` usa `useCoachDashboard`, `useStudents`, `usePrograms`; athlete detail usa `useStudentById`, `useInvites`
- Adapters de tipos: `studentToAthlete`, `apiProgramToCoach`, `dashboardToStats` (em cada screen que precisar)

**O que AINDA não está implementado:**
- Editor de templates de treino (onEditTemplate é no-op)
- Notes de atleta pelo coach (onUpdateNotes é no-op — sem endpoint na API)
- Push notifications (FCM)
- PostHog analytics
- Build EAS

**How to apply:** Ao trabalhar em telas ou features, verificar se a tela já foi migrada para API ou ainda usa store mock.
