# Manual NFC → BLE Session Test (Bootstrap Slice)

This guide covers the minimal manual transport test added in this task.

## Scope

Implemented scope is limited to:

1. generate signed NFC bootstrap payload
2. read/validate bootstrap payload
3. bind BLE discovery to bootstrap service UUID
4. run minimal session confirmation bound to `session_uuid`

Not implemented here: Merkle root compare, subtree reconciliation, record transfer, commit, resume checkpoints.

## Prerequisites

- Android hardware recommended for NFC testing.
- App built with React Native + Expo project configuration.
- `react-native-nfc-manager` and `react-native-ble-plx` must be included in the native runtime through Expo config plugins and a native build.
- Use a Dev Client or standalone native build; **Expo Go is not sufficient** for full NFC/BLE transport testing.
- If plugin config/permissions changed, run `npx expo prebuild` and rebuild before re-running this manual test.

## Developer test flow

1. Open **Handshake** tab and scroll to **Developer NFC → BLE bootstrap test** panel.
2. On writer device, press **Writer: Generate bootstrap payload**.
3. Copy or transfer the payload JSON to reader device (or scan via NFC integration in native builds).
4. Paste payload JSON in reader panel.
5. Press **Reader: Validate + connect + authenticate**.
6. Confirm final status is `session_authenticated`.

## Expected success path

`idle` → `nfc_preparing` → `nfc_ready` → `nfc_received` → `bootstrap_validated` → `ble_scanning` → `ble_connecting` → `ble_connected` → `session_authenticating` → `session_authenticated`

## Expected failure paths

- Tampered payload field => bootstrap validation fails before BLE auth.
- Service UUID mismatch => `failed` with `service_uuid_mismatch`.
- Session UUID mismatch => `failed` with `session_uuid_mismatch`.
- Session proof mismatch => `failed` with `session_confirmation_mismatch`.

## Platform/library caveats

- Android 12+ requires runtime grants for `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, and `BLUETOOTH_ADVERTISE`; location permission may still be required on older Android versions.
- Expo Go may not expose all native NFC/BLE capabilities.
- iOS NFC role is more limited than Android for generic peer bootstrap exchange.
- This slice provides deterministic protocol checks and developer diagnostics first; full transport productionization is a later step.
