import assert from "node:assert/strict";
import test from "node:test";
import { loadBsc5pStarCatalog } from "@starward/astronomy-core/bsc5p-catalog";
import { CelestialObjectInformationService } from "./celestial-object-information.ts";
import { CelestialObjectSearchService } from "./celestial-object-search.ts";
import { publishedStarIntroduction } from "./celestial-object-introductions.ts";

const admitted = [[5340,"大角星"],[1713,"參宿七"],[2943,"南河三"],[472,"水委一"],[5267,"馬腹一"],[7557,"河鼓二"],[5056,"角宿一"],[2990,"北河三"],[4853,"十字架三"],[7924,"天津四"],[3982,"軒轅十四"],[2618,"弧矢七"]] as const;

test("twelve real named stars expose adopted prose without replacing catalogue aliases, facts or sources", () => {
  const details = new CelestialObjectInformationService(), basic = new CelestialObjectInformationService(undefined, undefined, undefined, undefined, () => null), search = new CelestialObjectSearchService();
  for (const [hr, query] of admitted) {
    const reference = `HR:${hr}`;
    for (const version of ["bsc5p-bright-stars.v2","bsc5p-bright-stars.v3"] as const) {
      const row = details.get(reference,"zh-CN",version), prior = basic.get(reference,"zh-CN",version);
      assert.equal(row.data.contentState,"READY",reference); assert(row.data.introduction?.length! > 20);
      assert.deepEqual(row.data.facts,prior.data.facts); assert.deepEqual(row.data.aliases,prior.data.aliases);
      assert.deepEqual(row.sources.filter(s=>s.provider!=="Wikipedia contributors"),prior.sources);
      assert.notEqual(row.data.contentRevision,prior.data.contentRevision);
      const source = row.sources.find(s=>s.provider==="Wikipedia contributors")!;
      assert.equal(source.license,"CC-BY-SA-4.0"); assert.equal(source.confidence,null);
      assert(source.sourceUrl?.includes("oldid=")); assert.equal(source.attribution?.url,source.sourceUrl);
      assert(source.attribution?.statements.some(s=>s.includes(source.licenseUrl!)));
      assert(!/\d+(?:光年|秒差距)|当前可见|最靠近|全天第\d/u.test(row.data.introduction!));
    }
    assert(search.search(query,20,"bsc5p-bright-stars.v3").data.results.some(r=>r.reference===reference),query);
  }
});

test("system, component and uncertain evolution text remain distinct from the drawn catalogue point", () => {
  const details = new CelestialObjectInformationService(), get=(hr:number)=>details.get(`HR:${hr}`,"zh-CN","bsc5p-bright-stars.v3").data;
  assert.match(get(1713).introduction!,/系统的主星.*蓝超巨星/u); assert(get(1713).limitations.some(s=>s.includes("固定周期与不规则")));
  assert.match(get(2943).introduction!,/演化分类仍有讨论.*白矮星/u);
  assert.match(get(5267).introduction!,/Aa、Ab和B/u); assert.match(get(5056).introduction!,/主星.*蓝巨星.*主序星/u);
  assert.match(get(4853).introduction!,/可能存在第三个分量/u);
  assert.match(get(2618).introduction!,/正式名称指其中的A分量/u);
  assert(get(3982).limitations.some(s=>s.includes("HD87884")&&s.includes("HD87901")));
  assert.match(get(7557).introduction!,/牛郎星.*夏季大三角.*快速自转/u);
  assert.match(get(7924).introduction!,/蓝白色超巨星.*北十字/u);
});

test("all admitted HR HD HIP cross-identities reject changed components rather than attaching prose", () => {
  const catalog=loadBsc5pStarCatalog("bsc5p-bright-stars.v3");
  for(const [hr]of admitted){const row=catalog.rows.find(r=>r.sourceId===`HR:${hr}`)!;
    for(const key of ["hr","hd","hip"] as const)assert.throws(()=>publishedStarIntroduction({...row,[key]:"999999"}),/identity_mismatch/u,`${hr} ${key}`);
  }
});

test("failed new stellar originals remain partial and recover while independent old facts and text survive", () => {
  for(const reference of ["HR:1713","HR:5267","HR:4853","HR:2618"]){let failed=true;
    const details=new CelestialObjectInformationService(undefined,undefined,undefined,undefined,row=>{if(failed&&row.sourceId===reference)throw Error("publication_read_failed");return publishedStarIntroduction(row);});
    const partial=details.get(reference,"zh-CN","bsc5p-bright-stars.v3");assert.equal(partial.dataState,"PARTIAL");assert.equal(partial.data.contentState,"BASIC_ONLY");assert.equal(partial.data.introduction,null);assert(!partial.sources.some(s=>s.provider==="Wikipedia contributors"));
    assert.equal(details.get("HR:2491").data.contentState,"READY");failed=false;
    const recovered=details.get(reference,"zh-CN","bsc5p-bright-stars.v3");assert.equal(recovered.data.contentState,"READY");assert.equal(recovered.dataState,"FRESH");assert.deepEqual(recovered.data.facts,partial.data.facts);assert.deepEqual(recovered.data.aliases,partial.data.aliases);assert.notEqual(recovered.data.contentRevision,partial.data.contentRevision);
  }
});
