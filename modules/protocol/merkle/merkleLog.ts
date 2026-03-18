import type { DurableRecord } from '@/modules/protocol/records';
import { validateRecord, type RecordValidationContext } from '@/modules/protocol/validation/validateRecord';
import type { ValidationResult } from '@/modules/protocol/validation/ValidationResult';

import type { DiffResult } from './merkleDiff';
import { diffTrees } from './merkleDiff';
import { createMerkleLeaf, sortMerkleLeaves, type MerkleLeaf } from './merkleLeaf';
import type { MerkleProof } from './merkleProof';
import { generateProof } from './merkleProof';
import { buildMerkleTree, type MerkleTree } from './merkleTree';

interface MerkleLogOptions {
  validate?: (record: DurableRecord) => ValidationResult;
  validationContext?: RecordValidationContext;
}

export class MerkleLog {
  private readonly leavesByRecordHash = new Map<string, MerkleLeaf>();

  private tree: MerkleTree = { leaves: [], rootHash: '', levels: [] };

  private readonly validateRecordFn: (record: DurableRecord) => ValidationResult;

  constructor(options: MerkleLogOptions = {}) {
    this.validateRecordFn = options.validate ?? ((record: DurableRecord) => validateRecord(record, options.validationContext));
  }

  appendRecord(record: DurableRecord): void {
    const validation = this.validateRecordFn(record);
    if (validation.status !== 'accepted') {
      throw new Error('only accepted records may be appended');
    }

    const leaf = createMerkleLeaf(record);
    if (this.leavesByRecordHash.has(leaf.recordHash)) {
      return;
    }

    this.leavesByRecordHash.set(leaf.recordHash, leaf);
    this.rebuildTree();
  }

  getRoot(): string {
    return this.tree.rootHash;
  }

  getLeafCount(): number {
    return this.tree.leaves.length;
  }

  getLeafHashes(): string[] {
    return this.tree.leaves.map((leaf) => leaf.leafHash);
  }

  generateProof(leafHash: string): MerkleProof {
    return generateProof(this.tree, leafHash);
  }

  exportTree(): MerkleTree {
    return {
      leaves: [...this.tree.leaves],
      rootHash: this.tree.rootHash,
      levels: this.tree.levels.map((level) => [...level]),
    };
  }

  diff(remoteTree: MerkleTree): DiffResult {
    return diffTrees(this.tree, remoteTree);
  }

  private rebuildTree(): void {
    this.tree = buildMerkleTree(sortMerkleLeaves([...this.leavesByRecordHash.values()]));
  }
}
