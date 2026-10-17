import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { NotFoundException } from "@nestjs/common";
import { assertGalacticImagePublication, galacticImageFormat, galacticImageManifestPath } from "@starward/miniapp-contracts";
const DEFAULT_MANIFEST = new URL("../assets/deep-sky/galactic-mellinger/manifest.json", import.meta.url);
const RETAINED_INFRARED_MANIFEST = new URL("../assets/deep-sky/galactic-2mass/manifest.json", import.meta.url);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
/** One current display publication and the concrete retained 2MASS version.
 * This is not a provider registry. An explicit constructor still supports the
 * frozen trial/infrared diagnostics without changing immutable version URLs. */
export class GalacticImagePublicationService {
    manifestUrl;
    cached = null;
    retainedInfrared = null;
    constructor(manifestUrl = DEFAULT_MANIFEST) {
        this.manifestUrl = manifestUrl;
    }
    readPublication(url) {
        const bytes = readFileSync(url);
        const root = JSON.parse(bytes.toString("utf8"));
        const publicationHash = hash(bytes);
        const manifest = { ...root, publicationHash, image: { ...root.image,
                downloadUrl: `/v2/sky/galactic/${publicationHash}/${root.image?.file}` } };
        try {
            assertGalacticImagePublication(manifest);
        }
        catch {
            throw new Error("galactic_image_publication_invalid");
        }
        return manifest;
    }
    publication() {
        return this.cached ??= this.readPublication(this.manifestUrl);
    }
    infraredPublication() {
        return this.retainedInfrared ??= this.readPublication(RETAINED_INFRARED_MANIFEST);
    }
    selectedImage(publicationHash, file) {
        let current;
        try {
            current = this.publication();
        }
        catch (error) {
            // Current discovery still fails closed. A request for the concrete old
            // version can keep its valid independent bytes during that failure.
            const retained = this.infraredPublication();
            if (publicationHash === retained.publicationHash && (file === undefined || file === retained.image.file))
                return { manifest: retained, url: RETAINED_INFRARED_MANIFEST };
            throw error;
        }
        if (publicationHash === current.publicationHash && (file === undefined || file === current.image.file))
            return { manifest: current, url: this.manifestUrl };
        if (current.schemaVersion !== "starward-2mass-galactic-v1") {
            const retained = this.infraredPublication();
            if (publicationHash === retained.publicationHash && (file === undefined || file === retained.image.file))
                return { manifest: retained, url: RETAINED_INFRARED_MANIFEST };
        }
        throw new NotFoundException("galactic_image_version_unavailable");
    }
    copyManifest(current) {
        return { ...current, source: { ...current.source }, projection: { ...current.projection },
            image: { ...current.image }, limitations: [...current.limitations] };
    }
    manifest() {
        const current = this.publication();
        // Export callers may annotate their response. They cannot retarget the
        // immutable file/hash/format or edit the next client's provenance.
        return this.copyManifest(current);
    }
    /** The original discovery URL remains consumable by old infrared-only
     * clients. New clients discover the selected display on its separate URL. */
    infraredManifest() {
        return this.copyManifest(this.infraredPublication());
    }
    imageManifest(publicationHash, file) {
        return this.copyManifest(this.selectedImage(publicationHash, file).manifest);
    }
    publishedMetadata(publicationHash) {
        const manifest = this.imageManifest(publicationHash);
        return { route: galacticImageManifestPath(manifest.publicationHash),
            bytes: Buffer.from(JSON.stringify(manifest) + "\n") };
    }
    /** Current plus the one concrete prior ordinary publication. Stored trials
     * and arbitrary files are not discovered or silently admitted. */
    publishedManifests() {
        const current = this.publication();
        return current.schemaVersion === "starward-2mass-galactic-v1" ? [this.copyManifest(current)] :
            [this.copyManifest(current), this.copyManifest(this.infraredPublication())];
    }
    async image(publicationHash, file) {
        const { manifest, url } = this.selectedImage(publicationHash, file);
        const bytes = await readFile(new URL(manifest.image.file, url));
        const signature = galacticImageFormat(manifest) === "png"
            ? [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
            : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;
        if (bytes.length !== manifest.image.bytes || hash(bytes) !== manifest.image.sha256 || !signature)
            throw new Error("galactic_image_corrupt");
        return bytes;
    }
}
//# sourceMappingURL=galactic-image-publication.js.map