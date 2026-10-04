import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { skyStaticHash, validSkyStaticRoute, skyStaticDeliveryFragment as sharedSkyStaticDeliveryFragment, writeSkyStaticBundle } from "../../../tools/deployment/sky-static-bundle.mjs";
import { pathToFileURL } from "node:url";
import { MoonTexturePublicationService, LEGACY_MOON_TEXTURE_PUBLICATION_HASH } from "./moon-texture-publication.ts";
import { MarsTexturePublicationService } from "./mars-texture-publication.ts";
import { MercuryTexturePublicationService } from "./mercury-texture-publication.ts";
import { JupiterBandsPublicationService } from "./jupiter-bands-publication.ts";
import { SaturnBandsPublicationService } from "./saturn-bands-publication.ts";
import { UranusBandsPublicationService } from "./uranus-bands-publication.ts";
import { NeptuneBandsPublicationService } from "./neptune-bands-publication.ts";
import { GalacticImagePublicationService } from "./galactic-image-publication.ts";
import { SkyLandscapePublicationService } from "./sky-landscape-publication.ts";
import { WideFieldW3PublicationService } from "./wide-field-w3-publication.ts";
import { ConstellationPublicationService } from "./constellation-publication.ts";
import { SdssOpticalImageryService } from "./sdss-optical-imagery.ts";
import { DeepSkyImageryService } from "./deep-sky-imagery.ts";
import { PreparedOpticalImageryService } from "./prepared-optical-imagery.ts";
import { skyPublicAssetHeaders, type SkyPublicAssetKind } from "./sky-public-asset-headers.ts";
import { SaoPublicationService } from "./sao-publication.ts";

export interface SkyPublicAssetExportInput {
  route: string;
  bytes: Buffer;
  headers: Record<string, string>;
}
export interface SkyPublicAssetExportRecord {
  route: string;
  bytes: number;
  sha256: string;
  headers: Record<string, string>;
}

function asset(kind: SkyPublicAssetKind, route: string, bytes: Buffer, contentType: string, fieldDegrees?: number): SkyPublicAssetExportInput {
  return { route, bytes, headers: skyPublicAssetHeaders(kind, contentType, fieldDegrees) };
}

/** Enumerate only assets accepted by the existing publication owners. No disk
 * crawl, remote fetch, trial switch, raw science input or account context. */
