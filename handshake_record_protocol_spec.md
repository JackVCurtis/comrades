# Reference Protocol Specification: Handshake Record

Date: 2026-03-14

## Purpose

This document defines a **reference handshake record format** for a mobile application that:

- uses **NFC** for proximity-based bootstrap
- upgrades to **Bluetooth Low Energy (BLE)** for larger data exchange
- uses **libsignal primitives** for identity and session cryptography
- stores handshake events as **leaves in a Merkle tree**

The goal of this specification is to make handshake records:

- deterministic to serialize
- safe to merge across peers
- easy to verify independently
- stable as Merkle tree leaves

This is a **reference spec**, not a wire-format standard. It is intended to guide implementation decisions and keep Merkle roots stable across devices.

---

## Design goals

A valid handshake record should provide:

1. **Uniqueness**  
   Each handshake must have a stable identifier.

2. **Authenticity**  
   Both participants must sign the same canonical payload.

3. **Deterministic hashing**  
   The exact same handshake record must hash identically on every device.

4. **Merge safety**  
   Devices that learn the same handshake by different sync paths must converge on one identical record.

5. **Transport independence**  
   The handshake record should be independent from whether bootstrap happened over NFC, QR, or another out-of-band channel.

6. **Extensibility**  
   New optional fields should be possible without breaking old records.

---

## Terminology

### Participant
One of the two app users involved in the handshake.

### Device UUID
An opaque UUID identifying the local app installation or device instance.

### User identity key
A long-term public identity key used for authentication.

### Ephemeral key
A short-lived public key used for this handshake session only.

### Handshake record
The durable object stored as a Merkle tree leaf.

### Handshake envelope
A transport object used while the handshake is still in progress. Not all envelope fields need to be stored in the final record.

---

## Versioning

Every handshake record must include a protocol version:

- `record_version`: version of the stored handshake record schema
- `crypto_suite`: version identifier for cryptographic algorithms and encodings

Recommended initial values:

- `record_version = 1`
- `crypto_suite = "libsignal-ed25519-x25519-sha256-v1"` or an equivalent project-defined identifier

Do not infer version from field presence alone.

---

## Required invariants

A handshake record is valid only if all of the following are true:

1. It names **exactly two participants**
2. Both participants signed the same canonical signing payload
3. The participant ordering is canonical
4. The handshake UUID is deterministically derived or globally unique
5. The record hash is computed from canonical serialization only
6. All binary fields use a fixed encoding
7. Timestamps use a fixed format
8. Unknown critical fields cause validation failure

---

## Canonical participant ordering

To ensure both devices construct the same record, participant order must be canonical.

### Rule

Sort the two participants by the lexicographic ordering of:

1. `identity_public_key`
2. if tied, `device_uuid`

The first sorted participant becomes `participant_a`.  
The second becomes `participant_b`.

### Why this matters

Without canonical ordering, the same handshake could be represented two different ways:

- A↔B
- B↔A

That would produce different serialized records and different Merkle roots.

---

## Record structure

A handshake record contains three logical sections:

1. **Header**
2. **Participant data**
3. **Verification data**

### Reference structure

```json
{
  "record_version": 1,
  "crypto_suite": "libsignal-ed25519-x25519-sha256-v1",
  "handshake_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2026-03-14T12:34:56.789Z",
  "transport_hint": "nfc+ble",
  "participants": [
    {
      "role": "a",
      "user_identity_public_key": "...",
      "device_uuid": "...",
      "ephemeral_public_key": "...",
      "merkle_root": "...",
      "merkle_leaf_count": 123
    },
    {
      "role": "b",
      "user_identity_public_key": "...",
      "device_uuid": "...",
      "ephemeral_public_key": "...",
      "merkle_root": "...",
      "merkle_leaf_count": 456
    }
  ],
  "signing_payload_hash": "...",
  "participant_signatures": [
    {
      "role": "a",
      "signature": "..."
    },
    {
      "role": "b",
      "signature": "..."
    }
  ],
  "extensions": {}
}
```

This JSON is illustrative only. The actual Merkle leaf hash must be computed over a canonical serialization, not ordinary pretty-printed JSON.

---

## Field definitions

## 1. Header fields

### `record_version`
**Type:** unsigned integer  
**Required:** yes

Schema version of the stored handshake record.

### `crypto_suite`
**Type:** string  
**Required:** yes

Identifier for the cryptographic suite used to interpret keys, signatures, and hashes.

