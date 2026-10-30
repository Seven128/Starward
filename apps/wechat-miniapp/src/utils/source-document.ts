import { uniqueSourceRecords, type SourceSummary } from "@starward/miniapp-contracts";
import { isProductSource, SOURCE_KIND_LABEL } from "./source-presentation";
import type { ForecastInterval } from "../components/forecast-coverage";
import { cloudInstant } from "@starward/miniapp-contracts";

/** Reading data only. Native navigation never carries React nodes or query closures. */
export type SourceSection =
  | { kind: "text"; title?: string; paragraphs: readonly string[] }
  | { kind: "facts"; title?: string; items: readonly { label: string; value: string }[] }
  | { kind: "links"; title?: string; items: readonly { label: string; url: string; download?: boolean }[] }
  | { kind: "forecast"; starts: readonly string[]; cloudIntervals?: readonly ForecastInterval[]; timezone: string; scope?: "spot" | "map" | "air"; stale?: boolean };

export interface SourceDocument {
  title: string;
  subtitle?: string;
  sources: readonly SourceSummary[];
  sections?: readonly SourceSection[];
}

export const SOURCE_READING_ROUTE = "/spot/data-source/index?reading=1";
export const SOURCE_READING_EVENT = "sourceReading";

export interface SourceReadingIdentity {
  accountOwnerId: string | null;
  mapResetVersion: number;
  selectedSpotId: string | null;
  context: string;
}
export interface SourceReadingEnvelope { document: SourceDocument; identity: SourceReadingIdentity }

export function sourceReadingIdentity(state: {
  accountOwnerId: string | null; mapResetVersion: number; selectedSpotId: string | null;
  observationContext: { contextId: string; revision: number; contextFingerprint: string } | null;
}): SourceReadingIdentity {
  const context = state.observationContext;
  return { accountOwnerId: state.accountOwnerId, mapResetVersion: state.mapResetVersion,
    selectedSpotId: state.selectedSpotId,
    context: context ? JSON.stringify([context.contextId, context.revision, context.contextFingerprint]) : "" };
}

export function sourceReadingIdentityMatches(a: SourceReadingIdentity, b: SourceReadingIdentity) {
  return a.accountOwnerId === b.accountOwnerId && a.mapResetVersion === b.mapResetVersion &&
    a.selectedSpotId === b.selectedSpotId && a.context === b.context;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === "string");
const optionalString = (value: unknown) => value === undefined || typeof value === "string";
function source(value: unknown): value is SourceSummary {
  if (!record(value) || typeof value.kind !== "string" || !Object.hasOwn(SOURCE_KIND_LABEL, value.kind)) return false;
  if (!["id", "provider", "title", "sourceUrl", "license", "licenseUrl", "precision"].every(key => typeof value[key] === "string") ||
    !["publishedAt", "retrievedAt", "validFrom", "validTo"].every(key => value[key] === null || typeof value[key] === "string") ||
    !strings(value.limitations) || !(value.confidence === null || typeof value.confidence === "number" && Number.isFinite(value.confidence)) ||
    !["FRESH", "STALE_USABLE", "EXPIRED", "PARTIAL", "UNAVAILABLE", "ESTIMATED", "SAMPLE_DATA"].includes(String(value.state))) return false;
  const attribution = value.attribution;
  return attribution === undefined || record(attribution) && typeof attribution.name === "string" &&
    typeof attribution.url === "string" && strings(attribution.statements);
}
function section(value: unknown): value is SourceSection {
  if (!record(value) || !optionalString(value.title)) return false;
  if (value.kind === "text") return strings(value.paragraphs);
  if (value.kind === "forecast") return strings(value.starts) && typeof value.timezone === "string" &&
    (value.cloudIntervals === undefined || Array.isArray(value.cloudIntervals) && value.cloudIntervals.every(interval => record(interval) &&
      Boolean(cloudInstant(interval.start)) && Boolean(cloudInstant(interval.end)) && Date.parse(interval.end as string) >= Date.parse(interval.start as string))) &&
    (value.scope === undefined || ["spot", "map", "air"].includes(String(value.scope))) &&
    (value.stale === undefined || typeof value.stale === "boolean");
  if (value.kind !== "facts" && value.kind !== "links" || !Array.isArray(value.items)) return false;
  return value.items.every(item => record(item) && typeof item.label === "string" &&
    (value.kind === "facts" ? typeof item.value === "string" : typeof item.url === "string" &&
      (item.download === undefined || typeof item.download === "boolean")));
}

function copySource(value: SourceSummary): SourceSummary {
  return { id: value.id, kind: value.kind, provider: value.provider, title: value.title,
    sourceUrl: value.sourceUrl, license: value.license, licenseUrl: value.licenseUrl,
    publishedAt: value.publishedAt, retrievedAt: value.retrievedAt, validFrom: value.validFrom, validTo: value.validTo,
    state: value.state, confidence: value.confidence, precision: value.precision, limitations: [...value.limitations],
    ...(value.attribution ? { attribution: { name: value.attribution.name, url: value.attribution.url, statements: [...value.attribution.statements] } } : {}) };
}
function copySection(value: SourceSection): SourceSection {
  const title = "title" in value && value.title !== undefined ? { title: value.title } : {};
  if (value.kind === "text") return { kind: value.kind, ...title, paragraphs: [...value.paragraphs] };
  if (value.kind === "facts") return { kind: value.kind, ...title, items: value.items.map(item => ({ label: item.label, value: item.value })) };
  if (value.kind === "links") return { kind: value.kind, ...title, items: value.items.map(item => ({ label: item.label, url: item.url,
    ...(item.download === undefined ? {} : { download: item.download }) })) };
  return { kind: value.kind, starts: [...value.starts], timezone: value.timezone,
    ...(value.cloudIntervals === undefined ? {} : { cloudIntervals: value.cloudIntervals.map(interval => ({ start: interval.start, end: interval.end })) }),
    ...(value.scope === undefined ? {} : { scope: value.scope }), ...(value.stale === undefined ? {} : { stale: value.stale }) };
}

/** A native page can also be entered without an opener; reject that as unavailable. */
export function readSourceReadingEnvelope(value: unknown): SourceReadingEnvelope | null {
  if (!record(value) || !record(value.identity) || !record(value.document)) return null;
  const { identity, document } = value;
  if (!(identity.accountOwnerId === null || typeof identity.accountOwnerId === "string") ||
    !Number.isSafeInteger(identity.mapResetVersion) || !(identity.selectedSpotId === null || typeof identity.selectedSpotId === "string") ||
    typeof identity.context !== "string" || typeof document.title !== "string" || !optionalString(document.subtitle) ||
    !Array.isArray(document.sources) || !document.sources.every(source) ||
    !(document.sections === undefined || Array.isArray(document.sections) && document.sections.every(section))) return null;
  return { identity: { accountOwnerId: identity.accountOwnerId, mapResetVersion: identity.mapResetVersion as number,
    selectedSpotId: identity.selectedSpotId, context: identity.context }, document: {
    title: document.title, ...(document.subtitle === undefined ? {} : { subtitle: document.subtitle as string }),
    sources: uniqueSourceRecords((document.sources as SourceSummary[]).filter(isProductSource).map(copySource)),
    ...(document.sections === undefined ? {} : { sections: (document.sections as SourceSection[]).map(copySection) }),
  } };
}
