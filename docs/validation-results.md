# Validation Results

Peer Tree validation now returns a canonical, auditable `ValidationResult` object for every validation entry point.

## Canonical status values

Validation status is always one of:

- `accepted`
- `rejected`
- `conflicted`

These values are deterministic, serializable, and safe to persist.

## Result model

```ts
export type ValidationStatus = 'accepted' | 'rejected' | 'conflicted';

export interface ValidationResult {
  status: ValidationStatus;
  reason: string;
  phase?: 'structural' | 'cryptographic' | 'semantic';
  field?: string;
  details?: unknown;
}
```

## Status meaning

### `accepted`

The record passed structural, cryptographic, and semantic validation and can proceed in the pipeline.

### `rejected`

The record failed validation or could not be safely validated.

Typical reasons include:

- malformed schema / missing field
- signature verification failures
- unsupported input or decode failure
- unexpected exception during validation

### `conflicted`

The record is valid enough to parse and verify, but conflicts with local semantic state.

Examples:

- conflicting identity binding for the same subject UUID
- conflicting revocation data for same signer/target pair

## Safe-failure behavior

Validation uses a safe wrapper that guarantees explicit outcomes.

If validation throws, returns an invalid shape, or enters an unknown state, the result is forced to:

```json
{
  "status": "rejected",
  "reason": "validation_failure"
}
```

This ensures records are never accepted implicitly.

## Propagation through validation pipeline

`validateRecord` produces and returns `ValidationResult` at each stage:

1. Structural checks (`phase: "structural"`)
2. Cryptographic checks (`phase: "cryptographic"`)
3. Semantic checks (`phase: "semantic"`, including `conflicted`)
4. Final pass (`status: "accepted"`)

## Examples

Accepted:

```json
{
  "status": "accepted",
  "reason": "validation_passed"
}
```

Rejected:

```json
{
  "status": "rejected",
  "phase": "cryptographic",
  "reason": "invalid_signature",
  "field": "signature"
}
```

Conflicted:

```json
{
  "status": "conflicted",
  "phase": "semantic",
  "reason": "conflicting_identity_binding"
}
```
