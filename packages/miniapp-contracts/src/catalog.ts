import {
  createMapCoordinateView,
  distanceMeters,
} from "@starward/coordinate-system";
import type {
  FacilityEvidence,
  FacilityType,
  GuideArticle,
  LightPollutionEstimate,
  RepresentativeMedia,
  SourceSummary,
  SpotDetail,
  SpotId,
  SpotSummary,
} from "./types.ts";

const ACQUIRED_AT = "2026-08-06T20:45:00+08:00";
const DEMO_DATA_DATE = "2026-08-06";
const SHENZHEN_CENTER = { lat: 22.5431, lon: 114.0579 };

interface OsmSpotSeed {
  id: string;
  name: string;
  region: string;
  displayName: string;
  osmType: "node" | "way" | "relation";
  osmId: number;
  lat: number;
  lon: number;
  timezone?: "Asia/Shanghai" | "Asia/Hong_Kong";
}

const OSM_LICENSE = "Open Data Commons Open Database License 1.0";
const OSM_LICENSE_URL = "https://www.openstreetmap.org/copyright";

function osmSource(seed: OsmSpotSeed): SourceSummary {
  return {
    id: `source-osm-${seed.osmType}-${seed.osmId}`,
    kind: "OPEN_DATA",
    provider: "OpenStreetMap Nominatim",
    title: `${seed.name} 名称、类别与 WGS84 几何中心`,
    sourceUrl: `https://www.openstreetmap.org/${seed.osmType}/${seed.osmId}`,
    license: OSM_LICENSE,
    licenseUrl: OSM_LICENSE_URL,
    publishedAt: null,
    retrievedAt: ACQUIRED_AT,
    validFrom: null,
    validTo: null,
    state: "FRESH",
    confidence: null,
    precision: "OpenStreetMap 元素点位或几何中心；不是入口、停车点或安全边界",
    limitations: [
      "OpenStreetMap 是开放协作数据库，名称与坐标仍需出发前复核",
      "入选为本 Demo 的正式 spot_id 只表示产品内人工整理的候选点，不表示景区许可、开放或安全背书",
    ],
  };
}

const MEDIA: readonly RepresentativeMedia[] = Object.freeze([
  {
    id: "media-representative-orion",
    localPath: "/assets/media/orion-constellation.jpg",
    thumbnailPath: "/assets/media/orion-constellation.jpg",
    alt: "相机拍摄的猎户座与夜空星点，非当前点位现场证明",
    caption: "猎户座星空代表实拍 · 非当前点位现场照片",
    photographer: "Taavi Niittee",
    license: "CC0 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Orion_constellation.jpg",
    capturedAt: null,
    direction: null,
    sequence: 1,
    isSiteSpecific: false,
    state: "FRESH",
  },
  {
    id: "media-representative-milky-way",
    localPath: "/assets/media/milky-way-night-sky.jpg",
    thumbnailPath: "/assets/media/milky-way-night-sky.jpg",
    alt: "真实银河夜空照片，非当前点位现场证明",
    caption: "银河夜空代表实拍 · 非当前点位现场照片",
    photographer: "Guillaume guillaume",
    license: "CC0 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Milky_Way_Night_Sky_(Unsplash).jpg",
    capturedAt: null,
    direction: null,
    sequence: 2,
    isSiteSpecific: false,
    state: "FRESH",
  },
  {
    id: "media-representative-star-trails",
    localPath: "/assets/media/star-trails.jpg",
    thumbnailPath: "/assets/media/star-trails.jpg",
    alt: "真实星轨照片，非当前点位现场证明",
    caption: "星轨代表实拍 · 非当前点位现场照片",
    photographer: "hannahisabelnic",
    license: "CC0 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Star_trails_(33247004142).jpg",
    capturedAt: null,
    direction: null,
    sequence: 3,
    isSiteSpecific: false,
    state: "FRESH",
  },
]);

