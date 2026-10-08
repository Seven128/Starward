import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {attributesBlock, auditResources, prepareResources, verifyResources} from './assets.mjs';

const output = path.resolve('output/resource-governance-2026-10-08/tests');
fs.mkdirSync(output, {recursive: true});
const image = 'workers/miniapp-api/assets/deep-sky/example/image.png';
const git = (cwd, ...args) => execFileSync('git', args, {cwd, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
function fixture() {
  const cwd = fs.mkdtempSync(path.join(output, 'resources-'));
  git(cwd, 'init', '--quiet');
  git(cwd, 'lfs', 'install', '--local');
  fs.writeFileSync(path.join(cwd, '.gitattributes'), attributesBlock());
  fs.mkdirSync(path.dirname(path.join(cwd, image)), {recursive: true});
  const source = fs.readFileSync('workers/miniapp-api/assets/deep-sky/galactic-mellinger/milkyway.png');
  fs.writeFileSync(path.join(cwd, image), source);
  git(cwd, 'add', '--', '.gitattributes', image);
  return {cwd, source, full: path.join(cwd, image)};
}

test('a real LFS pointer passes file-existence but is rejected before image/JSON consumers; local Git cache restores exact bytes', () => {
  const {cwd, source, full} = fixture();
  const pointer = git(cwd, 'show', ':' + image);
  assert.match(pointer.toString(), /^version https:\/\/git-lfs.github.com\/spec\/v1\n/u);
  fs.writeFileSync(full, pointer);
  assert.equal(fs.existsSync(full), true, 'Old file-existence checks cannot detect a missing LFS object');
  assert.throws(() => verifyResources(cwd, 'images'), /pointer needs hydration/u);
  git(cwd, 'checkout-index', '--force', '--', image);
  assert.deepEqual(fs.readFileSync(full), source);
  assert.equal(verifyResources(cwd, 'images').files, 1);
  // No remote exists: this must use already materialized bytes without a fetch.
  assert.equal(prepareResources(cwd, 'images').networkRequested, false);
});

test('indexed missing and empty resources fail visibly instead of becoming an empty profile', () => {
  const {cwd, full} = fixture();
  fs.renameSync(full, full + '.preserved');
  assert.throws(() => verifyResources(cwd, 'images'), /missing/u);
  fs.writeFileSync(full, Buffer.alloc(0));
  assert.throws(() => verifyResources(cwd, 'images'), /empty resource/u);
});

test('current editable text stays outside LFS and auditing distinguishes file bytes from unique objects', () => {
  const {cwd, full, source} = fixture();
  const current = 'workers/miniapp-api/assets/celestial-object-introductions.zh-cn.v72.json';
  fs.writeFileSync(path.join(cwd, current), '{"draft":"reviewable"}\n');
  assert.match(git(cwd, 'check-attr', 'filter', '--', current).toString(), /filter: unspecified/u);
  fs.writeFileSync(full.replace('image.png', 'second.png'), source);
  const result = auditResources(cwd, 'images');
  assert.equal(result.files, 2);
  assert.equal(result.uniqueObjects, 1);
  assert.equal(result.bytes, source.length * 2);
  assert.equal(result.uniqueBytes, source.length);
  assert.equal(result.accountRemainingStorage, 'UNKNOWN');
});

test('invalid policy/profile fail before hydration, and source archives without .git reject pointers too', () => {
  const {cwd, full} = fixture();
  assert.throws(() => prepareResources(cwd, 'unreviewed'), /Unknown resource profile/u);
  fs.writeFileSync(path.join(cwd, '.gitattributes'), '* text=auto\n');
  assert.throws(() => prepareResources(cwd), /policy and .gitattributes differ/u);
  const docker = fs.mkdtempSync(path.join(output, 'docker-context-'));
  fs.writeFileSync(path.join(docker, '.gitattributes'), attributesBlock());
  fs.mkdirSync(path.dirname(path.join(docker, image)), {recursive: true});
  fs.writeFileSync(path.join(docker, image), git(cwd, 'show', ':' + image));
  assert.throws(() => verifyResources(docker), /pointer needs hydration/u);
  fs.copyFileSync(full, path.join(docker, image));
  assert.equal(verifyResources(docker).status, 'MATERIALIZED');
});

test('retiring raw task artifacts retains transitive fixed inputs consumed by batch regressions', () => {
  const prefix = '.codex/work-items/cloud-sky-native-2026-09-22/';
  const names = new Set([prefix + 'tmp/current-native-report-2026-10-01.json',
    prefix + 'evidence/wikidata-Q12975-2026-09-30.json']);
  for (const object of ['vindemiatrix', 'alpheratz', 'arkab']) {
    const name = prefix + `evidence/chinese-${object}-text-inspection-2026-10-07.json`;
    names.add(name);
    const fixture = JSON.parse(fs.readFileSync(name, 'utf8'));
    for (const pin of [fixture.terms, ...fixture.rows.map(row => row.source), ...fixture.entities.map(row => row.source)])
      names.add(pin.path);
  }
  for (const name of names) assert(fs.statSync(name).isFile(), `Missing regression input: ${name}`);
  const result = spawnSync('git', ['check-ignore', '--no-index', '--stdin', '-z'], {
    input: [...names].join('\0') + '\0', encoding: 'utf8', windowsHide: true,
  });
  assert.equal(result.status, 1, `Required test input is ignored or Git failed: ${result.stdout || result.stderr}`);
});
