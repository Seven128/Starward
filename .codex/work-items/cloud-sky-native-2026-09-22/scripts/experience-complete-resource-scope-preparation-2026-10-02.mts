/** Read-only geometry/data preflight. This script never imports a browser, Hook,
 * GPU owner or network client. It prepares a proposed measurement, not a frame. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createSkyViewBasis,createSkyDirectionProjector} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection.ts';
import {resolveConstellationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-scene.ts';
import {resolveSkySceneFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-scene.ts';
import {constellationVisibility} from '../../../../apps/wechat-miniapp/src/features/sky/sky-constellation-visibility.ts';
import {artworkIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts';
import {skyMoonDiscAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-moon-disc.ts';
import {skySunDiscAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-sun-disc.ts';
import {skyPlanetDiscsAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-planet-disc.ts';
import {skySolarLightAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-solar-light.ts';
import {skyGalacticBandAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-galactic-band.ts';
import {exactSkyObservationFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-observation-frame.ts';
import {selectSkyHipsTiles} from '../../../../apps/wechat-miniapp/src/features/sky/sky-hips-tile-selection.ts';
import {skyHipsTileIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-hips-tile-mesh.ts';
import {skyLandscapeViewOpacity} from '../../../../apps/wechat-miniapp/src/features/sky/sky-landscape-visibility.ts';
import {createSkyPanoramaMask,skyPanoramaMaskIntersectsView} from '../../../../apps/wechat-miniapp/src/features/sky/sky-landscape-mask.ts';
import {decodeSkyLandscapeAlpha,assertSaoIndexPublication,assertSaoTilePublication} from '../../../../packages/miniapp-contracts/src/index.ts';
import {supplementGeometry} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-supplement-scene.ts';
import {selectSkyStellarTiles} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-selection.ts';
import {SKY_STELLAR_VIEW_BYTES} from '../../../../apps/wechat-miniapp/src/features/sky/sky-stellar-tile-loader.ts';
import {sdssOpticalLevelForFov} from '../../../../apps/wechat-miniapp/src/features/sky/sky-sdss-optical-selection.ts';
import {deepSkyImageLevelForFov} from '../../../../apps/wechat-miniapp/src/features/sky/sky-zoom.ts';
import {skyStarAppearance} from '../../../../apps/wechat-miniapp/src/features/sky/sky-star-appearance.ts';

const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const TASK='.codex/work-items/cloud-sky-native-2026-09-22/';
const S='apps/wechat-miniapp/src/features/sky/';
const hash=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const bindings=new Map<string,any>();
const binding=(p:string)=>{const b=fs.readFileSync(path.resolve(ROOT,p));const r={path:p,bytes:b.length,sha256:hash(b)};bindings.set(p,r);return r;};
const json=(p:string)=>{binding(p);return JSON.parse(fs.readFileSync(path.resolve(ROOT,p),'utf8'));};
let relative='output/complete-resource-scope-preparation-1002-r1';
for(let n=2;fs.existsSync(path.join(ROOT,relative));n++)relative=`output/complete-resource-scope-preparation-1002-r${n}`;
const out=path.join(ROOT,relative);fs.mkdirSync(out);
const scriptPath=path.relative(ROOT,fileURLToPath(import.meta.url)).replaceAll('\\','/');binding(scriptPath);
const sources=['spot-sky-page.tsx','sky-scene-render.ts','sky-render-surface.ts','sky-gpu-renderer.ts','sky-gpu-textures.ts',
 'sky-gpu-artwork-contributions.ts','sky-artwork-loader.ts','sky-artwork-request.ts','use-sky-artwork.ts',
 'use-sky-sdss-optical.ts','use-sky-moon-texture.ts','use-sky-wide-field-w3.ts','use-sky-galactic-image.ts','use-sky-landscape.ts',
 'use-sky-stellar-supplement.ts','sky-stellar-tile-loader.ts','sky-stellar-tile-selection.ts','sky-stellar-supplement-scene.ts',
 'sky-view-projection.ts','sky-stellar-scene.ts','sky-constellation-scene.ts','sky-constellation-visibility.ts','sky-artwork-visibility.ts',
 'sky-moon-disc.ts','sky-sun-disc.ts','sky-planet-disc.ts','sky-solar-light.ts','sky-galactic-band.ts','sky-observation-frame.ts',
 'sky-hips-tile-selection.ts','sky-hips-tile-mesh.ts','sky-landscape-visibility.ts','sky-landscape-mask.ts','sky-landscape-resources.ts',
 'sky-sdss-optical-selection.ts','sky-zoom.ts','sky-star-appearance.ts'].map(p=>S+p);
sources.push('apps/wechat-miniapp/src/services/sky-public-image-runtime.ts','apps/wechat-miniapp/src/services/sky-public-image-cache.ts');
for(const p of sources)binding(p);
const seedPath='output/playwright/cloud-sky-continuous-camera-resource-1002-r1/prepared-browser-context.json';
const seed=json(seedPath),report=seed.current,figures=seed.figures,at=seed.at;
assert.equal(at,report.context.at);
const hourly=report.hourly.find((r:any)=>r.at===at);assert(hourly);
const observerFrame=exactSkyObservationFrame(report,at);assert(observerFrame);
const constellations=resolveConstellationFrame(figures,report.skyScene,at);assert(constellations);
const width=390,height=844,center={x:width/2,y:height/2};
const moonPose={az:hourly.moonAzimuthDeg,alt:hourly.moonAltitudeDeg};
const deepFrame=report.skyScene.deepSky.frames.find((r:any)=>r.at===at);assert(deepFrame);
const point=(reference:string)=>{const i=report.skyScene.deepSky.catalog.entries.findIndex((e:any)=>e.objectRef===reference);
 const p=deepFrame.points.find((p:any)=>p[0]===i);assert(p,reference);return {az:p[1],alt:p[2]};};
const m51Pose=point('M:51');
const galaxyManifest=json('workers/miniapp-api/assets/deep-sky/galactic-2mass/manifest.json');
const wideManifest=json('workers/miniapp-api/assets/deep-sky/wide-field-w3/manifest.json');
const landscape=json('workers/miniapp-api/assets/landscape/manifest.json');
const masks=landscape.resources.map((r:any)=>{
 const encoded=json('workers/miniapp-api/assets/landscape/'+r.alpha.file);
 assert.equal(bindings.get('workers/miniapp-api/assets/landscape/'+r.alpha.file).sha256,r.alpha.sha256);
 return createSkyPanoramaMask(landscape,r,decodeSkyLandscapeAlpha(encoded,r));
});
const saoIndexPath='workers/miniapp-api/assets/sao-v2/index.json';
const saoIndex=json(saoIndexPath),saoManifest=json('workers/miniapp-api/assets/sao-v2/publication.json');
assert.equal(bindings.get(saoIndexPath).sha256,saoManifest.publicationHash);
assert.equal(bindings.get(saoIndexPath).bytes,saoManifest.indexBytes);
const sao={publicationHash:saoManifest.publicationHash,index:saoIndex};assertSaoIndexPublication(sao);
const geometry=supplementGeometry(sao,report.skyScene,at);assert(geometry);
const inventory=json('output/shared-resource-reading-1002-r1/result.json');
const imageByFile=new Map(inventory.images.map((i:any)=>[i.file,i]));
const admittedImages=new Map<string,any>();
const readImage=(file:string)=>{if(admittedImages.has(file))return admittedImages.get(file);const old=imageByFile.get(file) as any;assert(old,file);
 const b=binding(file);assert.equal(b.sha256,old.sha256);assert.equal(b.bytes,old.bytes);
 const r={...old,identityReadback:b};admittedImages.set(file,r);return r;};
const selected=json('output/playwright/cloud-sky-continuous-camera-resource-1002-r1/discovery-M-51.json');
const sdss=json('output/playwright/cloud-sky-continuous-camera-resource-1002-r1/sdss-M-51-manifest.json');
const moonManifest=json('workers/miniapp-api/assets/moon/coverage-manifest.json');
const actualSaoTiles=new Map<string,any>();
const conditions=[
 {name:'moon45-cold-and-warm',pose:moonPose,fov:45,wide:true,selected:null},
 {name:'moon85-w3-transition',pose:moonPose,fov:85,wide:true,selected:null},
 {name:'m51-overview-before-refinement',pose:m51Pose,fov:.2,wide:true,selected:'M:51'},
 {name:'m51-detail-held-failed-retry',pose:m51Pose,fov:.05,wide:true,selected:'M:51'},
 {name:'return-moon45',pose:moonPose,fov:45,wide:true,selected:null},
];
const rows=conditions.map(c=>{
 const basis=createSkyViewBasis(c.pose.az,90+c.pose.alt,0);assert(basis);const view={basis,verticalFovDeg:c.fov,center};
 const projected=createSkyDirectionProjector(basis,width,height,c.fov,center);assert(projected);
 const art=constellationVisibility(c.fov,true)>0?constellations.images.filter(i=>artworkIntersectsView(i.registration,view,width,height)):[];
 for(const i of art)readImage('workers/miniapp-api/assets/constellations/'+i.source.file);
 const sun=skySolarLightAt(report.hourly,at);assert(sun);
 const moon=skyMoonDiscAt(report.hourly,at,basis,width,height,c.fov,center);
 const sunDisc=skySunDiscAt(report.hourly,at,basis,width,height,c.fov,center);
 const planets=skyPlanetDiscsAt(report.hourly,at,basis,width,height,c.fov,center);
 const moonWanted=!!moon?.surfaceOrientation&&moon.radiusPx>=4;
 if(moonWanted)readImage('workers/miniapp-api/assets/moon/'+moonManifest.image.file);
 const band=skyGalacticBandAt(report,at,c.fov);
 const galaxyWanted=!!band&&!(c.wide&&c.fov>=60);
 if(galaxyWanted)readImage('workers/miniapp-api/assets/deep-sky/galactic-2mass/'+galaxyManifest.image.file);
 const w3Wanted=c.wide&&c.fov>=60&&sun.altitudeDeg<=-12;
 const selection=w3Wanted?selectSkyHipsTiles({frame:observerFrame,view,width,height,maxOrder:0,minOrder:0}):null;
 const w3=selection?.state==='SELECTED'?selection.pixels.filter(p=>skyHipsTileIntersectsView(0,p,observerFrame.equatorialToEnu,view,width,height)):[];
 for(const p of w3){const a=wideManifest.tiles.find((t:any)=>t.pixel===p);assert(a);readImage('workers/miniapp-api/assets/deep-sky/wide-field-w3/'+a.file);}
 const sourceMasks=masks.filter((m:any)=>skyPanoramaMaskIntersectsView(m,view,width,height));
 const groundOpacity=skyLandscapeViewOpacity(view,width,height);
 for(const m of sourceMasks)if(groundOpacity>0)readImage('workers/miniapp-api/assets/landscape/'+m.resource.image.file);
 const sdssLevel=c.selected?sdssOpticalLevelForFov(c.fov,c.selected):null;
 const selectedLevel=c.selected?deepSkyImageLevelForFov(c.fov):null;
 const sdssLevels=sdssLevel?['OVERVIEW','MEDIUM','DETAIL'].slice(Math.max(0,['OVERVIEW','MEDIUM','DETAIL'].indexOf(sdssLevel)-1),['OVERVIEW','MEDIUM','DETAIL'].indexOf(sdssLevel)+1).reverse():[];
 for(const level of sdssLevels)readImage('workers/miniapp-api/assets/deep-sky/sdss-m51/'+sdss.levels[level].file);
 if(selectedLevel)readImage('workers/miniapp-api/assets/deep-sky/'+selected.levels[selectedLevel].file);
 const saoWanted=selectSkyStellarTiles(sao.index.tiles,{frame:geometry,expected:{catalog:report.skyScene.publication,at,observer:report.skyScene.observer},
  basis,width,height,verticalFovDeg:c.fov,center,sunAltitudeDeg:sun.altitudeDeg});
 for(const ref of saoWanted)if(!actualSaoTiles.has(ref.id)){
  const p='workers/miniapp-api/assets/sao-v2/'+ref.file,data=json(p);assert.equal(bindings.get(p).sha256,ref.sha256);assert.equal(bindings.get(p).bytes,ref.bytes);
  assertSaoTilePublication({publicationHash:sao.publicationHash,tile:data},sao,ref);actualSaoTiles.set(ref.id,{...ref});
 }
 const starFrame=resolveSkySceneFrame(report.skyScene,at);assert(starFrame?.points);
 const stars=starFrame.points.filter((p:any)=>projected.project(p[1],p[2])&&skyStarAppearance(report.skyScene.catalog.entries[p[0]].magnitude,c.fov,sun.altitudeDeg,p[2]));
 return {...c,basis,at,view:{width,height,center},constellationAlpha:constellationVisibility(c.fov,true),constellationIds:art.map(i=>i.source.id),
  bscProjectedAppearanceEligible:stars.length,moon:moon?{radiusPx:moon.radiusPx,textureWanted:moonWanted}:null,
  sunDisc:sunDisc?{radiusPx:sunDisc.radiusPx}:null,planetDiscs:planets.map(p=>({body:p.body,radiusPx:p.radiusPx,
   textureWanted:!!p.surfaceOrientation&&(['MARS','MERCURY'].includes(p.body)?p.radiusPx>=4:!!p.oblate&&p.oblate.majorRadiusPx>=4)})),
  galaxyWanted,galaxyStrength:band?.strength??0,w3Wanted,w3Pixels:w3,sdssLevel,sdssExpectedLevels:sdssLevels,selectedLevel,
  groundViewOpacity:groundOpacity,intersectingMasks:sourceMasks.map((m:any)=>m.resource.id),
  sao:{candidateTileIds:saoWanted.map(t=>t.id),encodedBytes:saoWanted.reduce((n,t)=>n+t.bytes,0),loaderViewBudget:SKY_STELLAR_VIEW_BYTES,
   knownLocalInputComplete:true,overLoaderBudget:saoWanted.reduce((n,t)=>n+t.bytes,0)>SKY_STELLAR_VIEW_BYTES}};
});
assert(rows[0]!.moon?.textureWanted,'actual Moon45 must admit resolved texture');
assert(rows[0]!.constellationIds.length&&rows[0]!.galaxyWanted&&rows[0]!.intersectingMasks.length);
assert(rows[1]!.w3Pixels.length&&!rows[1]!.galaxyWanted);
assert.equal(rows[2]!.sdssLevel,'OVERVIEW');assert.equal(rows[3]!.sdssLevel,'DETAIL');
assert.deepEqual(rows[3]!.sdssExpectedLevels,['DETAIL','MEDIUM']);
const before=[...bindings.values()];for(const old of before)assert.deepEqual(binding(old.path),old,old.path);
const result={status:'READ_ONLY_ELIGIBILITY_PREPARATION',notRendered:true,noNetwork:true,seed:{binding:bindings.get(seedPath),at,
 contextId:report.context.contextId,contextFingerprint:report.context.contextFingerprint,dataRevision:report.context.dataRevision},
 proposedConditions:rows,admittedLocalImages:[...admittedImages.values()],saoInputs:{publicationHash:sao.publicationHash,
 selectedTileUnion:actualSaoTiles.size,encodedUnionBytes:[...actualSaoTiles.values()].reduce((n,t)=>n+t.bytes,0)},
 explicitGaps:['No Hook, loader, native decode or GPU executed here.','Pure selectors do not establish actual painted pixels, source credit or resource peaks.',
 'Local science-optical-v2 and LOCAL optical HiPS remain unadopted/default disabled; no intent supplied.',
 'These explicit owner/input bindings are not a browser or complete transitive Node build inventory.',
 'Inventory source RGBA arithmetic is not native/driver/GC memory, simultaneous residency, throughput or 200DAU capacity.'],
 bindings:before};
fs.copyFileSync(fileURLToPath(import.meta.url),path.join(out,'executed-preparation-script.mts.txt'),fs.constants.COPYFILE_EXCL);
fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output:relative,result:binding(relative+'/result.json'),rows:rows.map(({name,moon,planetDiscs,constellationIds,galaxyWanted,w3Pixels,groundViewOpacity,sao,sdssExpectedLevels})=>
 ({name,moon,planetDiscs,constellations:constellationIds.length,galaxyWanted,w3Pixels,groundViewOpacity,sao,sdssExpectedLevels}))},null,2));
