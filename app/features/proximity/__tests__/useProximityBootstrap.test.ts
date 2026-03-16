import { act, renderHook } from '@testing-library/react-native';

import { useProximityBootstrap } from '@/app/features/proximity/useProximityBootstrap';

const mockSignNfcBootstrap = jest.fn();

jest.mock('@/app/protocol/transport', () => {
  const actual = jest.requireActual('@/app/protocol/transport');

  return {
    ...actual,
    signNfcBootstrap: (...args: unknown[]) => mockSignNfcBootstrap(...args),
  };
});

jest.mock('@/app/features/proximity/proximityKeys', () => ({
  createProximityLocalKeysProvider: () => () => ({
    signer: {
      publicKey: new Uint8Array(32).fill(1),
      secretKey: new Uint8Array(64).fill(2),
    },
    ephemeral: {
      publicKey: new Uint8Array(32).fill(3),
      secretKey: new Uint8Array(32).fill(4),
    },
  }),
  createProximityNonceHex: () => '00112233445566778899aabbccddeeff',
}));

describe('useProximityBootstrap prepareWriterPayload error handling', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockSignNfcBootstrap.mockReset();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('handles signing failures without throwing and transitions to failed state', () => {
    mockSignNfcBootstrap.mockImplementation(() => {
      throw new Error('signing exploded');
    });

    const { result } = renderHook(() => useProximityBootstrap());

    expect(() => {
      act(() => {
        result.current.prepareWriterPayload('identity-hash', 'ble-service-uuid');
      });
    }).not.toThrow();

    expect(result.current.state).toEqual({
      status: 'failed',
      failureReason: 'prepare_payload_failed',
    });
    expect(result.current.bootstrapPayload).toBeNull();
    expect(result.current.diagnostic).toBe(
      'PROX_BOOTSTRAP_PREPARE_FAILED: Unable to generate NFC bootstrap payload.',
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[useProximityBootstrap] prepareWriterPayload failed',
      expect.any(Error),
    );
  });
});