const SEEDS: readonly OsmSpotSeed[] = Object.freeze([
  {
    id: "sz-astronomical-observatory",
    name: "深圳市天文台",
    region: "深圳 · 大鹏",
    displayName: "深圳市天文台, 天文路, 南澳街道, 大鹏新区, 深圳市, 广东省",
    osmType: "way",
    osmId: 665946657,
    lat: 22.4826799,
    lon: 114.5557147,
  },
  {
    id: "sz-judiaosha",
    name: "桔钓沙",
    region: "深圳 · 大鹏",
    displayName: "桔钓沙, 南澳街道, 大鹏新区, 深圳市, 广东省",
    osmType: "way",
    osmId: 538730361,
    lat: 22.5601434,
    lon: 114.5499911,
  },
  {
    id: "sz-yangmeikeng",
    name: "杨梅坑",
    region: "深圳 · 大鹏",
    displayName: "杨梅坑, 大鹏新区, 深圳市, 广东省",
    osmType: "node",
    osmId: 5214053378,
    lat: 22.5474858,
    lon: 114.5663819,
  },
  {
    id: "sz-luzui",
    name: "鹿嘴山庄",
    region: "深圳 · 大鹏",
    displayName: "鹿嘴山庄, 鹿嘴大道, 南澳街道, 大鹏新区, 深圳市, 广东省",
    osmType: "way",
    osmId: 989782519,
    lat: 22.5428578,
    lon: 114.6038202,
  },
  {
    id: "sz-qiniangshan",
    name: "七娘山",
    region: "深圳 · 大鹏",
    displayName: "七娘山, 深圳市, 广东省",
    osmType: "node",
    osmId: 1554828611,
    lat: 22.5250945,
    lon: 114.5438048,
  },
  {
    id: "sz-wutongshan",
    name: "梧桐山",
    region: "深圳 · 罗湖",
    displayName: "梧桐山, 深圳市, 广东省",
    osmType: "node",
    osmId: 9131873008,
    lat: 22.582268,
    lon: 114.2146672,
  },
  {
    id: "sz-dayangtai",
    name: "大阳台",
    region: "深圳 · 南山",
    displayName: "大阳台, 深圳市, 广东省",
    osmType: "node",
    osmId: 4459181400,
    lat: 22.6544429,
    lon: 113.9559506,
  },
  {
    id: "sz-dananshan",
    name: "大南山",
    region: "深圳 · 南山",
    displayName: "大南山, 深圳市, 广东省",
    osmType: "node",
    osmId: 1169596262,
    lat: 22.4999516,
    lon: 113.9012367,
  },
  {
    id: "sz-paiyashan",
    name: "排牙山",
    region: "深圳 · 大鹏",
    displayName: "排牙山, 深圳市, 广东省",
    osmType: "node",
    osmId: 6573935392,
    lat: 22.6276924,
    lon: 114.5369614,
  },
  {
    id: "sz-haichaijiao",
    name: "海柴角",
    region: "深圳 · 大鹏",
    displayName: "海柴角, 大鹏新区, 深圳市, 广东省",
    osmType: "node",
    osmId: 5626153683,
    lat: 22.5116096,
    lon: 114.6213763,
  },
  {
    id: "hz-shuangyuewan",
    name: "双月湾",
    region: "惠州 · 惠东",
    displayName: "双月湾, 平海镇, 惠东县, 惠州市, 广东省",
    osmType: "way",
    osmId: 492329861,
    lat: 22.6002691,
    lon: 114.9023659,
  },
  {
    id: "hz-xunliaowan",
    name: "巽寮湾",
    region: "惠州 · 惠东",
    displayName: "巽寮湾, 平海镇, 惠东县, 惠州市, 广东省",
    osmType: "way",
    osmId: 1071380057,
    lat: 22.6919016,
    lon: 114.7432732,
  },
  {
    id: "hz-nankunshan",
    name: "南昆山",
    region: "惠州 · 龙门",
    displayName: "南昆山, 龙门县, 惠州市, 广东省",
    osmType: "node",
    osmId: 3429123649,
    lat: 23.6370664,
    lon: 113.880751,
  },
  {
    id: "hz-heipaijiao",
    name: "黑排角",
    region: "惠州 · 惠东",
    displayName: "黑排角, 黄埠镇, 惠东县, 惠州市, 广东省",
    osmType: "node",
    osmId: 9873919501,
    lat: 22.6703749,
    lon: 114.9574507,
  },
  {
    id: "hz-baipenzhu",
    name: "白盆珠水库",
    region: "惠州 · 惠东",
    displayName: "白盆珠水库, 惠州市, 广东省",
    osmType: "relation",
    osmId: 546399,
    lat: 23.1308393,
    lon: 115.1402315,
  },
  {
    id: "hz-sanmen-island",
    name: "三门岛",
    region: "惠州 · 惠阳",
    displayName: "三门岛, 惠阳区, 惠州市, 广东省",
    osmType: "relation",
    osmId: 11665179,
    lat: 22.4632979,
    lon: 114.6328785,
  },
  {
    id: "jm-guifengshan",
    name: "圭峰山",
    region: "江门 · 新会",
    displayName: "圭峰山, 江门市, 广东省",
    osmType: "node",
    osmId: 2091901814,
    lat: 22.5586715,
    lon: 113.0225842,
  },
  {
    id: "zh-qiao-island",
    name: "淇澳岛",
    region: "珠海 · 香洲",
    displayName: "淇澳岛, 香洲区, 珠海市, 广东省",
    osmType: "way",
    osmId: 9764496,
    lat: 22.4162484,
    lon: 113.6319618,
  },
  {
    id: "zh-dongao-island",
    name: "东澳岛",
    region: "珠海 · 香洲",
    displayName: "东澳岛, 香洲区, 珠海市, 广东省",
    osmType: "relation",
    osmId: 11640031,
    lat: 22.0217607,
    lon: 113.7014202,
  },
  {
    id: "zh-wailingding-island",
    name: "外伶仃岛",
    region: "珠海 · 香洲",
    displayName: "外伶仃岛, 香洲区, 珠海市, 广东省",
    osmType: "relation",
    osmId: 11630543,
    lat: 22.1010538,
    lon: 114.0365034,
  },
  {
    id: "zh-fenghuangshan",
    name: "凤凰山",
    region: "珠海 · 香洲",
    displayName: "凤凰山, 珠海市, 广东省",
    osmType: "node",
    osmId: 4450337651,
    lat: 22.3210502,
    lon: 113.5460881,
  },
  {
    id: "gz-shimen-forest",
    name: "石门国家森林公园",
    region: "广州 · 从化",
    displayName: "石门国家森林公园, 广州市, 广东省",
    osmType: "way",
    osmId: 1410862355,
    lat: 23.6325856,
    lon: 113.7741983,
  },
  {
    id: "dg-yinping-baiyun",
    name: "银瓶嘴—白云嶂山区",
    region: "东莞 · 谢岗",
    displayName: "银瓶嘴—白云嶂山区, 东莞市, 广东省",
    osmType: "relation",
    osmId: 13671519,
    lat: 22.8996448,
    lon: 114.1727991,
  },
  {
    id: "hk-taimoushan",
    name: "大帽山",
    region: "香港 · 新界",
    displayName: "大帽山, 香港",
    osmType: "node",
    osmId: 1852935107,
    lat: 22.4101175,
    lon: 114.124595,
    timezone: "Asia/Hong_Kong",
  },
  {
    id: "hk-high-island",
    name: "万宜水库",
    region: "香港 · 西贡",
    displayName: "万宜水库, 新界, 香港",
    osmType: "relation",
    osmId: 30978,
    lat: 22.3774739,
    lon: 114.3467723,
    timezone: "Asia/Hong_Kong",
  },
  {
    id: "zq-dinghushan",
    name: "鼎湖山国家级自然保护区",
    region: "肇庆 · 鼎湖",
    displayName: "鼎湖山国家级自然保护区, 鼎湖区, 肇庆市, 广东省",
    osmType: "way",
    osmId: 453513783,
    lat: 23.1732607,
    lon: 112.5306011,
  },
]);