### `handshake_uuid`
**Type:** UUID string or 16-byte binary UUID  
**Required:** yes

Opaque identifier for the handshake.

Recommended options:

- random UUIDv4 generated jointly by one side and signed by both, or
- deterministic UUID derived from canonical handshake material

For simplicity, the recommended first implementation is:

- initiator generates UUIDv4
- both participants sign a payload containing it

### `created_at`
**Type:** RFC 3339 / ISO 8601 UTC timestamp with milliseconds  
**Required:** yes

The time the handshake was finalized.

Example:

```text
2026-03-14T12:34:56.789Z
```

### `transport_hint`
**Type:** string enum  
**Required:** yes

Suggested values:

- `nfc`
- `nfc+ble`
- `qr+ble`
- `unknown`

This field is informative only and must not change signature semantics.

---

## 2. Participant fields

Each handshake record must contain exactly two participant objects.

### `role`
**Type:** string enum  
**Required:** yes

Must be either:

- `a`
- `b`

These roles are derived from canonical ordering, not from who initiated the handshake.

### `user_identity_public_key`
**Type:** bytes encoded as base64url or hex  
**Required:** yes

The participant's long-term public identity key.

### `device_uuid`
**Type:** UUID  
**Required:** yes

Opaque device or installation identifier.

### `ephemeral_public_key`
**Type:** bytes encoded as base64url or hex  
**Required:** yes

Ephemeral key used for this handshake exchange.

### `merkle_root`
**Type:** bytes encoded as base64url or hex  
**Required:** yes

The participant's local Merkle root at the time of the handshake.

This is included as a signed claim and is useful for later reconciliation, but it is **not** itself proof that the peer had all leaves implied by that root.

### `merkle_leaf_count`
**Type:** unsigned integer  
**Required:** yes

The participant's claimed leaf count at the time of handshake.

Including this can speed sync negotiation and support sanity checks.

---

## 3. Verification fields

### `signing_payload_hash`
**Type:** bytes encoded as base64url or hex  
**Required:** yes

Hash of the canonical unsigned payload that both users sign.

### `participant_signatures`
**Type:** array of exactly two signature objects  
**Required:** yes

Each participant must provide a signature over the same canonical signing payload.

Each object contains:

- `role`
- `signature`

### `extensions`
**Type:** object/map  
**Required:** yes, may be empty

Reserved for future optional fields.

Unknown non-critical extensions may be ignored.  
Unknown critical extensions must fail validation.

A simple pattern is:

```json
{
  "extensions": {
    "critical": {},
    "non_critical": {}
  }
}
```

---

## Canonical signing payload

The **most important rule** in the whole system is this:

> Both participants must sign the exact same byte sequence.

Do not sign a loosely formatted JSON string.

Instead, define a canonical unsigned payload.

### Recommended unsigned payload fields

```json
{
  "record_version": 1,
  "crypto_suite": "libsignal-ed25519-x25519-sha256-v1",
  "handshake_uuid": "...",
  "created_at": "...",
  "transport_hint": "nfc+ble",
  "participants": [
    {
      "role": "a",
      "user_identity_public_key": "...",
      "device_uuid": "...",
      "ephemeral_public_key": "...",
      "merkle_root": "...",
      "merkle_leaf_count": 123
    },
    {
      "role": "b",
      "user_identity_public_key": "...",
      "device_uuid": "...",
      "ephemeral_public_key": "...",
      "merkle_root": "...",
      "merkle_leaf_count": 456
    }
  ],
  "extensions": {}
}
```

### Canonical serialization rules

Pick one and never mix formats within the same deployment:

- **CBOR canonical encoding** is a strong choice
- Canonical JSON can work, but is easier to get wrong

Recommended approach:

- encode the unsigned payload with **canonical CBOR**
- compute `SHA-256(payload_bytes)`
- both participants sign `payload_bytes` or the hash, consistently

### Mandatory canonicalization rules

If using canonical JSON instead of CBOR:

1. UTF-8 encoding only
2. Object keys sorted lexicographically
3. No insignificant whitespace
4. Integers encoded in decimal form only
5. Timestamps normalized to UTC with exactly 3 fractional digits
6. Binary fields encoded using **base64url without padding** or **lowercase hex**, but exactly one project-wide choice
7. No duplicate keys
8. Omit fields rather than using `null`, unless `null` is explicitly part of the schema

---

## Merkle leaf hashing

