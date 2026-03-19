import type { PermissionCheckResult } from '@/modules/onboarding/bluetoothPermission';
import {
  type SecureStorageAuthSession
} from '@/modules/security/secureStorageContract';
import { getOrCreateAppDataEncryptionKey } from '../protocol/crypto/appDataEncryptionKey';

const SECURE_STORE_PROBE_KEY = 'comrades.onboarding.secure-store.probe';

function mapAuthenticationPromptFailure(message: string): PermissionCheckResult {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('cancel') || normalizedMessage.includes('dismiss')) {
    return {
      status: 'denied',
      errorMessage: 'Device authentication was canceled. Approve secure storage access and retry.',
    };
  }

  if (
    normalizedMessage.includes('unavailable') ||
    normalizedMessage.includes('not configured') ||
    normalizedMessage.includes('not enrolled') ||
    normalizedMessage.includes('no passcode') ||
    normalizedMessage.includes('no foreground activity')
  ) {
    return {
      status: 'blocked',
      errorMessage: 'Secure lock screen / biometrics are not configured for protected secure storage on this device.',
    };
  }

  return {
    status: 'blocked',
    errorMessage: 'Device authentication prerequisites are unavailable for protected secure storage.',
  };
}

export function createSecureStoreReadinessChecker(options: {
  authSession?: SecureStorageAuthSession;
} = {}): () => Promise<PermissionCheckResult> {
  return async () => {
    try {
      await getOrCreateAppDataEncryptionKey()
      return { status: 'granted' } 
    } catch(e) {
      return { status: 'blocked' }
    }
  };
}
