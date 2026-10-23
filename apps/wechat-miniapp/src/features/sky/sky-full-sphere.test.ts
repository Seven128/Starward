import { skySceneTestFrame, skySceneTestCase, skySceneTestPorts, skySceneTestPickFacts } from "./sky-scene-test-support";
import assert from "node:assert/strict";
import test from "node:test";
import { drawSkyScene } from "./sky-scene-render";
import { resolveSkySceneFrame, type ResolvedSkyReport, type ResolvedStellarScene } from "./sky-stellar-scene";
import { createSkyViewBasis, projectSkyDirection } from "./sky-view-projection";
import { pickPaintedSkyObjects, type SkyPickSnapshot } from "./sky-object-picking";
import type { SkyRenderSurface } from "./sky-render-surface";
import { skyLandscapeViewOpacity, SKY_LANDSCAPE_BROWSE_OPACITY } from "./sky-landscape-visibility";
import { skyLandscapeMaskWithOpacity, skyLandscapeMaskCoversRayHull, skyLandscapeMaskOccludes,
  createSkyPanoramaMask } from "./sky-landscape-mask";
import { selectSkyLandscapeImageResources } from "./sky-landscape-resources";
import { unprojectSkyPoint, skyHorizontalDirection } from "./sky-view-projection";
import type { SkyLandscapeManifestData, SkyLandscapeResource } from "@starward/miniapp-contracts";
import type { SaoIndexPublication, SaoTilePublication } from "@starward/miniapp-contracts";
import { resolveSkyStellarSupplement, currentStellarSupplement } from "./sky-stellar-supplement-scene";
import { skyStarAppearance } from "./sky-star-appearance";
import { createSkyStarTransitions } from "./sky-star-transition";
import {skySceneFrameFacts} from './sky-scene-frame-facts';
import {createSkyDirectionProjector} from './sky-view-projection';
import {projectStellarMotion} from '@starward/astronomy-core/stellar-vectors';

const at = "2026-10-02T13:00:00.000Z";
const identity = { format: "bsc5p-stellar-geometry-v1", referenceAt: "2000-01-01T12:00:00.000Z",
  catalogVersion: "full-sphere-fixture", catalogHash: "a".repeat(64) };
const observer = { latitude: 0, longitude: 0, elevationM: 0 };
const scene = { format: "stellar-scene-v2", state: "AVAILABLE", observer,
  catalog: { ...identity, magnitudeLimit: 5, entries: [
    { sourceId: "HR:1", objectRef: "HR:1", displayName: "Below", magnitude: 1, colorIndex: null },
  ] },
  publication: { ...identity, rows: [["HR:1", "Below", 1, null, 0, Math.SQRT1_2, -Math.SQRT1_2, 0, 0, 0]] },
  frames: [{ at, state: "AVAILABLE", geometry: { ...identity, at, observer,
    julianYears: (Date.parse(at) - Date.parse(identity.referenceAt)) / (365.25 * 86400000),
    equatorialToEnu: [1, 0, 0, 0, 1, 0, 0, 0, 1] } }],
} as unknown as ResolvedStellarScene;
const report = { hourly: [{ at, sunAzimuthDeg: 270, sunAltitudeDeg: -24 }],
  skyScene: scene, targetFrames: [] } as unknown as ResolvedSkyReport;

