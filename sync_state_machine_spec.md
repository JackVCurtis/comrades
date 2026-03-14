# Reference Protocol Specification: Sync State Machine

Date: 2026-03-14

## Purpose

This document defines a **reference peer state machine** for the NFC-bootstrapped, BLE-based Merkle synchronization protocol.

It is intended to complement:

- the **handshake record specification**
- the **BLE sync message specification**

This state machine defines:

- the lifecycle of a sync session
- valid state transitions
- timeout and retry behavior
- disconnect and resume handling
- validation and commit rules
- terminal success and failure states

The goal is to make implementations on different devices behave consistently, especially when:

- BLE disconnects mid-transfer
- duplicate messages arrive
- records partially validate
- one peer finishes before the other
- resume is attempted after interruption

This is a **reference state machine**, not a standards-track specification.

---

## Scope

This spec defines state-machine behavior for a **single pairwise sync session** between two devices after:

1. NFC bootstrap succeeded
2. BLE transport is available
3. the peers are ready to establish the application-layer sync session

It does **not** define:

- background scheduling
- OS lifecycle integration
- UI behavior
- local persistence internals
- multi-peer sync orchestration

---

## Design goals

The state machine should ensure:

1. **Deterministic behavior**  
   Both peers make compatible decisions from the same protocol events.

2. **Safety before liveness**  
   Invalid data must not be merged just to keep sync moving.

3. **Idempotence**  
   Duplicate messages and repeated resumes should not corrupt state.

4. **Bounded recovery**  
   Disconnects and timeouts should either recover cleanly or fail cleanly.

5. **Clear terminal states**  
   A session must end in explicit success, explicit failure, or explicit abandonment.

---

## Roles

The application sync protocol defines two logical roles:

- **initiator**
- **responder**

These are assigned per session and affect sequencing only.

### Initiator responsibilities

The initiator typically:

- opens the sync session
- drives root comparison
- begins subtree descent or inventory requests
- declares its local completion status

### Responder responsibilities

The responder typically:

- acknowledges the session open
- supplies its current tree summary
- answers queries
- may also request missing records if the protocol is bidirectional in one session

### Important rule

These roles do **not** imply authority.  
Both peers are equal in validation requirements and both must independently decide whether a session succeeded.

---

## Session invariants

The following invariants must hold throughout a valid session:

1. `session_id` is stable for the life of the session
2. negotiated capabilities remain fixed after session acceptance
3. record ordering scheme remains fixed for the session
4. no received record may enter the Merkle tree before full validation
5. duplicate messages must be safe to process idempotently
6. fragment reassembly must be scoped by `session_id` and `message_id`
7. a session cannot become `COMPLETED` until all required validations and local commits are finished
8. once a session reaches a terminal failure state, it must not silently continue

---

## High-level states

The state machine uses the following top-level states:

1. `IDLE`
2. `CONNECTING`
3. `NEGOTIATING`
4. `SECURE_CHANNEL_READY`
5. `COMPARING_ROOTS`
6. `RECONCILING`
7. `REQUESTING_RECORDS`
8. `RECEIVING_RECORDS`
9. `VALIDATING_RECORDS`
10. `APPLYING_RECORDS`
11. `CHECKPOINTING`
12. `FINALIZING`
13. `COMPLETED`
14. `FAILED`
15. `ABORTED`
16. `DISCONNECTED_RESUMABLE`

A minimal implementation may collapse some adjacent states, but the semantics should remain equivalent.

---

## State descriptions

## 1. `IDLE`

### Meaning

No active session exists.

### Entry conditions

- app has no sync in progress
- previous session reached terminal state
- local cleanup completed

### Allowed events

- `nfc_bootstrap_complete`
- `start_sync_request`

### Transitions

- on valid bootstrap and intent to sync → `CONNECTING`

---

## 2. `CONNECTING`

### Meaning

BLE transport is being established and the peer is being located or connected.

### Entry actions

- initialize session context
- allocate tentative `session_id`
- clear previous fragment buffers
- start connect timeout

### Allowed events

- `ble_connected`
- `connect_timeout`
- `user_cancel`
- `transport_error`

