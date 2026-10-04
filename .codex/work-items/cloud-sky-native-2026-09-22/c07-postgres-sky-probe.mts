import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {PostgresMiniappRepository} from '../../../workers/miniapp-api/src/postgres-repository.ts';
import {insertExplicitTestSpot} from '../../../workers/miniapp-api/src/test-fixtures/infrastructure-spot.ts';

const stage=process.env.C07_PROBE_STAGE;
assert.ok(stage==='before'||stage==='after');
const base=process.env.C07_PROBE_API_BASE ?? 'http://127.0.0.1:18789';
const spotId=process.env.C07_PROBE_SPOT_ID ?? 'spot:cloudsky-c07-postgres-20260923';
const statePath=join(import.meta.dirname,process.env.C07_PROBE_STATE_PATH ?? 'evidence/c07-postgres-sky-state-2026-09-23.json');
const readJson=async(response:Response)=>{
  const body=await response.json() as Record<string,unknown>;
  assert.ok(response.status===200||response.status===201,JSON.stringify(body));
  return body;
};
let contextId:string;
if(stage==='before'){
  const url=process.env.DATABASE_URL;
  assert.ok(url,'DATABASE_URL required for isolated insert');
  const repository=await new PostgresMiniappRepository(url).initialize({migrate:false});
  try{
    const spot=await insertExplicitTestSpot(repository,{spotId});
    assert.equal(spot.spotId,spotId);
  }finally{await repository.close();}
  const response=await fetch(`${base}/v2/observation-contexts/resolve`,{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
      location:{kind:'FORMAL_SPOT',spotId},localDate:'2026-09-23',
    }),
  });
  const context=await readJson(response);
  contextId=(context.data as {contextId:string}).contextId;
  assert.ok(contextId);
  await writeFile(statePath,JSON.stringify({spotId,contextId}));
}else{
  const state=JSON.parse(await readFile(statePath,'utf8')) as {spotId:string;contextId:string};
  assert.equal(state.spotId,spotId);contextId=state.contextId;
}
const context=await readJson(await fetch(`${base}/v2/observation-contexts/${encodeURIComponent(contextId)}`));
const contextData=context.data as {contextId:string;location?:{spotId?:string};contextFingerprint?:string;selectedAtUtc?:string};
assert.equal(contextData.contextId,contextId);
const sky=await readJson(await fetch(`${base}/v2/spots/${encodeURIComponent(spotId)}/sky?contextId=${encodeURIComponent(contextId)}`));
const skyData=sky.data as {hourly?:{at:string}[];observationFrames?:{at:string;observer:{latitude:number}}[];
  skyScene?:{state:string;catalog?:{rowCount:number;catalogVersion:string};
    frames?:{state:string;geometry?:{observer:{latitude:number}}}[]}};
assert.equal(skyData.skyScene?.state,'AVAILABLE');
assert.equal(skyData.skyScene?.catalog?.rowCount,8404);
assert.equal(skyData.skyScene.frames?.[0]?.state,'AVAILABLE');
assert.equal(skyData.observationFrames?.[0]?.at,skyData.hourly?.[0]?.at);
assert.equal(skyData.skyScene.frames[0]?.geometry?.observer.latitude,
  skyData.observationFrames[0]?.observer.latitude);
const search=await readJson(await fetch(`${base}/v2/celestial-objects?q=${encodeURIComponent('张宿二')}`));
const searchData=search.data as {results:{reference:string;matchedAlias:string}[];unavailableCatalogs?:string[]};
assert.equal(search.dataState,'FRESH');
assert.equal(searchData.results[0]?.reference,'HR:3994');
assert.equal(searchData.results[0]?.matchedAlias,'张宿二');
assert.equal(searchData.unavailableCatalogs?.length??0,0);
console.log(JSON.stringify({stage,spotId,contextId,contextDataState:context.dataState,
  contextFingerprint:contextData.contextFingerprint,selectedAtUtc:contextData.selectedAtUtc,
  skyDataState:sky.dataState,skySceneState:skyData.skyScene.state,
  skyCatalog:skyData.skyScene.catalog?.catalogVersion,skyCatalogRows:skyData.skyScene.catalog?.rowCount,
  hourlyRows:skyData.hourly?.length??0,observationFrames:skyData.observationFrames?.length??0,
  searchDataState:search.dataState,searchIdentity:searchData.results[0]?.reference,
  searchAlias:searchData.results[0]?.matchedAlias},null,2));
