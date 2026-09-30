import assert from "node:assert/strict";
import test from "node:test";
import {assertMercuryTextureManifest} from "./mercury-texture-publication";

const hash="a".repeat(64),file="mercury-messenger-2013-usgs-wms-1024x512.jpg";
const record="https://astrogeology.usgs.gov/search/map/mercury_messenger_mdis_global_mosaic_250m";
const manifest=()=>({
  schemaVersion:"starward-messenger-mercury-v1",publicationId:"mercury-test",publicationHash:hash,
  source:{title:"Mercury MESSENGER MDIS Global Mosaic 250m",provider:"USGS Astrogeology Science Center",
    recordUrl:record,rightsUrl:record,credit:"MESSENGER Team",
    wmsUrl:"https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/mercury/mercury_simp_cyl.map&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=MESSENGER_May2013&STYLES=&SRS=EPSG:4326&BBOX=-180,-90,180,90&WIDTH=1024&HEIGHT=512&FORMAT=image/jpeg&TRANSPARENT=FALSE"},
  projection:{kind:"simple-cylindrical",latitude:"planetocentric",longitude:"positive-east",bboxDeg:[-180,-90,180,90]},
  image:{file,sha256:"b782316d7458df90198d8e9664abb3902841c0709085bd20f03e46706a252d81",
    bytes:89984,width:1024,height:512,downloadUrl:`/v2/sky/mercury/${hash}/${file}`},
  processing:"USGS WMS resample",limitations:["historical monochrome map","not calibrated visual photometry"],
});

test("Mercury manifest rejects altered rights, coordinates and remote images",()=>{
  assert.doesNotThrow(()=>assertMercuryTextureManifest(manifest()));
  const rights=manifest();rights.source.rightsUrl="https://example.com/unknown";
  assert.throws(()=>assertMercuryTextureManifest(rights),/manifest_invalid/u);
  const reversed=manifest();reversed.projection.longitude="positive-west";
  assert.throws(()=>assertMercuryTextureManifest(reversed),/manifest_invalid/u);
  const remote=manifest();remote.image.downloadUrl="https://planetarymaps.usgs.gov/image.jpg";
  assert.throws(()=>assertMercuryTextureManifest(remote),/manifest_invalid/u);
});
