import { skySceneTestFrame, skySceneTestCase, skySceneTestPorts, skySceneTestPickFacts } from "./sky-scene-test-support";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import type { ApiEnvelope, CelestialObjectPositionData, SaoIndexPublication, SkyGeometryReport, SkyReport, StellarGeometryFrame, StellarCatalogPublication } from "@starward/miniapp-contracts";
import { saoCatalogSource } from "../../../../../workers/miniapp-api/src/sao-catalog-source";
import { createStellarCatalogClient } from "../../services/stellar-catalog-client";
import { createSaoCatalogClient } from "../../services/sao-catalog-client";
import { attachSkyCatalog, resolveSkySceneFrame, isReusableSkyStellarFrame, type ResolvedSkyReport } from "./sky-stellar-scene";
import { resolveSkyStellarSupplement, isReusableSkyStellarSupplementFrame, type SkyStellarSupplementFrame } from "./sky-stellar-supplement-scene";
import { createSkyStarDrawPreparation } from "./sky-star-draw-preparation";
import { createSkyStarTransitions } from "./sky-star-transition";
import { createSkyViewBasis, type SkyViewBasis } from "./sky-view-projection";
import { selectSkyStellarTiles } from "./sky-stellar-tile-selection";
import { skyPresentationPosition } from "./sky-presentation-position";
import { presentSkyTime } from "./sky-time-presentation";
import { drawSkyScene } from "./sky-scene-render";
import { projectStellarMotion } from "@starward/astronomy-core/stellar-vectors";
import type { SkyPickSnapshot } from "./sky-object-picking";
import type { SkyRenderSurface } from "./sky-render-surface";

// The same full BSC v3 and admitted SAO v2 inputs used by the bounded r20
// comparison. These tests execute the complete Scene and its actual surface
// commands/picking boundary; they do not assert device timing or native pixels.
const width=384,height=796.800048828125,verticalFovDeg=264.3550889449854;
const basis=createSkyViewBasis(0,180,0)!;
const observer={latitude:22.6,longitude:114.5,elevationM:30};
// Keep producer-only astronomy and its server TS configuration out of the
// Mini Program compilation, as the existing sky-time fixture already does.
const {envelope,geometries}=JSON.parse(execFileSync(process.execPath,["--import","tsx","--input-type=module","-e",`
  import {loadBsc5pStarCatalog,bsc5pHorizontalFrame} from '@starward/astronomy-core/bsc5p-catalog';
  import {StellarCatalogPublicationService} from './src/stellar-catalog-publication.ts';
  const owner=loadBsc5pStarCatalog('bsc5p-bright-stars.v3');
  const dates=['2026-09-17T23:59:00.000Z','2026-09-16T23:59:00.000Z'];
  process.stdout.write(JSON.stringify({envelope:new StellarCatalogPublicationService().get(owner),
    geometries:Object.fromEntries(dates.map(at=>[at,bsc5pHorizontalFrame({latitude:22.6,longitude:114.5,elevationM:30,at})]))}));
`],{cwd:fileURLToPath(new URL("../../../../../workers/miniapp-api/",import.meta.url)),encoding:"utf8",timeout:30_000,
  maxBuffer:4*1024*1024,stdio:["ignore","pipe","pipe"]})) as {
    envelope:ApiEnvelope<StellarCatalogPublication>;geometries:Record<string,Pick<StellarGeometryFrame,"at"|"julianYears"|"equatorialToEnu">>};
const owner={catalogVersion:envelope.data.catalogVersion,catalogHash:envelope.data.catalogHash};
const bscClient=createStellarCatalogClient({request:async()=>structuredClone(envelope),invalidate(){assert.fail();}});
const publication=(await bscClient(owner)).data;
const root=new URL("../../../../../workers/miniapp-api/assets/sao-v2/",import.meta.url);
const index=JSON.parse(readFileSync(new URL("index.json",root),"utf8"));
const manifest=JSON.parse(readFileSync(new URL("publication.json",root),"utf8"));
const indexEnvelope={apiVersion:"v2",data:{publicationHash:manifest.publicationHash,index},dataState:"FRESH",
  generatedAt:"2026-10-03T13:00:00.000Z",validAt:null,sources:[saoCatalogSource(index)],warnings:[],etag:"fixture",requestId:"fixture"} as ApiEnvelope<SaoIndexPublication>;
