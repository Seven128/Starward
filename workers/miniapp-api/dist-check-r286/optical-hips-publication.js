import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile, realpath } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NotFoundException } from "@nestjs/common";
import { assertOpticalHipsRights, opticalHipsSourceIdentityValid } from "@starward/miniapp-contracts";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const digest = (value) => typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
const validText = (value) => typeof value === "string" && value.trim().length > 0;
const validSourceId = (value) => typeof value === "string" && /^[a-z0-9-]{1,40}$/u.test(value);
const validOrder = (value) => Number.isInteger(value) && value >= 0 && value <= 11;
const validPixel = (order, pixel) => Number.isInteger(pixel) && pixel >= 0 && pixel < 12 * 4 ** order;
const expectedShard = (sourceId, order, dir) => `${sourceId}/Norder${order}/Dir${dir}/index.json`;
const expectedTile = (sourceId, order, pixel, format) => `${sourceId}/Norder${order}/Dir${Math.floor(pixel / 10000) * 10000}/Npix${pixel}.${format === "jpeg" ? "jpg" : "png"}`;
/** A root publication binds a bounded set of directory indexes, each of which
 * binds the actual tile bytes. It does not infer coverage from a source MOC. */
function validateRoot(value) {
    const root = value;
    if (!["starward-optical-hips-v1", "starward-optical-hips-v2"].includes(root?.schemaVersion) || !validText(root.publicationId) ||
        (root.scope !== "TRIAL" && root.scope !== "PRODUCTION") || !validText(root.processing) ||
        !Array.isArray(root.limitations) || !root.limitations.every(validText) ||
        !Array.isArray(root.sources) || root.sources.length < 1 || root.sources.length > 4 ||
        !Array.isArray(root.shards) || root.shards.length < 1 || root.shards.length > 20_000)
        throw new Error("optical_publication_invalid");
    const ids = new Set();
    for (const source of root.sources) {
        if (!validSourceId(source.id) || ids.has(source.id) || !validText(source.title) ||
            !validText(source.provider) || !validText(source.originalDataUrl) ||
            !validText(source.originalRights) || !validText(source.originalRightsUrl) ||
            !validText(source.hipsRecordUrl) || source.hipsLicense !== "ODbL-1.0" ||
            !opticalHipsSourceIdentityValid(source, root.schemaVersion) || (source.format !== "jpeg" && source.format !== "png") ||
            source.tileWidth !== 512 || !validOrder(source.maxOrder))
            throw new Error("optical_publication_invalid");
        ids.add(source.id);
    }
    const shardIds = new Set();
    for (const shard of root.shards) {
        const source = root.sources.find(candidate => candidate.id === shard.sourceId);
        const key = `${shard.sourceId}:${shard.order}:${shard.dir}`;
        if (!source || !validOrder(shard.order) || shard.order > source.maxOrder ||
            !Number.isInteger(shard.dir) || shard.dir < 0 || shard.dir % 10000 !== 0 ||
            shard.dir >= 12 * 4 ** shard.order || shardIds.has(key) ||
            shard.file !== expectedShard(source.id, shard.order, shard.dir) || !digest(shard.sha256) ||
            !Number.isInteger(shard.bytes) || shard.bytes < 32 || shard.bytes > 2_000_000 ||
            !Number.isInteger(shard.tileCount) || shard.tileCount < 1 || shard.tileCount > 10000)
            throw new Error("optical_publication_invalid");
        shardIds.add(key);
    }
    return root;
}
function validateShard(value, ref) {
    const shard = value;
    if (shard?.schemaVersion !== "starward-optical-hips-shard-v1" || shard.sourceId !== ref.sourceId ||
        shard.order !== ref.order || shard.dir !== ref.dir || !Array.isArray(shard.tiles) ||
        shard.tiles.length !== ref.tileCount)
        throw new Error("optical_shard_invalid");
    const seen = new Set();
    for (const tile of shard.tiles) {
        if (!validPixel(ref.order, tile.pixel) || Math.floor(tile.pixel / 10000) * 10000 !== ref.dir ||
            seen.has(tile.pixel) || !digest(tile.sha256) || !Number.isInteger(tile.bytes) ||
            tile.bytes < 24 || tile.bytes > 5_000_000)
            throw new Error("optical_shard_invalid");
        seen.add(tile.pixel);
    }
    return shard;
}
export class OpticalHipsPublicationService {
    manifestUrl;
    rightsFile;
    root = null;
    rootHash = null;
    shardCache = new Map();
    constructor(manifestUrl = null, rightsFile = null) {
        this.manifestUrl = manifestUrl;
        this.rightsFile = rightsFile;
    }
    publication() {
        if (!this.manifestUrl)
            throw new NotFoundException("optical_publication_unavailable");
        if (!this.root) {
            // A missing/invalid source is never memoized as available.
            const bytes = readFileSync(this.manifestUrl);
            this.root = validateRoot(JSON.parse(bytes.toString("utf8")));
            this.rootHash = hash(bytes);
        }
        return this.root;
    }
    requireVersion(publicationHash) {
        const root = this.publication();
        if (!digest(publicationHash) || publicationHash !== this.rootHash)
            throw new NotFoundException("optical_publication_not_found");
        return root;
    }
    manifest(selectedHash) {
        const root = selectedHash === undefined ? this.publication() : this.requireVersion(selectedHash);
        const publicationHash = this.rootHash;
        return { ...root, publicationHash, shards: root.shards.map(shard => ({ ...shard,
                indexUrl: `/v2/sky/optical/${publicationHash}/${shard.sourceId}/${shard.order}/${shard.dir}/index`,
            })) };
    }
    async index(publicationHash, sourceId, order, dir) {
        const { shard } = await this.loadShard(publicationHash, sourceId, order, dir);
        return { ...shard, publicationHash, tiles: shard.tiles.map(tile => ({ ...tile,
                downloadUrl: `/v2/sky/optical/${publicationHash}/${sourceId}/${order}/${tile.pixel}`,
            })) };
    }
    async tile(publicationHash, sourceId, order, pixel) {
        if (!validOrder(order) || !validPixel(order, pixel))
            throw new NotFoundException("optical_tile_not_found");
        const dir = Math.floor(pixel / 10000) * 10000;
        const { root, shard } = await this.loadShard(publicationHash, sourceId, order, dir);
        const source = root.sources.find(candidate => candidate.id === sourceId);
        const entry = shard.tiles.find(candidate => candidate.pixel === pixel);
        if (!entry)
            throw new NotFoundException("optical_tile_not_found");
        const bytes = await this.readOwned(expectedTile(sourceId, order, pixel, source.format));
        if (bytes.length !== entry.bytes || hash(bytes) !== entry.sha256 ||
            (source.format === "jpeg" ? (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9)
                : ![137, 80, 78, 71, 13, 10, 26, 10].every((part, i) => bytes[i] === part)))
            throw new Error("optical_tile_asset_invalid");
        return { bytes, contentType: source.format === "jpeg" ? "image/jpeg" : "image/png",
            sourceId, sourceLabel: source.title, publicationHash };
    }
    /** An explicitly supplied, byte-sealed companion adds notices without
     * rewriting any already published immutable manifest/index/image response.
     * Missing/invalid companions do not disable those independent resources. */
    async rights(publicationHash) {
        this.requireVersion(publicationHash);
        if (!this.rightsFile)
            throw new NotFoundException("optical_rights_unavailable");
        const bytes = await readFile(this.rightsFile.url);
        if (!digest(this.rightsFile.sha256) || hash(bytes) !== this.rightsFile.sha256)
            throw new Error("optical_rights_asset_invalid");
        const value = JSON.parse(bytes.toString("utf8"));
        const root = this.manifest(publicationHash);
        assertOpticalHipsRights(value, root);
        const metadata = value.alterations.completeResultMetadata;
        const originalRoot = readFileSync(this.manifestUrl);
        const verify = (item, original) => {
            const rebuilt = Buffer.from(item.utf8, "utf8");
            if (rebuilt.length !== item.bytes || hash(rebuilt) !== item.sha256 || !rebuilt.equals(original))
                throw new Error("optical_rights_metadata_invalid");
        };
        verify(metadata.manifest, originalRoot);
        for (const source of value.sources) {
            const properties = source.originalContent.sourceProperties;
            verify(properties, Buffer.from(properties.utf8, "utf8"));
        }
        const selected = new Map(value.alterations.selectedTiles.map(tile => [
            `${tile.sourceId}:${tile.order}:${tile.pixel}`, tile
        ]));
        for (const ref of root.shards) {
            const raw = await this.readOwned(ref.file);
            verify(metadata.indexes.find(index => index.file === ref.file), raw);
            if (raw.length !== ref.bytes || hash(raw) !== ref.sha256)
                throw new Error("optical_shard_asset_invalid");
            const shard = validateShard(JSON.parse(raw.toString("utf8")), ref);
            for (const tile of shard.tiles) {
                const listed = selected.get(`${ref.sourceId}:${ref.order}:${tile.pixel}`);
                if (!listed || listed.sha256 !== tile.sha256 || listed.bytes !== tile.bytes)
                    throw new Error("optical_rights_selection_invalid");
            }
        }
        return { bytes, data: value, reference: { publicationHash, sha256: this.rightsFile.sha256,
                bytes: bytes.length, downloadUrl: `/v2/sky/optical/${publicationHash}/rights/${this.rightsFile.sha256}` } };
    }
    async rightsAsset(publicationHash, offerHash) {
        this.requireVersion(publicationHash);
        if (!digest(offerHash) || offerHash !== this.rightsFile?.sha256)
            throw new NotFoundException("optical_rights_not_found");
        return this.rights(publicationHash);
    }
    /** Enumerate the exact-version consumer responses through the same integrity
     * boundary as HTTP. Never crawl a directory or invent unlisted coverage. */
    async *publishedAssets() {
        const manifest = this.manifest();
        const publicationHash = manifest.publicationHash;
        if (this.rightsFile) {
            const offer = await this.rights(publicationHash);
            yield { route: offer.reference.downloadUrl, bytes: offer.bytes,
                contentType: "application/json; charset=utf-8" };
        }
        yield { route: `/v2/sky/optical/${publicationHash}/manifest`,
            bytes: Buffer.from(JSON.stringify(manifest)), contentType: "application/json; charset=utf-8" };
        for (const ref of manifest.shards) {
            const index = await this.index(publicationHash, ref.sourceId, ref.order, ref.dir);
            yield { route: ref.indexUrl, bytes: Buffer.from(JSON.stringify(index)),
                contentType: "application/json; charset=utf-8" };
            for (const entry of index.tiles) {
                const tile = await this.tile(publicationHash, ref.sourceId, ref.order, entry.pixel);
                yield { route: entry.downloadUrl, bytes: tile.bytes, contentType: tile.contentType, sourceId: tile.sourceId };
            }
        }
    }
    async loadShard(publicationHash, sourceId, order, dir) {
        const root = this.requireVersion(publicationHash);
        const ref = root.shards.find(item => item.sourceId === sourceId && item.order === order && item.dir === dir);
        if (!ref)
            throw new NotFoundException("optical_shard_not_found");
        const key = ref.file;
        let shard = this.shardCache.get(key);
        if (!shard) {
            const bytes = await this.readOwned(ref.file);
            if (bytes.length !== ref.bytes || hash(bytes) !== ref.sha256)
                throw new Error("optical_shard_asset_invalid");
            shard = validateShard(JSON.parse(bytes.toString("utf8")), ref);
            this.shardCache.set(key, shard);
            if (this.shardCache.size > 8)
                this.shardCache.delete(this.shardCache.keys().next().value);
        }
        return { root, shard };
    }
    async readOwned(file) {
        if (!this.manifestUrl)
            throw new NotFoundException("optical_publication_unavailable");
        const root = await realpath(dirname(fileURLToPath(this.manifestUrl)));
        const asset = await realpath(resolve(root, file));
        const beneath = relative(root, asset);
        if (!beneath || beneath === ".." || beneath.startsWith(`..\\`) || beneath.startsWith("../") ||
            resolve(root, beneath) !== asset)
            throw new Error("optical_publication_path_invalid");
        return readFile(asset);
    }
}
// The root metadata is small and immutable for one service instance; tile bytes
// stay asynchronous. Kept local to avoid a runtime upstream network boundary.
//# sourceMappingURL=optical-hips-publication.js.map