test('BSC exact-time availability is lazy while complete points and later camera views retain the original result',()=>{
  let motions=0;
  const row=scene.publication!.rows[0]!;
  const localScene:ResolvedStellarScene={...scene,catalog:{...scene.catalog!,motionAt:()=>{
    motions++;return [row[4],row[5],row[6],row[7],row[8],row[9]];
  }}};
  const frame=resolveSkySceneFrame(localScene,at)!;
  assert.equal(frame.pointCount,1);
  assert.equal(skySceneFrameFacts(localScene,at).starCount,1);
  assert.equal(motions,0,'availability and full-count readback do not position offscreen stars');
  const out=createSkyDirectionProjector(createSkyViewBasis(180,135,0)!,390,844,10.8)!;
  const inside=createSkyDirectionProjector(createSkyViewBasis(0,45,0)!,390,844,10.8)!;
  const found:unknown[]=[];
  frame.forEachProjected!(out,7,(_index,point,projection)=>found.push({point,projection}));
  assert.equal(found.length,0);assert.equal(motions,1);
  frame.forEachProjected!(inside,7,(_index,point,projection)=>found.push({point,projection}));
  assert.equal(found.length,1);assert.equal(motions,1,'camera changes reuse this exact proper-motion ray');
  const expected=projectStellarMotion([row[4],row[5],row[6],row[7],row[8],row[9]],
    scene.frames[0]!.geometry!.julianYears,scene.frames[0]!.geometry!.equatorialToEnu);
  assert.deepEqual(frame.points,[[0,expected.azimuthDeg,expected.altitudeDeg]]);
  assert(Object.isFrozen(frame.points)&&Object.isFrozen(frame.points[0]));
  assert.equal(resolveSkySceneFrame(localScene,at),frame);
});

function render(altitude: number) {
  const basis = createSkyViewBasis(0, 90 + altitude, 0)!;
  let snapshot: SkyPickSnapshot | null = null;
  const discs: unknown[][] = [], lines: unknown[][] = [], landscape: unknown[][] = [];
  const surface = new Proxy({}, { get: (_target, key) => (...args: unknown[]) => {
    if (key === "disc") discs.push(args);
    if (key === "segments") lines.push(args);
    if (key === "landscape") landscape.push(args);
    return true;
  } }) as SkyRenderSurface;
  const sceneCase = skySceneTestCase({
      surface: surface, ports: {
          painted: (({ snapshot: value }) => { snapshot = value; })
      }, observation: {
          data: report, frameAt: at
      }, view: {
          heading: null, pose: null, mode: "NIGHT", verticalFovDeg: 270, manualBasis: basis
      }, canvas: {
          width: 390, height: 844
      }, layers: {
          landscape: {
              enabled: true
          }
      }
  });

  drawSkyScene(sceneCase.surface, skySceneTestFrame(sceneCase), skySceneTestPorts(sceneCase));
  assert(snapshot);
  return { snapshot: snapshot as SkyPickSnapshot, discs, lines, landscape,
    point: projectSkyDirection(0, -45, basis, 390, 844, 270)! };
}

test("the exact catalog frame retains a below-horizon star for full-sphere browsing", () => {
  const nextAt = "2026-10-02T14:00:00.000Z";
  const changingScene: ResolvedStellarScene = { ...scene, frames: [...scene.frames, {
    at: nextAt, state: "AVAILABLE", geometry: { ...scene.frames[0]!.geometry!, at: nextAt,
      julianYears: (Date.parse(nextAt) - Date.parse(identity.referenceAt)) / (365.25 * 86400000),
      equatorialToEnu: [1, 0, 0, 0, -1, 0, 0, 0, -1] },
  }] };
  const frame = resolveSkySceneFrame(changingScene, at)!;
  assert.equal(frame.points?.length, 1);
  assert.equal(frame.points![0]![2], -45);
  assert.equal(resolveSkySceneFrame(changingScene, at), frame, "gestures reuse the exact time transform");
  const direction = frame.displayDirection!(0)!;
  assert.equal(frame.displayDirection!(0), direction, "camera changes reuse the exact-time direction");
  assert.deepEqual(direction.vector, skyHorizontalDirection(0, -45));
  assert(Object.isFrozen(direction) && Object.isFrozen(direction.vector));
  const later = resolveSkySceneFrame(changingScene, nextAt)!;
  assert.equal(later.points[0]![2], 45);
  assert.notEqual(later.displayTransmission!(0), frame.displayTransmission!(0),
    "the new time cannot reuse the previous altitude's display factor");
  assert.notDeepEqual(later.displayDirection!(0), direction, "a time change must replace prepared projection inputs");
  const unattenuated = skyStarAppearance(1, 45, -24)!;
  for (const selected of [frame, later, resolveSkySceneFrame(changingScene, at)!]) {
    assert.deepEqual(selected.displayDirection!(0)!.vector,
      skyHorizontalDirection(selected.points[0]![1], selected.points[0]![2]));
    assert.equal(unattenuated.opacity * selected.displayTransmission!(0),
      skyStarAppearance(1, 45, -24, selected.points[0]![2])!.opacity,
      "forward and restored times retain the original appearance formula");
  }
  assert.equal(resolveSkySceneFrame(changingScene, "2026-10-02T15:00:00.000Z"), undefined);
});