### Transitions

- on `ble_connected` → `NEGOTIATING`
- on `connect_timeout` → `FAILED`
- on `user_cancel` → `ABORTED`
- on `transport_error` → `FAILED`

---

## 3. `NEGOTIATING`

### Meaning

Peers exchange `sync_open` and `sync_accept` or `sync_reject`, negotiate capabilities, and establish shared session parameters.

### Entry actions

- send `sync_open` if initiator
- start negotiation timeout

### Allowed events

- `sync_open_received`
- `sync_accept_received`
- `sync_reject_received`
- `negotiation_timeout`
- `disconnect`
- `protocol_error`

### Transitions

- on successful negotiation and secure session availability → `SECURE_CHANNEL_READY`
- on `sync_reject_received` → `FAILED`
- on `negotiation_timeout` → `FAILED`
- on `disconnect` with resumable checkpoint available → `DISCONNECTED_RESUMABLE`
- on `disconnect` without checkpoint → `FAILED`
- on `protocol_error` → `FAILED`

### Required outputs

Before leaving `NEGOTIATING`, both peers must agree on:

- `protocol_version`
- `record_schema_version`
- `ordering_scheme`
- effective capability set
- maximum batch sizes
- whether resume is supported

If any of these differ irreconcilably, the session must fail.

---

## 4. `SECURE_CHANNEL_READY`

### Meaning

The BLE transport is connected and the application-layer authenticated encryption session is ready.

### Entry actions

- verify secure channel context is present
- mark transport as authenticated for this session
- reset per-phase retry counters

### Allowed events

- `secure_channel_confirmed`
- `root_compare_ready`
- `disconnect`
- `security_error`

### Transitions

- on `root_compare_ready` → `COMPARING_ROOTS`
- on `disconnect` with resumable checkpoint → `DISCONNECTED_RESUMABLE`
- on `disconnect` without resumable checkpoint → `FAILED`
- on `security_error` → `FAILED`

---

## 5. `COMPARING_ROOTS`

### Meaning

Peers exchange or confirm tree summaries and determine whether further reconciliation is needed.

### Entry actions

- send or confirm current `root_hash`
- send `leaf_count`
- send `tree_height`
- send `ordering_scheme`
- start compare timeout

### Allowed events

- `root_compare_received`
- `roots_equal`
- `roots_differ`
- `compare_timeout`
- `disconnect`

### Transitions

- on `roots_equal` → `FINALIZING`
- on `roots_differ` → `RECONCILING`
- on `compare_timeout` → `FAILED`
- on `disconnect` with resumable support → `DISCONNECTED_RESUMABLE`
- on `disconnect` without resume → `FAILED`

### Important rule

Roots are comparable only if:

- the ordering scheme matches
- the record schema version matches
- the tree construction rules match

If not, the protocol must fail or explicitly fall back to a non-root-comparison path defined by the implementation.

---

## 6. `RECONCILING`

### Meaning

The peers determine which parts of their Merkle state differ using subtree queries and/or leaf inventory.

### Entry actions

- initialize reconciliation work queue
- seed queue with root node or initial differing span
- reset outstanding-query map

### Allowed events

- `subtree_reply_received`
- `inventory_reply_received`
- `reconciliation_queue_empty`
- `need_record_fetch`
- `reconciliation_timeout`
- `disconnect`

### Transitions

- on `need_record_fetch` → `REQUESTING_RECORDS`
- on `reconciliation_queue_empty` with no missing records → `FINALIZING`
- on `reconciliation_timeout` → `FAILED`
- on `disconnect` with checkpoint → `DISCONNECTED_RESUMABLE`
- on `disconnect` without checkpoint → `FAILED`

### Internal behavior

While in `RECONCILING`, the peer may:

- issue `subtree_query`
- consume `subtree_reply`
- decide whether to descend further
- switch to `leaf_inventory_query` below a configured span threshold
- compute the set of missing leaf hashes or handshake UUIDs

### Exit condition

This state ends only when:

- there are no more differing subtrees to inspect, and
- either no missing records exist or a concrete missing-record set has been computed

---

## 7. `REQUESTING_RECORDS`

