import type { FeatureFlags } from "./feature-flags.ts";
import type { FilterState } from "./filters.ts";
import type { PreferenceRankingDisclosure, SpotRankingPreferences } from "./ranking.ts";
import type {
  FacilityEvidence,
  GuideArticle,
  ImportDraft,
  ImportStage,
  ObservationPlan,
  PlatformKind,
  ProfileLink,
  SkyReport,
  SpotDetail,
  SpotSummary,
  SourceSummary,
} from "./types.ts";
import type { UserPreferences } from "./types.ts";
import type { UserPreferencesRecord } from "./preferences.ts";
import { DEMO_POPULATION_DISCLOSURE } from "./catalog.ts";

export interface CapabilitiesData {
  flags: FeatureFlags;
  parser: Readonly<Record<string, unknown>>;
  externalOpen: { enabled: boolean; copyFallback: true; reason: string };
  routeProvider: { enabled: boolean; externalMapFallback: true; reason: string };
  weatherProvider: { enabled: boolean; cachedFallback: boolean; reason: string };
  mediaUpload: { enabled: boolean; manualTextDraft: true; reason: string };
}

export interface MapSceneRequest {
  filters: FilterState;
  query: string;
  viewport?: {
    center: { latitude: number; longitude: number };
    zoom: number;
  };
  preferences?: SpotRankingPreferences;
}

export interface MapSceneData {
  spots: readonly SpotSummary[];
  favoriteSpotIds: readonly SpotSummary["spotId"][] | null;
  preferenceRanking: PreferenceRankingDisclosure;
  filterCapabilities: {
    driveTime: {
      state: "UNAVAILABLE";
      reason: string;
      recovery: "REMOVE_DRIVE_TIME_FILTER";
    };
  };
  population: typeof DEMO_POPULATION_DISCLOSURE;
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
  lightLayer: unknown;
}

export interface FavoritesData {
  favorites: readonly SpotSummary[];
  sortOptions: readonly string[];
  canonicalDetailRoute: string;
}

export interface SearchData {
  formalSpots: readonly SpotSummary[];
  ordinaryPlaces: readonly {
    placeId: string;
    label: string;
    kind: "ORDINARY_PLACE";
    actions: readonly string[];
    spotId: null;
    nightSkyAllowed: false;
    dataState: "UNAVAILABLE";
  }[];
  history: readonly { label: string; clearable: true }[];
}

export interface SpotGuidesData {
  spotId: string;
  guides: readonly GuideArticle[];
}

export interface SpotSiteData {
  spotId: string;
  facilities: readonly FacilityEvidence[];
  siteSafety: readonly string[];
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
  localDate: string;
  localTime: string;
  notes: string;
  expectedRevision: number | null;
}

export interface PreferencesSaveRequest {
  preferences: UserPreferences;
  expectedRevision: number;
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

export type SpotDetailData = SpotDetail;
export type SkyReportData = SkyReport;
export type OperationsData = Readonly<Record<string, unknown>>;
