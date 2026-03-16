import { createHash } from 'crypto';

import type { DurableRecord } from '@/app/protocol/records';
import { canonicalSerialize } from '@/app/protocol/validation/crypto/signingPayload';

const RECORD_HASH_DOMAIN = 'record_hash_v1';
const MERKLE_LEAF_DOMAIN = 'merkle_leaf_v1';

export interface MerkleLeaf {
  recordHash: string;
  leafHash: string;
}

function sha256Hex(chunks: Array<string | Uint8Array>): string {
  const hash = createHash('sha256');
  for (const chunk of chunks) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}

export function deriveRecordHash(record: DurableRecord): string {
  const canonical = canonicalSerialize(record as unknown as Record<string, unknown>);
  return sha256Hex([RECORD_HASH_DOMAIN, canonical]);
}

export function deriveLeafHash(recordHash: string): string {
  return sha256Hex([MERKLE_LEAF_DOMAIN, Buffer.from(recordHash, 'hex')]);
}

export function createMerkleLeaf(record: DurableRecord): MerkleLeaf {
  const recordHash = deriveRecordHash(record);
  return {
    recordHash,
    leafHash: deriveLeafHash(recordHash),
  };
}

export function sortMerkleLeaves(leaves: MerkleLeaf[]): MerkleLeaf[] {
  return [...leaves].sort((a, b) => {
    if (a.leafHash === b.leafHash) {
      return a.recordHash.localeCompare(b.recordHash);
    }
    return a.leafHash.localeCompare(b.leafHash);
  });
}
