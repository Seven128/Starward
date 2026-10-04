/** Task-only exact-source replacements; none are written to production. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
export const sky='apps/wechat-miniapp/src/features/sky/';
export function createCandidates(root:string) {
  const originals=new Map<string,string>(),candidates=new Map<string,string>(),changes:any[]=[];
  const source=(name:string)=>{const p=sky+name+'.ts',text=fs.readFileSync(path.join(root,p),'utf8');originals.set(p,text);return text.replaceAll('\r\n','\n');};
  const replace=(text:string,before:string,after:string,label:string)=>{assert.equal(text.split(before).length-1,1,label);changes.push({label,before,after});return text.replace(before,after);};
  let composition=source('sky-artwork-level-composition');
  composition=replace(composition,'import type { SkyArtworkRegistration, SkyArtworkView } from "./sky-artwork-registration";',`import type { SkyArtworkRegistration, SkyArtworkView } from "./sky-artwork-registration";
import type { SkyDeepSkyRegion } from "./sky-deep-sky-region";

/** Task-only pixel-center facts in the frozen highp shader model. Precision is
 * unverified; this supplies no certified ICRS-domain/area/display decision. */
export interface SkyArtworkLocalObservation {
  readonly scope: "frozen-highp-shader-pixel-centers";
  readonly precision: "unknown";
  readonly signalRevision: number | null;
  readonly fine: { readonly selection: "has" | "not-selected" | "unknown"; readonly photo: "positive" | "unknown" };
  readonly coarse: { readonly selection: "has" | "not-selected" | "unknown"; readonly photo: "positive" | "unknown" };
}
export const unknownSkyArtworkLocalObservation: SkyArtworkLocalObservation = Object.freeze({
  scope: "frozen-highp-shader-pixel-centers", precision: "unknown", signalRevision: null,
  fine: Object.freeze({selection:"unknown", photo:"unknown"}), coarse: Object.freeze({selection:"unknown", photo:"unknown"}),
});`,'composition: immutable bounded model contract');
  composition=replace(composition,'export interface SkyArtworkContributionSurface {','export interface SkyArtworkContributionSurface {\n  artworkLevelsObserveRegion?(draw: SkyArtworkLevelsDraw, region: SkyDeepSkyRegion | null): SkyArtworkLocalObservation;','composition: optional observation only');
  candidates.set(sky+'sky-artwork-level-composition.ts',composition);

  let contribution=source('sky-gpu-artwork-contributions');
  contribution=replace(contribution,'  type SkyArtworkLevelsQualification } from "./sky-artwork-level-composition";',`  type SkyArtworkLevelsQualification, type SkyArtworkLocalObservation,
  unknownSkyArtworkLocalObservation } from "./sky-artwork-level-composition";