### Meaning

The peer has identified one or more missing records and is requesting them.

### Entry actions

- batch missing record identifiers under negotiated limits
- send `record_query`
- mark requested set as outstanding
- start request timeout

### Allowed events

- `record_reply_received`
- `record_request_sent`
- `all_record_requests_sent`
- `request_timeout`
- `disconnect`

### Transitions

- on first `record_reply_received` → `RECEIVING_RECORDS`
- on `request_timeout` with retries remaining → remain in `REQUESTING_RECORDS`
- on `request_timeout` with retries exhausted → `FAILED`
- on `disconnect` with checkpoint → `DISCONNECTED_RESUMABLE`
- on `disconnect` without checkpoint → `FAILED`

### Important rule

A peer must not request the same record indefinitely.  
Once a bounded retry limit is reached, the session fails or the record is marked unavailable according to implementation policy.

---

## 8. `RECEIVING_RECORDS`

### Meaning

One or more `record_reply` messages are being received, possibly fragmented.

### Entry actions

- initialize fragment reassembly buffers
- bind reassembly buffers to `session_id` and `message_id`
- start receive timeout

### Allowed events

- `fragment_received`
- `record_reply_complete`
- `fragment_timeout`
- `checksum_error`
- `decrypt_error`
- `disconnect`

### Transitions

- on complete record batch reassembled → `VALIDATING_RECORDS`
- on `fragment_timeout` with retries remaining → remain in `RECEIVING_RECORDS`
- on `fragment_timeout` with retries exhausted → `FAILED`
- on `checksum_error` → `FAILED`
- on `decrypt_error` → `FAILED`
- on `disconnect` with checkpoint → `DISCONNECTED_RESUMABLE`
- on `disconnect` without checkpoint → `FAILED`

### Reassembly rule

No partially received record batch may advance to validation until:

- all fragments are present
- fragment integrity checks pass
- authenticated decryption succeeds
- canonical decoding succeeds at envelope level

---

## 9. `VALIDATING_RECORDS`

### Meaning

The peer validates the received full handshake records before merge.

### Entry actions

For each received record:

1. decode canonical full record
2. check schema version
3. recompute canonical participant order
4. recompute `signing_payload_hash`
5. verify participant signatures
6. recompute `leaf_hash`
7. apply duplicate/conflict rules

### Allowed events

- `record_valid`
- `record_duplicate`
- `record_conflict`
- `record_invalid`
- `validation_batch_complete`
- `disconnect`

### Transitions

- on `validation_batch_complete` with at least one valid novel record → `APPLYING_RECORDS`
- on `validation_batch_complete` with only duplicates and no more outstanding requests → `FINALIZING`
- on `validation_batch_complete` with only duplicates and more missing requests pending → `REQUESTING_RECORDS`
- on `record_conflict` or unrecoverable `record_invalid` according to strict policy → `FAILED`
- on `disconnect` with checkpoint → `DISCONNECTED_RESUMABLE`
- on `disconnect` without checkpoint → `FAILED`

### Policy note

Implementations may choose between:

- **strict session failure** on the first invalid record, or
- **partial rejection** where invalid records are quarantined and the session continues

For a first implementation, **strict failure** is safer and easier to reason about.

---

## 10. `APPLYING_RECORDS`

### Meaning

Validated novel records are inserted into local durable storage and integrated into the local Merkle state.

### Entry actions

For each valid novel record:

1. write to durable store
2. update deterministic leaf ordering
3. recompute affected Merkle nodes
4. update local tree summary

### Allowed events

- `apply_success`
- `apply_failure`
- `apply_batch_complete`
- `disconnect`

### Transitions

- on `apply_batch_complete` with outstanding missing records → `REQUESTING_RECORDS`
- on `apply_batch_complete` with reconciliation still needed → `RECONCILING`
- on `apply_batch_complete` with no more work → `CHECKPOINTING`
- on `apply_failure` → `FAILED`
- on `disconnect` after durable commit and with checkpoint support → `DISCONNECTED_RESUMABLE`
- on `disconnect` before durable commit completeness is known → `FAILED`

### Atomicity recommendation

