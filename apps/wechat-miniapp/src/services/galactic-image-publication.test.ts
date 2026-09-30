import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {assertGalacticImageManifest} from "./galactic-image-publication";

test("galactic image client accepts the exact reviewed publication, rejects wrong projection and URL",()=>{
  const bytes=readFileSync(new URL("../../../../workers/miniapp-api/assets/deep-sky/galactic-2mass/manifest.json",import.meta.url));
  const root=JSON.parse(bytes.toString("utf8"));
  const publicationHash=createHash("sha256").update(bytes).digest("hex");
  const manifest={...root,publicationHash,image:{...root.image,
    downloadUrl:`/v2/sky/galactic/${publicationHash}/${root.image.file}`}};
  assert.doesNotThrow(()=>assertGalacticImageManifest(manifest));
  assert.throws(()=>assertGalacticImageManifest({...manifest,projection:{...manifest.projection,longitudeIncreases:"right"}}));
  assert.throws(()=>assertGalacticImageManifest({...manifest,source:{...manifest.source,rightsUrl:"https://example.com/unknown"}}));
  assert.throws(()=>assertGalacticImageManifest({...manifest,image:{...manifest.image,downloadUrl:"https://elsewhere.example/sky.jpg"}}));
});