The handshake record becomes a Merkle leaf only after it is fully formed and signed.

### Leaf hash procedure

1. Construct canonical unsigned payload
2. Compute `signing_payload_hash`
3. Attach both participant signatures
4. Construct canonical full record
5. Compute leaf hash:

```text
leaf_hash = SHA-256("handshake_record_v1" || canonical_full_record_bytes)
```

Use explicit domain separation such as `"handshake_record_v1"` to avoid cross-protocol hash collisions.

### Why hash the full signed record

Hashing the signed record ensures the Merkle leaf commits to:

- participant identities
- claimed Merkle roots
- timestamp
- both signatures

This prevents ambiguous reconstruction later.

---

## UUID generation

## Recommended baseline

Use a random UUIDv4 generated by the initiating device during the bootstrap stage.

Validation requirements:

- must be present in the signed payload
- both participants must sign the same UUID
- once created, it is immutable

## Deterministic option

A deterministic ID is also possible:

```text
UUID = truncate_128bits(SHA-256(
  canonical_participant_a_identity_key ||
  canonical_participant_b_identity_key ||
  created_at ||
  ephemeral_key_a ||
  ephemeral_key_b
))
```

This reduces accidental duplicates but creates more coupling to canonicalization details.

For an initial implementation, random UUIDv4 is simpler.

---

## Signature rules

Each participant signs the same unsigned canonical payload.

### Signature object

```json
{
  "role": "a",
  "signature": "base64url..."
}
```

### Verification steps

For each participant:

1. Determine canonical payload bytes
2. Extract participant identity public key
3. Verify signature against the canonical payload
4. Ensure signature role matches the participant role

Reject the record if either signature fails.

---

## Recommended validation algorithm

A device receiving a handshake record should validate in this order:

1. Check `record_version`
2. Check `crypto_suite`
3. Check field presence and field types
4. Check there are exactly two participants
5. Recompute canonical participant ordering
6. Ensure roles are `a` and `b`
7. Ensure UUIDs and timestamps are well-formed
8. Reconstruct canonical unsigned payload
9. Recompute `signing_payload_hash`
10. Verify both signatures
11. Reconstruct canonical full record
12. Recompute leaf hash
13. Check for duplicate `handshake_uuid`
14. Merge into local store if novel

---

## Duplicate handling and merge semantics

Two devices may receive the same handshake via different sync paths.

### Identity of a handshake

The primary identity of a handshake should be:

- `handshake_uuid`

### Duplicate rule

If a record with the same `handshake_uuid` already exists:

- if byte-identical after canonical serialization: ignore as duplicate
- if same UUID but different content: reject as conflict and quarantine for manual or automated conflict handling

Do not silently overwrite.

---

## Suggested conflict policy

A conflicting record with the same `handshake_uuid` may indicate:

- corruption
- malicious tampering
- implementation mismatch
- bad canonicalization logic

Recommended behavior:

1. mark record as invalid
2. do not add it to the Merkle tree
3. store it in a conflict log
4. optionally expose diagnostics for debugging

---

## Privacy considerations

A handshake record as defined here leaks some metadata to peers who later receive it:

- device UUIDs
- identity public keys
- approximate handshake time
- claimed Merkle root and leaf count

If privacy is a concern, consider future revisions that:

- rotate device UUIDs
- use pairwise pseudonymous identifiers
- store coarse timestamps
- encrypt some leaf content while keeping a public commitment format

That said, encrypted leaf content complicates distributed reconciliation.

---

## Recommended binary encodings

Pick one encoding for all binary fields project-wide.

### Option A: base64url without padding
Pros:
- compact
- JSON-friendly

### Option B: lowercase hex
Pros:
- easy to debug manually
- human-readable

For development and debugging, hex is often easier.  
For production mobile transport, base64url is more compact.

Do not mix encodings inside one deployment.

---

## Recommended timestamp rules

Use:

- UTC only
- RFC 3339 string
- exactly millisecond precision

Example:

```text
2026-03-14T12:34:56.789Z
```

Do not use local time zones.  
Do not allow variable precision.

---

## Minimal reference schema

This is a compact schema suitable for a first implementation.