Apply records in a transaction or transaction-equivalent batch where possible.  
This helps ensure checkpointing reflects actual durable state.

---

## 11. `CHECKPOINTING`

### Meaning

The peer emits or persists resumable progress after a clean boundary.

### Entry actions

- compute checkpoint summary
- persist local resume state
- optionally send `sync_checkpoint`

### Allowed events

- `checkpoint_written`
- `checkpoint_send_complete`
- `disconnect`
- `checkpoint_failure`

### Transitions

- on successful checkpoint and no remaining work → `FINALIZING`
- on successful checkpoint and remaining work → `RECONCILING`
- on `checkpoint_failure` → `FAILED`
- on `disconnect` after checkpoint durability → `DISCONNECTED_RESUMABLE`
- on `disconnect` before checkpoint durability → `FAILED`

### Checkpoint boundary rule

A checkpoint must reflect a state in which:

- all previously applied records are durable
- local Merkle state is internally consistent
- the session can restart from a known message boundary

---

## 12. `FINALIZING`

### Meaning

The peer is determining whether all work is done, recomputing final local summaries, and exchanging completion messages.

### Entry actions

- recompute final tree summary
- verify outstanding work queues are empty
- send `sync_complete`
- start finalize timeout

### Allowed events

- `peer_sync_complete_received`
- `final_roots_consistent`
- `finalize_timeout`
- `disconnect`

### Transitions

- on local complete + peer complete + no inconsistencies → `COMPLETED`
- on `finalize_timeout` with local state complete but peer confirmation absent:
  - implementation may either fail strictly or treat as indeterminate
  - recommended reference behavior: `FAILED`
- on `disconnect` with resume checkpoint and incomplete peer confirmation → `DISCONNECTED_RESUMABLE`
- on detected inconsistency → `FAILED`

### Completion rule

The local peer may only enter `COMPLETED` when all are true:

1. no outstanding queries remain
2. no fragment reassembly is pending
3. no unvalidated records remain
4. no unapplied valid records remain
5. local Merkle state is internally consistent
6. peer completion has been observed or the implementation explicitly defines unilateral success semantics

Recommended reference behavior: require **mutual completion observation**.

---

## 13. `COMPLETED`

### Meaning

The session finished successfully.

### Entry actions

- persist terminal success result
- release transport resources
- clear temporary fragment buffers
- clear outstanding retry counters
- clear temporary reconciliation queues

### Allowed events

- none, except cleanup or metrics reporting

### Terminal

Yes.

---

## 14. `FAILED`

### Meaning

The session failed due to protocol, validation, timeout, transport, or local-apply error.

### Entry actions

- persist failure reason
- send `error` if transport still available and safe to do so
- release transport resources
- clear ephemeral session state
- retain diagnostics as appropriate

### Allowed events

- cleanup only

### Terminal

Yes.

### Failure examples

- unsupported ordering scheme
- invalid signature
- decryption failure
- fragment timeout exceeded
- apply transaction failure
- unrecoverable protocol mismatch

---

## 15. `ABORTED`

### Meaning

The session ended intentionally due to local cancellation, app shutdown policy, or user action.

### Entry actions

- cancel pending queries
- close transport if open
- persist aborted status if desired
- clear ephemeral session data

### Allowed events

- cleanup only

### Terminal

Yes.

---

## 16. `DISCONNECTED_RESUMABLE`

### Meaning

The transport disconnected after a durable checkpoint boundary, and the session may later resume.

### Entry actions

- persist resume token or local checkpoint state
- mark outstanding work as paused
- release BLE transport resources
- retain enough state to validate resumed session parameters

### Allowed events

- `resume_attempt`
- `resume_expired`
- `user_cancel`

### Transitions

- on valid `resume_attempt` with matching checkpoint and parameters → `NEGOTIATING` or `SECURE_CHANNEL_READY` depending on implementation
- on `resume_expired` → `FAILED`
- on `user_cancel` → `ABORTED`

### Resume validation rules

Resume may proceed only if all are true:

1. session parameters still match
2. checkpoint has not expired
3. ordering scheme matches
4. record schema version matches
5. the resumed peer confirms the same checkpoint boundary
6. no local conflicting writes invalidated the checkpoint

