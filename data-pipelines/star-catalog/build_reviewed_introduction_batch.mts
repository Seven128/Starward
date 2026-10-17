/** Build one offline candidate from reviewed text and retained, pinned input.
 * Never fetches sources, changes measurements, adopts runtime assets or deploys. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { loadBsc5pStarCatalog } from "../../packages/astronomy-core/src/bsc5p-catalog.ts";
import { prepareIntroductionInputs, type Inspection, type Pin } from "./prepare_introduction_batch.mts";
import { CHINESE_INTRODUCTION_PUBLICATION, encodeChineseIntroductionIndex,
  parseChineseIntroductionPublication, parseNextChineseIntroductionPublication,
  type IntroductionRow } from "../../workers/miniapp-api/src/celestial-object-introductions.ts";

type Publication = { file: string; version: string; bytes: number; sha256: string };
type Review = { reference: string; inputKey: string; identity: { hr: string; hd: string; hip: string | null };
  articleSha256: string; entitySha256: string; sourceParagraphIndexes: number[];
  state: "SELF_REVIEWED_TRANSLATION"; aliases: string[]; introduction: string;
  limitations: string[]; reviewNotes: string; omittedClaims: string[] };
type Reviews = { format: string; locale: string; parent: Publication; preflight: Pin;
  reviewedAt: string; reviewer: string; independentReview: "MISSING"; rows: Review[] };
type Preflight = { collection: { inspection: Inspection; exceptions: unknown[] };
  catalog: { version: string; hash: string } };
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const clean = (value: unknown): value is string => typeof value === "string" && Boolean(value.trim()) &&
  value === value.trim() && !/[\u0000-\u001f\u007f]/u.test(value);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.length > 0 && value.every(clean);
const edition = (version: string) => Number(/^starward-celestial-introductions\.zh-cn\.v([1-9]\d*)$/u.exec(version)?.[1]);
const same = isDeepStrictEqual;
function fail(reason: string): never { throw Error(`reviewed_introduction_${reason}`); }

export async function buildReviewedIntroductionBatch(preflight: Preflight, reviews: Reviews,
  parentBytes: Uint8Array, readPinned: (pin: Pin) => Promise<Uint8Array>) {
  if (reviews?.format !== "reviewed-chinese-introduction-batch-v1" || reviews.locale !== "zh-CN" ||
      !Array.isArray(reviews.rows) || !clean(reviews.reviewer) || reviews.independentReview !== "MISSING" ||
      !Number.isFinite(Date.parse(reviews.reviewedAt)) || new Date(reviews.reviewedAt).toISOString() !== reviews.reviewedAt)
    fail("review_manifest_invalid");
  const parent = reviews.parent;
  if (!parent || parentBytes.length !== parent.bytes || hash(parentBytes) !== parent.sha256 ||
      parent.file !== `celestial-object-introductions.zh-cn.v${edition(parent.version)}.json`)
    fail("parent_binding_invalid");
  const parentRows = parseChineseIntroductionPublication(parentBytes, parent.sha256);
  const parentPack = JSON.parse(Buffer.from(parentBytes).toString("utf8"));
  if (parentPack.version !== parent.version) fail("parent_version_mismatch");
  const catalog = loadBsc5pStarCatalog("bsc5p-bright-stars.v3");
  if (preflight?.catalog?.version !== catalog.catalogVersion || preflight.catalog.hash !== catalog.catalogHash ||
      !preflight.collection?.inspection || !Array.isArray(preflight.collection.exceptions)) fail("preflight_binding_invalid");
  // Re-read actual articles, terms and entities through the established preflight.
  // The historical preflight's runtime index is not a source input of this build.
  const prepared = await prepareIntroductionInputs(preflight.collection.inspection, catalog, readPinned, new Set(parentRows.keys()));
  const candidates = new Map(prepared.candidates.map(row => [row.reference, row]));
  const reviewCounts = new Map<string, number>();
  for (const row of reviews.rows) reviewCounts.set(row?.reference, (reviewCounts.get(row?.reference) ?? 0) + 1);
  const additions: IntroductionRow[] = [], accepted: unknown[] = [], reviewExceptions: { reference: string; reason: string }[] = [];
  const reviewedReferences = new Set<string>();
  for (const review of reviews.rows) {
    try {
      if (!review || reviewCounts.get(review.reference) !== 1) fail("duplicate_review");
      if (parentRows.has(review.reference)) fail("existing_prose_preserved");
      const candidate = candidates.get(review.reference);
      if (!candidate || candidate.inputKey !== review.inputKey || !same(candidate.identity, review.identity) ||
          candidate.article.pin.sha256 !== review.articleSha256 || candidate.entity.pin.sha256 !== review.entitySha256)
        fail("review_identity_or_source_mismatch");
      if (review.state !== "SELF_REVIEWED_TRANSLATION" || !clean(review.introduction) ||
          !strings(review.aliases) || new Set(review.aliases).size !== review.aliases.length ||
          !strings(review.limitations) || !clean(review.reviewNotes) || !strings(review.omittedClaims) ||
          !Array.isArray(review.sourceParagraphIndexes) || !review.sourceParagraphIndexes.length ||
          new Set(review.sourceParagraphIndexes).size !== review.sourceParagraphIndexes.length ||
          review.sourceParagraphIndexes.some(index => !Number.isSafeInteger(index) || index < 0 || index >= candidate.sourceParagraphs.length))
        fail("review_content_invalid");
      const { hr, hd, hip } = candidate.identity;
      const sourceUrl = candidate.article.sourceUrl, licenseUrl = candidate.licenseUrl;
      const row: IntroductionRow = { reference: candidate.reference, identity: candidate.identity, sourceLanguage: "en",
        aliases: [...review.aliases], introduction: review.introduction,
        source: { id: `editorial:wikipedia-en:hr${hr}:${candidate.article.revision}:starward-1`, kind: "EDITORIAL_REFERENCE",
          provider: "Wikipedia contributors", title: `${candidate.article.title}中文译介与检索名称（固定英文节选、翻译改编）`,
          sourceUrl, license: candidate.license, licenseUrl, publishedAt: null, retrievedAt: candidate.actualHttpRetrievedAt,
          validFrom: null, validTo: null, state: "FRESH", confidence: null,
          precision: `固定英文有限译介；精确关联 HR ${hr} / HD ${hd} / HIP ${hip ?? "未记录"}；不导入媒体、新测量或额外成员点`,
          attribution: { name: "Wikipedia contributors", url: sourceUrl, statements: [
            "英文维基百科贡献者；Starward节选固定英文原稿、翻译为简体中文并改编，未采用媒体或新测量。",
            `本中文译介、检索名称与译改按 CC BY-SA 4.0 共享：${licenseUrl}`] },
          limitations: [...review.limitations,
            ...(candidate.article.identityEvidence.scope === "DIRECT_SYSTEM_ARTICLE" ?
              ["介绍同时涉及该恒星及其所在系统；成员资料和系统整体性质分别解释，不作为新的星表测量。"] : []),
            ...(["OWN_ENTITY_SYSTEM_CODES", "OWN_ENTITY_PART_SYSTEM_CODES"].includes(candidate.article.identityEvidence.scope) ?
              ["原文包含多个HD编号的系统背景；目录测量与成员叙述分别归源，不将成员合并成新增目录对象。"] : []),
            "静态译介不提供实时亮度、方位、距离、当前可见性或物理解像保证；目录测量和当前天空帧各有独立来源。",
            candidate.actualHttpRetrievedAt
              ? "原稿与实际HTTP响应完成时刻由固定字节回执绑定；该时刻不代表文中测量的观测时刻。"
              : "原稿来自已核字节的本机固定缓存；旧记录时间是文件mtime，不是实际HTTP获取时间，因此取回时刻保持未记录。"] } };
      additions.push(row); reviewedReferences.add(review.reference);
      accepted.push({ reference: row.reference, identity: row.identity, inputKey: candidate.inputKey,
        article: candidate.article, entity: candidate.entity, sourceParagraphIndexes: review.sourceParagraphIndexes,
        selectedParagraphsSha256: hash(Buffer.from(JSON.stringify(review.sourceParagraphIndexes.map(index => candidate.sourceParagraphs[index])))),
        reviewNotes: review.reviewNotes, omittedClaims: review.omittedClaims,
        recordedSourceTime: candidate.recordedSourceTime, sourceTimeMeaning: candidate.sourceTimeMeaning });
    } catch (error) { reviewExceptions.push({ reference: review?.reference ?? "INVALID", reason: String(error) }); }
  }
  additions.sort((a, b) => a.reference.localeCompare(b.reference));
  const pending = prepared.candidates.filter(row => !reviewedReferences.has(row.reference)).map(row => row.reference);
  const inputExceptions = prepared.exceptions.map(exception => ({ ...exception,
    title: preflight.collection.inspection.rows.find(row => row.key === exception.key)?.title ?? null }));
  const report = { status: additions.length ? (inputExceptions.length || preflight.collection.exceptions.length || reviewExceptions.length || pending.length
    ? "PARTIAL_REVIEWED_LOCAL_BATCH_CANDIDATE" : "REVIEWED_LOCAL_BATCH_CANDIDATE") : "NO_REVIEWED_ADDITIONS",
    parent, retainedRows: parentRows.size, addedRows: additions.length, accepted,
    inputExceptions, inheritedCollectorExceptions: preflight.collection.exceptions, reviewExceptions, pending,
    retainedExistingInputs: prepared.retainedExisting.length, catalog: preflight.catalog,
    independentReview: reviews.independentReview, reviewer: reviews.reviewer, reviewedAt: reviews.reviewedAt,
    catalogMeasurementsChanged: false, mediaFetched: 0, networkRequests: 0, runtimeAdopted: false,
    scope: "Pinned input was re-read at the established preflight. Legacy collection failures are retained from the immutable preflight, not requalified. Only self-reviewed additions are encoded; invalid or unreviewed input cannot acquire prose. This is an offline candidate, not complete supply, independent review or deployment." };
  if (!additions.length) return { report, publicationBytes: null, indexBytes: null, publication: null };
  const nextEdition = edition(parent.version) + 1;
  const publicationBytes = Buffer.from(JSON.stringify({ ...parentPack,
    version: `starward-celestial-introductions.zh-cn.v${nextEdition}`, rows: [...parentPack.rows, ...additions] }, null, 2) + "\n");
  const sha256 = hash(publicationBytes);
  const rows = nextEdition <= edition(CHINESE_INTRODUCTION_PUBLICATION.version)
    ? parseChineseIntroductionPublication(publicationBytes, sha256) : parseNextChineseIntroductionPublication(publicationBytes, sha256);
  assert.equal(rows.size, parentRows.size + additions.length);
  for (const [reference, row] of parentRows) assert.deepEqual(rows.get(reference), row, reference);
  const indexBytes = encodeChineseIntroductionIndex(publicationBytes);
  const publication = JSON.parse(indexBytes.toString("utf8")).publication as Publication;
  return { report, publicationBytes, indexBytes, publication };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const withinRoot = (relative: string) => {
    const absolute = path.resolve(root, relative), rel = path.relative(root, absolute);
    if (!rel || rel === ".." || rel.startsWith(".." + path.sep) || path.isAbsolute(rel)) fail("path_outside_workspace");
    return absolute;
  };
  if (process.argv.length !== 4) fail("usage_review_json_output_directory");
  const reviewFile = withinRoot(process.argv[2]!), output = withinRoot(process.argv[3]!);
  if (!path.relative(root, output).replaceAll("\\", "/").startsWith("output/")) fail("output_not_task_local");
  const pins = new Map<string, Pin>();
  const readPinned = async (pin: Pin) => {
    if (!pin || !Number.isSafeInteger(pin.bytes) || pin.bytes < 1 || !/^[a-f0-9]{64}$/u.test(pin.sha256)) fail("pin_invalid");
    const bytes = await readFile(withinRoot(pin.path));
    if (bytes.length !== pin.bytes || hash(bytes) !== pin.sha256) fail("source_pin_mismatch");
    const existing = pins.get(pin.path);
    if (existing && !same(existing, pin)) fail("conflicting_source_pin");
    pins.set(pin.path, { ...pin }); return bytes;
  };
  const reviewBytes = await readFile(reviewFile), reviews = JSON.parse(reviewBytes.toString("utf8")) as Reviews;
  const preflightBytes = await readPinned(reviews.preflight), preflight = JSON.parse(preflightBytes.toString("utf8")) as Preflight;
  if (!reviews.parent || reviews.parent.file !== `celestial-object-introductions.zh-cn.v${edition(reviews.parent.version)}.json`)
    fail("parent_filename_invalid");
  const parentPin = { path: `workers/miniapp-api/assets/${reviews.parent.file}`, bytes: reviews.parent.bytes, sha256: reviews.parent.sha256 };
  const parentBytes = await readPinned(parentPin);
  const result = await buildReviewedIntroductionBatch(preflight, reviews, parentBytes, readPinned);
  for (const pin of [...pins.values()]) await readPinned(pin);
  if (!(await readFile(reviewFile)).equals(reviewBytes)) fail("review_changed_during_build");
  await mkdir(output, { recursive: false });
  if (result.publicationBytes && result.indexBytes && result.publication) {
    await writeFile(path.join(output, result.publication.file), result.publicationBytes, { flag: "wx" });
    await writeFile(path.join(output, "celestial-object-introductions.index.json"), result.indexBytes, { flag: "wx" });
  }
  await writeFile(path.join(output, "result.json"), JSON.stringify({ ...result.report,
    publication: result.publication, indexSha256: result.indexBytes ? hash(result.indexBytes) : null,
    sourcePins: [...pins.values()], sourcePinsUnchanged: true,
    reviewPin: { path: path.relative(root, reviewFile).replaceAll("\\", "/"), bytes: reviewBytes.length, sha256: hash(reviewBytes) } }, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ status: result.report.status, retainedRows: result.report.retainedRows, addedRows: result.report.addedRows,
    inputExceptions: result.report.inputExceptions.length, collectorExceptions: result.report.inheritedCollectorExceptions.length,
    reviewExceptions: result.report.reviewExceptions.length, pending: result.report.pending.length,
    publication: result.publication, indexSha256: result.indexBytes ? hash(result.indexBytes) : null, runtimeAdopted: false }));
}