const saoClient=createSaoCatalogClient({index:async()=>indexEnvelope,tile:async()=>{assert.fail();},
  fileTile:async(_publication,tile)=>JSON.parse(readFileSync(new URL(tile.file,root),"utf8")),
  invalidateIndex(){assert.fail();},invalidateTile(){assert.fail();}});
const saoPublication=(await saoClient.getIndex()).data;
const scope={spotId:"r20-local",contextId:"exact-star-draw",contextRevision:1,contextFingerprint:"scope",dataRevision:"fixture",algorithmVersion:"fixture"};
function freezeGeometry(geometry:StellarGeometryFrame) {
  Object.freeze(geometry.observer);Object.freeze(geometry.equatorialToEnu);return Object.freeze(geometry);
}
function report(at:string,catalog=publication,immutable=true):ResolvedSkyReport {
  const geometry:StellarGeometryFrame={format:"bsc5p-stellar-geometry-v1",referenceAt:"2000-01-01T12:00:00.000Z",
    catalogVersion:catalog.catalogVersion,catalogHash:catalog.catalogHash,observer:{...observer},...structuredClone(geometries[at]!)};
  if(immutable)freezeGeometry(geometry);
  return attachSkyCatalog({context:scope,hourly:[{at,sunAzimuthDeg:270,sunAltitudeDeg:-24}],targetFrames:[],
    skyScene:{state:"AVAILABLE",catalog:{catalogVersion:catalog.catalogVersion,catalogHash:catalog.catalogHash},
      observer:{...observer},frames:[{at,state:"AVAILABLE",geometry}]}} as unknown as SkyGeometryReport,catalog);
}
const a=report("2026-09-17T23:59:00.000Z"),b=report("2026-09-16T23:59:00.000Z");
const selected=selectSkyStellarTiles(saoPublication.index.tiles,{frame:a.skyScene.frames[0]!.geometry!,
  expected:{catalog:publication,at:a.hourly[0]!.at,observer},basis,width,height,verticalFovDeg,sunAltitudeDeg:-24,mode:"NIGHT"});
const tiles=await Promise.all(selected.map(tile=>saoClient.getTile(saoPublication,tile.id).then(value=>value.data)));
const extra=resolveSkyStellarSupplement(saoPublication,tiles,a.skyScene,a.hourly[0]!.at)!;
assert.equal(publication.rows.length,8404);assert(selected.length>100&&extra.pointCount!>2000);
assert(isReusableSkyStellarFrame(resolveSkySceneFrame(a.skyScene,a.hourly[0]!.at)!));
assert(isReusableSkyStellarSupplementFrame(extra));

test("a loaded SAO pick uses its admitted exact frame without a remote position anchor",()=>{
  const row=tiles[0]!.tile.rows[0]!,at=a.hourly[0]!.at,geometry=a.skyScene.frames[0]!.geometry!;
  const catalog={catalogVersion:saoPublication.index.catalogVersion,catalogHash:saoPublication.index.catalogHash};
  const binding={...a.context,at,reference:row[0]};
  const presentation={source:{...envelope,data:a as unknown as SkyReport},rendered:a,anchorAt:at,stellarSupplement:extra};
  const expected=projectStellarMotion([row[2],row[3],row[4],row[5],row[6],row[7]],geometry.julianYears,geometry.equatorialToEnu);
  assert.deepEqual(skyPresentationPosition(binding,catalog,presentation),
    {...binding,position:{...expected,...catalog},unavailableReason:null});
  const anchor:ApiEnvelope<CelestialObjectPositionData>={...envelope,data:{...binding,position:{...expected,...catalog},unavailableReason:null,
    stellarMotion:{referenceAt:"2000-01-01T12:00:00.000Z",factors:[row[2],row[3],row[4],row[5],row[6],row[7]]}}};
  const remoteOnly={...presentation,stellarSupplement:null};
  assert.deepEqual(skyPresentationPosition(binding,catalog,remoteOnly,anchor),
    {...binding,position:{...expected,...catalog},unavailableReason:null},"unloaded objects retain the bound remote motion path");
  const differentRevision={...anchor,data:{...anchor.data,dataRevision:"different-report"}};
  assert.equal(skyPresentationPosition(binding,catalog,remoteOnly,differentRevision),null);
  assert.deepEqual(skyPresentationPosition(binding,catalog,presentation,differentRevision),
    {...binding,position:{...expected,...catalog},unavailableReason:null},"loaded geometry does not borrow a mismatched remote revision");
  assert.equal(skyPresentationPosition({...binding,contextRevision:binding.contextRevision+1},catalog,presentation),null);
  assert.equal(skyPresentationPosition(binding,{...catalog,catalogHash:"wrong"},presentation),null);
  for(const stellarSupplement of [null,{...extra},
    resolveSkyStellarSupplement(saoPublication,tiles,b.skyScene,b.hourly[0]!.at),
    resolveSkyStellarSupplement(saoPublication,tiles.slice(1),a.skyScene,at),
    resolveSkyStellarSupplement(saoPublication,tiles,report(at).skyScene,at)]) {
    assert.equal(skyPresentationPosition(binding,catalog,{...presentation,stellarSupplement}),null,
      "missing, copied, stale, withdrawn or another exact-frame identity cannot supply the selected position");
  }
});

