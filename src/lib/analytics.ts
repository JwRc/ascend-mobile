import PostHog from 'posthog-react-native';

const key = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';

export const posthog = key
  ? new PostHog(key, {
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    })
  : null;

export const identify = (userId: string, role: string) =>
  posthog?.identify(userId, { role });

export const resetAnalytics = () => posthog?.reset();

export const capture = (
  event: string,
  props?: Record<string, string | boolean | number>,
) => posthog?.capture(event, { ...props, platform: 'mobile' });
