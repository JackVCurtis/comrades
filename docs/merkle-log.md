# Deterministic Merkle Log

This document defines the deterministic append-only Merkle log used for durable protocol records in PGT.

## Dependencies and protocol alignment

The Merkle log depends on existing protocol invariants:

- Canonical record bytes are produced using deterministic canonical serialization rules (see `docs/canonical-serialization.md`).
- Hash domains are fixed and versioned (see `docs/hash-domains.md`).
- Only records accepted by the validation pipeline may be committed.

## Hash domains and leaf derivation

PGT uses domain-separated SHA-256 for log inputs:

- `record_hash = SHA256("record_hash_v1" || canonical_record_bytes)`
- `leaf_hash = SHA256("merkle_leaf_v1" || record_hash)`

`record_hash` and `leaf_hash` are represented as lowercase hex strings.

## Deterministic leaf ordering

Leaves are globally sorted by:

1. `leaf_hash` (lexicographic ascending)
2. `record_hash` (lexicographic ascending tie-breaker)

This guarantees deterministic ordering across devices and prevents runtime insertion order or map iteration order from affecting Merkle roots.

## Tree construction algorithm

Given sorted leaf hashes at level 0:

1. Pair hashes from left to right.
2. For each pair, compute `SHA256(left_child_hash || right_child_hash)`.
3. If a level has an odd number of nodes, duplicate the final node.
4. Repeat until one node remains.

The final node is `root_hash`.

## Inclusion proof format and verification

A proof contains:

- `leafHash`: the target leaf hash
- `path[]`: sibling steps from leaf level to root where each step is:
  - `siblingHash`
  - `position` (`left` or `right`) indicating sibling side relative to current hash

Verification recomputes upward:

- if `position === "left"`: `H(sibling || current)`
- if `position === "right"`: `H(current || sibling)`

The proof is valid only if the final computed hash equals the expected root.

## Subtree diff strategy for synchronization

To discover missing leaves, peers compare Merkle trees recursively:

1. If subtree hashes are equal, stop descending.
2. If hashes differ and remote node is a leaf, that leaf is missing locally.
3. If hashes differ and remote node is internal, recurse into left and right children.

This produces deterministic `missingLeaves` (sorted lexicographically) for targeted record transfer.

## Append-only guarantees

- Records are validated before append.
- Non-`accepted` records are rejected and do not mutate state.
- Duplicate replay (same `record_hash`) is ignored.
- Existing leaves are never mutated or removed.
- Root is rebuilt deterministically from the immutable leaf set.

## Cross-device determinism requirements

For the same accepted record set, all compliant implementations must produce identical:

- sorted leaf ordering
- level hashes
- root hash
- inclusion proofs
- subtree diff results
