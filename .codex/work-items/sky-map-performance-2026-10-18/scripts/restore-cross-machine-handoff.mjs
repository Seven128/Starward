import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { decryptBackup, readBackupKeyFile } from '../../../../tools/deployment/verified-backup.mjs';

// This task adapter only authenticates encrypted byte parts. Encryption and ZIP
// assembly remain with the existing backup and cross-computer handoff owners.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const option = name => {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
};
const required = name => {
  const value = option(name);
  assert(value && !value.startsWith('--'), `${name}_required`);
  return path.resolve(value);
};
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const child = (directory, name) => {
  assert(typeof name === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(name), 'flat_file_name_required');
  return path.join(directory, name);
};
const identity = record => {
  assert(Number.isSafeInteger(record.bytes) && record.bytes > 0, 'file_size_invalid');
  assert(/^[a-f0-9]{64}$/u.test(record.sha256), 'file_hash_invalid');
};

const manifestPath = required('--manifest');
const directory = required('--directory');
const keyPath = required('--key-file');
const output = required('--output');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/u, ''));
assert.equal(manifest.schemaVersion, 'starward-cross-computer-handoff-v1');
assert.equal(manifest.transportEncryption, 'STARWARD-ENCRYPTED-PGDUMP-V1');
assert(Array.isArray(manifest.packages) && manifest.packages.length > 0, 'packages_missing');
const selected = option('--package');
const packages = selected ? manifest.packages.filter(item => item.path === selected) : manifest.packages;
assert(packages.length > 0, 'selected_package_missing');
const names = new Set();
for (const archive of packages) {
  identity(archive);
  child(output, archive.path);
  assert(!names.has(archive.path), 'duplicate_archive_path');
  names.add(archive.path);
  assert(Array.isArray(archive.parts) && archive.parts.length > 0, 'parts_missing');
  assert.equal(archive.parts.reduce((sum, part) => sum + part.bytes, 0), archive.bytes);
  for (const part of archive.parts) {
    identity(part);
    identity(part.transport);
    child(output, part.path);
    assert(!names.has(part.path), 'duplicate_plain_part_path');
    names.add(part.path);
    assert(part.transport.bytes <= 100 * 1024 * 1024, 'transport_part_too_large');
    const input = child(directory, part.transport.path);
    const metadata = lstatSync(input);
    assert(metadata.isFile() && !metadata.isSymbolicLink(), 'transport_regular_file_required');
    assert.equal(metadata.size, part.transport.bytes, 'transport_size_mismatch');
  }
}
assert(!existsSync(output), 'fresh_output_directory_required');
assert(lstatSync(path.dirname(output)).isDirectory(), 'output_parent_required');
const key = await readBackupKeyFile(keyPath);
try {
  mkdirSync(output, { mode: 0o700 });
  const partsDirectory = path.join(output, 'parts');
  mkdirSync(partsDirectory, { mode: 0o700 });
  for (const archive of packages) {
    for (const part of archive.parts) {
      const encrypted = readFileSync(child(directory, part.transport.path));
      let plaintext;
      try {
        assert.equal(digest(encrypted), part.transport.sha256, 'transport_hash_mismatch');
        plaintext = decryptBackup(encrypted, key);
        assert.equal(plaintext.length, part.bytes, 'plaintext_size_mismatch');
        assert.equal(digest(plaintext), part.sha256, 'plaintext_hash_mismatch');
        writeFileSync(child(partsDirectory, part.path), plaintext, { flag: 'wx', mode: 0o600 });
      } finally {
        encrypted.fill(0);
        plaintext?.fill(0);
      }
    }
    const result = spawnSync(process.execPath, [
      path.join(root, '.codex/work-items/data-handoff-20261018/restore.mjs'),
      'assemble', '--manifest', manifestPath, '--directory', partsDirectory,
      '--output', child(output, archive.path), '--package', archive.path,
    ], { cwd: root, stdio: 'inherit', windowsHide: true });
    assert.equal(result.status, 0, 'archive_assembly_failed');
  }
  console.log(JSON.stringify({ status: 'HANDOFF_ARCHIVES_AUTHENTICATED', packages: packages.length, databaseRestored: false }));
} finally {
  key.fill(0);
}
