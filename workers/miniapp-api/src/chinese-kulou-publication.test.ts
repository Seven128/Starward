import assert from 'node:assert/strict';
import test from 'node:test';
import { loadBsc5pStarCatalog } from '@starward/astronomy-core/bsc5p-catalog';
import { CelestialObjectSearchService } from './celestial-object-search.ts';
import { CelestialObjectInformationService } from './celestial-object-information.ts';
import { publishedStarIntroduction } from './celestial-object-introductions.ts';

const rows = [
  {
    "hr": "5028",
    "hd": "115892",
    "hip": "65109",
    "name": "柱十一（半人马座ι，Kulou）",
    "existing": "柱十一",
    "original": "Kulou",
    "revision": "1374447959"
  },
  {
    "hr": "1899",
    "hd": "37043",
    "hip": "26241",
    "name": "伐三（猎户座ι，Hatysa）",
    "existing": "伐三",
    "original": "Hatysa",
    "revision": "1374779973"
  },
  {
    "hr": "6148",
    "hd": "148856",
    "hip": "80816",
    "name": "天市右垣一（武仙座β，Kornephoros）",
    "existing": "天市右垣一",
    "original": "Kornephoros",
    "revision": "1378497447"
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

test('historical names unresolved component scopes excluded measurements and tentative models retain limits',()=>{
 const i=new CelestialObjectInformationService(),k=i.get('HR:5028').data,h=i.get('HR:1899').data,c=i.get('HR:6148').data;
 assert(k.introduction?.includes('2025年')&&k.introduction?.includes('现代星名与历史星群'));
 assert(k.limitations.some(l=>l.includes('半人马座ζ')&&l.includes('不合并两颗恒星')));
 assert(k.limitations.some(l=>l.includes('截至2011')&&l.includes('不等于当前确定没有行星')));
 assert(k.limitations.some(l=>l.includes('可能属于IC2391')&&l.includes('不是确认成员')));
 assert(h.introduction?.includes('原目录点对应A的合成光'));
 assert(h.limitations.some(l=>l.includes('Aa1')&&l.includes('Aa')&&l.includes('不强行统一')));
 assert(h.limitations.some(l=>l.includes('Gaia DR3')&&l.includes('未采用')));
 assert(h.limitations.some(l=>l.includes('B的V2451 Ori')&&l.includes('不转移到本点')));
 assert(c.introduction?.includes('正式名称属于A分量'));
 assert(c.limitations.some(l=>l.includes('根中的B未独立核实')&&l.includes('不采用')));
 assert(c.limitations.some(l=>l.includes('Zuǒ')&&l.includes('不生成左垣名称')));
 assert(c.limitations.some(l=>l.includes('疑似变星')&&l.includes('不生成确认')));
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
