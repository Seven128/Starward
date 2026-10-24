import type { AdminCommandInput, AdminSession } from "./admin-session";

/** Only sealed values enter storage. Credential, command and receipts stay out
 * of storage keys, errors and diagnostic output. */
export interface AdminJournalStorage {
  withRow<T>(key: string, operation: (value: string | null) => { value?: string | null; result: T }): Promise<T>;
  close(): void;
}
export interface JournalCommand {
  input: AdminCommandInput;
  idempotencyKey: string;
  wireBody: string;
}
export interface JournalEntry extends JournalCommand {
  entryId: string;
  receipt: Record<string, unknown> | null;
  cacheFailureObserved: boolean;
}
export interface BoundAdminJournal {
  load(): Promise<JournalEntry | null>;
  reserve(command: JournalCommand): Promise<JournalEntry>;
  committed(entryId: string, receipt: Record<string, unknown>, cacheFailed: boolean): Promise<void>;
  clear(entryId: string, cacheComplete: boolean): Promise<boolean>;
}
export interface AdminCommandJournal {
  bind(session: AdminSession): Promise<BoundAdminJournal>;
  close(): void;
}

const DATABASE = "starward-admin-commands-v1";
const STORE = "commands";
const SALT_KEY = "scope-salt-v1";
const failure = () => new Error("本机操作恢复记录不可读写，未自动重发操作；请保留当前窗口并重新连接核对。");

export function createAdminIndexedDbStorage(factory: IDBFactory | undefined = globalThis.indexedDB): AdminJournalStorage {
  let closed = false;
  let opened: Promise<IDBDatabase> | undefined;
  const database = () => {
    if (opened) return opened;
    const attempt = new Promise<IDBDatabase>((resolve, reject) => {
      if (!factory?.open || closed) { reject(failure()); return; }
      const request = factory.open(DATABASE, 1);
      let abandoned = false;
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onblocked = () => { abandoned = true; reject(failure()); };
      request.onerror = () => reject(failure());
      request.onsuccess = () => {
        const result = request.result;
        if (abandoned || closed) { result.close(); reject(failure()); return; }
        result.onversionchange = () => { closed = true; result.close(); };
        resolve(result);
      };
    });
    opened = attempt;
    // A rejected/blocked connection must not poison an explicit reconnect.
    void attempt.catch(() => { if (opened === attempt) opened = undefined; });
    return attempt;
  };
  return {
    async withRow<T>(key: string, operation: (value: string | null) => { value?: string | null; result: T }) {
      const connection = await database();
      if (closed) throw failure();
      return new Promise<T>((resolve, reject) => {
        // Compare and mutation are synchronous inside one readwrite transaction.
        // Crypto work is completed before entering it. A put success is not commit.
        const transaction = connection.transaction(STORE, "readwrite", { durability: "strict" });
        let result: T;
        let operationError: unknown;
        transaction.oncomplete = () => resolve(result);
        transaction.onabort = () => reject(operationError ?? failure());
        transaction.onerror = () => { /* onabort owns rejection */ };
        const store = transaction.objectStore(STORE);
        const request = store.get(key);
        request.onsuccess = () => {
          try {
            if (request.result !== undefined && typeof request.result !== "string") throw failure();
            const next = operation(request.result ?? null);
            result = next.result;
            if (next.value === null) store.delete(key);
            else if (next.value !== undefined) store.put(next.value, key);
          } catch (error) { operationError = error; transaction.abort(); }
        };
      });
    },
    close() { closed = true; void opened?.then(connection => connection.close(), () => {}); },
  };
}

interface Sealed { iv: string; ciphertext: string }
interface StoredEntry {
  schema: 1;
  entryId: string;
  command: Sealed;
  receipt: Sealed | null;
  cacheFailureObserved: boolean;
}
const encode = (value: Uint8Array) => btoa(Array.from(value, byte => String.fromCharCode(byte)).join(""));
const decode = (value: string) => Uint8Array.from(atob(value), character => character.charCodeAt(0));
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
function storedEntry(raw: string): StoredEntry {
  try {
    const value: unknown = JSON.parse(raw);
    const sealed = (item: unknown) => isRecord(item) && typeof item.iv === "string" && typeof item.ciphertext === "string";
    if (!isRecord(value) || value.schema !== 1 || typeof value.entryId !== "string" || !value.entryId || !sealed(value.command)
      || value.receipt !== null && !sealed(value.receipt) || typeof value.cacheFailureObserved !== "boolean") throw failure();
    return value as unknown as StoredEntry;
  } catch { throw failure(); }
}

