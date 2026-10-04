import {createSkyGpuRenderer} from '../../../../apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection';
import {registerSkySurvey} from '../../../../apps/wechat-miniapp/src/features/sky/sky-survey-registration';

// New getter-lifecycle mechanism only. Earlier 16 profiles are not replayed.
export async function run(input:any){
  const canvas=document.querySelector('canvas')!,gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
  const checks:any[]=[],rows:any[]=[],events:any[]=[],captures:any[]=[],resources=new Map<object,{kind:string,bytes:number}>();
  const check=(name:string,pass:boolean,detail?:any)=>checks.push({name,pass,detail});
  let phase='setup',readFault=false,renderer:any=null,failure:string|null=null;
  const raw:any={};for(const n of ['texImage2D','copyTexImage2D','readPixels'])raw[n]=(gl as any)[n].bind(gl);
  for(const [kind,suffix] of [['texture','Texture'],['framebuffer','Framebuffer'],['buffer','Buffer'],['program','Program'],['shader','Shader']]){
    const create=(gl as any)['create'+suffix].bind(gl),drop=(gl as any)['delete'+suffix].bind(gl);
    (gl as any)['create'+suffix]=(...a:any[])=>{const o=create(...a);if(o)resources.set(o,{kind,bytes:0});events.push({phase,event:'create',kind});return o;};
    (gl as any)['delete'+suffix]=(o:object)=>{events.push({phase,event:'delete',kind,bytes:resources.get(o)?.bytes??0});resources.delete(o);return drop(o);};
  }
  const usage=()=>{const counts:any={texture:0,framebuffer:0,buffer:0,program:0,shader:0};let bytes=0;for(const r of resources.values()){counts[r.kind]++;bytes+=r.bytes;}return {counts,logicalTextureBytes:bytes};};
  (gl as any).texImage2D=(...a:any[])=>{const r=raw.texImage2D(...a),s=a.at(-1),w=a.length===9?a[3]:s.width,h=a.length===9?a[4]:s.height,o=gl.getParameter(gl.TEXTURE_BINDING_2D);if(resources.has(o))resources.get(o)!.bytes=w*h*4;events.push({phase,event:'allocate',w,h,bytes:w*h*4});return r;};
  (gl as any).copyTexImage2D=(...a:any[])=>{const r=raw.copyTexImage2D(...a),o=gl.getParameter(gl.TEXTURE_BINDING_2D);if(resources.has(o))resources.get(o)!.bytes=a[5]*a[6]*4;return r;};
  (gl as any).readPixels=(...a:any[])=>{const r=raw.readPixels(...a);events.push({phase,event:'probe-read',w:a[2],h:a[3]});if(readFault){readFault=false;gl.enable(0xdead);events.push({phase,event:'controlled-auxiliary-read-error'});}return r;};
  const image=new Image();image.src=input.images.find((a:any)=>a.id==='MEDIUM').data;await image.decode();
  const white=document.createElement('canvas');white.width=white.height=512;const ctx=white.getContext('2d')!;ctx.fillStyle='#ffffff';ctx.fillRect(0,0,512,512);
  const basis=createSkyViewBasis(input.point[1],90+input.point[2],0)!,view={basis,verticalFovDeg:.05},level={image,registration:registerSkySurvey(input.point,input.product.levels.MEDIUM.fieldDegrees,512,256.5)!,sampleAvailability:'joint-area-alpha' as const};
  const options={nativeNavigationHeightPx:8,artworkContributions:{auxiliaryBytesLimit:65540,maxGroups:1}};
  const begin=(w=96,h=128)=>{phase+=':begin';renderer.begin(w,h,'#040810');const draw=renderer.artworkLevels({fine:level},view,1);renderer.finish();return draw;};
  const save=(name:string)=>{const b=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);raw.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,b);let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));captures.push({name,width:gl.drawingBufferWidth,height:gl.drawingBufferHeight,rgba:btoa(s),png:canvas.toDataURL('image/png')});};
  try{
    canvas.width=96;canvas.height=128;renderer=createSkyGpuRenderer(gl,1,options);phase='completed-base';let draw=begin();let receipt=renderer.artworkLevelsContribution(draw);check('initial-positive',receipt.completed&&receipt.finePhoto==='positive',receipt);save('base');
    phase='completed-postdraw';renderer.image(white,[96,0,0,128,48,64],1);const changed=renderer.artworkLevelsContribution(draw);check('actual-postfinish-draw-reopens',!changed.completed&&changed.finePhoto==='unknown',changed);renderer.finish();const covered=renderer.artworkLevelsContribution(draw);check('postdraw-finished-keeps-qualified-but-zero-unknown',covered.completed&&covered.qualification.fine==='has'&&covered.finePhoto==='unknown',covered);rows.push({phase,changed,covered});save('postdraw');
    if(!input.onlyPost){
    phase='completed-resize';draw=begin();const before=renderer.artworkLevelsContribution(draw);canvas.width=100;canvas.height=100;const resized=renderer.artworkLevelsContribution(draw),q=renderer.artworkLevelsQualification(draw);check('actual-resize-getters-retire',before.finePhoto==='positive'&&!resized.completed&&resized.finePhoto==='unknown'&&q.any==='unknown',{before,resized,q});
    phase='resized-new-frame';const afterResize=begin(100,100),recovered=renderer.artworkLevelsContribution(afterResize);check('resize-next-begin-not-permanently-latched',recovered.completed&&recovered.finePhoto==='positive',recovered);rows.push({phase,before,resized,q,recovered});
    phase='auxiliary-read-failure';canvas.width=96;canvas.height=128;renderer.begin(96,128,'#040810');draw=renderer.artworkLevels({fine:level},view,1);readFault=true;let error=null;try{renderer.finish();}catch(e){error=String(e);}const failed=renderer.artworkLevelsContribution(draw);check('auxiliary-read-failure-preserves-normal-finish',error===null&&!failed.completed&&failed.finePhoto==='unknown',{error,failed});save('read-failure');
    phase='read-failure-latch';const start=events.length;draw=begin();check('read-failure-latched-no-reprobe',!events.slice(start).some(e=>e.event==='probe-read')&&renderer.artworkLevelsQualification(draw).any==='unknown');
    phase='read-failure-reset';renderer.resetArtworkContributions();draw=begin();receipt=renderer.artworkLevelsContribution(draw);check('read-failure-explicit-reset-recovers',receipt.finePhoto==='positive',receipt);rows.push({phase,failed,recovered:receipt});
    // The loss occurs AFTER finish, without another renderer draw/finish call.
    phase='completed-context-loss';const extension=gl.getExtension('WEBGL_lose_context');check('actual-loss-extension-available',!!extension);
    if(extension){
      const restored=new Promise<boolean>(resolve=>{canvas.addEventListener('webglcontextlost',e=>e.preventDefault(),{once:true});canvas.addEventListener('webglcontextrestored',()=>resolve(true),{once:true});setTimeout(()=>resolve(false),5000);});
      extension.loseContext();const lost=renderer.artworkLevelsContribution(draw),lostQ=renderer.artworkLevelsQualification(draw);check('actual-finished-context-loss-getters-retire',gl.isContextLost()&&!lost.completed&&lost.finePhoto==='unknown'&&lostQ.any==='unknown',{lost,lostQ});renderer.dispose();renderer=null;rows.push({phase,lost,lostQ,disposed:usage()});setTimeout(()=>extension.restoreContext(),100);check('actual-loss-restores',await restored);
      phase='restored-owner';renderer=createSkyGpuRenderer(gl,1,options);const newDraw=begin(),newReceipt=renderer.artworkLevelsContribution(newDraw);check('restored-generation-new-token-only',newReceipt.finePhoto==='positive'&&!renderer.artworkLevelsContribution(draw).completed,newReceipt);rows.push({phase,newReceipt});
    }
    }
  }catch(e){failure=String(e);}finally{phase='dispose';renderer?.dispose();}
  const final={...usage(),glError:gl.getError(),contextLost:gl.isContextLost()};check('all-owned-objects-released',Object.values(final.counts).every(v=>v===0)&&final.logicalTextureBytes===0&&final.glError===0&&!final.contextLost,final);
  return {checks,rows,events,captures,final,failure,scope:'Current production getter lifetime / post-finish real draw / controlled auxiliary-read error only. Cached actual MEDIUM plus identified white control, software WebGL. Does not reexecute prior16 profiles, certify native, W3/page/source adoption, FPS, physical RAM or quality.'};
}
