import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import test from "node:test";
import {assertSaturnBandsManifest} from "./saturn-bands-publication";

const source=new URL("../../../../workers/miniapp-api/assets/saturn/manifest.json",import.meta.url);
const bytes=readFileSync(source);
const hash=createHash("sha256").update(bytes).digest("hex");
const manifest=()=>{const root=JSON.parse(bytes.toString("utf8"));
  root.publicationHash=hash;
  root.image.downloadUrl=`/v2/sky/saturn/${hash}/${root.image.file}`;
  return root;};

test("Saturn bands accept only the pinned rights, source, latitude profile and local asset",()=>{
  assert.doesNotThrow(()=>assertSaturnBandsManifest(manifest()));
  for(const mutate of [
    (root:ReturnType<typeof manifest>)=>{root.source.license="unspecified";},
    (root:ReturnType<typeof manifest>)=>{root.source.sourceSha256="0".repeat(64);},
    (root:ReturnType<typeof manifest>)=>{root.projection.latitude="planetocentric";},
    (root:ReturnType<typeof manifest>)=>{root.image.downloadUrl="https://example.com/cloud.png";},
  ]){
    const wrong=manifest();mutate(wrong);
    assert.throws(()=>assertSaturnBandsManifest(wrong),/saturn_bands_manifest_invalid/u);
  }
});
