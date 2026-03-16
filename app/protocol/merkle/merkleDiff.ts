import type { MerkleTree } from './merkleTree';

export interface DiffResult {
  missingLeaves: string[];
}

interface DiffNode {
  hash: string;
  leafHashes: string[];
  left?: DiffNode;
  right?: DiffNode;
}

function buildNode(levels: string[][], levelIndex: number, nodeIndex: number): DiffNode {
  const hash = levels[levelIndex][nodeIndex];
  if (levelIndex === 0) {
    return { hash, leafHashes: [hash] };
  }

  const left = buildNode(levels, levelIndex - 1, nodeIndex * 2);
  const rightIndex = Math.min(nodeIndex * 2 + 1, levels[levelIndex - 1].length - 1);
  const right = buildNode(levels, levelIndex - 1, rightIndex);

  return {
    hash,
    left,
    right,
    leafHashes: [...left.leafHashes, ...right.leafHashes],
  };
}

function collectMissing(localNode: DiffNode | undefined, remoteNode: DiffNode | undefined, localLeaves: Set<string>): string[] {
  if (!remoteNode) {
    return [];
  }

  if (!localNode) {
    return remoteNode.leafHashes.filter((leaf) => !localLeaves.has(leaf));
  }

  if (localNode.hash === remoteNode.hash) {
    return [];
  }

  if (!remoteNode.left && !remoteNode.right) {
    return localLeaves.has(remoteNode.hash) ? [] : [remoteNode.hash];
  }

  return [
    ...collectMissing(localNode.left, remoteNode.left, localLeaves),
    ...collectMissing(localNode.right, remoteNode.right, localLeaves),
  ];
}

export function diffTrees(localTree: MerkleTree, remoteTree: MerkleTree): DiffResult {
  const localLeaves = new Set(localTree.leaves.map((leaf) => leaf.leafHash));

  if (remoteTree.leaves.length === 0) {
    return { missingLeaves: [] };
  }

  const localRoot = localTree.levels.length > 0
    ? buildNode(localTree.levels, localTree.levels.length - 1, 0)
    : undefined;
  const remoteRoot = buildNode(remoteTree.levels, remoteTree.levels.length - 1, 0);

  const missingLeaves = Array.from(new Set(collectMissing(localRoot, remoteRoot, localLeaves))).sort();

  return { missingLeaves };
}