const FACILITY_TYPES: readonly FacilityType[] = [
  "PARKING",
  "TOILET",
  "PLATFORM",
  "CHARGING",
  "CAMPING",
  "ROAD",
  "WALKING",
  "SIGNAL",
];

function unknownFacilities(seed: OsmSpotSeed): readonly FacilityEvidence[] {
  const source: SourceSummary = {
    id: `source-facility-unverified-${seed.id}`,
    kind: "DEMO_FIXTURE",
    provider: "今晚去观星 Demo 人工整理",
    title: `${seed.name} 场地设施待核验记录`,
    sourceUrl: `https://www.openstreetmap.org/${seed.osmType}/${seed.osmId}`,
    license: "No independent facility evidence bundled",
    licenseUrl: "",
    publishedAt: null,
    retrievedAt: ACQUIRED_AT,
    validFrom: null,
    validTo: null,
    state: "SAMPLE_DATA",
    confidence: null,
    precision: "字段存在但状态为 UNKNOWN；不得据此作出行承诺",
    limitations: [
      "停车、厕所、平台、充电、露营、道路、徒步和信号均需由景区或近期现场证据单独核验",
    ],
  };
  return FACILITY_TYPES.map((type) => ({
    type,
    status: "UNKNOWN",
    summary: "暂无独立核验证据",
    detail: "出发前请查看管理方公告，并准备替代方案。",
    distanceM: null,
    openingHours: null,
    usageCondition: null,
    verifiedAt: null,
    confidence: null,
    source,
  }));
}

