import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import test from "node:test";
import {assertUranusBandsManifest} from "./uranus-bands-publication";

const source=new URL("../../../../workers/miniapp-api/assets/uranus/manifest.json",import.meta.url);
const bytes=readFileSync(source);
const hash=createHash("sha256").update(bytes).digest("hex");
const manifest=()=>{const root=JSON.parse(bytes.toString("utf8"));
  root.publicationHash=hash;
  root.image.downloadUrl=`/v2/sky/uranus/${hash}/${root.image.file}`;
  return root;};

test("Uranus bands accept only the pinned rights, source, latitude profile and local asset",()=>{
  assert.doesNotThrow(()=>assertUranusBandsManifest(manifest()));
  for(const mutate of [
    (root:ReturnType<typeof manifest>)=>{root.schemaVersion="starward-opal-saturn-bands-v1";},
    (root:ReturnType<typeof manifest>)=>{root.source.observationDate="2025-01-01";},
    (root:ReturnType<typeof manifest>)=>{root.image.sha256="0".repeat(64);},
    (root:ReturnType<typeof manifest>)=>{root.source.license="unspecified";},
    (root:ReturnType<typeof manifest>)=>{root.source.sourceSha256="0".repeat(64);},
    (root:ReturnType<typeof manifest>)=>{root.projection.latitude="planetocentric";},
    (root:ReturnType<typeof manifest>)=>{root.image.downloadUrl="https://example.com/cloud.png";},
  ]){
    const wrong=manifest();mutate(wrong);
    assert.throws(()=>assertUranusBandsManifest(wrong),/uranus_bands_manifest_invalid/u);
  }
});
