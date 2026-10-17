import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { NotFoundException } from "@nestjs/common";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
/** Fixed local publication: rights metadata and exact bytes are checked before delivery. */
export class FixedBodyTexturePublicationService {
    manifestUrl;
    fixed;
    stored = null;
    retained;
    constructor(manifestUrl, fixed, retained = []) {
        this.manifestUrl = manifestUrl;
        this.fixed = fixed;
        // Only explicitly reviewed local editions may be retained. No path is
        // derived from a remote hash, and malformed discovery cannot enroll files.
        this.retained = retained.map(edition => new FixedBodyTexturePublicationService(edition.manifestUrl, edition.fixed));
    }
    publication() {
        if (this.stored)
            return this.stored;
        const bytes = readFileSync(this.manifestUrl);
        const root = JSON.parse(bytes.toString("utf8"));
        const usgsSource = root.source;
        const usgsProjection = root.projection;
        if (root?.schemaVersion !== this.fixed.schemaVersion ||
            root.source?.recordUrl !== this.fixed.recordUrl || root.source?.rightsUrl !== this.fixed.rightsUrl ||
            !root.source?.credit || !root.processing ||
            (this.fixed.validateMetadata
                ? !this.fixed.validateMetadata(root)
                : usgsSource.provider !== "USGS Astrogeology Science Center" ||
                    usgsSource.wmsUrl !== this.fixed.wmsUrl ||
                    usgsProjection?.kind !== "simple-cylindrical" || usgsProjection.latitude !== "planetocentric" ||
                    usgsProjection.longitude !== "positive-east" ||
                    JSON.stringify(usgsProjection.bboxDeg) !== "[-180,-90,180,90]") ||
            root.image?.file !== this.fixed.file || root.image.width !== this.fixed.width ||
            root.image.height !== this.fixed.height || root.image.bytes !== this.fixed.bytes ||
            root.image.sha256 !== this.fixed.sha256 ||
            !Array.isArray(root.limitations) || root.limitations.length < 2)
            throw new Error("body_texture_publication_invalid");
        this.stored = { root, hash: hash(bytes) };
        return this.stored;
    }
    selected(publicationHash) {
        if (!/^[a-f0-9]{64}$/u.test(publicationHash))
            throw new NotFoundException("body_texture_version_unavailable");
        for (const owner of [this, ...this.retained]) {
            try {
                if (owner.publication().hash === publicationHash)
                    return owner;
            }
            catch { /* An invalid independent edition cannot replace the requested version. */ }
        }
        throw new NotFoundException("body_texture_version_unavailable");
    }
    manifest(publicationHash) {
        if (publicationHash !== undefined)
            return this.selected(publicationHash).manifest();
        const { root, hash: selectedHash } = this.publication();
        // The stored edition owns provenance, geometry and limitations. Response
        // consumers may annotate their copy without retargeting an immutable hash.
        const response = structuredClone(root);
        return { ...response, publicationHash: selectedHash, image: { ...response.image,
                downloadUrl: `${this.fixed.route}/${selectedHash}/${this.fixed.file}` } };
    }
    publishedManifests() {
        return [this, ...this.retained].map(owner => owner.manifest()).filter((value, index, all) => all.findIndex(other => other.publicationHash === value.publicationHash) === index);
    }
    publishedMetadata(publicationHash) {
        const manifest = this.manifest(publicationHash), owner = this.selected(publicationHash);
        return { route: `${owner.fixed.route}/${publicationHash}/manifest`,
            bytes: Buffer.from(JSON.stringify(manifest) + "\n") };
    }
    async image(publicationHash) {
        const owner = this.selected(publicationHash);
        if (owner !== this)
            return owner.image(publicationHash);
        const bytes = await readFile(new URL(this.fixed.file, this.manifestUrl));
        const stored = this.publication().root.image;
        const signature = this.fixed.format === "png"
            ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;
        if (bytes.length !== stored.bytes || hash(bytes) !== stored.sha256 || !signature)
            throw new Error("body_texture_image_invalid");
        return bytes;
    }
    async imageAsset(publicationHash, file) {
        const manifest = this.manifest(publicationHash);
        if (file !== manifest.image.file)
            throw new NotFoundException("body_texture_image_unavailable");
        const owner = this.selected(publicationHash);
        return { bytes: await owner.image(publicationHash),
            contentType: owner.fixed.format === "png" ? "image/png" : "image/jpeg" };
    }
}
//# sourceMappingURL=fixed-body-texture-publication.js.map