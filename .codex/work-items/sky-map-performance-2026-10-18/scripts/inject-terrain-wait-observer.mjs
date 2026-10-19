// TASK ONLY. Pure source transform plus an explicit task-staging writer.
// No build, preview, service, device operation, cache reset or ordinary-source edit.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const app = 'apps/wechat-miniapp/src/';
export const terrainWaitSourceFiles = [
  `${app}hooks/use-terrain-overlay.ts`, `${app}hooks/use-raster-image.ts`,
  `${app}services/raster-image-resources.ts`, `${app}services/raster-file-adapter.ts`,
  `${app}pages/map/use-map-raster-installation.ts`, `${app}pages/map/index.tsx`,
];
const sha = value => createHash('sha256').update(value).digest('hex');
const importTrace = 'import { terrainWait } from "@/services/terrain-wait-observer";\n';
function once(source, from, to, label) {
  if (source.split(from).length !== 2) throw Error(`terrain_wait_source_boundary_changed:${label}`);
  return source.replace(from, to);
}
export function transformTerrainWaitSources(input) {
  const out = new Map();
  for (const file of terrainWaitSourceFiles) {
    let source = input.get(file);
    if (typeof source !== 'string' || source.includes('terrain-wait-observer')) throw Error('terrain_wait_original_sources_required');
    source = source.replaceAll('\r\n', '\n');
    if (file.endsWith('/use-terrain-overlay.ts')) {
      source = once(source,
        'queryFn: async (signal) => ({ ...await getTerrainOverlay(input, signal), request: input }),',
        `queryFn: async (signal) => {
      const attempt = input.purpose === "MAP" ? terrainWait.metadataStart(identity) : null;
      try {
        const response = await getTerrainOverlay(input, signal);
        if (input.purpose === "MAP") terrainWait.metadataEnd(attempt, identity,
          response.data.imageUrl ? \`\${response.data.publicationId ?? ""}:\${response.data.imageUrl}\` : null, true);
        return { ...response, request: input };
      } catch (error) {
        if (input.purpose === "MAP") terrainWait.metadataEnd(attempt, identity, null, false);
        throw error;
      }
    },`, 'metadata');
    } else if (file.endsWith('/use-raster-image.ts')) {
      source = once(source, 'void read.promise.then(({ path }) => {',
        'void read.promise.then(({ path, bytes, sha256 }) => {', 'admitted_file_facts');
      source = once(source, 'if (!controller.signal.aborted) setImageState({ url: imageKey, path, error: null });',
        `if (!controller.signal.aborted) {
        if (imageUrl.startsWith("/v2/terrain/assets/")) terrainWait.fileReady(imageKey, path, { bytes, ...(sha256 ? { sha256 } : {}) });
        setImageState({ url: imageKey, path, error: null });
      }`, 'validated_file_ready');
    } else if (file.endsWith('/raster-image-resources.ts')) {
      source = once(source, '      if (!entry) {\n        await makeRoom(1, 0);',
        '      if (input.url.startsWith("/v2/terrain/assets/")) terrainWait.cacheAcquire(input.key, entry?.state ?? "miss");\n      if (!entry) {\n        await makeRoom(1, 0);', 'actual_file_cache');
    } else if (file.endsWith('/raster-file-adapter.ts')) {
      source = once(source, '        success(result) {\n          terminal = true;',
        '        success(result) {\n          if (input.url.startsWith("/v2/terrain/assets/")) terrainWait.downloadReturned(input.key, result.statusCode);\n          terminal = true;', 'download_callback');
    } else if (file.endsWith('/use-map-raster-installation.ts')) {
      source = once(source,
        '  resultHandler.current = ({ error: failure, target: actual, isCurrent, phase, requiresMapRecovery: needsRecovery }) => {',
        '  resultHandler.current = ({ error: failure, target: actual, isCurrent, phase, requiresMapRecovery: needsRecovery }) => {\n    if (input.label === "地形") terrainWait.nativeResult(nativeMap.mapId, actual?.src ?? null, !failure, isCurrent(), phase ?? "display");', 'native_result');
    } else if (file.endsWith('/pages/map/index.tsx')) {
      const start = action => `terrainWait.start("${action}", terrain.identity,
        terrain.data?.data.imageUrl ? \`\${terrain.data.data.publicationId ?? ""}:\${terrain.data.data.imageUrl}\` : null,
        terrain.imagePath, { metadataAvailable: Boolean(terrain.data), fetching: terrain.isFetching,
          imageReady: Boolean(terrain.imagePath), imagePending: terrain.imagePending });`;
      source = 'import { TerrainWaitMarker } from "./terrain-wait-marker";\n' + source;
      source = once(source, '    if (userMapRegionStarted(event)) spotMapFocus.cancel();',
        `    if (userMapRegionStarted(event)) {
      if (terrainEnabled) ${start('gesture')}
      spotMapFocus.cancel();
    }`, 'real_gesture');
      source = once(source, '                      const next = !terrainEnabled;\n                      setTerrainEnabled(next);',
        `                      const next = !terrainEnabled;
                      if (next) ${start('enable')}
                      setTerrainEnabled(next);`, 'real_enable');
      source = once(source, '      {!eventModalPresent ? <FloatingNotificationHost /> : null}',
        '      <TerrainWaitMarker visible={pageVisible} />\n      {!eventModalPresent ? <FloatingNotificationHost /> : null}', 'temporal_marker');
    }
    out.set(file, importTrace + source);
  }
  return out;
}

