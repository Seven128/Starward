import assert from 'node:assert/strict';
import test from 'node:test';
import {loadBsc5pStarCatalog} from '@starward/astronomy-core/bsc5p-catalog';
import {CelestialObjectSearchService} from './celestial-object-search.ts';
import {CelestialObjectInformationService} from './celestial-object-information.ts';
import {publishedStarIntroduction} from './celestial-object-introductions.ts';

test('Rasalgethi component names and qualified common system name preserve both original HR results',()=>{
  const s=new CelestialObjectSearchService();
  for(const version of ['bsc5p-bright-stars.v2','bsc5p-bright-stars.v3'] as const){
    for(const [query,reference] of [['帝座（武仙座α¹）','HR:6406'],['帝座（武仙座α²）','HR:6407']]){
      const r=s.search(query,20,version);assert.equal(r.dataState,'FRESH');assert.deepEqual(r.data.results.map(r=>r.reference),[reference]);
    }
    for(const query of ['帝座','帝座（武仙座α系统）'])assert.deepEqual(s.search(query,20,version).data.results.map(r=>r.reference).sort(),query==='帝座'?['HR:4534','HR:6406','HR:6407']:['HR:6406','HR:6407']);
    assert.deepEqual(s.search('HIP84345',20,version).data.results.map(r=>r.reference),['HR:6406']);
  }
});
test('Rasalgethi prose preserves separate facts, nullable HIP and disclosed system/component naming scope',()=>{
  const i=new CelestialObjectInformationService(),basic=new CelestialObjectInformationService(undefined,undefined,undefined,undefined,()=>null);
  for(const reference of ['HR:6406','HR:6407']){
    const r=i.get(reference,'zh-CN','bsc5p-bright-stars.v3'),old=basic.get(reference,'zh-CN','bsc5p-bright-stars.v3');assert.equal(r.data.contentState,'READY');assert.deepEqual(r.data.facts,old.data.facts);
    for(const a of old.data.aliases)assert(r.data.aliases.includes(a));assert(r.data.aliases.includes('帝座（武仙座α系统）'));
    assert.match(r.data.introduction!,reference==='HR:6406'?/帝座.*α¹.*红色/:/帝座.*α².*黄巨星/);
    if(reference==='HR:6406'){assert(r.data.aliases.includes('帝座（武仙座α¹）'));assert(r.data.aliases.includes('帝座'));}
    else {assert(r.data.aliases.includes('帝座'));assert(!r.data.aliases.includes('帝座（武仙座α¹）'));assert(!r.data.aliases.some(a=>a.startsWith('HIP')));}
    const src=r.sources.find(s=>s.provider==='Wikipedia contributors')!;assert.equal(src.license,'CC-BY-SA-4.0');assert.equal(src.confidence,null);assert.equal(src.attribution?.url,src.sourceUrl);assert(src.attribution?.statements.some(s=>s.includes(src.licenseUrl!)));
    assert(r.data.limitations.some(s=>s.includes('帝座')&&s.includes('整个系统')));assert(r.data.limitations.some(s=>s.includes('84345B')&&s.includes('缺值')));assert.notEqual(r.data.contentRevision,old.data.contentRevision);
  }
});
test('Rasalgethi exact HR HD present/null HIP refuses sibling substitution and importing external84345B',()=>{
  const c=loadBsc5pStarCatalog('bsc5p-bright-stars.v3'),a=c.rows.find(r=>r.hr==='6406')!,b=c.rows.find(r=>r.hr==='6407')!;assert(publishedStarIntroduction(a));assert(publishedStarIntroduction(b));assert.equal(b.hip,null);
  assert.throws(()=>publishedStarIntroduction({...b,hip:'84345B'}),/identity_mismatch/);assert.throws(()=>publishedStarIntroduction({...b,hip:a.hip}),/identity_mismatch/);assert.throws(()=>publishedStarIntroduction({...a,hd:b.hd}),/identity_mismatch/);assert.throws(()=>publishedStarIntroduction({...b,hd:a.hd}),/identity_mismatch/);
});
test('failed Rasalgethi prose preserves independent alpha2 and existing Denebola and original lookup then recovers shared and distinct Chinese results',()=>{
  let failed=true;const publish:typeof publishedStarIntroduction=row=>{if(failed&&row.hr==='6406')throw Error('unavailable');return publishedStarIntroduction(row)},s=new CelestialObjectSearchService(undefined,undefined,publish),i=new CelestialObjectInformationService(undefined,undefined,undefined,undefined,publish);
  const partial=s.search('帝座（武仙座α¹）',20,'bsc5p-bright-stars.v3');assert.equal(partial.dataState,'PARTIAL');assert.deepEqual(partial.data.results,[]);assert.deepEqual(s.search('帝座',20,'bsc5p-bright-stars.v3').data.results.map(r=>r.reference).sort(),['HR:4534','HR:6407']);
  for(const query of ['HR6406','Rasalgethi'])assert(s.search(query,20,'bsc5p-bright-stars.v3').data.results.some(r=>r.reference==='HR:6406'));
  const old=i.get('HR:6406','zh-CN','bsc5p-bright-stars.v3');assert.equal(old.data.contentState,'BASIC_ONLY');assert.equal(old.dataState,'PARTIAL');assert.equal(i.get('HR:6407','zh-CN','bsc5p-bright-stars.v3').data.contentState,'READY');failed=false;
  const got=s.search('帝座（武仙座α¹）',20,'bsc5p-bright-stars.v3');assert.equal(got.dataState,'FRESH');assert.deepEqual(got.data.results.map(r=>r.reference),['HR:6406']);assert.notEqual(got.etag,partial.etag);assert.deepEqual(s.search('帝座',20,'bsc5p-bright-stars.v3').data.results.map(r=>r.reference).sort(),['HR:4534','HR:6406','HR:6407']);
  const detail=i.get('HR:6406','zh-CN','bsc5p-bright-stars.v3');assert.equal(detail.data.contentState,'READY');assert.deepEqual(detail.data.facts,old.data.facts);
});

test('photometry codes never become variable-star codes in the four corrected licensed entries',()=>{const catalog=loadBsc5pStarCatalog('bsc5p-bright-stars.v3'),information=new CelestialObjectInformationService();for(const reference of ['HR:7528','HR:8238','HR:1412','HR:1411']){const star=catalog.rows.find(r=>r.sourceId===reference)!,publication=publishedStarIntroduction(star)!;assert.equal(star.vMagCode,null);assert(publication);assert(!publication.source.limitations.some(s=>/变光代码|变星代码/u.test(s)));assert(publication.source.limitations.some(s=>s.includes('测光标记')&&s.includes('变星')));const actual=information.get(reference,'zh-CN','bsc5p-bright-stars.v3');assert.equal(actual.data.contentState,'READY');assert(actual.data.limitations.some(s=>s.includes('测光标记')&&s.includes('变星')));}});
