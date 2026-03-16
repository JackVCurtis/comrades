import {
  createProximityLocalKeys,
  createProximityLocalKeysProvider,
  createProximityNonceHex,
  type ProximityLocalKeys,
} from '@/app/features/proximity/proximityKeys';

describe('proximity key generation', () => {
  it('derives signer and ephemeral keypairs from injected random bytes without nacl PRNG', () => {
    const randomCalls: number[] = [];
    const randomBytes = (length: number) => {
      randomCalls.push(length);
      return new Uint8Array(length).fill(randomCalls.length);
    };

    const keys = createProximityLocalKeys(randomBytes);

    expect(randomCalls).toEqual([32, 32]);
    expect(keys.signer.publicKey).toHaveLength(32);
    expect(keys.signer.secretKey).toHaveLength(64);
    expect(keys.ephemeral.publicKey).toHaveLength(32);
    expect(keys.ephemeral.secretKey).toHaveLength(32);
  });


  it('creates local keys lazily and caches the first generated value', () => {
    const keypair = createProximityLocalKeys((length) => new Uint8Array(length).fill(7));
    const factory = jest.fn<ProximityLocalKeys, []>(() => keypair);

    const getLocalKeys = createProximityLocalKeysProvider(factory);

    expect(factory).not.toHaveBeenCalled();

    const first = getLocalKeys();
    const second = getLocalKeys();

    expect(factory).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it('encodes nonce as 16-byte hex from injected random bytes', () => {
    const nonce = createProximityNonceHex(() =>
      new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    );

    expect(nonce).toBe('000102030405060708090a0b0c0d0e0f');
  });
});
