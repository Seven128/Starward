import assert from "node:assert/strict";
import test from "node:test";
import {loadBsc5pStarCatalog} from "@starward/astronomy-core/bsc5p-catalog";
import {CelestialObjectInformationService} from "./celestial-object-information.ts";
import {CelestialObjectSearchService} from "./celestial-object-search.ts";
import {publishedStarIntroduction} from "./celestial-object-introductions.ts";
const adopted=[[4763,"十字架一"],[6527,"尾宿八"],[1790,"参宿五"],[1791,"五车五"]] as const;

test("the remaining four real Chinese bright-star names reach licensed prose without changing facts or aliases",()=>{
 const info=new CelestialObjectInformationService(),basic=new CelestialObjectInformationService(undefined,undefined,undefined,undefined,()=>null),search=new CelestialObjectSearchService();
 for(const [hr,name]of adopted)for(const version of ["bsc5p-bright-stars.v2","bsc5p-bright-stars.v3"] as const){const r=info.get(`HR:${hr}`,"zh-CN",version),old=basic.get(`HR:${hr}`,"zh-CN",version);
  assert.equal(r.data.contentState,"READY");assert(r.data.introduction!.length>25);assert.deepEqual(r.data.facts,old.data.facts);assert.deepEqual(r.data.aliases,old.data.aliases);
  assert(search.search(name,20,version).data.results.some(r=>r.reference===`HR:${hr}`));
  const source=r.sources.find(s=>s.provider==="Wikipedia contributors")!;assert.equal(source.license,"CC-BY-SA-4.0");assert.equal(source.confidence,null);assert(source.sourceUrl?.includes("oldid="));assert.equal(source.attribution?.url,source.sourceUrl);
  assert(source.attribution?.statements.some(s=>s.includes(source.licenseUrl!)));assert.notEqual(r.data.contentRevision,old.data.contentRevision);
 }
});
test("specific stellar science keeps catalogue disagreement, uncertain companions and old dual naming explicit",()=>{
 const info=new CelestialObjectInformationService(),get=(hr:number)=>info.get(`HR:${hr}`,"zh-CN","bsc5p-bright-stars.v3").data;
 assert.match(get(4763).introduction!,/红巨星.*半规则/);assert(get(4763).limitations.some(s=>s.includes("未发现")&&s.includes("伴星")));
 assert.match(get(6527).introduction!,/天蝎座λ.*翘起的尾巴/);assert(get(6527).limitations.some(s=>s.includes("A/B/C")&&s.includes("分量")));
 assert.match(get(1790).introduction!,/B型恒星.*亮度会变化/);assert(get(1790).limitations.some(s=>s.includes("B2V")&&s.includes("B2III")));assert(get(1790).facts.some(f=>f.value==="B2III"));
 assert.match(get(1791).introduction!,/金牛座β.*B型巨星/);assert.match(get(1791).introduction!,/御夫座γ.*历史名称/);
});
test("every newly admitted exact HR HD HIP rejects altered identity rather than attaching neighbouring prose",()=>{
 const catalog=loadBsc5pStarCatalog("bsc5p-bright-stars.v3");for(const [hr]of adopted){const row=catalog.rows.find(r=>r.hr===String(hr))!;assert(publishedStarIntroduction(row));for(const key of ["hr","hd","hip"] as const)assert.throws(()=>publishedStarIntroduction({...row,[key]:"999999"}),/identity_mismatch/);}
});
test("each newly admitted unavailable original remains partial, retains independent data and recovers",()=>{
 for(const [hr]of adopted){let failed=true;const reference=`HR:${hr}`,info=new CelestialObjectInformationService(undefined,undefined,undefined,undefined,row=>{if(failed&&row.sourceId===reference)throw Error("source unavailable");return publishedStarIntroduction(row);});
  const old=info.get(reference,"zh-CN","bsc5p-bright-stars.v3");assert.equal(old.dataState,"PARTIAL");assert.equal(old.data.contentState,"BASIC_ONLY");assert.equal(old.data.introduction,null);assert.equal(info.get("HR:8728","zh-CN","bsc5p-bright-stars.v3").data.contentState,"READY");failed=false;
  const got=info.get(reference,"zh-CN","bsc5p-bright-stars.v3");assert.equal(got.dataState,"FRESH");assert.equal(got.data.contentState,"READY");assert.deepEqual(got.data.facts,old.data.facts);assert.deepEqual(got.data.aliases,old.data.aliases);
 }
});
