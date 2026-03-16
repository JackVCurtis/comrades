jest.mock('expo-crypto', () => ({
  getRandomBytes: jest.fn((length: number) => {
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) {
      bytes[i] = (i * 17 + 23) & 0xff;
    }
    return bytes;
  }),
  randomUUID: jest.fn(() => '3df085f8-486f-42ac-929d-356082e4bf63'),
}));

jest.mock('@/app/features/proximity/proximityUuid', () => ({
  createProximitySessionUuid: jest.fn(() => '3df085f8-486f-42ac-929d-356082e4bf63'),
}));

import { act, renderHook } from '@testing-library/react-native';

import { useProximityBootstrap } from '@/app/features/proximity/useProximityBootstrap';
import { createProximitySessionUuid } from '@/app/features/proximity/proximityUuid';
import { isValidUUID } from '@/app/protocol/validation/formatValidators';

const mockCreateProximitySessionUuid = jest.mocked(createProximitySessionUuid);

describe('useProximityBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateProximitySessionUuid.mockReturnValue('3df085f8-486f-42ac-929d-356082e4bf63');
  });

  it('does not throw during payload generation', () => {
    const { result } = renderHook(() => useProximityBootstrap());

    expect(() => {
      act(() => {
        result.current.prepareWriterPayload('hash_abc123', '6f1a6eaf-f6d6-4d8c-a5e0-3ddf2b4531a7');
      });
    }).not.toThrow();

    expect(result.current.bootstrapPayload).not.toBeNull();
    expect(isValidUUID(result.current.bootstrapPayload!.session_uuid)).toBe(true);
  });

  it('handles payload preparation failures by transitioning to failed state', () => {
    const { result } = renderHook(() => useProximityBootstrap());
    mockCreateProximitySessionUuid.mockImplementationOnce(() => {
      throw new Error('uuid generation exploded');
    });

    expect(() => {
      act(() => {
        result.current.prepareWriterPayload('hash_abc123', '6f1a6eaf-f6d6-4d8c-a5e0-3ddf2b4531a7');
      });
    }).not.toThrow();

    expect(result.current.state.status).toBe('failed');
    expect(result.current.state.failureReason).toBe('WRITER_PAYLOAD_BUILD_FAILED');
    expect(result.current.bootstrapPayload).toBeNull();
    expect(result.current.diagnostic).toContain('WRITER_PAYLOAD_BUILD_FAILED');
  });
});
