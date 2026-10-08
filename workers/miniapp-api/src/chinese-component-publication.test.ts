import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { loadBsc5pStarCatalog } from "@starward/astronomy-core/bsc5p-catalog";
import { CelestialObjectInformationService } from "./celestial-object-information.ts";
import { CelestialObjectSearchService } from "./celestial-object-search.ts";
import { publishedStarIntroduction, parseChineseIntroductionPublication } from "./celestial-object-introductions.ts";

test("real missing Chinese bright-star queries reach exact independent catalogue components", () => {
  const search = new CelestialObjectSearchService();
  for (const version of ["bsc5p-bright-stars.v2", "bsc5p-bright-stars.v3"] as const) {
    const refs = (q: string) => search.search(q,20,version).data.results.filter(r=>r.kind==="STAR").map(r=>r.reference).sort();
    assert.deepEqual(refs("北落师门"), ["HR:8728"]);
    assert.deepEqual(refs("南门二"), ["HR:5459", "HR:5460"]);
    assert.deepEqual(refs("南門二甲"), ["HR:5459"]);
    assert.deepEqual(refs("南门二乙"), ["HR:5460"]);
    assert.deepEqual(refs("十字架二"), ["HR:4730", "HR:4731"]);
  }
});

test("licensed component prose keeps aliases, source attribution, old facts and genuine null HIP", () => {
  const details=new CelestialObjectInformationService(),basic=new CelestialObjectInformationService(undefined,undefined,undefined,undefined,()=>null);
  for(const reference of ["HR:8728","HR:5459","HR:5460","HR:4730","HR:4731"]){
    const got=details.get(reference,"zh-CN","bsc5p-bright-stars.v3"),old=basic.get(reference,"zh-CN","bsc5p-bright-stars.v3");
    assert.equal(got.data.contentState,"READY",reference);assert(got.data.introduction!.length>20);
    assert.deepEqual(got.data.facts,old.data.facts);for(const alias of old.data.aliases)assert(got.data.aliases.includes(alias));
    assert.notEqual(got.data.contentRevision,old.data.contentRevision);
    const source=got.sources.find(s=>s.provider==="Wikipedia contributors")!;
    assert.equal(source.license,"CC-BY-SA-4.0");assert.equal(source.confidence,null);
    assert.equal(source.attribution?.url,source.sourceUrl);assert(source.attribution?.statements.some(s=>s.includes(source.licenseUrl!)));
    assert(got.data.limitations.some(s=>s.includes("系统")&&s.includes("分量")));
    if(reference.startsWith("HR:473")){assert(!got.data.aliases.some(s=>s.startsWith("HIP")));assert(got.data.limitations.some(s=>s.includes("HIP")&&s.includes("缺值")));}
  }
});

test("null HIP is an exact identity value, never a wildcard or invented shared system identifier",()=>{
  const catalog=loadBsc5pStarCatalog("bsc5p-bright-stars.v3");
  for(const ref of ["HR:4730","HR:4731"]){const row=catalog.rows.find(r=>r.sourceId===ref)!;
    assert.equal(row.hip,null);assert(publishedStarIntroduction(row));
    assert.throws(()=>publishedStarIntroduction({...row,hip:"60718"}),/identity_mismatch/);
    assert.throws(()=>publishedStarIntroduction({...row,hd:ref==="HR:4730"?"108249":"108248"}),/identity_mismatch/);
  }
  const b=readFileSync(new URL("../assets/celestial-object-introductions.zh-cn.v7.json",import.meta.url)),pack=JSON.parse(b.toString());
  for(const invalid of [undefined,"",0,"null"]){const changed=structuredClone(pack);const row=changed.rows.find((r:{reference:string})=>r.reference==="HR:4730");row.identity.hip=invalid;
    const bytes=Buffer.from(JSON.stringify(changed));assert.throws(()=>parseChineseIntroductionPublication(bytes,createHash("sha256").update(bytes).digest("hex")),/row_invalid/);
  }
  for(const key of ["hr","hd"]){const changed=structuredClone(pack),row=changed.rows.find((r:{reference:string})=>r.reference==="HR:4730");row.identity[key]=Number(row.identity[key]);
    const bytes=Buffer.from(JSON.stringify(changed));assert.throws(()=>parseChineseIntroductionPublication(bytes,createHash("sha256").update(bytes).digest("hex")),/row_invalid/);
  }
  const legacy={...pack,version:"starward-celestial-introductions.zh-cn.v6"},bytes=Buffer.from(JSON.stringify(legacy));
  assert.throws(()=>parseChineseIntroductionPublication(bytes,createHash("sha256").update(bytes).digest("hex")),/row_invalid/,"older edition contracts still reject null HIP");
});

test("an unavailable component publication preserves independent results and retries both consumers",()=>{
  let failed=true;
  const publish:typeof publishedStarIntroduction=row=>{if(failed&&row.sourceId==="HR:5459")throw Error("unavailable");return publishedStarIntroduction(row);};
  const search=new CelestialObjectSearchService(undefined,undefined,publish),details=new CelestialObjectInformationService(undefined,undefined,undefined,undefined,publish);
  const partial=search.search("南门二",20,"bsc5p-bright-stars.v3");assert.equal(partial.dataState,"PARTIAL");
  assert.deepEqual(partial.data.results.map(r=>r.reference),["HR:5460"]);
  assert(search.search("HR5459",20,"bsc5p-bright-stars.v3").data.results.some(r=>r.reference==="HR:5459"));
  const basic=details.get("HR:5459","zh-CN","bsc5p-bright-stars.v3");assert.equal(basic.dataState,"PARTIAL");assert.equal(basic.data.contentState,"BASIC_ONLY");
  assert.equal(details.get("HR:5460","zh-CN","bsc5p-bright-stars.v3").data.contentState,"READY");failed=false;
  const recovered=search.search("南门二",20,"bsc5p-bright-stars.v3");assert.equal(recovered.dataState,"FRESH");assert.equal(recovered.data.results.length,2);assert.notEqual(recovered.etag,partial.etag);
  const info=details.get("HR:5459","zh-CN","bsc5p-bright-stars.v3");assert.equal(info.dataState,"FRESH");assert.deepEqual(info.data.facts,basic.data.facts);
});
