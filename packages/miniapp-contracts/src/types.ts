export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type SpotId = Brand<string, "SpotId">;
export type ProfileLinkId = Brand<string, "ProfileLinkId">;
export type PlanId = Brand<string, "PlanId">;
export type ImportDraftId = Brand<string, "ImportDraftId">;
export type SpotProposalId = Brand<string, "SpotProposalId">;

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
  | "PRODUCT_CALCULATION"
  | "OFFICIAL_VERIFICATION"
  | "USER_FIELD_REPORT"
  | "HISTORICAL_RECORD"
  | "OPEN_DATA"
  | "DEMO_FIXTURE";

export interface SourceSummary {
  id: string;
  kind: SourceKind;
  provider: string;
  title: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  publishedAt: string | null;
  retrievedAt: string;
  validFrom: string | null;
  validTo: string | null;
  state: DataState;
  confidence: number | null;
  precision: string;
  limitations: readonly string[];
}

export interface ApiEnvelope<T> {
  apiVersion: "v1";
  data: T;
  dataState: DataState;
  generatedAt: string;
  etag: string;
  sources: readonly SourceSummary[];
  warnings: readonly string[];
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
  status: "PUBLISHED" | "TEMPORARILY_CLOSED" | "DATA_INSUFFICIENT";
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

export interface RouteOverview {
  kind: "ROUTE_ESTIMATE" | "STRAIGHT_LINE_ONLY" | "UNAVAILABLE";
  distanceKm: number | null;
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

export interface TonightDecision {
  recommendation:
    | "RECOMMEND"
    | "CONSIDER"
    | "NOT_RECOMMENDED"
    | "DATA_INSUFFICIENT";
  label: string;
  bestWindow: { start: string; end: string } | null;
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
  algorithmVersion: string;
  inputDigest: string;
}

export interface SpotDetail {
  spot: SpotSummary;
  route: RouteOverview;
  decision: TonightDecision;
  guides: readonly GuideArticle[];
  siteSafety: readonly string[];
  dataDisclosure: readonly SourceSummary[];
}

export interface SpotSkyContext {
  spotId: SpotId;
  localDate: string;
  at: string | null;
  timezone: string;
  targetProfile: "BEGINNER" | "PHOTOGRAPHER" | "ADVANCED";
  dataRevision: string;
  algorithmVersion: string;
  catalogVersion: string;
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
}

export interface HourlySkyRow {
  at: string;
  cloudPercent: number | null;
  precipitationMm: number | null;
  windKph: number | null;
  temperatureC: number | null;
  visibilityKm: number | null;
  moonAltitudeDeg: number | null;
  moonIllumination: number | null;
  darkness: "DAY" | "TWILIGHT" | "ASTRONOMICAL_NIGHT";
  state: DataState;
}

export interface SkyReport {
  context: SpotSkyContext;
  decision: TonightDecision;
  targets: readonly SkyTarget[];
  hourly: readonly HourlySkyRow[];
  milkyWayDirection: string;
  moonSummary: string;
  compass: {
    state: "UNAVAILABLE" | "LOW_ACCURACY" | "READY";
    manualOffsetDeg: number;
  };
  precachedHours: number;
  offlineReady: boolean;
  sources: readonly SourceSummary[];
}

export type MyTab = "MY" | "FAVORITES" | "PLAN" | "SETTINGS";
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
  largeText: boolean;
  reducedMotion: boolean;
}

export interface ObservationPlan {
  planId: PlanId;
  spotId: SpotId;
  localDate: string;
  localTime: string;
  notes: string;
  revision: number;
  updatedAt: string;
}

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
