// Task-only HTTP identity facts. No URLs, coordinates, headers or bodies leave
// this owner. These observations describe bridge responses, not phone receipt.
import { createHash, randomUUID } from 'node:crypto';
import { Transform } from 'node:stream';
import { normalizeTerrainRequest, terrainRequestKey, terrainWindowViewport,
  validateTerrainRequest, validateTerrainPreviewRequest } from '../../../../workers/miniapp-api/src/terrain-request.ts';

export const TERRAIN_IDENTITY_RECEIPT_VERSION = 'starward.task.terrain-http-identity.v1';
export const TERRAIN_METADATA_RECEIPT_MAX_BYTES = 64 * 1024;
const sha256 = value => createHash('sha256').update(value).digest('hex');
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) ? value : null;
const state = (value, allowed) => allowed.includes(value) ? value : null;
const bytes = value => Number.isSafeInteger(value) && value >= 0 ? value : null;

// Decode just the public immutable filename, identically on metadata and asset
// requests. Hash the full canonical path; never retain its coordinate-bearing name.
function assetPathSha256(value) {
  if (typeof value !== 'string' || !value.startsWith('/v2/terrain/assets/')) return null;
  try {
    const file = decodeURIComponent(value.slice('/v2/terrain/assets/'.length));
    if (!file || file.length > 512 || /[\\/\u0000-\u0020?#]/.test(file) || !file.endsWith('.png')) return null;
    return sha256('/v2/terrain/assets/' + file);
  } catch { return null; }
}

function requestKeySha256(url) {
  try {
    const p = url.searchParams;
    if (['purpose', 'centerLat', 'centerLng', 'radiusKm', 'viewportBounds'].some(key => p.getAll(key).length > 1)) return null;
    const purpose = p.get('purpose'), center = { system: 'GCJ02',
      latitude: Number(p.get('centerLat') ?? undefined), longitude: Number(p.get('centerLng') ?? undefined) };
    const parts = p.has('viewportBounds') ? p.get('viewportBounds').split(',') : null;
    if (parts && (purpose !== 'MAP' || p.has('radiusKm') || parts.length !== 4 || parts.some(part => !part.trim()))) return null;
    const input = parts ? { purpose: 'MAP', center, viewportBounds: {
      west: Number(parts[0]), south: Number(parts[1]), east: Number(parts[2]), north: Number(parts[3]) } }
      : { purpose, center, radiusKm: Number(p.get('radiusKm') ?? undefined) };
    validateTerrainRequest(input);
    if (url.pathname.endsWith('/preview')) validateTerrainPreviewRequest(input);
    // Same producer owners/order as TerrainService.getPublication -> resolve.
    return sha256(terrainRequestKey(normalizeTerrainRequest(input.viewportBounds ? terrainWindowViewport(input) : input)));
  } catch { return null; }
}

async function boundedMetadata(response) {
  const reader = response.clone().body?.getReader();
  if (!reader) throw Error('NO_BODY');
  const chunks = []; let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > TERRAIN_METADATA_RECEIPT_MAX_BYTES) throw Error('OVER_LIMIT');
      chunks.push(part.value);
    }
    return JSON.parse(Buffer.concat(chunks, length).toString('utf8'));
  } catch (error) {
    // A tee branch's cancel promise can wait for the original consumer. Do not
    // await it and prevent the original response from reaching that consumer.
    void reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
}

export function createTerrainIdentityReceiptOwner() {
  const receiptRunId = randomUUID(); let ordinal = 0;
  return {
    start(url, method) {
      if (!['GET', 'HEAD'].includes(method)) return null;
      const overlay = url.pathname === '/v2/terrain/overlay' || url.pathname === '/v2/terrain/overlay/preview';
      const asset = /^\/v2\/terrain\/assets\/[^/]+$/.test(url.pathname);
      if (!overlay && !asset) return null;
      const key = overlay ? requestKeySha256(url) : null;
      return { terrainReceiptVersion: TERRAIN_IDENTITY_RECEIPT_VERSION, receiptRunId, requestOrdinal: ++ordinal,
        ...(overlay ? { requestKeySha256: key, requestKeyState: key ? 'RESOLVED' : 'UNKNOWN' }
          : { assetPathSha256: assetPathSha256(url.pathname) }) };
    },
    async metadata(response, facts) {
      try {
        const metadata = await boundedMetadata(response), data = metadata?.data;
        return { ...facts, metadataReadState: 'COMPLETE',
          envelopeState: state(metadata?.dataState, ['FRESH', 'STALE', 'PARTIAL', 'UNAVAILABLE']),
          terrainState: state(data?.state, ['AVAILABLE', 'PARTIAL', 'UNAVAILABLE']),
          hasImageUrl: typeof data?.imageUrl === 'string' && data.imageUrl.length > 0,
          imageBytes: bytes(data?.imageBytes), imageSha256: hash(data?.imageSha256),
          assetPathSha256: assetPathSha256(data?.imageUrl) };
      } catch (error) {
        return { ...facts, metadataReadState: error?.message === 'OVER_LIMIT' ? 'OVER_LIMIT' : 'UNKNOWN' };
      }
    },
    asset(response, facts, method) {
      const header = response.headers.get('content-length');
      facts.responseBytes = header === null ? null : bytes(Number(header));
      facts.responseBodyBytes = null; facts.responseBodySha256 = null;
      facts.responseHashState = !response.ok ? 'NOT_SUCCESS' : method !== 'GET' ? 'NOT_GET' : !response.body ? 'NO_BODY' : 'INCOMPLETE';
      if (facts.responseHashState !== 'INCOMPLETE') return null;
      const digest = createHash('sha256'); let length = 0;
      return new Transform({
        transform(chunk, _encoding, callback) {
          digest.update(chunk); length += chunk.length; callback(null, chunk);
        },
        flush(callback) {
          facts.responseBodyBytes = length; facts.responseBodySha256 = digest.digest('hex');
          facts.responseHashState = 'COMPLETE_RESPONSE'; callback();
        },
      });
    },
  };
}
