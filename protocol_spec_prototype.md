# Protocol Bundle Specification: Proximity-Bootstrapped Merkle Trust Log

Date: 2026-03-14

## Purpose

This document consolidates the protocol design into a single implementation-oriented specification for a mobile system that:

- uses **NFC** for proximity-based bootstrap
- upgrades to **Bluetooth Low Energy (BLE)** for authenticated encrypted transfer
- uses **libsignal-backed identity/session primitives**
- stores durable signed records in a **deterministic Merkle log**
- resolves identity using **self-signed bindings**, **endorsements**, and **local trust policy**

This bundle pulls together the previously defined architectural pieces into one coherent protocol surface.

---

## Goals

The protocol is designed to provide:

1. **Proximity bootstrapping**  
   A local in-person tap can securely start a session.

2. **Authenticated identity claims**  
   UUIDs are bound to keys by signed records, not trusted directly.

3. **Conflict-aware trust resolution**  
   Competing identity claims are represented explicitly and resolved by local policy.

4. **Append-only event history**  
   Durable signed records are stored in a Merkle-synchronized log.

5. **Efficient reconciliation**  
   Peers compare roots, descend differing subtrees, and exchange only missing records.

6. **Auditability**  
   Malicious, conflicting, or revoked records remain visible rather than silently overwriting prior state.

7. **Cross-platform viability**  
   NFC remains a bootstrap channel; BLE carries the main sync workload.

---

## Non-goals

This protocol does **not** try to provide:

- a global PKI or absolute real-world identity proof
- sybil resistance by itself
- anonymous communication
- perfect metadata privacy
- background internet sync
- server-mediated consensus

Identity truth is **local-policy-based**, not globally canonical.

---

## Layered model

The protocol has four layers:

1. **Transport bootstrap layer**
   - NFC bootstrap
   - BLE discovery / connection
   - transcript binding

2. **Secure session layer**
   - authenticated encrypted application session
   - message framing
   - chunking / ack / resume

3. **Durable record layer**
   - identity bindings
   - handshakes
   - endorsements
   - key rotations
   - revocations

4. **Trust resolution layer**
   - local trust anchors
   - endorsement weighting
   - threshold acceptance
   - conflict handling

These layers must remain conceptually separate.

---

## Core terminology

### UUID
An opaque identifier. It is not identity proof by itself.

### Identity key
A long-term public/private keypair for a user or installation identity.

### Identity binding
A self-signed record binding a UUID to an identity public key.

### Endorsement
A signed record from one identity attesting to a specific subject binding.

### Handshake
A mutually signed record showing two participants completed a proximity-based interaction.

### Merkle log
The append-only deterministic log over all durable signed records.

### Trusted identity
An identity binding that the local device currently treats as acceptable under local trust policy.

---

## Cryptographic assumptions

The protocol assumes access to:

- long-term identity keypairs
- signatures
- secure random UUID/nonces
- authenticated encrypted session messages
- SHA-256 or equivalent cryptographic hash

Recommended primitive families:

- Ed25519 / X25519-style identity and session primitives, or equivalent libsignal-supported choices
- SHA-256 for record and Merkle hashing

Exact primitive identifiers should be carried via `crypto_suite`.

---

## Protocol versions

All protocol objects should carry explicit version identifiers.

Recommended initial versions:

- `bundle_protocol_version = 1`
- `record_schema_version = 1`
- `sync_protocol_version = 1`
- `trust_policy_version = 1`

Never infer version solely from field presence.

---

## Canonical encoding

All durable records and sync messages must use a deterministic canonical encoding.

### Recommended encoding

- **canonical CBOR**

### Acceptable alternative

- strict canonical JSON

### Required canonicalization properties

- UTF-8
- stable key ordering
- no duplicate keys
- normalized timestamps
- one consistent binary encoding
- no ambiguous null/omitted field behavior

All examples in this document are illustrative only.

---

## Durable record types

The Merkle log contains all durable signed record types.

### Record type registry

Initial record types:

- `identity_binding`
- `handshake`
- `endorsement`
- `key_rotation`
- `revocation`

Each record has:

- `record_type`
- `record_version`
- `crypto_suite`
- a stable canonical serialization
- one or more signatures

---

## 1. Identity binding record

### Purpose

Binds a UUID to a long-term public key.

### Reference schema

```text
IdentityBindingRecordV1 {
  record_type = "identity_binding"
  record_version = 1
  crypto_suite
  subject_uuid
  subject_identity_public_key
  key_epoch
  created_at
  expires_at_optional
  extensions
  self_signature
}
```