function lightEstimate(seed: OsmSpotSeed): LightPollutionEstimate {
  const km =
    distanceMeters(SHENZHEN_CENTER, { lat: seed.lat, lon: seed.lon }) / 1000;
  const levelAtMost = (km >= 100 ? 3 : km >= 65 ? 4 : km >= 35 ? 5 : 6) as
    | 3
    | 4
    | 5
    | 6;
  const source: SourceSummary = {
    id: `source-light-demo-radial-${seed.id}`,
    kind: "PRODUCT_CALCULATION",
    provider: "今晚去观星 Demo 粗粒度估算",
    title: `${seed.name} 光害候选筛选估算`,
    sourceUrl: "",
    license: "Internal Demo calculation; not a measured dataset",
    licenseUrl: "",
    publishedAt: DEMO_DATA_DATE,
    retrievedAt: ACQUIRED_AT,
    validFrom: null,
    validTo: null,
    state: "ESTIMATED",
    confidence: 0.25,
    precision: "仅按与深圳中心的球面距离分桶；不可当作 Bortle 实测",
    limitations: [
      "未接入 EOG/VIIRS 校准栅格",
      "不反映局部灯光、天气、遮挡或临时照明",
    ],
  };
  return {
    levelAtMost,
    label: `约 ${levelAtMost} 级以下候选（粗估）`,
    method: "starward-demo-radial-light-candidate-v1",
    datasetVersion: "no-authoritative-raster-demo-fallback-v1",
    dataDate: DEMO_DATA_DATE,
    precision: source.precision,
    state: "ESTIMATED",
    source,
  };
}

function toSpot(seed: OsmSpotSeed, index: number): SpotSummary {
  const view = createMapCoordinateView({
    authoritative: { lat: seed.lat, lon: seed.lon, system: "WGS84" },
  });
  return {
    spotId: `spot:${seed.id}` as SpotId,
    name: seed.name,
    region: seed.region,
    address: seed.displayName,
    timezone: seed.timezone ?? "Asia/Shanghai",
    wgs84: { system: "WGS84", latitude: seed.lat, longitude: seed.lon },
    gcj02: {
      system: "GCJ02",
      latitude: view.display.lat,
      longitude: view.display.lon,
      derivedFrom: "WGS84",
      transformVersion: view.conversionVersion,
    },
    altitudeM: null,
    status: "DATA_INSUFFICIENT",
    visibilityPolicy: "PUBLIC_EXACT",
    source: osmSource(seed),
    lastVerifiedAt: null,
    lightPollution: lightEstimate(seed),
    obstructionPercent: null,
    clearDirections: Object.freeze([]),
    accessTags: Object.freeze([]),
    facilities: unknownFacilities(seed),
    media: Object.freeze([{ ...MEDIA[index % MEDIA.length]!, sequence: 1 }]),
  };
}

export const DEMO_SPOTS: readonly SpotSummary[] = Object.freeze(
  SEEDS.map(toSpot),
);

export const DEMO_POPULATION_DISCLOSURE = Object.freeze({
  key: "shenzhen-3h-curated-formal-spots-v1",
  eligibleCount: DEMO_SPOTS.length,
  excludedCount: 0,
  stableIds: Object.freeze(DEMO_SPOTS.map((spot) => spot.spotId)),
  regionPolicy:
    "深圳及珠三角/粤港周边 Demo 人工候选；不构成长期地域限制或安全/开放背书",
  source:
    "OpenStreetMap Nominatim element identity acquired 2026-08-06; ODbL 1.0",
});