Otherwise the session must restart from scratch or fail.

---

## Transition summary table

| From | Event | To |
|---|---|---|
| `IDLE` | bootstrap complete | `CONNECTING` |
| `CONNECTING` | BLE connected | `NEGOTIATING` |
| `NEGOTIATING` | negotiated OK | `SECURE_CHANNEL_READY` |
| `SECURE_CHANNEL_READY` | root compare ready | `COMPARING_ROOTS` |
| `COMPARING_ROOTS` | roots equal | `FINALIZING` |
| `COMPARING_ROOTS` | roots differ | `RECONCILING` |
| `RECONCILING` | missing records identified | `REQUESTING_RECORDS` |
| `REQUESTING_RECORDS` | record reply received | `RECEIVING_RECORDS` |
| `RECEIVING_RECORDS` | batch reassembled | `VALIDATING_RECORDS` |
| `VALIDATING_RECORDS` | valid novel records exist | `APPLYING_RECORDS` |
| `APPLYING_RECORDS` | no more work in batch | `CHECKPOINTING` |
| `CHECKPOINTING` | checkpoint complete, more work | `RECONCILING` |
| `CHECKPOINTING` | checkpoint complete, no more work | `FINALIZING` |
| `FINALIZING` | mutual completion confirmed | `COMPLETED` |
| many states | disconnect with resume | `DISCONNECTED_RESUMABLE` |
| many states | timeout / invalid data / unrecoverable error | `FAILED` |
| many states | user cancel | `ABORTED` |

---

## Duplicate-message handling

The state machine must be idempotent in the face of duplicate messages.

### Rules

1. If a message with the same `session_id`, sender, and `message_id` is received again:
   - if payload bytes are identical, treat it as a duplicate and replay the prior response if needed
   - if payload bytes differ, fail the session

2. Acknowledgments may be replayed safely.

3. Already-applied records must not be re-applied.

This is critical when BLE retransmits or reconnect/resume causes ambiguity.

---

## Timeout model

Use separate timers for separate failure domains.

### Recommended timers

- **connect timeout**
- **negotiation timeout**
- **compare timeout**
- **query timeout**
- **fragment timeout**
- **finalize timeout**
- **resume expiry**

### Recommended principle

A timeout should move the session to:

- a retry path if retry budget remains
- otherwise `FAILED`

Timeout values should be configurable and tuned by real-device testing.

---

## Retry model

Retries should be bounded and phase-specific.

### Reference rules

- maintain a retry counter per outstanding request or fragment group
- reset counters when forward progress is made
- fail after bounded retries, for example 3 to 5 attempts

### Forward progress examples

- a new valid `subtree_reply` arrives
- a missing fragment arrives
- a checkpoint is durably written
- a valid record batch is applied

Do not reset retries merely because any packet was seen.

---

## Resume model

Resume should occur only at **checkpoint boundaries**.

### Recommended resume sequence

1. re-establish BLE connection
2. re-establish secure application session
3. exchange resume token or checkpoint summary
4. verify both peers agree on:
   - `session_id` or replacement-resume linkage
   - ordering scheme
   - schema version
   - last applied message boundary
   - checkpoint hash
5. continue from the first incomplete step after the checkpoint

### Resume denial cases

Resume must be rejected if:

- the checkpoint expired
- peer capabilities changed incompatibly
- local state changed incompatibly
- checkpoint hashes differ
- prior session state was already terminal

If resume is denied, the implementation may:

- restart full sync, or
- fail and wait for a new user-initiated session

For a first implementation, restarting full sync is acceptable.

---

## Strict vs tolerant validation policy

The state machine can be parameterized by validation strictness.

## Strict policy (recommended v1)

Any of the following immediately fail the session:

- invalid signature
- invalid canonical encoding
- conflicting duplicate UUID
- Merkle leaf hash mismatch
- unsupported schema version

Pros:

- simpler reasoning
- easier testing
- safer against inconsistent state

## Tolerant policy

A peer may quarantine some invalid records and continue.

Pros:

