import type { FeatureFlags } from "./feature-flags.ts";
import type { FilterGroupKey, FilterState } from "./filters.ts";
import type { PreferenceRankingDisclosure, SpotRankingPreferences } from "./ranking.ts";
import type {
  AccessAndSafetyState,
  ContributionCandidateLocation,
  ContributionKind,
  ContributionMediaUpload,
  ContributionSubmission,
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
  RouteOverview,
  SkyReport,
  SiteMediaState,
  SpotDetail,
  SpotId,
  SpotSummary,
  SourceSummary,
  AuthSessionData,
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

export interface MapSpotTimeSignal {
  spotId: SpotSummary["spotId"];
  cloudPercent: number | null;
  lowCloudPercent: number | null;
  midCloudPercent: number | null;
  highCloudPercent: number | null;
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
}

export interface MapSceneTimeFrame {
  atUtc: string;
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
}

export type RouteEstimateData = RouteOverview;

export interface MapSceneData {
  context: ObservationContext;
  spots: readonly SpotSummary[];
  evaluations: Readonly<Record<string, MapSpotEvaluation>>;
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
  facilities: readonly FacilityEvidence[];
  accessAndSafety: AccessAndSafetyState;
  siteMediaState: SiteMediaState;
  evidence: readonly FactEvidence[];
  sources: readonly SourceSummary[];
}

export interface UserLibraryData {
  favoriteSpots: readonly SpotSummary[];
  plans: readonly ObservationPlan[];
  profileLinks: readonly ProfileLink[];
  preferences: UserPreferencesRecord;
  latestImportDraft: ImportDraft | null;
}

export interface PlansData {
  plans: readonly ObservationPlan[];
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
  spotId: ObservationPlan["spotId"];
  observationContextId: ObservationContext["contextId"];
  localDate: string;
  localTime: string;
  notes: string;
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
}

export interface ContributionUpdateRequest extends ContributionDraftRequest {
  expectedRevision: number;
}

export interface ContributionSubmitRequest {
  expectedRevision: number;
}

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
  originalName: string;
  mimeType: ContributionMediaUpload["mimeType"];
  byteSize: number;
  expectedRevision: number;
}

export interface ContributionUploadCompleteRequest {
  dataBase64: string;
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
