import {createSkyGpuRenderer} from '../../../../apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
import {drawSkyScene} from '../../../../apps/wechat-miniapp/src/features/sky/sky-scene-render';
import {skySdssOpticalFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-sdss-optical-frame';
import {exactSkyObservationFrame,skyEquatorialDirectionToEnu} from '../../../../apps/wechat-miniapp/src/features/sky/sky-observation-frame';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection';
import {registerSkyNativeImageLifetime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-loader';

/** Reproducible actual Scene output with new pinned scientific PNGs. All images
 * are decoded before the controlled readiness sequence; not cold/warm IO. */
export async function run(input:any){
 const canvas=document.querySelector('canvas')!;canvas.width=390;canvas.height=844;
 const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
 if(!gl)throw Error('webgl_unavailable');
 const freeze=(value:any):any=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
 const base64=(bytes:Uint8Array)=>{let result='';for(let i=0;i<bytes.length;i+=32768)result+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(result);};
 const rows:any[]=[],captures:any[]=[],failures:any[]=[],events:any[]=[],live=new Map<any,any>();
 const raw:any={};let phase='setup',peak=0;
 for(const name of ['createTexture','deleteTexture','createFramebuffer','deleteFramebuffer','createBuffer','deleteBuffer','createProgram','deleteProgram','createShader','deleteShader','texImage2D','copyTexImage2D'])raw[name]=(gl as any)[name].bind(gl);
 const totals=()=>{const counts:any={texture:0,framebuffer:0,buffer:0,program:0,shader:0};let rgbaBytes=0;
  for(const value of live.values()){counts[value.kind]++;if(value.kind==='texture')rgbaBytes+=value.bytes;}return{counts,logicalRgbaTextureBytes:rgbaBytes};};
 for(const[kind,suffix]of [['texture','Texture'],['framebuffer','Framebuffer'],['buffer','Buffer'],['program','Program'],['shader','Shader']]){
  (gl as any)['create'+suffix]=(...args:any[])=>{const object=raw['create'+suffix](...args);if(object)live.set(object,{kind,bytes:0});return object;};
  (gl as any)['delete'+suffix]=(object:any)=>{live.delete(object);return raw['delete'+suffix](object);};
 }
 (gl as any).texImage2D=(...args:any[])=>{const result=raw.texImage2D(...args),image=args.at(-1),width=args.length===9?args[3]:image.width,height=args.length===9?args[4]:image.height;
  const object=gl.getParameter(gl.TEXTURE_BINDING_2D);if(live.has(object))live.get(object).bytes=width*height*4;peak=Math.max(peak,totals().logicalRgbaTextureBytes);events.push({phase,event:'allocate',width,height});return result;};
 (gl as any).copyTexImage2D=(...args:any[])=>{const result=raw.copyTexImage2D(...args),object=gl.getParameter(gl.TEXTURE_BINDING_2D);if(live.has(object))live.get(object).bytes=args[5]*args[6]*4;peak=Math.max(peak,totals().logicalRgbaTextureBytes);return result;};
 for(const dataset of input.datasets){
  const publication=freeze(dataset.publication),images:any={},active:any={OVERVIEW:true,MEDIUM:true,DETAIL:true},retire:any[]=[];
  for(const [level,url]of Object.entries(dataset.data)){const image=new Image();image.src=url as string;await image.decode();images[level]=image;
   retire.push(registerSkyNativeImageLifetime(image,()=>active[level]));}
  const observation=exactSkyObservationFrame(input.report,input.at)!;
  if(!observation)throw Error('observation_missing');
  const rad=Math.PI/180,ra=publication.center.raDeg*rad,dec=publication.center.decDeg*rad;
  const ray=skyEquatorialDirectionToEnu(observation.equatorialToEnu,[Math.cos(dec)*Math.cos(ra),Math.cos(dec)*Math.sin(ra),Math.sin(dec)]);
  const altitude=Math.atan2(ray[2],Math.hypot(ray[0],ray[1]))/rad;
  const base=createSkyViewBasis(Math.atan2(ray[0],ray[1])/rad,90+altitude,0)!;
  if(Math.abs(base.forward.reduce((sum,v,i)=>sum+v*ray[i]!,0)/Math.hypot(...ray)-1)>1e-12)throw Error('camera_alignment');
  const renderer=createSkyGpuRenderer(gl,1,{nativeNavigationHeightPx:8,artworkContributions:{auxiliaryBytesLimit:15803512,maxGroups:1}});
  let finished=false,completed:any=null,done=0;
  const finish=renderer.finish;renderer.finish=()=>{finish();finished=true;};
  const conditions=[{name:'overview-wide',level:'OVERVIEW',fov:.38},
   {name:'medium-parent',level:'MEDIUM',parent:'OVERVIEW',fov:.17},
   {name:'detail-parent',level:'DETAIL',parent:'MEDIUM',fov:.10},
   {name:'detail-rotated',level:'DETAIL',parent:'MEDIUM',fov:.10,roll:37},
   {name:'retired-detail',level:'DETAIL',parent:'MEDIUM',fov:.10,roll:37,retired:true},
   {name:'medium-only-rotated',level:'MEDIUM',fov:.10,roll:37},
   {name:'detail-red',level:'DETAIL',parent:'MEDIUM',fov:.10,roll:37,mode:'OBSERVATION'}];
  try{for(const condition of conditions as any[]){
   const c={mode:'NIGHT',roll:0,...condition};active.DETAIL=!c.retired;
   const angle=c.roll*rad,basis={forward:base.forward,right:base.right.map((v,i)=>Math.cos(angle)*v-Math.sin(angle)*base.up[i]!),
    up:base.up.map((v,i)=>Math.cos(angle)*v+Math.sin(angle)*base.right[i]!)};
   const frame=skySdssOpticalFrame({publication,image:images[c.level],renderedLevel:c.level,renderedAsset:publication.levels[c.level],
    coarser:c.parent?{image:images[c.parent],level:c.parent,asset:publication.levels[c.parent]}:null});
   for(const baseline of [true,false]){
    phase=dataset.name+'.'+c.name+(baseline?'.baseline':'.actual');finished=false;completed=null;done=0;const imageFailures:string[]=[];
    const args:any[]=Array(37).fill(undefined);
    Object.assign(args,{0:renderer,1:input.report,2:input.at,5:390,6:844,7:c.mode,8:(_snapshot:any,sources:any)=>{
     if(!finished)throw Error('source_before_finish');completed=sources.sdssOptical?{kind:sources.sdssOptical.kind,
      reference:sources.sdssOptical.reference,publicationHash:sources.sdssOptical.publicationHash,
      fields:sources.sdssOptical.participatingFields.map((field:any)=>({slot:field.slot,level:field.level,assetExact:field.asset===publication.levels[field.level],
       nativeExact:field.image===images[field.level],assetSha256:field.asset.sha256})),receipt:sources.sdssOptical.receipt}:null;},
     9:()=>{if(!finished)throw Error('done_before_finish');done++;},10:c.fov,12:basis,30:baseline?null:frame,
     31:(image:any)=>imageFailures.push(Object.keys(images).find(level=>images[level]===image)??'foreign'),
     34:{enabled:false},35:{horizontal:false,equatorial:false},36:baseline?undefined:{surface:renderer,reference:publication.objectRef,publicationHash:publication.publicationHash}});
    drawSkyScene(...args as any);const pixels=new Uint8Array(390*844*4);gl.readPixels(0,0,390,844,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    const error=gl.getError();if(error||done!==1)throw Error('render_failed:'+error+':'+done);
    const name=dataset.name+'-'+c.name+(baseline?'-baseline':'');
    captures.push({name,width:390,height:844,rgba:base64(pixels),png:canvas.toDataURL('image/png')});
    rows.push({name,dataset:dataset.name,condition:c,baseline,completed,done,imageFailures,glError:error,resources:totals()});
   }
  }}catch(error){failures.push({dataset:dataset.name,error:String(error)});}finally{renderer.dispose();retire.forEach(fn=>fn());}
 }
 return{rows,captures,failures,events,peakLogicalRgbaTextureBytes:peak,final:totals(),contextLost:gl.isContextLost(),
  scope:'Current actual Scene/renderer, cached real v3 PNGs, original actual report. Software WebGL, fixed logical390x844, all images predecoded, controlled readiness and camera. No normal adoption/native IO/memory/timing/Back/full quality acceptance.'};
}
