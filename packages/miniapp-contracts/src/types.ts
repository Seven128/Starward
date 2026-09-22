export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type SpotId = Brand<string, "SpotId">;
export type SpotRevisionId = Brand<string, "SpotRevisionId">;
export type ProfileLinkId = Brand<string, "ProfileLinkId">;
export type PlanId = Brand<string, "PlanId">;
export type ImportDraftId = Brand<string, "ImportDraftId">;
export type SpotProposalId = Brand<string, "SpotProposalId">;
export type ContributionId = Brand<string, "ContributionId">;
export type ContributionRevisionId = Brand<string, "ContributionRevisionId">;
export type ContributionUploadId = Brand<string, "ContributionUploadId">;
export type ModerationCaseId = Brand<string, "ModerationCaseId">;
export type OperationReceiptId = Brand<string, "OperationReceiptId">;
export type UserId = Brand<string, "UserId">;
export type ObservationContextId = Brand<string, "ObservationContextId">;

export type DataState =
  | "FRESH"
  | "STALE_USABLE"
  | "PARTIAL"
  | "EXPIRED"
  | "UNAVAILABLE"
  | "ESTIMATED"
  | "SAMPLE_DATA";

export type PageState =
  | "INITIAL"
  | "LOADING"
  | "READY"
  | "EMPTY"
  | "PARTIAL"
  | "STALE"
  | "ERROR"
  | "PERMISSION_DENIED";

export type SourceKind =
  | "THIRD_PARTY_FORECAST"
  | "THIRD_PARTY_ROUTE"
  | "THIRD_PARTY_PLACE"
  | "OFFICIAL_REFERENCE"
  | "EDITORIAL_REFERENCE"
  | "PRODUCT_CALCULATION"
  | "OFFICIAL_VERIFICATION"
  | "USER_FIELD_REPORT"
  | "HISTORICAL_RECORD"
  | "OPEN_DATA"
  | "TEST_FIXTURE";

export interface SourceSummary {
  /** Mandatory credit delivered with the data, distinct from optional precision/help prose. */
  attribution?: { name: string; url: string; statements: readonly string[] };
  id: string;
  kind: SourceKind;
  provider: string;
  title: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  publishedAt: string | null;
  /** Actual source acquisition time; null when not recorded. Never infer from file metadata. */
  retrievedAt: string | null;
  validFrom: string | null;
  validTo: string | null;
  state: DataState;
  confidence: number | null;
  precision: string;
  limitations: readonly string[];
}

export interface ApiEnvelope<T> {
  apiVersion: "v2";
  data: T;
  dataState: DataState;
  generatedAt: string;
  validAt: string | null;
  etag: string;
  sources: readonly SourceSummary[];
  warnings: readonly string[];
  requestId: string;
  contextRevision?: number;
}

export interface ApiError {
  code:
    | "INVALID_INPUT"
    | "NOT_FOUND"
    | "PERMISSION_DENIED"
    | "CAPABILITY_DISABLED"
    | "PROVIDER_UNAVAILABLE"
    | "STALE_REJECTED"
    | "BUDGET_EXCEEDED"
    | "CONFLICT"
    | "RATE_LIMITED";
  message: string;
  retryable: boolean;
  recovery: readonly string[];
  requestId: string;
}

export type ObservationLocation =
  | {
      kind: "FORMAL_SPOT";
      spotId: SpotId;
      locationVersion: number;
    }
  | {
      kind: "MAP_POINT";
      displayName: string;
      wgs84: Wgs84Point;
      source: "MAP_VIEWPORT" | "USER_LOCATION";
    };

export interface ObservationContext {
  schemaVersion: "observation-context-v2";
  contextId: ObservationContextId;
  contextFingerprint: string;
  revision: number;
  location: ObservationLocation;
  routeOrigin: {
    contextId: ObservationContextId;
    displayName: string;
    wgs84: Wgs84Point;
    source: "MAP_VIEWPORT" | "USER_LOCATION";
  } | null;
  timezone: string;
  localDate: string;
  nightStartUtc: string;
  nightEndUtc: string;
  selectedAtUtc: string;
  eventInstanceId: string | null;
  targetProfile: "DAILY" | "METEOR" | "MILKY_WAY" | "PLANET" | "CUSTOM";
  weatherView: {
    primaryPolicy: string;
    comparisonModels: readonly string[];
    selectedModel: string | null;
    cloudLayer: "TOTAL" | "LOW" | "MID" | "HIGH";
  };
  algorithmVersions: {
    astronomy: string;
    opportunity: string;
    tripDecision: string;
    darkSky: string;
    eventCatalog: string;
  };
  privacyClass: "PUBLIC_REFERENCE" | "SESSION_PRECISE";
  createdAt: string;
  expiresAt: string;
}

