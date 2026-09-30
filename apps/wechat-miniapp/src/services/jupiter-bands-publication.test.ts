import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import test from "node:test";
import {assertJupiterBandsManifest} from "./jupiter-bands-publication";

const source=new URL("../../../../workers/miniapp-api/assets/jupiter/manifest.json",import.meta.url);
const bytes=readFileSync(source);
const hash=createHash("sha256").update(bytes).digest("hex");
const manifest=()=>{const root=JSON.parse(bytes.toString("utf8"));
  root.publicationHash=hash;
  root.image.downloadUrl=`/v2/sky/jupiter/${hash}/${root.image.file}`;
  return root;};

test("Jupiter band manifest accepts the fixed publication and rejects rights, projection and remote image changes",()=>{
  assert.doesNotThrow(()=>assertJupiterBandsManifest(manifest()));
  const rights=manifest();rights.source.license="unspecified";
  assert.throws(()=>assertJupiterBandsManifest(rights),/manifest_invalid/u);
  const latitude=manifest();latitude.projection.latitude="planetocentric";
  assert.throws(()=>assertJupiterBandsManifest(latitude),/manifest_invalid/u);
  const longitude=manifest();longitude.projection.longitude="positive-west";
  assert.throws(()=>assertJupiterBandsManifest(longitude),/manifest_invalid/u);
  const image=manifest();image.image.downloadUrl="https://example.com/cloud.png";
  assert.throws(()=>assertJupiterBandsManifest(image),/manifest_invalid/u);
});
