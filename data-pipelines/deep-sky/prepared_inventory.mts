/** Read-only joins over existing processing/review/writer/publication owners.
 * No inference, encoding, registration, adoption, export or remote access. */
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { PreparedOpticalImageryService } from '../../workers/miniapp-api/src/prepared-optical-imagery.ts';
import { assertPreparedRenderedOpticalManifest, opticalPublicationReference, opticalAssetDimensions,
  preparedRenderedOpticalAssets, preparedOpticalDisplayGeometry } from '../../packages/miniapp-contracts/src/prepared-rendered-optical-publication.ts';
import { validateSkyStaticBundle } from '../../tools/deployment/sky-static-bundle.mjs';

export interface InventoryBinding { path: string; bytes: number; sha256: string }
type Json = Record<string, unknown>;
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
function fail(code: string): never { throw new Error(`prepared_inventory_${code}`); }
const object = (value: unknown): Json => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('object_invalid');
  return value as Json;
};
const array = (value: unknown): unknown[] => { if (!Array.isArray(value)) fail('array_invalid'); return value; };
const binding = (value: unknown): InventoryBinding => {
  const b = object(value);
  if (typeof b.path !== 'string' || !b.path || path.isAbsolute(b.path) || b.path.includes('\\') ||
    b.path.split('/').some(v => !v || v === '.' || v === '..') || !Number.isSafeInteger(b.bytes) ||
    Number(b.bytes) < 0 || typeof b.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(b.sha256)) fail('binding_invalid');
  return { path: b.path as string, bytes: b.bytes as number, sha256: b.sha256 as string };
};
const contentEqual = (a: unknown, b: unknown) => {
  const x = object(a), y = object(b); return x.bytes === y.bytes && x.sha256 === y.sha256;
};
const withoutUrl = (value: unknown) => { const { downloadUrl: _url, ...rest } = object(value); return rest; };

/** Buffers parsed as JSON are themselves pinned. Large provenance inputs are
 * hashed sequentially, never accumulated as an image/decode working set. */
class Inputs {
  readonly bindings = new Map<string, InventoryBinding>();
  constructor(readonly root: string) {}
  async file(b: InventoryBinding) {
    const selected = path.resolve(this.root, b.path), physical = await realpath(selected);
    const relative = path.relative(await realpath(this.root), physical);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) fail('outside_root');
    return selected;
  }
  async verify(value: unknown) {
    const b = binding(value), prior = this.bindings.get(b.path);
    if (prior && !isDeepStrictEqual(prior, b)) fail('conflicting_input');
    if (prior) return b;
    const selected = await this.file(b), before = await stat(selected);
    if (!before.isFile() || before.size !== b.bytes) fail('input_identity');
    const digest = createHash('sha256'); let bytes = 0;
    for await (const chunk of createReadStream(selected)) { digest.update(chunk); bytes += chunk.length; }
    const after = await stat(selected);
    if (bytes !== b.bytes || digest.digest('hex') !== b.sha256 || before.mtimeMs !== after.mtimeMs || before.size !== after.size)
      fail('input_identity');
    this.bindings.set(b.path, b); return b;
  }
  async json(value: unknown) {
    const b = await this.verify(value);
    // Same ceiling as the existing optical receipt reader.
    if (b.bytes > 8 * 1024 * 1024) fail('json_too_large');
    const raw = await readFile(await this.file(b));
    if (raw.length !== b.bytes || hash(raw) !== b.sha256) fail('input_identity');
    return object(JSON.parse(raw.toString('utf8')));
  }
  async finish() {
    const saved = [...this.bindings.values()]; this.bindings.clear();
    for (const b of saved) await this.verify(b);
  }
}

interface Candidate { id: string; scope: string; batchStatus: unknown; batchReason?: unknown; fileReview: unknown; manifest?: InventoryBinding;
  writer?: InventoryBinding; publicationHash?: string; reviewSpec?: Json }