export interface ObservationContextResolveRequest {
  location:
    | { kind: "FORMAL_SPOT"; spotId: string }
    | {
        kind: "MAP_POINT";
        displayName: string;
        wgs84: Wgs84Point;
        source: "MAP_VIEWPORT" | "USER_LOCATION";
        timezoneHint?: "Asia/Shanghai" | "Asia/Hong_Kong";
      };
  routeOriginContextId?: string | null;
  localDate: string;
  selectedAt?: string | null;
  eventInstanceId?: string | null;
  targetProfile?: ObservationContext["targetProfile"];
}

export interface ObservationContextUpdateRequest {
  expectedRevision: number;
  localDate?: string;
  selectedAt?: string;
  cloudLayer?: ObservationContext["weatherView"]["cloudLayer"];
  eventInstanceId?: string | null;
}

export interface WechatLoginRequest {
  code: string;
}

export interface AuthSessionData {
  userId: UserId;
  accessToken: string;
  expiresAt: string;
}

export interface Wgs84Point {
  readonly system: "WGS84";
  readonly latitude: number;
  readonly longitude: number;
}

export interface Gcj02Point {
  readonly system: "GCJ02";
  readonly latitude: number;
  readonly longitude: number;
  readonly derivedFrom: "WGS84";
  readonly transformVersion: string;
}

export type VisibilityPolicy =
  | "PUBLIC_EXACT"
  | "PUBLIC_APPROXIMATE"
  | "RESTRICTED"
  | "HIDDEN";
export type FacilityType =
  | "PARKING"
  | "TOILET"
  | "PLATFORM"
  | "CHARGING"
  | "CAMPING"
  | "ROAD"
  | "WALKING"
  | "SIGNAL";
export type FacilityStatus =
  | "AVAILABLE"
  | "UNAVAILABLE"
  | "UNKNOWN"
  | "SEASONAL";

export interface FacilityEvidence {
  type: FacilityType;
  status: FacilityStatus;
  summary: string;
  detail: string;
  distanceM: number | null;
  openingHours: string | null;
  usageCondition: string | null;
  verifiedAt: string | null;
  confidence: number | null;
  source: SourceSummary;
}

export type FactEvidenceSubject =
  | "SPOT"
  | "FACILITY"
  | "ACCESS"
  | "SAFETY"
  | "HORIZON";

export interface FactEvidence {
  evidenceId: string;
  subjectType: FactEvidenceSubject;
  subjectId: string;
  claim: string;
  state: "CONFIRMED" | "REPORTED" | "CONFLICTED" | "EXPIRED";
  sourceType: "OFFICIAL" | "OPERATOR" | "VERIFIED_USER" | "USER";
  sourceId: string;
  mediaIds: readonly string[];
  observedAt: string | null;
  verifiedAt: string | null;
  validTo: string | null;
  confidence: number | null;
}

export interface AccessAndSafetyState {
  openness: "OPEN" | "CONDITIONAL" | "CLOSED" | "UNKNOWN";
  legalAccess: "PERMITTED" | "CONDITIONAL" | "PROHIBITED" | "UNKNOWN";
  nightSafety: "NO_KNOWN_HAZARD" | "CAUTION" | "DANGER" | "UNKNOWN";
  explicitDanger: boolean | null;
  restrictions: readonly string[];
  guidance: readonly string[];
}

export type SiteMediaState =
  | "SITE_MEDIA_VERIFIED"
  | "NO_SITE_MEDIA_VERIFIED"
  | "UNKNOWN";

export interface RepresentativeMedia {
  id: string;
  localPath: string;
  thumbnailPath: string;
  alt: string;
  caption: string;
  photographer: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  capturedAt: string | null;
  direction: string | null;
  sequence: number;
  isSiteSpecific: boolean;
  state: DataState;
}

export interface LightPollutionEstimate {
  levelAtMost: 2 | 3 | 4 | 5 | 6 | null;
  productBand:
    | "VERY_LOW"
    | "LOW"
    | "MODERATE"
    | "HIGH"
    | "VERY_HIGH"
    | null;
  radiance: {
    median: number;
    p10: number;
    p90: number;
    unit: "nW/cm²/sr";
  } | null;
  minimumCloudFreeObservations: number | null;
  calibratedSkyClass: false;
  label: string;
  method: string;
  datasetVersion: string;
  dataDate: string;
  precision: string;
  state: "ESTIMATED" | "UNAVAILABLE";
  source: SourceSummary;
}

