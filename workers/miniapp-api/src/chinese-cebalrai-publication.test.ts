import assert from 'node:assert/strict';
import test from 'node:test';
import { loadBsc5pStarCatalog } from '@starward/astronomy-core/bsc5p-catalog';
import { CelestialObjectSearchService } from './celestial-object-search.ts';
import { CelestialObjectInformationService } from './celestial-object-information.ts';
import { publishedStarIntroduction } from './celestial-object-introductions.ts';

const rows = [
  {
    "hr": "6603",
    "hd": "161096",
    "hip": "86742",
    "name": "宗正一（蛇夫座β，Cebalrai）",
    "existing": "宗正一",
    "original": "Cebalrai",
    "revision": "1374548855"
  },
  {
    "hr": "1666",
    "hd": "33111",
    "hip": "23875",
    "name": "玉井三（波江座β，Cursa）",
    "existing": "玉井三",
    "original": "Cursa",
    "revision": "1377343599"
  },
  {
    "hr": "6536",
    "hd": "159181",
    "hip": "85670",
    "name": "天棓三（天龙座β，Rastaban）",
    "existing": "天棓三",
    "original": "Rastaban",
    "revision": "1377345578"
  }
];

test('qualified Chinese names and English numeric searches retain exact original identities', () => {
  const search = new CelestialObjectSearchService();
  for (const version of ['bsc5p-bright-stars.v2','bsc5p-bright-stars.v3'] as const) for (const row of rows) {
    for (const query of [row.name, 'HR'+row.hr, 'HD'+row.hd, row.original])
      assert.deepEqual(search.search(query,20,version).data.results.map(r=>r.reference), ['HR:'+row.hr]);
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

test('fixed reports source mistakes optical neighbours formal component names and excluded releases remain explicit', () => {
  const info=new CelestialObjectInformationService();
  const c=info.get('HR:6603').data,u=info.get('HR:1666').data,r=info.get('HR:6536').data;
  assert(c.limitations.some(l=>l.includes('rho Per')&&l.includes('未采用')));
  assert(c.limitations.some(l=>l.includes('citation needed')&&l.includes('142日')&&l.includes('不生成行星')));
  assert(c.limitations.some(l=>l.includes('Gaia DR3')&&l.includes('未采用')));
  assert(u.limitations.some(l=>l.includes('1985')&&l.includes('不生成当前爆发')));
  assert(u.limitations.some(l=>l.includes('光学邻星')&&l.includes('Gaia EDR3')&&l.includes('不能确定归群')));
  assert(r.introduction?.includes('正式名称属于A分量')&&r.introduction?.includes('系统合成光'));
  assert(r.limitations.some(l=>l.includes('没有独立成员供给')&&l.includes('不新增B身份')));
  assert(r.limitations.some(l=>l.includes('不能因位于造父不稳定带')&&l.includes('不生成光变模型')));
  assert(r.limitations.some(l=>l.includes('现代Eltanin身份分开')&&l.includes('不生成恒星表面细节')));
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
