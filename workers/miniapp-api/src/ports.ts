import type {
  ApiEnvelope,
  ContributionId,
  ContributionMediaUpload,
  ContributionSubmission,
  ContributionUploadId,
  DataState,
  ImportDraft,
  OrdinaryPlaceRef,
  ObservationPlan,
  ObservationContext,
  ProfileLink,
  RouteOverview,
  SkyReport,
  SourceSummary,
  SpotDetail,
  SpotId,
  SpotSummary,
  UserPreferences,
  UserPreferencesRecord,
  UserId,
  Wgs84Point,
} from "@starward/miniapp-contracts";

export interface ProviderResult<T> {
  value: T | null;
  state: DataState;
  source: SourceSummary;
  errorCode: string | null;
}

export interface CanonicalWeatherHour {
  at: string;
  cloudPercent: number | null;
  lowCloudPercent: number | null;
  midCloudPercent: number | null;
  highCloudPercent: number | null;
  modelConsistency: number | null;
  modelConsistencyLabel: "HIGH" | "MEDIUM" | "LOW" | "UNAVAILABLE";
  modelSpreadPercent: number | null;
  precipitationMm: number | null;
  precipitationProbabilityPercent: number | null;
  windKph: number | null;
  windGustKph: number | null;
  windDirectionDeg: number | null;
  temperatureC: number | null;
  relativeHumidityPercent: number | null;
  dewPointC: number | null;
  visibilityKm: number | null;
  thunderstorm: boolean;
  severeRain: boolean;
  severeWind: boolean;
  officialSevereAlert: boolean;
  officialAlertIds: readonly string[];
  evidenceSourceIds: readonly string[];
}