export interface SpotSummary {
  spotId: SpotId;
  name: string;
  region: string;
  address: string;
  timezone: "Asia/Shanghai" | "Asia/Hong_Kong";
  wgs84: Wgs84Point;
  gcj02: Gcj02Point;
  altitudeM: number | null;
  status:
    | "PUBLISHED"
    | "TEMPORARILY_CLOSED"
    | "DATA_INSUFFICIENT"
    | "UNPUBLISHED"
    | "RETIRED";
  visibilityPolicy: VisibilityPolicy;
  source: SourceSummary;
  lastVerifiedAt: string | null;
  lightPollution: LightPollutionEstimate;
  obstructionPercent: number | null;
  clearDirections: readonly ("ALL" | "WEST" | "NORTHEAST")[];
  accessTags: readonly (
    | "DRIVE_TO"
    | "PUBLIC_TRANSIT"
    | "NO_HIKE"
    | "NO_CLIMB"
  )[];
  facilities: readonly FacilityEvidence[];
  media: readonly RepresentativeMedia[];
}

export interface GuideArticle {
  articleId: string;
  spotId: SpotId;
  title: string;
  summary: string;
  authorName: string;
  authorType: "OFFICIAL" | "WHITELIST";
  publishedAt: string;
  updatedAt: string;
  verified: boolean;
  source: SourceSummary;
  blocks: readonly (
    | { type: "paragraph"; text: string }
    | { type: "tip"; title: string; text: string }
    | { type: "media"; mediaId: string; caption: string }
    | { type: "facility_ref"; facilityType: FacilityType }
  )[];
}

export type RouteTravelMode = "DRIVING" | "TRANSIT" | "WALKING";

export interface RouteOverview {
  kind: "ROUTE_ESTIMATE" | "STRAIGHT_LINE_ONLY" | "UNAVAILABLE";
  travelMode: RouteTravelMode | null;
  originLabel: string | null;
  distanceKm: number | null;
  durationMinutes: number | null;
  driveMinutes: number | null;
  walkingMinutes: number | null;
  lastRoad: string;
  parkingGuidance: string;
  state: DataState;
  source: SourceSummary;
}

export interface DecisionFactor {
  code: string;
  label: string;
  severity: "POSITIVE" | "CAUTION" | "BLOCKER" | "UNKNOWN";
  detail: string;
  sourceIds: readonly string[];
}

export type SkyOpportunityStatus =
  | "EXCELLENT"
  | "GOOD"
  | "FAIR"
  | "POOR"
  | "INSUFFICIENT_DATA";

export interface ObservationWindow {
  start: string;
  end: string;
  durationMinutes: number;
  averageScore: number;
  peakScore: number;
  confidence: number;
  favorableFactors: readonly DecisionFactor[];
  adverseFactors: readonly DecisionFactor[];
  startReason: string;
  endReason: string;
  modelBoundarySpreadMinutes: number | null;
}

export interface SkyOpportunity {
  status: SkyOpportunityStatus;
  label: string;
  primaryWindow: ObservationWindow | null;
  backupWindow: ObservationWindow | null;
  windows: readonly ObservationWindow[];
  suitableFor: readonly (
    | "NAKED_EYE"
    | "PHONE"
    | "MILKY_WAY"
    | "STAR_TRAIL"
    | "DEEP_SKY"
  )[];
  factors: readonly DecisionFactor[];
  confidence: number | null;
  freshness: DataState;
  ruleVersion: string;
  inputDigest: string;
}

export interface TripDecision {
  recommendation:
    | "RECOMMENDED"
    | "CONSIDER"
    | "NOT_RECOMMENDED"
    | "DATA_INSUFFICIENT";
  label: string;
  skyOpportunity: SkyOpportunity;
  factors: readonly DecisionFactor[];
  confidence: number | null;
  freshness: DataState;
  ruleVersion: string;
  inputDigest: string;
}

