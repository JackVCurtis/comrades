# Research Notes: NFC Exchange of Merkle Tree Handshake Data (Reassessed Architecture)

Date: 2026-03-14

## Scope

You described a mobile app where two users complete a proximity-based handshake that ultimately exchanges:

- long-term identity public keys
- opaque UUIDs
- signed identity-binding claims
- handshake records
- endorsement records
- each user's current Merkle-synchronized view of known records

Earlier versions of the design treated the handshake record itself as the primary durable object and treated UUID/public-key exchange as part of the same flow. After threat-model review, that architecture needs to be refined.

This updated document reassesses the architecture in light of the attack classes we discussed, especially:

- UUID/public-key misbinding
- first-contact impersonation
- conflicting identity claims
- endorsement and threshold trust
- Merkle-gossip-specific attacks such as flooding, selective gossip, and identity forks

This document still references the same implementation building blocks, but the recommended architecture is now more explicit about separating:

1. **identity**
2. **trust / endorsement**
3. **append-only event log**
4. **transport bootstrap and sync**

---

## Executive summary

The original concept — NFC tap followed by exchange of Merkle-synchronized handshake history — is still viable, but it should **not** treat UUIDs as authoritative identities and should **not** rely on handshake records alone to establish who a user is.

The revised architecture should be:

1. **Identity layer**
   - Each user has a long-term identity keypair.
   - Each UUID-to-public-key assignment is represented as a **self-signed identity binding**.
   - UUID alone is never trusted as identity.

2. **Trust / endorsement layer**
   - Other users may issue signed endorsements for a specific UUID→public-key binding.
   - Each device applies a **local trust policy** to conflicting bindings.
   - Thresholds such as “require 2 trusted endorsements” are reasonable.

3. **Event log layer**
   - Handshakes, endorsements, revocations, and key-rotation records are durable signed records.
   - These records are leaves in a deterministic Merkle structure.
   - The Merkle tree provides tamper detection, append-only history, and efficient reconciliation.

4. **Transport layer**
   - **NFC** is used only for proximity-based bootstrap.
   - **BLE** is used for authenticated encrypted bulk exchange.
   - The transport must not be trusted to resolve identity truth on its own.

This means the system should no longer be thought of as merely “exchange Merkle trees of handshakes.” It is better understood as:

> a proximity-bootstrapped, Merkle-synchronized, signed identity-and-trust log

---

## Architectural reassessment

## What changed after the threat review

The main architectural changes are:

### 1. UUIDs are downgraded from identity to identifier

A UUID is now treated only as an opaque handle.

It may appear in records, but it is not sufficient proof that:

- the UUID belongs to a specific user
- the UUID belongs to a specific public key
- a third party can safely assert what that UUID means

This change is necessary because of the misbinding attack:

- Eve can learn Bob’s UUID
- Eve can try to present Bob’s UUID alongside Eve’s key
- if Alice trusts the pairing without stronger evidence, Alice may accept a false identity mapping

### 2. Identity binding becomes a first-class signed object

The system needs a durable object such as:

```text
IdentityBinding {
  binding_version
  subject_uuid
  subject_identity_public_key
  created_at
  key_epoch
  self_signature
}
```

This object means:

> “The holder of this private key claims that this UUID is bound to this public key.”

This does not completely solve first-contact trust, but it prevents arbitrary third parties from casually rebinding someone else’s UUID unless the verifier is willing to trust an unsigned or untrusted assertion.

### 3. Handshake records are no longer enough by themselves

A handshake record should prove:

- two participants completed a mutually signed exchange
- both saw certain identity bindings
- both claimed certain local Merkle state
- both agreed on the same canonical payload

A handshake record should **not** be treated as the only source of durable identity truth.

Instead, it should reference the participants’ identity bindings by hash or canonical identifier.

### 4. Endorsement records become part of the protocol

Because first-contact trust remains difficult, the architecture now benefits from explicit third-party endorsement objects such as:

```text
Endorsement {
  endorsement_version
  endorser_uuid
  subject_uuid
  subject_identity_public_key
  confidence_level
  created_at
  signature
}
```

This lets Alice make a local decision such as:

