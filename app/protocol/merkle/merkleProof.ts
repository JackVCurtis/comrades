
import { hexToBytes, sha256Hex } from '@/app/protocol/crypto/hash';

import type { MerkleTree } from './merkleTree';

export interface MerkleProof {
  leafHash: string;
  path: {
    siblingHash: string;
    position: 'left' | 'right';
  }[];
}

function hashNodePair(left: string, right: string): string {
  return sha256Hex([hexToBytes(left), hexToBytes(right)]);
}

export function generateProof(tree: MerkleTree, leafHash: string): MerkleProof {
  const leafIndex = tree.levels[0]?.indexOf(leafHash) ?? -1;
  if (leafIndex < 0) {
    throw new Error(`leaf not found: ${leafHash}`);
  }

  const path: MerkleProof['path'] = [];
  let currentIndex = leafIndex;

  for (let levelIndex = 0; levelIndex < tree.levels.length - 1; levelIndex += 1) {
    const level = tree.levels[levelIndex];
    const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
    const siblingHash = level[siblingIndex] ?? level[currentIndex];

    path.push({
      siblingHash,
      position: currentIndex % 2 === 0 ? 'right' : 'left',
    });

    currentIndex = Math.floor(currentIndex / 2);
  }

  return {
    leafHash,
    path,
  };
}

export function verifyProof(leafHash: string, proof: MerkleProof, root: string): boolean {
  if (proof.leafHash !== leafHash) {
    return false;
  }

  let candidate = leafHash;
  for (const step of proof.path) {
    candidate = step.position === 'left'
      ? hashNodePair(step.siblingHash, candidate)
      : hashNodePair(candidate, step.siblingHash);
  }

  return candidate === root;
}