test("the shared SAO tile transform retains the lower hemisphere and exact time identity", () => {
  // Geometry fixture exercises the admitted tile transform, not publication admission.
  const publication = { publicationHash: "b".repeat(64), index: { baseCatalogVersion: identity.catalogVersion,
    baseAssetSha256: identity.catalogHash, catalogHash: "c".repeat(64), catalogVersion: "sao-fixture" } } as unknown as SaoIndexPublication;
  const tile = { publicationHash: publication.publicationHash, tile: { catalogHash: publication.index.catalogHash,
    rows: [["SAO:1", 6.5, 0, Math.SQRT1_2, -Math.SQRT1_2, 0, 0, 0]] } } as unknown as SaoTilePublication;
  const frame = resolveSkyStellarSupplement(publication, [tile], scene, at)!;
  assert.deepEqual(frame.points, [["SAO:1", 6.5, 0, -45]]);
  assert.equal(currentStellarSupplement(frame, scene, at), frame);
  assert.equal(currentStellarSupplement(frame, scene, "2026-10-02T14:00:00.000Z"), null);
  const direction=frame.displayDirection!(0)!;
  assert.equal(frame.displayDirection!(0),direction,"camera changes reuse this exact frame's prepared ray");
  const nextAt="2026-10-02T14:00:00.000Z";
  const changingScene:ResolvedStellarScene={...scene,frames:[...scene.frames,{
    at:nextAt,state:"AVAILABLE",geometry:{...scene.frames[0]!.geometry!,at:nextAt,
      julianYears:(Date.parse(nextAt)-Date.parse(identity.referenceAt))/(365.25*86400000),
      equatorialToEnu:[1,0,0,0,-1,0,0,0,-1]},
  }]};
  const later=resolveSkyStellarSupplement(publication,[tile],changingScene,nextAt)!;
  assert.notDeepEqual(later.displayDirection!(0),direction);
  assert.notEqual(later.displayTransmission!(0),frame.displayTransmission!(0));
  for(const selected of [frame,later,resolveSkyStellarSupplement(publication,[tile],changingScene,at)!]){
    assert.deepEqual(selected.displayDirection!(0)!.vector,skyHorizontalDirection(selected.points[0]![2],selected.points[0]![3]));
    assert.equal(skyStarAppearance(6.5,10.8,-24)!.opacity*selected.displayTransmission!(0),
      skyStarAppearance(6.5,10.8,-24,selected.points[0]![3])!.opacity);
  }
  // Actual Scene must preserve both point geometry and the accepted identities
  // when a controlled/legacy frame has no optional display accessors.
  const {displayDirection,displayTransmission,...withoutMemo}=frame;
  for(const mode of ["NIGHT","OBSERVATION"] as const){
    const paint=(supplement:typeof frame)=>{
      const discs:unknown[][]=[];let snapshot:SkyPickSnapshot|null=null;
      const surface=new Proxy({}, {get:(_target,key)=>(...args:unknown[])=>{if(key==="disc")discs.push(args);return true;}}) as SkyRenderSurface;
      const input=skySceneTestFrame({
          observation: {
              data: report, frameAt: at, stellarSupplement: supplement
          }, view: {
              heading: null, pose: null, mode: mode, verticalFovDeg: 10.8, manualBasis: createSkyViewBasis(0, 45, 0)
          }, canvas: {
              width: 390, height: 844
          }, imagery: {
              infrared: null
          }
      });
      drawSkyScene(surface,input,{painted:result=>{assert.equal(result.identity,input.identity);
        assert.equal(result.snapshot?.identity,input.identity);assert.equal(result.identity.observation.stellarSupplement,supplement);snapshot=result.snapshot;}});
      return {discs,snapshot:skySceneTestPickFacts(snapshot)};
    };
    assert.deepEqual(paint(frame),paint(withoutMemo));
  }
});

