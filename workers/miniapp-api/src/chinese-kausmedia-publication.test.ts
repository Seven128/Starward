import assert from 'node:assert/strict';
import test from 'node:test';
import { loadBsc5pStarCatalog } from '@starward/astronomy-core/bsc5p-catalog';
import { CelestialObjectSearchService } from './celestial-object-search.ts';
import { CelestialObjectInformationService } from './celestial-object-information.ts';
import { publishedStarIntroduction } from './celestial-object-introductions.ts';

const rows = [
  { hr:'6859', hd:'168454', hip:'89931', name:'箕宿二（人马座δ，Kaus Media）', existing:'箕宿二', original:'Kaus Media', revision:'1374877320' },
  { hr:'7525', hd:'186791', hip:'97278', name:'河鼓三（天鹰座γ，Tarazed）', existing:'河鼓三', original:'Tarazed', revision:'1374616176' },
  { hr:'6056', hd:'146051', hip:'79593', name:'天市右垣九（蛇夫座δ，Yed Prior）', existing:'天市右垣九', original:'Yed Prior', revision:'1377512875' },
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

test('fixed system descriptions visual neighbours uncertain variability and cultural names stay separate', () => {
  const info=new CelestialObjectInformationService();
  const k=info.get('HR:6859').data,t=info.get('HR:7525').data,y=info.get('HR:6056').data;
  assert(k.limitations.some(l=>l.includes('2008年目录')&&l.includes('没有独立成员供给')));
  assert(k.limitations.some(l=>l.includes('14等/26')&&l.includes('视觉邻近不作已确认')));
  assert(k.limitations.some(l=>l.includes('很可能')&&l.includes('不是物理星团')));
  assert(t.introduction?.includes('两个名字仍指不同恒星'));
  assert(t.limitations.some(l=>l.includes('1991')&&l.includes('尚未确认')));
  assert(t.limitations.some(l=>l.includes('2023')&&l.includes('不把星云并入')));
  assert(t.limitations.some(l=>l.includes('Menkib al Nesr')&&l.includes('不合并')));
  assert(y.introduction?.includes('距离不同')&&y.introduction?.includes('不表示物理双星'));
  assert(y.limitations.some(l=>l.includes('171光年')&&l.includes('108光年')));
  assert(y.limitations.some(l=>l.includes('两种解释不取唯一原因')));
  assert(y.limitations.some(l=>l.includes('投影旋转速度')&&l.includes('下限')));
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