- Dan’s UUID→key binding is supported by Bob and Charlie
- Eve’s conflicting binding is unsupported or weakly supported
- therefore the Bob/Charlie-backed binding should be preferred

### 5. The Merkle tree is now clearly scoped as an integrity and sync primitive

The Merkle layer remains important, but it is no longer doing conceptual work it cannot safely do.

The Merkle tree helps with:

- append-only history
- tamper detection
- efficient synchronization
- auditability

It does **not** prove that an accepted identity claim is globally true.

---

## Revised object model

A more robust architecture has at least these durable signed record types.

## 1. Identity binding record

Purpose:

- bind UUID to long-term public key
- represent key epoch / rotation generation
- serve as the base subject of endorsements and handshakes

Suggested fields:

```text
IdentityBindingRecordV1 {
  binding_version
  subject_uuid
  subject_identity_public_key
  key_epoch
  created_at
  expires_at_optional
  self_signature
}
```

## 2. Handshake record

Purpose:

- record a proximity-based encounter
- commit to both participants’ identity bindings
- include claimed Merkle state and session context

Suggested fields:

```text
HandshakeRecordV1 {
  record_version
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
  signature_a
  signature_b
}
```

## 3. Endorsement record

Purpose:

- allow one identity to vouch for another identity binding
- support threshold / weighted trust policies

Suggested fields:

```text
EndorsementRecordV1 {
  endorsement_version
  endorser_binding_hash
  subject_binding_hash
  endorsement_type
  confidence_level
  created_at
  signature
}
```

## 4. Key rotation record

Purpose:

- support legitimate key changes without permanent identity forks

Suggested fields:

```text
KeyRotationRecordV1 {
  rotation_version
  subject_uuid
  old_binding_hash
  new_binding_hash
  rotation_counter
  created_at
  old_key_signature_optional
  new_key_signature
}
```

## 5. Revocation or distrust record

Purpose:

- express that a previously trusted binding or endorsement should no longer be relied on

Suggested fields:

```text
RevocationRecordV1 {
  revocation_version
  target_record_hash
  reason_code
  created_at
  signer_binding_hash
  signature
}
```

---

## Revised handshake architecture

## Recommended transport architecture

The hybrid NFC → BLE architecture still holds, but its role is now more precise.

### NFC phase

NFC should exchange only small bootstrap data needed to:

- prove physical proximity
- identify the current device/session
- initiate a secure BLE session
- bind the tap event to the later BLE transcript

Suggested NFC bootstrap payload:

```text
NfcBootstrapV1 {
  protocol_version
  session_uuid
  device_uuid
  identity_binding_hash
  ephemeral_public_key
  bluetooth_service_uuid
  nonce
  signature_over_bootstrap
}
```

Important note:

The NFC bootstrap should carry an **identity binding hash**, not just a raw UUID and public key treated as inherently trustworthy.

### BLE phase

BLE then carries:

- secure session establishment
- Merkle root comparison
- subtree reconciliation
- missing record transfer
- endorsement and identity-binding transfer
- conflict detection metadata

This keeps NFC small and uses BLE for the heavy sync work.

---

## Revised trust model

## What Alice should believe after a handshake

After a single handshake, Alice should not necessarily conclude:

- “this person is definitely Dan”

She may conclude:

- “I observed a self-signed identity binding”
- “I observed a mutually signed handshake with that binding”
- “I observed endorsements supporting or conflicting with that binding”
- “my local trust policy rates this identity as tentative / verified / conflicted”

This is a much safer model.

## Suggested local trust states

For each UUID or identity binding, the device can keep a local state such as:

- `CLAIMED`
- `TENTATIVE`
- `VERIFIED`
- `CONFLICTED`
- `REVOKED`

Suggested interpretation:

- `CLAIMED`: only self-signed binding observed
- `TENTATIVE`: self-signed binding plus limited trusted support
- `VERIFIED`: binding supported by sufficient trusted endorsements
- `CONFLICTED`: multiple incompatible bindings for the same UUID
- `REVOKED`: binding should no longer be trusted

## Suggested trust policy

Alice’s device should apply local policy, for example:

