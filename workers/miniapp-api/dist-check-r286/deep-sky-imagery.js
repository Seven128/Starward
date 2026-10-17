import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { NotFoundException } from "@nestjs/common";
import { deepSkyRowByReference, loadDeepSkyCatalog } from "@starward/astronomy-core/deep-sky-catalog";
import { DEEP_SKY_IMAGE_PIXELS, DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION, assertDeepSkyImageDiscovery, readSkyImageDisplaySupport } from "@starward/miniapp-contracts";
const DEFAULT_MANIFEST = new URL("../assets/deep-sky/manifest.json", import.meta.url);
const SOURCE_LABEL = "NASA/IPAC IRSA - AllWISE W3 12um";
const ADOPTED_ENTRY_COUNT = 51;
const ADOPTED_PROVIDER = "NASA/IPAC Infrared Science Archive (IRSA)";
const ADOPTED_DATASET = "AllWISE W3 HiPS from raw Atlas Images";
const ADOPTED_DOI = "10.26131/IRSA153";
function assertLevel(value) {
    if (value !== "OVERVIEW" && value !== "MEDIUM" && value !== "DETAIL")
        throw new Error("deep_sky_image_level_invalid");
}
function expectedFile(reference, level, asset) {
    const stem = reference.replace(":", "-");
    return asset.imageFormat === "png" ? `${stem}/${stem}-${level.toLowerCase()}.${asset.sha256}.png`
        : `${stem}/${stem}-${level.toLowerCase()}.jpg`;
}
const HIPS_ROOT = "https://irsa.ipac.caltech.edu/data/hips/CDS/AllWISE/W3";
const isHash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
function validFiniteSource(asset, entry) {
    const mask = asset.sourceFiniteMask, wcs = asset.wcsHeader, source = asset.source;
    const step = 2 * Math.tan(asset.fieldDegrees * Math.PI / 360) / asset.pixels * 180 / Math.PI;
    if (!mask || mask.kind !== "NONFINITE_HIPS_SAMPLES" ||
        !Number.isInteger(mask.missingPixels) || !Number.isInteger(mask.finitePixels) ||
        mask.missingPixels < 0 || mask.finitePixels <= 0 ||
        mask.missingPixels + mask.finitePixels !== asset.pixels ** 2 ||
        !wcs || wcs.CTYPE1 !== "RA---TAN" || wcs.CTYPE2 !== "DEC--TAN" || wcs.RADESYS !== "ICRS" ||
        wcs.CRPIX1 !== asset.pixels / 2 || wcs.CRPIX2 !== asset.pixels / 2 ||
        typeof wcs.CRVAL1 !== "number" || typeof wcs.CRVAL2 !== "number" ||
        Math.abs(wcs.CRVAL1 - entry.center.raDeg) > 1e-10 || Math.abs(wcs.CRVAL2 - entry.center.decDeg) > 1e-10 ||
        typeof wcs.CDELT1 !== "number" || typeof wcs.CDELT2 !== "number" ||
        Math.abs(wcs.CDELT1 + step) > 1e-12 || Math.abs(wcs.CDELT2 - step) > 1e-12 ||
        !source || source.dataSurveyUrl !== HIPS_ROOT || source.propertiesUrl !== HIPS_ROOT + "/properties" ||
        !isHash(source.propertiesSha256) || source.tileWidth !== 512 ||
        !Number.isInteger(source.sourceOrder) || source.sourceOrder < 0 || source.sourceOrder > 8 ||
        source.sampling !== "nearest NESTED cell at order+9; FITS column=NW,row=511-NE" ||
        !Array.isArray(source.tiles) || !source.tiles.length || source.tiles.length > 32)
        return false;
    const paths = new Set();
    return source.tiles.every(tile => {
        const match = /^Norder(\d)\/Dir(\d+)\/Npix(\d+)\.fits$/u.exec(tile.path);
        if (!match || Number(match[1]) !== source.sourceOrder || Number(match[2]) !== Math.floor(Number(match[3]) / 10000) * 10000 ||
            Number(match[3]) >= 12 * 4 ** source.sourceOrder || tile.url !== `${HIPS_ROOT}/${tile.path}` ||
            !isHash(tile.sha256) || !Number.isInteger(tile.bytes) || tile.bytes <= 0 ||
            tile.receipt?.completeArrayReceived !== true || !Number.isInteger(tile.receipt.missingEndPaddingBytes) ||
            tile.receipt.missingEndPaddingBytes < 0 || tile.receipt.missingEndPaddingBytes >= 2880 || paths.has(tile.path))
            return false;
        paths.add(tile.path);
        return true;
    });
}
function validatePublication(value, requireComplete) {
    const publication = value;
    const catalog = requireComplete ? loadDeepSkyCatalog() : null;
    const legacy = publication?.schemaVersion === "allwise-w3-deep-sky-publication-v1";
    const v2 = publication?.schemaVersion === "allwise-w3-deep-sky-publication-v2";
    const finite = publication?.schemaVersion === "allwise-w3-deep-sky-publication-v3";
    const unmeasured = v2 || finite;
    if ((!legacy && !unmeasured) || !publication.publicationId || /:/u.test(publication.publicationId) ||
        (v2 && publication.previousPublicationHash !== null &&
            (typeof publication.previousPublicationHash !== "string" || !/^[a-f0-9]{64}$/u.test(publication.previousPublicationHash))) ||
        (finite && (!isHash(publication.legacyPublicationHash) || !Array.isArray(publication.previousPublicationHashes) ||
            publication.previousPublicationHashes.length < 2 || new Set(publication.previousPublicationHashes).size !== publication.previousPublicationHashes.length ||
            !publication.previousPublicationHashes.every(isHash) || !publication.previousPublicationHashes.includes(publication.legacyPublicationHash))) ||
        publication.source?.band !== "W3" || publication.source?.wavelengthMicrometers !== 12 ||
        publication.processing?.runtimeNetwork !== "forbidden" ||
        publication.processing?.orientation !== "north-up/east-left" ||
        !Array.isArray(publication.entries) || publication.entryCount !== publication.entries.length ||
        (requireComplete && (publication.entryCount !== ADOPTED_ENTRY_COUNT ||
            publication.catalogVersion !== catalog?.catalogVersion || publication.catalogSha256 !== catalog?.catalogHash ||
            publication.source.provider !== ADOPTED_PROVIDER || publication.source.dataset !== ADOPTED_DATASET ||
            publication.source.doi !== ADOPTED_DOI || !publication.source.landingUrl.startsWith("https://irsa.ipac.caltech.edu/") ||
            !publication.source.documentationUrl.startsWith("https://irsa.ipac.caltech.edu/") || !publication.source.acknowledgment ||
            publication.source.acknowledgmentUrl !== "https://irsa.ipac.caltech.edu/data/WISE/docs/release/AllWISE/expsup/sec1_6b.html" ||
            publication.source.copyright !== "IPAC/NASA" || publication.source.hipsCopyright !== "CNRS/Unistra" ||
            publication.source.hipsLicense !== "ODbL-1.0" || publication.source.hipsDoi !== "10.26093/cds/aladin/na1n-03" ||
            publication.source.hipsLicenseUrl !== "https://opendatacommons.org/licenses/odbl/1-0/" || !publication.source.hipsProvider || !publication.source.hipsRecordUrl ||
            publication.distribution?.databaseLicense !== "ODbL-1.0" || !publication.distribution.notice || !publication.distribution.catalogNotice ||
            publication.processing.service !== (finite ? "CDS hips2fits and Starward HiPS TAN" : "CDS hips2fits") || publication.processing.serviceUrl !== "https://alasky.cds.unistra.fr/hips-image-services/hips2fits" || !publication.processing.modification ||
            !Array.isArray(publication.processing.limitations) || publication.processing.limitations.length < 2 ||
            !publication.processing.limitations.some(limit => /historical/iu.test(limit)) ||
            !publication.processing.limitations.some(limit => /detector artifacts/iu.test(limit)))))
        throw new Error("deep_sky_image_publication_invalid");
    const references = new Set();
    for (const entry of publication.entries) {
        const row = deepSkyRowByReference(entry.objectRef);
        if (!row || references.has(entry.objectRef) ||
            entry.orientation !== "north-up/east-left")
            throw new Error("deep_sky_image_publication_invalid");
        if (requireComplete && (entry.center?.frame !== "ICRS J2000" || entry.center.raDeg !== row.raDeg || entry.center.decDeg !== row.decDeg))
            throw new Error("deep_sky_image_publication_invalid");
        references.add(entry.objectRef);
        for (const level of ["OVERVIEW", "MEDIUM", "DETAIL"]) {
            const asset = entry.levels?.[level];
            if (!asset || asset.file !== expectedFile(entry.objectRef, level, asset) || !isHash(asset.sha256) ||
                !Number.isFinite(asset.fieldDegrees) || asset.fieldDegrees <= 0 || asset.fieldDegrees > 8 ||
                asset.pixels !== DEEP_SKY_IMAGE_PIXELS[level] || !Number.isInteger(asset.bytes) || asset.bytes < 4 ||
                (asset.imageFormat !== undefined && asset.imageFormat !== "jpeg" && asset.imageFormat !== "png") ||
                (asset.imageFormat === "png" ? !finite || !validFiniteSource(asset, entry) : asset.sourceFiniteMask !== undefined) ||
                (asset.displaySupport !== undefined && (asset.imageFormat !== "png" ||
                    !readSkyImageDisplaySupport(asset.displaySupport, asset.pixels, asset.sha256))) ||
                (unmeasured ? asset.validFraction !== null || asset.coverageState !== "NOT_MEASURED" :
                    !Number.isFinite(asset.validFraction) || asset.validFraction === null || asset.validFraction < 0.5 || asset.validFraction > 1))
                throw new Error("deep_sky_image_publication_invalid");
        }
    }
    return publication;
}
export class DeepSkyImageryService {
    manifestUrl;
    cachedPublication = null;
    cachedPreviousPublications = new Map();
    requireComplete;
    constructor(manifestUrl = DEFAULT_MANIFEST) {
        this.manifestUrl = manifestUrl;
        this.requireComplete = manifestUrl.href === DEFAULT_MANIFEST.href;
    }
    source(reference, selection = {}) {
        const publication = this.publication(selection);
        const entry = publication.entries.find(candidate => candidate.objectRef === reference);
        if (!entry)
            return null;
        const { source, processing } = publication;
        // Bounded asset-only fixtures have no adopted provenance to disclose.
        if (!source.acknowledgment || !source.acknowledgmentUrl || !source.hipsLicense || !publication.distribution?.notice || !processing.modification)
            return null;
        const revision = this.hash(publication);
        return {
            id: `imagery:${publication.publicationId}:${revision}`, kind: "OPEN_DATA", provider: source.provider,
            title: "AllWISE W3 12 µm 巡天影像", sourceUrl: source.landingUrl,
            license: "ODbL-1.0（HiPS 数据库）；AllWISE 影像另附声明", licenseUrl: source.hipsLicenseUrl,
            publishedAt: null, retrievedAt: null, validFrom: null, validTo: null,
            state: "FRESH", confidence: null, precision: "历史 W3 12 µm 红外巡天；按目标裁切，北向上，东向左",
            limitations: [publication.distribution.notice, `HiPS 数据库：${source.hipsRecordUrl}；许可：${source.hipsLicenseUrl}`,
                source.acknowledgment, `AllWISE 声明：${source.acknowledgmentUrl}`,
                `数据版权：${source.copyright}；HiPS：${source.hipsProvider}，${source.hipsCopyright}。`,
                `Atlas 数据引用：https://doi.org/${source.doi}；HiPS：https://doi.org/${source.hipsDoi}`,
                `影像加工：${processing.service}；${processing.serviceUrl}`,
                processing.modification, ...processing.limitations,
                ...(publication.schemaVersion !== "allwise-w3-deep-sky-publication-v1" ?
                    ["此出版物未测量源数据有效覆盖比例；未带源缺测标记的JPEG中黑色可能来自低亮度或无数据，不能由JPEG推定全覆盖或缺测位置。"] :
                    ["历史清单中的validFraction来自显示检查，不是科学有效覆盖测量，不能据此认定全覆盖。"]),
                ...Object.entries(entry.levels).flatMap(([level, asset]) => asset.sourceFiniteMask ?
                    [`${level} PNG：${asset.sourceFiniteMask.missingPixels}/${asset.pixels ** 2}个非有限HiPS样本留空；有限暗像素保留。透明度不是探测器伪影、曝光深度或科学有效率的测量。`] : [])],
        };
    }
    manifest(publicationHash) {
        const publication = structuredClone(this.publication({ publicationHash }));
        return { ...publication, publicationHash, entries: publication.entries.map(entry => ({ ...entry,
                levels: Object.fromEntries(Object.entries(entry.levels).map(([level, asset]) => [level, { ...asset,
                        downloadUrl: `/v2/celestial-objects/${encodeURIComponent(entry.objectRef)}/image?level=${level}&publicationHash=${publicationHash}`,
                    }])),
            })) };
    }
    /** Current metadata discovery performs no image-byte read or upstream fetch. */
    discovery(reference) {
        const publication = this.publication({ imageVersion: DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION });
        const entry = publication.entries.find(candidate => candidate.objectRef === reference);
        if (!entry)
            throw new NotFoundException("deep_sky_image_not_published");
        const publicationHash = this.hash(publication), source = this.source(reference, { publicationHash });
        if (!source)
            throw new NotFoundException("deep_sky_image_source_unavailable");
        const result = {
            schemaVersion: "allwise-w3-selected-image-discovery-v1", imageVersion: DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION,
            publicationHash, publicationId: publication.publicationId, sourceId: source.id, source,
            objectRef: entry.objectRef, center: structuredClone(entry.center), orientation: entry.orientation,
            levels: Object.fromEntries(Object.entries(entry.levels).map(([level, asset]) => [level, this.descriptor(publicationHash, asset)])),
        };
        assertDeepSkyImageDiscovery(result, reference);
        return result;
    }
    descriptor(publicationHash, asset) {
        return {
            file: asset.file, downloadUrl: `/v2/sky/deep-sky/${publicationHash}/${asset.file}`,
            sha256: asset.sha256, bytes: asset.bytes, format: asset.imageFormat === "png" ? "png" : "jpeg",
            pixels: asset.pixels, width: asset.pixels, height: asset.pixels, fieldDegrees: asset.fieldDegrees,
            // The historical v1 display fraction never measured scientific availability.
            validFraction: null, coverageState: "NOT_MEASURED",
            ...(asset.sourceFiniteMask ? { sourceFiniteMask: structuredClone(asset.sourceFiniteMask) } : {}),
            ...(asset.displaySupport ? { displaySupport: readSkyImageDisplaySupport(asset.displaySupport, asset.pixels, asset.sha256) } : {}),
        };
    }
    /** Only the exact admitted raw-publication file can supply an immutable route.
     * In contrast to the legacy get(), no current metadata refinement is inherited. */
    async getByFile(publicationHash, file) {
        if (!isHash(publicationHash) || typeof file !== "string")
            throw new NotFoundException("deep_sky_image_not_found");
        const publication = this.publication({ publicationHash });
        for (const entry of publication.entries) {
            const asset = Object.values(entry.levels).find(candidate => candidate.file === file);
            if (!asset)
                continue;
            const bytes = await this.readAsset(asset), descriptor = this.descriptor(publicationHash, asset);
            return { bytes, descriptor, contentType: descriptor.format === "png" ? "image/png" : "image/jpeg",
                fieldDegrees: asset.fieldDegrees, pixelSize: asset.pixels, sourceLabel: SOURCE_LABEL,
                publicationHash, sourceId: `imagery:${publication.publicationId}:${publicationHash}`,
                ...(asset.sourceFiniteMask ? { sourceMissingPixels: asset.sourceFiniteMask.missingPixels } : {}),
                ...(descriptor.displaySupport ? { displaySupport: descriptor.displaySupport } : {}),
            };
        }
        throw new NotFoundException("deep_sky_image_not_found");
    }
    /** All and only admitted current/allowed archives; no filesystem crawl. */
    publishedManifests() {
        const current = this.publication({ imageVersion: DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION });
        const hashes = [this.hash(current), ...(current.previousPublicationHashes ??
                (current.previousPublicationHash ? [current.previousPublicationHash] : []))];
        return [...new Set(hashes)].map(hash => this.manifest(hash));
    }
    async *publishedAssets() {
        for (const publication of this.publishedManifests())
            for (const entry of publication.entries)
                for (const asset of Object.values(entry.levels))
                    yield await this.getByFile(publication.publicationHash, asset.file);
    }
    async get(reference, levelInput = "MEDIUM", publicationHash, imageVersion) {
        assertLevel(levelInput);
        if (!deepSkyRowByReference(reference))
            throw new Error("deep_sky_image_not_found");
        const publication = this.publication({ ...(publicationHash !== undefined ? { publicationHash } : {}),
            ...(imageVersion !== undefined ? { imageVersion } : {}) });
        const entry = publication.entries.find((candidate) => candidate.objectRef === reference);
        if (!entry)
            throw new Error("deep_sky_image_not_published");
        const asset = entry.levels[levelInput];
        const bytes = await this.readAsset(asset);
        const png = asset.imageFormat === "png";
        const revision = this.hash(publication);
        // An archived PNG may receive the same byte-bound display refinement without
        // rewriting its manifest, source identity or bytes. Changed assets never inherit it.
        const currentAsset = this.cachedPublication?.entries.find(candidate => candidate.objectRef === reference)?.levels[levelInput];
        const displaySupport = (png && currentAsset?.sha256 === asset.sha256 && currentAsset.pixels === asset.pixels ?
            currentAsset.displaySupport : undefined) ?? asset.displaySupport;
        return { bytes, contentType: png ? "image/png" : "image/jpeg", fieldDegrees: asset.fieldDegrees,
            pixelSize: asset.pixels, sourceLabel: SOURCE_LABEL, publicationHash: revision,
            sourceId: `imagery:${publication.publicationId}:${revision}`,
            ...(asset.sourceFiniteMask ? { sourceMissingPixels: asset.sourceFiniteMask.missingPixels } : {}),
            ...(displaySupport ? { displaySupport } : {}) };
    }
    async readAsset(asset) {
        const assetUrl = new URL(asset.file, this.manifestUrl);
        const root = fileURLToPath(new URL("./", this.manifestUrl));
        const path = fileURLToPath(assetUrl);
        if (!path.startsWith(root))
            throw new Error("deep_sky_image_publication_invalid");
        const bytes = await readFile(assetUrl);
        const png = asset.imageFormat === "png";
        const formatValid = png ? bytes.length >= 45 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
            bytes.toString("ascii", 12, 16) === "IHDR" && bytes.readUInt32BE(16) === asset.pixels && bytes.readUInt32BE(20) === asset.pixels &&
            bytes[24] === 8 && bytes[25] === 6 && bytes.subarray(-8, -4).toString("ascii") === "IEND" :
            bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;
        if (bytes.length !== asset.bytes || createHash("sha256").update(bytes).digest("hex") !== asset.sha256 || !formatValid)
            throw new Error("deep_sky_image_asset_invalid");
        return bytes;
    }
    publication({ publicationHash, imageVersion } = {}) {
        if (imageVersion !== undefined && imageVersion !== DEEP_SKY_SOURCE_FINITE_IMAGE_VERSION)
            throw new Error("deep_sky_image_version_invalid");
        // One small local metadata read serves synchronous object details and async
        // image delivery. Invalid reads are not cached; JPEG bytes remain async.
        this.cachedPublication ??= validatePublication(JSON.parse(readFileSync(this.manifestUrl, "utf8")), this.requireComplete);
        const current = this.cachedPublication;
        if (!publicationHash && !imageVersion && current.schemaVersion === "allwise-w3-deep-sky-publication-v3")
            publicationHash = current.legacyPublicationHash;
        if (!publicationHash || publicationHash === this.hash(current))
            return current;
        const allowed = current.schemaVersion === "allwise-w3-deep-sky-publication-v3" ? current.previousPublicationHashes :
            current.schemaVersion === "allwise-w3-deep-sky-publication-v2" ? [current.previousPublicationHash] : [];
        if (!isHash(publicationHash) || !allowed.includes(publicationHash))
            throw new NotFoundException("deep_sky_image_publication_not_found");
        if (!this.cachedPreviousPublications.has(publicationHash)) {
            try {
                const previous = validatePublication(JSON.parse(readFileSync(new URL(`publications/${publicationHash}.json`, this.manifestUrl), "utf8")), this.requireComplete);
                if ((publicationHash === current.legacyPublicationHash && previous.schemaVersion !== "allwise-w3-deep-sky-publication-v2") ||
                    this.hash(previous) !== publicationHash)
                    throw new Error("deep_sky_image_previous_publication_invalid");
                this.cachedPreviousPublications.set(publicationHash, previous);
            }
            catch {
                throw new NotFoundException("deep_sky_image_publication_not_found");
            }
        }
        return this.cachedPreviousPublications.get(publicationHash);
    }
    hash(publication) {
        return createHash("sha256").update(JSON.stringify(publication)).digest("hex");
    }
}
//# sourceMappingURL=deep-sky-imagery.js.map