- more resilient to partial corruption

Cons:

- more complex state and diagnostics
- harder to reason about eventual convergence

Recommended reference baseline: **strict policy**.

---

## Commit semantics

A session should never expose a record as merged unless it is durably committed.

### Required rule

`APPLYING_RECORDS` must complete before `FINALIZING` may declare success.

### Strong recommendation

Use transaction boundaries such that:

- record store writes
- leaf-order index updates
- Merkle node updates
- checkpoint metadata updates

are committed together where practical.

If not possible, define a precise recovery procedure for partial apply failures.

---

## Suggested responder behavior

Although the same state set applies to both roles, a responder typically spends more time in:

- `NEGOTIATING`
- `RECONCILING`
- `RECEIVING_RECORDS` or responding to `REQUESTING_RECORDS`
- `FINALIZING`

A responder may also independently identify records it needs and request them within the same session if the implementation supports bidirectional reconciliation.

If a simpler v1 is desired, allow only the initiator to request and the responder to answer within a single session.  
Then let the opposite direction happen in a later session if needed.

---

## Minimal first-shipping state machine

A reduced implementation may collapse states as follows:

- `NEGOTIATING` + `SECURE_CHANNEL_READY`
- `REQUESTING_RECORDS` + `RECEIVING_RECORDS`
- `VALIDATING_RECORDS` + `APPLYING_RECORDS`
- omit explicit `CHECKPOINTING` if resume is not supported
- omit `DISCONNECTED_RESUMABLE` if resume is not supported

### Minimal state list

- `IDLE`
- `CONNECTING`
- `NEGOTIATING`
- `COMPARING_ROOTS`
- `RECONCILING`
- `TRANSFERRING_RECORDS`
- `FINALIZING`
- `COMPLETED`
- `FAILED`
- `ABORTED`

This is acceptable for a v1 without resume, provided validation-before-apply semantics are preserved.

---

## Reference pseudocode

```text
state = IDLE

on bootstrap_complete:
    state = CONNECTING

on ble_connected:
    state = NEGOTIATING
    send(sync_open)

on sync_accept and secure_channel_ready:
    state = COMPARING_ROOTS

if roots_equal:
    state = FINALIZING
else:
    state = RECONCILING

while state == RECONCILING:
    diff = reconcile_subtrees()
    if diff.missing_records:
        state = REQUESTING_RECORDS
    elif diff.no_more_work:
        state = FINALIZING

while state == REQUESTING_RECORDS:
    send(record_query)
    state = RECEIVING_RECORDS

on record_reply_complete:
    state = VALIDATING_RECORDS

if validation_success and novel_records_exist:
    state = APPLYING_RECORDS
elif validation_success and no_more_work:
    state = FINALIZING
else:
    state = FAILED

if apply_success:
    state = CHECKPOINTING
else:
    state = FAILED

if checkpoint_success and more_work:
    state = RECONCILING
elif checkpoint_success:
    state = FINALIZING

in FINALIZING:
    send(sync_complete)
    if peer_complete and local_consistent:
        state = COMPLETED
    else if timeout:
        state = FAILED
```

---

## Testing guidance

To validate implementations against this state machine, test at least these cases:

1. roots equal, no transfers needed
2. one differing subtree, one missing record
3. multiple missing records across multiple batches
4. duplicate record replies
5. duplicate message IDs with identical payload
6. duplicate message IDs with conflicting payload
7. disconnect during fragment transfer
8. disconnect after apply but before finalize
9. resume from valid checkpoint
10. resume with mismatched checkpoint
11. invalid signature in received record
12. conflict on same `handshake_uuid`
13. apply transaction failure
14. finalize timeout after local completion

These tests will catch most real implementation divergences.

---

## Summary

A good sync state machine should:

- separate transport establishment, negotiation, reconciliation, validation, apply, and finalize phases
- enforce validation before merge
- support idempotent duplicate handling
- use bounded retries and explicit timeouts
- only resume from clean checkpoint boundaries
- end in explicit terminal states

This gives you a practical implementation contract for the NFC → BLE Merkle synchronization architecture and makes cross-platform behavior much easier to keep consistent.
