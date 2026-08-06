/**
 * StorageAdapter interface for Student OS Offline Architecture.
 *
 * Business modules interact exclusively through this storage abstraction layer,
 * keeping business logic decoupled from underlying client database providers (IndexedDB, Wasm SQLite, etc.).
 */
export interface StorageAdapter {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
}
