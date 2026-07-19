export const observerTypes = ["beginner", "astrophotographer", "visual-observer", "camping", "family"] as const;
export const travelModes = ["drive", "cycle", "public-transit", "walk"] as const;
export const observingTargets = ["stars", "milky-way", "moon", "planets", "meteor-shower", "comet", "space-station", "deep-sky", "sunrise-sunset-composite"] as const;
export const equipmentKinds = ["naked-eye", "binoculars", "telescope", "phone", "camera", "lens", "tripod", "equatorial-mount", "filter"] as const;
export const facilityKinds = ["parking", "toilet", "mobile-signal", "flat-platform", "camping-allowed", "supply-store", "drinking-water", "safe-lighting-with-dark-observing-zone"] as const;
export const requirementLevels = ["unrestricted", "preferred", "required"] as const;

export type ObserverType = (typeof observerTypes)[number];
export type TravelMode = (typeof travelModes)[number];
export type ObservingTarget = (typeof observingTargets)[number];
export type EquipmentKind = (typeof equipmentKinds)[number];
export type FacilityKind = (typeof facilityKinds)[number];
export type RequirementLevel = (typeof requirementLevels)[number];

export interface PreferenceProfile {
  id: string;
  name: string;
  revision: number;
  observerTypes: ObserverType[];
  startingPlace: string;
  city: string;
  willingness: {
    continuousLocationWhenFieldSessionStarts: boolean;
    weatherAndAstronomyNotifications: boolean;
  };
  travel: {
    modes: TravelMode[];
    maxOneWayMinutes: number | null;
    maxDrivingKilometers: number | null;
    maxWalkingKilometers: number | null;
    directAccessRequired: boolean;
    acceptsMountainRoad: boolean;
    acceptsUnpavedRoad: boolean;
    acceptsNightWalking: boolean;
    acceptsCamping: boolean;
    acceptsOvernight: boolean;
  };
  facilities: Record<FacilityKind, RequirementLevel>;
  targets: ObservingTarget[];
  equipment: EquipmentKind[];
  lensFocalLengthsMm: number[];
  createdAt: string;
  updatedAt: string;
}

export interface ProfileExample {
  id: string;
  name: string;
  summary: string;
  notSelectedByDefault: true;
}

export const profileExamples: ProfileExample[] = [
  { id: "family-easy", name: "带家人轻松观星", summary: "重视停车、厕所、短步行与安全照明", notSelectedByDefault: true },
  { id: "milky-way-photo", name: "银河摄影", summary: "优先暗夜、银河窗口与摄影设备适配", notSelectedByDefault: true },
  { id: "large-telescope", name: "大型望远镜目视", summary: "重视车辆直达、平整平台与目视条件", notSelectedByDefault: true },
  { id: "two-hour-departure", name: "两小时内临时出发", summary: "限制单程时间，优先即时可执行性", notSelectedByDefault: true },
];

export function createUnrestrictedProfile(now = new Date().toISOString()): PreferenceProfile {
  return {
    id: "base",
    name: "基础模式",
    revision: 1,
    observerTypes: [],
    startingPlace: "",
    city: "",
    willingness: {
      continuousLocationWhenFieldSessionStarts: false,
      weatherAndAstronomyNotifications: false,
    },
    travel: {
      modes: [],
      maxOneWayMinutes: null,
      maxDrivingKilometers: null,
      maxWalkingKilometers: null,
      directAccessRequired: false,
      acceptsMountainRoad: false,
      acceptsUnpavedRoad: false,
      acceptsNightWalking: false,
      acceptsCamping: false,
      acceptsOvernight: false,
    },
    facilities: Object.fromEntries(facilityKinds.map((key) => [key, "unrestricted"])) as Record<FacilityKind, RequirementLevel>,
    targets: [],
    equipment: [],
    lensFocalLengthsMm: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function profileImpactSummary(profile: PreferenceProfile): string {
  const hardFacilities = facilityKinds.filter((key) => profile.facilities[key] === "required").length;
  const parts = [
    profile.travel.maxOneWayMinutes === null ? "出行时间未限制" : `单程不超过 ${profile.travel.maxOneWayMinutes} 分钟`,
    hardFacilities === 0 ? "设施无硬性要求" : `${hardFacilities} 项设施为硬性要求`,
    profile.targets.length === 0 ? "观测目标未限制" : `${profile.targets.length} 类观测目标`,
    profile.equipment.length === 0 ? "设备未限制" : `${profile.equipment.length} 类设备`,
  ];
  return parts.join(" · ");
}
