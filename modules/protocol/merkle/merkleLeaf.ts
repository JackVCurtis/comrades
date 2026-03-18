import { hexToBytes, sha256Hex } from '@/modules/protocol/crypto/hash';
import type { DurableRecord } from '@/modules/protocol/records';
import { canonicalSerialize } from '@/modules/protocol/validation/crypto/signingPayload';

const RECORD_HASH_DOMAIN = 'record_hash_v1';
const MERKLE_LEAF_DOMAIN = 'merkle_leaf_v1';

export interface MerkleLeaf {
  recordHash: string;
  leafHash: string;
}

export function deriveRecordHash(record: DurableRecord): string {
  const canonical = canonicalSerialize(record as unknown as Record<string, unknown>);
  return sha256Hex([RECORD_HASH_DOMAIN, canonical]);
}

export function deriveLeafHash(recordHash: string): string {
  return sha256Hex([MERKLE_LEAF_DOMAIN, hexToBytes(recordHash)]);
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