test("a loaded SAO position is available on an exact provider row before Play",()=>{
  const at=a.hourly[0]!.at,provided=report(at,publication,false);
  const exact=presentSkyTime(provided as unknown as SkyReport,at)!;
  assert.equal(exact.mode,"EXACT");
  const rendered=attachSkyCatalog(exact.report,publication);
  const stellarSupplement=resolveSkyStellarSupplement(saoPublication,tiles,rendered.skyScene,at)!;
  assert.equal(isReusableSkyStellarSupplementFrame(stellarSupplement),false,
    "an unfrozen provider row is valid geometry but cannot reuse prepared drawing");
  const row=tiles[0]!.tile.rows[0]!,geometry=rendered.skyScene.frames[0]!.geometry!;
  const catalog={catalogVersion:saoPublication.index.catalogVersion,catalogHash:saoPublication.index.catalogHash};
  const binding={...rendered.context,at,reference:row[0]};
  const position=projectStellarMotion([row[2],row[3],row[4],row[5],row[6],row[7]],geometry.julianYears,geometry.equatorialToEnu);
  assert.deepEqual(skyPresentationPosition(binding,catalog,
    {source:{...envelope,data:provided as unknown as SkyReport},rendered,anchorAt:at,stellarSupplement}),
    {...binding,position:{...position,...catalog},unavailableReason:null});
  for(const invalid of [{...stellarSupplement},
    resolveSkyStellarSupplement(structuredClone(saoPublication),tiles,rendered.skyScene,at),
    resolveSkyStellarSupplement(saoPublication,[structuredClone(tiles[0]!)],rendered.skyScene,at)]) {
    assert.equal(skyPresentationPosition(binding,catalog,
      {source:{...envelope,data:provided as unknown as SkyReport},rendered,anchorAt:at,stellarSupplement:invalid}),null,
      "copied frames or catalogue deliveries cannot certify a position");
  }
});

test("frame-local motion scratch preserves every full BSC and loaded SAO position across exact times",()=>{
  const first=resolveSkySceneFrame(a.skyScene,a.hourly[0]!.at)!;
  const retainedFirst=first.points[0]!,retainedValue=[...retainedFirst];
  for(const data of [a,b]) {
    const at=data.hourly[0]!.at,geometry=data.skyScene.frames[0]!.geometry!;
    const actual=resolveSkySceneFrame(data.skyScene,at)!.points;
    assert.equal(actual.length,publication.rows.length);
    publication.rows.forEach((row,index)=>{
      const position=projectStellarMotion([row[4],row[5],row[6],row[7],row[8],row[9]],geometry.julianYears,geometry.equatorialToEnu);
      assert.deepEqual(actual[index],[index,position.azimuthDeg,position.altitudeDeg]);
    });
    const supplement=resolveSkyStellarSupplement(saoPublication,tiles,data.skyScene,at)!;
    let index=0;
    for(const tile of tiles)for(const row of tile.tile.rows) {
      const position=projectStellarMotion([row[2],row[3],row[4],row[5],row[6],row[7]],geometry.julianYears,geometry.equatorialToEnu);
      assert.deepEqual(supplement.points[index++],[row[0],row[1],position.azimuthDeg,position.altitudeDeg]);
    }
    assert.equal(index,supplement.pointCount);
  }
  assert.equal(first.points[0],retainedFirst);
  assert.deepEqual(retainedFirst,retainedValue,"later rows and frames cannot overwrite an earlier accepted point");
});

