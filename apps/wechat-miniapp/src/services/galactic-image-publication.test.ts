import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {assertGalacticImageManifest} from "./galactic-image-publication";
import {MELLINGER_OPTICAL_MILKY_WAY} from "@starward/miniapp-contracts";

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

test("conditional optical bitmap keeps exact J2000, rights, PNG and unknown validity",()=>{
  const identity=MELLINGER_OPTICAL_MILKY_WAY,publicationHash="b".repeat(64);
  const manifest={schemaVersion:"starward-mellinger-optical-milky-way-trial-v1",scope:"TRIAL",
    role:"OPTICAL_MILKY_WAY_DISPLAY",publicationId:"conditional-bitmap",publicationHash,
    source:identity.source,projection:identity.projection,
    image:{...identity.image,downloadUrl:`/v2/sky/galactic/${publicationHash}/${identity.image.file}`},
    scientificAvailability:"UNKNOWN",absoluteRegistration:"UNVERIFIED",processing:"Unmodified bundled PNG.",
    limitations:["Producer processing is unknown.","No general high-resolution region coverage."]};
  assert.doesNotThrow(()=>assertGalacticImageManifest(manifest));
  for(const changed of [
    {...manifest,projection:{...manifest.projection,frame:"galactic"}},
    {...manifest,projection:{...manifest.projection,centerLongitudeDeg:0}},
    {...manifest,scope:"PRODUCTION"},
    {...manifest,source:{...manifest.source,producerProcessing:"NONE"}},
    {...manifest,source:{...manifest.source,credit:"Stellarium"}},
    {...manifest,source:{...manifest.source,rightsUrl:"https://milkywaysky.com/licenses.html"}},
    {...manifest,scientificAvailability:"ALL_SKY_VALID"},
    {...manifest,image:{...manifest.image,format:"jpeg"}},
    {...manifest,image:{...manifest.image,downloadUrl:"https://example.com/milkyway.png"}},
  ])assert.throws(()=>assertGalacticImageManifest(changed));
});

test("ordinary optical discovery accepts the selected exact bitmap without relabelling the trial or science validity",()=>{
  const bytes=readFileSync(new URL("../../../../workers/miniapp-api/assets/deep-sky/galactic-mellinger/manifest.json",import.meta.url));
  const stored=JSON.parse(bytes.toString('utf8')),publicationHash=createHash('sha256').update(bytes).digest('hex');
  const manifest={...stored,publicationHash,image:{...stored.image,
    downloadUrl:`/v2/sky/galactic/${publicationHash}/${stored.image.file}`}};
  assert.doesNotThrow(()=>assertGalacticImageManifest(manifest));
  assert.equal(manifest.scope,'DISPLAY');
  for(const changed of [
    {...manifest,scope:'TRIAL'},
    {...manifest,schemaVersion:'starward-mellinger-optical-milky-way-trial-v1'},
    {...manifest,scientificAvailability:'AVAILABLE'},
    {...manifest,projection:{...manifest.projection,frame:'galactic'}},
  ])assert.throws(()=>assertGalacticImageManifest(changed));
});
