import type { NfcBootstrapV1 } from '@/modules/protocol/transport';

export interface ProximityBleDevice {
  id: string;
  name?: string | null;
}

export interface ProximityNfcPort {
  writeBootstrapPayload(payload: NfcBootstrapV1): Promise<void>;
  readBootstrapPayload(): Promise<NfcBootstrapV1 | null>;
  cancel(): Promise<void>;
  cleanup(): Promise<void>;
}

export interface ProximityBlePort {
  getLocalServiceUuid(): Promise<string>;
  startAdvertising(serviceUuid: string): Promise<void>;
  stopAdvertising(): Promise<void>;
  scanForService(serviceUuid: string, timeoutMs: number): Promise<ProximityBleDevice | null>;
  connect(deviceId: string): Promise<ProximityBleDevice>;
  exchangeContactInfo(contactInfo: string, serviceUuid: string, sessionUuid: string): Promise<string>;
  disconnect(deviceId?: string): Promise<void>;
  cleanup(): Promise<void>;
}