export interface SpotDetail {
  spot: SpotSummary;
  route: RouteOverview;
  decision: TripDecision;
  guides: readonly GuideArticle[];
  accessAndSafety: AccessAndSafetyState;
  siteMediaState: SiteMediaState;
  evidence: readonly FactEvidence[];
  dataDisclosure: readonly SourceSummary[];
  /** Canonical contributor-editable copy that has passed moderation. Older
   * revisions may omit it and are projected from their structured fields. */
  formalFacts?: Readonly<Partial<{
    address: string | null;
    name: string | null;
    openness: string | null;
    hours: string | null;
    access: string | null;
    accessNote: string | null;
    road: string | null;
    safety: string | null;
    parking: string | null;
    parkingNote: string | null;
    toilet: string | null;
    toiletNote: string | null;
    platform: string | null;
    horizon: string | null;
    light: string | null;
    signal: string | null;
    camping: string | null;
    contact: string | null;
    detail: string | null;
  }>>;
  /** Moderated reference photos shown by the formal-feedback editor. They are
   * distinct from representative public media, whose provenance gate is stricter. */
  formalMedia?: Readonly<Partial<Record<import("./contribution-feedback.ts").ContributionMediaKind, readonly string[]>>>;
}

export interface SpotSkyContext {
  contextId: ObservationContextId;
  contextFingerprint: string;
  contextRevision: number;
  spotId: SpotId;
  localDate: string;
  at: string;
  timezone: string;
  targetProfile: "BEGINNER" | "PHOTOGRAPHER" | "ADVANCED";
  dataRevision: string;
  algorithmVersion: string;
  catalogVersion: string;
  eventCatalogVersion: string;
}

export type MeteorActivityStage =
  | "WEAK"
  | "MODERATE"
  | "STRONG"
  | "NEAR_PEAK";

export interface MeteorActivityEvidence {
  profileId: string;
  profileKind: "HISTORICAL_FIT";
  profileVersion: string;
  axis: "SOLAR_LONGITUDE_J2000";
  unit: "RELATIVE_ACTIVITY";
  referencePeakSolarLongitudeDeg: number;
  currentSolarLongitudeDeg: number;
  relativeActivity: number;
  stage: MeteorActivityStage;
  samples: readonly {
    solarLongitudeDeg: number;
    relativeActivity: number;
  }[];
  source: SourceSummary;
  limitations: readonly string[];
}

export interface SkyTarget {
  targetId: string;
  displayName: string;
  type:
    | "STAR"
    | "PLANET"
    | "CONSTELLATION"
    | "MILKY_WAY"
    | "METEOR_SHOWER"
    | "CONJUNCTION";
  window: { start: string; end: string } | null;
  direction: string;
  altitudeDeg: number | null;
  reason: string;
  source: SourceSummary;
  confidence: number | null;
  activity?: MeteorActivityEvidence | null;
}

/**
 * Actionable sky targets projected for one exact SkyReport time slice.
 *
 * The `at` value is required to equal one `SkyReport.hourly[].at` value.  The
 * BFF owns every target calculation; the Mini Program may only project the
 * returned directions into its sensor-relative viewport.
 */
export interface SkyTargetFrame {
  at: string;
  targets: readonly SkyTarget[];
}

export interface SkyOpportunitySliceInput {
  at: string;
  eventActivity: number | null;
  targetVisibility: number;
  darkness: number;
  moonPenalty: number;
  weatherTransmission: number | null;
  lightPollution: number | null;
  horizonSuitability: number | null;
  dataConfidence: number;
  hardBlockers: readonly string[];
}

export interface HourlySkyRow {
  at: string;
  /** Actual provider hour used here; astronomy at stays independent. Null means no matching source hour. */
  weatherAt: string | null;
  cloudPercent: number | null;
  precipitationMm: number | null;
  precipitationProbabilityPercent: number | null;
  windKph: number | null;
  windGustKph: number | null;
  windDirectionDeg: number | null;
  temperatureC: number | null;
  relativeHumidityPercent: number | null;
  dewPointC: number | null;
  visibilityKm: number | null;
  moonAltitudeDeg: number | null;
  moonIllumination: number | null;
  moonPhase: MoonPhaseKey | null;
  moonPhaseAngleDeg: number | null;
  darkness: "DAY" | "TWILIGHT" | "ASTRONOMICAL_NIGHT";
  opportunityScore: number | null;
  opportunityConfidence: number | null;
  opportunityEligible: boolean;
  opportunityBlockers: readonly string[];
  opportunityInput: SkyOpportunitySliceInput;
  state: DataState;
}

export interface WeatherAlertEvidence {
  /** Original issuing authority, when supplied; never infer it from a headline. */
  senderName?: string | null;
  id: string;
  headline: string;
  description: string;
  instruction: string | null;
  eventName: string;
  eventCode: string;
  severity: string;
  urgency: string | null;
  certainty: string | null;
  issuedAt: string;
  effectiveAt: string | null;
  expiresAt: string | null;
  status: "ACTIVE" | "CANCELLED" | "EXPIRED" | "UNKNOWN";
  material: boolean;
  sourceId: string;
}

