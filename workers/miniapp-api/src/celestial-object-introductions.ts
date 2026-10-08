import type { SourceSummary } from "@starward/miniapp-contracts";
import type { Bsc5pStarRow } from "@starward/astronomy-core/bsc5p-catalog";
import type { DeepSkyCatalogRow } from "@starward/astronomy-core/deep-sky-catalog";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isCelestialObjectReference, isDeepSkyObjectReference, skyLuminaryBody, skyPlanetBody } from "@starward/miniapp-contracts";

type PublishedIntroduction = { introduction: string; source: SourceSummary };
interface IntroductionRow extends PublishedIntroduction {
  reference: string;
  identity: { hr: string; hd: string; hip: string | null } | { ngcName: string; messier: number | null; kind: "GALAXY" | "NEBULA" } | null;
  aliases?: readonly string[];
  sourceLanguage?: "en";
}
export const CHINESE_INTRODUCTION_PUBLICATION = Object.freeze({
  file: "celestial-object-introductions.zh-cn.v72.json",
  version: "starward-celestial-introductions.zh-cn.v72",
  bytes: 643978,
  sha256: "587c4b3f7f773d352925932062716ea570485f18ddaa0a6d2c9730c29b5c204d",
});
const indexSha256 = "de94f9230a564ef33bcce3a3a6eab2366f3af5701ee7eaa66702fa2fae08e7e7";

function validOriginalSource(row: IntroductionRow, allowTranslated: boolean) {
  const source = row.source;
  if (row.sourceLanguage === undefined)
    return source.sourceUrl?.startsWith("https://zh.wikipedia.org/w/index.php?oldid=");
  if (!allowTranslated || row.sourceLanguage !== "en" ||
    !source.sourceUrl?.startsWith("https://en.wikipedia.org/w/index.php?")) return false;
  const url = new URL(source.sourceUrl);
  return url.pathname === "/w/index.php" && !url.hash && !url.username && !url.password && !url.port &&
    [...url.searchParams.keys()].length === 2 && url.searchParams.getAll("oldid").length === 1 &&
    /^[1-9]\d*$/u.test(url.searchParams.get("oldid") ?? "") && url.searchParams.getAll("title").length === 1 &&
    Boolean(url.searchParams.get("title")?.trim()) &&
    source.attribution!.statements.includes("英文维基百科贡献者；Starward节选固定英文原稿、翻译为简体中文并改编，未采用媒体或新测量。") &&
    source.attribution!.statements.some(statement => statement.includes(source.licenseUrl!));
}

function validIdentity(row: IntroductionRow, allowMissingHip: boolean) {
  const identity = row.identity;
  if (row.reference.startsWith("HR:")) return identity && "hr" in identity &&
    typeof identity.hr === "string" && row.reference === `HR:${identity.hr}` &&
    typeof identity.hd === "string" && /^[1-9]\d*$/u.test(identity.hd) &&
    (typeof identity.hip === "string" && /^[1-9]\d*$/u.test(identity.hip) || allowMissingHip && identity.hip === null) &&
    (row.aliases === undefined || Array.isArray(row.aliases) && row.aliases.length > 0 &&
      row.aliases.every(alias => typeof alias === "string" && alias.trim() && !/[\u0000-\u001f\u007f]/u.test(alias)));
  if (isDeepSkyObjectReference(row.reference)) return identity && "ngcName" in identity &&
    /^NGC [1-9]\d*$/u.test(identity.ngcName) && ["GALAXY", "NEBULA"].includes(identity.kind) &&
    (row.reference.startsWith("M:") ? row.reference === `M:${identity.messier}` :
      identity.messier === null && row.reference === identity.ngcName.replace(" ", ":")) &&
    Array.isArray(row.aliases) && row.aliases.length > 0 && row.aliases.every(a => typeof a === "string" && a.trim());
  return identity === null && Boolean(skyLuminaryBody(row.reference) || skyPlanetBody(row.reference));
}

