export type TrustFlow = {
  routeName: 'handshake' | 'sign-message' | 'message-distance';
  title: string;
  icon: 'person.2.fill' | 'signature' | 'point.topleft.down.curvedto.point.bottomright.up.fill';
  stackScreens: string[];
};

export const TRUST_FLOWS: TrustFlow[] = [
  {
    routeName: 'handshake',
    title: 'Handshake',
    icon: 'person.2.fill',
    stackScreens: ['index'],
  },
  {
    routeName: 'sign-message',
    title: 'Sign Message',
    icon: 'signature',
    stackScreens: ['index'],
  },
  {
    routeName: 'message-distance',
    title: 'Message Distance',
    icon: 'point.topleft.down.curvedto.point.bottomright.up.fill',
    stackScreens: ['index'],
  },
];
