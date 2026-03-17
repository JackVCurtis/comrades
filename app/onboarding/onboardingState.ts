import * as SecureStore from 'expo-secure-store';

const ONBOARDING_COMPLETED_KEY = 'comrades.onboarding.completed.v1';
const ONBOARDING_COMPLETED_VALUE = 'true';

export async function hasCompletedOnboarding(): Promise<boolean> {
  const storedValue = await SecureStore.getItemAsync(ONBOARDING_COMPLETED_KEY);

  return storedValue === ONBOARDING_COMPLETED_VALUE;
}

export async function markOnboardingCompleted(): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDING_COMPLETED_KEY, ONBOARDING_COMPLETED_VALUE);
}
