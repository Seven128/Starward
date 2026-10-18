import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Readable, Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createGunzip} from 'node:zlib';
import {prepareResources} from './assets.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const lockPath = 'data-pipelines/runtime-data/current.lock.json';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/u, ''));
const assert = (condition, message) => { if (!condition) throw Error(message); };
const inside = (parent, target) => {
  const relative = path.relative(path.resolve(parent), path.resolve(target));
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep));
};

export function child(rootPath, relative) {
  assert(typeof relative === 'string' && relative.length > 0 && !relative.includes('\\')
    && !path.isAbsolute(relative) && !relative.split('/').some(part => !part || part === '.' || part === '..')
    && !relative.includes(':'), 'backend_data_relative_path_invalid');
  const full = path.resolve(rootPath, relative);
  assert(full.startsWith(path.resolve(rootPath) + path.sep), 'backend_data_path_outside_root');
  // A parent symlink/junction must not redirect reads or imports outside the owner.
  let parent = full;
  while (parent !== path.resolve(rootPath)) {
    assert(!fs.lstatSync(parent, {throwIfNoEntry: false})?.isSymbolicLink(), 'backend_data_symlink_rejected');
    parent = path.dirname(parent);
  }
  return full;
}

function descriptor(record) {
  assert(record && Number.isSafeInteger(record.bytes) && record.bytes > 0
    && /^[a-f0-9]{64}$/u.test(record.sha256), 'backend_data_file_identity_invalid');
}

function pinned(file, record) {
  descriptor(record);
  const stat = fs.statSync(file, {throwIfNoEntry: false});
  if (!stat?.isFile()) throw Error('backend_data_missing:' + record.path);
  const raw = fs.readFileSync(file);
  if (raw.subarray(0, 100).toString().startsWith('version https://git-lfs.github.com/spec/v1'))
    throw Error('backend_data_pointer:' + record.path);
  assert(raw.length === record.bytes && digest(raw) === record.sha256, 'backend_data_hash_mismatch:' + record.path);
  return raw;
}

function readBackendLock(cwd) {
  const lock = readJson(path.join(cwd, lockPath));
  assert(lock.schemaVersion === 'starward-backend-data-lock-v1'
    && /^data-pipelines\/runtime-data\/releases\/[a-z0-9][a-z0-9._-]*$/u.test(lock.runtime?.directory), 'backend_data_lock_invalid');
  return lock;
}

export function readBackendData(cwd = root, env = process.env) {
  const lock = readBackendLock(cwd);
  const metadataDirectory = child(cwd, lock.runtime.directory);
  const materialization = lock.runtime.materialization ?? 'CHECKOUT';
  assert(['CHECKOUT', 'EXTERNAL_CACHE'].includes(materialization), 'backend_data_materialization_invalid');
  if (materialization === 'EXTERNAL_CACHE') assert(env.STARWARD_DATA_HOME && path.isAbsolute(env.STARWARD_DATA_HOME)
    && !inside(cwd, env.STARWARD_DATA_HOME), 'backend_data_external_STARWARD_DATA_HOME_required');
  const directory = materialization === 'CHECKOUT' ? metadataDirectory
    : child(env.STARWARD_DATA_HOME, 'runtime/' + path.basename(lock.runtime.directory));
  const index = JSON.parse(pinned(child(metadataDirectory, 'FILES.json'), lock.runtime.index).toString());
  assert(index.schemaVersion === 'starward-public-runtime-files-v1' && Array.isArray(index.files)
    && index.files.length > 0 && new Set(index.files.map(file => file.path)).size === index.files.length,
  'backend_data_index_invalid');
  for (const file of index.files) {
    descriptor(file);
    child(directory, file.path);
    assert(/^(nightlight|terrain)\/.+\.(json|png|tif)$/u.test(file.path), 'backend_data_public_file_type_invalid');
  }
  assert(/^[a-z0-9][a-z0-9._-]{2,127}$/u.test(lock.runtime.nightLight?.datasetVersion), 'backend_data_dataset_invalid');
  return {lock, directory, files: index.files};
}