### Semantics

This record means:

> The holder of the private key corresponding to `subject_identity_public_key` claims that `subject_uuid` is bound to that public key for `key_epoch`.

### Validation

A valid identity binding requires:

1. supported `record_version`
2. supported `crypto_suite`
3. valid UUID
4. valid public key encoding
5. valid self-signature over the canonical unsigned payload
6. well-formed `key_epoch`

### Important note

A self-signed binding proves key possession, not global real-world truth.

---

## 2. Handshake record

### Purpose

Records a mutually signed interaction between two identities.

### Reference schema

```text
HandshakeRecordV1 {
  record_type = "handshake"
  record_version = 1
  crypto_suite
  handshake_uuid
  created_at
  transport_hint
  participant_a_binding_hash
  participant_b_binding_hash
  participant_a_ephemeral_public_key
  participant_b_ephemeral_public_key
  participant_a_merkle_root
  participant_b_merkle_root
  participant_a_merkle_leaf_count
  participant_b_merkle_leaf_count
  transcript_hash_optional
  extensions
  signature_a
  signature_b
}
```

### Canonical participant ordering

Participants must be ordered canonically. Recommended ordering:

1. compare `participant_binding_hash`
2. if needed, compare UUID
3. if needed, compare public key bytes

The same handshake must serialize identically on all peers.

### Semantics

A handshake record proves that:

- two identities participated
- both signed the same canonical payload
- both asserted specific local Merkle state at that time

It does **not** prove real-world identity truth beyond the bindings it references.

### Validation

A valid handshake record requires:

1. both participant bindings are known or included alongside the record
2. canonical ordering is correct
3. both signatures verify against the referenced identity bindings
4. `handshake_uuid` is well formed
5. payload fields are canonical and well typed

---

## 3. Endorsement record

### Purpose

Lets one identity endorse a specific subject binding.

### Reference schema

```text
EndorsementRecordV1 {
  record_type = "endorsement"
  record_version = 1
  crypto_suite
  endorsement_uuid
  endorser_binding_hash
  subject_binding_hash
  endorsement_type
  confidence_level
  created_at
  expires_at_optional
  extensions
  signature
}
```

### Recommended endorsement types

- `identity_binding_valid`
- `met_in_person`
- `key_rotation_observed`
- `revocation_supported`

### Confidence level

Suggested enum:

- `low`
- `medium`
- `high`

The exact weight is interpreted by local policy.

### Validation

A valid endorsement requires:

1. known or supplied endorser binding
2. known or supplied subject binding
3. valid endorser signature
4. supported endorsement type
5. no malformed expiration semantics

### Semantics

An endorsement does **not** create truth globally. It is evidence for local policy evaluation.

---

## 4. Key rotation record

### Purpose

Represents a legitimate transition from one subject binding to another.

### Reference schema

```text
KeyRotationRecordV1 {
  record_type = "key_rotation"
  record_version = 1
  crypto_suite
  rotation_uuid
  subject_uuid
  old_binding_hash
  new_binding_hash
  rotation_counter
  created_at
  old_key_signature_optional
  new_key_signature
  extensions
}
```

### Validation

A valid key rotation requires:

1. same `subject_uuid` for old and new binding chains
2. monotonic `rotation_counter`
3. valid signature by new key
4. optional validation by old key if available
5. no downgrade to an earlier counter

### Semantics

Rotation records let local trust engines prefer newer valid bindings without silently treating them as an attack.

---

## 5. Revocation record

### Purpose

Represents a signed statement that a previously trusted record or relationship should no longer be relied on.

### Reference schema

```text
RevocationRecordV1 {
  record_type = "revocation"
  record_version = 1
  crypto_suite
  revocation_uuid
  signer_binding_hash
  target_record_hash
  reason_code
  created_at
  expires_at_optional
  extensions
  signature
}
```

### Suggested reason codes

- `key_compromised`
- `endorsement_withdrawn`
- `binding_superseded`
- `malicious_behavior_reported`

### Validation

A valid revocation requires a valid signer binding and signature. Whether the revocation should be trusted is determined locally.

---

## Record hashing and Merkle leaf formation

### Record hash

Each durable record should have a domain-separated record hash:

```text
record_hash = SHA-256(
  "record_hash_v1" ||
  record_type ||
  canonical_record_bytes
)
```

### Merkle leaf hash

Each Merkle leaf should be:

