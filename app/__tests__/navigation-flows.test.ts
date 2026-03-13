import { TRUST_FLOWS } from '@/app/navigation/flows';

describe('TRUST_FLOWS', () => {
  it('defines the three trust flows as tab entries', () => {
    expect(TRUST_FLOWS.map((flow) => flow.routeName)).toEqual([
      'handshake',
      'sign-message',
      'message-distance',
    ]);
  });

  it('defines a stack with at least one screen for each flow', () => {
    TRUST_FLOWS.forEach((flow) => {
      expect(flow.stackScreens.length).toBeGreaterThan(0);
      expect(flow.stackScreens[0]).toBe('index');
    });
  });
});
