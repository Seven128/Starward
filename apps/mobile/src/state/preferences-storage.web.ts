import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PreferenceRuntimeStorage } from "@starward/domain/preferences/runtime";

const WEB_STATE_KEY = "starward-preferences-runtime-web-v1";
const STORE_NAME = "preference_runtime_state";
interface StoredValue { value: string | null }

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB?.open) throw new Error("preference_storage_indexeddb_unavailable");
    const request = globalThis.indexedDB.open(WEB_STATE_KEY, 1);
    let abandoned = false;
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onblocked = () => {
      abandoned = true;
      reject(new Error("preference_storage_indexeddb_open_blocked"));
    };
    request.onerror = () => reject(new Error("preference_storage_indexeddb_open_failed", { cause: request.error }));
    request.onsuccess = () => {
      const database = request.result;
      // A blocked open may succeed later; its rejected caller cannot own it.
      if (abandoned) { database.close(); return; }
      database.onversionchange = () => database.close();
      resolve(database);
    };
  });
}

export async function createPreferenceStorage(): Promise<PreferenceRuntimeStorage> {
  const database = await openDatabase();

  function withRow<T>(key: string, mode: IDBTransactionMode, operation: (row: StoredValue | undefined, store: IDBObjectStore) => T): Promise<T> {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode, { durability: "strict" });
      let result: T;
      let failure: unknown;
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(failure ?? new Error("preference_storage_indexeddb_transaction_aborted", { cause: transaction.error }));
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => {
        try {
          const row: unknown = request.result;
          if (row !== undefined && (!row || typeof row !== "object" || !("value" in row)
            || row.value !== null && typeof row.value !== "string")) throw new Error("preference_storage_indexeddb_record_invalid");
          // No asynchronous work belongs in this callback: get/compare/put must
          // share the active transaction. A successful request is not a commit.
          result = operation(row as StoredValue | undefined, store);
        } catch (error) {
          failure = error;
          transaction.abort();
        }
      };
    });
  }

  async function read(key: string): Promise<string | null> {
    const existing = await withRow(key, "readonly", row => row);
    if (existing !== undefined) return existing.value;
    // Import original bytes once per domain key, including legacy archive keys.
    // Keep localStorage untouched as recovery material. Read it before opening
    // the write transaction, then recheck inside the transaction across tabs.
    const candidate = await AsyncStorage.getItem(`${WEB_STATE_KEY}:${key}`);
    return withRow(key, "readwrite", (row, store) => {
      if (row !== undefined) return row.value;
      store.put({ value: candidate } satisfies StoredValue, key);
      // An explicit null row marks initialization; an empty state must never
      // revive an old localStorage value on a later read or browser reload.
      return candidate;
    });
  }

  return {
    kind: "web-key-value",
    read,
    async compareAndSwap(key, expected, value) {
      await read(key);
      return withRow(key, "readwrite", (row, store) => {
        if (row === undefined) throw new Error("preference_storage_indexeddb_record_missing");
        if (row.value !== expected) return false;
        store.put({ value } satisfies StoredValue, key);
        return true;
      });
    },
    close: () => database.close(),
  };
}