```text
leaf_hash = SHA-256(
  "merkle_leaf_v1" ||
  record_hash
)
```

You may also directly hash the record bytes as the leaf payload, but domain separation should be preserved.

### Merkle leaf ordering

To maximize convergence, use deterministic ordering.

### Recommended ordering

- sort by `leaf_hash`

### Alternative

- sort by `(record_type, created_at, stable_uuid, record_hash)`

`leaf_hash` ordering is simpler for distributed convergence.

---

## Duplicate and conflict rules

### Duplicate

A duplicate is the same canonical record appearing multiple times.

Handling:

- accept once
- ignore subsequent exact duplicates

### Conflict

A conflict is a different canonical record that competes for the same semantic slot, such as:

- same `subject_uuid`, different key binding
- same `handshake_uuid`, different payload
- same `endorsement_uuid`, different payload

Handling:

- never silently overwrite
- retain both records
- mark local belief state as conflicted
- let trust policy decide which candidate is preferred

---

## Trust resolution model

The trust engine is local and deterministic per device, but not globally mandated.

## Required local concepts

Each device should maintain:

- trust anchors
- trusted bindings
- endorsement weights
- conflict sets
- revocation state
- identity status per UUID

### Suggested trust states

- `CLAIMED`
- `TENTATIVE`
- `VERIFIED`
- `CONFLICTED`
- `REVOKED`

### Suggested policy rules

1. a UUID must not be resolved to a key unless there is at least one self-signed binding
2. multiple bindings for one UUID create a conflict set
3. endorsements apply to the full subject binding, not just the UUID
4. trust scores are computed from trusted endorsers only
5. conflicting bindings are not auto-overwritten
6. valid key rotation may move trust from old binding to new binding
7. revocations reduce confidence but may themselves require trusted support

### Example weighted policy

- directly trusted contact endorsement: weight 1.0
- weakly trusted contact endorsement: weight 0.5
- unknown identity endorsement: weight 0.0
- acceptance threshold for `VERIFIED`: 1.5
- minimum self-signed binding required: yes

Under this model, Bob + Charlie can outweigh Eve if Bob and Charlie are trusted.

---

## Identity resolution algorithm

For a given `subject_uuid`:

1. gather all known identity bindings for that UUID
2. group endorsements by subject binding
3. discard expired or revoked evidence according to local policy
4. apply valid key rotation chains
5. compute support score for each candidate binding
6. determine resulting state:
   - no acceptable binding → unresolved
   - one weakly supported binding → `CLAIMED` or `TENTATIVE`
   - one strongly supported binding → `VERIFIED`
   - multiple plausible bindings → `CONFLICTED`

This resolution result is local and may differ across devices.

---

## Transport architecture

## NFC bootstrap

NFC is used only for short bootstrap exchange and proximity proof.

### Reference bootstrap schema

```text
NfcBootstrapV1 {
  bundle_protocol_version
  session_uuid
  device_uuid
  identity_binding_hash
  ephemeral_public_key
  bluetooth_service_uuid
  nonce
  transcript_context_optional
  signature_over_bootstrap
}
```

### Required properties

The bootstrap must:

- identify the intended session
- bind the tap to later BLE activity
- be small enough for reliable NFC transfer
- avoid treating raw UUID as trustworthy identity

### Bootstrap validation

A peer should validate:

1. protocol version
2. signature over bootstrap
3. valid `identity_binding_hash`
4. freshness / nonce semantics
5. transport upgrade parameters

---

## BLE secure session

After NFC bootstrap, peers establish a BLE session and then an authenticated encrypted application session.

### BLE responsibilities

- discovery / connect
- GATT characteristics
- packet transport
- notification/write mechanics

### Application secure session responsibilities

- encryption
- message integrity
- session identity continuity
- transcript binding to NFC bootstrap

BLE alone is not trusted as an identity mechanism.

---

## BLE GATT layout

### Minimal service

```text
MerkleSyncService
  ├─ ControlCharacteristic
  └─ DataCharacteristic
```

### Expanded service

```text
MerkleSyncService
  ├─ ControlCharacteristic
  ├─ DataCharacteristic
  ├─ AckCharacteristic
  └─ StatusCharacteristic
```

The exact GATT design is implementation-specific, but logical message framing is mandatory.

---

## Sync message envelope

Each logical sync message uses a common envelope.

```text
SyncEnvelopeV1 {
  sync_protocol_version
  session_id
  message_id
  message_type
  sender_role
  requires_ack
  payload
  extensions
}
```

