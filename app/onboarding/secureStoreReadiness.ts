import SettingsStorage from 'expo-settings-storage';

import type { PermissionCheckResult } from '@/app/onboarding/bluetoothPermission';
const PROBE_KEY = 'comrades.onboarding.secure-store.probe.v1';
const PROBE_VALUE = 'ok';

export async function probeSecureStoreReadiness(): Promise<PermissionCheckResult> {
  try {
    await SettingsStorage.setItem(PROBE_KEY, PROBE_VALUE);
    const value = await SettingsStorage.getItem(PROBE_KEY);
    await SettingsStorage.deleteItem(PROBE_KEY);

    if (value !== PROBE_VALUE) {
      return {
        status: 'blocked',
        errorMessage: 'Secure key storage probe failed. Please retry.',
      };
    }

    return { status: 'granted' };
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).toLowerCase();

    if (message.includes('not available') || message.includes('unavailable')) {
      return {
        status: 'blocked',
        errorMessage: 'Secure key storage is unavailable on this device.',
      };
    }

    if (
      message.includes('cancel') ||
      message.includes('canceled') ||
      message.includes('cancelled') ||
      message.includes('denied') ||
      message.includes('not authenticated') ||
      message.includes('authentication') ||
      message.includes('biometric') ||
      message.includes('passcode')
    ) {
      return {
        status: 'denied',
        errorMessage: `Secure key storage permission was denied by the OS.: ${message}`,
      };
    }

    return {
      status: 'denied',
      errorMessage: 'Secure key storage permission was denied by the OS.',
    };
  }
}
