import { hasCompletedOnboarding, markOnboardingCompleted } from '@/app/onboarding/onboardingState';

const mockGetItemAsync = jest.fn<Promise<string | null>, [string]>();
const mockSetItemAsync = jest.fn<Promise<void>, [string, string]>();

jest.mock('expo-settings-storage', () => ({
  getItem: (key: string) => mockGetItemAsync(key),
  setItem: (key: string, value: string) => mockSetItemAsync(key, value),
}));

describe('onboardingState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when onboarding has been completed', async () => {
    mockGetItemAsync.mockResolvedValueOnce('true');

    await expect(hasCompletedOnboarding()).resolves.toBe(true);
  });

  it('returns false when onboarding has not been completed', async () => {
    mockGetItemAsync.mockResolvedValueOnce(null);

    await expect(hasCompletedOnboarding()).resolves.toBe(false);
  });

  it('persists onboarding completion with a versioned key', async () => {
    mockSetItemAsync.mockResolvedValueOnce();

    await markOnboardingCompleted();

    expect(mockSetItemAsync).toHaveBeenCalledWith('comrades.onboarding.completed.v1', 'true');
  });
});
