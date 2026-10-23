import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";

const boundary = vi.hoisted(() => ({ openDatabaseAsync: vi.fn(), getItem: vi.fn(), setItem: vi.fn() }));
vi.mock("expo-sqlite", () => ({ openDatabaseAsync: boundary.openDatabaseAsync }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: boundary }));

afterEach(() => { vi.unstubAllGlobals(); vi.resetAllMocks(); });

describe("native preference storage atomic boundary", () => {
  it("allows only one insert or conditional update across two actual SQLite handles", async () => {
    const directory = mkdtempSync(join(tmpdir(), "starward-preferences-storage-"));
    const handles: DatabaseSync[] = [];
    boundary.openDatabaseAsync.mockImplementation(async () => {
      const database = new DatabaseSync(join(directory, "preferences.db"));
      handles.push(database);
      return {
        execAsync: async (sql: string) => database.exec(sql),
        getFirstAsync: async (sql: string, ...values: SQLInputValue[]) => database.prepare(sql).get(...values),
        runAsync: async (sql: string, ...values: SQLInputValue[]) => database.prepare(sql).run(...values),
        closeAsync: async () => database.close(),
      };
    });
    try {
      const { createPreferenceStorage } = await import("./preferences-storage");
      const first = await createPreferenceStorage();
      const second = await createPreferenceStorage();
      const inserts = await Promise.all([first.compareAndSwap("state", null, "initial-a"), second.compareAndSwap("state", null, "initial-b")]);
      expect(inserts.filter(Boolean)).toHaveLength(1);
      const expected = await first.read("state");
      const writes = await Promise.all([first.compareAndSwap("state", expected, "next-a"), second.compareAndSwap("state", expected, "next-b")]);
      expect(writes.filter(Boolean)).toHaveLength(1);
      expect(await second.read("state")).toBe(writes[0] ? "next-a" : "next-b");
      expect(await first.compareAndSwap("state", expected, "stale-overwrite")).toBe(false);
    } finally {
      for (const database of handles) database.close();
      const target = resolve(directory);
      if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith("starward-preferences-storage-")) throw new Error("unexpected_test_directory");
      rmSync(target, { recursive: true });
    }
  });
});

describe("web preference storage atomic boundary", () => {
  // These event stubs cover failure/acknowledgement handling only. Cross-client
  // atomicity and legacy import run in preferences-web-cas-probe.mjs against
  // actual browser IndexedDB; a simulated lock queue cannot establish them.
  function openingDatabase() {
    const database = { transaction: vi.fn(), close: vi.fn() };
    const request = { result: database, error: null as Error | null,
      onsuccess: () => {}, onerror: () => {}, onblocked: () => {} };
    vi.stubGlobal("indexedDB", { open: vi.fn(() => request) });
    return { database, request };
  }

  it("fails explicitly without IndexedDB, even when Web Locks are available", async () => {
    vi.stubGlobal("indexedDB", undefined);
    vi.stubGlobal("navigator", { locks: { request: vi.fn() } });
    const { createPreferenceStorage } = await import("./preferences-storage.web");
    await expect(createPreferenceStorage()).rejects.toThrow("preference_storage_indexeddb_unavailable");
    expect(boundary.getItem).not.toHaveBeenCalled();
    expect(boundary.setItem).not.toHaveBeenCalled();
  });

  it("does not fall back to localStorage when opening the database fails", async () => {
    const { request } = openingDatabase();
    const { createPreferenceStorage } = await import("./preferences-storage.web");
    const opening = createPreferenceStorage();
    request.error = new Error("database_access_denied");
    request.onerror();
    await expect(opening).rejects.toThrow("preference_storage_indexeddb_open_failed");
    expect(boundary.getItem).not.toHaveBeenCalled();
    expect(boundary.setItem).not.toHaveBeenCalled();
  });

  it("closes a delayed connection after rejecting a blocked open", async () => {
    const { request, database } = openingDatabase();
    const { createPreferenceStorage } = await import("./preferences-storage.web");
    const opening = createPreferenceStorage();
    request.onblocked();
    await expect(opening).rejects.toThrow("preference_storage_indexeddb_open_blocked");
    request.onsuccess();
    expect(database.close).toHaveBeenCalledOnce();
    expect(database.transaction).not.toHaveBeenCalled();
  });

  it.each(["complete", "abort"] as const)("acknowledges a put only after transaction %s", async outcome => {
    const { request, database } = openingDatabase();
    function pendingTransaction() {
      const getRequest = { result: { value: "before" }, onsuccess: () => {} };
      const store = { get: vi.fn(() => getRequest), put: vi.fn() };
      return { getRequest, store, objectStore: () => store, oncomplete: () => {}, onabort: () => {}, abort: vi.fn(), error: null };
    }
    const read = pendingTransaction();
    const write = pendingTransaction();
    database.transaction.mockReturnValueOnce(read).mockReturnValueOnce(write);
    const { createPreferenceStorage } = await import("./preferences-storage.web");
    const opening = createPreferenceStorage();
    request.onsuccess();
    const storage = await opening;
    let settled = false;
    const saving = storage.compareAndSwap("state", "before", "after");
    const observed = saving.then(value => { settled = true; return value; }, error => { settled = true; throw error; });
    read.getRequest.onsuccess();
    read.oncomplete();
    await vi.waitFor(() => expect(database.transaction).toHaveBeenCalledTimes(2));
    write.getRequest.onsuccess();
    expect(write.store.put).toHaveBeenCalledWith({ value: "after" }, "state");
    await Promise.resolve();
    expect(settled).toBe(false);
    if (outcome === "complete") {
      write.oncomplete();
      await expect(observed).resolves.toBe(true);
    } else {
      write.onabort();
      await expect(observed).rejects.toThrow("preference_storage_indexeddb_transaction_aborted");
    }
    expect(boundary.getItem).not.toHaveBeenCalled();
    expect(boundary.setItem).not.toHaveBeenCalled();
    await storage.close?.();
    expect(database.close).toHaveBeenCalledOnce();
  });
});
