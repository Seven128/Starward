import assert from 'node:assert/strict';
import test from 'node:test';
import { loadBsc5pStarCatalog } from '@starward/astronomy-core/bsc5p-catalog';
import { CelestialObjectSearchService } from './celestial-object-search.ts';
import { CelestialObjectInformationService } from './celestial-object-information.ts';
import { publishedStarIntroduction } from './celestial-object-introductions.ts';

const rows = [
  {
    "hr": "6913",
    "hd": "169916",
    "hip": "90496",
    "name": "斗宿二（人马座λ，Kaus Borealis）",
    "existing": "斗宿二",
    "original": "Kaus Borealis",
    "revision": "1377335998"
  },
  {
    "hr": "6165",
    "hd": "149438",
    "hip": "81266",
    "name": "心宿三（天蝎座τ，Paikauhale）",
    "existing": "心宿三",
    "original": "Paikauhale",
    "revision": "1378262097"
  },
  {
    "hr": "39",
    "hd": "886",
    "hip": "1067",
    "name": "壁宿一（飞马座γ，Algenib）",
    "existing": "壁宿一",
    "original": "Algenib",
    "revision": "1370776078"
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

test('unreferenced events shared traditional names model hypotheses and formal components retain scope', () => {
  const info=new CelestialObjectInformationService();
  const k=info.get('HR:6913').data,p=info.get('HR:6165').data,g=info.get('HR:39').data;
  assert(k.limitations.some(l=>l.includes('1865/1984')&&l.includes('citation needed')&&l.includes('当前最近一次')));
  assert(k.limitations.some(l=>l.includes('2021')&&l.includes('不供观测预测')));
  assert(p.introduction?.includes('Paikauhale和Alniyat'));
  assert(p.limitations.some(l=>l.includes('蓝离散星')&&l.includes('不确定取其一')));
  assert(p.limitations.some(l=>l.includes('5.22')&&l.includes('11百万年')&&l.includes('分开')));
  assert(g.introduction?.includes('正式名称Algenib属于A分量')&&g.introduction?.includes('Mirfak'));
  assert(g.limitations.some(l=>l.includes('2025')&&l.includes('未取得独立成员身份')));
  assert(g.limitations.some(l=>l.includes('Gaia EDR3')&&l.includes('Artemis II')&&l.includes('不采用为已核实')));
  assert(g.limitations.some(l=>l.includes('0.15175')&&l.includes('不生成当前亮度')));
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
