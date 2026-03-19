import {
  mapSecureStorageAuthErrorToRetryable
} from '@/modules/security/secureStorageContract';
import { getCachedAppDataEncryptionKey } from '@/modules/security/sessionEncryptionKey';
import { unloadSensitiveAppState } from '@/modules/state/appState';
  
import { getOrCreateAppDataEncryptionKey } from '@/modules/protocol/crypto/appDataEncryptionKey';
import { hydrateSecureAppState } from '../state/secureStatePersistence';
export type DeviceAuthenticationResult = {
  status: 'success' | 'failed' | 'canceled';
  encryptionKey?: string;
};

export type UnlockGateResult = {
  status: 'unlocked' | 'locked';
  reason?: 'auth_failed' | 'auth_canceled' | 'hydrate_failed';
};

export type UnlockGateOptions = {
  authenticate?: () => Promise<DeviceAuthenticationResult>;
  hydrateState?: (params: { encryptionKey?: string }) => Promise<void>;
  unloadState?: () => void;
};

let inFlightUnlock: Promise<UnlockGateResult> | null = null;

function isCanceledAuthenticationError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return message.includes('cancel') || message.includes('declined') || message.includes('dismissed');
}

export async function performDeviceAuthentication(): Promise<DeviceAuthenticationResult> {
  try {
    const cachedEncryptionKey = getCachedAppDataEncryptionKey();
    if (cachedEncryptionKey) {
      return { status: 'success', encryptionKey: cachedEncryptionKey };
    }
    const encryptionKey = await getOrCreateAppDataEncryptionKey();
    return { status: 'success', encryptionKey };
  } catch (error) {
    const retryableError = mapSecureStorageAuthErrorToRetryable(error);

    if (isCanceledAuthenticationError(retryableError)) {
      return { status: 'canceled' };
    }

    return { status: 'failed' };
  }
}

export async function unlockGate(): Promise<UnlockGateResult> {
  const authenticationResult = await performDeviceAuthentication()

    if (authenticationResult.status === 'canceled') {
      unloadSensitiveAppState();
      return { status: 'locked', reason: 'auth_canceled' };
    }

    if (authenticationResult.status === 'failed') {
      unloadSensitiveAppState();
      return { status: 'locked', reason: 'auth_failed' };
    }

    try {
      await hydrateSecureAppState(
        authenticationResult.encryptionKey!
      );
      return { status: 'unlocked' };
    } catch (error) {
      console.warn('Secure state hydration failed during unlock gate', error);
      unloadSensitiveAppState();
      return { status: 'locked', reason: 'hydrate_failed' };
    }
}

