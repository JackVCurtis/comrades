import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import LockScreen from '@/app/lock';

const mockUnlockGate = jest.fn<Promise<{ status: 'unlocked' | 'locked' }>, []>();
const mockReplace = jest.fn<void, [string]>();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    callback();
  },
}));

jest.mock('@/app/security/unlockGate', () => ({
  unlockGate: () => mockUnlockGate(),
}));

describe('LockScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resets loading state after a successful unlock', async () => {
    let resolveUnlock!: (value: { status: 'unlocked' | 'locked' }) => void;
    mockUnlockGate.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUnlock = resolve;
      })
    );

    const { getByText, queryByText } = render(<LockScreen />);

    fireEvent.press(getByText('Retry Unlock'));

    await waitFor(() => {
      expect(queryByText('Retry Unlock')).toBeNull();
    });

    await act(async () => {
      resolveUnlock({ status: 'unlocked' });
    });

    await waitFor(() => {
      expect(getByText('Retry Unlock')).toBeTruthy();
    });

    expect(mockReplace).toHaveBeenCalledWith('/handshake');
    expect(
      queryByText('Unlock was canceled or failed. Keep app state locked until authentication succeeds.')
    ).toBeNull();
  });

  it('resets loading state after a locked result and preserves retry error behavior', async () => {
    mockUnlockGate.mockResolvedValueOnce({ status: 'locked' });
    mockUnlockGate.mockResolvedValueOnce({ status: 'unlocked' });

    const { getByText, queryByText } = render(<LockScreen />);

    fireEvent.press(getByText('Retry Unlock'));

    await waitFor(() => {
      expect(getByText('Retry Unlock')).toBeTruthy();
    });

    expect(
      getByText('Unlock was canceled or failed. Keep app state locked until authentication succeeds.')
    ).toBeTruthy();

    fireEvent.press(getByText('Retry Unlock'));

    await waitFor(() => {
      expect(
        queryByText('Unlock was canceled or failed. Keep app state locked until authentication succeeds.')
      ).toBeNull();
    });

    await waitFor(() => {
      expect(getByText('Retry Unlock')).toBeTruthy();
    });

    expect(mockReplace).toHaveBeenCalledWith('/handshake');
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });
});