/** The origin's random salt and HKDF context separate this journal from the
 * server's credential digest. Only the same credential + verified actor + API
 * audience can find/decrypt it. It grants no server authority. */
export function createAdminCommandJournal(options: {
  origin: string;
  audience: string;
  storage?: AdminJournalStorage;
  crypto?: Crypto;
}): AdminCommandJournal {
  const storage = options.storage ?? createAdminIndexedDbStorage();
  const cryptography = options.crypto ?? globalThis.crypto;
  let closed = false;
  return {
    async bind(session) {
      if (closed || !cryptography?.subtle || !session.actor || !session.token) throw failure();
      const saltCandidate = encode(cryptography.getRandomValues(new Uint8Array(32)));
      const salt = await storage.withRow(SALT_KEY, existing => {
        if (existing !== null) {
          if (decode(existing).length !== 32) throw failure();
          return { result: existing };
        }
        return { value: saltCandidate, result: saltCandidate };
      });
      const context = JSON.stringify(["starward-admin-command-v1", options.origin, options.audience, session.actor]);
      const material = await cryptography.subtle.importKey("raw", new TextEncoder().encode(session.token), "HKDF", false, ["deriveBits"]);
      const bits = new Uint8Array(await cryptography.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: decode(salt), info: new TextEncoder().encode(context) }, material, 512));
      const scope = encode(bits.slice(0, 32));
      const key = await cryptography.subtle.importKey("raw", bits.slice(32), "AES-GCM", false, ["encrypt", "decrypt"]);
      bits.fill(0);
      const aad = (entryId: string, kind: string) => new TextEncoder().encode(JSON.stringify([scope, entryId, kind]));
      const seal = async (entryId: string, kind: string, value: unknown): Promise<Sealed> => {
        const iv = cryptography.getRandomValues(new Uint8Array(12));
        const ciphertext = await cryptography.subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad(entryId, kind) }, key, new TextEncoder().encode(JSON.stringify(value)));
        return { iv: encode(iv), ciphertext: encode(new Uint8Array(ciphertext)) };
      };
      const open = async (entryId: string, kind: string, value: Sealed): Promise<unknown> => {
        try {
          return JSON.parse(new TextDecoder().decode(await cryptography.subtle.decrypt({ name: "AES-GCM", iv: decode(value.iv), additionalData: aad(entryId, kind) }, key, decode(value.ciphertext))));
        } catch { throw failure(); }
      };
      const load = async () => {
        const raw = await storage.withRow(scope, existing => ({ result: existing }));
        if (raw === null) return null;
        const entry = storedEntry(raw);
        const command = await open(entry.entryId, "command", entry.command);
        const receipt = entry.receipt ? await open(entry.entryId, "receipt", entry.receipt) : null;
        if (!isRecord(command) || receipt !== null && !isRecord(receipt)) throw failure();
        return { ...command, entryId: entry.entryId, receipt, cacheFailureObserved: entry.cacheFailureObserved } as JournalEntry;
      };
      return {
        load,
        async reserve(command) {
          const entryId = cryptography.randomUUID();
          const sealed = await seal(entryId, "command", command);
          const entry: StoredEntry = { schema: 1, entryId, command: sealed, receipt: null, cacheFailureObserved: false };
          await storage.withRow(scope, existing => {
            if (existing !== null) throw new Error("请先核对或重试上一笔未确认操作；另一个窗口也可能已提交操作。");
            return { value: JSON.stringify(entry), result: undefined };
          });
          return { ...command, entryId, receipt: null, cacheFailureObserved: false };
        },
        async committed(entryId, receipt, cacheFailed) {
          const sealed = await seal(entryId, "receipt", receipt);
          await storage.withRow(scope, existing => {
            if (existing === null) return { result: undefined }; // another window already completed it
            const entry = storedEntry(existing);
            if (entry.entryId !== entryId) throw new Error("本机操作记录已由另一窗口推进，请重新连接核对。");
            return { value: JSON.stringify({ ...entry, receipt: sealed, cacheFailureObserved: entry.cacheFailureObserved || cacheFailed }), result: undefined };
          });
        },
        async clear(entryId, cacheComplete) {
          return storage.withRow(scope, existing => {
            if (existing === null) return { result: true };
            const entry = storedEntry(existing);
            if (entry.entryId !== entryId) return { result: false };
            // Another window may have recorded the failure after this attempt's
            // last read. Check its cumulative fact in the same clear transaction.
            if (entry.cacheFailureObserved && !cacheComplete) throw new Error("公共缓存刷新尚未确认，原操作仍保留；请重试原操作完成核对。");
            return { value: null, result: true };
          });
        },
      };
    },
    close() { closed = true; storage.close(); },
  };
}
