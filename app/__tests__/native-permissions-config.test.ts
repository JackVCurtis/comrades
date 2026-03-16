import fs from 'node:fs';
import path from 'node:path';

type ExpoConfig = {
  expo?: {
    ios?: {
      infoPlist?: Record<string, unknown>;
    };
    android?: {
      permissions?: string[];
    };
    plugins?: unknown[];
  };
};

function loadExpoConfig(): ExpoConfig {
  const appJsonPath = path.resolve(__dirname, '../../app.json');
  const source = fs.readFileSync(appJsonPath, 'utf8');
  return JSON.parse(source) as ExpoConfig;
}

describe('native permission configuration', () => {
  it('declares iOS privacy usage descriptions for Bluetooth and NFC access', () => {
    const config = loadExpoConfig();
    const infoPlist = config.expo?.ios?.infoPlist;

    expect(infoPlist).toEqual(
      expect.objectContaining({
        NSBluetoothAlwaysUsageDescription: expect.any(String),
        NSBluetoothPeripheralUsageDescription: expect.any(String),
        NFCReaderUsageDescription: expect.any(String),
      })
    );
  });

  it('declares Android runtime permissions needed by BLE and NFC handshakes', () => {
    const config = loadExpoConfig();
    const permissions = config.expo?.android?.permissions ?? [];

    expect(permissions).toEqual(
      expect.arrayContaining([
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.BLUETOOTH_CONNECT',
        'android.permission.BLUETOOTH_ADVERTISE',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.NFC',
      ])
    );
  });

  it('configures secure storage plugin for biometric prompts', () => {
    const config = loadExpoConfig();
    const plugins = config.expo?.plugins ?? [];
    const secureStorePlugin = plugins.find(
      (entry) => Array.isArray(entry) && entry[0] === 'expo-secure-store'
    ) as [string, { faceIDPermission?: string }] | undefined;

    expect(secureStorePlugin).toBeDefined();
    expect(secureStorePlugin?.[1].faceIDPermission).toEqual(expect.any(String));
  });
});