export interface WeatherModelRunEvidence {
  provider: string;
  modelKey: string;
  modelRunAt: string | null;
  fetchedAt: string;
  validFrom: string | null;
  validTo: string | null;
  nativeSpatialResolutionKm: number | null;
  nativeTemporalResolutionMinutes: number | null;
  outputTemporalResolutionMinutes: number;
  interpolatedVariables: readonly string[];
  state: DataState;
  sourceId: string;
}

export interface WeatherEvidenceSummary {
  timelineRole: "PRIMARY" | "PRIMARY_FALLBACK" | "UNAVAILABLE";
  warningState: DataState;
  /** Feed freshness, independently of forecast hours and individual alert expiry. */
  warningSource?: SourceSummary;
  alerts: readonly WeatherAlertEvidence[];
  modelRuns: readonly WeatherModelRunEvidence[];
}

export type MoonPhaseKey =
  | "NEW"
  | "WAXING_CRESCENT"
  | "FIRST_QUARTER"
  | "WAXING_GIBBOUS"
  | "FULL"
  | "WANING_GIBBOUS"
  | "LAST_QUARTER"
  | "WANING_CRESCENT";

export interface LunarFacts {
  phase: MoonPhaseKey | null;
  phaseAngleDeg: number | null;
  illumination: number | null;
  altitudeDeg: number | null;
  moonriseAt: string | null;
  moonsetAt: string | null;
  source: SourceSummary;
}

/** Rendering metadata decoded from the static publication; B-V retains its source band. */
export interface SkySceneCatalogEntry {
  sourceId: string;
  /** Stable namespace-bound identity; independent from pack order/version. */
  objectRef: string;
  displayName: string | null;
  magnitude: number;
  magnitudeBand: "V";
  colorIndex: number | null;
  colorIndexBand: "B-V";
}

/**
 * One locally resolved star in the exact selected time slice.
 * The index belongs to the attached static publication. Dynamic reports carry
 * geometry transforms instead of arrays of these points.
 */
export type SkyScenePoint = readonly [
  catalogIndex: number,
  azimuthDeg: number,
  altitudeDeg: number,
];

export interface SkySceneCatalog {
  catalogVersion: string;
  catalogHash: string;
  magnitudeLimit: number;
  sources: readonly SourceSummary[];
  entries: readonly SkySceneCatalogEntry[];
}

export interface DeepSkySceneCatalogEntry {
  objectRef: string;
  displayName: string;
  kind: "GALAXY" | "NEBULA";
  aliases: readonly string[];
  magnitude: number | null;
  magnitudeBand: "V" | null;
  majorAxisArcmin: number | null;
  minorAxisArcmin: number | null;
  positionAngleDeg: number | null;
}

/** Center plus two ICRS tangent-plane samples for native image registration. */
export type DeepSkyScenePoint = readonly [
  catalogIndex: number,
  azimuthDeg: number,
  altitudeDeg: number,
  northAzimuthDeg: number,
  northAltitudeDeg: number,
  eastAzimuthDeg: number,
  eastAltitudeDeg: number,
];

export interface DeepSkySceneFrame {
  at: string;
  state: "AVAILABLE" | "UNAVAILABLE";
  points: readonly DeepSkyScenePoint[] | null;
}

export interface DeepSkySceneCatalog {
  catalogVersion: string;
  catalogHash: string;
  frame: "ICRS J2000";
  /** Absent on older cached scenes: retain object facts, refresh before image registration. */
  imageRegistration?: "ICRS_TAN_NORTH_0_1_V1";
  sources: readonly SourceSummary[];
  entries: readonly DeepSkySceneCatalogEntry[];
}

export interface DeepSkyScene {
  state: "AVAILABLE" | "UNAVAILABLE";
  catalog: DeepSkySceneCatalog | null;
  frames: readonly DeepSkySceneFrame[];
  unavailableReason: string | null;
}

export type CelestialObjectKind = "STAR" | "PLANET" | "GALAXY" | "NEBULA" | "MILKY_WAY";

export interface CelestialObjectFact {
  label: string;
  value: string;
  unit: string | null;
}

export interface CelestialObjectInformation {
  reference: string;
  kind: CelestialObjectKind;
  displayName: string;
  catalogId: string;
  aliases: readonly string[];
  introduction: string | null;
  facts: readonly CelestialObjectFact[];
  contentState: "READY" | "BASIC_ONLY";
  contentRevision: string;
  sources: readonly SourceSummary[];
  limitations: readonly string[];
}

