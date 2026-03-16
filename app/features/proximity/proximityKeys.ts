import * as Crypto from 'expo-crypto';
import nacl from 'tweetnacl';

import { encodeHex } from '@/app/protocol/transport';

export type RandomBytes = (length: number) => Uint8Array;

export type ProximityLocalKeys = {
  signer: nacl.SignKeyPair;
  ephemeral: nacl.BoxKeyPair;
};

function getRandomBytes(length: number): Uint8Array {
  return Crypto.getRandomBytes(length);
}

export function createProximityLocalKeys(randomBytes: RandomBytes = getRandomBytes): ProximityLocalKeys {
  const signerSeed = randomBytes(32);
  const ephemeralSecretKey = randomBytes(32);

  return {
    signer: nacl.sign.keyPair.fromSeed(signerSeed),
    ephemeral: nacl.box.keyPair.fromSecretKey(ephemeralSecretKey),
  };
}

export function createProximityNonceHex(randomBytes: RandomBytes = getRandomBytes): string {
  return encodeHex(randomBytes(16));
}
