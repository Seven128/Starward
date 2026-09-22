import assert from "node:assert/strict";
import test from "node:test";
import { loadConstellationCatalog } from "@starward/astronomy-core/constellation-catalog";
import { assertConstellationCatalog, STELLAR_GEOMETRY_FORMAT, STELLAR_GEOMETRY_REFERENCE_AT, STELLAR_SCENE_FORMAT, type SkyScene } from "@starward/miniapp-contracts";
import { resolveConstellationFrame } from "./sky-constellation-scene.ts";
import { skyArtworkUvAtDirection } from "./sky-artwork-registration.ts";

const loaded=loadConstellationCatalog(),catalog={...loaded.data as object,catalogHash:loaded.catalogHash};
assertConstellationCatalog(catalog);
const reference={catalogVersion:'bsc5p-bright-stars.v2',catalogHash:'1'.repeat(64)};
const at='2000-01-01T12:00:00.000Z';
const observer={latitude:22.6,longitude:114.5,elevationM:30};
function scene():SkyScene {
  return {format:STELLAR_SCENE_FORMAT,state:'AVAILABLE',observer,catalog:{...reference,magnitudeLimit:6.5,rowCount:8404,sources:[]},unavailableReason:null,
    frames:[{at,state:'AVAILABLE',geometry:{...reference,format:STELLAR_GEOMETRY_FORMAT,referenceAt:STELLAR_GEOMETRY_REFERENCE_AT,
      at,observer,julianYears:0,equatorialToEnu:[1,0,0,0,1,0,0,0,1]}}]};
}

test("constellation geometry uses the replacement J2000 epoch, preserves shared artwork and excludes no below-horizon anchors",()=>{
  const report=scene(),frame=resolveConstellationFrame(catalog,report,at)!;
  assert.ok(frame);assert.equal(frame.lines.length,676);assert.equal(frame.images.length,85);
  assert.strictEqual(resolveConstellationFrame(catalog,report,at),frame);
  for(const id of ['Tel','Tau','Car','Oph'])assert.ok(frame.images.some(a=>a.source.id===id));
  // Independent scalar proper-motion expectation for each real image anchor at
  // J2000: source and observation coincide; retaining the old 8.75 offset fails.
  for(const image of frame.images) for(const anchor of image.source.anchors){
    const row=catalog.stars.find(s=>s[0]===anchor.hip)!;
    const ra=row[1]*Math.PI/180,dec=row[2]*Math.PI/180,unit=Math.PI/(180*3600*1000);
    const east=0,north=0;
    const vector=[Math.cos(dec)*Math.cos(ra)-east*Math.sin(ra)-north*Math.sin(dec)*Math.cos(ra),
      Math.cos(dec)*Math.sin(ra)+east*Math.cos(ra)-north*Math.sin(dec)*Math.sin(ra),Math.sin(dec)+north*Math.cos(dec)];
    const length=Math.hypot(...vector),ray=vector.map(n=>n/length) as [number,number,number];
    const uv=skyArtworkUvAtDirection(image.registration,ray)!;
    assert.ok(Math.abs(uv[0]*image.source.width-anchor.pixel[0])<1e-6);
    assert.ok(Math.abs(uv[1]*image.source.height-anchor.pixel[1])<1e-6);
  }
  assert.throws(()=>{(frame.lines[0]![0] as unknown as number[])[0]=1;},TypeError);
});

test("missing or mismatched observer/time never draws an old constellation frame",()=>{
  const report=scene();assert.ok(resolveConstellationFrame(catalog,report,at));
  assert.equal(resolveConstellationFrame(catalog,report,'2000-01-01T13:00:00.000Z'),null);
  const moved=structuredClone(report);moved.observer={...moved.observer!,longitude:115.5};
  assert.ok(resolveConstellationFrame(catalog,moved,at) === null,"reject previous place frame");
  const broken=structuredClone(report);broken.frames[0]!.geometry!.catalogHash='2'.repeat(64);
  assert.equal(resolveConstellationFrame(catalog,broken,at),null);
  assert.equal(resolveConstellationFrame(undefined,report,at),null);
});
