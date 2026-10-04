import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

/** Shared publication content; each producer owns its physical meaning and
 * removes only its own transport envelope before hashing. */
export const OPTICAL_IMAGE_LEVELS = ["OVERVIEW", "MEDIUM", "DETAIL"] as const;
export type OpticalImageLevel = typeof OPTICAL_IMAGE_LEVELS[number];
export interface OpticalContentIdentity { bytes: number; sha256: string }
export type OpticalRecipeValue = null | boolean | number | string | OpticalRecipeValue[] |
  { [key: string]: OpticalRecipeValue };

export const opticalContentHashPattern = /^[a-f0-9]{64}$/u;
export const isOpticalContentIdentity = (value: unknown): value is OpticalContentIdentity => {
  const row = value as OpticalContentIdentity | null;
  return !!row && Number.isSafeInteger(row.bytes) && row.bytes > 0 &&
    typeof row.sha256 === "string" && opticalContentHashPattern.test(row.sha256);
};
export const isOpticalPublicationText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && !/[\u0000-\u001f]/u.test(value);

/** Ordinary HTTPS references, usable without a URL global in WEAPP. This does
 * not grant publication rights or authorize runtime source acquisition. */
export function isOpticalHttpsLink(value: unknown): value is string {
  if (typeof value !== "string" || !isOpticalPublicationText(value) || !/^https:\/\/[^\s\\]+$/u.test(value)) return false;
  const authority = value.slice(8).split(/[/?#]/u)[0]!;
  return /^[a-z\d](?:[a-z\d.-]*[a-z\d])?$/iu.test(authority) && !authority.includes("..");
}

export function isOpticalRecipeValue(value: unknown, depth = 0): value is OpticalRecipeValue {
  if (depth > 8) return false;
  if (value === null || typeof value === "boolean" || typeof value === "string") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(v => isOpticalRecipeValue(v, depth + 1));
  return !!value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype &&
    Object.entries(value).every(([key, v]) => isOpticalPublicationText(key) && isOpticalRecipeValue(v, depth + 1));
}

function canonical(value: OpticalRecipeValue): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort()
    .map(key => `${JSON.stringify(key)}:${canonical(value[key]!)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function opticalPublicationContentHash(value: unknown): string {
  if (!isOpticalRecipeValue(value)) throw new Error("optical_publication_json_invalid");
  return bytesToHex(sha256(utf8ToBytes(canonical(value))));
}