export function verifyBackendData(cwd = root, env = process.env) {
  const data = readBackendData(cwd, env);
  let bytes = 0;
  for (const file of data.files) { pinned(child(data.directory, file.path), file); bytes += file.bytes; }
  const {nightLight, terrain} = data.lock.runtime;
  const nightPath = `nightlight/${nightLight.datasetVersion}/inventory.json`;
  const nightBytes = fs.readFileSync(child(data.directory, nightPath));
  const night = JSON.parse(nightBytes.toString());
  const groundBytes = fs.readFileSync(child(data.directory, 'terrain/inventory.json'));
  const ground = JSON.parse(groundBytes.toString());
  assert(data.files.some(file => file.path === nightPath) && data.files.some(file => file.path === 'terrain/inventory.json')
    && night.releaseState === 'SEALED' && night.datasetVersion === nightLight.datasetVersion
    && digest(nightBytes) === nightLight.inventorySha256 && night.publicationVersion === nightLight.publicationVersion
    && night.assets.length === nightLight.assetCount && digest(groundBytes) === terrain.inventorySha256
    && ground.publicationVersion === terrain.publicationVersion, 'backend_data_publication_binding_mismatch');
  const names = new Set(data.files.map(file => file.path));
  for (const entry of night.assets) for (const suffix of ['', '.json', '.numbers.tif'])
    assert(names.has(`nightlight/${nightLight.datasetVersion}/${entry.file}${suffix}`), 'backend_data_inventory_member_missing');
  for (const entry of [...ground.assets, ...(ground.retainedAssets ?? [])]) for (const suffix of ['', '.json'])
    assert(names.has(`terrain/${entry.file}${suffix}`), 'backend_data_inventory_member_missing');
  return {status: 'LOCKED_PUBLIC_FILES_VERIFIED', files: data.files.length, bytes,
    datasetVersion: nightLight.datasetVersion, databaseVerified: false};
}

export function backendDataEnvironment(cwd = root, env = {}) {
  const {lock, directory} = readBackendData(cwd, env);
  const selected = {
    MINIAPP_NIGHT_LIGHT_PUBLICATION_ROOT: child(directory, 'nightlight'),
    MINIAPP_TERRAIN_PUBLICATION_ROOT: child(directory, 'terrain'),
    MINIAPP_DARK_SKY_DATASET_VERSION: lock.runtime.nightLight.datasetVersion,
  };
  for (const [key, value] of Object.entries(selected))
    assert(!env[key] || (key.endsWith('_ROOT') ? path.resolve(env[key]) === value : env[key] === value),
      'backend_data_configuration_differs:' + key);
  return selected;
}

export async function checkBackendDatabase(cwd = root, env = process.env) {
  assert(env.DATABASE_URL, 'backend_data_DATABASE_URL_required');
  const {default: pg} = await import('pg');
  const {listMigrationVersions} = await import('../../workers/miniapp-api/src/migration-runner.ts');
  const {lock} = readBackendData(cwd, env);
  const expected = lock.runtime.nightLight;
  const client = new pg.Client({connectionString: env.DATABASE_URL, connectionTimeoutMillis: 10000,
    statement_timeout: 10000, application_name: 'starward-data-verifier'});
  try {
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const versions = (await client.query('SELECT version FROM schema_migrations ORDER BY version')).rows.map(row => row.version);
    const known = await listMigrationVersions(path.join(cwd, 'database/miniapp/migrations'));
    assert(JSON.stringify(versions) === JSON.stringify(known), 'backend_data_database_schema_mismatch');
    const rows = (await client.query('SELECT state,payload FROM dark_sky_dataset_publications WHERE dataset_version=$1',
      [expected.datasetVersion])).rows;
    const published = rows[0]?.payload?.rasterInventory;
    assert(rows.length === 1 && rows[0].state === 'PUBLISHED' && rows[0].payload.datasetVersion === expected.datasetVersion
      && published?.sha256 === expected.inventorySha256 && published.publicationVersion === expected.publicationVersion
      && published.assetCount === expected.assetCount, 'backend_data_database_publication_mismatch');
    await client.query('COMMIT');
    return {status: 'DATABASE_PUBLICATION_VERIFIED', datasetVersion: expected.datasetVersion, migrations: versions.length,
      mutation: false, inventorySha256: expected.inventorySha256};
  } catch (error) {
    // Never echo a URL, provider credential or private database row on failure.
    throw Error(error.message?.startsWith('backend_data_') ? error.message : 'backend_data_database_check_failed');
  } finally { await client.end(); }
}