/**
 * Real catalog-backed scene data.  Unavailable scenes retain one explicit
 * unavailable frame per returned hourly slice and never contain a picture,
 * random points, stale coordinates or a sampled decorative substitute.
 */
export type { SkyScene, SkySceneFrame, SkySceneCatalogReference } from "./stellar-scene.ts";
import type { SkyScene } from "./stellar-scene.ts";

export interface SkyReport {
  context: SpotSkyContext;
  decision: TripDecision;
  targets: readonly SkyTarget[];
  targetFrames: readonly SkyTargetFrame[];
  hourly: readonly HourlySkyRow[];
  milkyWayDirection: string;
  moonSummary: string;
  lunarFacts: LunarFacts;
  /** Computed observation-night bounds; optional for older cached reports. */
  nightFacts?: {
    startAt: string;
    endAt: string;
    astronomicalDuskAt: string | null;
    astronomicalDawnAt: string | null;
  };
  compass: {
    state: "UNAVAILABLE" | "LOW_ACCURACY" | "READY";
    manualOffsetDeg: number;
  };
  precachedHours: number;
  offlineReady: boolean;
  weatherEvidence: WeatherEvidenceSummary;
  skyScene: SkyScene;
  sources: readonly SourceSummary[];
}

export type DisplayMode = "DAY" | "NIGHT" | "OBSERVATION";

export interface UserPreferences {
  defaultPlace: string;
  locationPreference: "ASK_ONCE" | "MANUAL_ONLY";
  experience: "BEGINNER" | "ADVANCED";
  maxDriveMinutes: number;
  requiredFacilities: readonly FacilityType[];
  equipment: string;
  capturePreference: string;
  displayMode: DisplayMode;
  notificationEnabled: boolean;
  departureConditionReminder: boolean;
  contributionStatusReminder: boolean;
  largeText: boolean;
  reducedMotion: boolean;
}

export interface ObservationPlan {
  reminders?: readonly import("./plan-reminders.ts").PlanReminder[];
  /** Absent only on records awaiting the observing-interval migration. Never infer an end. */
  timing?: import("./plan.ts").PlanTiming;
  /** Absent only on records awaiting the departure-arrangement migration. */
  travel?: import("./plan.ts").PlanTravel;
  /** Explicit catalog occurrences selected for this plan; absent on legacy records. */
  eventOccurrenceIds?: readonly string[];
  planId: PlanId;
  spotId: SpotId;
  localDate: string;
  localTime: string;
  notes: string;
  contextSnapshot: ObservationContextSnapshot;
  revision: number;
  updatedAt: string;
}

export interface ObservationContextSnapshotV1 {
  schemaVersion: "observation-context-snapshot-v1";
  contextId: ObservationContextId;
  contextFingerprint: string;
  contextRevision: number;
  spotId: SpotId;
  timezone: string;
  localDate: string;
  selectedAtUtc: string;
  eventInstanceId: string | null;
  algorithmVersions: ObservationContext["algorithmVersions"];
  capturedAt: string;
}

export interface ObservationContextSnapshotV2
  extends Omit<ObservationContextSnapshotV1, "schemaVersion"> {
  schemaVersion: "observation-context-snapshot-v2";
  routeOrigin: Pick<
    NonNullable<ObservationContext["routeOrigin"]>,
    "displayName" | "wgs84" | "source"
  > | null;
}

export type ObservationContextSnapshot =
  | ObservationContextSnapshotV1
  | ObservationContextSnapshotV2;

export type PlatformKind =
  | "XIAOHONGSHU"
  | "WEIBO"
  | "WECHAT_CHANNELS"
  | "OTHER";
export interface ProfileLink {
  profileLinkId: ProfileLinkId;
  platform: PlatformKind;
  displayName: string;
  url: string;
  visibility: "PRIVATE" | "PUBLIC";
  sortOrder: number;
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
  updatedAt: string;
}

export type ImportStage =
  | "SOURCE"
  | "EDIT_DRAFT"
  | "ASSOCIATE_SPOT"
  | "PREVIEW"
  | "SUBMIT";
export interface ImportField<T> {
  value: T;
  revision: number;
  editedByUser: boolean;
}
export interface ImportDraft {
  importDraftId: ImportDraftId;
  stage: ImportStage;
  platform: PlatformKind;
  originalUrl: string;
  rightsConfirmed: boolean;
  importedAt: string;
  parseState:
    | "NOT_REQUESTED"
    | "GATED"
    | "RUNNING"
    | "PARTIAL"
    | "FAILED"
    | "COMPLETE";
  parseReason: string;
  title: ImportField<string>;
  body: ImportField<string>;
  sourceNote: ImportField<string>;
  visibility: ImportField<"PRIVATE" | "PUBLIC">;
  spotId: SpotId | null;
  spotProposalId: SpotProposalId | null;
  moderationState: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  proposalReviewState:
    | "NOT_APPLICABLE"
    | "DRAFT"
    | "PENDING"
    | "APPROVED"
    | "REJECTED";
  revision: number;
}

