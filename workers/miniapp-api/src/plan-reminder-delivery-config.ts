import type pg from "pg";
import type { MiniappRuntimeConfig } from "./runtime-config.ts";

export type ReminderFieldSource = "REMINDER_TITLE" | "SPOT_NAME" | "DEPARTURE_LOCAL_TIME";
export interface ReminderDeliverySettings {
  enabled: boolean;
  fields: Readonly<Record<string, ReminderFieldSource>> | null;
  maxLatenessMs: number | null;
  miniprogramState: "developer" | "trial" | "formal" | null;
}

/** This is an operator-supplied mapping of the actually approved template,
 * not a guessed template. Unsupported types remain unavailable. */
export function parseReminderFields(raw: string): Readonly<Record<string, ReminderFieldSource>> {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("wechat_reminder_fields_invalid"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("wechat_reminder_fields_invalid");
  const entries = Object.entries(value);
  if (entries.length < 2 || entries.length > 20 || !entries.every(([key, source]) =>
    (/^thing[1-9][0-9]*$/u.test(key) && (source === "REMINDER_TITLE" || source === "SPOT_NAME"))
    || (/^time[1-9][0-9]*$/u.test(key) && source === "DEPARTURE_LOCAL_TIME"))
    || !entries.some(([, source]) => source === "REMINDER_TITLE")
    || !entries.some(([, source]) => source === "DEPARTURE_LOCAL_TIME")) throw new Error("wechat_reminder_fields_invalid");
  return Object.freeze(Object.fromEntries(entries)) as Readonly<Record<string, ReminderFieldSource>>;
}

export function configuredReminderDelivery(config: MiniappRuntimeConfig) {
  const w = config.wechat;
  const settings = w.reminderDelivery;
  if (config.storageMode !== "POSTGRES" || config.authMode !== "WECHAT" || !settings?.enabled
    || !w.appId || !w.appSecret || !w.deliveryIdentityKey || !w.subscriptionTemplateId
    || !/^[A-Za-z0-9_-]{1,128}$/u.test(w.appId) || !/^[A-Za-z0-9_-]{1,128}$/u.test(w.subscriptionTemplateId)
    || !/^[a-fA-F0-9]{64}$/u.test(w.deliveryIdentityKey)
    || !Number.isInteger(settings.maxLatenessMs) || settings.maxLatenessMs! < 300_000 || settings.maxLatenessMs! > 3_600_000
    || !settings.miniprogramState || !['developer','trial','formal'].includes(settings.miniprogramState)
    || !settings.fields) return null;
  let fields: Readonly<Record<string, ReminderFieldSource>>;
  try { fields = parseReminderFields(JSON.stringify(settings.fields)); } catch { return null; }
  return Object.freeze({ appId: w.appId, templateId: w.subscriptionTemplateId, appSecret: w.appSecret,
    identityKey: w.deliveryIdentityKey, fields, maxLatenessMs: settings.maxLatenessMs!,
    miniprogramState: settings.miniprogramState });
}

export async function reminderDeliveryEnabled(pool: pg.Pool): Promise<boolean> {
  const flag = await pool.query<{ payload: { value?: unknown } }>(
    "SELECT payload FROM feature_flags WHERE flag_key='NOTIFICATION_ENABLED'");
  return flag.rows[0]?.payload?.value === true;
}
