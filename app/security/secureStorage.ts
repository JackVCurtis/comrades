import SettingsStorage from 'expo-settings-storage';

export type SecureStoreAdapter = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
};

export type SecureReadResult = {
  status: 'ok' | 'invalidated';
  value: string | null;
  message?: string;
};

export function createInMemorySecureStoreAdapter(initialData: Record<string, string> = {}): SecureStoreAdapter {
  const store = new Map<string, string>(Object.entries(initialData));

  return {
    async getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    async setItem(key: string, value: string) {
      store.set(key, value);
    },
    async deleteItem(key: string) {
      store.delete(key);
    },
  };
}

export function createExpoSecureStoreAdapter(): SecureStoreAdapter {
  return {
    async getItem(key: string) {
      return SettingsStorage.getItem(key)
    },
    async setItem(key: string, value: string) {
      await SettingsStorage.setItem(key, value);
    },
    async deleteItem(key: string) {
      await SettingsStorage.deleteItem(key);
    },
  };
}

function isInvalidatedAuthError(message: string): boolean {
  return (
    message.includes('invalidated') ||
    message.includes('key permanently invalidated') ||
    message.includes('keystore operation failed') ||
    message.includes('authentication') ||
    message.includes('not authenticated')
  );
}


export function createSecureValueStore(options: { adapter?: SecureStoreAdapter } = {}) {
  const adapter = options.adapter ?? createExpoSecureStoreAdapter();

  return {
    async readValue(key: string): Promise<SecureReadResult> {
      try {
        const value = await adapter.getItem(key);
        return { status: 'ok', value };
      } catch (error) {
        const message = (error instanceof Error ? error.message : String(error)).toLowerCase();

        if (isInvalidatedAuthError(message)) {
          await adapter.deleteItem(key);
          return {
            status: 'invalidated',
            value: null,
            message: 'Protected secure storage was invalidated. Re-run onboarding to restore this data.',
          };
        }

        throw error;
      }
    },
  };
}