async function reviewRow(inputs: Inputs, spec: Json, id: string) {
  const processingBinding = binding(spec.processingReceipt), review = await inputs.json(spec.reviewReceipt);
  const background = review.schemaVersion === 'optical-display-background-review-v1';
  const denoised = review.schemaVersion === 'optical-display-denoise-review-v1';
  if ((!background && !denoised && review.schema !== 'sxt-review-queue-v1') || !isDeepStrictEqual(review.processingReceipt, processingBinding)) fail('review_join');
  const processing = await inputs.json(processingBinding);
  if (denoised ? processing.schemaVersion !== 'background-display-nxt-trial-result-v1' :
    background ? processing.schemaVersion !== 'optical-display-background-batch-result-v1' : processing.schema !== 'sxt-processing-v1') fail('processing_schema');
  const select = (value: unknown) => {
    const matches = array(value).map(object).filter(row => row.id === id);
    if (matches.length !== 1) fail('review_row_identity'); return matches[0];
  };
  const selected = select(processing.rows), reviewed = select(review.rows);
  const row = denoised ? { ...selected, outputs: selected.output && selected.vendor ?
    { 'display.png': selected.output, 'vendor.png': selected.vendor } : {} } : selected;
  // Prior review is a recorded decision. Readback verifies its exact receipt,
  // processing key/output joins and current bytes; it does not repeat judging.
  if (review.decisionReceipt) {
    const decisions = await inputs.json(review.decisionReceipt);
    if (!isDeepStrictEqual(decisions.processingReceipt, processingBinding)) fail('decision_join');
    const decision = select(decisions.decisions);
    if (decision.status !== reviewed.status || decision.reason !== reviewed.reason ||
      decision.processingKeySha256 !== reviewed.processingKeySha256 || !isDeepStrictEqual(decision.outputs, row.outputs)) fail('decision_join');
  } else if (reviewed.status === 'FILE_REVIEW_PASSED_SCENE_PENDING') fail('passed_review_decision_missing');
  if (!isDeepStrictEqual(reviewed.outputs, row.outputs)) fail('review_output_join');
  for (const output of Object.values(object(row.outputs ?? {}))) await inputs.verify(output);
  return { row, reviewed };
}

async function candidatesFromBatch(inputs: Inputs, receiptBinding: unknown): Promise<Candidate[]> {
  const receipt = await inputs.json(receiptBinding), rows = array(receipt.rows).map(object);
  const scope = binding(receiptBinding).path;
  if (receipt.schema === 'prepared-native-reviewed-batch-result-v1') {
    // Original v1 writers put the batch binding first; new writers name it.
    // Remaining provenance can contain PNG/XML and must never be parsed as JSON.
    const upstream = array(receipt.inputs), batch = await inputs.json(receipt.batchReceipt ?? upstream[0]);
    if (batch.schema !== 'prepared-native-reviewed-batch-v1') fail('native_batch_join');
    const spec = object(batch.review), review = await inputs.json(spec.reviewReceipt);
    const reviewedIds = array(review.rows).map(object).map(row => row.id);
    if ((receipt.reviewReceipt && !isDeepStrictEqual(receipt.reviewReceipt, spec.reviewReceipt)) ||
      new Set(reviewedIds).size !== reviewedIds.length ||
      rows.length !== reviewedIds.length || new Set(rows.map(r => r.id)).size !== rows.length ||
      rows.some(row => !reviewedIds.includes(row.id))) fail('native_batch_row_coverage');
    return rows.map(row => ({ id: String(row.id), scope, batchStatus: row.status, batchReason: row.reason ?? row.error,
      fileReview: row.fileReview,
      reviewSpec: { ...spec, id: row.id }, ...(row.manifest ? { manifest: binding(row.manifest) } : {}),
      ...(row.writerReceipt ? { writer: binding(row.writerReceipt) } : {}),
      ...(typeof row.publicationHash === 'string' ? { publicationHash: row.publicationHash } : {}) }));
  }
  if (receipt.schemaVersion === 'prepared-derived-region-batch-result-v1') {
    const batch = await inputs.json(receipt.manifest);
    if (batch.schemaVersion !== 'prepared-derived-region-batch-v1') fail('region_batch_join');
    const recipes = array(batch.recipes).map(object);
    if (new Set(recipes.map(r => r.reference)).size !== recipes.length ||
      rows.length !== recipes.length || new Set(rows.map(r => r.reference)).size !== rows.length ||
      rows.some(row => !recipes.some(r => r.reference === row.reference))) fail('region_batch_row_coverage');
    return rows.map(row => {
      const recipe = recipes.find(r => r.reference === row.reference)!;
      const result = row.result ? object(row.result) : null;
      const manifests = result ? array(result.files).map(binding).filter(b => path.posix.basename(b.path) === 'manifest.json') : [];
      if (result && manifests.length !== 1) fail('region_manifest_join');
      return { id: String(row.reference), scope, batchStatus: row.status, batchReason: row.error, fileReview: result?.fileReview ?? 'MISSING',
        reviewSpec: { processingReceipt: recipe.processingReceipt, reviewReceipt: recipe.reviewReceipt, id: recipe.processingId },
        ...(manifests.length ? { manifest: manifests[0] } : {}),
        ...(result?.writerReceipt ? { writer: binding(result.writerReceipt) } : {}),
        ...(typeof result?.publicationHash === 'string' ? { publicationHash: result.publicationHash } : {}) };
    });
  }
  fail('batch_schema');
}