export function prepareBackendData(cwd = root, env = process.env) {
  try { return {...verifyBackendData(cwd, env), networkRequested: false}; }
  catch (error) {
    if (!/^backend_data_(missing|pointer):/u.test(error.message)) throw error;
    if (readBackendData(cwd, env).lock.runtime.materialization === 'EXTERNAL_CACHE')
      throw Error('backend_data_drive_download_required:run backend:data:status and import the pinned public group into STARWARD_DATA_HOME');
    // The existing LFS owner handles current-ref hydration and warm local reuse.
    try { prepareResources(cwd, 'map-data'); }
    catch { throw Error('backend_data_lfs_unavailable:run backend:data:status for the pinned Drive mirror; import with --from-directory after verified download'); }
    return {...verifyBackendData(cwd, env), networkRequested: true};
  }
}

export function importBackendData(source, cwd = root, env = process.env) {
  const data = readBackendData(cwd, env);
  const missing = new Set();
  // Verify the complete selected public group before changing any destination.
  for (const file of data.files) {
    pinned(child(source, file.path), file);
    const target = child(data.directory, file.path);
    if (fs.existsSync(target)) {
      const header = fs.readFileSync(target).subarray(0, 100).toString();
      if (!header.startsWith('version https://git-lfs.github.com/spec/v1')) pinned(target, file);
      else missing.add(file.path);
    } else missing.add(file.path);
  }
  let installed = 0;
  for (const file of data.files) {
    const target = child(data.directory, file.path);
    if (!missing.has(file.path)) continue;
    fs.mkdirSync(path.dirname(target), {recursive: true});
    // Only missing files or verified Git pointers are replaced. Never overwrite edits.
    const temporary = target + '.starward-import.tmp';
    fs.copyFileSync(child(source, file.path), temporary, fs.constants.COPYFILE_EXCL);
    try { pinned(temporary, file); fs.renameSync(temporary, target); installed++; }
    finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  }
  return {...verifyBackendData(cwd, env), installed, transport: 'VERIFIED_LOCAL_IMPORT', databaseMutated: false};
}

async function streamPinned(file, record) {
  descriptor(record);
  const info = fs.statSync(file, {throwIfNoEntry: false});
  assert(info?.isFile(), 'backend_data_missing:' + record.path);
  assert(info.size === record.bytes, 'backend_data_hash_mismatch:' + record.path);
  const hash = createHash('sha256');
  for await (const bytes of fs.createReadStream(file)) hash.update(bytes);
  assert(hash.digest('hex') === record.sha256, 'backend_data_hash_mismatch:' + record.path);
}

export async function indexPublicFiles(source, output) {
  const files = [];
  async function visit(relative) {
    const full = child(source, relative);
    const entry = fs.lstatSync(full);
    if (entry.isDirectory()) {
      for (const name of fs.readdirSync(full).sort()) await visit(relative + '/' + name);
      return;
    }
    assert(entry.isFile() && /\.(json|png|tif)$/u.test(relative), 'backend_data_public_file_type_invalid');
    const hash = createHash('sha256');
    for await (const chunk of fs.createReadStream(full)) hash.update(chunk);
    files.push({path: relative, bytes: entry.size, sha256: hash.digest('hex')});
  }
  for (const prefix of ['nightlight', 'terrain']) await visit(prefix);
  assert(files.length > 0 && files.some(file => file.path === 'terrain/inventory.json')
    && files.some(file => /^nightlight\/[^/]+\/inventory.json$/u.test(file.path)), 'backend_data_inventories_required');
  const raw = Buffer.from(JSON.stringify({schemaVersion: 'starward-public-runtime-files-v1', files}, null, 2) + '\n');
  fs.writeFileSync(output, raw, {flag: 'wx'});
  return {status: 'PUBLIC_FILE_INDEX_CREATED', files: files.length, index: {path: 'FILES.json', bytes: raw.length, sha256: digest(raw)},
    meaning: 'Byte index only; existing publication, rights and PUBLISHED checks still apply.'};
}

export async function verifyRebuildData(cacheRoot, cwd = root) {
  rebuildCacheRoot(cacheRoot, cwd);
  const lock = readBackendLock(cwd);
  assert(Array.isArray(lock.rebuild?.files) && lock.rebuild.files.length > 0, 'backend_data_rebuild_manifest_missing');
  for (const file of lock.rebuild.files) await streamPinned(child(cacheRoot, file.path), file);
  return {status: 'REBUILD_INPUTS_VERIFIED', datasetVersion: lock.rebuild.datasetVersion,
    files: lock.rebuild.files.length, bytes: lock.rebuild.files.reduce((sum, file) => sum + file.bytes, 0)};
}