export async function injectTerrainWaitObserver(sourceRoot, { action, sourceSha256, write = false } = {}) {
  if (!['enable', 'gesture'].includes(action) || !/^[a-f0-9]{64}$/u.test(sourceSha256 ?? '')) throw Error('terrain_wait_explicit_binding_required');
  const selected = await fs.realpath(sourceRoot);
  if (write) {
    const allowed = await fs.realpath(path.resolve(here, '../tmp'));
    const relative = path.relative(allowed, selected);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw Error('terrain_wait_task_staging_required');
  }
  const input = new Map();
  for (const file of terrainWaitSourceFiles) {
    const real = await fs.realpath(path.join(selected, file));
    const relative = path.relative(selected, real);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw Error('terrain_wait_source_link_escape');
    input.set(file, await fs.readFile(real, 'utf8'));
  }
  const edits = transformTerrainWaitSources(input);
  const runtimePath = `${app}services/terrain-wait-observer.ts`;
  const markerPath = `${app}pages/map/terrain-wait-marker.tsx`;
  const runtime = (await fs.readFile(path.join(here, 'terrain-wait-observer.ts'), 'utf8'))
    .replace('__TERRAIN_WAIT_ACTION__', action).replace('__TERRAIN_WAIT_SOURCE_SHA256__', sourceSha256);
  const marker = await fs.readFile(path.join(here, 'terrain-wait-marker.tsx'), 'utf8');
  edits.set(runtimePath, runtime); edits.set(markerPath, marker);
  const manifest = { schema: 'starward-terrain-wait-source-v1', scope: 'TASK_ONLY_NOT_ACCEPTANCE', action, sourceSha256,
    files: [...edits].map(([file, after]) => ({ file, beforeSha256: input.has(file) ? sha(input.get(file)) : null, afterSha256: sha(after) })) };
  if (write) {
    for (const file of [runtimePath, markerPath, 'terrain-wait-source.json']) {
      try { await fs.access(path.join(selected, file)); throw Error('terrain_wait_already_instrumented'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    // All boundaries and new paths are checked before the first staging write.
    for (const [file, content] of edits) await fs.writeFile(path.join(selected, file), content);
    await fs.writeFile(path.join(selected, 'terrain-wait-source.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  }
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode, sourceRoot, action, sourceSha256] = process.argv.slice(2);
  if (!['inspect', 'apply'].includes(mode) || !sourceRoot) throw Error('use_inspect_or_apply_source_root_action_source_sha256');
  console.log(JSON.stringify(await injectTerrainWaitObserver(path.resolve(sourceRoot), { action, sourceSha256, write: mode === 'apply' }), null, 2));
}