/** The admitted offline edition is independent of measurements and renderer assets. */
export function parseChineseIntroductionPublication(bytes: Uint8Array, expectedHash: string = CHINESE_INTRODUCTION_PUBLICATION.sha256) {
  if (createHash("sha256").update(bytes).digest("hex") !== expectedHash)
    throw Error("celestial_introduction_publication_hash_mismatch");
  const pack = JSON.parse(Buffer.from(bytes).toString("utf8"));
  const editionText = /^starward-celestial-introductions\.zh-cn\.v([1-9]\d*)$/u.exec(pack.version)?.[1];
  const edition = Number(editionText);
  if (!(edition >= 2 && edition <= 72) || pack.locale !== "zh-CN" || !Array.isArray(pack.rows))
    throw Error("celestial_introduction_publication_invalid");
  const rows = new Map<string, IntroductionRow>();
  for (const row of pack.rows as IntroductionRow[]) {
    if (!row || !isCelestialObjectReference(row.reference) || rows.has(row.reference) ||
      typeof row.introduction !== "string" || !row.introduction.trim() ||
      row.source?.kind !== "EDITORIAL_REFERENCE" || row.source.license !== "CC-BY-SA-4.0" ||
      row.source.licenseUrl !== "https://creativecommons.org/licenses/by-sa/4.0/" ||
      !row.source.attribution?.statements.length || row.source.attribution.url !== row.source.sourceUrl ||
      !validOriginalSource(row, edition >= 25) ||
      !validIdentity(row, edition >= 7))
      throw Error("celestial_introduction_row_invalid");
    rows.set(row.reference, row);
  }
  return rows;
}

/** Hash-bound membership is derived from the admitted asset, never edited per object. */
export function parseChineseIntroductionIndex(bytes: Uint8Array, expectedHash: string = indexSha256) {
  if (createHash("sha256").update(bytes).digest("hex") !== expectedHash)
    throw Error("celestial_introduction_index_hash_mismatch");
  const index = JSON.parse(Buffer.from(bytes).toString("utf8"));
  if (index?.format !== "celestial-introductions-index-v1" || index.locale !== "zh-CN" ||
    !index.publication || ["file", "version", "bytes", "sha256"].some(key =>
      index.publication[key] !== CHINESE_INTRODUCTION_PUBLICATION[key as keyof typeof CHINESE_INTRODUCTION_PUBLICATION]) ||
    !Array.isArray(index.references) || !index.references.length ||
    index.references.some((reference: unknown) => typeof reference !== "string" || !isCelestialObjectReference(reference)))
    throw Error("celestial_introduction_index_invalid");
  const references: string[] = index.references;
  const sorted = [...references].sort();
  if (new Set(references).size !== references.length ||
    references.some((reference, position) => reference !== sorted[position]))
    throw Error("celestial_introduction_index_invalid");
  return new Set(references) as ReadonlySet<string>;
}

export function createChineseIntroductionLookup(
  readPublication: () => Uint8Array = () => readFileSync(new URL(`../assets/${CHINESE_INTRODUCTION_PUBLICATION.file}`, import.meta.url)),
  readIndex: () => Uint8Array = () => readFileSync(new URL("../assets/celestial-object-introductions.index.json", import.meta.url)),
) {
  let references: ReadonlySet<string> | undefined;
  let batch: ReadonlyMap<string, IntroductionRow> | undefined;
  return (reference: string) => {
    // Failed reads/parses are never retained; independent facts recover on retry.
    references ??= parseChineseIntroductionIndex(readIndex());
    if (!references.has(reference)) return null;
    if (!batch) {
      const admitted = parseChineseIntroductionPublication(readPublication());
      if (admitted.size !== references.size || [...references].some(key => !admitted.has(key)))
        throw Error("celestial_introduction_index_rows_mismatch");
      batch = admitted;
    }
    const row = batch.get(reference);
    if (!row) throw Error("celestial_introduction_publication_missing_row");
    return structuredClone(row);
  };
}
const batchIntroduction = createChineseIntroductionLookup();

