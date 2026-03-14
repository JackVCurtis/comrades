export type TrustRelationship = {
  id: string;
  localAlias: string;
  counterpartAlias: string;
  trustDepth: number;
  handshakeStatus: 'verified' | 'pending';
};

export type SignedMessageRecord = {
  id: string;
  title: string;
  createdAt: string;
  uuidHeader: string;
  signatureStatus: 'verified' | 'pending';
};

export type ProfileIdentityField = {
  label: string;
  value: string;
};

export const TRUST_RELATIONSHIPS: TrustRelationship[] = [
  {
    id: 'tr-001',
    localAlias: 'Ari Kim',
    counterpartAlias: 'Northside Organizer',
    trustDepth: 1,
    handshakeStatus: 'verified',
  },
  {
    id: 'tr-002',
    localAlias: 'Mei Patel',
    counterpartAlias: 'Library Contact',
    trustDepth: 2,
    handshakeStatus: 'verified',
  },
  {
    id: 'tr-003',
    localAlias: 'Jordan Lee',
    counterpartAlias: 'Mutual Friend',
    trustDepth: 3,
    handshakeStatus: 'pending',
  },
];

export const SIGNED_MESSAGES: SignedMessageRecord[] = [
  {
    id: 'msg-001',
    title: 'Release update 1.4',
    createdAt: '2026-02-14T10:22:00Z',
    uuidHeader: 'UUID: 7f3f-24a0',
    signatureStatus: 'verified',
  },
  {
    id: 'msg-002',
    title: 'Root hash sync complete',
    createdAt: '2026-02-12T18:11:00Z',
    uuidHeader: 'UUID: 7f3f-24a0',
    signatureStatus: 'verified',
  },
  {
    id: 'msg-003',
    title: 'Invite list draft',
    createdAt: '2026-02-10T07:45:00Z',
    uuidHeader: 'UUID: 7f3f-24a0',
    signatureStatus: 'pending',
  },
];

export const PROFILE_IDENTITY_DETAILS: ProfileIdentityField[] = [
  { label: 'Display Name', value: 'Sam Rivera' },
  { label: 'Preferred Pronouns', value: 'they/them' },
  { label: 'City', value: 'Oakland, CA' },
  { label: 'Contact Note', value: 'Open to weekend key ceremonies.' },
];

export const PROFILE_IDENTITY_SHARING_NOTICE =
  'Profile identity details are maintained locally and are not shared during handshake unless the counterparty user explicitly opts in.';