type Settings={basis?:SkyViewBasis;width?:number;height?:number;fov?:number;center?:{x:number;y:number};
  mode?:"DAY"|"NIGHT"|"OBSERVATION";reduced?:boolean;paused?:boolean;commit?:boolean;
  extra?:SkyStellarSupplementFrame|null;landscape?:boolean;failFinish?:boolean};
function harness(cached:boolean) {
  const drawing=createSkyStarDrawPreparation(),transitions=createSkyStarTransitions();
  const builds={catalog:0,supplement:0};let failedBuild=false,failFinish=false;
  for(const name of ["catalog","supplement"] as const){
    const original=drawing[name];
    (drawing[name] as any)=(...args:any[])=>{
      const offset=name==="catalog"?2:1,build=args[offset];
      args[offset]=(visit:any)=>{builds[name]++;if(failedBuild)throw Error("controlled_prepare_failure");build(visit);};
      return (original as any)(...args);
    };
  }
  let commands:unknown[][]=[];
  const newSurface=()=>new Proxy({}, {get:(_target,key)=>(...args:unknown[])=>{
    if(key==="finish"&&failFinish)throw Error("controlled_copy_failure");
    // Record every actual Scene command. Functions are callback ports, not
    // submitted facts; input here uses no native image resources.
    commands.push([key,...args.map(value=>typeof value==="function"?"callback":value)]);return true;
  }}) as SkyRenderSurface;
  let surface=newSurface();
  function render(data:ResolvedSkyReport|undefined,now:number,settings:Settings={}) {
    commands=[];failFinish=settings.failFinish??false;
    const at=data?.hourly[0]?.at,mode=settings.mode??"NIGHT";
    const transition=transitions.prepare({context:data?.context,at,mode},now,settings.reduced,settings.paused);
    let snapshot:SkyPickSnapshot|null=null,complete=0;
    const sceneCase = skySceneTestCase({
        surface: surface, ports: {
            painted: (({ snapshot: value }) => { snapshot = value; }), completed: () => complete++
        }, observation: {
            data: data, frameAt: at, stellarSupplement: settings.extra ?? null
        }, view: {
            heading: null, pose: null, mode: mode, verticalFovDeg: settings.fov ?? verticalFovDeg, manualBasis: settings.basis ?? basis
        }, canvas: {
            width: settings.width ?? width, height: settings.height ?? height
        }, layers: {
            landscape: {
                enabled: settings.landscape ?? true
            }
        }, work: {
            starTransitions: transition
        }
    });

    if(settings.center)sceneCase.view.center=settings.center;
    if(cached)sceneCase.work.starDrawing=drawing;
    const input=skySceneTestFrame(sceneCase);
    drawSkyScene(sceneCase.surface, input, skySceneTestPorts(sceneCase));
    const receipt=snapshot as SkyPickSnapshot|null;
    if(receipt){assert.equal(receipt.identity,input.identity);assert.equal(receipt.identity?.observation.data,data);
      assert.equal(receipt.identity?.observation.stellarSupplement,settings.extra??null);}
    if(settings.commit!==false)assert(transition.commit());
    return {commands:structuredClone(commands),snapshot:skySceneTestPickFacts(receipt),
      animating:transition.animating,complete};
  }
  return {drawing,transitions,builds,render,replaceSurface(){surface=newSurface();},failBuild(value:boolean){failedBuild=value;}};
}