export async function* approvedSkyPublicAssets(prepared = new PreparedOpticalImageryService(),
  sdss = new SdssOpticalImageryService()): AsyncGenerator<SkyPublicAssetExportInput> {
  const moon = new MoonTexturePublicationService();
  const fixed = [
    ["moon", moon], ["mars", new MarsTexturePublicationService()],
    ["mercury", new MercuryTexturePublicationService()], ["jupiter", new JupiterBandsPublicationService()],
    ["saturn", new SaturnBandsPublicationService()], ["uranus", new UranusBandsPublicationService()],
    ["neptune", new NeptuneBandsPublicationService()], ["galactic", new GalacticImagePublicationService()],
  ] as const;
  for (const [kind, owner] of fixed) {
    const manifest = owner.manifest();
    yield asset(kind, manifest.image.downloadUrl, await owner.image(manifest.publicationHash),
      manifest.image.file.endsWith(".png") ? "image/png" : "image/jpeg");
  }
  const oldMoon = moon.manifest();
  yield asset("moon", `/v2/sky/moon/${LEGACY_MOON_TEXTURE_PUBLICATION_HASH}/${oldMoon.image.file}`,
    await moon.image(LEGACY_MOON_TEXTURE_PUBLICATION_HASH), "image/jpeg");
  const coverage = moon.coverageManifest();
  yield asset("moon", coverage.image.downloadUrl, await moon.coverageImage(coverage.publicationHash), "image/png");

  const landscape = new SkyLandscapePublicationService(), lm = landscape.manifest();
  for (const route of [lm.source.originalDownloadUrl, ...lm.resources.flatMap(r => [r.image.downloadUrl, r.alpha.downloadUrl])]) {
    const file = route.slice(route.lastIndexOf("/") + 1), result = await landscape.asset(lm.publicationHash, file);
    yield asset("landscape", route, result.bytes, result.contentType);
  }
  const wide = new WideFieldW3PublicationService(), wm = wide.manifest();
  yield asset("wide-field-properties", wm.propertiesUrl, Buffer.from(await wide.properties(wm.publicationHash)), "text/plain; charset=utf-8");
  for (const tile of wm.tiles) yield asset("wide-field", tile.downloadUrl, await wide.tile(wm.publicationHash, tile.pixel), "image/jpeg");

  const constellation = new ConstellationPublicationService(), cm = constellation.get().data;
  for (const file of [...cm.images.map(i => i.file), cm.geometryAsset.file, ...Object.keys(cm.provenance.definitions.sourceFiles)]) {
    const result = await constellation.asset(cm.catalogHash, file);
    yield asset("constellations", `/v2/sky/constellations/${cm.catalogHash}/assets/${file}`, result.bytes, result.contentType);
  }
  for await (const image of sdss.publishedAssets())
    yield asset("sdss-optical", image.descriptor.downloadUrl, image.bytes, image.contentType, image.fieldDegrees);
  const deepSky = new DeepSkyImageryService();
  for await (const image of deepSky.publishedAssets()) yield {
    route: image.descriptor.downloadUrl, bytes: image.bytes,
    headers: skyPublicAssetHeaders("deep-sky", image.contentType, image.fieldDegrees, image),
  };
  for await (const image of prepared.publishedAssets())
    yield asset("prepared-optical", image.descriptor.downloadUrl, image.bytes, image.contentType, image.fieldDegrees);
  const sao = new SaoPublicationService(new URL('../assets/sao-v2/', import.meta.url));
  for await (const tile of sao.publishedAssets())
    yield asset("sao", `/v2/sky/supplements/sao/v2/${tile.publicationHash}/assets/${tile.tileId}`, tile.bytes, tile.contentType);
}

/** Compatibility entry point; the canonical layout has one shared owner. */
export function skyStaticDeliveryFragment(records: readonly SkyPublicAssetExportRecord[]): string {
  if (records.some(record => !validSkyStaticRoute(record.route))) throw new Error("sky_static_route_invalid");
  return sharedSkyStaticDeliveryFragment(records);
}

export async function exportSkyPublicAssets(outputDirectory: string, revision?: string,
  prepared?: PreparedOpticalImageryService, sdss?: SdssOpticalImageryService) {
  if (revision !== undefined && !/^[a-f0-9]{40}$/.test(revision)) throw new Error("sky_static_revision_invalid");
  const result = await writeSkyStaticBundle(outputDirectory, approvedSkyPublicAssets(prepared, sdss));
  if (revision !== undefined) {
    const artifact = {
      schemaVersion: "starward-sky-static-image-artifact-v1", revision,
      publicationHash: result.publicationHash,
      indexSha256: skyStaticHash(await readFile(join(result.output, "index.json"))),
      fragmentSha256: skyStaticHash(await readFile(join(result.output, "delivery.caddy"))),
    };
    const bytes = Buffer.from(JSON.stringify(artifact, null, 2) + "\n");
    const target = join(result.output, "image-artifact.json");
    await writeFile(target, bytes, { flag: "wx" });
    if (!(await readFile(target)).equals(bytes)) throw new Error("sky_static_artifact_write_readback_failed");
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf("--output");
  if (i < 0 || !process.argv[i + 1]) throw new Error("sky_static_output_required");
  const ri = process.argv.indexOf("--revision");
  console.log(JSON.stringify(await exportSkyPublicAssets(process.argv[i + 1]!, ri < 0 ? undefined : process.argv[ri + 1]!)));
}
