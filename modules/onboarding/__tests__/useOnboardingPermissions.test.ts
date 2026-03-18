import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useOnboardingPermissions } from '@/app/onboarding/useOnboardingPermissions';

function createCameraResult(granted: boolean, canAskAgain = true) {
  return {
    granted,
    canAskAgain,
  };
}

describe('useOnboardingPermissions', () => {
  it('runs camera, bluetooth, and secure store checks in order and reports progress', async () => {
    const callOrder: string[] = [];

    const { result } = renderHook(() =>
      useOnboardingPermissions({
        camera: {
          currentPermission: createCameraResult(false, true),
          requestPermission: jest.fn(async () => {
            callOrder.push('camera');
            return createCameraResult(true, true);
          }),
        },
        bluetooth: {
          checkReadiness: jest.fn(async () => {
            callOrder.push('bluetooth');
            return { status: 'granted' as const };
          }),
        },
        secureStore: {
          checkReadiness: jest.fn(async () => {
            callOrder.push('secureStore');
            return { status: 'granted' as const };
          }),
        },
      })
    );

    await waitFor(() => {
      expect(result.current.grantedCount).toBe(3);
    });

    expect(callOrder).toEqual(['camera', 'bluetooth', 'secureStore']);
    expect(result.current.totalCount).toBe(3);
    expect(result.current.isReady).toBe(true);
    expect(result.current.terminalState).toBe('ready_to_continue');
  });

  it('marks camera as denied when permission request is rejected by OS', async () => {
    const requestPermission = jest.fn(async () => createCameraResult(false, true));

    const { result } = renderHook(() =>
      useOnboardingPermissions({
        camera: {
          currentPermission: createCameraResult(false, true),
          requestPermission,
        },
        bluetooth: {
          checkReadiness: jest.fn(async () => ({ status: 'granted' as const })),
        },
        secureStore: {
          checkReadiness: jest.fn(async () => ({ status: 'granted' as const })),
        },
      })
    );

    await waitFor(() => {
      expect(result.current.steps.camera.status).toBe('denied');
    });

    expect(result.current.terminalState).toBe('blocked_by_permissions');
    expect(result.current.steps.camera.errorMessage).toBe('Camera permission denied by the OS.');
    expect(result.current.steps.bluetooth.status).toBe('idle');
    expect(result.current.grantedCount).toBe(0);
  });

  it('maps bluetooth unavailable and powered-off states to blocked status', async () => {
    const unavailableResult = renderHook(() =>
      useOnboardingPermissions({
        camera: {
          currentPermission: createCameraResult(true, true),
          requestPermission: jest.fn(async () => createCameraResult(true, true)),
        },
        bluetooth: {
          checkReadiness: jest.fn(async () => ({
            status: 'blocked' as const,
            errorMessage: 'Bluetooth is unavailable on this device.',
          })),
        },
        secureStore: {
          checkReadiness: jest.fn(async () => ({ status: 'granted' as const })),
        },
      })
    );

    await waitFor(() => {
      expect(unavailableResult.result.current.steps.bluetooth.status).toBe('blocked');
    });

    expect(unavailableResult.result.current.steps.bluetooth.errorMessage).toBe('Bluetooth is unavailable on this device.');
    expect(unavailableResult.result.current.terminalState).toBe('blocked_by_permissions');

    const disabledResult = renderHook(() =>
      useOnboardingPermissions({
        camera: {
          currentPermission: createCameraResult(true, true),
          requestPermission: jest.fn(async () => createCameraResult(true, true)),
        },
        bluetooth: {
          checkReadiness: jest.fn(async () => ({
            status: 'blocked' as const,
            errorMessage: 'Bluetooth is turned off. Enable Bluetooth and retry.',
          })),
        },
        secureStore: {
          checkReadiness: jest.fn(async () => ({ status: 'granted' as const })),
        },
      })
    );

    await waitFor(() => {
      expect(disabledResult.result.current.steps.bluetooth.status).toBe('blocked');
    });

    expect(disabledResult.result.current.steps.bluetooth.errorMessage).toBe('Bluetooth is turned off. Enable Bluetooth and retry.');
    expect(disabledResult.result.current.terminalState).toBe('blocked_by_permissions');
  });

  it('stops on secure-store probe failure and exposes retry', async () => {
    const checkReadiness = jest
      .fn()
      .mockResolvedValueOnce({
        status: 'blocked',
        errorMessage: 'Secure key storage probe failed. Please retry.',
      })
      .mockResolvedValueOnce({ status: 'granted' });

    const { result } = renderHook(() =>
      useOnboardingPermissions({
        camera: {
          currentPermission: createCameraResult(true, true),
          requestPermission: jest.fn(async () => createCameraResult(true, true)),
        },
        bluetooth: {
          checkReadiness: jest.fn(async () => ({ status: 'granted' })),
        },
        secureStore: {
          checkReadiness,
        },
      })
    );

    await waitFor(() => {
      expect(result.current.steps.secureStore.status).toBe('blocked');
    });

    expect(result.current.terminalState).toBe('blocked_by_permissions');
    expect(result.current.steps.secureStore.errorMessage).toBe('Secure key storage probe failed. Please retry.');

    await act(async () => {
      await result.current.retryStep('secureStore');
    });

    expect(result.current.steps.secureStore.status).toBe('granted');
  });

  it('continues onboarding with fallback secure-store mode when authenticated storage is unavailable', async () => {
    const { result } = renderHook(() =>
      useOnboardingPermissions({
        camera: {
          currentPermission: createCameraResult(true, true),
          requestPermission: jest.fn(async () => createCameraResult(true, true)),
        },
        bluetooth: {
          checkReadiness: jest.fn(async () => ({ status: 'granted' })),
        },
        secureStore: {
          checkReadiness: jest.fn(async () => ({
            status: 'granted',
            errorMessage:
              'Secure lock screen / biometrics are not configured. Continuing with secure storage without OS authentication prompts.',
          })),
        },
      })
    );

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.steps.secureStore.status).toBe('granted');
    expect(result.current.steps.secureStore.errorMessage).toContain('secure storage without OS authentication prompts');
  });
});