test("full BSC plus actual SAO Scene output stays exact while continuation reuses only preparation",()=>{
  const baseline=harness(false),candidate=harness(true);
  let submitted=0,picked=0,named=0;
  for(const now of [0,40,80,120,160,200]) {
    const settings={extra,commit:now!==120};
    const before=baseline.render(a,now,settings),after=candidate.render(a,now,settings);
    assert.deepEqual(after,before);
    submitted+=after.commands.filter(command=>command[0]==="disc"&&command[7]==="star").length;
    picked+=after.snapshot!.objects.length;named+=after.snapshot!.namedStars!.length;
  }
  assert(submitted>20_000&&picked>15_000&&named>0);
  assert.equal(candidate.builds.catalog,1);assert.equal(candidate.builds.supplement,1);
  const all=candidate.render(a,240,{extra,reduced:true,landscape:false});
  assert(all.snapshot!.objects.some(point=>point.reference.startsWith("SAO:")));
  assert(all.snapshot!.objects.some(point=>point.reference.startsWith("HR:")));
  assert.equal(candidate.builds.catalog,1,"landscape has its own final occlusion, not cached point eligibility");
  assert.equal(candidate.builds.supplement,1);
  assert.deepEqual(all,baseline.render(a,240,{extra,reduced:true,landscape:false}));
  for(const settings of [{extra,paused:true},{extra,reduced:true}])
    assert.deepEqual(candidate.render(a,280,settings),baseline.render(a,280,settings));
});

test("exact camera, projection, solar, mode, scope, time and Canvas changes cannot reuse old points",()=>{
  const baseline=harness(false),candidate=harness(true);let now=0;
  const cases:Array<[ResolvedSkyReport,Settings]>=[
    [a,{extra}], [a,{extra,basis:createSkyViewBasis(0.0000000001,180,0)!}],
    [a,{extra,center:{x:width/2+1e-10,y:height/2}}], [a,{extra,fov:verticalFovDeg+1e-10}],
    [a,{extra,width:width+1e-10}], [a,{extra,height:height+1e-10}],
    [a,{extra,mode:"OBSERVATION"}],
    [{...a,hourly:[{...a.hourly[0]!,sunAltitudeDeg:-10}]},{extra}],
    [{...a,hourly:[{...a.hourly[0]!,sunAltitudeDeg:null as any}]},{extra}],
    [{...a,context:{...a.context,contextRevision:2}},{extra}],
    [b,{extra:resolveSkyStellarSupplement(saoPublication,tiles,b.skyScene,b.hourly[0]!.at)}], [a,{extra}],
  ];
  for(const [data,settings] of cases){now+=200;assert.deepEqual(candidate.render(data,now,settings),baseline.render(data,now,settings));}
  assert.equal(candidate.builds.catalog,cases.length);assert.equal(candidate.builds.supplement,cases.length);
  // Even a caller retaining this owner cannot reuse a predecessor renderer's
  // preparation. Normal production additionally resets at releaseContext.
  candidate.replaceSurface();baseline.replaceSurface();
  assert.deepEqual(candidate.render(a,now+200,{extra}),baseline.render(a,now+200,{extra}));
  assert.equal(candidate.builds.catalog,cases.length+1);
});

test("independent source arrival/withdrawal and same-time source replacement use current admitted facts",async()=>{
  const baseline=harness(false),candidate=harness(true);let now=0;
  const compare=(data:ResolvedSkyReport,extra:SkyStellarSupplementFrame|null)=>{
    now+=200;assert.deepEqual(candidate.render(data,now,{extra}),baseline.render(data,now,{extra}));
  };
  compare(a,null);
  compare(a,resolveSkyStellarSupplement(saoPublication,tiles.slice(0,40),a.skyScene,a.hourly[0]!.at));
  compare(a,extra);assert.equal(candidate.builds.catalog,1);assert.equal(candidate.builds.supplement,3);
  compare(a,null);compare(a,extra);assert.equal(candidate.builds.supplement,5);
  const next=(await saoClient.getIndex()).data;
  compare(a,resolveSkyStellarSupplement(next,tiles,a.skyScene,a.hourly[0]!.at));assert.equal(candidate.builds.catalog,1);
  const replacement=(await bscClient(owner)).data;
  const changed=attachSkyCatalog(a,replacement);
  compare(changed,extra);assert.equal(candidate.builds.catalog,2);
  const missing={...a,skyScene:{...a.skyScene,state:"UNAVAILABLE" as const,catalog:null}};
  compare(missing,null);compare(a,extra);assert.equal(candidate.builds.catalog,4,"missing source retires the corresponding preparation");
  const changedGeometry={...a,skyScene:{...a.skyScene,frames:[{...a.skyScene.frames[0]!}]}};
  const at=a.hourly[0]!.at,first=resolveSkySceneFrame(changedGeometry.skyScene,at)!;
  const original=changedGeometry.skyScene.frames[0]!.geometry!;
  changedGeometry.skyScene.frames[0]!.geometry=freezeGeometry(structuredClone(original));
  const second=resolveSkySceneFrame(changedGeometry.skyScene,at)!;assert.notEqual(second,first);
  compare(changedGeometry,null);
  changedGeometry.skyScene.frames[0]!.geometry=original;
  assert.notEqual(resolveSkySceneFrame(changedGeometry.skyScene,at),first,"same-time A -> B -> A has only the current resolved input");
  compare(changedGeometry,null);assert.equal(candidate.builds.catalog,6);
});