import type { SkyDeepSkyRegion } from "./sky-deep-sky-region";`,'contributions: contract imports');
  contribution=replace(contribution,'  receipt: SkyArtworkLevelsContribution | null;','  receipt: SkyArtworkLevelsContribution | null;\n  revision: number;\n  readonly camera: Record<string, unknown>;\n  readonly cameraRay: string;\n  readonly localCache: Map<SkyDeepSkyRegion, SkyArtworkLocalObservation>;','contributions: exact captured camera and revision cache');
  contribution=replace(contribution,'const reductionQuad =',`const localReduceFragment = (cameraRay: string) => \`precision highp float;
  uniform sampler2D u_input; uniform vec2 u_size, u_logicalSize;
  uniform vec3 u_regionRow0,u_regionRow1,u_regionRow2,u_regionAnchorU,u_regionAnchorV;
  uniform float u_regionDeterminant;
  \${cameraRay}
  vec4 sampleAt(vec2 point) {
    vec2 p=clamp(point,vec2(.5),u_size-.5);
    vec2 pixel=vec2(p.x/u_size.x*u_logicalSize.x,(u_size.y-p.y)/u_size.y*u_logicalSize.y);
    vec3 ray=skyRay(pixel);
    vec3 c=vec3(dot(u_regionRow0,ray),dot(u_regionRow1,ray),dot(u_regionRow2,ray));
    float s=c.x+c.y+c.z;
    // No epsilon/padding or general precision certificate. Strict model-only
    // boundary/branch skips yield UNKNOWN, never absence/area EMPTY.
    if(s==0.0 || u_regionDeterminant/s<=0.0) return vec4(0.0);
    vec2 pq=2.0*vec2(dot(c,u_regionAnchorU),dot(c,u_regionAnchorV))-vec2(s);
    if(!(dot(pq,pq)<s*s)) return vec4(0.0);
    return texture2D(u_input,p/u_size);
  }
  void main(){vec2 p=floor(gl_FragCoord.xy)*2.+.5;
    gl_FragColor=max(max(sampleAt(p),sampleAt(p+vec2(1.,0.))),
      max(sampleAt(p+vec2(0.,1.)),sampleAt(p+vec2(1.,1.))));}\`;
const reductionQuad =`,'contributions: first reduction model region mask');
  contribution=replace(contribution,'  let reduceBuffer: WebGLBuffer | null = null, positionLocation = -1, programKey = "";','  let reduceBuffer: WebGLBuffer | null = null, positionLocation = -1, programKey = "";\n  let localReduceProgram: ProgramInfo | null = null, signalRevision = 0;','contributions: revision and optional program');
  contribution=replace(contribution,'    if (reduceProgram) gl.deleteProgram(reduceProgram.program);','    if (reduceProgram) gl.deleteProgram(reduceProgram.program);\n    if (localReduceProgram) gl.deleteProgram(localReduceProgram.program);','contributions: program retirement');
  contribution=replace(contribution,'    signalProgram = null; reduceProgram = null; reduceBuffer = null; programKey = ""; positionLocation = -1;','    signalProgram = null; reduceProgram = null; localReduceProgram = null; reduceBuffer = null; programKey = ""; positionLocation = -1;','contributions: reset optional program');
  contribution=replace(contribution,'  const invalidatePhoto = () => {','  const changed = (entry: Entry) => { entry.revision = ++signalRevision; entry.localCache.clear(); };\n  const invalidatePhoto = () => {','contributions: revoke cached signal on change');
  contribution=replace(contribution,'for (const entry of entries.values()) { entry.photoUsable = false; entry.receipt = null; }','for (const entry of entries.values()) { entry.photoUsable = false; entry.receipt = null; changed(entry); }','contributions: photo invalidation revision');
  contribution=replace(contribution,'  const maximum = (source: Target): Uint8Array => {','  const maximum = (source: Target, local?: { region: SkyDeepSkyRegion; entry: Entry }): Uint8Array => {','contributions: reuse same scratch reduction');
  contribution=replace(contribution,'    for (const target of scratch) {\n      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer); gl.viewport(0, 0, target.width, target.height);\n      setUniforms(reduceProgram!, { u_input: current.texture, u_size: [current.width, current.height] });',`    for (const [index,target] of scratch.entries()) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer); gl.viewport(0, 0, target.width, target.height);
      const program=local && index===0 ? localReduceProgram! : reduceProgram!;
      gl.useProgram(program.program);
      const registration=local?.region.registration;
      setUniforms(program, {u_input:current.texture,u_size:[current.width,current.height],
        ...(local && index===0 ? {...local.entry.camera,
          u_regionRow0:registration!.rows[0],u_regionRow1:registration!.rows[1],u_regionRow2:registration!.rows[2],
          u_regionAnchorU:registration!.anchorU,u_regionAnchorV:registration!.anchorV,u_regionDeterminant:registration!.determinant} : {})});`,'contributions: local first pass then unchanged MAX chain');
  contribution=replace(contribution,'        return { target, qualification, photoUsable: true, receipt: null } as Entry;',`        const camera: Record<string, unknown> = {};
        for (const name of ["u_center","u_scale","u_right","u_up","u_forward"]) {
          const value=prepared.uniforms[name]; camera[name]=Array.isArray(value)?Object.freeze([...value]):value;
        }
        camera.u_logicalSize=Object.freeze([...(prepared.uniforms.u_resolution as number[])]);
        return {target, qualification, photoUsable:true, receipt:null,revision:++signalRevision,
          camera:Object.freeze(camera),cameraRay:prepared.cameraRay,localCache:new Map()} as Entry;`,'contributions: freeze actual prepared camera only');
  contribution=replace(contribution,'          gl.bindFramebuffer(gl.FRAMEBUFFER, entry.target.framebuffer); replay();','          gl.bindFramebuffer(gl.FRAMEBUFFER, entry.target.framebuffer); replay(); changed(entry);','contributions: replay updates revision');
  contribution=replace(contribution,'          gl.bindFramebuffer(gl.FRAMEBUFFER, entry.target.framebuffer); gl.clear(gl.COLOR_BUFFER_BIT);','          gl.bindFramebuffer(gl.FRAMEBUFFER, entry.target.framebuffer); gl.clear(gl.COLOR_BUFFER_BIT); changed(entry);','contributions: clear updates revision');
  contribution=replace(contribution,'    hasPending, invalidate,',`    observeRegion(draw:SkyArtworkLevelsDraw,region:SkyDeepSkyRegion|null): SkyArtworkLocalObservation {
      const entry=currentEntry(draw);
      if(!entry || !region || finished || !entry.photoUsable || scratch.length===0) return unknownSkyArtworkLocalObservation;
      const cached=entry.localCache.get(region); if(cached) return cached;
      const observed=auxiliary(positionLocation,()=>{
        if(!localReduceProgram) localReduceProgram=makeProgram(reduceVertex,localReduceFragment(entry.cameraRay),positionLocation);
        const max=maximum(entry.target,{region,entry});
        const slot=(selected:number,photo:number)=>Object.freeze({
          // Original expected-slot completeness belongs to the science caller.
          selection:selected>0 ? "has" as const : "unknown" as const,
          photo:photo>0 ? "positive" as const : "unknown" as const,
        });
        return Object.freeze({scope:"frozen-highp-shader-pixel-centers" as const,precision:"unknown" as const,
          signalRevision:entry.revision,fine:slot(max[2]!,max[0]!),coarse:slot(max[3]!,max[1]!)});
      });
      if(!observed || entries.get(draw)!==entry) return unknownSkyArtworkLocalObservation;
      entry.localCache.set(region,observed); return observed;
    },
    hasPending, invalidate,`,'contributions: immutable observation exact entry cache');
  candidates.set(sky+'sky-gpu-artwork-contributions.ts',contribution);

  let renderer=source('sky-gpu-renderer');
  renderer=replace(renderer,'      artworkLevelsQualification: contributions.qualification,',`      artworkLevelsObserveRegion(draw,region) {
        assertAvailable(); flush(); assertAvailable();
        return contributions.observeRegion(draw,region);
      },
      // Task-only controlled counterfactual: old unflushed getter boundary.
      __taskObserveWithoutFlush: contributions.observeRegion,
      artworkLevelsQualification: contributions.qualification,`,'renderer: assert/flush/assert wrapper and declared test tap');
  // The actual return type permits no test tap; avoid altering the production interface.
  renderer=replace(renderer,'export interface SkyGpuRenderer extends SkyRenderSurface, SkyArtworkLevelSurface, SkyArtworkContributionSurface { dispose(): void }','export interface SkyGpuRenderer extends SkyRenderSurface, SkyArtworkLevelSurface, SkyArtworkContributionSurface { dispose(): void; __taskObserveWithoutFlush?: typeof createSkyGpuArtworkContributions extends (...a:any[])=>infer T ? T extends {observeRegion:infer O}?O:never:never }','renderer: task tap type only');
  candidates.set(sky+'sky-gpu-renderer.ts',renderer);

  let submission=source('sky-sdss-science-scene');
  submission=replace(submission,'  SkyArtworkLevelsDraw } from "./sky-artwork-level-composition";','  SkyArtworkLevelsDraw, SkyArtworkLocalObservation } from "./sky-artwork-level-composition";\nimport { unknownSkyArtworkLocalObservation } from "./sky-artwork-level-composition";','science: model contract import');
  submission+=`\n/** Task-only pre-aid exact expected/native join. Scientific opacity stays 1. */
export function observeSkySceneScienceOptical(submission:SkySceneScienceOpticalSubmission):SkyArtworkLocalObservation {
  const {frame,draw,region,surface}=submission;
  if(!region || region.reference!==frame.reference || !draw.submitted || !draw.finePrepared ||
    !skyNativeImageIsCurrent(frame.image) || (frame.coarser && (!draw.coarsePrepared || !skyNativeImageIsCurrent(frame.coarser.image))) ||
    !surface.artworkLevelsObserveRegion) return unknownSkyArtworkLocalObservation;
  const result=surface.artworkLevelsObserveRegion(draw,region);
  if(!skyNativeImageIsCurrent(frame.image) || (frame.coarser && !skyNativeImageIsCurrent(frame.coarser.image)))
    return unknownSkyArtworkLocalObservation;
  if(result.signalRevision===null) return result;
  // Only this exact original-expected/current/prepared join can authorize
  // neutral slots. The lower pixel-center observer never invents not-selected.
  const q=surface.artworkLevelsQualification(draw);
  const neutral=Object.freeze({selection:"not-selected" as const,photo:"unknown" as const});
  return Object.freeze({...result,fine:q.fine==="empty"?neutral:result.fine,
    coarse:!frame.coarser || q.coarse==="empty"?neutral:result.coarse});
}\n`;
  changes.push({label:'science: append exact expected/current observation caller',before:'EOF',after:'observeSkySceneScienceOptical (task-only)'});
  candidates.set(sky+'sky-sdss-science-scene.ts',submission);
  let scene=source('sky-scene-render');
  scene=replace(scene,'import { submitSkySceneScienceOptical, type SkySceneScienceOpticalPort }','import { submitSkySceneScienceOptical, observeSkySceneScienceOptical, type SkySceneScienceOpticalPort }','Scene: matching submission caller import');
  scene=replace(scene,'  if (deepCatalog && deepFrame?.state === "AVAILABLE" && deepFrame.points) {',`  // Task-only facts before the first area aid; no policy/scalar adoption.
  if (scienceSubmission) {
    const observation=observeSkySceneScienceOptical(scienceSubmission);
    (context as SkyRenderSurface & {__taskRecordPreAid?:(submission:unknown,result:unknown)=>void}).__taskRecordPreAid?.(scienceSubmission,observation);
  }
  if (deepCatalog && deepFrame?.state === "AVAILABLE" && deepFrame.points) {`,'Scene: one pre-aid observation; declared result tap; legacy curve unchanged');
  candidates.set(sky+'sky-scene-render.ts',scene);
  return {originals,candidates,changes};
}

