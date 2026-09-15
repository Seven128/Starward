import type { AccountAvatarData, AccountAvatarSaveRequest, AccountProfileRecord } from "./account-profile.ts";
import type { FeatureFlags } from "./feature-flags.ts";
import type { FilterGroupKey, FilterState } from "./filters.ts";
import type { ContributionFormalProposal } from "./contribution-feedback.ts";
import type { PreferenceRankingDisclosure, SpotRankingPreferences } from "./ranking.ts";
import type {
  AccessAndSafetyState,
  ContributionCandidateLocation,
  ContributionKind,
  ContributionMediaUpload,
  ContributionSubmission,
  ContributionUploadId,
  AdminMutationResult,
  MergePreview,
  ModerationCaseView,
  ModerationQueueItem,
  MediaReviewView,
  PublicationAssessment,
  ReplacementImpact,
  SpotRevisionSummary,
  ContributionTopic,
  FactEvidence,
  FacilityEvidence,
  GuideArticle,
  ImportDraft,
  ImportStage,
  ObservationPlan,
  ObservationContext,
  ObservationContextResolveRequest,
  ObservationContextUpdateRequest,
  PlatformKind,
  ProfileLink,
  RepresentativeMedia,
  RouteOverview,
  RouteTravelMode,
  SkyReport,
  SiteMediaState,
  SpotDetail,
  SpotId,
  SpotSummary,
  SourceSummary,
  AuthSessionData,
  CelestialObjectInformation,
  WechatLoginRequest,
  UserId,
} from "./types.ts";
import type { UserPreferences } from "./types.ts";
import type { UserPreferencesRecord } from "./preferences.ts";

export type MapLayerKind =
  | "NORMAL"
  | "LIGHT_POLLUTION"
  | "CLOUD"
  | "OPPORTUNITY";

export type CelestialObjectInformationData = CelestialObjectInformation;
/** Binary JPEG body; this route intentionally does not use ApiEnvelope at runtime. */
export type CelestialObjectImageData = Uint8Array;

export type MapProjectionState =
  | "FRESH"
  | "STALE_USABLE"
  | "PARTIAL"
  | "UNAVAILABLE";

export interface MapLayerPolygon {
  id: string;
  points: readonly { latitude: number; longitude: number }[];
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  value: number | null;
  label: string;
  state: MapProjectionState;
}

export interface MapLayerData {
  kind: MapLayerKind;
  cloudLayer: ObservationContext["weatherView"]["cloudLayer"] | null;
  polygons: readonly MapLayerPolygon[];
  legend: readonly { label: string; color: string; range: string }[];
  validAt: string | null;
  datasetVersion: string;
  precision: string;
  state: MapProjectionState;
  source: SourceSummary | null;
}

export type TerrainProjectionState = "AVAILABLE" | "PARTIAL" | "UNAVAILABLE";

export interface TerrainOverlayRequest {
  purpose: "MAP" | "SPOT";
  center: { system: "GCJ02"; latitude: number; longitude: number };
  radiusKm: number;
}

export interface TerrainLightCell {
  id: string;
  boundsGcj02: { west: number; south: number; east: number; north: number };
  color: string;
  label: string;
  radiance: number;
  unit: "nW/cm²/sr";
}

export interface TerrainOverlayData {
  state: TerrainProjectionState;
  /** Missing coverage has no failureCode; failures remain independently recoverable. */
  failureCode?: "TERRAIN_READ_FAILED";
  purpose: TerrainOverlayRequest["purpose"];
  requestedRadiusKm: number;
  effectiveRadiusKm: number | null;
  centerGcj02: TerrainOverlayRequest["center"];
  publicationId: string | null;
  datasetVersion: string | null;
  sourceProvider: string | null;
  sourceResolution: string | null;
  derivedResolutionM: number | null;
  derivedAt: string | null;
  coordinateTransformVersion: string | null;
  imageUrl: string | null;
  imageBoundsGcj02: { west: number; south: number; east: number; north: number } | null;
  elevationM: { minimum: number; maximum: number } | null;
  coverageLabel: string;
  limitations: readonly string[];
  /** Source and redistribution notices for the derived terrain product. */
  source: SourceSummary | null;
  lightPollution: {
    state: TerrainProjectionState;
    failureCode?: "LIGHT_READ_FAILED";
    datasetVersion: string;
    cells: readonly TerrainLightCell[];
    legend: readonly { label: string; color: string }[];
    source: SourceSummary | null;
    coverageLabel: string;
  };
}

