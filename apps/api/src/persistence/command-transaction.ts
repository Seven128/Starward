import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
export const commandDigest = (command: unknown) => createHash("sha256").update(canonical(command)).digest("hex");

/** Node storage transaction only. Business tables, ownership and revisions stay with their modules. */
export function commitWithReceipt<T>(database: DatabaseSync, input: {
  receiptTable: string; actorId: string; key: string; digest: string;
  conflict(): Error;
}, effect: () => T): { value: T; replayed: boolean } {
  // The identifier comes from repository constants, never request input.
  if (!/^[a-z_]+$/u.test(input.receiptTable)) throw new Error("invalid_receipt_table");
  database.exec("BEGIN IMMEDIATE");
  try {
    const receipt = database.prepare(`SELECT input_digest, body FROM ${input.receiptTable} WHERE actor_id = ? AND command_key = ?`).get(input.actorId, input.key) as { input_digest: string; body: string } | undefined;
    if (receipt) {
      if (receipt.input_digest !== input.digest) throw input.conflict();
      const value = JSON.parse(receipt.body) as T;
      database.exec("COMMIT");
      return { value, replayed: true };
    }
    const value = effect();
    database.prepare(`INSERT INTO ${input.receiptTable}(actor_id, command_key, input_digest, body) VALUES (?, ?, ?, ?)`).run(input.actorId, input.key, input.digest, JSON.stringify(value));
    database.exec("COMMIT");
    return { value, replayed: false };
  } catch (error) {
    try { database.exec("ROLLBACK"); } catch { /* Preserve the original/unknown commit failure. */ }
    throw error;
  }
}
