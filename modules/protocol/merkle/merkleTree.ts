import { hexToBytes, sha256Hex } from '@/modules/protocol/crypto/hash';
import type { MerkleLeaf } from './merkleLeaf';
import { sortMerkleLeaves } from './merkleLeaf';

export interface MerkleTree {
  leaves: MerkleLeaf[];
  rootHash: string;
  levels: string[][];
}

function hashNodePair(left: string, right: string): string {
  return sha256Hex([hexToBytes(left), hexToBytes(right)]);
}

export function buildMerkleTree(leaves: MerkleLeaf[]): MerkleTree {
  if (leaves.length === 0) {
    return {
      leaves: [],
      rootHash: '',
      levels: [],
    };
  }

  const sortedLeaves = sortMerkleLeaves(leaves);
  const levels: string[][] = [sortedLeaves.map((leaf) => leaf.leafHash)];

  while (levels[levels.length - 1].length > 1) {
    const currentLevel = levels[levels.length - 1];
    const nextLevel: string[] = [];

    for (let index = 0; index < currentLevel.length; index += 2) {
      const left = currentLevel[index];
      const right = currentLevel[index + 1] ?? currentLevel[index];
      nextLevel.push(hashNodePair(left, right));
    }

    levels.push(nextLevel);
  }

  return {
    leaves: sortedLeaves,
    rootHash: levels[levels.length - 1][0],
    levels,
  };
}
