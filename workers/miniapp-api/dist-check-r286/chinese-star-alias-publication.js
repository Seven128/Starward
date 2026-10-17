import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { loadBsc5pStarCatalog } from "@starward/astronomy-core/bsc5p-catalog";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
/** A fixed CC0 label publication, linked only by exact BSC HR identity. It
 * adds search names, never stellar coordinates, photometry or official names. */
export function parseChineseStarAliasPublication(bytes, manifest, base) {
    const metadata = manifest;
    const versions = base.catalogVersion === "bsc5p-bright-stars.v2" ? ["wikidata-bsc5p-chinese-aliases.v1"] :
        base.catalogVersion === "bsc5p-bright-stars.v3" ? ["wikidata-bsc5p-chinese-aliases.v2", "wikidata-bsc5p-chinese-aliases.v3"] : [];
    if (!metadata || !versions.includes(String(metadata.catalogVersion)) ||
        typeof metadata.assetSha256 !== "string" || sha256(bytes) !== metadata.assetSha256 ||
        !Number.isInteger(metadata.rowCount) || metadata.rowCount !== 3149 ||
        typeof metadata.sourceSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(metadata.sourceSha256) ||
        typeof metadata.sourceRetrievedAt !== "string" || !Number.isFinite(Date.parse(metadata.sourceRetrievedAt)) ||
        metadata.license !== "CC0 1.0" || metadata.licenseUrl !== "https://www.wikidata.org/wiki/Wikidata:Licensing" ||
        metadata.queryUrl !== "https://query.wikidata.org/sparql")
        throw Error("chinese_star_alias_manifest_invalid");
    const pack = JSON.parse(Buffer.from(bytes).toString("utf8"));
    if (pack.schemaVersion !== "wikidata-bsc5p-chinese-aliases-v1" ||
        pack.catalogVersion !== metadata.catalogVersion || pack.baseCatalogVersion !== base.catalogVersion ||
        pack.baseCatalogHash !== base.catalogHash || pack.sourceSha256 !== metadata.sourceSha256 ||
        pack.sourceRetrievedAt !== metadata.sourceRetrievedAt || !Array.isArray(pack.rows) ||
        pack.rows.length !== metadata.rowCount)
        throw Error("chinese_star_alias_pack_invalid");
    if (metadata.catalogVersion === "wikidata-bsc5p-chinese-aliases.v3") {
        const provenance = pack.sourceProvenance;
        const previous = provenance?.previousPublication, entity = provenance?.entity;
        if (provenance?.schemaVersion !== "wikidata-bsc5p-chinese-aliases-source-v1" ||
            JSON.stringify(provenance) !== JSON.stringify(metadata.sourceProvenance) ||
            sha256(Buffer.from(`${JSON.stringify(provenance)}\n`)) !== pack.sourceSha256 ||
            previous?.catalogVersion !== "wikidata-bsc5p-chinese-aliases.v2" ||
            typeof previous.assetSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(previous.assetSha256) ||
            typeof previous.sourceSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(previous.sourceSha256) ||
            !Number.isFinite(Date.parse(previous.sourceRetrievedAt)) ||
            !/^Q[1-9]\d*$/u.test(entity?.wikidataItem) || !/^HR:[1-9]\d{0,3}$/u.test(entity?.reference) ||
            entity.sourceUrl !== `https://www.wikidata.org/wiki/Special:EntityData/${entity.wikidataItem}.json` ||
            typeof entity.sourceSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(entity.sourceSha256) ||
            entity.retrievedAt !== pack.sourceRetrievedAt || !Number.isSafeInteger(entity.lastRevision) ||
            entity.lastRevision < 1 || !Number.isFinite(Date.parse(entity.modifiedAt)) ||
            !pack.rows.some((row) => row.reference === entity.reference && row.wikidataItem === entity.wikidataItem))
            throw Error("chinese_star_alias_provenance_invalid");
    }
    const validReferences = new Set(base.rows.map(row => row.sourceId));
    const aliasesByReference = new Map();
    let previous = 0;
    for (const row of pack.rows) {
        if (!row || typeof row.reference !== "string" || !/^HR:[1-9]\d{0,3}$/u.test(row.reference) ||
            !validReferences.has(row.reference) || Number(row.reference.slice(3)) <= previous ||
            typeof row.wikidataItem !== "string" || !/^Q[1-9]\d*$/u.test(row.wikidataItem) ||
            !Array.isArray(row.aliases) || row.aliases.length < 1 || row.aliases.length > 3 ||
            row.aliases.some((value) => typeof value !== "string" || value.length > 32 ||
                !/\p{Script=Han}/u.test(value) || /[\u0000-\u001f\u007f]/u.test(value)) ||
            new Set(row.aliases).size !== row.aliases.length)
            throw Error("chinese_star_alias_row_invalid");
        previous = Number(row.reference.slice(3));
        aliasesByReference.set(row.reference, Object.freeze([...row.aliases]));
    }
    const source = Object.freeze({
        id: `catalog:wikidata-zh:${metadata.assetSha256}`, kind: "OPEN_DATA",
        provider: "Wikidata contributors", title: metadata.catalogVersion === "wikidata-bsc5p-chinese-aliases.v3" ?
            "Wikidata 中文恒星标签及别名（BSC5P HR 精确关联）" : "Wikidata 中文恒星标签（BSC5P HR 精确关联）",
        sourceUrl: "https://www.wikidata.org/", license: "CC0 1.0", licenseUrl: String(metadata.licenseUrl),
        publishedAt: null, retrievedAt: String(metadata.sourceRetrievedAt), validFrom: null, validTo: null,
        state: "FRESH", confidence: 0.8,
        precision: "仅精确 HR 编号关联；中文标签不用于坐标或分量合并",
        limitations: ["Wikidata 社区中文标签，仅作检索别名；不是 IAU 正式中文名或已审中文介绍。",
            "固定获取版本，未承诺覆盖全部 BSC5P 恒星或保持 Wikidata 实时更新。",
            "同一中文标签可能对应多颗恒星；搜索结果保留各自 HR 身份。",
            ...(metadata.catalogVersion === "wikidata-bsc5p-chinese-aliases.v3" ?
                [`原中文标签取得于 ${pack.sourceProvenance.previousPublication.sourceRetrievedAt}；仅 ${pack.sourceProvenance.entity.reference} 的别名补自 ${pack.sourceRetrievedAt} 的固定版本。`] : [])],
    });
    return Object.freeze({ catalogVersion: String(metadata.catalogVersion), catalogHash: String(metadata.assetSha256),
        rowCount: aliasesByReference.size, aliasesFor: (reference) => aliasesByReference.get(reference) ?? [], source });
}
const loaded = new Map();
/** Reviewed factual-name corrections qualify the immutable upstream labels at
 * their shared publication owner, so search and details cannot diverge. */
