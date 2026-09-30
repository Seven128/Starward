import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import test from "node:test";
import {assertWideFieldW3Manifest} from "./wide-field-w3-publication";
import {skyJpegDimensions} from "../features/sky/sky-artwork-request";

const path=new URL("../../../../workers/miniapp-api/assets/deep-sky/wide-field-w3/manifest.json",import.meta.url);
const bytes=readFileSync(path);
const publicationHash=createHash("sha256").update(bytes).digest("hex");
const raw=JSON.parse(bytes.toString("utf8"));
const manifest={...raw,publicationHash,
  propertiesUrl:`/v2/sky/wide-field/${publicationHash}/properties`,
  tiles:raw.tiles.map((tile:{file:string})=>({...tile,
    downloadUrl:`/v2/sky/wide-field/${publicationHash}/${tile.file}`}))};

test("client accepts only the pinned infrared order-0 source, rights and same-origin file paths",()=>{
  assert.doesNotThrow(()=>assertWideFieldW3Manifest(manifest));
  assert.throws(()=>assertWideFieldW3Manifest({...manifest,source:{...manifest.source,
    masterUrl:"https://irsa.ipac.caltech.edu/data/hips/CDS/AllWISE/W3"}}),/invalid/u);
  assert.throws(()=>assertWideFieldW3Manifest({...manifest,source:{...manifest.source,
    hipsLicense:"UNKNOWN"}}),/invalid/u);
  assert.throws(()=>assertWideFieldW3Manifest({...manifest,tiles:manifest.tiles.slice(1)}),/invalid/u);
  assert.throws(()=>assertWideFieldW3Manifest({...manifest,tiles:[
    {...manifest.tiles[0],downloadUrl:"https://example.com/image.jpg"},...manifest.tiles.slice(1)]}),/invalid/u);
});

test("native-image request gate recognizes the real W3 base tile geometry",()=>{
  const tile=readFileSync(new URL("../../../../workers/miniapp-api/assets/deep-sky/wide-field-w3/Norder0/Dir0/Npix0.jpg",import.meta.url));
  assert.deepEqual(skyJpegDimensions(tile),{width:512,height:512});
  assert.equal(createHash("sha256").update(tile).digest("hex"),raw.tiles[0].sha256);
});
