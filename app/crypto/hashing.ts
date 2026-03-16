import { CryptoDigestAlgorithm, digest } from 'expo-crypto';

const RECORD_HASH_PREFIX = new TextEncoder().encode('record_hash_v1');
const MERKLE_LEAF_PREFIX = new TextEncoder().encode('merkle_leaf_v1');

export function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const combined = new Uint8Array(a.length + b.length);
  combined.set(a, 0);
  combined.set(b, a.length);
  return combined;
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await digest(
    CryptoDigestAlgorithm.SHA256,
    Uint8Array.from(bytes).buffer
  );
  return new Uint8Array(hashBuffer);
}

export async function computeRecordHash(canonicalBytes: Uint8Array): Promise<Uint8Array> {
  return sha256(concatBytes(RECORD_HASH_PREFIX, canonicalBytes));
}

export async function computeLeafHash(recordHash: Uint8Array): Promise<Uint8Array> {
  return sha256(concatBytes(MERKLE_LEAF_PREFIX, recordHash));
}