function reviewedChineseStarAliases(publication, base) {
    const bytes = readFileSync(new URL("../assets/celestial-names-reviewed-corrections.v3.json", import.meta.url));
    const correctionHash = sha256(bytes);
    if (correctionHash !== "32fb98dcb19988fc409798d4561923a3eaecaf0f44161b97f4fc4fa4ec00fffe")
        throw Error("chinese_star_alias_corrections_hash_mismatch");
    const corrections = JSON.parse(bytes.toString("utf8"));
    if (!corrections.upstreamPublications.some((upstream) => upstream.catalogVersion === publication.catalogVersion && upstream.assetSha256 === publication.catalogHash))
        throw Error("chinese_star_alias_corrections_upstream_mismatch");
    const corrected = new Map();
    for (const correction of corrections.rows) {
        const star = base.rows.find(row => row.sourceId === correction.reference);
        const previous = publication.aliasesFor(correction.reference);
        if (!star || star.hr !== correction.identity.hr || star.hd !== correction.identity.hd ||
            star.hip !== correction.identity.hip || !correction.evidence.catalogs.includes(base.catalogVersion) ||
            !correction.rejectedAliases.every((alias) => previous.includes(alias)))
            throw Error("chinese_star_alias_corrections_identity_mismatch");
        corrected.set(correction.reference, Object.freeze([...new Set([
                ...previous.filter(alias => !correction.rejectedAliases.includes(alias)), ...correction.aliases,
            ])]));
    }
    const catalogHash = sha256(Buffer.from(JSON.stringify({ upstream: publication.catalogHash, correctionHash })));
    const source = Object.freeze({ ...publication.source,
        id: `catalog:reviewed-wikidata-zh:${catalogHash}`,
        provider: "Wikidata contributors；Starward 名称复核",
        title: "Wikidata 中文恒星检索名称（含已审订正）",
        publishedAt: corrections.reviewedAt,
        precision: `${publication.source.precision}；名称订正依据固定来源和相符的目录身份`,
        attribution: { name: "Wikidata contributors；Starward", url: publication.source.sourceUrl,
            statements: ["原固定标签与本版事实名称订正按 CC0 1.0 提供；没有修改上游 Wikidata。",
                ...corrections.rows.map((row) => `名称订正依据：${row.evidence.englishLabel ?? row.evidence.articleTitle}（${row.evidence.sourceUrl}）。`)] },
        limitations: [...(publication.source.limitations ?? []),
            "本版只订正有明确来源及目录身份依据的名称；不代表全目录已经人工复核。",
            "名称订正不供应中文介绍，不改变坐标、测光或恒星分量。"], });
    return Object.freeze({ ...publication, catalogVersion: corrections.catalogVersion, catalogHash,
        aliasesFor: (reference) => corrected.get(reference) ?? publication.aliasesFor(reference), source });
}
export function loadChineseStarAliasesForBase(baseVersion) {
    const cached = loaded.get(baseVersion);
    if (cached)
        return cached;
    const revised = baseVersion === "bsc5p-bright-stars.v3";
    const location = new URL(revised ? "../assets/celestial-names-v3/" : "../assets/celestial-names/", import.meta.url);
    const bytes = readFileSync(new URL(revised ? "chinese-bright-star-aliases.v3.json" : "chinese-bright-star-aliases.v1.json", location));
    const manifest = JSON.parse(readFileSync(new URL("publication.json", location), "utf8"));
    const base = loadBsc5pStarCatalog(baseVersion);
    const current = reviewedChineseStarAliases(parseChineseStarAliasPublication(bytes, manifest, base), base);
    loaded.set(baseVersion, current);
    return current;
}
export function loadChineseStarAliases() { return loadChineseStarAliasesForBase("bsc5p-bright-stars.v2"); }
//# sourceMappingURL=chinese-star-alias-publication.js.map