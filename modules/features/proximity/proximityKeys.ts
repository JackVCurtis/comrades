import {
    generateBoxKeypairFromSecretKey,
    generateSigningKeypairFromSeed,
    type BoxKeypair,
    type SigningKeypair,
} from '@/modules/protocol/crypto/crypto';
import { encodeHex } from '@/modules/protocol/transport';
import * as Crypto from 'expo-crypto';

export type RandomBytes = (length: number) => Uint8Array;

export type ProximityLocalKeys = {
  signer: SigningKeypair;
  ephemeral: BoxKeypair;
};

function getRandomBytes(length: number): Uint8Array {
  return Crypto.getRandomBytes(length);
}

export function createProximityLocalKeys(randomBytes: RandomBytes = getRandomBytes): ProximityLocalKeys {
  const signerSeed = randomBytes(32);
  const ephemeralSecretKey = randomBytes(32);

  return {
    signer: generateSigningKeypairFromSeed(signerSeed),
    ephemeral: generateBoxKeypairFromSecretKey(ephemeralSecretKey),
  };
}


export type ProximityLocalKeysProvider = () => ProximityLocalKeys;

export function createProximityLocalKeysProvider(
  createLocalKeys: () => ProximityLocalKeys = createProximityLocalKeys
): ProximityLocalKeysProvider {
  let cache: ProximityLocalKeys | null = null;

  return () => {
    if (!cache) {
      cache = createLocalKeys();
    }

    return cache;
  };
}

export function createProximityNonceHex(randomBytes: RandomBytes = getRandomBytes): string {
  return encodeHex(randomBytes(16));
}
