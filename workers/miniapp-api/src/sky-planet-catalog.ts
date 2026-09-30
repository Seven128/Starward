import { SKY_PLANET_CATALOG_HASH, SKY_PLANET_CATALOG_VERSION, SKY_PLANET_NAMES, SKY_PLANET_ORDER,
  type SkyPlanetBody, type SourceSummary } from "@starward/miniapp-contracts";

export const skyPlanetSource: SourceSummary = {
  id: "nasa-nssdca-planetary-fact-sheets",
  kind: "OFFICIAL_REFERENCE",
  provider: "NASA Goddard Space Flight Center / NSSDCA",
  title: "Planetary Fact Sheets",
  sourceUrl: "https://nssdc.gsfc.nasa.gov/planetary/planetfact.html",
  license: "NASA published reference; see NASA media and data usage guidance",
  licenseUrl: "https://www.nasa.gov/nasa-brand-center/images-and-media/",
  publishedAt: null, retrievedAt: null, validFrom: null, validTo: null,
  state: "FRESH", confidence: 1,
  precision: "Static planet identity and NSSDCA volumetric mean radius; observer position is resolved separately",
  limitations: ["行星位置、视星等和相位不来自此静态资料页，须读取当前观测报告", "不包含可供绘制的表面纹理或土星环像素"],
};

export const skyVenusAppearanceSource: SourceSummary = {
  ...skyPlanetSource,
  id: "nasa-venus-visible-cloud-appearance",
  provider: "NASA Goddard Space Flight Center",
  title: "NASA Studies CubeSat Mission to Solve Venusian Mystery",
  sourceUrl: "https://www.nasa.gov/technology/nasa-studies-cubesat-mission-to-solve-venusian-mystery/",
  publishedAt: "2017-08-15T00:00:00.000Z",
  precision: "Visible-light cloud appearance versus ultraviolet cloud structure; no image redistributed",
  limitations: ["可见光下云层通常缺少明显纹理；紫外云纹和雷达地表图不是当前可见光外观。",
    "星图共享球面模型表达同刻相位及视直径；显示配色和暗侧底亮不是自然真彩、实测光度或实时云况。"],
};

export const skySaturnRingSource: SourceSummary = {
  id: "nasa-nssdca-saturnian-rings-fact-sheet",
  kind: "OFFICIAL_REFERENCE",
  provider: "NASA Goddard Space Flight Center / NSSDCA",
  title: "Saturnian Rings Fact Sheet",
  sourceUrl: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/satringfact.html",
  license: "NASA published reference; see NASA media and data usage guidance",
  licenseUrl: "https://www.nasa.gov/nasa-brand-center/images-and-media/",
  publishedAt: null, retrievedAt: null, validFrom: null, validTo: null,
  state: "FRESH", confidence: 1,
  precision: "Static C, B and A main-ring radii; apparent orientation comes from the observer and rotation-axis model",
  limitations: ["细窄环缝、纹理、散射、阴影和环粒子不来自这份静态尺寸表"],
};

export const skyJupiterShapeSource: SourceSummary = {
  id: "nasa-nssdca-jupiter-fact-sheet",
  kind: "OFFICIAL_REFERENCE",
  provider: "NASA Goddard Space Flight Center / NSSDCA",
  title: "Jupiter Fact Sheet",
  sourceUrl: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html",
  license: "NASA published reference; see NASA media and data usage guidance",
  licenseUrl: "https://www.nasa.gov/nasa-brand-center/images-and-media/",
  publishedAt: null, retrievedAt: null, validFrom: null, validTo: null,
  state: "FRESH", confidence: 1,
  precision: "Static 1-bar equatorial/polar radii; apparent pole comes from the exact observer and Astronomy Engine axis",
  limitations: ["云带和大红斑不来自此尺寸表，也不表示当前云系经度或实测颜色"],
};

export const skyJupiterBandSource: SourceSummary = {
  id: "mast-hst-opal-jupiter-2024c-latitude-bands",
  kind: "OPEN_DATA",
  provider: "MAST / HST OPAL",
  title: "HST OPAL Cycle 31 Jupiter 2024c three-filter latitude profile",
  sourceUrl: "https://archive.stsci.edu/hlsp/opal/opal-jupiter-cycle-31",
  attribution:{name:"NASA / ESA / HST OPAL Team (PI Amy Simon) / STScI",
    url:"https://archive.stsci.edu/hlsp/opal",
    statements:["Adapted by Starward into a longitude-median historical latitude profile.",
      "Original OPAL maps DOI 10.17909/T9G593."]},
  license: "CC BY 4.0; Starward longitude-median adaptation",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  publishedAt: null, retrievedAt: null, validFrom: null, validTo: null,
  state: "FRESH", confidence: 1,
  precision: "2024-11-19/20 historical planetographic-latitude colors only; all longitude variation removed",
  limitations: ["非自然真彩、非实时云系", "不表示当前大红斑位置或任何云带经度", "完整加工和像素哈希见 /v2/sky/jupiter/manifest"],
};

