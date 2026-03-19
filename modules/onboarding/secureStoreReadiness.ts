import type { PermissionCheckResult } from '@/modules/onboarding/bluetoothPermission';
import { getOrCreateAppDataEncryptionKey } from '../protocol/crypto/appDataEncryptionKey';

export function createSecureStoreReadinessChecker(): () => Promise<PermissionCheckResult> {
  return async () => {
    try {
      await getOrCreateAppDataEncryptionKey()
      return { status: 'granted' } 
    } catch(e: any) {
      return { status: 'blocked', errorMessage: e.message }
    }
  };
}
