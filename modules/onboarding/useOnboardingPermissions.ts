import { useCallback, useEffect, useMemo, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import bleModule from 'react-native-ble-plx';

import {
  mapBlePermissionFailure,
  mapBleStateToPermissionResult,
  type OnboardingPermissionStatus,
  type PermissionCheckResult,
} from '@/modules/onboarding/bluetoothPermission';
import { createSecureStoreReadinessChecker } from '@/modules/onboarding/secureStoreReadiness';

export type OnboardingPermissionStepKey = 'camera' | 'nearbyDevices' | 'secureStore';
export type OnboardingTerminalState =
  | 'in_progress'
  | 'ready_to_continue'
  | 'blocked_by_permissions';

interface OnboardingPermissionStep {
  label: string;
  status: OnboardingPermissionStatus;
  errorMessage?: string;
}

type StepStateMap = Record<OnboardingPermissionStepKey, OnboardingPermissionStep>;

interface PermissionLike {
  granted: boolean;
  canAskAgain: boolean;
}

interface UseOnboardingPermissionsPorts {
  camera?: {
    currentPermission: PermissionLike | null;
    requestPermission: () => Promise<PermissionLike>;
  };
  nearbyDevices?: {
    currentPermission: PermissionLike
    requestPermission: () => Promise<PermissionLike>;
  };
  secureStore?: {
    checkReadiness: () => Promise<PermissionCheckResult>;
  };
}

const STEP_ORDER: OnboardingPermissionStepKey[] = ['camera', 'nearbyDevices', 'secureStore'];

const STEP_LABELS: Record<OnboardingPermissionStepKey, string> = {
  camera: 'Camera',
  nearbyDevices: 'Nearby devices',
  secureStore: 'Secure key storage',
};

const FRIENDLY_FAILURE_COPY: Record<string, string> = {
  CAMERA_PERMISSION_BLOCKED: `Camera access is required for secure QR verification. ${platformSettingsGuidance('camera')}`,
  BLUETOOTH_PERMISSION_BLOCKED: `Nearby devices access is required for authenticated nearby transport. ${platformSettingsGuidance('nearby devices')}`,
  SECURESTORE_PERMISSION_BLOCKED: `Secure storage access is required to protect identity keys. ${platformSettingsGuidance('secure storage')}`,
};

function platformSettingsGuidance(target: 'camera' | 'nearby devices' | 'secure storage'): string {
  if (Platform.OS === 'ios') {
    return `Open Settings > Comrades > ${target === 'secure storage' ? 'Face ID/Passcode permissions' : target} and allow access.`;
  }

  return `Open Settings > Apps > Comrades > Permissions > ${target} and allow access.`;
}
function normalizePermissionErrorMessage(
  key: OnboardingPermissionStepKey,
  result: PermissionCheckResult,
  wasPermanentlyDenied: boolean
): string | undefined {
  if (!result.errorMessage) {
    return undefined;
  }

  if (key === 'camera' && wasPermanentlyDenied) {
    return FRIENDLY_FAILURE_COPY.CAMERA_PERMISSION_BLOCKED;
  }

  if (result.status !== 'blocked') {
    return result.errorMessage;
  }

  const [baseReason] = result.errorMessage.split(':');
  const normalizedReason = baseReason.trim().toUpperCase();

  return FRIENDLY_FAILURE_COPY[normalizedReason] ?? result.errorMessage;
}

function createInitialSteps(): StepStateMap {
  return {
    camera: { label: STEP_LABELS.camera, status: 'idle' },
    nearbyDevices: { label: STEP_LABELS.nearbyDevices, status: 'idle' },
    secureStore: { label: STEP_LABELS.secureStore, status: 'idle' },
  };
}

function createBleReadinessChecker(): (() => Promise<PermissionCheckResult>) {
  return async () => {
    let manager: bleModule.BleManager | null = null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      manager = new bleModule.BleManager();
      const state = await manager.state();

      return mapBleStateToPermissionResult(state);
    } catch (error) {
      return mapBlePermissionFailure(error);
    } finally {
      manager?.destroy();
    }
  };
}

export function useOnboardingPermissions(ports: UseOnboardingPermissionsPorts = {}) {
  const [steps, setSteps] = useState<StepStateMap>(createInitialSteps);

  const requestPermissions: () => Promise<PermissionCheckResult> = async () => {
    if (Platform.OS === 'android') {
      const allowed = await PermissionsAndroid.requestMultiple(
        [
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES,
        ]
      )
      const allAllowed = Object.values(allowed).every(v => v === 'granted')
      return {
        status: allAllowed ? 'granted' : 'denied'
      }
    } else if (Platform.OS === 'ios') {
      return Promise.resolve(
        {
          status: 'denied'
        }
      )
    }
    return {
      status: 'denied'
    }
  }


  const checkSecureStoreReadiness = useMemo(
    () => ports.secureStore?.checkReadiness ?? createSecureStoreReadinessChecker(),
    [ports.secureStore?.checkReadiness]
  );

  const runStep = useCallback(async (key: OnboardingPermissionStepKey): Promise<PermissionCheckResult> => {
    setSteps((previous) => ({
      ...previous,
      [key]: { ...previous[key], status: 'requesting', errorMessage: undefined },
    }));

    let result: PermissionCheckResult;
    if (key === 'camera') {
      result = await requestPermissions();
    } else if (key === 'nearbyDevices') {
      result = await createBleReadinessChecker()();
    } else {
      result = await checkSecureStoreReadiness();
    }

    const normalizedErrorMessage = normalizePermissionErrorMessage(
      key,
      result,
      key === 'camera' && result.errorMessage === 'camera_permission_blocked' && result.status === 'blocked'
    );

    setSteps((previous) => ({
      ...previous,
      [key]: {
        ...previous[key],
        status: result.status,
        errorMessage: normalizedErrorMessage,
      },
    }));

    return {
      ...result,
      errorMessage: normalizedErrorMessage,
    };
  }, [checkSecureStoreReadiness, requestPermissions]);

  const runChecksFromStep = useCallback(async (startKey: OnboardingPermissionStepKey): Promise<void> => {
    const startIndex = STEP_ORDER.indexOf(startKey);
    const stepsToRun = STEP_ORDER.slice(startIndex);

    for (const key of stepsToRun) {
      const result = await runStep(key);

      if (result.status === 'denied' || result.status === 'blocked') {
        return;
      }
    }
  }, [runStep]);

  useEffect(() => {
    void runChecksFromStep('camera');
    // Intentionally run once on mount to avoid repeated permission prompts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retryStep = useCallback(async (key: OnboardingPermissionStepKey) => {
    await runChecksFromStep(key);
  }, [runChecksFromStep]);

  const grantedCount = STEP_ORDER.filter((key) => steps[key].status === 'granted').length;
  const totalCount = STEP_ORDER.length;
  const isReady = grantedCount === totalCount;

  const terminalState: OnboardingTerminalState = isReady
    ? 'ready_to_continue'
    : steps.camera.status === 'denied' ||
        steps.camera.status === 'blocked' ||
        steps.nearbyDevices.status === 'denied' ||
        steps.nearbyDevices.status === 'blocked' ||
        steps.secureStore.status === 'denied' ||
        steps.secureStore.status === 'blocked'
      ? 'blocked_by_permissions'
      : 'in_progress';

  return {
    steps,
    orderedSteps: STEP_ORDER.map((key) => ({ key, ...steps[key] })),
    grantedCount,
    totalCount,
    isReady,
    terminalState,
    retryStep,
  };
}