/** Binary PNG body; this route intentionally does not use ApiEnvelope at runtime. */
export type TerrainAssetData = Uint8Array;

export interface MapSpotTimeSignal {
  spotId: SpotSummary["spotId"];
  weatherAt: string | null;
  cloudPercent: number | null;
  moonImpact: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  opportunityScore: number | null;
  opportunityConfidence: number | null;
  opportunityEligible: boolean;
  opportunityLabel: string;
  state: MapProjectionState;
}

export interface MapSpotEvaluation extends MapSpotTimeSignal {
  recommendation: SpotDetail["decision"]["recommendation"];
  bestWindowMinutes: number | null;
  activeEventIds: readonly string[];
  distanceKm: number | null;
  driveMinutes: number | null;
  distanceKind: "ROUTE" | "STRAIGHT_LINE" | "UNAVAILABLE";
  lunarFacts: import("./types.ts").LunarFacts;
}

export type FilterMatchState = "MATCH" | "NO_MATCH" | "UNKNOWN";

export interface FilterCandidateEvidence {
  state: FilterMatchState;
  reason: string;
}

export type SpotFilterEvidence = Readonly<
  Record<FilterGroupKey, FilterCandidateEvidence>
>;

export interface MapSceneTimeFrame {
  atUtc: string;
  moonPhase: import("./types.ts").MoonPhaseKey | null;
  spotSignals: Readonly<Record<string, MapSpotTimeSignal>>;
  dynamicLayer: {
    kind: "CLOUD" | "OPPORTUNITY";
    polygons: readonly MapLayerPolygon[];
    state: MapProjectionState;
  } | null;
}

export interface FormalSpotPopulation {
  key: string;
  eligibleCount: number;
  excludedCount: number;
  stableIds: readonly SpotSummary["spotId"][];
  regionPolicy: string;
  source: string;
}

export interface CapabilitiesData {
  flags: FeatureFlags;
  parser: Readonly<Record<string, unknown>>;
  externalOpen: { enabled: boolean; copyFallback: true; reason: string };
  routeProvider: { enabled: boolean; externalMapFallback: true; reason: string };
  placeSearch: { enabled: boolean; reason: string };
  weatherProvider: { enabled: boolean; cachedFallback: boolean; reason: string };
  mediaUpload: { enabled: boolean; manualTextDraft: true; reason: string };
}

export interface MapSceneRequest {
  contextId: string;
  filters: FilterState;
  query: string;
  layer: MapLayerKind;
  cloudLayer: ObservationContext["weatherView"]["cloudLayer"];
  viewport?: {
    center: { latitude: number; longitude: number };
    zoom: number;
  };
  preferences?: SpotRankingPreferences;
}

export interface RouteEstimateRequest {
  contextId: ObservationContext["contextId"];
  spotId: SpotSummary["spotId"];
  /** Omitted by older clients and Map consumers, which continue to mean driving. */
  travelMode?: RouteTravelMode;
  departureLocalDate?: string;
  departureLocalTime?: string;
}

export type RouteEstimateData = RouteOverview;

export interface MapSceneData {
  context: ObservationContext;
  spots: readonly SpotSummary[];
  evaluations: Readonly<Record<string, MapSpotEvaluation>>;
  /** Server-owned, selected-time evidence for each returned formal spot. */
  filterEvidence: Readonly<Record<string, SpotFilterEvidence>>;
  favoriteSpotIds: readonly SpotSummary["spotId"][] | null;
  preferenceRanking: PreferenceRankingDisclosure;
  filterCapabilities: {
    driveTime: {
      state: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE";
      reason: string;
      recovery: "NONE" | "REMOVE_DRIVE_TIME_FILTER";
    };
    byGroup: Readonly<
      Record<
        FilterGroupKey,
        {
          state: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE";
          reason: string;
        }
      >
    >;
  };
  population: FormalSpotPopulation;
  viewportMode: string;
  viewport: {
    coordinateSystem: "GCJ02";
    center: { latitude: number; longitude: number };
    zoom: number;
    radiusKm: number;
    eligibleInViewport: number;
    excludedOutsideViewport: number;
  } | null;
  clusterBelowZoom: number;
  debounceMs: number;
  requestCancellation: string;
  layer: MapLayerData;
  timeFrames: readonly MapSceneTimeFrame[];
}

export interface FavoritesData {
  favorites: readonly SpotSummary[];
  sortOptions: readonly string[];
  canonicalDetailRoute: string;
}

export interface SearchMapPoint {
  system: "GCJ02";
  latitude: number;
  longitude: number;
}

