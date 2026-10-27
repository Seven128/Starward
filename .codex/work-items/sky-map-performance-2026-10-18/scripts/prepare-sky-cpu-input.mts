// Recreate only the missing public CPU fixture from existing product/test
// owners. No device, live account, network, publication or database mutation.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { StellarCatalogPublicationService } from '../../../../workers/miniapp-api/src/stellar-catalog-publication.ts';
import { ConstellationPublicationService } from '../../../../workers/miniapp-api/src/constellation-publication.ts';

const [outputFile, ...unexpected] = process.argv.slice(2);
if (!outputFile || unexpected.length) throw Error('one_new_output_required');
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const producer = path.join(root, 'workers/miniapp-api/src/test-fixtures/sky-time-consumer-fixture.ts');
const fixture = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', producer], {
  cwd: path.join(root, 'workers/miniapp-api'), encoding: 'utf8', timeout: 30_000,
  maxBuffer: 2 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
}));
const envelope = fixture.source;
if (envelope?.data?.context?.spotId !== 'spot:test-published') throw Error('public_fixture_required');
const catalog = new StellarCatalogPublicationService().get(envelope.data.skyScene.catalog);
const constellations = new ConstellationPublicationService().get();
const payload = JSON.stringify({ envelope, catalog, constellations,
  provenance: { kind: 'CURRENT_PUBLIC_TEST_OWNERS_NOT_HISTORICAL_CAPTURE',
    producer: path.relative(root, producer).replaceAll('\\', '/'),
    producerSha256: createHash('sha256').update(await fs.readFile(producer)).digest('hex') } });
await fs.writeFile(outputFile, payload + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output: path.resolve(outputFile), bytes: Buffer.byteLength(payload + '\n'),
  sha256: createHash('sha256').update(payload + '\n').digest('hex'),
  bscRows: catalog.data.rows.length, scope: 'PUBLIC_CPU_FIXTURE_ONLY' }));
