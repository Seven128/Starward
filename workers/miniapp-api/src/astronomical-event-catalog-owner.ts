import { createHash, randomUUID } from "node:crypto";
import type {
  AstronomicalEventOccurrence,
  SourceSummary,
  AstronomicalEventsData,
} from "@starward/miniapp-contracts";
import { validateExternalUrl } from "@starward/miniapp-contracts";
import {
  ASTRONOMICAL_EVENTS_2026,
  ASTRONOMICAL_EVENT_CATALOG_VERSION,
  astronomicalEventSources,
} from "./astronomical-event-catalog.ts";
import { meteorReferenceOverlapsLocalDate } from "./meteor-event-catalog.ts";
import { calculateAnnualSolarReferenceAt } from "./astronomy-engine-adapter.ts";
import { validateEventArticle, validateEventArticleLicense, eventArticleIdentity, validateArticleRights, confirmArticleRights, type EventArticleRights, type EventArticleRightsConfirmation } from "./event-article-policy.ts";

export const EVENT_CATALOG_SCHEMA_VERSION = "starward.astronomical-events.v1";
export const EVENT_CATALOG_MAX_BYTES = 1_048_576;
export const EVENT_CATALOG_MAX_OCCURRENCES = 512;
// Exact retired built-in meteor records, including identities and old values.
// An operator-edited annual catalog must not be overwritten by a broad prefix.
const RETIRED_BUILTIN_METEOR_DIGEST = "cd20b0d761e2fb606caed48635059dbe8a9e492ec8d33ced8f0e5bb00fb7e33b";

export interface AstronomicalEventCatalogPackage {
  schemaVersion: typeof EVENT_CATALOG_SCHEMA_VERSION;
  catalogVersion: string;
  coverage: AstronomicalEventsData["coverage"];
  sourceRelease: string;
  parserVersion: string;
  timeScale: "UTC";
  precision: string;
  events: readonly AstronomicalEventOccurrence[];
  sources: readonly SourceSummary[];
  /** Private audit evidence: intentionally absent from public event responses. */
  articleRights?: Readonly<Record<string, EventArticleRights>>;
}

export interface EventCatalogSourceConfig {
  sourceId: string;
  provider: string;
  endpoint: string | null;
  enabled: boolean;
  parserVersion: string;
  schemaVersion: typeof EVENT_CATALOG_SCHEMA_VERSION;
  autoPublishEligible: boolean;
  approvedBaselineVersion: string | null;
  termsUrl: string;
  coverage: string;
}

export type EventCatalogCandidateState =
  | "REVIEW_REQUIRED"
  | "AUTO_PUBLISH_ELIGIBLE"
  | "REJECTED"
  | "PUBLISHED";

export interface EventCatalogDiff {
  addedOccurrenceIds: readonly string[];
  removedOccurrenceIds: readonly string[];
  changedOccurrenceIds: readonly string[];
  criticalTimeChanges: readonly string[];
  articleChanges?: readonly string[];
  coverageCollapse: boolean;
  conflicts: readonly string[];
}

export interface EventCatalogCandidate {
  candidateId: string;
  sourceId: string;
  trigger: "SCHEDULED" | "OPERATOR_IMPORT";
  state: EventCatalogCandidateState;
  package: AstronomicalEventCatalogPackage;
  contentSha256: string;
  diff: EventCatalogDiff;
  decisionReasons: readonly string[];
  retrievedAt: string;
  actorId: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewReason: string | null;
  reviewedAgainst: EventCatalogActiveIdentity | null;
}

export interface EventCatalogPublication {
  publicationId: string;
  catalogVersion: string;
  candidateId: string | null;
  package: AstronomicalEventCatalogPackage;
  contentSha256: string;
  publishedAt: string;
  publishedBy: string;
  reason: string;
  rolledBackFromVersion: string | null;
  /** Exact historical target; absent on records created before this field existed. */
  restoredFromVersion?: string | null;
}

export interface EventCatalogIngestionRun {
  runId: string;
  sourceId: string;
  trigger: "SCHEDULED" | "MANUAL_RERUN";
  state: "NO_CHANGE" | "CANDIDATE_CREATED" | "SOURCE_UNAVAILABLE" | "FAILED";
  startedAt: string;
  completedAt: string;
  httpStatus: number | null;
  etag: string | null;
  lastModified: string | null;
  contentSha256: string | null;
  candidateId: string | null;
  errorCode: string | null;
}

export interface AstronomicalEventCatalogStore {
  loadActivePublication(): Promise<EventCatalogPublication | null>;
  getPublication(catalogVersion: string): Promise<EventCatalogPublication | null>;
  listPublications(): Promise<readonly EventCatalogPublication[]>;
  saveCandidate(candidate: EventCatalogCandidate): Promise<EventCatalogCandidate>;
  getCandidate(candidateId: string): Promise<EventCatalogCandidate | null>;
  getCandidateByHash(contentSha256: string): Promise<EventCatalogCandidate | null>;
  getCandidateByVersion(catalogVersion: string): Promise<EventCatalogCandidate | null>;
  listCandidates(states?: readonly EventCatalogCandidateState[], offset?: number): Promise<readonly EventCatalogCandidate[]>;
  updateCandidateReview(input: {
    candidateId: string;
    state: "REJECTED" | "AUTO_PUBLISH_ELIGIBLE";
    actorId: string;
    reason: string;
    expectedState?: EventCatalogCandidateState;
    reviewedAgainst: EventCatalogActiveIdentity | null;
  }): Promise<EventCatalogCandidate>;
  activatePublication(input: EventCatalogPublication, expectedActive?: EventCatalogActiveIdentity | null): Promise<EventCatalogPublication>;
  saveIngestionRun(run: EventCatalogIngestionRun): Promise<void>;
  lastSuccessfulIngestion(sourceId: string): Promise<EventCatalogIngestionRun | null>;
  listIngestionRuns(limit?: number): Promise<readonly EventCatalogIngestionRun[]>;
  getSourceConfig(sourceId: string): Promise<EventCatalogSourceConfig | null>;
  listSourceConfigs(): Promise<readonly EventCatalogSourceConfig[]>;
  upsertSourceConfig(config: EventCatalogSourceConfig, actorId?: string, createOnly?: boolean): Promise<EventCatalogSourceConfig>;
}