export interface OrdinaryPlaceRef {
  placeId: string;
  label: string;
  address: string;
  region: string;
  kind: "ORDINARY_PLACE";
  location: SearchMapPoint;
  actions: readonly ["MOVE_MAP", "FIND_NEARBY_FORMAL_SPOTS"];
  spotId: null;
  nightSkyAllowed: false;
  dataState: "FRESH" | "PARTIAL";
  source: SourceSummary;
}

export interface DarkSkyCandidateRef {
  candidateId: string;
  label: string;
  address: string;
  region: string;
  kind: "DARK_SKY_CANDIDATE";
  location: SearchMapPoint;
  actions: readonly ["MOVE_MAP", "FIND_NEARBY_FORMAL_SPOTS"];
  spotId: null;
  nightSkyAllowed: false;
  dataState: "PARTIAL";
  source: SourceSummary;
}

export interface SearchData {
  formalSpots: readonly SpotSummary[];
  candidates: readonly DarkSkyCandidateRef[];
  ordinaryPlaces: readonly OrdinaryPlaceRef[];
  history: readonly { label: string; clearable: true }[];
}

export interface SpotGuidesData {
  spotId: string;
  guides: readonly GuideArticle[];
}

export interface SpotSiteData {
  spotId: string;
  media: readonly RepresentativeMedia[];
  facilities: readonly FacilityEvidence[];
  accessAndSafety: AccessAndSafetyState;
  siteMediaState: SiteMediaState;
  evidence: readonly FactEvidence[];
  sources: readonly SourceSummary[];
  /** Reviewed access facts; absent only on older API versions. No road estimates. */
  arrival?: Pick<RouteOverview, "lastRoad" | "parkingGuidance" | "source">;
}

export interface UserLibraryData {
  planSpots?: readonly Pick<SpotSummary, "spotId" | "name">[];
  favoriteSpots: readonly SpotSummary[];
  plans: readonly ObservationPlan[];
  profileLinks: readonly ProfileLink[];
  preferences: UserPreferencesRecord;
  latestImportDraft: ImportDraft | null;
}

export interface PlansData {
  planSpots?: readonly Pick<SpotSummary, "spotId" | "name">[];
  plans: readonly ObservationPlan[];
  reminderNotifications: readonly import("./plan-reminders.ts").PlanReminderNotificationStatus[];
}

/** Reviewed editorial text; numerical event data retains its own independent source. */
export interface AstronomicalEventArticle {
  title: string;
  paragraphs: readonly string[];
  sourceId: string;
  originalUrl: string;
  authorName: string | null;
  /** Original date precision is retained, including a date without a timezone. */
  publishedTime: string | null;
  retrievedAt: string;
  inputSha256: string | null;
  parserVersion: string;
}

export interface AstronomicalEventBase {
  occurrenceId: string;
  eventId: string;
  code: string;
  displayName: string;
  activeStartDate: string;
  activeEndDate: string;
  peakDate: string;
  peakAtUtc: string | null;
  /** Binds an occurrence to its exact source in the versioned catalog package. */
  sourceId?: string;
  /** Included only by event detail, never by the list projection. */
  article?: AstronomicalEventArticle;
}

export interface MeteorRadiantDriftModel {
  frame: "SUN_CENTERED_ECLIPTIC_J2000";
  referenceSolarLongitudeDeg: number;
  sunCenteredLongitudeDeg: number;
  latitudeDeg: number;
  longitudeDriftDegPerDeg: number;
  latitudeDriftDegPerDeg: number;
  validSolarOffsetMinDeg: number;
  validSolarOffsetMaxDeg: number;
}

export interface MeteorAnnualReference {
  kind: "GMN_ANNUAL_MONITORING_REFERENCE";
  dateTimezone: "UTC";
  solarLongitudeStartDeg: number;
  solarLongitudeReferenceDeg: number;
  solarLongitudeEndDeg: number;
  /** Null means direction is unavailable; the event and date reference remain. */
  radiantDrift: MeteorRadiantDriftModel | null;
}

export interface MeteorShowerOccurrence extends AstronomicalEventBase {
  kind: "METEOR_SHOWER";
  iauNumber: number;
  radiantRightAscensionDeg: number | null;
  radiantDeclinationDeg: number | null;
  velocityKmPerSecond: number | null;
  populationIndex: number;
  nominalPeakZhr: number | null;
  /** When present, peakDate is an annual reference date, never an annual forecast. */
  annualReference?: MeteorAnnualReference;
}