```json
{
  "record_version": 1,
  "crypto_suite": "libsignal-ed25519-x25519-sha256-v1",
  "handshake_uuid": "uuid",
  "created_at": "timestamp",
  "transport_hint": "nfc+ble",
  "participants": [
    {
      "role": "a",
      "user_identity_public_key": "bytes",
      "device_uuid": "uuid",
      "ephemeral_public_key": "bytes",
      "merkle_root": "bytes",
      "merkle_leaf_count": 0
    },
    {
      "role": "b",
      "user_identity_public_key": "bytes",
      "device_uuid": "uuid",
      "ephemeral_public_key": "bytes",
      "merkle_root": "bytes",
      "merkle_leaf_count": 0
    }
  ],
  "signing_payload_hash": "bytes",
  "participant_signatures": [
    { "role": "a", "signature": "bytes" },
    { "role": "b", "signature": "bytes" }
  ],
  "extensions": {}
}
```

---

## Example canonicalization workflow

### Step 1: collect handshake inputs

- initiator-generated `handshake_uuid`
- finalized `created_at`
- both participant identity public keys
- both device UUIDs
- both ephemeral public keys
- both claimed Merkle roots
- both claimed leaf counts

### Step 2: canonically sort participants

Sort by identity key, then device UUID.

### Step 3: construct unsigned payload

Use the exact field order and encoding rules defined by your canonical serialization format.

### Step 4: hash payload

```text
signing_payload_hash = SHA-256(unsigned_payload_bytes)
```

### Step 5: sign payload

Participant A signs the payload.  
Participant B signs the same payload.

### Step 6: assemble full record

Add signatures and extensions.

### Step 7: compute leaf hash

```text
leaf_hash = SHA-256("handshake_record_v1" || canonical_full_record_bytes)
```

### Step 8: append to local Merkle tree

Insert the leaf using your chosen tree ordering policy.

---

## Important implementation note: insertion order

Even if the handshake record format is canonical, the **Merkle tree will still diverge** unless leaf ordering is also canonical.

Recommended options:

### Option A: append-only log order
Leaves are inserted in the order a device learns them.

- simple
- efficient
- not globally deterministic across peers

This is fine only if you use Merkle synchronization over a local append-only tree and do not require all peers to compute the same root from the same set unless arrival order also matches.

### Option B: globally sorted leaves
Leaves are sorted by a stable key such as:

1. `created_at`
2. `handshake_uuid`

or directly by:

- `leaf_hash`

This is better if you want all peers with the same handshake set to converge on the same root.

For a distributed sync system like yours, **globally sorted leaves** are usually the safer choice.

---

## Recommended stable leaf ordering

For best convergence, sort handshake records by:

1. `created_at`
2. `handshake_uuid`

If two devices observe the same set, they should compute the same sorted sequence and therefore the same Merkle root.

If you want stronger determinism independent of clocks, sort by:

1. `leaf_hash`

This avoids clock skew issues but makes debugging slightly harder.

---

## Reference validation pseudocode

```text
function validateHandshakeRecord(record):
    assert record.record_version == 1
    assert supportedCryptoSuite(record.crypto_suite)

    assert len(record.participants) == 2
    assert len(record.participant_signatures) == 2

    participants = canonicalSort(record.participants)
    assert participants[0].role == "a"
    assert participants[1].role == "b"

    unsignedPayload = buildCanonicalUnsignedPayload(record, participants)
    expectedPayloadHash = SHA256(unsignedPayload)
    assert expectedPayloadHash == record.signing_payload_hash

    sigA = getSignature(record, "a")
    sigB = getSignature(record, "b")

    assert verify(participants[0].user_identity_public_key, unsignedPayload, sigA)
    assert verify(participants[1].user_identity_public_key, unsignedPayload, sigB)

    fullRecord = buildCanonicalFullRecord(record, participants)
    leafHash = SHA256("handshake_record_v1" || fullRecord)

    return leafHash
```

---

## Practical recommendation

For a first implementation, the most robust path is:

- canonical participant ordering
- canonical CBOR serialization
- SHA-256 payload and leaf hashing
- signatures over the unsigned canonical payload
- full signed record as the Merkle leaf content
- globally deterministic leaf ordering, preferably by `leaf_hash` or by `created_at + handshake_uuid`

That combination minimizes accidental divergence between peers.

---

## Summary

A strong handshake record spec should:

- contain exactly two canonically ordered participants
- include identity keys, device UUIDs, ephemeral keys, and claimed Merkle state
- use canonical serialization
- have both users sign the same payload
- produce a domain-separated leaf hash
- define duplicate and conflict handling clearly

This gives you a stable object that works both as:

- a signed proof of a proximity-based handshake
- a deterministic Merkle leaf for distributed synchronization