### Sender roles

- `initiator`
- `responder`

### Fragment envelope

Large encrypted messages may be fragmented.

```text
FragmentEnvelopeV1 {
  sync_protocol_version
  session_id
  message_id
  fragment_index
  fragment_count
  ciphertext_fragment
  fragment_checksum_optional
}
```

---

## Sync message types

Initial message types:

- `sync_open`
- `sync_accept`
- `sync_reject`
- `root_compare`
- `subtree_query`
- `subtree_reply`
- `leaf_inventory_query`
- `leaf_inventory_reply`
- `record_query`
- `record_reply`
- `record_ack`
- `sync_checkpoint`
- `sync_complete`
- `error`

### Important note

`record_reply` may carry **any durable record types**, not just handshake records.

---

## Record transfer format

A `record_reply` should return canonical record bytes plus identifying hashes.

```text
RecordTransferItemV1 {
  record_type
  record_hash
  leaf_hash
  canonical_record_bytes
}
```

A reply may batch multiple items, subject to negotiated limits.

### Validation rule

No transferred record may be added to the local log before:

- canonical decoding succeeds
- schema validation succeeds
- signatures validate
- duplicate/conflict logic is applied

---

## Session lifecycle

The sync session progresses through these states:

- `IDLE`
- `CONNECTING`
- `NEGOTIATING`
- `SECURE_CHANNEL_READY`
- `COMPARING_ROOTS`
- `RECONCILING`
- `REQUESTING_RECORDS`
- `RECEIVING_RECORDS`
- `VALIDATING_RECORDS`
- `APPLYING_RECORDS`
- `CHECKPOINTING`
- `FINALIZING`
- `COMPLETED`
- `FAILED`
- `ABORTED`
- `DISCONNECTED_RESUMABLE`

### Required invariants

- no unvalidated record may be applied
- no silent overwrite on conflict
- no final success until local state is internally consistent
- resume only from checkpoint boundaries

---

## Reconciliation algorithm

### High-level flow

1. compare Merkle root summaries
2. if equal, finish
3. if different, descend differing subtrees
4. below a span threshold, request leaf inventory
5. request missing records by `record_hash`, `leaf_hash`, or stable record UUID
6. validate and apply
7. recompute root
8. finalize

### Suggested threshold rule

- continue subtree descent while a span exceeds 256 leaves
- switch to inventory below that threshold

This is tunable.

---

## Record validation bundle

## Common validation rules for all records

1. supported record version
2. supported crypto suite
3. canonical decoding success
4. signature verification success
5. no forbidden field ambiguity
6. record hash matches recomputation
7. leaf hash matches recomputation

## Record-type-specific checks

### Identity binding

- self-signature valid
- UUID well formed
- key epoch valid

### Handshake

- referenced bindings present or transferable
- canonical participant ordering valid
- both participant signatures valid

### Endorsement

- endorser and subject bindings resolvable
- endorsement type supported

### Key rotation

- subject UUID continuity
- monotonic rotation counter
- signatures valid

### Revocation

- signer binding resolvable
- target record hash valid
- reason code supported

---

## Local apply semantics

When a record validates successfully:

1. persist canonical record
2. update record hash index
3. update leaf ordering index
4. recompute affected Merkle nodes
5. update trust graph / conflict sets / revocation state
6. checkpoint if appropriate

This should happen in one transaction or transaction-equivalent unit where practical.

---

## Replay, downgrade, and substitution protections

The protocol should include the following protections.

### Replay protection

- stable record UUIDs or record hashes
- duplicate suppression
- session nonces
- checkpoint-aware message replay handling

### Downgrade protection

- explicit protocol version fields
- reject unsupported or downgraded crypto / schema versions
- bind negotiated parameters into transcript hashes where applicable

### Substitution protection

- identity bindings are self-signed
- handshakes reference binding hashes
- endorsements are signed for exact subject bindings
- UUID alone is never authoritative

---

## Threat model summary

### Threats addressed well by the protocol

- record tampering
- record deletion
- append-only history rewriting
- sync tampering
- duplicate replay confusion
- UUID/public-key misbinding visibility
- conflict-aware identity resolution
- endorsement-based preference over unsupported impersonation claims

### Threats only partially mitigated

- first-contact deception
- compromised trusted peers
- sybil attacks
- selective gossip
- gossip amplification
- historical replay of stale but valid records

### Threats not solved by the protocol alone

