import assert from 'node:assert/strict';
import test from 'node:test';
import {loadBsc5pStarCatalog} from '@starward/astronomy-core/bsc5p-catalog';
import {CelestialObjectSearchService} from './celestial-object-search.ts';
import {CelestialObjectInformationService} from './celestial-object-information.ts';
import {publishedStarIntroduction} from './celestial-object-introductions.ts';
const rows=[
  {hr:'8726',hd:'216946',hip:'113288',name:'螣蛇（蝎虎座V424，Tengshe）',revision:'1367909073',original:'Tengshe'},
  {hr:'6730',hd:'164669',hip:'88267',name:'帛度（武仙座95 A，Bodu）',revision:'1374787716',original:'Bodu'},
  {hr:'6729',hd:'164668',hip:null,name:'武仙座95 B（HD164668）',revision:'1374787716',original:'HD164668'},
];
test('three finite names retain numeric identities in old and current catalogues',()=>{
  const search=new CelestialObjectSearchService();
  for(const version of ['bsc5p-bright-stars.v2','bsc5p-bright-stars.v3'] as const)for(const row of rows){
    assert.deepEqual(search.search(row.name,20,version).data.results.map(r=>r.reference),['HR:'+row.hr]);
    for(const q of ['HR'+row.hr,'HD'+row.hd,row.original,...(row.hip?['HIP'+row.hip]:[])])assert(search.search(q,20,version).data.results.some(r=>r.reference==='HR:'+row.hr));
  }
});
test('new prose preserves original facts, nulls, prior aliases and member differences',()=>{
  const info=new CelestialObjectInformationService(),basic=new CelestialObjectInformationService(undefined,undefined,undefined,undefined,()=>null);
  for(const row of rows){const actual=info.get('HR:'+row.hr).data,old=basic.get('HR:'+row.hr).data;
    assert.equal(actual.contentState,'READY');assert.deepEqual(actual.facts,old.facts);
    for(const alias of old.aliases)assert(actual.aliases.includes(alias));
    assert(actual.limitations.some(s=>s.includes('null')&&s.includes('Var_ID')));
  }
  assert(info.get('HR:8726').data.limitations.some(s=>s.includes('K5/M0')&&s.includes('K5Ib')));
  assert(info.get('HR:6730').data.limitations.some(s=>s.includes('A5IIIn')&&s.includes('A2IV')));
  assert(info.get('HR:6729').data.limitations.some(s=>s.includes('G8III')&&s.includes('G5III')));
  assert.equal(loadBsc5pStarCatalog('bsc5p-bright-stars.v3').rows.find(r=>r.hr==='6729')!.hip,null);
});
test('fixed English reuse never fills missing child IDs or lends the Bodu name to B',()=>{
  const catalog=loadBsc5pStarCatalog('bsc5p-bright-stars.v3');
  for(const row of rows){const star=catalog.rows.find(r=>r.hr===row.hr)!,p=publishedStarIntroduction(star)!;assert(p);
    assert.equal(new URL(p.source.sourceUrl!).searchParams.get('oldid'),row.revision);
    assert.equal(p.source.license,'CC-BY-SA-4.0');assert.equal(p.source.confidence,null);
    assert.equal(p.source.attribution?.url,p.source.sourceUrl);
    assert(p.source.attribution?.statements.some(s=>s.includes('翻译为简体中文')));
    assert(p.source.attribution?.statements.some(s=>s.includes(p.source.licenseUrl!)));
    for(const change of [{hd:'1'},{hip:star.hip===null?'88267':null}])assert.throws(()=>publishedStarIntroduction({...star,...change}),/identity_mismatch/);
  }
  const a=publishedStarIntroduction(catalog.rows.find(r=>r.hr==='6730')!)!,b=publishedStarIntroduction(catalog.rows.find(r=>r.hr==='6729')!)!;
  assert(a.source.limitations.some(s=>s.includes('HD/HIP缺值')&&s.includes('A精确字段')));
  assert(b.source.limitations.some(s=>s.includes('帛度一')&&s.includes('差异')));
  assert(!b.aliases?.some(s=>s.includes('Bodu')||s.includes('帛度一')));
});
test('asterism queries preserve earlier members without inventing traditional ordinals',()=>{
  const search=new CelestialObjectSearchService(),refs=(q:string)=>search.search(q,50,'bsc5p-bright-stars.v3').data.results.map(r=>r.reference);
  const snake=refs('螣蛇');assert.equal(snake.length,34);for(const hr of ['27','8281','8371','8494','8538','8541','8585','8613','8780','8797','8804','8805','8822','8830','8860','8864','8874','8875','8876','8885','8904','8913','8926','8930','8947','8961','8965','8967','8976','9003','9008','9045','9071','8726'])assert(snake.includes('HR:'+hr));
  const bodu=refs('帛度');assert.equal(bodu.length,6);for(const hr of ['6713','6729','6738','6787','6794','6730'])assert(bodu.includes('HR:'+hr));
  assert.deepEqual(refs('95Her').sort(),['HR:6729','HR:6730']);assert.deepEqual(refs('腾蛇'),[]);
});
test('one failed translation retains independent rows, original aliases and facts then recovers',()=>{
  for(const row of rows){let failed=true;const publish:typeof publishedStarIntroduction=star=>{if(failed&&star.hr===row.hr)throw Error('unavailable');return publishedStarIntroduction(star)};
    const search=new CelestialObjectSearchService(undefined,undefined,publish),info=new CelestialObjectInformationService(undefined,undefined,undefined,undefined,publish),before=search.search(row.name,20,'bsc5p-bright-stars.v3');
    assert.equal(before.dataState,'PARTIAL');assert.deepEqual(before.data.results,[]);
    for(const other of rows.filter(r=>r!==row))assert.deepEqual(search.search(other.name,20,'bsc5p-bright-stars.v3').data.results.map(r=>r.reference),['HR:'+other.hr]);
    for(const q of ['HR'+row.hr,'HD'+row.hd,row.original])assert(search.search(q,20,'bsc5p-bright-stars.v3').data.results.some(r=>r.reference==='HR:'+row.hr));
    const basic=info.get('HR:'+row.hr).data;assert.equal(basic.contentState,'BASIC_ONLY');failed=false;
    const after=search.search(row.name,20,'bsc5p-bright-stars.v3');assert.equal(after.dataState,'FRESH');assert.notEqual(after.etag,before.etag);
    assert.deepEqual(after.data.results.map(r=>r.reference),['HR:'+row.hr]);assert.deepEqual(info.get('HR:'+row.hr).data.facts,basic.facts);
  }
});