export type EventCatalogActiveIdentity = { catalogVersion: string; contentSha256: string };

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function isRetiredBuiltInCatalog(catalog: AstronomicalEventCatalogPackage) {
  const meteors = [...catalog.events].filter(event => event.kind === "METEOR_SHOWER").sort((a, b) => a.occurrenceId.localeCompare(b.occurrenceId));
  return catalog.catalogVersion.startsWith("iau-imo-reviewed-2026.1+") &&
    catalog.sourceRelease === "committed-reviewed-2026.1" && catalog.parserVersion === "builtin-reviewed-2026.1" &&
    eventCatalogDigest(meteors) === RETIRED_BUILTIN_METEOR_DIGEST;
}

export class MemoryAstronomicalEventCatalogStore implements AstronomicalEventCatalogStore {
  #active: EventCatalogPublication | null = null;
  #publications = new Map<string, EventCatalogPublication>();
  #candidates = new Map<string, EventCatalogCandidate>();
  #runs: EventCatalogIngestionRun[] = [];
  #sources = new Map<string, EventCatalogSourceConfig>();

  async loadActivePublication() { return clone(this.#active); }
  async getPublication(version: string) { return clone(this.#publications.get(version) ?? null); }
  async listPublications() {
    return [...this.#publications.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 100).map(clone);
  }
  async saveCandidate(candidate: EventCatalogCandidate) {
    if ([...this.#candidates.values()].some(row => row.contentSha256 === candidate.contentSha256 || row.package.catalogVersion === candidate.package.catalogVersion))
      throw new Error("event_catalog_candidate_duplicate");
    this.#candidates.set(candidate.candidateId, clone(candidate));
    return clone(candidate);
  }
  async getCandidate(id: string) { return clone(this.#candidates.get(id) ?? null); }
  async getCandidateByHash(hash: string) { return clone([...this.#candidates.values()].find(candidate => candidate.contentSha256 === hash) ?? null); }
  async getCandidateByVersion(version: string) { return clone([...this.#candidates.values()].find(candidate => candidate.package.catalogVersion === version) ?? null); }
  async listCandidates(states?: readonly EventCatalogCandidateState[], offset = 0) {
    return [...this.#candidates.values()].reverse().filter(candidate => !states?.length || states.includes(candidate.state)).slice(offset, offset + 100).map(clone);
  }
  async updateCandidateReview(input: { candidateId: string; state: "REJECTED" | "AUTO_PUBLISH_ELIGIBLE"; actorId: string; reason: string; expectedState?: EventCatalogCandidateState; reviewedAgainst: EventCatalogActiveIdentity | null }) {
    const current = this.#candidates.get(input.candidateId);
    if (!current || current.state === "PUBLISHED") throw new Error("event_catalog_candidate_not_reviewable");
    if (input.expectedState !== undefined && input.expectedState !== current.state) throw new Error("event_catalog_candidate_changed");
    const updated = { ...current, state: input.state, reviewedAt: new Date().toISOString(), reviewedBy: input.actorId, reviewReason: input.reason, reviewedAgainst: input.reviewedAgainst };
    this.#candidates.set(input.candidateId, updated);
    return clone(updated);
  }
  async activatePublication(publication: EventCatalogPublication, expectedActive?: EventCatalogActiveIdentity | null) {
    if (expectedActive !== undefined && (expectedActive === null ? this.#active !== null : this.#active?.catalogVersion !== expectedActive.catalogVersion || this.#active.contentSha256 !== expectedActive.contentSha256))
      throw new Error("event_catalog_active_changed");
    if (this.#publications.has(publication.catalogVersion)) throw new Error("event_catalog_version_exists");
    if (publication.candidateId) {
      const candidate = this.#candidates.get(publication.candidateId);
      if (!candidate || candidate.state !== "AUTO_PUBLISH_ELIGIBLE") throw new Error("event_catalog_candidate_not_publishable");
      const active = this.#active?.package ?? builtInAstronomicalEventCatalogPackage();
      if (candidate.reviewedAgainst?.catalogVersion !== active.catalogVersion || candidate.reviewedAgainst?.contentSha256 !== eventCatalogDigest(active)) throw new Error("event_catalog_review_baseline_changed");
      this.#candidates.set(publication.candidateId, { ...candidate, state: "PUBLISHED" });
    }
    this.#publications.set(publication.catalogVersion, clone(publication));
    this.#active = clone(publication);
    return clone(publication);
  }
  async saveIngestionRun(run: EventCatalogIngestionRun) { this.#runs.push(clone(run)); }
  async lastSuccessfulIngestion(sourceId: string) {
    return clone([...this.#runs].reverse().find(run => run.sourceId === sourceId && (run.state === "NO_CHANGE" || run.state === "CANDIDATE_CREATED")) ?? null);
  }
  async listIngestionRuns(limit = 100) { return this.#runs.slice(-limit).reverse().map(clone); }
  async getSourceConfig(sourceId: string) { return clone(this.#sources.get(sourceId) ?? null); }
  async listSourceConfigs() { return [...this.#sources.values()].map(clone); }
  async upsertSourceConfig(config: EventCatalogSourceConfig, _actorId?: string, createOnly = false) {
    if (createOnly && this.#sources.has(config.sourceId)) throw new Error("event_catalog_source_exists");
    this.#sources.set(config.sourceId, clone(config)); return clone(config);
  }
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function eventCatalogDigest(value: unknown) {
  return createHash("sha256").update(stable(value)).digest("hex");
}

export function semanticCatalogDigest(catalog: AstronomicalEventCatalogPackage) {
  return eventCatalogDigest({
    ...catalog,
    sources: catalog.sources.map(source => ({ ...source, retrievedAt: null })),
  });
}

export function sameCatalogContent(left: AstronomicalEventCatalogPackage, right: AstronomicalEventCatalogPackage) {
  return semanticCatalogDigest({ ...left, catalogVersion: right.catalogVersion }) === semanticCatalogDigest(right);
}

export function eventCatalogSourceFor(catalog: AstronomicalEventCatalogPackage, event: AstronomicalEventOccurrence) {
  const source = event.sourceId ? catalog.sources.find(source => source.id === event.sourceId)
    : catalog.sources.find(source => source.provider === (event.kind === "METEOR_SHOWER" ? "International Meteor Organization" : "Astronomy Engine"));
  if (!source) throw new Error("event_catalog_event_source_missing");
  return clone(source);
}

function validDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

function validInstant(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value) && Number.isFinite(Date.parse(value));
}

function assertFinite(value: unknown, minimum: number, maximum: number, field: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum)
    throw new Error(`event_catalog_${field}_invalid`);
}

function assertExactKeys(value: object, allowed: readonly string[], code: string) {
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error(code);
}

function validateEvent(event: AstronomicalEventOccurrence) {
  const baseKeys = ["occurrenceId", "eventId", "code", "displayName", "activeStartDate", "activeEndDate", "peakDate", "peakAtUtc", "kind", "sourceId", "article"];
  if (event.article !== undefined) validateEventArticle(event.article);
  assertExactKeys(event, event.kind === "METEOR_SHOWER"
    ? [...baseKeys, "iauNumber", "radiantRightAscensionDeg", "radiantDeclinationDeg", "velocityKmPerSecond", "populationIndex", "nominalPeakZhr", "annualReference"]
    : [...baseKeys, "eclipseKind", "obscuration", "phaseTimesUtc"], "event_catalog_event_schema_invalid");
  if (!/^[a-z0-9][a-z0-9:._-]{2,127}$/u.test(event.occurrenceId)) throw new Error("event_catalog_occurrence_id_invalid");
  if (!/^[a-z0-9][a-z0-9:._-]{1,127}$/u.test(event.eventId)) throw new Error("event_catalog_event_id_invalid");
  if (!event.code || event.code.length > 64 || !event.displayName || event.displayName.length > 100) throw new Error("event_catalog_label_invalid");
  if (![event.activeStartDate, event.activeEndDate, event.peakDate].every(validDate)) throw new Error("event_catalog_date_invalid");
  if (event.activeStartDate > event.peakDate || event.peakDate > event.activeEndDate) throw new Error("event_catalog_date_order_invalid");
  if (event.peakAtUtc !== null && !validInstant(event.peakAtUtc)) throw new Error("event_catalog_peak_invalid");
  if (event.kind === "METEOR_SHOWER") {
    assertFinite(event.iauNumber, 1, 9999, "iau_number");
    if (!Number.isInteger(event.iauNumber)) throw new Error("event_catalog_iau_number_invalid");
    if (event.radiantRightAscensionDeg !== null) assertFinite(event.radiantRightAscensionDeg, 0, 359.999999999, "radiant_ra");
    if (event.radiantDeclinationDeg !== null) assertFinite(event.radiantDeclinationDeg, -90, 90, "radiant_dec");
    if ((event.radiantRightAscensionDeg === null) !== (event.radiantDeclinationDeg === null)) throw new Error("event_catalog_radiant_pair_invalid");
    if (event.velocityKmPerSecond !== null) assertFinite(event.velocityKmPerSecond, 0, 100, "velocity");
    assertFinite(event.populationIndex, 0, 10, "population_index");
    if (event.nominalPeakZhr !== null) assertFinite(event.nominalPeakZhr, 0, 10000, "zhr");
    if (event.annualReference !== undefined) {
      const annual = event.annualReference;
      if (!/^[A-Z]{3}$/u.test(event.code)) throw new Error("event_catalog_annual_identity_invalid");
      if (!annual || typeof annual !== "object" || annual.kind !== "GMN_ANNUAL_MONITORING_REFERENCE" || annual.dateTimezone !== "UTC") throw new Error("event_catalog_annual_reference_invalid");
      assertExactKeys(annual, ["kind", "dateTimezone", "solarLongitudeStartDeg", "solarLongitudeReferenceDeg", "solarLongitudeEndDeg", "radiantDrift"], "event_catalog_annual_schema_invalid");
      for (const value of [annual.solarLongitudeStartDeg, annual.solarLongitudeReferenceDeg, annual.solarLongitudeEndDeg]) assertFinite(value, 0, 359.999999999, "solar_longitude");
      const offset = (value: number) => ((value - annual.solarLongitudeReferenceDeg + 540) % 360) - 180;
      if (offset(annual.solarLongitudeStartDeg) > 0 || offset(annual.solarLongitudeEndDeg) < 0) throw new Error("event_catalog_annual_order_invalid");
      if (!event.sourceId || event.peakAtUtc !== null || event.nominalPeakZhr !== null || event.radiantRightAscensionDeg !== null || event.radiantDeclinationDeg !== null) throw new Error("event_catalog_annual_precision_invalid");
      const year = Number(event.peakDate.slice(0, 4));
      const expectedIdentity = `${String(event.iauNumber).padStart(3, "0")}-${event.code.toLowerCase()}`;
      if (event.eventId !== `meteor-shower:${expectedIdentity}` || event.occurrenceId !== `event-occurrence:${expectedIdentity}:${year}`) throw new Error("event_catalog_annual_identity_invalid");
      const referenceAt = calculateAnnualSolarReferenceAt(year, annual.solarLongitudeReferenceDeg);
      let startAt = calculateAnnualSolarReferenceAt(year, annual.solarLongitudeStartDeg);
      let endAt = calculateAnnualSolarReferenceAt(year, annual.solarLongitudeEndDeg);
      if (startAt > referenceAt) startAt = calculateAnnualSolarReferenceAt(year - 1, annual.solarLongitudeStartDeg);
      if (endAt < referenceAt) endAt = calculateAnnualSolarReferenceAt(year + 1, annual.solarLongitudeEndDeg);
      if (event.peakDate !== referenceAt.slice(0, 10) || event.activeStartDate !== startAt.slice(0, 10) || event.activeEndDate !== endAt.slice(0, 10)) throw new Error("event_catalog_annual_date_mismatch");
      const model = annual.radiantDrift;
      if (model !== null) {
        if (!model || typeof model !== "object" || model.frame !== "SUN_CENTERED_ECLIPTIC_J2000") throw new Error("event_catalog_radiant_model_invalid");
        assertExactKeys(model, ["frame", "referenceSolarLongitudeDeg", "sunCenteredLongitudeDeg", "latitudeDeg", "longitudeDriftDegPerDeg", "latitudeDriftDegPerDeg", "validSolarOffsetMinDeg", "validSolarOffsetMaxDeg"], "event_catalog_radiant_model_schema_invalid");
        if (model.referenceSolarLongitudeDeg !== annual.solarLongitudeReferenceDeg) throw new Error("event_catalog_radiant_reference_mismatch");
        assertFinite(model.sunCenteredLongitudeDeg, 0, 359.999999999, "radiant_longitude");
        assertFinite(model.latitudeDeg, -90, 90, "radiant_latitude");
        assertFinite(model.longitudeDriftDegPerDeg, -10, 10, "radiant_longitude_drift");
        assertFinite(model.latitudeDriftDegPerDeg, -10, 10, "radiant_latitude_drift");
        assertFinite(model.validSolarOffsetMinDeg, offset(annual.solarLongitudeStartDeg), 0, "radiant_start");
        assertFinite(model.validSolarOffsetMaxDeg, 0, offset(annual.solarLongitudeEndDeg), "radiant_end");
        if (model.validSolarOffsetMinDeg >= model.validSolarOffsetMaxDeg || [model.validSolarOffsetMinDeg, model.validSolarOffsetMaxDeg].some(value => Math.abs(model.latitudeDeg + model.latitudeDriftDegPerDeg * value) > 90)) throw new Error("event_catalog_radiant_model_invalid");
      }
    }
  } else {
    if (!(["PENUMBRAL", "PARTIAL", "ANNULAR", "TOTAL"] as const).includes(event.eclipseKind)) throw new Error("event_catalog_eclipse_kind_invalid");
    if (event.obscuration !== null) assertFinite(event.obscuration, 0, 1.5, "obscuration");
    assertExactKeys(event.phaseTimesUtc, ["PENUMBRAL_BEGIN", "PARTIAL_BEGIN", "TOTAL_BEGIN", "PEAK", "TOTAL_END", "PARTIAL_END", "PENUMBRAL_END"], "event_catalog_phase_schema_invalid");
    for (const at of Object.values(event.phaseTimesUtc)) if (!validInstant(at)) throw new Error("event_catalog_phase_time_invalid");
    if (!validInstant(event.phaseTimesUtc.PEAK)) throw new Error("event_catalog_phase_peak_required");
  }
}

export function validateAstronomicalEventCatalogPackage(value: unknown, options: { pendingArticleConfirmation?: boolean } = {}): AstronomicalEventCatalogPackage {
  const bytes = Buffer.byteLength(JSON.stringify(value), "utf8");
  if (bytes > EVENT_CATALOG_MAX_BYTES) throw new Error("event_catalog_package_too_large");
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("event_catalog_package_invalid");
  const input = value as Partial<AstronomicalEventCatalogPackage>;
  assertExactKeys(input, ["schemaVersion", "catalogVersion", "coverage", "sourceRelease", "parserVersion", "timeScale", "precision", "events", "sources", "articleRights"], "event_catalog_package_schema_invalid");
  if (input.schemaVersion !== EVENT_CATALOG_SCHEMA_VERSION) throw new Error("event_catalog_schema_unsupported");
  if (typeof input.catalogVersion !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9.+_-]{2,159}$/u.test(input.catalogVersion)) throw new Error("event_catalog_version_invalid");
  if (input.coverage !== "REVIEWED_2026_METEOR_AND_ECLIPSE_EVENTS" && input.coverage !== "ANNUAL_METEOR_REFERENCES_AND_ECLIPSES") throw new Error("event_catalog_coverage_invalid");
  if (typeof input.sourceRelease !== "string" || !input.sourceRelease.trim() || input.sourceRelease.length > 200) throw new Error("event_catalog_source_release_invalid");
  if (typeof input.parserVersion !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,99}$/u.test(input.parserVersion)) throw new Error("event_catalog_parser_version_invalid");
  if (input.timeScale !== "UTC") throw new Error("event_catalog_time_scale_invalid");
  if (typeof input.precision !== "string" || !input.precision.trim() || input.precision.length > 300) throw new Error("event_catalog_precision_invalid");
  if (!Array.isArray(input.events) || input.events.length === 0 || input.events.length > EVENT_CATALOG_MAX_OCCURRENCES) throw new Error("event_catalog_occurrences_invalid");
  const ids = new Set<string>();
  for (const event of input.events) {
    validateEvent(event);
    if (ids.has(event.occurrenceId)) throw new Error("event_catalog_occurrence_duplicate");
    ids.add(event.occurrenceId);
  }
  if (!Array.isArray(input.sources) || input.sources.length === 0 || input.sources.length > 32) throw new Error("event_catalog_sources_invalid");
  for (const source of input.sources) {
    assertExactKeys(source, ["id", "kind", "provider", "title", "sourceUrl", "license", "licenseUrl", "publishedAt", "retrievedAt", "validFrom", "validTo", "state", "confidence", "precision", "limitations"], "event_catalog_source_schema_invalid");
    if (!source.id || !source.provider || source.sourceUrl && !source.sourceUrl.startsWith("https://")) throw new Error("event_catalog_source_invalid");
    if (!validInstant(source.retrievedAt)) throw new Error("event_catalog_retrieved_at_invalid");
  }
  if (new Set(input.sources.map(source => source.id)).size !== input.sources.length) throw new Error("event_catalog_source_duplicate");
  if (input.articleRights !== undefined && (!input.articleRights || typeof input.articleRights !== "object" || Array.isArray(input.articleRights)
    || Object.keys(input.articleRights).some(id => !input.events!.some(event => event.occurrenceId === id && event.article)))) throw new Error("event_article_rights_invalid");
  for (const event of input.events) {
    if (event.article) {
      const articleSource = input.sources.find(source => source.id === event.article!.sourceId);
      if (!articleSource || articleSource.kind !== "EDITORIAL_REFERENCE" || articleSource.id === event.sourceId || articleSource.sourceUrl !== event.article.originalUrl) throw new Error("event_article_source_invalid");
      validateEventArticleLicense(articleSource.license);
      if (!options.pendingArticleConfirmation) validateArticleRights(input.articleRights?.[event.occurrenceId], eventArticleIdentity(event.article, articleSource));
    }
    const source = event.sourceId ? input.sources.find(source => source.id === event.sourceId)
      : input.sources.find(source => source.provider === (event.kind === "METEOR_SHOWER" ? "International Meteor Organization" : "Astronomy Engine"));
    if (!source) throw new Error("event_catalog_event_source_missing");
    if (event.kind === "METEOR_SHOWER" && event.annualReference && (input.coverage !== "ANNUAL_METEOR_REFERENCES_AND_ECLIPSES" || source.provider !== "Global Meteor Network" || source.kind !== "HISTORICAL_RECORD")) throw new Error("event_catalog_annual_source_invalid");
    if (event.kind === "METEOR_SHOWER" && source.provider === "Global Meteor Network" && !event.annualReference) throw new Error("event_catalog_gmn_reference_required");
  }
  return clone(input as AstronomicalEventCatalogPackage);
}

function criticalProjection(event: AstronomicalEventOccurrence) {
  return event.kind === "METEOR_SHOWER"
    ? { activeStartDate: event.activeStartDate, activeEndDate: event.activeEndDate, peakDate: event.peakDate, peakAtUtc: event.peakAtUtc, annualReference: event.annualReference ?? null, sourceId: event.sourceId ?? null }
    : { activeStartDate: event.activeStartDate, activeEndDate: event.activeEndDate, peakDate: event.peakDate, peakAtUtc: event.peakAtUtc, phaseTimesUtc: event.phaseTimesUtc };
}

export function diffAstronomicalEventCatalog(active: AstronomicalEventCatalogPackage, candidate: AstronomicalEventCatalogPackage): EventCatalogDiff {
  const before = new Map(active.events.map(event => [event.occurrenceId, event]));
  const after = new Map(candidate.events.map(event => [event.occurrenceId, event]));
  const addedOccurrenceIds = [...after.keys()].filter(id => !before.has(id)).sort();
  const removedOccurrenceIds = [...before.keys()].filter(id => !after.has(id)).sort();
  const changedOccurrenceIds = [...after.keys()].filter(id => before.has(id) && stable(before.get(id)) !== stable(after.get(id))).sort();
  const criticalTimeChanges = changedOccurrenceIds.filter(id => stable(criticalProjection(before.get(id)!)) !== stable(criticalProjection(after.get(id)!)));
  const articleProjection = (event: AstronomicalEventOccurrence | undefined, catalog: AstronomicalEventCatalogPackage) => event?.article
    ? { article: event.article, source: catalog.sources.find(source => source.id === event.article!.sourceId), rights: catalog.articleRights?.[event.occurrenceId] } : null;
  const articleChanges = [...new Set([...before.keys(), ...after.keys()])].filter(id => stable(articleProjection(before.get(id), active)) !== stable(articleProjection(after.get(id), candidate))).sort();
  const eventIdentityKinds = new Map<string, string>();
  const conflicts: string[] = [];
  for (const event of candidate.events) {
    const prior = eventIdentityKinds.get(event.eventId);
    if (prior && prior !== event.kind) conflicts.push(event.eventId);
    eventIdentityKinds.set(event.eventId, event.kind);
  }
  return {
    addedOccurrenceIds,
    removedOccurrenceIds,
    changedOccurrenceIds,
    criticalTimeChanges,
    articleChanges,
    coverageCollapse: candidate.events.length < Math.ceil(active.events.length * 0.75),
    conflicts: [...new Set(conflicts)].sort(),
  };
}

export function builtInAstronomicalEventCatalogPackage(now = "2026-09-14T21:22:00.000Z"): AstronomicalEventCatalogPackage {
  return {
    schemaVersion: EVENT_CATALOG_SCHEMA_VERSION,
    catalogVersion: ASTRONOMICAL_EVENT_CATALOG_VERSION,
    coverage: "ANNUAL_METEOR_REFERENCES_AND_ECLIPSES",
    sourceRelease: "gmn-trajectories-2022-2023-release-20260914",
    parserVersion: "gmn-annual-reference-v1",
    timeScale: "UTC",
    precision: "流星雨日期为常年监测参考的UTC日历日期，不是当年精确极大；食相按锁定Astronomy Engine计算。",
    events: clone(ASTRONOMICAL_EVENTS_2026),
    sources: astronomicalEventSources("2026-01-01").map(source => ({ ...source, retrievedAt: now })),
  };
}

export class AstronomicalEventCatalogOwner {
  readonly store: AstronomicalEventCatalogStore;
  #activePackage: AstronomicalEventCatalogPackage;
  #activePublication: EventCatalogPublication | null = null;
  #stateRevision = 0;
  #refreshSequence = 0;

  constructor(store: AstronomicalEventCatalogStore = new MemoryAstronomicalEventCatalogStore()) {
    this.store = store;
    this.#activePackage = builtInAstronomicalEventCatalogPackage();
  }

  async initialize() {
    const revision = this.#stateRevision;
    const refreshSequence = ++this.#refreshSequence;
    const publication = await this.store.loadActivePublication();
    if (revision !== this.#stateRevision || refreshSequence !== this.#refreshSequence) return this;
    if (publication) {
      this.#activePackage = validateAstronomicalEventCatalogPackage(publication.package);
      this.#activePublication = publication;
      if (isRetiredBuiltInCatalog(this.#activePackage)) {
        const baseline = builtInAstronomicalEventCatalogPackage();
        const candidate = validateAstronomicalEventCatalogPackage({
          ...baseline,
          catalogVersion: `${baseline.catalogVersion}.migration.${publication.contentSha256.slice(0, 8)}`,
          events: [...baseline.events.filter(event => event.kind === "METEOR_SHOWER"), ...this.#activePackage.events.filter(event => event.kind !== "METEOR_SHOWER")],
          sources: [...baseline.sources.filter(source => source.provider === "Global Meteor Network"), ...this.#activePackage.sources.filter(source => source.provider !== "International Meteor Organization")],
        });
        const digest = eventCatalogDigest(candidate);
        try {
          await this.#activate(candidate, digest, null, "system:external-capability-migration", "将精确匹配的退役内置流星资料迁移为已采用的 GMN 常年参考；保留食事件和既有计划。", null, publication);
        } catch (error) {
          // Another process may have migrated or published newer reviewed data.
          const recoveryRevision = this.#stateRevision;
          const active = await this.store.loadActivePublication();
          if (!active || (!(error instanceof Error && error.message === "event_catalog_active_changed") &&
            (active.catalogVersion !== candidate.catalogVersion || active.contentSha256 !== digest))) throw error;
          if (recoveryRevision === this.#stateRevision && refreshSequence === this.#refreshSequence) {
            this.#activePackage = validateAstronomicalEventCatalogPackage(active.package);
            this.#activePublication = active;
          }
        }
      }
    }
    return this;
  }

  snapshot() { return clone(this.#activePackage); }
  find(occurrenceId: string) { return clone(this.#activePackage.events.find(event => event.occurrenceId === occurrenceId) ?? null); }
  active(localDate: string) { return clone(this.#activePackage.events.filter(event => event.kind === "METEOR_SHOWER" ? meteorReferenceOverlapsLocalDate(event, localDate) : localDate >= event.activeStartDate && localDate <= event.activeEndDate)); }
  sourceFor(event: AstronomicalEventOccurrence) {
    return eventCatalogSourceFor(this.#activePackage, event);
  }

  async importCandidate(input: { sourceId: string; package: unknown; actorId: string; trigger?: "SCHEDULED" | "OPERATOR_IMPORT"; retrievedAt?: string; articleRightsConfirmation?: EventArticleRightsConfirmation }) {
    let catalog = validateAstronomicalEventCatalogPackage(input.package, { pendingArticleConfirmation: true });
    const baseline = this.snapshot();
    const priorVersion = await this.store.getCandidateByVersion(catalog.catalogVersion);
    if (priorVersion) {
      const withoutRights = (value: AstronomicalEventCatalogPackage) => { const { articleRights: _rights, ...data } = value; return data; };
      if (stable(withoutRights(priorVersion.package)) !== stable(withoutRights(catalog))) throw new Error("event_catalog_version_exists");
      for (const [id, rights] of Object.entries(priorVersion.package.articleRights ?? {})) {
        if (baseline.articleRights?.[id]?.articleSha256 === rights.articleSha256) continue;
        const confirmation = input.articleRightsConfirmation;
        if (confirmation?.confirmed !== true || typeof confirmation.basis !== "string" || confirmation.basis.trim() !== rights.basis || confirmation.registeredSourceId !== rights.registeredSourceId || input.actorId !== rights.confirmedBy) throw new Error("event_article_rights_required");
      }
      return { state: priorVersion.state, candidate: priorVersion, diff: priorVersion.diff };
    }
    const articleRights: Record<string, EventArticleRights> = {};
    for (const event of catalog.events) {
      if (!event.article) continue;
      const articleSource = catalog.sources.find(source => source.id === event.article!.sourceId)!;
      const identity = eventArticleIdentity(event.article, articleSource);
      const previous = baseline.articleRights?.[event.occurrenceId];
      if (previous?.articleSha256 === identity) articleRights[event.occurrenceId] = previous;
      else {
        const registered = input.articleRightsConfirmation ? await this.store.getSourceConfig(input.articleRightsConfirmation.registeredSourceId) : null;
        if (!registered?.enabled || registered.provider !== articleSource.provider) throw new Error("event_article_registered_source_required");
        articleRights[event.occurrenceId] = confirmArticleRights(input.articleRightsConfirmation, input.actorId, identity);
      }
    }
    // Uploaded actor/evidence fields cannot impersonate a prior confirmation.
    delete catalog.articleRights;
    if (Object.keys(articleRights).length) catalog.articleRights = articleRights;
    catalog = validateAstronomicalEventCatalogPackage(catalog);
    const baselineIdentity = { catalogVersion: baseline.catalogVersion, contentSha256: eventCatalogDigest(baseline) };
    const diff = diffAstronomicalEventCatalog(baseline, catalog);
    const contentSha256 = eventCatalogDigest(catalog);
    if (semanticCatalogDigest(catalog) === semanticCatalogDigest(baseline)) return { state: "NO_CHANGE" as const, candidate: null, diff };
    if (catalog.catalogVersion === baseline.catalogVersion) throw new Error("event_catalog_version_not_advanced");
    if (await this.store.getPublication(catalog.catalogVersion)) throw new Error("event_catalog_version_exists");
    const existing = await this.store.getCandidateByHash(contentSha256);
    if (existing) return { state: existing.state, candidate: existing, diff: existing.diff };
    const source = await this.store.getSourceConfig(input.sourceId);
    const trigger = input.trigger ?? "OPERATOR_IMPORT";
    const reasons: string[] = [];
    if (trigger === "OPERATOR_IMPORT") reasons.push("OPERATOR_UPLOAD_REQUIRES_REVIEW");
    if (!source?.approvedBaselineVersion) reasons.push("SOURCE_BASELINE_NOT_APPROVED");
    if (!source?.autoPublishEligible) reasons.push("SOURCE_AUTO_PUBLISH_NOT_APPROVED");
    if (source && source.parserVersion !== catalog.parserVersion) reasons.push("PARSER_VERSION_CHANGED");
    if (diff.removedOccurrenceIds.length) reasons.push("OCCURRENCES_REMOVED");
    if (diff.coverageCollapse) reasons.push("COVERAGE_COLLAPSE");
    if (diff.conflicts.length) reasons.push("SOURCE_CONFLICT");
    if (diff.criticalTimeChanges.length) reasons.push("CRITICAL_TIME_CHANGED");
    if (diff.articleChanges?.length) reasons.push("ARTICLE_CHANGED_REQUIRES_REVIEW");
    const state: EventCatalogCandidateState = reasons.length ? "REVIEW_REQUIRED" : "AUTO_PUBLISH_ELIGIBLE";
    const candidate: EventCatalogCandidate = {
      candidateId: `event-candidate:${randomUUID()}`,
      sourceId: input.sourceId,
      trigger,
      state,
      package: catalog,
      contentSha256,
      diff,
      decisionReasons: reasons,
      retrievedAt: input.retrievedAt ?? new Date().toISOString(),
      actorId: input.actorId,
      reviewedAt: null,
      reviewedBy: null,
      reviewReason: null,
      reviewedAgainst: state === "AUTO_PUBLISH_ELIGIBLE" ? baselineIdentity : null,
    };
    return { state, candidate: await this.store.saveCandidate(candidate), diff };
  }

  async reviewCandidate(input: { candidateId: string; decision: "APPROVE" | "REJECT"; actorId: string; reason: string; expectedState?: EventCatalogCandidateState; expectedActive?: EventCatalogActiveIdentity }) {
    if (!input.reason.trim() || input.reason.length > 500) throw new Error("event_catalog_review_reason_invalid");
    this.#publicationPrecondition(input.expectedActive);
    return this.store.updateCandidateReview({ candidateId: input.candidateId, state: input.decision === "APPROVE" ? "AUTO_PUBLISH_ELIGIBLE" : "REJECTED", actorId: input.actorId, reason: input.reason.trim(), reviewedAgainst: input.decision === "APPROVE" ? this.activeIdentity() : null, ...(input.expectedState !== undefined ? { expectedState: input.expectedState } : {}) });
  }

  async publishCandidate(input: { candidateId: string; actorId: string; reason: string; expectedActive?: EventCatalogActiveIdentity }) {
    const candidate = await this.store.getCandidate(input.candidateId);
    if (!candidate || candidate.state !== "AUTO_PUBLISH_ELIGIBLE") throw new Error("event_catalog_candidate_not_publishable");
    this.#publicationPrecondition(input.expectedActive);
    if (!candidate.reviewedAgainst || candidate.reviewedAgainst.catalogVersion !== this.#activePackage.catalogVersion || candidate.reviewedAgainst.contentSha256 !== eventCatalogDigest(this.#activePackage)) throw new Error("event_catalog_review_baseline_changed");
    return this.#activate(candidate.package, candidate.contentSha256, candidate.candidateId, input.actorId, input.reason, null, this.#publicationPrecondition(input.expectedActive));
  }

  async rollback(input: { catalogVersion: string; actorId: string; reason: string; expectedActive?: EventCatalogActiveIdentity }) {
    const target = await this.store.getPublication(input.catalogVersion) ??
      (input.catalogVersion === ASTRONOMICAL_EVENT_CATALOG_VERSION ? this.#builtInPublication() : null);
    if (!target) throw new Error("event_catalog_publication_not_found");
    if (isRetiredBuiltInCatalog(target.package)) throw new Error("event_catalog_retired_baseline_not_restorable");
    this.#publicationPrecondition(input.expectedActive);
    if (sameCatalogContent(target.package, this.#activePackage)) throw new Error("event_catalog_already_active");
    const suffix = `.rollback.${randomUUID()}`;
    const rollbackVersion = `${target.catalogVersion.slice(0, 160 - suffix.length)}${suffix}`;
    const rollbackPackage = { ...target.package, catalogVersion: rollbackVersion };
    return this.#activate(rollbackPackage, eventCatalogDigest(rollbackPackage), null, input.actorId, input.reason, this.#activePackage.catalogVersion, this.#publicationPrecondition(input.expectedActive), target.catalogVersion);
  }

  #publicationPrecondition(requested?: EventCatalogActiveIdentity) {
    if (requested && (requested.catalogVersion !== this.#activePackage.catalogVersion || requested.contentSha256 !== eventCatalogDigest(this.#activePackage)))
      throw new Error("event_catalog_active_changed");
    return this.#activePublication ? { catalogVersion: this.#activePublication.catalogVersion, contentSha256: this.#activePublication.contentSha256 } : null;
  }

  activeIdentity(): EventCatalogActiveIdentity { return { catalogVersion: this.#activePackage.catalogVersion, contentSha256: eventCatalogDigest(this.#activePackage) }; }

  async listSourceConfigs() { return this.store.listSourceConfigs(); }
  async listPublications() {
    const stored = await this.store.listPublications();
    return stored.some(publication => publication.catalogVersion === ASTRONOMICAL_EVENT_CATALOG_VERSION)
      ? stored
      : [...stored, this.#builtInPublication()];
  }
  async reviewQueue() { return this.store.listCandidates(["REVIEW_REQUIRED", "AUTO_PUBLISH_ELIGIBLE"]); }
  async recentIngestionRuns(limit = 100) { return this.store.listIngestionRuns(limit); }

  #builtInPublication(): EventCatalogPublication {
    const catalog = builtInAstronomicalEventCatalogPackage();
    return {
      publicationId: "event-publication:builtin-gmn-annual-2026.1",
      catalogVersion: catalog.catalogVersion,
      candidateId: null,
      package: catalog,
      contentSha256: eventCatalogDigest(catalog),
      publishedAt: "2026-09-14T21:22:00.000Z",
      publishedBy: "admin:system-bootstrap",
      reason: "代码仓库内置的 GMN 常年参考及计算食事件基线",
      rolledBackFromVersion: null,
    };
  }

  async #activate(catalog: AstronomicalEventCatalogPackage, hash: string, candidateId: string | null, actorId: string, reason: string, rolledBackFromVersion: string | null, expectedActive?: EventCatalogActiveIdentity | null, restoredFromVersion: string | null = null) {
    if (!reason.trim() || reason.length > 500) throw new Error("event_catalog_publication_reason_invalid");
    const publication: EventCatalogPublication = {
      publicationId: `event-publication:${randomUUID()}`,
      catalogVersion: catalog.catalogVersion,
      candidateId,
      package: validateAstronomicalEventCatalogPackage(catalog),
      contentSha256: hash,
      publishedAt: new Date().toISOString(),
      publishedBy: actorId,
      reason: reason.trim(),
      rolledBackFromVersion,
      restoredFromVersion,
    };
    const revision = this.#stateRevision;
    const refreshSequence = this.#refreshSequence;
    const stored = await this.store.activatePublication(publication, expectedActive);
    if (revision === this.#stateRevision && refreshSequence === this.#refreshSequence) {
      this.#activePackage = clone(stored.package);
      this.#activePublication = stored;
      ++this.#stateRevision;
    } else await this.initialize();
    return clone(stored);
  }

  async retrieve(input: { sourceId: string; trigger?: "SCHEDULED" | "MANUAL_RERUN"; fetcher?: typeof fetch; now?: Date }) {
    const started = input.now ?? new Date();
    const config = await this.store.getSourceConfig(input.sourceId);
    if (!config?.enabled || !config.endpoint) return this.#recordFailedRun(input.sourceId, input.trigger ?? "SCHEDULED", started, "SOURCE_UNAVAILABLE", "EVENT_SOURCE_NOT_CONFIGURED");
    const validation = validateExternalUrl(config.endpoint);
    if (!validation.ok || !validation.normalizedUrl?.startsWith("https://")) throw new Error("event_catalog_source_url_invalid");
    const endpoint = new URL(validation.normalizedUrl);
    const prior = await this.store.lastSuccessfulIngestion(input.sourceId);
    const headers = new Headers({ accept: "application/json" });
    if (prior?.etag) headers.set("if-none-match", prior.etag);
    if (prior?.lastModified) headers.set("if-modified-since", prior.lastModified);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await (input.fetcher ?? fetch)(endpoint, { method: "GET", headers, signal: controller.signal, redirect: "error" });
      const completedAt = new Date().toISOString();
      if (response.status === 304) {
        const run = this.#run(input.sourceId, input.trigger ?? "SCHEDULED", started, completedAt, "NO_CHANGE", response.status, response.headers, null, null, null);
        await this.store.saveIngestionRun(run);
        return run;
      }
      if (!response.ok) return this.#recordFailedRun(input.sourceId, input.trigger ?? "SCHEDULED", started, "SOURCE_UNAVAILABLE", `HTTP_${response.status}`, response.status, response.headers);
      if (!response.headers.get("content-type")?.toLowerCase().includes("application/json")) throw new Error("event_catalog_content_type_invalid");
      const declared = Number(response.headers.get("content-length") ?? 0);
      if (declared > EVENT_CATALOG_MAX_BYTES) throw new Error("event_catalog_package_too_large");
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > EVENT_CATALOG_MAX_BYTES) throw new Error("event_catalog_package_too_large");
      const rawHash = createHash("sha256").update(bytes).digest("hex");
      const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
      const result = await this.importCandidate({ sourceId: input.sourceId, package: parsed, actorId: "admin:scheduled-ingestion", trigger: "SCHEDULED", retrievedAt: completedAt });
      if (result.candidate?.state === "AUTO_PUBLISH_ELIGIBLE") await this.publishCandidate({ candidateId: result.candidate.candidateId, actorId: "admin:scheduled-ingestion", reason: "已批准的稳定结构化来源通过差异与模式校验" });
      const run = this.#run(input.sourceId, input.trigger ?? "SCHEDULED", started, completedAt, result.state === "NO_CHANGE" ? "NO_CHANGE" : "CANDIDATE_CREATED", response.status, response.headers, rawHash, result.candidate?.candidateId ?? null, null);
      await this.store.saveIngestionRun(run);
      return run;
    } catch (error) {
      const code = error instanceof Error ? error.message : "EVENT_INGESTION_FAILED";
      return this.#recordFailedRun(input.sourceId, input.trigger ?? "SCHEDULED", started, "FAILED", code);
    } finally { clearTimeout(timer); }
  }

  #run(sourceId: string, trigger: "SCHEDULED" | "MANUAL_RERUN", started: Date, completedAt: string, state: EventCatalogIngestionRun["state"], httpStatus: number | null, headers: Headers | null, hash: string | null, candidateId: string | null, errorCode: string | null): EventCatalogIngestionRun {
    return { runId: `event-ingestion:${randomUUID()}`, sourceId, trigger, state, startedAt: started.toISOString(), completedAt, httpStatus, etag: headers?.get("etag") ?? null, lastModified: headers?.get("last-modified") ?? null, contentSha256: hash, candidateId, errorCode };
  }

  async #recordFailedRun(sourceId: string, trigger: "SCHEDULED" | "MANUAL_RERUN", started: Date, state: "SOURCE_UNAVAILABLE" | "FAILED", code: string, status: number | null = null, headers: Headers | null = null) {
    const run = this.#run(sourceId, trigger, started, new Date().toISOString(), state, status, headers, null, null, code);
    await this.store.saveIngestionRun(run);
    return run;
  }
}