function rebuildCacheRoot(cacheRoot, cwd) {
  assert(cacheRoot && path.isAbsolute(cacheRoot), 'backend_data_absolute_cache_root_required');
  assert(!inside(cwd, cacheRoot), 'backend_data_rebuild_cache_must_be_outside_checkout');
  // Resolve an existing ancestor too: a junction must not hide an in-checkout cache.
  let ancestor = path.resolve(cacheRoot);
  while (!fs.existsSync(ancestor)) {
    const parent = path.dirname(ancestor);
    assert(parent !== ancestor, 'backend_data_rebuild_root_unavailable');
    ancestor = parent;
  }
  assert(!inside(fs.realpathSync(cwd), fs.realpathSync(ancestor)), 'backend_data_rebuild_cache_must_be_outside_checkout');
}

function archiveMembers(source, archive) {
  descriptor(archive);
  const whole = child(source, archive.path);
  if (fs.existsSync(whole)) return [{...archive, parts: undefined}];
  assert(Array.isArray(archive.parts) && archive.parts.length > 0
    && new Set(archive.parts.map(part => part.path)).size === archive.parts.length
    && archive.parts.reduce((sum, part) => sum + part.bytes, 0) === archive.bytes, 'backend_data_archive_parts_invalid');
  for (const part of archive.parts) { descriptor(part); child(source, part.path); }
  return archive.parts;
}

async function* transportChunks(source, archive, members) {
  const wholeHash = createHash('sha256');
  let total = 0;
  for (const part of members) {
    const file = child(source, part.path);
    const info = fs.statSync(file, {throwIfNoEntry: false});
    assert(info?.isFile() && info.size === part.bytes, 'backend_data_transport_size_mismatch:' + part.path);
    const hash = createHash('sha256');
    for await (const chunk of fs.createReadStream(file)) {
      hash.update(chunk); wholeHash.update(chunk); total += chunk.length;
      yield chunk;
    }
    assert(hash.digest('hex') === part.sha256, 'backend_data_transport_hash_mismatch:' + part.path);
  }
  assert(total === archive.bytes && wholeHash.digest('hex') === archive.sha256, 'backend_data_transport_hash_mismatch:' + archive.path);
}