export const skySaturnShapeSource: SourceSummary = {
  id: "nasa-nssdca-saturn-fact-sheet",
  kind: "OFFICIAL_REFERENCE",
  provider: "NASA Goddard Space Flight Center / NSSDCA",
  title: "Saturn Fact Sheet",
  sourceUrl: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html",
  license: "NASA published reference; see NASA media and data usage guidance",
  licenseUrl: "https://www.nasa.gov/nasa-brand-center/images-and-media/",
  publishedAt: null, retrievedAt: null, validFrom: null, validTo: null,
  state: "FRESH", confidence: 1,
  precision: "Static 1-bar equatorial/polar radii; apparent pole comes from the exact observer and Astronomy Engine axis",
  limitations: ["历史云带与环面散射不来自此尺寸表，不表示当前天气或当前环影"],
};

export const skySaturnBandSource: SourceSummary = {
  id: "mast-hst-opal-saturn-2025a-latitude-bands",
  kind: "OPEN_DATA",
  provider: "MAST / HST OPAL",
  title: "HST OPAL Cycle 32 Saturn 2025a three-filter latitude profile",
  sourceUrl: "https://archive.stsci.edu/hlsp/opal/opal-saturn-cycle-32",
  attribution:{name:"NASA / ESA / HST OPAL Team (PI Amy Simon) / STScI",
    url:"https://archive.stsci.edu/hlsp/opal",
    statements:["Adapted by Starward into a longitude-median historical latitude profile.",
      "Original OPAL maps DOI 10.17909/T9G593."]},
  license: "CC BY 4.0; Starward longitude-median adaptation",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  publishedAt: null, retrievedAt: null, validFrom: null, validTo: null,
  state: "FRESH", confidence: 1,
  precision: "2025-08-29 historical planetographic-latitude colors only; all longitude variation removed",
  limitations: ["非自然真彩、非实时云系", "不表示当前经度特征、卫星影子或环投影阴影",
    "环遮挡和极区缺资料处回退基础盘面；完整加工和像素哈希见 /v2/sky/saturn/manifest"],
};

export const skyPlanetCatalog = {
  catalogVersion: SKY_PLANET_CATALOG_VERSION,
  catalogHash: SKY_PLANET_CATALOG_HASH,
  rowCount: SKY_PLANET_ORDER.length,
  sources: [skyPlanetSource],
  entries: SKY_PLANET_ORDER.map((body: SkyPlanetBody) => ({
    reference: `PLANET:${body}`, displayName: SKY_PLANET_NAMES[body].zh,
    kind: "PLANET" as const,
    aliases: [SKY_PLANET_NAMES[body].zh, SKY_PLANET_NAMES[body].en, `PLANET:${body}`],
  })),
};

export const skyUranusBandSource: SourceSummary = {
  id: "mast-hst-opal-uranus-2025a-latitude-bands",
  kind: "OPEN_DATA",
  provider: "MAST / HST OPAL",
  title: "HST OPAL Cycle 33 Uranus 2025a three-filter latitude profile",
  sourceUrl: "https://archive.stsci.edu/hlsp/opal/opal-uranus-cycle-33",
  attribution:{name:"NASA / ESA / HST OPAL Team (PI Amy Simon) / STScI",
    url:"https://archive.stsci.edu/hlsp/opal",
    statements:["Adapted by Starward into a longitude-median historical latitude profile.",
      "Original OPAL maps DOI 10.17909/T9G593."]},
  license: "CC BY 4.0; Starward longitude-median adaptation",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  publishedAt: null, retrievedAt: null, validFrom: null, validTo: null,
  state: "FRESH", confidence: 1,
  precision: "2025-10-23 historical planetographic-latitude colors only; all longitude variation removed",
  limitations: ["非自然真彩、非实时云系", "不表示当前云系经度特征",
    "未观测纬度回退基础盘面；完整加工和像素哈希见 /v2/sky/uranus/manifest"],
};

export const skyNeptuneBandSource: SourceSummary = {
  id: "mast-hst-opal-neptune-2025b-latitude-bands",
  kind: "OPEN_DATA",
  provider: "MAST / HST OPAL",
  title: "HST OPAL Cycle 32 Neptune 2025b three-filter latitude profile",
  sourceUrl: "https://archive.stsci.edu/hlsp/opal/opal-neptune-cycle-32",
  attribution:{name:"NASA / ESA / HST OPAL Team (PI Amy Simon) / STScI",
    url:"https://archive.stsci.edu/hlsp/opal",
    statements:["Adapted by Starward into a longitude-median historical latitude profile.",
      "Original OPAL maps DOI 10.17909/T9G593."]},
  license: "CC BY 4.0; Starward longitude-median adaptation",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  publishedAt: null, retrievedAt: null, validFrom: null, validTo: null,
  state: "FRESH", confidence: 1,
  precision: "2025-08-24 historical planetographic-latitude colors only; all longitude variation removed",
  limitations: ["非自然真彩、非实时云系", "不表示当前云系经度特征",
    "未观测纬度回退基础盘面；完整加工和像素哈希见 /v2/sky/neptune/manifest"],
};