test('SAO exact-time tiles keep lazy motion and identity across selected-tile aggregation',()=>{
  const publication={publicationHash:'d'.repeat(64),index:{baseCatalogVersion:identity.catalogVersion,
    baseAssetSha256:identity.catalogHash,catalogHash:'e'.repeat(64),catalogVersion:'sao-lazy-fixture'}} as unknown as SaoIndexPublication;
  let motions=0;
  const tile=(reference:string,east:number,north:number)=>{
    const row=[reference,6.5,east,north,-Math.SQRT1_2,0,0,0];
    Object.defineProperty(row,2,{get(){motions++;return east;}});
    return {publicationHash:publication.publicationHash,tile:{catalogHash:publication.index.catalogHash,rows:[row]}} as unknown as SaoTilePublication;
  };
  const first=tile('SAO:1',0,Math.SQRT1_2),second=tile('SAO:2',Math.SQRT1_2,0);
  const frame=resolveSkyStellarSupplement(publication,[first,second],scene,at)!;
  assert.equal(frame.pointCount,2);assert.equal(motions,0,'loaded row counts do not eagerly transform tile rows');
  const projector=createSkyDirectionProjector(createSkyViewBasis(0,90,0)!,390,844,270)!;
  const references:string[]=[];
  frame.forEachProjected!(projector,7,(_index,point)=>references.push(point[0]));
  assert.deepEqual(references,['SAO:1','SAO:2']);assert.equal(motions,2);
  const reordered=resolveSkyStellarSupplement(publication,[second,first],scene,at)!;
  const nextReferences:string[]=[];
  reordered.forEachProjected!(projector,7,(_index,point)=>nextReferences.push(point[0]));
  assert.deepEqual(nextReferences,['SAO:2','SAO:1']);assert.equal(motions,2,'unchanged geometry reuses only the same tile-local transform');
  assert.deepEqual(reordered.points,[frame.points[1],frame.points[0]],'legacy readers retain every point in selected-tile order');
});

test("below-horizon star is drawn and pickable after ground fades, then hidden on return", () => {
  for (const altitude of [-45, 30, -45]) {
    const result = render(altitude);
    assert.equal(result.discs.length, 1, "real catalog star is submitted even behind the foreground");
    assert.equal(result.lines.length, 0, "ordinary defaults submit no auxiliary circles");
    const choices = pickPaintedSkyObjects(result.snapshot, { ...result.point, frameAt: at,
      catalogVersion: result.snapshot.catalogVersion, catalogHash: result.snapshot.catalogHash });
    assert.equal(choices.some(object => object.reference === "HR:1"), altitude < 0);
  }
});

test("landscape pass and completed mask share the same continuous viewport-center fade", () => {
  const result = render(0);
  assert.equal(result.landscape.length, 1);
  const opacity = (result.snapshot.view!.landscape as { opacity?: number }).opacity;
  assert.equal(opacity, .5 + SKY_LANDSCAPE_BROWSE_OPACITY / 2);
  assert.equal(result.landscape[0]![4], opacity);
  const revealed = render(-45);
  assert(Math.abs(revealed.snapshot.view!.landscape!.opacity! - SKY_LANDSCAPE_BROWSE_OPACITY) < 1e-12);
  assert.equal(revealed.landscape.length, 1, "the ground cue still needs an actual foreground pass");
});

