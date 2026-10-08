import assert from 'node:assert/strict';
import test from 'node:test';
import {loadBsc5pStarCatalog} from '@starward/astronomy-core/bsc5p-catalog';
import {CelestialObjectSearchService} from './celestial-object-search.ts';
import {CelestialObjectInformationService} from './celestial-object-information.ts';
import {publishedStarIntroduction} from './celestial-object-introductions.ts';

test('Theta Tauri component names and qualified historical system name preserve both original HR results',()=>{
  const s=new CelestialObjectSearchService();
  for(const version of ['bsc5p-bright-stars.v2','bsc5p-bright-stars.v3'] as const){
    for(const [query,reference] of [['毕宿增十三','HR:1412'],['毕宿六（金牛座θ¹）','HR:1411']]){
      const r=s.search(query,20,version);assert.equal(r.dataState,'FRESH');assert.deepEqual(r.data.results.map(r=>r.reference),[reference]);
    }
    for(const query of ['毕宿六','毕宿六（金牛座θ系统）'])assert.deepEqual(s.search(query,20,version).data.results.map(r=>r.reference).sort(),['HR:1411','HR:1412']);
    assert.deepEqual(s.search('HIP20894',20,version).data.results.map(r=>r.reference),['HR:1412']);
  }
});
test('Theta Tauri prose preserves separate facts, nullable HIP and disclosed historical naming scope',()=>{
  const i=new CelestialObjectInformationService(),basic=new CelestialObjectInformationService(undefined,undefined,undefined,undefined,()=>null);
  for(const reference of ['HR:1412','HR:1411']){
    const r=i.get(reference,'zh-CN','bsc5p-bright-stars.v3'),old=basic.get(reference,'zh-CN','bsc5p-bright-stars.v3');assert.equal(r.data.contentState,'READY');assert.deepEqual(r.data.facts,old.data.facts);
    for(const a of old.data.aliases)assert(r.data.aliases.includes(a));assert(r.data.aliases.includes('毕宿六（金牛座θ系统）'));
    assert.match(r.data.introduction!,reference==='HR:1412'?/毕宿增十三.*θ².*白色A型/:/毕宿六.*θ¹.*橘色K型/);
    if(reference==='HR:1412'){assert(r.data.aliases.includes('毕宿增十三'));assert(!r.data.aliases.includes('毕宿六'));}
    else {assert(r.data.aliases.includes('毕宿六'));assert(!r.data.aliases.includes('毕宿增十三'));assert(!r.data.aliases.some(a=>a.startsWith('HIP')));}
    const src=r.sources.find(s=>s.provider==='Wikipedia contributors')!;assert.equal(src.license,'CC-BY-SA-4.0');assert.equal(src.confidence,null);assert.equal(src.attribution?.url,src.sourceUrl);assert(src.attribution?.statements.some(s=>s.includes(src.licenseUrl!)));
    assert(r.data.limitations.some(s=>s.includes('毕宿六')&&s.includes('整个系统')));assert(r.data.limitations.some(s=>s.includes('20885')&&s.includes('缺值')));assert.notEqual(r.data.contentRevision,old.data.contentRevision);
  }
});
test('Theta Tauri exact HR HD present/null HIP refuses sibling substitution and importing external20885',()=>{
  const c=loadBsc5pStarCatalog('bsc5p-bright-stars.v3'),a=c.rows.find(r=>r.hr==='1412')!,b=c.rows.find(r=>r.hr==='1411')!;assert(publishedStarIntroduction(a));assert(publishedStarIntroduction(b));assert.equal(b.hip,null);
  assert.throws(()=>publishedStarIntroduction({...b,hip:'20885'}),/identity_mismatch/);assert.throws(()=>publishedStarIntroduction({...b,hip:a.hip}),/identity_mismatch/);assert.throws(()=>publishedStarIntroduction({...a,hd:b.hd}),/identity_mismatch/);assert.throws(()=>publishedStarIntroduction({...b,hd:a.hd}),/identity_mismatch/);
});
test('failed Chamukuy prose preserves independent theta1 and original lookup then recovers shared and distinct Chinese results',()=>{
  let failed=true;const publish:typeof publishedStarIntroduction=row=>{if(failed&&row.hr==='1412')throw Error('unavailable');return publishedStarIntroduction(row)},s=new CelestialObjectSearchService(undefined,undefined,publish),i=new CelestialObjectInformationService(undefined,undefined,undefined,undefined,publish);
  const partial=s.search('毕宿增十三',20,'bsc5p-bright-stars.v3');assert.equal(partial.dataState,'PARTIAL');assert.deepEqual(partial.data.results,[]);assert.deepEqual(s.search('毕宿六',20,'bsc5p-bright-stars.v3').data.results.map(r=>r.reference),['HR:1411']);
  for(const query of ['HR1412','Chamukuy'])assert(s.search(query,20,'bsc5p-bright-stars.v3').data.results.some(r=>r.reference==='HR:1412'));
  const old=i.get('HR:1412','zh-CN','bsc5p-bright-stars.v3');assert.equal(old.data.contentState,'BASIC_ONLY');assert.equal(old.dataState,'PARTIAL');assert.equal(i.get('HR:1411','zh-CN','bsc5p-bright-stars.v3').data.contentState,'READY');failed=false;
  const got=s.search('毕宿增十三',20,'bsc5p-bright-stars.v3');assert.equal(got.dataState,'FRESH');assert.deepEqual(got.data.results.map(r=>r.reference),['HR:1412']);assert.notEqual(got.etag,partial.etag);assert.deepEqual(s.search('毕宿六',20,'bsc5p-bright-stars.v3').data.results.map(r=>r.reference).sort(),['HR:1411','HR:1412']);
  const detail=i.get('HR:1412','zh-CN','bsc5p-bright-stars.v3');assert.equal(detail.data.contentState,'READY');assert.deepEqual(detail.data.facts,old.data.facts);
});
