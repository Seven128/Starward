import type {
  ApiEnvelope,
  DataState,
  ImportDraft,
  ObservationPlan,
  ProfileLink,
  RouteOverview,
  SkyReport,
  SourceSummary,
  SpotDetail,
  SpotId,
  SpotSummary,
  UserPreferences,
  UserPreferencesRecord,
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
  cloudPercent: number;
  precipitationMm: number;
  windKph: number;
  temperatureC: number;
  visibilityKm: number;
  thunderstorm: boolean;
  severeRain: boolean;
  severeWind: boolean;
}

export interface WeatherPort {
  readonly key: string;
  getHourly(input: {
    point: Wgs84Point;
    localDate: string;
    timezone: string;
    signal?: AbortSignal;
  }): Promise<ProviderResult<readonly CanonicalWeatherHour[]>>;
}

export interface RoutePort {
  readonly key: string;
  estimate(input: {
    origin: Wgs84Point;
    destination: Wgs84Point;
    signal?: AbortSignal;
  }): Promise<ProviderResult<RouteOverview>>;
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

export interface MiniappRepositoryPort {
  readonly kind: "memory" | "postgres";
  listSpots(): Promise<readonly SpotSummary[]>;
  listSpotsInRadius(
    center: Wgs84Point,
    radiusKm: number,
  ): Promise<readonly SpotSummary[]>;
  getSpot(spotId: SpotId): Promise<SpotSummary | null>;
  getDetail(spotId: SpotId): Promise<SpotDetail | null>;
  getPreferences(): Promise<UserPreferencesRecord>;
  savePreferences(
    preferences: UserPreferences,
    expectedRevision: number,
    idempotencyKey: string,
  ): Promise<UserPreferencesRecord>;
  listFavoriteIds(): Promise<readonly SpotId[]>;
  setFavorite(
    spotId: SpotId,
    favorite: boolean,
    idempotencyKey: string,
  ): Promise<void>;
  listPlans(): Promise<readonly ObservationPlan[]>;
  savePlan(
    plan: ObservationPlan,
    expectedRevision: number | null,
    idempotencyKey: string,
  ): Promise<ObservationPlan>;
  deletePlan(planId: string, idempotencyKey: string): Promise<void>;
  listProfileLinks(): Promise<readonly ProfileLink[]>;
  saveProfileLink(
    link: ProfileLink,
    idempotencyKey: string,
  ): Promise<ProfileLink>;
  deleteProfileLink(id: string, idempotencyKey: string): Promise<void>;
  saveImportDraft(
    draft: ImportDraft,
    expectedRevision: number | null,
    idempotencyKey: string,
  ): Promise<ImportDraft>;
  listImportDrafts(): Promise<readonly ImportDraft[]>;
  getImportDraft(id: string): Promise<ImportDraft | null>;
  operationsSnapshot(): Promise<Readonly<Record<string, unknown>>>;
  close(): Promise<void>;
}

export interface AstronomyApplicationPort {
  compute(input: {
    spotId: SpotId;
    localDate: string;
    at: string | null;
    targetProfile: "BEGINNER" | "PHOTOGRAPHER" | "ADVANCED";
  }): Promise<ApiEnvelope<SkyReport>>;
}

export interface TelemetryPort {
  event(name: string, fields: Readonly<Record<string, unknown>>): void;
  error(error: unknown, fields: Readonly<Record<string, unknown>>): void;
  snapshot(): readonly Readonly<Record<string, unknown>>[];
}

export interface CachePort {
  readonly kind: "memory" | "redis";
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  deleteByPrefix(prefix: string): Promise<void>;
  operationsSnapshot(): Promise<Readonly<Record<string, unknown>>>;
  close(): Promise<void>;
}