export function publishedBodyIntroduction(reference: string): PublishedIntroduction | null {
  if (!skyLuminaryBody(reference) && !skyPlanetBody(reference)) return null;
  const row = batchIntroduction(reference);
  return row ? { introduction: row.introduction, source: row.source } : null;
}

export function publishedDeepSkyIntroduction(row: DeepSkyCatalogRow) {
  const entry = batchIntroduction(row.objectRef);
  if (!entry) return null;
  const identity = entry.identity;
  if (!identity || !("ngcName" in identity) || identity.ngcName !== row.ngcName ||
    identity.messier !== row.messier || identity.kind !== row.kind)
    throw Error("celestial_introduction_identity_mismatch");
  return { introduction: entry.introduction, source: entry.source, aliases: entry.aliases! };
}

// Only the adapted prose below is CC BY-SA 4.0. No media or numerical catalog data
// is imported. The fixed original, rights inspection and identity are task-pinned.
const sourceUrl = "https://zh.wikipedia.org/w/index.php?oldid=94362172&title=%E5%8F%83%E5%AE%BF%E5%9B%9B";
const licenseUrl = "https://creativecommons.org/licenses/by-sa/4.0/";
const introduction = "参宿四（Betelgeuse）是一颗红超巨星。它呈明显的红色，属于半规则变星，亮度会随时间变化。它的拜耳名称是猎户座α，拉丁名称为 Alpha Orionis，缩写为 Alpha Ori 或 α Ori。";
const source: SourceSummary = {
  id: "editorial:wikipedia-zh:hr2061:94362172:starward-1", kind: "EDITORIAL_REFERENCE",
  provider: "Wikipedia contributors", title: "参宿四中文介绍（固定导语节选、改编）",
  sourceUrl, license: "CC-BY-SA-4.0", licenseUrl,
  publishedAt: "2026-09-14T19:56:00.000Z", retrievedAt: "2026-10-06T12:09:33.173Z",
  validFrom: null, validTo: null, state: "FRESH", confidence: null,
  precision: "静态科普介绍；精确关联 HR 2061 / HD 39801 / HIP 27989，不合并其它目录或分量",
  attribution: {
    name: "Wikipedia contributors", url: sourceUrl,
    statements: [
      "中文维基百科贡献者；Starward 对固定导语节选、转换为简体并改编措辞，未采用全文或影像。",
      `本介绍正文及其改编按 CC BY-SA 4.0 共享：${licenseUrl}`,
    ],
  },
  limitations: [
    "原条目带有翻译质量警示；本次仅采用已核对的分类、颜色、变光类型和名称说明。",
    "静态介绍不提供实时亮度、观测地点可见性、距离或超新星发生时间；目录测量和当前天空帧各有独立来源。",
  ],
};

/** A fixed publication, served by the existing information API, with no upstream request. */
export function publishedStarIntroduction(row: Bsc5pStarRow): (PublishedIntroduction & { aliases?: readonly string[] }) | null {
  if (row.sourceId !== "HR:2061") {
    const entry = batchIntroduction(row.sourceId);
    if (!entry) return null;
    const identity = entry.identity;
    if (!identity || !("hr" in identity) || row.hr !== identity.hr || row.hd !== identity.hd || row.hip !== identity.hip)
      throw new Error("celestial_introduction_identity_mismatch");
    return { introduction: entry.introduction, source: entry.source, ...(entry.aliases ? { aliases: entry.aliases } : {}) };
  }
  if (row.hr !== "2061" || row.hd !== "39801" || row.hip !== "27989")
    throw new Error("celestial_introduction_identity_mismatch");
  return structuredClone({ introduction, source });
}