- global real-world identity truth
- strong sybil resistance
- metadata privacy against broad observers
- out-of-band coercion or device compromise

---

## Merkle-gossip-specific attack handling

### 1. History flooding

Mitigations:

- sync budgets
- rate limits
- local storage quotas
- low-trust propagation controls

### 2. Gossip amplification

Mitigations:

- tentative trust state for new claims
- UI distinction between claimed and verified
- optional slower propagation of low-trust records

### 3. Identity forks

Mitigations:

- explicit conflict sets
- no overwrite
- key rotation objects
- endorsement-based resolution

### 4. Selective gossip

Mitigations:

- sync with multiple peers
- suspicion metrics for incomplete peers
- repeated reconciliation from independent sources

### 5. Historical replay

Mitigations:

- timestamps
- key epochs
- revocations
- freshness-aware trust policy

### 6. Social graph inference

Mitigations:

- acknowledge privacy tradeoff explicitly
- consider future scoped propagation / pseudonymous identifiers

---

## Recommended implementation order

1. canonical encoding library and test vectors
2. durable record schemas
3. record validation engine
4. trust resolution engine
5. deterministic Merkle log
6. local sync harness
7. BLE session and message transport
8. NFC bootstrap
9. resume / checkpoint support
10. user-facing conflict / trust-state UI

This order minimizes risk by building correctness before transport complexity.

---

## Required test categories

### Record correctness

- canonical encoding stability
- signature verification
- record hash / leaf hash determinism
- duplicate suppression
- conflict detection

### Trust correctness

- self-signed binding only
- endorsement threshold acceptance
- conflicting bindings
- Bob/Charlie outweigh Eve scenario
- stale endorsements vs key rotation
- revocation effects

### Sync correctness

- equal roots
- differing roots
- mixed record types
- fragmented transfer
- duplicate messages
- checkpoint and resume
- incomplete peer behavior

### Adversarial correctness

- malicious UUID reuse
- same UUID / different key conflict
- invalid signature injection
- flooding with low-value records
- selective gossip withholding
- replay of old but valid records

---

## Recommended user-facing states

Although not strictly protocol-level, the product should expose enough state to keep trust decisions understandable.

For an identity, recommended visible states are:

- `Claimed`
- `Tentative`
- `Verified`
- `Conflicted`
- `Revoked`

For a sync session:

- `Connected`
- `Comparing`
- `Syncing`
- `Validating`
- `Completed`
- `Failed`
- `Resumable`

Without visible conflict states, users may misunderstand why the protocol refused silent remapping.

---

## Minimal v1 profile

A first shipping version may constrain the protocol to:

### Required record types

- `identity_binding`
- `handshake`
- `endorsement`

### Deferred record types

- `key_rotation`
- `revocation`

### Required sync messages

- `sync_open`
- `sync_accept`
- `subtree_query`
- `subtree_reply`
- `record_query`
- `record_reply`
- `record_ack`
- `sync_complete`
- `error`

### Required trust behavior

- self-signed bindings mandatory
- no silent overwrite on same UUID conflict
- local threshold support for endorsements
- `CLAIMED` / `TENTATIVE` / `VERIFIED` / `CONFLICTED`

This is enough to build the core system while deferring some lifecycle complexity.

---

## Reference example: Bob/Charlie vs Eve

Suppose Alice receives competing claims for `dan_uuid`.

### Candidate A

- self-signed binding: `dan_uuid -> dan_pubkey`
- Bob endorsement
- Charlie endorsement

### Candidate B

- self-signed binding: `dan_uuid -> eve_pubkey`
- no trusted endorsements

If Alice trusts Bob and Charlie at weight 1.0 each, and requires threshold 1.5 for verification:

- Candidate A support = 2.0
- Candidate B support = 0.0

Alice should resolve `dan_uuid` to `dan_pubkey` with state `VERIFIED`.

The conflicting Eve-backed binding should remain stored as a conflicting record set, not deleted.

---

## Bottom line

This protocol bundle defines a system that should be thought of as:

> a proximity-bootstrapped, BLE-synchronized, append-only signed trust log with local identity resolution

The key architectural rules are:

- UUID is identifier, not truth
- identity bindings are self-signed first-class records
- endorsements are explicit signed evidence
- trust is local-policy-based
- all durable evidence lives in a deterministic Merkle log
- BLE sync reconciles the log efficiently
- conflicts are represented, not overwritten

That combination makes the design substantially more robust against the attack classes discussed while remaining implementable on mobile devices.