test("mutable/legacy inputs, failed construction and explicit reset never revive cached A",()=>{
  const baseline=harness(false),candidate=harness(true);
  const mutable=report(a.hourly[0]!.at,publication,false);
  const legacy=report(a.hourly[0]!.at,structuredClone(publication));
  for(const data of [mutable,legacy]){
    const frame=resolveSkySceneFrame(data.skyScene,data.hourly[0]!.at)!;assert(!isReusableSkyStellarFrame(frame));
    const before=candidate.builds.catalog;
    for(const now of [0,200])assert.deepEqual(candidate.render(data,now),baseline.render(data,now));
    assert.equal(candidate.builds.catalog,before+2);
  }
  candidate.render(a,400,{extra});const before=candidate.builds.catalog;
  candidate.failBuild(true);assert.throws(()=>candidate.render(b,600),/controlled_prepare_failure/);
  candidate.failBuild(false);candidate.render(a,800,{extra});assert.equal(candidate.builds.catalog,before+2);
  candidate.drawing.reset();candidate.render(a,1000,{extra});assert.equal(candidate.builds.catalog,before+3);
  candidate.render(undefined,1200);candidate.render(a,1400,{extra});assert.equal(candidate.builds.catalog,before+4);
});

test("actual page suspend, invalidation and retirement clear preparation; rejected fade still cannot commit",()=>{
  const parsed=ts.createSourceFile("page.tsx",readFileSync(new URL("./spot-sky-page.tsx",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const callbacks=new Map<string,ts.Expression>();
  const find=(node:ts.Node)=>{if(ts.isPropertyAssignment(node)&&["suspended","invalidated","releaseContext"].includes(node.name.getText(parsed)))
    callbacks.set(node.name.getText(parsed),node.initializer);ts.forEachChild(node,find);};find(parsed);
  const h=harness(true);h.render(a,0,{extra});
  const pending=h.transitions.prepare({context:a.context,at:a.hourly[0]!.at,mode:"NIGHT"},80);
  pending.layer("catalog",a.skyScene.catalog).point({reference:"HR:1",displayName:"one",kind:"STAR",magnitude:1,
    azimuthDeg:0,altitudeDeg:50,radiusPx:1,color:"#FFFFFF",opacity:1,named:true});
  const bindings={starDrawing:h.drawing,starTransitions:h.transitions,readyImages:{reset(){}},nameLayouts:{reset(){}},
    canvasSurfaceRef:{current:null},pendingSkyPaintRef:{current:null},paintedSkyObjectsRef:{current:null},
    canvasDisplayRef:{current:null},canvasNodeRef:{current:null},canvasGlRef:{current:null},canvasGenerationRef:{current:1},
    canvasFrameClock:{resetFailures(){}},setPresentedSkyFrame(){},setCanvasSize(){}};
  for(const name of ["suspended","invalidated","releaseContext"]){
    const before=h.builds.catalog,expression=callbacks.get(name);assert(expression);
    if(name==="invalidated")assert.throws(()=>h.render(a,200,{extra,failFinish:true}),/controlled_copy_failure/);
    const run=vm.runInNewContext(ts.transpileModule(`(${expression.getText(parsed)})`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,bindings);
    run({dispose(){}});h.render(a,200,{extra});assert.equal(h.builds.catalog,before+1);
  }
  assert.equal(pending.commit(),false);
});