/** Reuse the saved actual Scene harness and its physical GL instrumentation.
 * Only this single view and explicitly listed existing-owner controls execute. */
export function createBrowserCandidate(root:string) {
  const originalPath='.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-science-scene-browser-2026-10-02.ts';
  const original=fs.readFileSync(path.join(root,originalPath),'utf8'),changes:any[]=[];
  let text=original.replaceAll('\r\n','\n');
  const change=(before:string,after:string,label:string)=>{assert.equal(text.split(before).length-1,1,label);text=text.replace(before,after);changes.push({label,before,after});};
  const begin=text.indexOf('    for(const c of ['),end=text.indexOf('      canvas.width=',begin);assert(begin>0&&end>begin);
  const oldCases=text.slice(begin,end);
  change("import {createSkyGpuRenderer}","import {skyArtworkViewParameters} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-registration';\nimport {createSkyGpuRenderer}",'harness: use actual captured-view projection parameters');
  change(oldCases,`    for(const c of [
      {name:'actual-pair'}, {name:'valid-black-fine',fine:'black',coarse:'white'},
      {name:'coarse-not-expected',noParent:true}, {name:'queued-prior-opaque',queuedOpaque:true},
      {name:'late-opaque',foreground:true}, {name:'retire-at-decision',retireDecision:true},
      {name:'retire-after-observation',retireAfter:true}, {name:'ordinary-finish-error',ordinaryError:true},
    ] as any[]){
`,'harness: one2.8view/eight explicit owner controls, no matrix');
  change('  const observation=exactSkyObservationFrame(input.report,input.at);','  const originalEntry=input.originalCatalog.rows.find((entry:any)=>entry.objectRef===publication.objectRef);\n  if(!originalEntry)throw Error("source_catalog_center_missing");\n  const cachedEntry=input.report.skyScene.deepSky.catalog.entries.find((entry:any)=>entry.objectRef===publication.objectRef);\n  if(cachedEntry.icrsCenter!==undefined)throw Error("historical_report_center_unexpected");\n  cachedEntry.icrsCenter={raDeg:originalEntry.raDeg,decDeg:originalEntry.decDeg};\n  const observation=exactSkyObservationFrame(input.report,input.at);','harness: explicitly supply current optional center from original catalog');
  change("renderedAsset:publication.levels[c.fineLevel??'DETAIL'],coarser:{image:selectedImages.coarse,level:'OVERVIEW',asset:publication.levels.OVERVIEW}})!;","renderedAsset:publication.levels[c.fineLevel??'DETAIL'],coarser:c.noParent?null:{image:selectedImages.coarse,level:'OVERVIEW',asset:publication.levels.OVERVIEW}})!;",'harness: original absent-parent intent');
  change("['createTexture','deleteTexture','createFramebuffer','deleteFramebuffer','createBuffer','deleteBuffer','createProgram','deleteProgram','createShader','deleteShader','texImage2D','copyTexImage2D','framebufferTexture2D','readPixels']","['createTexture','deleteTexture','createFramebuffer','deleteFramebuffer','createBuffer','deleteBuffer','createProgram','deleteProgram','createShader','deleteShader','texImage2D','copyTexImage2D','framebufferTexture2D','readPixels','bufferData','drawArrays']",'harness: actual buffer/draw observer');
  change("    return{counts,logicalTextureBytes:textureBytes,logicalAttachedTextureBytes:auxiliaryBytes};","    const logicalBufferBytes=[...resources.values()].filter(r=>r.kind==='buffer').reduce((n,r)=>n+r.bytes,0);\n    return{counts,logicalTextureBytes:textureBytes,logicalAttachedTextureBytes:auxiliaryBytes,logicalBufferBytes};",'harness: actual logical buffer allocation ledger');
  change("  const check=(name:string,pass:boolean,details?:any)=>checks.push({name,pass,details});",`  (gl as any).bufferData=(...args:any[])=>{const result=raw.bufferData(...args),buffer=gl.getParameter(gl.ARRAY_BUFFER_BINDING),resource=resources.get(buffer);
    const bytes=typeof args[1]==='number'?args[1]:args[1]?.byteLength??0;if(resource)resource.bytes=bytes;
    events.push({phase,event:'buffer',id:id(buffer),bytes});return result;};
  (gl as any).drawArrays=(...args:any[])=>{events.push({phase,event:'draw',primitive:args[0],count:args[2],framebuffer:id(gl.getParameter(gl.FRAMEBUFFER_BINDING)),program:id(gl.getParameter(gl.CURRENT_PROGRAM))});return raw.drawArrays(...args);};
  const state=()=>{const active=gl.getParameter(gl.ACTIVE_TEXTURE),textures=[];
    for(let unit=0;unit<2;unit++){gl.activeTexture(gl.TEXTURE0+unit);textures.push(id(gl.getParameter(gl.TEXTURE_BINDING_2D)));}gl.activeTexture(active);
    return {framebuffer:id(gl.getParameter(gl.FRAMEBUFFER_BINDING)),viewport:Array.from(gl.getParameter(gl.VIEWPORT)),program:id(gl.getParameter(gl.CURRENT_PROGRAM)),arrayBuffer:id(gl.getParameter(gl.ARRAY_BUFFER_BINDING)),active,textures,
      blend:[gl.BLEND_SRC_RGB,gl.BLEND_DST_RGB,gl.BLEND_SRC_ALPHA,gl.BLEND_DST_ALPHA,gl.BLEND_EQUATION_RGB,gl.BLEND_EQUATION_ALPHA].map(n=>gl.getParameter(n)),
      caps:[gl.BLEND,gl.SCISSOR_TEST,gl.DEPTH_TEST,gl.STENCIL_TEST,gl.CULL_FACE,gl.DITHER].map(n=>gl.isEnabled(n)),mask:Array.from(gl.getParameter(gl.COLOR_WRITEMASK)),clear:Array.from(gl.getParameter(gl.COLOR_CLEAR_VALUE)),scissor:Array.from(gl.getParameter(gl.SCISSOR_BOX)),
      attributes:Array.from({length:gl.getParameter(gl.MAX_VERTEX_ATTRIBS)},(_,n)=>({enabled:gl.getVertexAttrib(n,gl.VERTEX_ATTRIB_ARRAY_ENABLED),buffer:id(gl.getVertexAttrib(n,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING)),size:gl.getVertexAttrib(n,gl.VERTEX_ATTRIB_ARRAY_SIZE),type:gl.getVertexAttrib(n,gl.VERTEX_ATTRIB_ARRAY_TYPE),normalized:gl.getVertexAttrib(n,gl.VERTEX_ATTRIB_ARRAY_NORMALIZED),stride:gl.getVertexAttrib(n,gl.VERTEX_ATTRIB_ARRAY_STRIDE),offset:gl.getVertexAttribOffset(n,gl.VERTEX_ATTRIB_ARRAY_POINTER)}))};};
  const check=(name:string,pass:boolean,details?:any)=>checks.push({name,pass,details});`,'harness: read actual GL state without filling unknown driver cost');
  change('      const calls:any[]=[],failed:any[]=[],draws:any[]=[],q:any[]=[],receipts:any[]=[];','      const calls:any[]=[],failed:any[]=[],draws:any[]=[],q:any[]=[],receipts:any[]=[],local:any[]=[],sceneLocal:any[]=[]; let capturedView:any=null;','harness: separate local observations from final receipt');
  change('const draw=original.levels(levels,view,opacity);draws.push(draw);','capturedView=view;const draw=original.levels(levels,view,opacity);draws.push(draw);','harness: retain actual Scene group view for geometric control');
  change('finish:renderer.finish};','finish:renderer.finish,observe:renderer.artworkLevelsObserveRegion};','harness: retain actual candidate wrapper');
  change("q.push({drawId:id(draw),value,finished});return value;","q.push({drawId:id(draw),value,finished});if(c.retireDecision)retirees[0]();return value;",'harness: retirement after actual preparation before decision');
  change('      renderer.finish=()=>{',`      renderer.__taskRecordPreAid=(submission:any,result:any)=>sceneLocal.push({drawId:id(submission.draw),reference:submission.frame.reference,regionReference:submission.region?.reference??null,result,finished});
      renderer.artworkLevelsObserveRegion=(draw:any,region:any)=>{
        phase=c.name+'.pre-aid';const start=events.length;
        // This raw counterfactual proves that merely observing before flushing
        // the queued actual draw is insufficient. It is a declared task tap.
        let rawValue:any=null,rawState:any=null,cover:any=null;
        if(c.queuedOpaque){
          const {rows,determinant}=region.registration;
          const cross=(a:number[],b:number[])=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
          const dot=(a:number[],b:number[])=>a.reduce((n,v,i)=>n+v*b[i],0);
          // R=adj(P); original raw anchors are cross(other R rows)/det(P).
          const anchors=[cross(rows[1],rows[2]),cross(rows[2],rows[0]),cross(rows[0],rows[1])].map(a=>a.map(v=>v/determinant));
          const a=anchors[1].map((v,i)=>(v-anchors[0][i])/2),b=anchors[2].map((v,i)=>(v-anchors[0][i])/2),center=anchors[0].map((v,i)=>v+a[i]+b[i]);
          const length=Math.hypot(...center),axis=center.map(v=>v/length),na=dot(axis,a),nb=dot(axis,b);
          const ta=a.map((v,i)=>v-na*axis[i]),tb=b.map((v,i)=>v-nb*axis[i]);
          const aa=dot(ta,ta),bb=dot(tb,tb),ab=dot(ta,tb),tangentMax=Math.sqrt((aa+bb+Math.hypot(aa-bb,2*ab))/2),normalMax=Math.hypot(na,nb);
          if(!(length>normalMax))throw Error('queued_cap_not_forward');
          const angularRadius=Math.atan2(tangentMax,length-normalMax),p=skyArtworkViewParameters(capturedView,390,844)!;
          // Same spherical-cap→stereographic-circle equation as the existing
          // raster bounds owner. No new opacity/recognition/precision epsilon.
          const denominator=dot(axis,capturedView.basis.forward)+Math.cos(angularRadius);
          const x=p.center.x+p.scale*dot(axis,capturedView.basis.right)/denominator,y=p.center.y-p.scale*dot(axis,capturedView.basis.up)/denominator;
          const radius=p.scale*Math.sin(angularRadius)/denominator,opaqueRadius=Math.ceil(radius),drawRadius=opaqueRadius+.5;
          cover={rawAnchors:anchors,center,a,b,length,tangentMax,normalMax,angularRadius,denominator,x,y,radius,opaqueRadius,drawRadius,
            scope:'Conservative analytic circle for this captured model ellipse; integer outward raster rounding plus actual pointFragment half-pixel opaque-edge width. Not a universal shader precision bound.'};
          renderer.disc(x,y,drawRadius,'#ffffff',1);const before=state();rawValue=renderer.__taskObserveWithoutFlush(draw,region);rawState={before,after:state()};
        }
        const value=original.observe(draw,region),observedEnd=events.length,stateAfter=state();
        const duplicate=original.observe(draw,region),duplicateEnd=events.length;
        const afterDuplicate=state();
        check(c.name+'.cached-no-second-reduction',duplicate===value&&observedEnd===duplicateEnd);
        check(c.name+'.cached-GL-state-unchanged',JSON.stringify(stateAfter)===JSON.stringify(afterDuplicate));
        if(rawState)check(c.name+'.auxiliary-state-restored',JSON.stringify(rawState.before)===JSON.stringify(rawState.after));
        local.push({drawId:id(draw),regionReference:region?.reference??null,value,rawValue,rawState,cover,stateAfter,afterDuplicate,start,observedEnd,duplicateEnd,
          reads:events.slice(start,duplicateEnd).filter(e=>e.event==='read'),draws:events.slice(start,duplicateEnd).filter(e=>e.event==='draw')});
        if(c.retireAfter)retirees[0]();return value;
      };
      renderer.finish=()=>{`,'harness: exact wrapper/immutablecache and pre/post decision native control');
  change('published={snapshotPresent:!!snapshot,','published={snapshotPresent:!!snapshot,auxiliary:snapshot?.deepSkyAuxiliaryDecisions,','harness: actual same-frame opacity record');
  change('9:()=>{check(c.name+\'.done-after-finish\',finished);completed++;},10:c.fov??.18,','9:()=>{check(c.name+\'.done-after-finish\',finished);completed++;},10:2.8,','harness: freeze one shared view');
  change('policy:c.intent===false?null:{auxiliaryBytesLimit:c.budget??15803512,maxGroups:1},calls,draws:','policy:{auxiliaryBytesLimit:15803512,maxGroups:1},local,sceneLocal,calls,draws:','harness: preserve exact local facts and same old explicit budget');
  change("      phase=c.name+'.dispose';renderer.dispose();renderer=null;retirees.forEach(retire=>retire());row.disposed=totals();row.glError=gl.getError();",`      phase=c.name+'.dispose';const retainedWrapper=original.observe,draw=draws[0];renderer.dispose();renderer=null;retirees.forEach(retire=>retire());
      try{retainedWrapper(draw,null);row.disposeWrapperError='none';}catch(e){row.disposeWrapperError=String(e);}
      check(c.name+'.disposed-wrapper-rejects',row.disposeWrapperError?.includes('sky_gpu_disposed'));
      row.disposed=totals();row.glError=gl.getError();`,'harness: actual disposed wrapper rejects rather than reusing old record');
  const checksBegin=text.indexOf('    const find='),catchBegin=text.indexOf('  }catch(e)',checksBegin);assert(checksBegin>0&&catchBegin>checksBegin);
  change(text.slice(checksBegin,catchBegin),`    const find=(name:string)=>rows.find(row=>row.name===name)!;
    const value=(name:string)=>find(name).sceneLocal[0]?.result;
    const scalar=(name:string)=>find(name).published?.auxiliary?.find((r:any)=>r.reference==='M:51')?.opacity;
    check('all-eight-same-view-controls-executed',rows.length===8);
    check('actual-local-model-positive-not-quality',value('actual-pair')?.fine.photo==='positive'&&value('actual-pair')?.precision==='unknown');
    check('valid-black-fine-not-overridden-by-coarse-positive',value('valid-black-fine')?.fine.selection==='has'&&value('valid-black-fine')?.fine.photo==='unknown'&&value('valid-black-fine')?.coarse.photo==='positive'&&find('valid-black-fine').q[0]?.value.coarse==='has');
    check('original-absent-coarse-is-neutral',value('coarse-not-expected')?.coarse.selection==='not-selected');
    const queued=find('queued-prior-opaque').local[0];
    check('buffered-prior-opaque-useful-counterfactual',queued?.rawValue.fine.photo==='positive'&&queued?.value.fine.photo==='unknown'&&queued.value.signalRevision>queued.rawValue.signalRevision,queued);
    check('region-mask-has-real-exclusion-power',queued?.value.fine.photo==='unknown'&&queued?.value.coarse.photo==='unknown'&&find('queued-prior-opaque').published?.sources.optical?.receipt.coarsePhoto==='positive',
      {cover:queued?.cover,local:queued?.value,wholeFinal:find('queued-prior-opaque').published?.sources.optical?.receipt,
       scope:'Whole final surviving coarse positive with local zero UNKNOWN detects gross whole-buffer/mask-omission replacement; not mathematical area absence.'});
    check('late-opaque-does-not-rewrite-pre-aid',value('late-opaque')?.fine.photo==='positive'&&find('late-opaque').published?.sources.optical?.fields.length===0);
    check('native-retired-before-decision-unknown-no-probe',value('retire-at-decision')?.signalRevision===null&&find('retire-at-decision').local.length===0);
    check('native-retired-during-observer-unknown',find('retire-after-observation').local[0]?.value.fine.photo==='positive'&&value('retire-after-observation')?.signalRevision===null);
    check('ordinary-finish-error-rejects-publication',find('ordinary-finish-error').error?.includes('sky_gpu_draw_failed')&&find('ordinary-finish-error').published===null&&find('ordinary-finish-error').completed===0);
    check('science-aid-scalar-remains-one',rows.filter(r=>!r.error).every(r=>scalar(r.name)===1));
`,'harness: bounded same-view owner assertions, no old matrix upgrade');
  change("scope:'Actual production Scene+renderer/task-only explicit science group and cached inputs. Full-buffer software WebGL captures, identified synthetic controls. Optional whole-scene imagery absent; no WEAPP/native timing/RAM/quality or normal default adoption.'","scope:'Task-only exact-source Scene/renderer observation candidate. One2.8degree390x844camera, actual cached M51 pair plus identified owner controls. Frozen-highp pixel-center facts, precision unknown; no certified ICRS interior/area EMPTY, recognition, quality, WEAPP/native cost or policy/default adoption. Scene completion callback only; current page acceptance owner not executed here.'",'harness: exact observation/consumer scope');
  return {originalPath,original,text,changes};
}

