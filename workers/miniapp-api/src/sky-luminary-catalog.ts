import { SKY_LUMINARY_CATALOG_HASH, SKY_LUMINARY_CATALOG_VERSION, SKY_LUMINARY_NAMES,
  SKY_LUMINARY_ORDER, type SkyLuminaryBody, type SourceSummary, type MoonTextureManifestData,type MoonCoverageManifestData } from "@starward/miniapp-contracts";
import { skyPlanetSource } from "./sky-planet-catalog.ts";

export const skyLuminaryCatalog = {
  catalogVersion: SKY_LUMINARY_CATALOG_VERSION, catalogHash: SKY_LUMINARY_CATALOG_HASH,
  rowCount: SKY_LUMINARY_ORDER.length, sources: [skyPlanetSource],
  entries: SKY_LUMINARY_ORDER.map(body => ({ reference: `SOLAR:${body}`,
    displayName: SKY_LUMINARY_NAMES[body].zh, kind: SKY_LUMINARY_NAMES[body].kind,
    aliases: SKY_LUMINARY_NAMES[body].aliases })),
};

export function skyLuminaryReferenceSources(body: SkyLuminaryBody, moon?: MoonTextureManifestData|MoonCoverageManifestData): readonly SourceSummary[] {
  const facts: SourceSummary = { ...skyPlanetSource, id: `nasa-nssdca-${body.toLowerCase()}-fact-sheet`,
    title: `${SKY_LUMINARY_NAMES[body].en} Fact Sheet`,
    sourceUrl: `https://nssdc.gsfc.nasa.gov/planetary/factsheet/${body.toLowerCase()}fact.html`,
    precision: "Static identity/reference facts; observing geometry belongs to the current authorized report",
    limitations: ["静态资料不提供当前时刻位置、天气或现场可见性。"] };
  if (body === "SUN") return [facts, { ...facts,
    id: "hestroffer-magnan-1998-solar-limb", provider: "Hestroffer & Magnan / Astronomy & Astrophysics",
    title: "Wavelength dependency of the Solar limb darkening (1998), Table 1 NL coefficients",
    sourceUrl: "https://legacy.adsabs.harvard.edu/pdf/1998A%26A...333..338H",
    license: "Numerical facts and independent formula implementation; paper content is not redistributed",
    licenseUrl: "https://legacy.adsabs.harvard.edu/pdf/1998A%26A...333..338H",
    precision: "Historical mean profile at 579.88 nm; arbitrary display palette",
    limitations: ["单波段平均临边模型；不表示实时日面、自然真彩、黑子、日冕或绝对测光。"],
  }];
  return [facts, ...(moon ? [{ ...facts, id: moon.schemaVersion==="starward-clementine-moon-coverage-v2"?"usgs-clementine-uv750-v21-coverage":"usgs-clementine-uv750-v2", kind: "OPEN_DATA" as const,
    provider: moon.source.provider, title: moon.source.title, sourceUrl: moon.source.recordUrl,
    license: "USGS public-domain data; retain source credit", licenseUrl: moon.source.rightsUrl,
    attribution: { name: moon.source.credit, url: moon.source.recordUrl, statements: [moon.processing] },
    precision: "Historical Clementine 750 nm grayscale map; observer orientation comes from the report",
    limitations: moon.limitations,
  }] : [])];
}