export type ContributionKind =
  | "FIELD_REPORT"
  | "CORRECTION"
  | "NEW_SPOT_PROPOSAL";

export type ContributionTopic =
  | "LAST_ROAD"
  | "PARKING"
  | "FACILITIES"
  | "OPENNESS"
  | "LEGAL_ACCESS"
  | "NIGHT_SAFETY"
  | "HORIZON"
  | "SITE_MEDIA"
  | "OTHER";

export type ContributionState =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "CHANGES_REQUESTED"
  | "ACCEPTED"
  | "WITHDRAWN"
  // Kept as a wire-compatible alias for the first persisted API version.
  | "APPROVED"
  | "REJECTED";

export type ContributionSubmissionState =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "CHANGES_REQUESTED"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN";

export type ContributionMergeState =
  | "NOT_STARTED"
  | "READY"
  | "MERGED"
  | "SUPERSEDED";

export type ContributionPublicationImpact =
  | "NONE"
  | "CANDIDATE_UPDATED"
  | "ACTIVE_REVISION_UPDATED"
  | "SPOT_PUBLISHED";

export interface ContributionCandidateLocation {
  displayName: string;
  region: string;
  wgs84: Wgs84Point;
}

export interface ContributionMediaUpload {
  uploadId: ContributionUploadId;
  /** Required for new-place proposals so each photo remains in its adopted section. */
  kind?: import("./contribution-feedback.ts").ContributionMediaKind;
  state: "PENDING" | "UPLOADED" | "ATTACHED" | "EXPIRED";
  originalName: string;
  mimeType: "image/jpeg" | "image/png";
  declaredByteSize: number;
  byteSize: number | null;
  sha256: string | null;
  createdAt: string;
  expiresAt: string;
  uploadedAt: string | null;
}

export interface ContributionReview {
  resolution: "ACCEPTED" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
  reason: string;
  reviewedAt: string;
}

export interface ContributionStatusHistoryEntry {
  eventId: string;
  axis: "SUBMISSION" | "MERGE" | "PUBLICATION";
  from: string | null;
  to: string;
  reason: string | null;
  actorType: "USER" | "OPERATOR" | "SYSTEM";
  occurredAt: string;
}

export interface ContributionAttemptSnapshot {
  kind: ContributionKind;
  spotId: SpotId | null;
  spotNameSnapshot: string | null;
  candidateLocation: ContributionCandidateLocation | null;
  observedAt: string | null;
  topics: readonly ContributionTopic[];
  detail: string;
  rightsConfirmed: boolean;
  preciseLocationConsent: boolean;
  media: readonly ContributionMediaUpload[];
  candidateProfile?: import("./contribution-feedback.ts").ContributionFormalProposal;
  formalFeedback?: import("./contribution-feedback.ts").ContributionFormalFeedbackSnapshot;
}

/** One immutable submission; edits made after review remain on the parent aggregate. */
export interface ContributionAttempt {
  attemptId: string;
  attemptNo: number;
  baseRevision: number;
  submittedAt: string;
  snapshot: ContributionAttemptSnapshot;
  review: ContributionReview | null;
}

export interface ContributionSubmission {
  submissionId: ContributionId;
  kind: ContributionKind;
  spotId: SpotId | null;
  spotNameSnapshot: string | null;
  candidateLocation: ContributionCandidateLocation | null;
  observedAt: string | null;
  topics: readonly ContributionTopic[];
  detail: string;
  rightsConfirmed: boolean;
  preciseLocationConsent: boolean;
  media: readonly ContributionMediaUpload[];
  candidateProfile?: import("./contribution-feedback.ts").ContributionFormalProposal;
  state: ContributionState;
  submissionState: ContributionSubmissionState;
  mergeState: ContributionMergeState;
  publicationImpact: ContributionPublicationImpact;
  statusHistory: readonly ContributionStatusHistoryEntry[];
  attempts: readonly ContributionAttempt[];
  workingCopyFromAttemptId: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
  review: ContributionReview | null;
  formalFeedback?: import("./contribution-feedback.ts").ContributionFormalFeedbackSnapshot;
}