function genericGuide(spot: SpotSummary): GuideArticle {
  const source: SourceSummary = {
    id: `source-guide-demo-${spot.spotId}`,
    kind: "DEMO_FIXTURE",
    provider: "今晚去观星编辑部",
    title: "Demo 通用出发前核验清单",
    sourceUrl: "",
    license: "Project-owned Demo content",
    licenseUrl: "",
    publishedAt: DEMO_DATA_DATE,
    retrievedAt: ACQUIRED_AT,
    validFrom: null,
    validTo: null,
    state: "SAMPLE_DATA",
    confidence: null,
    precision: "通用流程建议，不陈述点位现场事实",
    limitations: ["不替代景区公告、天气预警、道路信息或现场判断"],
  };
  return {
    articleId: `guide:${spot.spotId}:preflight`,
    spotId: spot.spotId,
    title: "到达前检查：开放、道路与撤离",
    summary: "先核验管理方公告和严重天气，再确认末段道路、停车、同伴与返程。",
    authorName: "今晚去观星编辑部",
    authorType: "OFFICIAL",
    publishedAt: DEMO_DATA_DATE,
    updatedAt: DEMO_DATA_DATE,
    verified: false,
    source,
    blocks: [
      {
        type: "paragraph",
        text: "本攻略为 Demo 通用清单，不证明当前点位开放或安全。出发前请核验管理方公告、天气预警与道路状态。",
      },
      {
        type: "media",
        mediaId: spot.media[0]!.id,
        caption: spot.media[0]!.caption,
      },
      {
        type: "tip",
        title: "夜间安全",
        text: "结伴、告知行程、预留返程电量；临水、悬崖、雷暴、强风或封闭状态下不要前往。",
      },
      { type: "facility_ref", facilityType: "PARKING" },
    ],
  };
}

export function findDemoSpot(spotId: string): SpotSummary | null {
  return DEMO_SPOTS.find((spot) => spot.spotId === spotId) ?? null;
}

export function buildDemoSpotDetail(spotId: string): SpotDetail | null {
  const spot = findDemoSpot(spotId);
  if (!spot) return null;
  const factors = [
    {
      code: "critical-data-unavailable",
      label: "关键动态数据未接入",
      severity: "BLOCKER" as const,
      detail: "天气、开放与道路事实没有当前有效证据，不能生成肯定推荐。",
      sourceIds: [spot.source.id],
    },
    {
      code: "location-identity",
      label: "点位身份可追溯",
      severity: "POSITIVE" as const,
      detail: "名称和 WGS84 坐标保留 OSM 元素与 ODbL 来源。",
      sourceIds: [spot.source.id],
    },
  ];
  return {
    spot,
    route: {
      kind: "STRAIGHT_LINE_ONLY",
      distanceKm:
        Math.round(
          distanceMeters(SHENZHEN_CENTER, {
            lat: spot.wgs84.latitude,
            lon: spot.wgs84.longitude,
          }) / 100,
        ) / 10,
      driveMinutes: null,
      walkingMinutes: null,
      lastRoad: "暂无已核验末段道路信息",
      parkingGuidance: "停车状态未知；请通过管理方或外部地图核验",
      state: "SAMPLE_DATA",
      source: spot.source,
    },
    decision: {
      recommendation: "DATA_INSUFFICIENT",
      label: "数据不足，暂不能判断今晚是否适合",
      bestWindow: null,
      suitableFor: [],
      factors,
      confidence: null,
      freshness: "UNAVAILABLE",
      algorithmVersion: "starward-tonight-decision-v1-hard-blocker-first",
      inputDigest: `demo-insufficient:${spot.spotId}:${DEMO_DATA_DATE}`,
    },
    guides: [genericGuide(spot)],
    siteSafety: [
      "开放、道路、停车与现场风险均待核验",
      "雷暴、暴雨、强风、封闭、道路中断或非法进入时不建议前往",
      "偏远、临水、悬崖与弱信号环境请结伴并准备撤离方案",
    ],
    dataDisclosure: [
      spot.source,
      spot.lightPollution.source,
      ...spot.facilities.map((item) => item.source),
    ],
  };
}

if (
  DEMO_SPOTS.length < 20 ||
  DEMO_SPOTS.length > 50 ||
  new Set(DEMO_SPOTS.map((spot) => spot.spotId)).size !== DEMO_SPOTS.length
) {
  throw new Error("demo_population_must_be_20_to_50_unique_formal_spots");
}
