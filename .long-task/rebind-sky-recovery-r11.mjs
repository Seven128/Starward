// One-shot, non-authoritative resource packaging; never edits adopted inputs.
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const prior = 'docs/design-resources/miniapp-field-signal-i21-binding-2026-09-05-r10';
const next = 'docs/design-resources/miniapp-field-signal-i21-binding-2026-09-06-r11';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
if (existsSync(next)) throw new Error('new_binding_directory_already_exists');
const relative = 'selected-source/miniapp-implementation-feasibility.json';
const original = readFileSync(`${prior}/${relative}`, 'utf8');
const feasibility = JSON.parse(original);
const records = feasibility.source_records.filter(row => row.key === 'source.miniapp.sky');
if (records.length !== 1) throw new Error('sky_source_record_not_unique');
const record = records[0];
const currentDigest = hash(readFileSync(record.path));
const oldDigest = record.sha256;
if (oldDigest === currentDigest) throw new Error('no_source_change');
record.sha256 = currentDigest;
const updated = `${JSON.stringify(feasibility, null, 2)}\n`;
let draft = readFileSync(`${prior}/handoff-draft/miniapp-field-signal-i21-current.md`, 'utf8');
if (!draft.includes(hash(original)) || !draft.includes(`${prior}/${relative}`))
  throw new Error('draft_feasibility_binding_missing');
draft = draft.replaceAll(`${prior}/${relative}`, `${next}/${relative}`)
  .replaceAll(hash(original), hash(updated));
mkdirSync(`${next}/selected-source`, { recursive: true });
mkdirSync(`${next}/handoff-draft`);
writeFileSync(`${next}/${relative}`, updated, { flag: 'wx' });
writeFileSync(`${next}/handoff-draft/miniapp-field-signal-i21-current.md`, draft, { flag: 'wx' });
console.log(JSON.stringify({ next, oldDigest, currentDigest, feasibilitySha256: hash(updated) }));