export type AdminRole =
  | "OWNER"
  | "MODERATOR"
  | "MEDIA_REVIEWER"
  | "PUBLISHER"
  | "AUDITOR";

export type AdminOperation =
  | "QUEUE_READ"
  | "CASE_READ"
  | "CASE_REVIEW"
  | "MEDIA_READ"
  | "MEDIA_REVIEW"
  | "MERGE_PREVIEW"
  | "MERGE_COMMIT"
  | "PUBLICATION_ASSESS"
  | "PUBLISH"
  | "SUSPEND"
  | "UNPUBLISH"
  | "REPLACE"
  | "RETIRE"
  | "AUDIT_READ"
  | "EVENT_CATALOG_READ"
  | "EVENT_CATALOG_IMPORT"
  | "EVENT_CATALOG_REVIEW"
  | "EVENT_CATALOG_PUBLISH"
  | "EVENT_CATALOG_ROLLBACK"
  | "EVENT_CATALOG_SOURCE_MANAGE"
  | "EVENT_CATALOG_RERUN";

export interface OperationReceipt<T = unknown> {
  receiptId: OperationReceiptId;
  operation: string;
  status: "COMMITTED" | "REPLAYED" | "REJECTED";
  actorId: string;
  idempotencyKey: string;
  requestId: string;
  committedAt: string;
  resultingRevision: number | null;
  assessmentDigest: string | null;
  readback: T | null;
}

export interface AdminMutationResult<T> {
  result: T;
  receipt: OperationReceipt<T>;
  readback: T;
}

export interface ModerationQueueItem {
  caseId: ModerationCaseId;
  subjectType: "USER_CONTRIBUTION" | "IMPORT";
  subjectId: string;
  state: "PENDING" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
  kind: ContributionKind | null;
  priority: "HIGH" | "NORMAL" | "LOW";
  riskFlags: readonly string[];
  ageSeconds: number;
  createdAt: string;
  spotId: SpotId | null;
}

export interface ModerationCaseView {
  caseId: ModerationCaseId;
  subjectType: "USER_CONTRIBUTION" | "IMPORT";
  subjectId: string;
  state: ModerationQueueItem["state"];
  submission: ContributionSubmission | null;
  events: readonly ContributionStatusHistoryEntry[];
  immutableEvidence: {
    detail: string | null;
    candidateLocation: ContributionCandidateLocation | null;
    media: readonly ContributionMediaUpload[];
  };
  canonicalMergeRequired: boolean;
  publicationGateRequired: boolean;
  createdAt: string;
  resolvedAt: string | null;
}

export interface MediaReviewView {
  uploadId: ContributionUploadId;
  submissionId: ContributionId;
  state: ContributionMediaUpload["state"] | "ACCEPTED" | "REJECTED";
  mimeType: ContributionMediaUpload["mimeType"];
  byteSize: number | null;
  sha256: string | null;
  sanitized: true;
  exifRemoved: true;
  rightsConfirmed: boolean;
  decision: "ACCEPTED" | "REJECTED" | null;
  decisionReason: string | null;
}

export interface MergeClaimPreview {
  /** Stable key returned to Operations so the commit binds the selected claim. */
  claimId: string;
  claim: string;
  currentValue: unknown;
  candidateValue: unknown;
  sourceIds: readonly string[];
  conflict: boolean;
  disposition: "ALLOW" | "REQUIRES_CONFIRMATION" | "REJECT";
}

export interface MergePreview {
  caseId: ModerationCaseId;
  submissionId: ContributionId;
  spotId: SpotId;
  submissionRevision: number;
  spotRevision: number;
  claims: readonly MergeClaimPreview[];
  candidateRevision: number;
  publicationAssessment: string;
  readOnly: true;
}

export interface PublicationAssessment {
  spotId: SpotId;
  spotRevision: number;
  assessmentDigest: string;
  complete: boolean;
  blockers: readonly string[];
  checkedAt: string;
  checkedBy: string;
  projectionDigest: string;
}

export interface SpotRevisionSummary {
  revisionId: SpotRevisionId;
  spotId: SpotId;
  revisionNo: number;
  payloadDigest: string;
  sourceIds: readonly string[];
  createdBy: string;
  reason: string;
  createdAt: string;
  active: boolean;
}

export interface ReplacementImpact {
  spotId: SpotId;
  successorSpotId: SpotId | null;
  favoriteCount: number;
  planCount: number;
  relationState: "PREVIEW" | "COMMITTED" | "NO_SUCCESSOR";
  warnings: readonly string[];
}