export async function importRebuildData(source, cacheRoot, cwd = root) {
  rebuildCacheRoot(cacheRoot, cwd);
  assert(source && path.isAbsolute(source), 'backend_data_absolute_import_source_required');
  rebuildCacheRoot(source, cwd);
  const lock = readBackendLock(cwd);
  const files = lock.rebuild?.files;
  assert(Array.isArray(files) && files.length > 0 && new Set(files.map(file => file.path)).size === files.length,
    'backend_data_rebuild_manifest_missing');
  const pending = [];
  for (const file of files) {
    descriptor(file);
    const target = child(cacheRoot, file.path);
    if (fs.existsSync(target)) { await streamPinned(target, file); continue; }
    const original = child(source, file.path);
    if (fs.existsSync(original)) pending.push({file, target, original});
    else {
      assert(file.transport?.format === 'GZIP', 'backend_data_rebuild_transport_unavailable:' + file.path);
      const archive = file.transport;
      const members = archiveMembers(source, archive);
      // Check the complete batch's presence/size before beginning any decompression.
      for (const part of members) assert(fs.statSync(child(source, part.path), {throwIfNoEntry: false})?.size === part.bytes,
        'backend_data_transport_size_mismatch:' + part.path);
      pending.push({file, target, archive, members});
    }
  }
  if (!pending.length) return {status: 'REBUILD_INPUTS_VERIFIED', datasetVersion: lock.rebuild.datasetVersion,
    files: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0), installed: 0, networkRequested: false};
  fs.mkdirSync(cacheRoot, {recursive: true});
  rebuildCacheRoot(cacheRoot, cwd);
  const disk = fs.statfsSync(cacheRoot, {bigint: true});
  assert(disk.bavail * disk.bsize >= BigInt(pending.reduce((sum, item) => sum + item.file.bytes, 0)), 'backend_data_rebuild_disk_space_insufficient');
  const staging = fs.mkdtempSync(path.join(cacheRoot, '.starward-rebuild-'));
  const staged = [];
  let installed = 0;
  try {
    for (const item of pending) {
      const {file} = item;
      const temporary = child(staging, file.path);
      fs.mkdirSync(path.dirname(temporary), {recursive: true});
      let bytes = 0;
      const hash = createHash('sha256');
      const identity = new Transform({transform(chunk, encoding, next) {
        bytes += chunk.length;
        if (bytes > file.bytes) return next(Error('backend_data_rebuild_size_exceeded:' + file.path));
        hash.update(chunk); next(null, chunk);
      }});
      const input = item.original ? fs.createReadStream(item.original)
        : Readable.from(transportChunks(source, item.archive, item.members));
      try {
        await pipeline(...(item.original ? [input] : [input, createGunzip()]), identity,
          fs.createWriteStream(temporary, {flags: 'wx'}));
      } catch (error) {
        throw Error(error.message?.startsWith('backend_data_') ? error.message : 'backend_data_rebuild_decode_failed:' + file.path);
      }
      assert(bytes === file.bytes && hash.digest('hex') === file.sha256, 'backend_data_hash_mismatch:' + file.path);
      staged.push({...item, temporary});
    }
    // Only admitted complete files become cache entries. Exclusive links avoid
    // overwriting a concurrently created cache file; staging shares its volume.
    for (const item of staged) {
      fs.mkdirSync(path.dirname(item.target), {recursive: true});
      if (fs.existsSync(item.target)) await streamPinned(item.target, item.file);
      else { fs.linkSync(item.temporary, item.target); installed++; }
    }
  } finally {
    // This uniquely owned directory contains only reproducible import staging.
    const relative = path.relative(cacheRoot, staging);
    assert(!path.isAbsolute(relative) && !relative.includes(path.sep) && /^\.starward-rebuild-/u.test(relative), 'backend_data_staging_cleanup_outside_cache');
    fs.rmSync(staging, {recursive: true, force: true});
  }
  return {status: 'REBUILD_INPUTS_VERIFIED', datasetVersion: lock.rebuild.datasetVersion,
    files: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0), installed,
    transport: 'VERIFIED_LOCAL_IMPORT', compressed: staged.filter(item => item.archive).length, networkRequested: false};
}

export async function assembleDriveArchive(source, output, cwd = root) {
  const lock = readBackendLock(cwd);
  const archive = lock.runtime.transports.find(transport => transport.provider === 'GOOGLE_DRIVE')?.archive;
  descriptor(archive);
  assert(Array.isArray(archive.parts) && archive.parts.length > 0
    && new Set(archive.parts.map(part => part.path)).size === archive.parts.length
    && archive.parts.reduce((sum, part) => sum + part.bytes, 0) === archive.bytes, 'backend_data_archive_parts_invalid');
  if (fs.existsSync(output)) {
    await streamPinned(output, archive);
    return {status: 'ARCHIVE_VERIFIED', bytes: archive.bytes, reused: true};
  }
  // Fully validate the source parts before writing a fresh output. Streaming keeps
  // large archives outside JS memory and supports future larger Drive bundles.
  for (const part of archive.parts) await streamPinned(child(source, part.path), part);
  const fd = fs.openSync(output, 'wx');
  let complete = false;
  try {
    const hash = createHash('sha256');
    let size = 0;
    for (const part of archive.parts) for await (const chunk of fs.createReadStream(child(source, part.path))) {
      hash.update(chunk); size += chunk.length;
      let offset = 0;
      while (offset < chunk.length) offset += fs.writeSync(fd, chunk, offset, chunk.length - offset);
    }
    assert(size === archive.bytes && hash.digest('hex') === archive.sha256, 'backend_data_assembled_hash_mismatch');
    complete = true;
  } finally { fs.closeSync(fd); if (!complete) fs.unlinkSync(output); }
  return {status: 'ARCHIVE_VERIFIED', bytes: archive.bytes, reused: false};
}

export function dataStatus(cwd = root) {
  const lock = readBackendLock(cwd);
  let runtime;
  try { runtime = verifyBackendData(cwd); }
  catch (error) { runtime = {status: 'UNAVAILABLE', reason: error.message}; }
  return {runtime, runtimeTransports: lock.runtime.transports, rebuild: lock.rebuild,
    privateRecovery: lock.privateRecovery, meaning: 'Locations and hashes bind data to this commit; remote metadata is not a fresh download receipt.'};
}

