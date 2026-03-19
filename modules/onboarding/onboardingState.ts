import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETED_KEY = 'comrades.onboarding.completed.v1';
const ONBOARDING_COMPLETED_VALUE = 'true';

export async function hasCompletedOnboarding(): Promise<boolean> {
  const storedValue = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);

  return storedValue === ONBOARDING_COMPLETED_VALUE;
}

export async function markOnboardingCompleted(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, ONBOARDING_COMPLETED_VALUE);
}