export interface CanonicalWeatherAlert {
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

export interface WeatherModelRunSummary {
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

export interface WeatherEvidenceResult
  extends ProviderResult<readonly CanonicalWeatherHour[]> {
  sources: readonly SourceSummary[];
  warningState: DataState;
  alerts: readonly CanonicalWeatherAlert[];
  timelineRole: "PRIMARY" | "PRIMARY_FALLBACK" | "UNAVAILABLE";
  modelRuns: readonly WeatherModelRunSummary[];
  warnings: readonly string[];
}

export interface WeatherPort {
  readonly key: string;
  getHourly(input: {
    point: Wgs84Point;
    localDate: string;
    timezone: string;
    signal?: AbortSignal;
  }): Promise<WeatherEvidenceResult>;
}

export interface RoutePort {
  readonly key: string;
  estimate(input: {
    origin: Wgs84Point;
    destination: Wgs84Point;
    signal?: AbortSignal;
  }): Promise<ProviderResult<RouteOverview>>;
}

export interface PlaceSearchPort {
  readonly key: string;
  search(input: {
    query: string;
    region?: string;
    signal?: AbortSignal;
  }): Promise<ProviderResult<readonly OrdinaryPlaceRef[]>>;
}

export interface DarkSkyGridCellRecord {
  cellId: string;
  datasetVersion: string;
  productBand: "VERY_LOW" | "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";
  label: string;
  radiance: {
    median: number;
    p10: number;
    p90: number;
    unit: "nW/cm²/sr";
  };
  minimumCloudFreeObservations: number;
  boundsWgs84: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
  state: "ESTIMATED";
  source: SourceSummary;
}

export interface LightPollutionPort {
  readonly key: string;
  sample(input: {
    point: Wgs84Point;
    signal?: AbortSignal;
  }): Promise<ProviderResult<unknown>>;
}

export interface ExternalPostImportPort {
  readonly key: string;
  readonly licensedPlatforms: readonly string[];
  parse(input: {
    url: URL;
    maxBytes: number;
    timeoutMs: number;
    signal?: AbortSignal;
  }): Promise<ProviderResult<{ title: string; body: string }>>;
}

export interface MediaObjectStorePort {
  readonly kind: "memory" | "local-filesystem" | "disabled";
  readonly enabled: boolean;
  put(input: {
    objectKey: string;
    bytes: Uint8Array;
    mimeType: ContributionMediaUpload["mimeType"];
  }): Promise<void>;
  read(objectKey: string): Promise<Uint8Array | null>;
  delete(objectKey: string): Promise<void>;
  close(): Promise<void>;
}

export interface MiniappRepositoryPort {
  readonly kind: "memory" | "postgres";
  readinessSnapshot(): Promise<Readonly<Record<string, unknown>>>;
  listSpots(): Promise<readonly SpotSummary[]>;
  listSpotsInRadius(
    center: Wgs84Point,
    radiusKm: number,
  ): Promise<readonly SpotSummary[]>;
  listDarkSkyGridCells(input: {
    datasetVersion: string;
    center?: Wgs84Point;
    radiusKm?: number;
  }): Promise<readonly DarkSkyGridCellRecord[]>;
  searchSpotCandidates(query: string): Promise<readonly SpotSummary[]>;
  getSpot(spotId: SpotId): Promise<SpotSummary | null>;
  getDetail(spotId: SpotId): Promise<SpotDetail | null>;
  ensureUser(userId: UserId): Promise<void>;
  findOrCreateWechatUser(identityDigest: string): Promise<UserId>;
  createSession(input: {
    userId: UserId;
    tokenDigest: string;
    expiresAt: string;
  }): Promise<void>;
  resolveSession(tokenDigest: string): Promise<UserId | null>;
  getPreferences(userId: UserId): Promise<UserPreferencesRecord>;
  savePreferences(
    userId: UserId,
    preferences: UserPreferences,
    expectedRevision: number,
    idempotencyKey: string,
  ): Promise<UserPreferencesRecord>;
  listFavoriteIds(userId: UserId): Promise<readonly SpotId[]>;
  setFavorite(
    userId: UserId,
    spotId: SpotId,
    favorite: boolean,
    idempotencyKey: string,
  ): Promise<void>;
  listPlans(userId: UserId): Promise<readonly ObservationPlan[]>;
  savePlan(
    userId: UserId,
    plan: ObservationPlan,
    expectedRevision: number | null,
    idempotencyKey: string,
  ): Promise<ObservationPlan>;
  deletePlan(userId: UserId, planId: string, idempotencyKey: string): Promise<void>;
  listProfileLinks(userId: UserId): Promise<readonly ProfileLink[]>;
  saveProfileLink(
    userId: UserId,
    link: ProfileLink,
    idempotencyKey: string,
  ): Promise<ProfileLink>;
  deleteProfileLink(userId: UserId, id: string, idempotencyKey: string): Promise<void>;
  saveImportDraft(
    userId: UserId,
    draft: ImportDraft,
    expectedRevision: number | null,
    idempotencyKey: string,
  ): Promise<ImportDraft>;
  listImportDrafts(userId: UserId): Promise<readonly ImportDraft[]>;
  getImportDraft(userId: UserId, id: string): Promise<ImportDraft | null>;
  listContributions(userId: UserId): Promise<readonly ContributionSubmission[]>;
  getContribution(
    userId: UserId,
    submissionId: ContributionId,
  ): Promise<ContributionSubmission | null>;
  saveContributionDraft(
    userId: UserId,
    submission: ContributionSubmission,
    expectedRevision: number | null,
    idempotencyKey: string,
  ): Promise<ContributionSubmission>;
  createContributionUpload(
    userId: UserId,
    submissionId: ContributionId,
    upload: ContributionMediaUpload,
    expectedRevision: number,
    idempotencyKey: string,
  ): Promise<ContributionSubmission>;
  completeContributionUpload(
    userId: UserId,
    submissionId: ContributionId,
    uploadId: ContributionUploadId,
    completion: {
      byteSize: number;
      sha256: string;
      objectKey: string;
      uploadedAt: string;
    },
    idempotencyKey: string,
  ): Promise<ContributionSubmission>;
  submitContribution(
    userId: UserId,
    submissionId: ContributionId,
    expectedRevision: number,
    idempotencyKey: string,
  ): Promise<ContributionSubmission>;
  expireContributionUploads(now: string): Promise<readonly string[]>;
  getContributionUploadObject(
    uploadId: ContributionUploadId,
  ): Promise<{
    objectKey: string;
    mimeType: ContributionMediaUpload["mimeType"];
  } | null>;
  operationsSnapshot(): Promise<Readonly<Record<string, unknown>>>;
  close(): Promise<void>;
}

export interface AstronomyApplicationPort {
  compute(context: ObservationContext): Promise<ApiEnvelope<SkyReport>>;
}

export interface TelemetryPort {
  event(name: string, fields: Readonly<Record<string, unknown>>): void;
  error(error: unknown, fields: Readonly<Record<string, unknown>>): void;
  snapshot(): readonly Readonly<Record<string, unknown>>[];
}

export interface CachePort {
  readonly kind: "memory" | "redis";
  readinessSnapshot(): Promise<Readonly<Record<string, unknown>>>;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  deleteByPrefix(prefix: string): Promise<void>;
  operationsSnapshot(): Promise<Readonly<Record<string, unknown>>>;
  close(): Promise<void>;
}