test("Scene draws fading real stars while keeping exiting and invalid-time remnants out of picking", () => {
  const stars = createSkyStarTransitions(), scope = { context: {}, at, mode: "NIGHT" };
  const dimScene = { ...scene, catalog: { ...scene.catalog!, entries: [{ ...scene.catalog!.entries[0]!, magnitude: 6.5 }] },
    publication: { ...scene.publication!, rows: [["HR:1", "Below", 6.5, null, 0, Math.SQRT1_2, -Math.SQRT1_2, 0, 0, 0]] } } as ResolvedStellarScene;
  const data = { ...report, skyScene: dimScene }, basis = createSkyViewBasis(0, 45, 0)!;
  const paint = (now: number, fov: number, valid = true) => {
    const values: number[] = []; let snapshot: SkyPickSnapshot | null = null;
    const transition = stars.prepare(scope, now);
    const surface = new Proxy({}, { get: (_target, key) => (...args: any[]) => {
      if (key === "disc" && args[6] === "star") values.push(args[4]);
      return true;
    } }) as SkyRenderSurface;
    const sceneCase = skySceneTestCase({
        surface: surface, ports: {
            painted: (({ snapshot: value }) => { snapshot = value; })
        }, observation: {
            data: data, frameAt: valid ? at : "missing-time"
        }, view: {
            heading: null, pose: null, mode: "NIGHT", verticalFovDeg: fov, manualBasis: basis
        }, canvas: {
            width: 390, height: 844
        }, work: {
            starTransitions: transition
        }
    });

    drawSkyScene(sceneCase.surface, skySceneTestFrame(sceneCase), skySceneTestPorts(sceneCase));
    transition.commit();
    return { values, snapshot: snapshot as SkyPickSnapshot | null, animating: transition.animating };
  };
  assert.deepEqual(paint(0, 45).values, []);
  const entering = paint(80, 45), settled = paint(160, 45);
  assert(entering.values[0]! > 0 && entering.values[0]! < settled.values[0]!);
  assert.equal(settled.snapshot?.objects[0]?.reference, "HR:1");
  const exiting = paint(1000, 270);
  assert(exiting.values[0]! > 0 && exiting.animating);
  assert.deepEqual(exiting.snapshot?.objects, [], "a visual exit cannot restore current pick eligibility");
  const invalid = paint(1040, 270, false);
  assert.deepEqual(invalid.values, []); assert.deepEqual(invalid.snapshot?.objects, []);
  assert.equal(invalid.animating, false);
});

test("fade follows the actual offset and rolled viewport centre and preserves physical alpha", () => {
  const view = { basis: createSkyViewBasis(20, 100, 35)!, verticalFovDeg: 85,
    center: { x: 180, y: 497 } };
  const ray = unprojectSkyPoint(195, 422, view.basis, 390, 844, 85, view.center)!;
  const altitude = Math.asin(ray[2]) * 180 / Math.PI;
  const centered = { basis: createSkyViewBasis(0, 90 + altitude, 0)!, verticalFovDeg: 45 };
  assert(Math.abs(skyLandscapeViewOpacity(view, 390, 844) - skyLandscapeViewOpacity(centered, 390, 844)) < 1e-12);
  assert.notEqual(skyLandscapeViewOpacity(view, 390, 844), skyLandscapeViewOpacity(
    { basis: view.basis, verticalFovDeg: view.verticalFovDeg }, 390, 844));
  const publication = { projection: { seamAzimuthDeg: 0 } } as SkyLandscapeManifestData;
  const resource = { id: "overview", image: { width: 8, height: 8 } } as SkyLandscapeResource;
  const mask = createSkyPanoramaMask(publication, resource, new Uint8Array(64).fill(255));
  const behind = skyHorizontalDirection(0, -45)!;
  assert(skyLandscapeMaskOccludes(mask, behind));
  assert(skyLandscapeMaskCoversRayHull(mask, [behind]));
  const partial = skyLandscapeMaskWithOpacity(mask, .5);
  assert.equal(skyLandscapeMaskOccludes(partial, behind), false);
  assert.equal(skyLandscapeMaskCoversRayHull(partial, [behind]), false);
  assert.equal((partial as typeof mask).alpha, mask.alpha, "camera adaptation cannot mutate source coverage");
  const footprint = { view: { basis: createSkyViewBasis(0, 45, 0)!, verticalFovDeg: 45 }, width: 390, height: 844 };
  assert.deepEqual(selectSkyLandscapeImageResources([resource], new Map([[resource.id, mask]]), footprint), [resource],
    "looking below the horizon still needs the grey foreground cue");
  assert.deepEqual(selectSkyLandscapeImageResources([resource], new Map([[resource.id, mask]]), null), [resource]);
});
