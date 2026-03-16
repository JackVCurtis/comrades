# QR Bootstrap Payload (v1)

This document defines the minimal QR bootstrap payload used for proximity-bootstrapped BLE session testing.

## Purpose

`QrBootstrapV1` is a signed transport payload exchanged via QR scan to bind a later BLE session to an in-person interaction.

QR is the bootstrap transport in this implementation slice. BLE remains the session and synchronization transport.

## Payload fields

```ts
interface QrBootstrapV1 {
  version: 1;
  session_uuid: string;
  identity_binding_hash: string;
  ephemeral_public_key: string;
  bluetooth_service_uuid: string;
  nonce: string;
  signature: string;
}
```

## Signing scope

The signature covers canonical bytes for all fields except `signature`:

```ts
type SignableQrBootstrapV1 = Omit<QrBootstrapV1, 'signature'>;
```

## Canonical serialization

Canonical serialization uses the repository canonical serializer (`canonicalSerialize`) with deterministic lexicographic field ordering and length-prefixed field/value encoding. `JSON.stringify()` is not used for signature input.

Within this payload type, field names and values are encoded exactly as specified by `docs/canonical-serialization.md`; no transport-specific shortcuts are permitted.

## Strict validation (fail-closed)

Validation is fail-closed and enforces:

- object payload shape
- `version === 1`
- presence of all required fields
- UUID format for `session_uuid`
- hash format for `identity_binding_hash`
- public key format for `ephemeral_public_key`
- UUID format for `bluetooth_service_uuid`
- 16-byte nonce encoded as 32-char hex string
- signature format and detached-signature verification
- payload size limit (`VALIDATION_LIMITS.max_record_size`)

Any parse, decoding, canonicalization, or validation error rejects the payload. Parser exceptions return `validation_failure` and never produce partial acceptance.

## BLE session-binding rules

On successful bootstrap validation, BLE discovery and session confirmation are bound to:

- expected `bluetooth_service_uuid`
- expected `session_uuid`
- expected peer `identity_binding_hash`
- expected peer `ephemeral_public_key` for session key derivation/authentication

If any binding check fails, the BLE session is rejected and no synchronization traffic is accepted.
