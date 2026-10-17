import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {skyPagePaintCommit} from "./sky-optical-page-test-support";
import {registerSkyNativeImageLifetime} from "./sky-artwork-loader";
const source=ts.createSourceFile("sky.tsx",readFileSync(new URL("./spot-sky-page.tsx",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);

test("accepted IR frame publishes the actually surviving coarse identity only after native copy",()=>{
  const coarse={},fine={};let current=true,presented:any=null;
  const accepted=()=>presented;
  const retire=registerSkyNativeImageLifetime(coarse,()=>true);
  const infrared={reference:"M:51",level:"DETAIL",fieldDegrees:.25,image:fine,publicationHash:"edition",sourceId:"w3",sourceMissingPixels:9,
    canvasGeneration:1,isCurrent:()=>current,coarser:{reference:"M:51",level:"OVERVIEW",fieldDegrees:2,image:coarse,publicationHash:"edition",sourceId:"w3"}};
  const frame={data:{},frameAt:"2026-10-14T13:00:00.000Z",mode:"NIGHT",deepSkyImage:infrared};
  const owner=skyPagePaintCommit(source,{frame,setPresentedSkyFrame:(update:(previous:any)=>any)=>{presented=update(presented);},setPresentedCamera(){}});
  const sources={sdssOptical:null,deepSkyImage:coarse};
  owner.stage(null,sources);assert.equal(presented,null);owner.complete();
  assert.strictEqual(accepted().deepSkyImage.image,coarse);assert.equal(accepted().deepSkyImage.level,"OVERVIEW");
  assert.equal(accepted().deepSkyImage.fieldDegrees,2);assert.equal(accepted().deepSkyImage.publicationHash,"edition");
  assert.equal(accepted().deepSkyImage.sourceMissingPixels,undefined,"a coarse receipt cannot inherit the fine field's missing-data facts");
  owner(null,{sdssOptical:null,deepSkyImage:null});assert.equal(presented,null,"zero preparation cannot borrow prior credit");
  current=false;owner(null,sources);assert.equal(presented,null,"a retired selection cannot publish the old source");
  current=true;retire();owner(null,sources);assert.equal(presented,null,"a retired native companion cannot borrow current primary identity");
});
