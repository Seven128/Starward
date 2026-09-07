import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(new URL('../../../workers/miniapp-api/package.json', import.meta.url));
require('reflect-metadata');
const { Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { FastifyAdapter } = require('@nestjs/platform-fastify');
const { MemoryCache } = await import('../../../workers/miniapp-api/src/cache.ts');
const { createTestMiniappService } = await import('../../../workers/miniapp-api/src/test-fixtures/create-test-service.ts');
const { MiniappController } = await import('../../../workers/miniapp-api/src/controller.ts');
const { MiniappService } = await import('../../../workers/miniapp-api/src/miniapp-service.ts');
class ReadThroughContextCache extends MemoryCache {
  async get<T>(key: string): Promise<T | null> {
    if (!key.startsWith('observation-context:')) return super.get<T>(key);
    const response = await fetch('http://127.0.0.1:8879/v2/observation-contexts/' + encodeURIComponent(key.slice('observation-context:'.length)), { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('existing_context_read_failed:' + response.status);
    return (await response.json()).data as T;
  }
}
const service = createTestMiniappService({ cache: new ReadThroughContextCache() });
class ProbeModule {}
Module({ controllers: [MiniappController], providers: [{ provide: MiniappService, useValue: service }] })(ProbeModule);
const adapter = new FastifyAdapter();
const fieldMode = process.argv.includes('--field');
adapter.getInstance().addHook('onRequest', async (request: any, reply: any) => {
  const path = decodeURIComponent(request.url.split('?')[0]);
  const allowed = fieldMode
    ? ['/v2/spots/spot:test-published/overview', '/v2/spots/spot:test-published/field'].includes(path)
    : path === '/v2/map/scene';
  if (request.method !== 'GET' || !allowed) return reply.code(405).send({ error: 'probe_read_only' });
});
const app = await NestFactory.create(ProbeModule, adapter, { logger: false });
await app.listen(0, '127.0.0.1');
const base = await app.getUrl();
writeFileSync('artifacts/miniapp/current-map-probe-address.json', JSON.stringify({ base }));
console.log('temporary read endpoint ready');
const timer = setTimeout(() => void app.close().then(() => process.exit(0)), 120000);
process.stdin.resume();
process.stdin.once('data', async () => { clearTimeout(timer); await app.close(); process.exit(0); });
