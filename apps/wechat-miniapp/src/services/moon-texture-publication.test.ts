import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {assertMoonTextureManifest} from "./moon-texture-publication";

const hash="a".repeat(64),file="clementine-uv750-v2-wms-2048x1024.jpg";
const manifest=()=>({
  schemaVersion:"starward-clementine-moon-v1",publicationId:"moon-clementine-v1",publicationHash:hash,
  source:{title:"Clementine uv750 Global Basemap v2 Mosaic",provider:"USGS Astrogeology Science Center",
    recordUrl:"https://astrogeology.usgs.gov/search/map/moon_clementine_uvvis_global_mosaic_118m",
    rightsUrl:"https://www.usgs.gov/faqs/are-usgs-reportspublications-copyrighted",
    credit:"USGS Astrogeology Science Center / Clementine UVVIS",
    wmsUrl:"https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/earth/moon_simp_cyl.map&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=uv_v2&STYLES=&SRS=EPSG:4326&BBOX=-180,-90,180,90&WIDTH=2048&HEIGHT=1024&FORMAT=image/jpeg&TRANSPARENT=FALSE"},
  projection:{kind:"simple-cylindrical",latitude:"planetocentric",longitude:"positive-east",bboxDeg:[-180,-90,180,90]},
  image:{file,sha256:"e071f796a1ec1f7c9f4d87660aabb1bb40adbfacc0ecb253919bee6c711efefb",
    bytes:372399,width:2048,height:1024,downloadUrl:`/v2/sky/moon/${hash}/${file}`},
  processing:"USGS WMS size reduction",limitations:["historic grayscale","not calibrated photometry"],
});

test("the corrected production metadata retains the existing Mini image contract",()=>{
  const bytes=readFileSync(new URL("../../../../workers/miniapp-api/assets/moon/manifest.json",import.meta.url));
  const root=JSON.parse(bytes.toString("utf8"));
  root.publicationHash=createHash("sha256").update(bytes).digest("hex");
  root.image.downloadUrl=`/v2/sky/moon/${root.publicationHash}/${root.image.file}`;
  assert.doesNotThrow(()=>assertMoonTextureManifest(root));
});

test("moon texture manifest binds rights, map projection and same-origin immutable file",()=>{
  assert.doesNotThrow(()=>assertMoonTextureManifest(manifest()));
  const rights=manifest();rights.source.rightsUrl="https://example.com/unknown";
  assert.throws(()=>assertMoonTextureManifest(rights),/manifest_invalid/u);
  const reversed=manifest();reversed.projection.longitude="positive-west";
  assert.throws(()=>assertMoonTextureManifest(reversed),/manifest_invalid/u);
  const remote=manifest();remote.image.downloadUrl="https://planetarymaps.usgs.gov/image.jpg";
  assert.throws(()=>assertMoonTextureManifest(remote),/manifest_invalid/u);
});