export interface EclipseOccurrence extends AstronomicalEventBase {
  kind: "LUNAR_ECLIPSE" | "SOLAR_ECLIPSE";
  eclipseKind: "PENUMBRAL" | "PARTIAL" | "ANNULAR" | "TOTAL";
  obscuration: number | null;
  phaseTimesUtc: Readonly<Partial<Record<
    "PENUMBRAL_BEGIN" | "PARTIAL_BEGIN" | "TOTAL_BEGIN" | "PEAK" |
    "TOTAL_END" | "PARTIAL_END" | "PENUMBRAL_END",
    string
  >>>;
}

export type AstronomicalEventOccurrence = MeteorShowerOccurrence | EclipseOccurrence;

export interface AstronomicalEventLocalPhase {
  key: "PENUMBRAL_BEGIN" | "PARTIAL_BEGIN" | "TOTAL_BEGIN" | "PEAK" |
    "TOTAL_END" | "PARTIAL_END" | "PENUMBRAL_END";
  atUtc: string;
  localDateTime: string;
  altitudeDeg: number;
}

export interface AstronomicalEventLocalVisibility {
  state: "AVAILABLE" | "NOT_VISIBLE" | "UNAVAILABLE";
  reason: string;
  locationName?: string;
  timezone?: string;
  localDate?: string;
  bestWindowStartUtc?: string | null;
  bestWindowEndUtc?: string | null;
  bestAtUtc?: string | null;
  bestWindowStartLocal?: string | null;
  bestWindowEndLocal?: string | null;
  bestAtLocal?: string | null;
  bestAltitudeDeg?: number | null;
  bestAzimuthDeg?: number | null;
  moonIllumination?: number | null;
  phases?: readonly AstronomicalEventLocalPhase[];
  constraints?: readonly string[];
  algorithmVersion?: string;
}

export interface AstronomicalEventsData {
  catalogVersion: string;
  coverage: "REVIEWED_2026_METEOR_AND_ECLIPSE_EVENTS" | "ANNUAL_METEOR_REFERENCES_AND_ECLIPSES";
  events: readonly AstronomicalEventOccurrence[];
  sources: readonly SourceSummary[];
}

export interface AstronomicalEventDetailData {
  catalogVersion: string;
  event: AstronomicalEventOccurrence;
  localVisibility: AstronomicalEventLocalVisibility;
  source: SourceSummary;
  articleSource?: SourceSummary;
}

export interface ProfileLinksData {
  links: readonly ProfileLink[];
  tryOpenEnabled: boolean;
  copyFallback: true;
}

export interface FavoriteMutationRequest {
  favorite: boolean;
}

export interface PlanSaveRequest {
  reminders?: readonly import("./plan-reminders.ts").PlanReminder[];
  timing?: import("./plan.ts").PlanTiming;
  spotId: ObservationPlan["spotId"];
  observationContextId: ObservationContext["contextId"];
  localDate: string;
  localTime: string;
  notes: string;
  eventOccurrenceIds?: readonly string[];
  expectedRevision: number | null;
}

export interface PreferencesSaveRequest {
  preferences: UserPreferences;
  expectedRevision: number;
}

export interface AccountDataExportData {
  schemaVersion: "starward-account-data-export-v1";
  generatedAt: string;
  account: { userId: UserId };
  profile: AccountProfileRecord;
  preferences: UserPreferencesRecord;
  favoriteSpotIds: readonly SpotId[];
  plans: readonly ObservationPlan[];
  profileLinks: readonly ProfileLink[];
  imports: readonly ImportDraft[];
  contributions: readonly ContributionSubmission[];
  excluded: readonly (
    | "SESSION_CREDENTIALS"
    | "WECHAT_IDENTITY_DIGEST"
    | "INTERNAL_MEDIA_OBJECT_KEYS"
    | "RAW_MEDIA_BYTES"
  )[];
}

export interface AccountDeletionRequest {
  confirmation: "DELETE_ACCOUNT";
}

export interface AccountDeletionReceipt {
  schemaVersion: "starward-account-deletion-receipt-v1";
  userId: UserId;
  accountState: "DELETED";
  deletedAt: string;
  sessionsRevoked: true;
  externalIdentityUnlinked: true;
  mediaCleanupState: "QUEUED" | "NOT_REQUIRED";
  mutableDataDeleted: readonly string[];
  retainedDeidentifiedEvidence: readonly string[];
}

export interface ProfileLinkSaveRequest {
  platform: PlatformKind;
  displayName: string;
  url: string;
  visibility: "PRIVATE" | "PUBLIC";
  sortOrder: number;
}

