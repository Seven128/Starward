import assert from "node:assert/strict";
import test from "node:test";
import {loadBsc5pStarCatalog} from "@starward/astronomy-core/bsc5p-catalog";
import {CelestialObjectSearchService} from "./celestial-object-search.ts";
import {CelestialObjectInformationService} from "./celestial-object-information.ts";
import {publishedStarIntroduction} from "./celestial-object-introductions.ts";

test("the real missing Mizar Chinese system query retains both distinct components and original related-name matches",()=>{
 const search=new CelestialObjectSearchService();for(const version of ["bsc5p-bright-stars.v2","bsc5p-bright-stars.v3"] as const){const got=search.search("开阳",20,version);assert.equal(got.dataState,"FRESH");assert.deepEqual(got.data.results.map(r=>r.reference).sort(),["HR:5054","HR:5055","HR:5062","HR:5142"]);assert.deepEqual(search.search("HIP65378",20,version).data.results.map(r=>r.reference),["HR:5054"]);}
});
test("both fixed Mizar introductions preserve catalogue facts, original aliases, independent sources and genuine missing HIP",()=>{
 const info=new CelestialObjectInformationService(),basic=new CelestialObjectInformationService(undefined,undefined,undefined,undefined,()=>null);
 for(const ref of ["HR:5055","HR:5054"]){const r=info.get(ref,"zh-CN","bsc5p-bright-stars.v3"),old=basic.get(ref,"zh-CN","bsc5p-bright-stars.v3");assert.equal(r.data.contentState,"READY");assert.deepEqual(r.data.facts,old.data.facts);for(const a of old.data.aliases)assert(r.data.aliases.includes(a));assert(r.data.aliases.includes("开阳"));assert.notEqual(r.data.contentRevision,old.data.contentRevision);
  const source=r.sources.find(s=>s.provider==="Wikipedia contributors")!;assert.equal(source.license,"CC-BY-SA-4.0");assert.equal(source.confidence,null);assert.equal(source.attribution?.url,source.sourceUrl);assert(source.attribution?.statements.some(s=>s.includes(source.licenseUrl!)));
  assert.match(r.data.introduction!,ref==="HR:5054"?/A分量.*HR5054.*HD116656/:/B分量.*HR5055.*HD116657/);assert(r.data.limitations.some(s=>s.includes("系统")&&s.includes("分量")));
  if(ref==="HR:5055"){assert(!r.data.aliases.some(a=>a.startsWith("HIP")));assert(r.data.limitations.some(s=>s.includes("HIP")&&s.includes("缺值")));}
 }
 for(const ref of ["HR:5062","HR:5142"]){const r=info.get(ref,"zh-CN","bsc5p-bright-stars.v3"),old=basic.get(ref,"zh-CN","bsc5p-bright-stars.v3");assert.deepEqual(r.data.facts,old.data.facts);assert(!r.data.aliases.includes("开阳"));assert(!r.sources.some(s=>s.provider==="Wikipedia contributors"));}
});
test("Mizar HIP absence and exact A versus B catalogue identity reject cross-component substitution",()=>{
 const catalog=loadBsc5pStarCatalog("bsc5p-bright-stars.v3"),a=catalog.rows.find(r=>r.sourceId==="HR:5054")!,b=catalog.rows.find(r=>r.sourceId==="HR:5055")!;assert(publishedStarIntroduction(a));assert(publishedStarIntroduction(b));assert.equal(b.hip,null);
 assert.throws(()=>publishedStarIntroduction({...b,hip:a.hip}),/identity_mismatch/);assert.throws(()=>publishedStarIntroduction({...a,hd:b.hd}),/identity_mismatch/);assert.throws(()=>publishedStarIntroduction({...b,hd:a.hd}),/identity_mismatch/);
});
test("one unavailable Mizar component preserves the other and retries both discovery and detail",()=>{
 let failed=true;const publish:typeof publishedStarIntroduction=row=>{if(failed&&row.sourceId==="HR:5054")throw Error("unavailable");return publishedStarIntroduction(row);};const search=new CelestialObjectSearchService(undefined,undefined,publish),info=new CelestialObjectInformationService(undefined,undefined,undefined,undefined,publish);
 const partial=search.search("开阳",20,"bsc5p-bright-stars.v3");assert.equal(partial.dataState,"PARTIAL");assert.deepEqual(partial.data.results.map(r=>r.reference).sort(),["HR:5055","HR:5062","HR:5142"]);assert(search.search("HR5054",20,"bsc5p-bright-stars.v3").data.results.some(r=>r.reference==="HR:5054"));
 const old=info.get("HR:5054","zh-CN","bsc5p-bright-stars.v3");assert.equal(old.dataState,"PARTIAL");assert.equal(old.data.contentState,"BASIC_ONLY");assert.equal(info.get("HR:5055","zh-CN","bsc5p-bright-stars.v3").data.contentState,"READY");failed=false;
 const got=search.search("开阳",20,"bsc5p-bright-stars.v3");assert.equal(got.dataState,"FRESH");assert.equal(got.data.results.length,4);assert.notEqual(got.etag,partial.etag);const details=info.get("HR:5054","zh-CN","bsc5p-bright-stars.v3");assert.equal(details.dataState,"FRESH");assert.equal(details.data.contentState,"READY");assert.deepEqual(details.data.facts,old.data.facts);
});
