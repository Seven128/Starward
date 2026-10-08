import assert from 'node:assert/strict';
import test from 'node:test';
import {loadBsc5pStarCatalog} from '@starward/astronomy-core/bsc5p-catalog';
import {CelestialObjectSearchService} from './celestial-object-search.ts';
import {CelestialObjectInformationService} from './celestial-object-information.ts';
import {publishedStarIntroduction} from './celestial-object-introductions.ts';
const ref='HR:7602';
test('Alshain verified Chinese aliases select the exact existing HR in both supported bright catalogues',()=>{
 const s=new CelestialObjectSearchService();for(const version of ['bsc5p-bright-stars.v2','bsc5p-bright-stars.v3']as const){for(const q of ['河鼓一','河鼓一（天鹰座β A）','河鼓一（天鷹座β A）']){const r=s.search(q,20,version);assert.equal(r.dataState,'FRESH');assert.deepEqual(r.data.results.map(r=>r.reference),[ref]);}for(const q of ['HR7602','HD188512','HIP98036','Alshain'])assert(s.search(q,20,version).data.results.some(r=>r.reference===ref));}
});
test('Alshain finite background carries licence and source measurement limitations without changing original facts or photometry null',()=>{
 const c=loadBsc5pStarCatalog('bsc5p-bright-stars.v3'),star=c.rows.find(r=>r.hr==='7602')!,i=new CelestialObjectInformationService(),basic=new CelestialObjectInformationService(undefined,undefined,undefined,undefined,()=>null),r=i.get(ref,'zh-CN','bsc5p-bright-stars.v3'),old=basic.get(ref,'zh-CN','bsc5p-bright-stars.v3');
 assert.equal(r.data.contentState,'READY');assert.match(r.data.introduction!,/河鼓一.*天鹰座.*河鼓/u);assert(!/46593|0\.07|B1900|脉动/u.test(r.data.introduction!));assert.deepEqual(r.data.facts,old.data.facts);for(const alias of old.data.aliases)assert(r.data.aliases.includes(alias));assert.equal(star.vMagCode,null);assert.equal(star.vMag,3.71);assert.equal(star.bV,.86);assert.equal(star.spectralType,'G8IV');
 const src=r.sources.find(s=>s.provider==='Wikipedia contributors')!;assert.equal(src.license,'CC-BY-SA-4.0');assert.equal(src.confidence,null);assert.equal(src.attribution?.url,src.sourceUrl);assert(src.attribution?.statements.some(s=>s.includes(src.licenseUrl!)));for(const mark of ['46593','B1900','98036','测光','Pulsating'])assert(r.data.limitations.some(l=>l.includes(mark)));assert.notEqual(r.data.contentRevision,old.data.contentRevision);
});
test('Alshain exact source HR HD HIP rejects sibling or missing identity fields',()=>{
 const star=loadBsc5pStarCatalog('bsc5p-bright-stars.v3').rows.find(r=>r.hr==='7602')!;assert(publishedStarIntroduction(star));for(const changed of [{hd:'188513'},{hip:null},{hip:'98035'}])assert.throws(()=>publishedStarIntroduction({...star,...changed}),/identity_mismatch/);
});
test('unavailable Alshain prose preserves numericEnglish discovery and independent Porrima then retries Chinese content',()=>{
 let failed=true;const publish:typeof publishedStarIntroduction=row=>{if(failed&&row.hr==='7602')throw Error('unavailable');return publishedStarIntroduction(row)},s=new CelestialObjectSearchService(undefined,undefined,publish),i=new CelestialObjectInformationService(undefined,undefined,undefined,undefined,publish);
 const partial=s.search('河鼓一',20,'bsc5p-bright-stars.v3');assert.equal(partial.dataState,'PARTIAL');assert.deepEqual(partial.data.results,[]);for(const q of ['HR7602','Alshain'])assert(s.search(q,20,'bsc5p-bright-stars.v3').data.results.some(r=>r.reference===ref));const before=i.get(ref,'zh-CN','bsc5p-bright-stars.v3');assert.equal(before.data.contentState,'BASIC_ONLY');assert.equal(before.dataState,'PARTIAL');assert.equal(i.get('HR:4825','zh-CN','bsc5p-bright-stars.v3').data.contentState,'READY');failed=false;
 const after=s.search('河鼓一',20,'bsc5p-bright-stars.v3');assert.equal(after.dataState,'FRESH');assert.deepEqual(after.data.results.map(r=>r.reference),[ref]);assert.notEqual(after.etag,partial.etag);const detail=i.get(ref,'zh-CN','bsc5p-bright-stars.v3');assert.equal(detail.data.contentState,'READY');assert.deepEqual(detail.data.facts,before.data.facts);
});
