import assert from 'node:assert/strict';
import test from 'node:test';
import { loadBsc5pStarCatalog } from '@starward/astronomy-core/bsc5p-catalog';
import { CelestialObjectSearchService } from './celestial-object-search.ts';
import { CelestialObjectInformationService } from './celestial-object-information.ts';
import { publishedStarIntroduction } from './celestial-object-introductions.ts';

const rows = [
  {
    "hr": "4656",
    "hd": "106490",
    "hip": "59747",
    "name": "十字架四（南十字座δ，Imai）",
    "existing": "十字架四",
    "original": "Imai",
    "revision": "1374606360"
  },
  {
    "hr": "3185",
    "hd": "67523",
    "hip": "39757",
    "name": "弧矢增卅二（船尾座ρ，Tureis）",
    "existing": "弧矢增卅二",
    "original": "Tureis",
    "revision": "1347254680"
  },
  {
    "hr": "6212",
    "hd": "150680",
    "hip": "81693",
    "name": "天纪二（武仙座ζ，Tianji）",
    "existing": "天纪二",
    "original": "Tianji",
    "revision": "1374785161"
  }
];

test('qualified Chinese names and English numeric searches retain exact original identities', () => {
  const search = new CelestialObjectSearchService();
  for (const version of ['bsc5p-bright-stars.v2','bsc5p-bright-stars.v3'] as const) for (const row of rows) {
    for (const query of [row.name, 'HR'+row.hr, 'HD'+row.hd, row.original])
      assert.deepEqual(search.search(query,20,version).data.results.map(r=>r.reference), query==='Tianji'?['HR:6212','HR:8115']:['HR:'+row.hr]);
    for (const query of [row.existing, 'HIP'+row.hip])
      assert(search.search(query,20,version).data.results.some(r=>r.reference==='HR:'+row.hr));
  }
});

test('finite descriptions preserve original independent facts aliases and nullable measurements', () => {
  const info = new CelestialObjectInformationService();
  const basic = new CelestialObjectInformationService(undefined,undefined,undefined,undefined,()=>null);
  for (const row of rows) {
    const data=info.get('HR:'+row.hr).data, original=basic.get('HR:'+row.hr).data;
    assert.equal(data.contentState,'READY');
    assert.deepEqual(data.facts,original.facts);
    for (const alias of original.aliases) assert(data.aliases.includes(alias));
    assert(data.limitations.some(l=>/缺失的?测光说明/u.test(l)));
  }
});

test('fixed translated prose binds exact identifiers and concrete reusable licence', () => {
  const catalog=loadBsc5pStarCatalog('bsc5p-bright-stars.v3');
  for (const row of rows) {
    const star=catalog.rows.find(r=>r.hr===row.hr)!, published=publishedStarIntroduction(star)!;
    assert(published);
    assert.equal(new URL(published.source.sourceUrl!).searchParams.get('oldid'),row.revision);
    assert.equal(published.source.license,'CC-BY-SA-4.0');
    assert.equal(published.source.confidence,null);
    assert.equal(published.source.attribution?.url,published.source.sourceUrl);
    assert(published.source.attribution?.statements.some(s=>s.includes('翻译为简体中文')));
    assert(published.source.attribution?.statements.some(s=>s.includes(published.source.licenseUrl!)));
    assert.throws(()=>publishedStarIntroduction({...star,hd:'1'}),/identity_mismatch/);
    assert.throws(()=>publishedStarIntroduction({...star,hip:null}),/identity_mismatch/);
    assert.equal(star.vMagCode,null);
  }
});

test('disputed variability spectral explanations cultural names and component scope stay explicit', () => {
  const info=new CelestialObjectInformationService(),search=new CelestialObjectSearchService();
  const i=info.get('HR:4656').data,t=info.get('HR:3185').data,z=info.get('HR:6212').data;
  assert(i.limitations.some(l=>l.includes('强候选且有争议')&&l.includes('不据此确定变星类别')));
  assert(i.limitations.some(l=>l.includes('不作当前位置季节或天气预测')));
  assert(t.introduction?.includes('Tureis和Aspidiske'));
  assert(t.limitations.some(l=>l.includes('F5IIkF2IImF5II')&&l.includes('不取唯一新分类')));
  for(const query of ['弧矢增卅二','弧矢增三十二']) assert(search.search(query,20,'bsc5p-bright-stars.v3').data.results.some(r=>r.reference==='HR:3185'));
  assert(t.limitations.some(l=>l.includes('0.14088143')&&l.includes('不作当前绝对无伴星')));
  assert(z.introduction?.includes('正式名称Tianji属于A分量')&&z.introduction?.includes('系统合成光'));
  assert(z.limitations.some(l=>l.includes('子实体未核实')&&l.includes('不新增独立身份')));
  assert(z.limitations.some(l=>l.includes('可能第三成员')&&l.includes('两项天体测量')&&l.includes('不取确认存在或绝对排除')));
  assert(z.limitations.some(l=>l.includes('Phecda/Suhail')&&l.includes('不合并身份')));
});

test('unavailable one translation preserves independent original data and entries then recovers', () => {
  for (const row of rows) {
    let failed=true;
    const publish:typeof publishedStarIntroduction=star=>{
      if(failed&&star.hr===row.hr)throw Error('unavailable');
      return publishedStarIntroduction(star);
    };
    const search=new CelestialObjectSearchService(undefined,undefined,publish);
    const info=new CelestialObjectInformationService(undefined,undefined,undefined,undefined,publish);
    const before=search.search(row.name,20,'bsc5p-bright-stars.v3');
    assert.equal(before.dataState,'PARTIAL');assert.deepEqual(before.data.results,[]);
    for(const other of rows.filter(r=>r!==row))
      assert.deepEqual(search.search(other.name,20,'bsc5p-bright-stars.v3').data.results.map(r=>r.reference),['HR:'+other.hr]);
    for(const query of [row.existing,'HR'+row.hr,'HD'+row.hd,row.original])
      assert(search.search(query,20,'bsc5p-bright-stars.v3').data.results.some(r=>r.reference==='HR:'+row.hr));
    const basic=info.get('HR:'+row.hr).data;assert.equal(basic.contentState,'BASIC_ONLY');
    failed=false;
    const after=search.search(row.name,20,'bsc5p-bright-stars.v3');
    assert.equal(after.dataState,'FRESH');assert.notEqual(after.etag,before.etag);
    assert.deepEqual(after.data.results.map(r=>r.reference),['HR:'+row.hr]);
    assert.deepEqual(info.get('HR:'+row.hr).data.facts,basic.facts);
  }
});
