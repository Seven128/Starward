/** Pure source transform and explicitly bounded task-staging writer. No build,
 * service, IDE, phone, Git, ordinary source or existing candidate mutation. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = 'apps/wechat-miniapp/src/';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
export const f04NativeRecoverySourceFiles = [
  `${app}pages/map/use-map-raster-installation.ts`,
  `${app}pages/map/native-map-recovery.ts`,
  `${app}pages/map/map-ground-overlay.ts`,
];
const once = (source, from, to, boundary) => {
  if (source.split(from).length !== 2) throw Error(`f04_source_boundary_changed:${boundary}`);
  return source.replace(from, to);
};

export function transformF04NativeRecoverySources(input, { resourceObservation = false } = {}) {
  const output = new Map();
  for (const file of f04NativeRecoverySourceFiles) {
    if (!input.has(file)) throw Error(`f04_source_missing:${file}`);
    let source = input.get(file).replace(/\r\n/gu, '\n');
    if (source.includes('f04NativeRecovery')) throw Error('f04_already_instrumented');
    if (file.endsWith('/map-ground-overlay.ts')) {
      // The production coordinator and its actual ten-second timeout are used
      // unmodified, and their exact source participates in the manifest.
      once(source, 'timer = setTimeout(() => { timedOut = true; fail(new NativeMapTimeout(`${label}叠加超时，请重试或重新加载地图`)); }, 10000);', '', 'native_timeout');
      once(source, '(returned as PromiseLike<unknown>).then(() => complete(true), error => complete(false, error));', '', 'native_promise_channel');
      output.set(file, input.get(file)); continue;
    }
    if (file.endsWith('/use-map-raster-installation.ts')) {
      source = once(source, '() => context ??= Taro.createMapContext(nativeMap.mapId) as unknown as MapGroundOverlayContext,',
        '() => context ??= f04NativeRecovery.wrapContext(nativeMap.mapId, input.label, Taro.createMapContext(nativeMap.mapId) as unknown as MapGroundOverlayContext),', 'actual_context');
      source = once(source, 'result => { if (nativeMap.isCurrent()) resultHandler.current(result); }, mapRasterFiles, input.label);',
        `result => {
        const current = nativeMap.isCurrent();
        f04NativeRecovery.terrainResult(nativeMap.mapId, input.label, current, Boolean(result.error), Boolean(result.requiresMapRecovery),
          result.phase ?? "display", Boolean(result.target), Boolean(result.presentationUnknown));
        if (current) resultHandler.current(result);
      }, mapRasterFiles, input.label);`, 'coordinator_result');
      if (resourceObservation) {
        source = once(source, 'return createMapGroundOverlayCoordinator(input.id,',
          'return f04NativeRecovery.observeCoordinator(nativeMap.mapId, input.label, createMapGroundOverlayCoordinator(input.id,', 'resource_coordinator');
        source = once(source, '}, mapRasterFiles, input.label);',
          '}, f04NativeRecovery.wrapResources(nativeMap.mapId, input.label, mapRasterFiles), input.label));', 'resource_pin_owner');
      }
    } else {
      source = once(source, '  const isCurrent = () => active.current && current.current.session === state.session && state.session.isCurrent();',
        `  const isCurrent = () => active.current && current.current.session === state.session && state.session.isCurrent();
  f04NativeRecovery.mapState(state.session.mapId, state.generation, state.status, isCurrent());`, 'current_map');
      source = once(source, '      commit({ session, generation, status: "pending" });',
        '      commit({ session, generation, status: "pending" });\n      f04NativeRecovery.recoveryStarted(state.session.mapId, session.mapId, generation);', 'real_retry');
      source = once(source, '      if (!isCurrent() || current.current.status !== "pending") return;\n      clearTimer(); commit({ ...state, status: "ready" });',
        '      if (!isCurrent() || current.current.status !== "pending") return;\n      f04NativeRecovery.mapUpdated(state.session.mapId, state.generation);\n      clearTimer(); commit({ ...state, status: "ready" });', 'actual_on_updated');
    }
    output.set(file, 'import { f04NativeRecovery } from "@/services/f04-native-recovery-observer";\n' + source);
  }
  return output;
}

export async function injectF04NativeRecovery(sourceRoot, { sourceSha256, write = false, resourceObservation = false } = {}) {
  if (!/^[a-f0-9]{64}$/u.test(sourceSha256 ?? '')) throw Error('f04_explicit_source_binding_required');
  const selected = await fs.realpath(sourceRoot);
  const within = (base, candidate) => {
    const relative = path.relative(base, candidate);
    return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
  };
  if (write && !within(await fs.realpath(path.resolve(here, '../tmp')), selected)) throw Error('f04_task_staging_required');
  const input = new Map();
  for (const file of f04NativeRecoverySourceFiles) {
    const real = await fs.realpath(path.join(selected, file));
    if (!within(selected, real)) throw Error('f04_source_link_escape');
    input.set(file, await fs.readFile(real, 'utf8'));
  }
  const edits = transformF04NativeRecoverySources(input, { resourceObservation });
  const runtimePath = `${app}services/f04-native-recovery-observer.ts`;
  const manifestPath = 'f04-native-recovery-source.json';
  let runtimeSource = (await fs.readFile(path.join(here, 'f04-native-recovery-observer.ts'), 'utf8'))
    .replace('__F04_NATIVE_RECOVERY_SOURCE_SHA256__', sourceSha256);
  if (resourceObservation) runtimeSource = once(runtimeSource,
    'resourceObservation: false /* __F04_RESOURCE_OBSERVATION__ */',
    'resourceObservation: true /* __F04_RESOURCE_OBSERVATION__ */', 'resource_observation_enabled');
  edits.set(runtimePath, runtimeSource);
  const manifest = { schema: resourceObservation ? 'starward-f04-native-recovery-source-v2' : 'starward-f04-native-recovery-source-v1',
    scope: 'TASK_ONLY_NOT_ACCEPTANCE', sourceSha256, resourceObservation,
    console: { arm: 'globalThis.__STARWARD_F04__.arm()', status: 'globalThis.__STARWARD_F04__.status()', readback: 'JSON.stringify(globalThis.__STARWARD_F04__.readback())' },
    files: [...edits].map(([file, after]) => ({ file, beforeSha256: input.has(file) ? sha(input.get(file)) : null, afterSha256: sha(after) })) };
  if (write) {
    for (const file of [runtimePath, manifestPath]) {
      const parent = await fs.realpath(path.dirname(path.join(selected, file)));
      if (parent !== selected && !within(selected, parent)) throw Error('f04_destination_link_escape');
      try { await fs.lstat(path.join(selected, file)); throw Error('f04_already_instrumented'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    // All source boundaries, destinations and binding are checked first.
    for (const [file, content] of edits) await fs.writeFile(path.join(selected, file), content, { flag: input.has(file) ? 'w' : 'wx' });
    await fs.writeFile(path.join(selected, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  }
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode, sourceRoot, sourceSha256] = process.argv.slice(2);
  if (!['inspect', 'apply'].includes(mode) || !sourceRoot) throw Error('use_inspect_or_apply_source_root_source_sha256');
  console.log(JSON.stringify(await injectF04NativeRecovery(path.resolve(sourceRoot), { sourceSha256, write: mode === 'apply' }), null, 2));
}