export interface ImportCreateRequest {
  platform: PlatformKind;
  originalUrl: string;
  rightsConfirmed: boolean;
}

export interface ImportUpdateRequest {
  expectedRevision: number;
  rightsConfirmed?: boolean;
  stage?: ImportStage;
  title?: string;
  body?: string;
  sourceNote?: string;
  visibility?: "PRIVATE" | "PUBLIC";
  spotId?: string | null;
  createProposal?: boolean;
}

export interface ImportsData {
  imports: readonly ImportDraft[];
}

export interface ContributionDraftRequest {
  kind: ContributionKind;
  spotId: string | null;
  candidateLocation: ContributionCandidateLocation | null;
  observedAt: string | null;
  topics: readonly ContributionTopic[];
  detail: string;
  rightsConfirmed: boolean;
  preciseLocationConsent: boolean;
  candidateProfile?: ContributionFormalProposal;
}

export interface ContributionUpdateRequest extends ContributionDraftRequest {
  expectedRevision: number;
}

export interface ContributionSubmitRequest {
  expectedRevision: number;
}

export interface ContributionMediaData {
  mimeType: ContributionMediaUpload["mimeType"];
  dataBase64: string;
}

export type {
  ContributionFormalSubmitRequest, ContributionFormalSubmitResult,
  ContributionFormalUploadIntent, ContributionFormalUploadIntentRequest,
  ContributionFormalUploadSessionRequest, ContributionFormalUploadCompleteRequest,
  ContributionFormalUploadRemoveRequest,
} from "./contribution-feedback.ts";

export interface AdminCaseDecisionRequest {
  resolution: "ACCEPTED" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
  reason: string;
  expectedRevision?: number;
}

export interface AdminRequestChangesRequest {
  reason: string;
  expectedRevision: number;
}

export interface AdminMediaReviewRequest {
  decision: "ACCEPTED" | "REJECTED";
  reason: string;
  expectedRevision?: number;
}

export interface AdminMergePreviewRequest {
  spotId: string;
  confirmedClaims: readonly string[];
  expectedSubmissionRevision: number;
  expectedSpotRevision: number;
}

export interface AdminMergeCommitRequest extends AdminMergePreviewRequest {
  reason: string;
}

export interface AdminPublicationAssessmentRequest {
  expectedSpotRevision?: number;
  reason: string;
}

export interface AdminLifecycleRequest {
  reason: string;
  expectedSpotRevision: number;
}

export interface AdminReplaceRequest extends AdminLifecycleRequest {
  successorSpotId: string;
}

export interface AdminRetireRequest extends AdminLifecycleRequest {
  successorSpotId?: string | null;
}

export interface ContributionUploadSessionRequest {
  kind?: import("./contribution-feedback.ts").ContributionMediaKind;
  originalName: string;
  mimeType: ContributionMediaUpload["mimeType"];
  byteSize: number;
  expectedRevision: number;
  /** Explicitly replace an expired slot; other uploads remain untouched. */
  replaceUploadId?: ContributionUploadId;
}

export interface ContributionUploadCompleteRequest {
  dataBase64: string;
}

export interface ContributionUploadRemoveRequest {
  expectedRevision: number;
}

export interface ContributionsData {
  submissions: readonly ContributionSubmission[];
}

export interface OperationsQueueData {
  items: readonly ModerationQueueItem[];
}

export interface OperationsCaseData {
  case: ModerationCaseView;
}

export interface OperationsMediaData {
  media: MediaReviewView;
}

export interface OperationsMergePreviewData {
  preview: MergePreview;
}

export interface OperationsPublicationData {
  assessment: PublicationAssessment;
}

export interface OperationsRevisionData {
  revisions: readonly SpotRevisionSummary[];
}

export interface OperationsImpactData {
  impact: ReplacementImpact;
}

export interface OperationsAuditData {
  entries: readonly Record<string, unknown>[];
}

export type SpotDetailData = SpotDetail;
export type SkyReportData = SkyReport;
export type ObservationContextData = ObservationContext;
export type ObservationContextResolveData = ObservationContext;
export type ObservationContextUpdateData = ObservationContext;
export type WechatLoginData = AuthSessionData;
export type WechatLoginBody = WechatLoginRequest;
export type ObservationContextResolveBody = ObservationContextResolveRequest;
export type ObservationContextUpdateBody = ObservationContextUpdateRequest;
export type OperationsData = Readonly<Record<string, unknown>>;