export function createBaselineBrowser(candidate:string) {
  let text=candidate;
  const begin=text.indexOf('    for(const c of ['),end=text.indexOf('      canvas.width=',begin);assert(begin>0&&end>begin);
  text=text.slice(0,begin)+"    for(const c of [{name:'actual-pair'}] as any[]){\n"+text.slice(end);
  const observerBegin=text.indexOf('      renderer.__taskRecordPreAid='),observerEnd=text.indexOf('      renderer.finish=',observerBegin);assert(observerBegin>0&&observerEnd>observerBegin);
  text=text.slice(0,observerBegin)+text.slice(observerEnd);
  text=text.replace(',observe:renderer.artworkLevelsObserveRegion','');
  const disposeBegin=text.indexOf("      phase=c.name+'.dispose';const retainedWrapper="),disposeEnd=text.indexOf('      row.disposed=',disposeBegin);assert(disposeBegin>0&&disposeEnd>disposeBegin);
  text=text.slice(0,disposeBegin)+"      phase=c.name+'.dispose';renderer.dispose();renderer=null;retirees.forEach(retire=>retire());\n"+text.slice(disposeEnd);
  const checksBegin=text.indexOf('    const find='),catchBegin=text.indexOf('  }catch(e)',checksBegin);assert(checksBegin>0&&catchBegin>checksBegin);
  text=text.slice(0,checksBegin)+"    check('baseline-one-actual-original-pair',rows.length===1&&rows[0].published?.sources.optical?.fields.length===2);\n"+text.slice(catchBegin);
  text=text.replace(/scope:'Task-only exact-source Scene\/renderer observation candidate[^']*'/,
    "scope:'Original-production Scene/renderer one2.8degree390x844 actualpair baseline without replacements or observer/tap/getter. Existing explicit science receipts and same actual callbacks; not ordinary default/full pipeline/native acceptance.'");
  return text;
}
