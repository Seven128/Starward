import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const out=path.resolve('.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-stellar-layer-target-2026-09-29.json');
await assert.rejects(fs.access(out), {code:'ENOENT'});
const origin='http://127.0.0.1:8791';
async function json(route) {
 const r=await fetch(origin+route,{headers:{'x-starward-measurement-probe':'1'},signal:AbortSignal.timeout(15000)});
 assert.equal(r.status,200);return r.json();
}
const envelope=await json('/v2/sky/supplements/sao/v2');
const publication=envelope.data;
assert.equal(publication.index.baseCatalogVersion,'bsc5p-bright-stars.v3');
assert.equal(publication.index.rowCount,246280);
// A bounded static-source selection near Vega, not a fabricated observing position.
const ra=279.23473479*Math.PI/180,dec=38.78368896*Math.PI/180;
const direction=[Math.cos(dec)*Math.cos(ra),Math.cos(dec)*Math.sin(ra),Math.sin(dec)];
const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0);
const meta=[...publication.index.tiles].sort((a,b)=>dot(b.centerEqj,direction)-dot(a.centerEqj,direction))[0];
const response=await json(`/v2/sky/supplements/sao/v2/${publication.publicationHash}/tiles/${meta.id}`);
assert.equal(response.data.publicationHash,publication.publicationHash);
assert.equal(response.data.tile.tileId,meta.id);
const tile=response.data.tile;
// Published catalog integrity uses the JSON object bytes, without a trailing newline.
const serialized=Buffer.from(JSON.stringify(tile));
assert.equal(serialized.length,meta.bytes);
assert.equal(createHash('sha256').update(serialized).digest('hex'),meta.sha256);
const candidates=tile.rows.filter(r=>r[1]>=8.5&&r[1]<=9.1).map(row=>({row,separationDeg:Math.acos(Math.max(-1,Math.min(1,dot(row.slice(2,5),direction))))*180/Math.PI}));
candidates.sort((a,b)=>a.separationDeg-b.separationDeg||a.row[1]-b.row[1]);
const chosen=candidates[0];assert(chosen&&chosen.separationDeg<4);
const result={scope:'Bounded static source selection for native progressive-star verification; actual position must come from public selected-object service in current Context.',
 publicationHash:publication.publicationHash,catalogVersion:publication.index.catalogVersion,catalogHash:publication.index.catalogHash,
 baseCatalogVersion:publication.index.baseCatalogVersion,rows:publication.index.rowCount,tileCount:publication.index.tiles.length,
 tile:{id:meta.id,bytes:meta.bytes,sha256:meta.sha256,rowCount:tile.rows.length},chosen,
 sources:response.sources,limits:['No new external download or catalogue research; uses existing publication.','No local static vector is treated as current horizontal position.','This source check does not establish native drawing, picking or data coverage completion.']};
await fs.writeFile(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,publicationHash:result.publicationHash,tile:result.tile,chosen}));
