import { useMutation } from '@tanstack/react-query';
import { api } from '../client';
import { useAuthStore } from '@/store/auth.store';

type CompleteOnboardingResponse = {
  onboardingCompletedAt: string;
  role: 'STUDENT' | 'COACH';
  tenantId: string | null;
  userPlan: 'STANDALONE' | null;
};

export function useCompleteOnboarding() {
  const setOnboardingCompleted = useAuthStore((s) => s.setOnboardingCompleted);
  return useMutation({
    mutationFn: async (body: { setupIntentId?: string } = {}) => {
      const res = await api.post<CompleteOnboardingResponse>('/users/me/complete-onboarding', body);
      return res.data;
    },
    onSuccess: () => setOnboardingCompleted(true),
  });
}