export async function inspectPreparedInventory(root: string, inputBinding: InventoryBinding,
  ordinary = new PreparedOpticalImageryService()) {
  const inputs = new Inputs(path.resolve(root)), input = await inputs.json(inputBinding);
  if (input.schemaVersion !== 'prepared-optical-inventory-input-v1') fail('input_schema');
  const batches = array(input.batchReceipts ?? []), standalone = array(input.candidates ?? []);
  if (!batches.length && !standalone.length) fail('empty_inventory');
  const exceptions: { scope: string; error: string }[] = [], candidates: Candidate[] = [];
  const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);
  for (const b of batches) {
    try { candidates.push(...await candidatesFromBatch(inputs, b)); }
    catch (error) { exceptions.push({ scope: object(b).path as string, error: errorText(error) }); }
  }
  for (const value of standalone) {
    const row = object(value);
    candidates.push({ id: String(row.id), scope: 'EXPLICIT', batchStatus: 'EXPLICIT_EXISTING_CANDIDATE', fileReview: 'MISSING',
      manifest: binding(row.manifest), writer: binding(row.writerReceipt),
      ...(row.reviewSpec ? { reviewSpec: object(row.reviewSpec) } : {}) });
  }
  const decisions: Json[] = [];
  for (const b of array(input.decisions ?? [])) {
    try {
      const receipt = await inputs.json(b);
      if (receipt.schemaVersion !== 'prepared-optical-review-decisions-v1') fail('review_decisions_schema');
      decisions.push(...array(receipt.decisions).map(object));
    } catch (error) { exceptions.push({ scope: object(b).path as string, error: errorText(error) }); }
  }
  const ordinaryManifests = [...ordinary.registeredPublications()], registered = new Map(ordinaryManifests.map(m => [m.publicationHash, m]));
  const staticRecords: { route: string; bytes: number; sha256: string }[] = [];
  for (const b of array(input.staticIndexes ?? [])) {
    try {
      const pin = await inputs.verify(b);
      if (path.posix.basename(pin.path) !== 'index.json') fail('static_index_name');
      const sealed = await validateSkyStaticBundle(path.dirname(await inputs.file(pin)));
      staticRecords.push(...sealed.records);
    } catch (error) { exceptions.push({ scope: object(b).path as string, error: errorText(error) }); }
  }
  const recordsByRoute = new Map<string, typeof staticRecords>();
  for (const record of staticRecords) recordsByRoute.set(record.route, [...(recordsByRoute.get(record.route) ?? []), record]);
  const rows: Json[] = [], admitted = new Map<string, Json>(), qualified = new Map<string, Json>();
  const rowKey = (c: Candidate) => `${c.scope}\0${c.id}`;
  const duplicateIds = new Set(candidates.filter((c, i) => candidates.findIndex(x => rowKey(x) === rowKey(c)) !== i).map(rowKey));
  for (const candidate of candidates) {
    const row: Json = { id: candidate.id, scope: candidate.scope, batchStatus: candidate.batchStatus,
      ...(candidate.batchReason !== undefined ? { batchReason: candidate.batchReason } : {}), fileReview: candidate.fileReview,
      scene: 'MISSING', registration: 'UNVERIFIED', rights: 'UNVERIFIED', ordinaryAdoption: false, delivery: 'UNVERIFIED', blockers: [] };
    rows.push(row);
    try {
      if (duplicateIds.has(rowKey(candidate))) fail('duplicate_row_id');
      let review: Awaited<ReturnType<typeof reviewRow>> | undefined;
      if (candidate.reviewSpec) {
        review = await reviewRow(inputs, candidate.reviewSpec, String(candidate.reviewSpec.id));
        if (candidate.fileReview !== 'MISSING' && candidate.fileReview !== review.reviewed.status) fail('file_review_join');
        row.fileReview = review.reviewed.status;
      }
      if (!candidate.manifest) { row.blockers = ['NO_PUBLICATION', `FILE_REVIEW_${row.fileReview}`]; continue; }
      const raw = await inputs.json(candidate.manifest), reference = opticalPublicationReference(raw as unknown as { reference: string });
      const publicationHash = typeof raw.publicationHash === 'string' ? raw.publicationHash : candidate.publicationHash;
      if (typeof reference !== 'string' || typeof publicationHash !== 'string' ||
        (candidate.publicationHash && publicationHash !== candidate.publicationHash)) fail('manifest_identity');
      assertPreparedRenderedOpticalManifest(raw, reference, publicationHash);
      const owner = new PreparedOpticalImageryService([{ reference, expectedHash: publicationHash,
        manifestUrl: pathToFileURL(await inputs.file(candidate.manifest)) }]), manifest = owner.manifest(publicationHash);
      // Batch writers use one fixed sibling receipt. Its bytes are discovered
      // then checked against the candidate/producer graph, never mistaken for
      // the manifest's pin. Explicit standalone inputs supply their own pin.
      const writerPin = candidate.writer ?? await inventoryFileBinding(root,
        path.posix.join(path.posix.dirname(candidate.manifest.path), 'writer-receipt.json'));
      const writer = await inputs.json(writerPin);
      if (writer.status !== 'OFFLINE_PREPARED_OPTICAL_CANDIDATE_PACKAGED' || writer.publicationHash !== publicationHash ||
        !array(writer.files).some(b => isDeepStrictEqual(binding(b), candidate.manifest))) fail('writer_join');
      for (const b of array(writer.inputs)) await inputs.verify(b);
      const producerBinding = array(writer.inputs).find(b => contentEqual(b, manifest.processing.producerReceipt));
      if (!producerBinding) fail('producer_missing');
      const producer = await inputs.json(producerBinding);
      if (producer.version !== manifest.processing.producerVersion) fail('producer_version');
      if ('nominalTan' in manifest && !isDeepStrictEqual(producer.nominalTan, manifest.nominalTan)) fail('producer_geometry');
      if ('registration' in manifest && !isDeepStrictEqual(producer.registration, manifest.registration)) fail('producer_registration');
      for (const key of ['separation', 'restoration', 'background', 'denoising']) if (key in manifest.processing &&
        !isDeepStrictEqual(object(manifest.processing)[key], producer[key])) fail('producer_review_join');
      for (const b of array(producer.inputs ?? []))
        if (!array(writer.inputs).some(w => isDeepStrictEqual(binding(w), binding(b)))) fail('producer_input_join');
      for (const [level, asset] of Object.entries(manifest.levels))
        if (!isDeepStrictEqual(withoutUrl(asset), object(producer.levels)[level])) fail('producer_level_join');
      if (review) {
        const receipt = object(manifest.processing), modifier = object(receipt.producerVersion === 'prepared-native-source-denoised-background-display-v1'
          ? receipt.background : receipt.denoising ?? receipt.background ?? receipt.restoration ?? receipt.separation ?? receipt);
        if (!contentEqual(modifier.processingReceipt, candidate.reviewSpec!.processingReceipt) ||
          !contentEqual(modifier.reviewReceipt, candidate.reviewSpec!.reviewReceipt)) fail('publication_review_join');
        const detail = manifest.levels.DETAIL, starless = object(review.row.outputs).starless;
        const supplied = object(review.row.outputs)['display.png'] ?? object(review.row.outputs).coveredStarless ?? starless;
        if (!contentEqual(detail, supplied)) fail('detail_review_join');
      }
      const assets: Json[] = [];
      for (const descriptor of preparedRenderedOpticalAssets(manifest)) {
        const saved = array(writer.files).map(binding).find(b => b.path === path.posix.join(path.posix.dirname(candidate.manifest!.path), descriptor.file));
        if (!saved || !contentEqual(saved, descriptor)) fail('writer_asset_join');
        await inputs.verify(saved);
        await owner.getByFile(publicationHash, descriptor.file);
        const level = Object.entries(manifest.levels).find(([, v]) => v.file === descriptor.file)?.[0];
        assets.push({ role: level ? 'IMAGE' : 'SUPPORT', ...(level ? { level } : {}), route: descriptor.downloadUrl,
          file: saved, dimensions: opticalAssetDimensions(descriptor), fieldDegrees: descriptor.fieldDegrees });
      }
      for (const metadata of owner.publishedMetadata()) assets.push({ role: 'METADATA', route: metadata.route,
        file: { bytes: metadata.bytes.length, sha256: hash(metadata.bytes) } });
      const decisionFor = async (kind: string) => {
        const selected = decisions.filter(d => d.publicationHash === publicationHash && d.kind === kind);
        if (!selected.length) return kind === 'SCENE' ? 'MISSING' : 'UNVERIFIED';
        if (selected.length !== 1) fail('decision_duplicate');
        const decision = selected[0];
        if (!isDeepStrictEqual(binding(decision.manifest), candidate.manifest) || typeof decision.reason !== 'string' ||
          !decision.reason.trim() || !['PASSED', 'FAILED', 'UNKNOWN', 'MISSING', 'UNVERIFIED'].includes(String(decision.status))) fail('decision_identity');
        const evidence = array(decision.evidence);
        if (!evidence.length) fail('decision_evidence_missing');
        for (const b of evidence) await inputs.verify(b);
        const retained = object(row.reviewDecisions ?? {});
        retained[kind] = { recordedStatus: decision.status, reason: decision.reason, evidence,
          ...(decision.implementation ? { implementation: decision.implementation } : {}) };
        row.reviewDecisions = retained;
        if (kind === 'SCENE') {
          const implementation = array(decision.implementation);
          if (!implementation.length) fail('scene_implementation_missing');
          try { for (const b of implementation) await inputs.verify(b); }
          catch { return 'STALE'; }
        }
        return String(decision.status);
      };
      if (decisions.some(d => d.publicationHash === publicationHash && d.kind === 'FILE')) {
        // Unprocessed source files have no SXT receipt. This separate route
        // must never override a processing review or qualify only one tier.
        const source = manifest.source;
        if (candidate.reviewSpec || !['prepared-native-full-source-v1', 'prepared-native-ready-texture-v1'].includes(manifest.processing.producerVersion) ||
          !('encoded' in source)) fail('full_source_file_review_wrong_mechanism');
        const status = await decisionFor('FILE');
        const original = array(writer.inputs).map(binding).find(b => contentEqual(b, source.encoded));
        const evidence = array(object(object(row.reviewDecisions).FILE).evidence).map(binding);
        const required = [original, ...assets.filter(a => a.role === 'IMAGE').map(a => binding(a.file))];
        if (required.some(b => !b || !evidence.some(e => isDeepStrictEqual(e, b)))) fail('full_source_file_review_evidence_missing');
        row.fileReview = status === 'PASSED' ? 'FILE_REVIEW_PASSED_SCENE_PENDING' : status === 'FAILED' ? 'NEEDS_REPAIR' : 'PENDING_REVIEW';
      }
      row.scene = await decisionFor('SCENE'); row.registration = await decisionFor('REGISTRATION'); row.rights = await decisionFor('RIGHTS');
      const ordinaryManifest = registered.get(publicationHash);
      row.ordinaryAdoption = Boolean(ordinaryManifest && isDeepStrictEqual(ordinaryManifest, manifest));
      if (row.ordinaryAdoption) for (const asset of preparedRenderedOpticalAssets(ordinaryManifest!))
        await ordinary.getByFile(publicationHash, asset.file);
      const missingRoutes = assets.filter(asset => !(recordsByRoute.get(String(asset.route)) ?? []).some(r => contentEqual(r, asset.file))).map(a => a.route);
      row.delivery = input.staticIndexes && array(input.staticIndexes).length ? missingRoutes.length ? 'PARTIAL' : 'COMPLETE' : 'UNVERIFIED';
      const blockers = [row.fileReview !== 'FILE_REVIEW_PASSED_SCENE_PENDING' ? `FILE_REVIEW_${row.fileReview}` : null,
        ...['scene', 'registration', 'rights'].filter(k => row[k] !== 'PASSED').map(k => `${k.toUpperCase()}_${row[k]}`),
        !row.ordinaryAdoption ? 'NOT_ORDINARY_ADOPTED' : null, row.delivery !== 'COMPLETE' ? `DELIVERY_${row.delivery}` : null].filter(Boolean);
      Object.assign(row, { reference, publicationHash, manifest: candidate.manifest, assets, missingRoutes, blockers,
        footprint: 'nominalTan' in manifest ? { nominalTan: manifest.nominalTan, displayTan: preparedOpticalDisplayGeometry(manifest), sourceUvBounds: manifest.levels.DETAIL.sourceUvBounds,
          ...('counts' in manifest.source ? { counts: manifest.source.counts } : {}) } : { center: manifest.center, fieldDegrees: manifest.levels.DETAIL.fieldDegrees },
        detail: { ...opticalAssetDimensions(manifest.levels.DETAIL), sourceResolution: 'sourceResolution' in manifest.processing
          ? manifest.processing.sourceResolution : 'UNKNOWN', scientificValidity: 'UNKNOWN' } });
      admitted.set(publicationHash, row);
      // Count a publication once if an independently valid row closes every
      // obligation. A later incomplete receipt cannot overwrite that fact.
      if (!blockers.length) qualified.set(publicationHash, row);
    } catch (error) { row.error = errorText(error); row.blockers = ['JOIN_OR_ADMISSION_FAILED']; exceptions.push({ scope: candidate.id, error: row.error as string }); }
  }
  const knownHashes = new Set(admitted.keys());
  for (const d of decisions) if (!knownHashes.has(String(d.publicationHash)) || !['FILE', 'SCENE', 'REGISTRATION', 'RIGHTS'].includes(String(d.kind)))
    exceptions.push({ scope: String(d.publicationHash), error: 'prepared_inventory_orphan_decision' });
  for (const [publicationHash] of registered) if (!knownHashes.has(publicationHash))
    exceptions.push({ scope: publicationHash, error: 'prepared_inventory_ordinary_publication_without_batch' });
  const unique = [...admitted.values()];
  const assetTotals = (values: Json[]) => {
    const byRole = (role: string) => values.flatMap(row => array(row.assets).map(object)).filter(a => a.role === role);
    const count = (assets: Json[]) => {
      const files = new Map(assets.map(a => { const b = object(a.file); return [String(b.sha256), b]; }));
      return { records: assets.length, uniqueFiles: files.size, uniqueBytes: [...files.values()].reduce((n, b) => n + Number(b.bytes), 0) };
    };
    return { publications: values.length, objects: new Set(values.filter(r => !String(r.reference).startsWith('REGION:')).map(r => r.reference)).size,
      regions: new Set(values.filter(r => String(r.reference).startsWith('REGION:')).map(r => r.reference)).size,
      images: count(byRole('IMAGE')), support: count(byRole('SUPPORT')), metadata: count(byRole('METADATA')),
      payload: count(values.flatMap(row => array(row.assets).map(object))) };
  };
  await inputs.finish();
  return { schemaVersion: 'prepared-optical-inventory-v1', rows, exceptions, inputs: [...inputs.bindings.values()],
    candidates: assetTotals(unique), distributable: assetTotals([...qualified.values()]),
    ordinaryRegistry: { scope: 'SUPPLIED_SERVICE_OWNER', publications: ordinaryManifests.map(m => ({ reference: opticalPublicationReference(m), publicationHash: m.publicationHash })) },
    completeness: exceptions.length ? 'PARTIAL' : 'COMPLETE_FOR_DECLARED_INPUTS',
    meaning: 'Read-only declared-input inventory. Review, registration, rights, adoption and sealed delivery remain independent. No full-sky coverage, physical disk or live production claim.' };
}