- require self-signed identity binding for every identity claim
- require at least `N` trusted endorsements to auto-upgrade to `VERIFIED`
- never silently overwrite an existing UUID→key mapping
- prefer newer valid key-rotation chains over stale bindings
- discount endorsements from unknown or low-trust identities

A weighted model is usually better than raw counts.

Example:

- Bob endorsement weight: 1.0
- Charlie endorsement weight: 1.0
- unknown endorser weight: 0.0
- acceptance threshold: 1.5

In that model, Bob + Charlie can outweigh Eve.

---

## Threat-model-driven architectural conclusions

## 1. The system should be log-based, not mapping-based

The system should not rely on a mutable table such as:

```text
uuid -> pubkey
```

being overwritten as new data arrives.

Instead, it should store signed records and derive local belief from the full record set.

That makes conflicts visible and auditable.

## 2. The system should store provenance

For every identity-related claim, the device should remember:

- where it was first seen
- who endorsed it
- whether it conflicts with prior claims
- whether it was observed directly in a handshake or only via gossip

This helps with auditability and trust scoring.

## 3. The system should distinguish “met” from “endorsed”

A handshake record means:

- these two identities completed an interaction

An endorsement record means:

- one identity vouches for another identity binding

Those are related but not interchangeable.

## 4. The system should assume the gossip layer can carry malicious but validly signed content

Not every signed record is benign.

The Merkle log must be able to carry:

- bad endorsements
- spam handshakes
- conflicting bindings
- stale records

The local trust engine decides how much weight to assign them.

---

## Merkle tree reassessment

## What the Merkle tree still does well

The Merkle tree still provides strong value.

It helps prevent:

- silent modification of records
- silent deletion of records
- undetected partial-history forgery
- replay confusion for duplicate durable records
- sync tampering during subtree reconciliation

It remains the right foundation for:

- append-only event history
- efficient sync
- auditability
- convergence among honest peers

## What the Merkle tree does not solve

It does not solve:

- first-contact impersonation
- UUID/public-key misbinding
- sybil attacks
- social trust inference
- endorsement truth
- key ownership truth

That means the Merkle design should be preserved, but only as one layer.

## Recommended Merkle leaf policy

The Merkle log should contain all durable signed record types, not just handshake records.

A leaf should therefore be something like:

```text
leaf_hash = H(
  "record/v1" ||
  record_type ||
  canonical_record_bytes
)
```

Where `record_type` can be:

- `identity_binding`
- `handshake`
- `endorsement`
- `key_rotation`
- `revocation`

This unifies the system into a single append-only signed record log.

## Recommended leaf ordering

To reduce cross-peer divergence, use a deterministic ordering such as:

- `leaf_hash` ordering, or
- canonical `(record_type, created_at, stable_id)` ordering

`leaf_hash` ordering is cleaner for convergence.

---

## Additional attack classes that now matter more

Because the design is now a Merkle-gossiped trust log, these attack classes should be considered first-class design constraints.

## 1. History flooding

An attacker can create many syntactically valid but low-value records.

Impact:

- storage growth
- sync slowdown
- BLE bandwidth exhaustion

Architecture implication:

- rate limits
- per-peer sync budgets
- trust-weighted propagation
- optional future pruning policies

## 2. Gossip amplification

A malicious record can spread quickly once accepted into gossip.

Architecture implication:

- new identity claims should remain tentative until policy acceptance
- propagation of low-trust claims may need to be delayed or marked
- local trust state should affect UX and downstream reliance

## 3. Identity forks

Different peers may see conflicting bindings for the same UUID.

Architecture implication:

- represent conflicting candidates explicitly
- never auto-overwrite
- require conflict resolution policy
- support signed key rotation to distinguish real change from attack

## 4. Selective gossip

A malicious peer can withhold some legitimate records.

Architecture implication:

- sync with multiple peers
- avoid relying on a single source of truth
- track incomplete or suspicious peers

## 5. Historical replay

Old records may be replayed to create confusion.

Architecture implication:

- include key epochs
- include timestamps
- support revocation and rotation
- incorporate freshness into trust logic

## 6. Social graph inference

Merkle gossip can reveal who met whom and who endorsed whom.

Architecture implication:

- this architecture has meaningful metadata privacy costs
- consider pseudonymous identifiers or limited-scope propagation later if privacy becomes a core product requirement