function runtimeEnvironment(configFile) {
  const env = {...process.env};
  if (configFile) {
    const absolute = path.resolve(configFile);
    assert(!inside(root, absolute), 'backend_data_private_config_must_be_outside_checkout');
    let config;
    try { config = readJson(absolute); }
    catch { throw Error('backend_data_private_configuration_unreadable'); }
    for (const [key, value] of Object.entries(config)) {
      assert(/^(MINIAPP_|WECHAT_|QWEATHER_|DATABASE_URL$|REDIS_URL$|STARWARD_DATA_HOME$)/u.test(key)
        && typeof value === 'string', 'backend_data_private_configuration_invalid');
      env[key] = value;
    }
  }
  return env;
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try {
    const [action = 'status', ...args] = process.argv.slice(2);
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
      assert(['--from-directory', '--config', '--profile', '--cache-root', '--output'].includes(args[i]) && args[i + 1] && !Object.hasOwn(options, args[i]), 'backend_data_arguments_invalid');
      options[args[i]] = args[i + 1];
    }
    const allowed = {status: [], env: [], prepare: ['--profile', '--cache-root'], verify: ['--profile', '--cache-root'],
      import: ['--from-directory', '--profile', '--cache-root'], assemble: ['--from-directory', '--output'], index: ['--from-directory', '--output'], 'check-db': ['--config'], start: ['--config']};
    assert(allowed[action] && Object.keys(options).every(key => allowed[action].includes(key)), 'backend_data_arguments_invalid');
    let result;
    const profile = options['--profile'] ?? 'runtime';
    assert(['runtime', 'rebuild'].includes(profile), 'backend_data_profile_invalid');
    assert(!options['--cache-root'] || profile === 'rebuild', 'backend_data_cache_root_requires_rebuild_profile');
    if (action === 'status') result = dataStatus();
    else if (action === 'prepare' || action === 'verify') result = profile === 'rebuild'
      ? await verifyRebuildData(options['--cache-root']) : action === 'prepare' ? prepareBackendData() : verifyBackendData();
    else if (action === 'assemble' || action === 'index') {
      assert(options['--from-directory'] && options['--output'], 'backend_data_archive_paths_required');
      result = await (action === 'assemble' ? assembleDriveArchive : indexPublicFiles)(path.resolve(options['--from-directory']), path.resolve(options['--output']));
    }
    else if (action === 'import') {
      assert(options['--from-directory'], 'backend_data_import_source_required');
      result = profile === 'rebuild'
        ? await importRebuildData(path.resolve(options['--from-directory']), options['--cache-root'])
        : importBackendData(path.resolve(options['--from-directory']));
    } else if (action === 'env') result = backendDataEnvironment(root, process.env);
    else if (action === 'check-db' || action === 'start') {
      const env = runtimeEnvironment(options['--config']);
      result = {files: verifyBackendData(root, env), database: await checkBackendDatabase(root, env)};
      if (action === 'start') {
        assert(!env.MINIAPP_RELEASE_PROFILE || env.MINIAPP_RELEASE_PROFILE === 'LOCAL', 'backend_data_start_local_only');
        Object.assign(env, backendDataEnvironment(root, env), {MINIAPP_RELEASE_PROFILE: 'LOCAL', MINIAPP_STORAGE_MODE: 'POSTGRES',
          MINIAPP_AUTO_MIGRATE: 'false', WECHAT_REMINDER_DELIVERY_ENABLED: 'false'});
        console.log(JSON.stringify({...result, status: 'STARTING_VERIFIED_LOCAL_API'}));
        const api = spawn(process.execPath, [path.join(root, 'tools/run-node.cjs'), '--bin', 'tsx', 'tsx', 'src/main.ts'],
          {cwd: path.join(root, 'workers/miniapp-api'), env, windowsHide: true, stdio: 'inherit'});
        for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => api.kill(signal));
        await new Promise((resolve, reject) => { api.once('error', reject); api.once('exit', code => {process.exitCode = code ?? 1; resolve();}); });
        result = undefined;
      }
    } else throw Error('Usage: backend-data.mjs status|prepare|verify|import|env|check-db|start');
    if (result) console.log(JSON.stringify(result, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
