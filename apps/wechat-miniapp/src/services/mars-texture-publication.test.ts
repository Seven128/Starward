import assert from "node:assert/strict";
import test from "node:test";
import {assertMarsTextureManifest} from "./mars-texture-publication";

const hash="a".repeat(64),file="mars-mdim21-color-usgs-wms-1024x512.jpg";
const record="https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m";
const manifest=()=>({
  schemaVersion:"starward-viking-mars-v1",publicationId:"mars-mdim21-v1",publicationHash:hash,
  source:{title:"Mars Viking Colorized Global Mosaic 232m",provider:"USGS Astrogeology Science Center",
    recordUrl:record,rightsUrl:record,credit:"USGS / NASA Ames / Viking Orbiter",
    wmsUrl:"https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/mars/mars_simp_cyl.map&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=MDIM21_color&STYLES=&SRS=EPSG:4326&BBOX=-180,-90,180,90&WIDTH=1024&HEIGHT=512&FORMAT=image/jpeg&TRANSPARENT=FALSE"},
  projection:{kind:"simple-cylindrical",latitude:"planetocentric",longitude:"positive-east",bboxDeg:[-180,-90,180,90]},
  image:{file,sha256:"cd324068ee22f66664d15ff5934ff6cfc195bb0e2ee8becba6092f078442d184",
    bytes:94411,width:1024,height:512,downloadUrl:`/v2/sky/mars/${hash}/${file}`},
  processing:"USGS WMS resample",limitations:["historical colorized map","not calibrated visual photometry"],
});

test("Mars manifest binds rights, projection and same-origin immutable JPEG",()=>{
  assert.doesNotThrow(()=>assertMarsTextureManifest(manifest()));
  const rights=manifest();rights.source.rightsUrl="https://example.com/unknown";
  assert.throws(()=>assertMarsTextureManifest(rights),/manifest_invalid/u);
  const reversed=manifest();reversed.projection.longitude="positive-west";
  assert.throws(()=>assertMarsTextureManifest(reversed),/manifest_invalid/u);
  const remote=manifest();remote.image.downloadUrl="https://planetarymaps.usgs.gov/image.jpg";
  assert.throws(()=>assertMarsTextureManifest(remote),/manifest_invalid/u);
});
