import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { NotFoundException } from "@nestjs/common";
import { assertSkyLandscapeManifest, decodeSkyLandscapeAlpha,
  type SkyLandscapeManifestData } from "@starward/miniapp-contracts";

const DEFAULT_MANIFEST = new URL("../assets/landscape/manifest.json", import.meta.url);
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
type Stored = Omit<SkyLandscapeManifestData, "publicationHash">;

/** Fixed local derivatives with their original package and both license notices. */
export class SkyLandscapePublicationService {
  private cached: SkyLandscapeManifestData | null = null;
  constructor(private readonly manifestUrl: URL = DEFAULT_MANIFEST) {}
  manifest(): SkyLandscapeManifestData {
    if (this.cached) return this.cached;
    const bytes = readFileSync(this.manifestUrl), root = JSON.parse(bytes.toString("utf8")) as Stored;
    const publicationHash = hash(bytes), prefix = `/v2/sky/landscape/${publicationHash}/`;
    const result = { ...root, publicationHash,
      source: { ...root.source, originalDownloadUrl: prefix + "stara-lesna-original.zip" },
      resources: root.resources.map(resource => ({ ...resource,
        image: { ...resource.image, downloadUrl: prefix + resource.image.file },
        alpha: { ...resource.alpha, downloadUrl: prefix + resource.alpha.file },
      })),
    };
    assertSkyLandscapeManifest(result); this.cached = result; return result;
  }
  async asset(publicationHash: string, file: string): Promise<{ bytes: Buffer; contentType: string }> {
    const publication = this.manifest();
    if (publicationHash !== publication.publicationHash) throw new NotFoundException("sky_landscape_version_unavailable");
    const resource = publication.resources.find(item => item.image.file === file || item.alpha.file === file);
    const fixed = file === "stara-lesna-original.zip"
      ? { bytes: publication.source.originalBytes, sha256: publication.source.originalSha256 }
      : resource?.image.file === file ? resource.image : resource?.alpha;
    if (!fixed) throw new NotFoundException("sky_landscape_asset_unavailable");
    const bytes = await readFile(new URL(file, this.manifestUrl));
    if (bytes.length !== fixed.bytes || hash(bytes) !== fixed.sha256) throw new Error("sky_landscape_asset_corrupt");
    if (resource?.alpha.file === file) decodeSkyLandscapeAlpha(JSON.parse(bytes.toString("utf8")), resource);
    return { bytes, contentType: file.endsWith(".png") ? "image/png"
      : file.endsWith(".json") ? "application/json; charset=utf-8" : "application/zip" };
  }
}
