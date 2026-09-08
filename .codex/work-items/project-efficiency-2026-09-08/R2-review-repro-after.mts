import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createResponseCache, RESPONSE_CACHE_STORAGE_KEY } from '../../../apps/wechat-miniapp/src/services/response-cache.ts';
import { transportHarness } from '../../../apps/wechat-miniapp/src/services/api-request-test-support.ts';

const results = [];
for (const outcome of ['304', 'offline', '200']) {
  const h = transportHarness();
  const key = 'plans', path = '/v2/plans';
  const seeded = h.request(key, path);
  h.calls.at(-1).success({ statusCode: 200, data: h.response });
  await seeded; await h.flush();
  const original = h.responseCache.get('plans:/v2/plans:anonymous');
  const pending = h.request(key, path).then(value => ({ status:'resolved', value }), error => ({ status:'rejected', message:error.message }));
  assert.equal(h.calls.at(-1).header['If-None-Match'], h.response.etag);
  const cleanupCancelled = await h.clearTemporaryApiCache();
  assert.equal(cleanupCancelled, 0, 'plans is intentionally outside Settings temporary reads');
  assert.equal(h.responseCache.get('plans:/v2/plans:anonymous'), original, 'unrelated body remains valid in the cache');
  const latest = { ...h.response, etag:'newer-plans', data: {value:'newer-plan-list'} };
  if (outcome === 'offline') h.calls.at(-1).fail({errMsg:'offline'});
  else h.calls.at(-1).success({statusCode:Number(outcome), data:outcome === '200' ? latest : undefined});
  const result = await pending;
  await h.flush();
  results.push({scenario:'Settings temporary clear during unrelated plan read', outcome,
    result:result.status, error:result.message ?? null,
    cachedEtag:h.responseCache.get('plans:/v2/plans:anonymous')?.envelope.etag,
    expected: outcome === '304' ? 'resolved original body' : outcome === 'offline' ? 'resolved STALE_USABLE original body' : 'newer-plans stored in cache'});
  h.queryClient.clear();
}

// A host/storage failure is different from an async race: successful invalidation
// cannot be durably claimed if both pointer replacement and native deletion fail.
const data = new Map(); let failMutation = false;
const storage = {
  getStorageSync:key => structuredClone(data.get(key)),
  getStorageInfoSync:() => ({keys:[...data.keys()]}),
  setStorageSync:(key,value) => {if(failMutation) throw new Error('injected native storage failure');data.set(key,structuredClone(value));},
  removeStorageSync:key => {if(failMutation) throw new Error('injected native storage failure');data.delete(key);},
  setStorage:async ({key,data:value}) => {if(failMutation) throw new Error('injected native storage failure');data.set(key,value);},
};
const now = Date.now();
const cache = createResponseCache(storage, () => now);
const body = {apiVersion:'v2',dataState:'FRESH',generatedAt:new Date(now).toISOString(),validAt:new Date(now).toISOString(),requestId:'isolated-review',etag:'a',sources:[],warnings:[],data:{syntheticPrivatePlan:'a'}};
cache.set('plans:/v2/plans:user:a',body);await cache.flush();
failMutation=true;
const purgeCompleted = await cache.removeScope('user:a');
const stillOnDisk = data.has(RESPONSE_CACHE_STORAGE_KEY);
failMutation=false;
const recovered = createResponseCache(storage,()=>now).get('plans:/v2/plans:user:a');
results.push({scenario:'native manifest replacement and deletion both fail during removeScope', operationResolved:true, reportedCleanupComplete:purgeCompleted, manifestStillPresent:stillOnDisk, restoredRemovedBody:Boolean(recovered), expected:'surface incomplete local erasure rather than claim successful cleanup'});
writeFileSync(new URL('./R2-review-repro-after.json',import.meta.url),JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