---

## Platform reassessment

## Android

Android is still the best target for a first implementation because:

- HCE/APDU is available
- you can build a precise NFC bootstrap and BLE handoff flow
- the identity/trust log can be prototyped natively with strong transport control

## iOS

The architectural reassessment actually strengthens the case for **not** depending on symmetric phone-to-phone NFC on iOS.

Because NFC is now only a bootstrap mechanism, and the real work happens over BLE, you may be able to support iOS with a more limited NFC role or with an alternate local bootstrap flow.

That makes the architecture more realistic cross-platform than the original “exchange many records over NFC” idea.

---

## Implementation guidance after reassessment

## What to build first

A better order of implementation now is:

1. **Canonical record formats**
   - identity binding
   - handshake
   - endorsement
   - key rotation
   - revocation

2. **Trust engine**
   - local trust state
   - conflict handling
   - endorsement thresholds / weighting
   - UUID→key resolution logic

3. **Deterministic Merkle log**
   - one canonical leaf format for all record types
   - duplicate/conflict handling
   - deterministic ordering

4. **Secure transport**
   - NFC bootstrap
   - BLE encrypted sync
   - resumable sync state machine

5. **Policy controls**
   - threshold settings
   - trust-anchor management
   - conflict UI / diagnostics

This is slightly different from the earlier recommendation because the trust model is now central, not optional.

## What to test aggressively

You should add explicit test cases for:

- self-signed identity binding validation
- conflicting binding detection
- Bob/Charlie endorsement threshold acceptance
- Eve misbinding attempt using Bob’s UUID
- stale endorsement vs valid key rotation
- duplicate records and replay resistance
- flooding resilience and sync budgeting
- selective gossip from malicious peers
- deterministic convergence with mixed record types

---

## Reuse of existing libraries and examples

The earlier implementation references remain useful, but their role is now clearer.

### libsignal

Still a strong source for:

- long-term identity keys
- signatures
- durable key/session storage
- authenticated BLE application sessions

But libsignal does not define:

- identity-binding policy
- endorsement policy
- Merkle log semantics
- trust thresholds

### Android HCE and Core NFC examples

Still useful for transport bootstrap, especially on Android.

But transport is now just one piece of the design. It should not be allowed to define trust semantics implicitly.

### Merkle tree examples

Still useful for:

- canonical hashing discipline
- proof generation/verification
- testing tree consistency

But the tree implementation must now support a richer record vocabulary, not just handshake leaves.

---

## Revised recommended architecture

If building this system today, the recommended architecture would be:

### Core data model

- **IdentityBindingRecord**
- **HandshakeRecord**
- **EndorsementRecord**
- **KeyRotationRecord**
- **RevocationRecord**

### Core trust model

- self-signed identity bindings required
- local trust scores for endorsers
- threshold acceptance of bindings
- no silent overwrite on conflict
- explicit conflict and revocation handling

### Core sync model

- deterministic canonical encoding for all records
- one append-only Merkle log over all durable signed records
- BLE sync via root compare, subtree compare, and missing-record fetch
- resumable state machine for partial transfer

### Core transport model

- NFC only for bootstrap and proximity proof
- BLE for encrypted bulk transfer
- transcript binding between NFC bootstrap and BLE session

### Core product posture

- Android-first implementation
- iOS supported with a more constrained bootstrap role
- trust model visible in UI as tentative / verified / conflicted states

---

## Bottom line

The architecture is still viable, but the threat review changes what the system fundamentally is.

It is **not** safest to think of it as:

> a handshake app that swaps UUIDs and Merkle trees

It is safer to think of it as:

> a proximity-bootstrapped, BLE-synchronized, append-only signed trust log with local identity resolution policy

That change in framing leads to several concrete requirements:

- UUIDs must not be trusted by themselves
- self-signed identity bindings must be first-class records
- endorsements must be explicit signed records
- Merkle leaves should cover all durable trust-relevant records
- conflicting identity assignments must be represented, not overwritten
- threshold trust policy should be local and configurable
- the Merkle tree should be used for integrity and sync, not truth determination

With those changes, the hybrid NFC → BLE architecture remains a strong design direction and is materially more robust against the attacks we discussed.
