import { probeSecureStoreReadiness } from '@/app/onboarding/secureStoreReadiness';
import { setSecureStorageMode } from '@/app/security/secureStorage';
import SettingsStorage from 'expo-settings-storage';

jest.mock('expo-settings-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  deleteItem: jest.fn(),
}));

jest.mock('@/app/security/secureStorage', () => ({
  setSecureStorageMode: jest.fn(async () => undefined),
}));

describe('probeSecureStoreReadiness', () => {
  const mockSetStorageMode = jest.mocked(setSecureStorageMode);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(SettingsStorage.setItem).mockResolvedValue(undefined);
    jest.mocked(SettingsStorage.getItem).mockResolvedValue('ok');
    jest.mocked(SettingsStorage.deleteItem).mockResolvedValue(undefined);
  });

  it('uses authenticated secure-store mode when Android supports biometric auth', async () => {
    await expect(probeSecureStoreReadiness()).resolves.toEqual({ status: 'granted' });
    expect(mockSetStorageMode).toHaveBeenCalledWith('authenticated-secure-store');
  });

  it('returns granted with fallback guidance when authenticated Android storage is unavailable', async () => {
    await expect(probeSecureStoreReadiness()).resolves.toEqual({
      status: 'granted',
      errorMessage:
        'Secure lock screen / biometrics are not configured. Continuing with secure storage without OS authentication prompts.',
    });

    expect(mockSetStorageMode).toHaveBeenCalledWith('secure-store-without-auth');
  });
});