export async function inventoryFileBinding(root: string, relative: string): Promise<InventoryBinding> {
  const normalized = path.resolve(root, relative), rel = path.relative(path.resolve(root), normalized).split(path.sep).join('/');
  const selected = binding({ path: rel, bytes: 0, sha256: '0'.repeat(64) }), inputs = new Inputs(path.resolve(root));
  const file = await inputs.file(selected), info = await stat(file), digest = createHash('sha256');
  if (!info.isFile()) fail('input_not_file');
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return { path: rel, bytes: info.size, sha256: digest.digest('hex') };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), get = (name: string) => args[args.indexOf(name) + 1];
  const root = fileURLToPath(new URL('../../', import.meta.url));
  if (!args.includes('--input') || !args.includes('--input-sha256') || !args.includes('--output')) fail('arguments');
  const selected = await inventoryFileBinding(root, get('--input'));
  if (selected.sha256 !== get('--input-sha256')) fail('input_pin');
  const result = await inspectPreparedInventory(root, selected), output = path.resolve(root, get('--output'));
  const relative = path.relative(path.join(root, 'output'), output);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) fail('output_scope');
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  process.stdout.write(JSON.stringify({ output, candidates: result.candidates, distributable: result.distributable, exceptions: result.exceptions }) + '\n');
  if (result.exceptions.length) process.exitCode = 2;
}
