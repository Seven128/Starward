// Actual production renderer/receipt owner, controlled software WebGL only.
import {createSkyGpuRenderer} from '../../../../apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection';
import {registerSkySurvey} from '../../../../apps/wechat-miniapp/src/features/sky/sky-survey-registration';
import {skySolarLightAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-solar-light';

export async function run(input:any) {
  const canvas=document.querySelector('canvas')!,gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
  if(!gl)throw Error('webgl_unavailable');
  const checks:any[]=[],rows:any[]=[],captures:any[]=[],events:any[]=[],resources=new Map<any,{id:number,kind:string,bytes:number}>();
  const shaders=new Map<any,string>(),fragments=new Map<any,string>(),ids=new WeakMap<object,number>();
  let serial=0,phase='setup',peak=0,fault='',faultFbos=0,signalLinked=false,injected=false,normalError=false,normalDrawState:any=null,normalClearState:any=null;
  const id=(o:any)=>o==null?null:ids.get(o)??(ids.set(o,++serial),serial);
  const counts=()=>{const counts:any={texture:0,framebuffer:0,buffer:0,program:0,shader:0};let bytes=0;for(const v of resources.values()){counts[v.kind]++;bytes+=v.bytes;}return {counts,logicalTextureBytes:bytes};};
  const check=(name:string,pass:boolean,details?:any)=>checks.push({name,pass,details});
  const raw:any={};
  for(const name of ['createTexture','deleteTexture','createFramebuffer','deleteFramebuffer','createBuffer','deleteBuffer','createProgram','deleteProgram','createShader','deleteShader','texImage2D','copyTexImage2D','shaderSource','linkProgram','getProgramParameter','getShaderParameter','drawArrays','clear','readPixels'])raw[name]=(gl as any)[name].bind(gl);
  for(const [kind,suffix] of [['texture','Texture'],['framebuffer','Framebuffer'],['buffer','Buffer'],['program','Program'],['shader','Shader']]){
    (gl as any)['create'+suffix]=(...args:any[])=>{
      if(kind==='framebuffer'&&signalLinked&&fault.startsWith('fbo-')&&!injected){faultFbos++;if(faultFbos===(fault==='fbo-initial'?1:2)){injected=true;events.push({phase,event:'controlled-fbo-null',ordinal:faultFbos});return null;}}
      const object=raw['create'+suffix](...args);if(object){resources.set(object,{id:id(object)!,kind,bytes:0});events.push({phase,event:'create',id:id(object),kind});}return object;
    };
    (gl as any)['delete'+suffix]=(object:any)=>{events.push({phase,event:'delete',id:id(object),kind,bytes:resources.get(object)?.bytes??0});resources.delete(object);return raw['delete'+suffix](object);};
  }
  (gl as any).texImage2D=(...args:any[])=>{const r=raw.texImage2D(...args),source=args.at(-1),w=args.length===9?args[3]:source.width,h=args.length===9?args[4]:source.height,object=gl.getParameter(gl.TEXTURE_BINDING_2D);if(resources.has(object))resources.get(object)!.bytes=w*h*4;peak=Math.max(peak,counts().logicalTextureBytes);events.push({phase,event:'allocate',id:id(object),w,h,bytes:w*h*4});return r;};
  (gl as any).copyTexImage2D=(...args:any[])=>{const r=raw.copyTexImage2D(...args),object=gl.getParameter(gl.TEXTURE_BINDING_2D);if(resources.has(object))resources.get(object)!.bytes=args[5]*args[6]*4;peak=Math.max(peak,counts().logicalTextureBytes);events.push({phase,event:'copy',id:id(object),bytes:args[5]*args[6]*4});return r;};
  (gl as any).shaderSource=(shader:any,source:string)=>{shaders.set(shader,source);return raw.shaderSource(shader,source);};
  const isSignal=(source:string)=>source.includes('fineSelected ? contribution*u_opacity : 0.0');
  (gl as any).getShaderParameter=(shader:any,key:number)=>{
    if(fault==='signal-compile'&&!injected&&key===gl.COMPILE_STATUS&&isSignal(shaders.get(shader)??'')){injected=true;events.push({phase,event:'controlled-compile-status-false'});return false;}
    return raw.getShaderParameter(shader,key);
  };
  (gl as any).linkProgram=(program:any)=>{const sources=(gl.getAttachedShaders(program)??[]).map(s=>shaders.get(s)??'');fragments.set(program,sources.find(s=>s.includes('gl_FragColor'))??'');if(sources.some(isSignal))signalLinked=true;return raw.linkProgram(program);};
  const state=()=>{
    const active=gl.getParameter(gl.ACTIVE_TEXTURE),units=[];for(let i=0;i<gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);i++){gl.activeTexture(gl.TEXTURE0+i);units.push(id(gl.getParameter(gl.TEXTURE_BINDING_2D)));}gl.activeTexture(active);
    const attribs=[];for(let i=0;i<gl.getParameter(gl.MAX_VERTEX_ATTRIBS);i++)attribs.push({enabled:gl.getVertexAttrib(i,gl.VERTEX_ATTRIB_ARRAY_ENABLED),buffer:id(gl.getVertexAttrib(i,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING)),size:gl.getVertexAttrib(i,gl.VERTEX_ATTRIB_ARRAY_SIZE),type:gl.getVertexAttrib(i,gl.VERTEX_ATTRIB_ARRAY_TYPE),normalized:gl.getVertexAttrib(i,gl.VERTEX_ATTRIB_ARRAY_NORMALIZED),stride:gl.getVertexAttrib(i,gl.VERTEX_ATTRIB_ARRAY_STRIDE),offset:gl.getVertexAttribOffset(i,gl.VERTEX_ATTRIB_ARRAY_POINTER),current:Array.from(gl.getVertexAttrib(i,gl.CURRENT_VERTEX_ATTRIB))});
    return {framebuffer:id(gl.getParameter(gl.FRAMEBUFFER_BINDING)),viewport:Array.from(gl.getParameter(gl.VIEWPORT)),program:id(gl.getParameter(gl.CURRENT_PROGRAM)),arrayBuffer:id(gl.getParameter(gl.ARRAY_BUFFER_BINDING)),active,units,attribs,blend:gl.isEnabled(gl.BLEND),src:gl.getParameter(gl.BLEND_SRC_RGB),dst:gl.getParameter(gl.BLEND_DST_RGB),srcA:gl.getParameter(gl.BLEND_SRC_ALPHA),dstA:gl.getParameter(gl.BLEND_DST_ALPHA),equation:gl.getParameter(gl.BLEND_EQUATION_RGB),equationA:gl.getParameter(gl.BLEND_EQUATION_ALPHA),scissor:gl.isEnabled(gl.SCISSOR_TEST),box:Array.from(gl.getParameter(gl.SCISSOR_BOX)),mask:Array.from(gl.getParameter(gl.COLOR_WRITEMASK)),clear:Array.from(gl.getParameter(gl.COLOR_CLEAR_VALUE)),cull:gl.isEnabled(gl.CULL_FACE),depth:gl.isEnabled(gl.DEPTH_TEST),stencil:gl.isEnabled(gl.STENCIL_TEST),dither:gl.isEnabled(gl.DITHER),flip:gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL),premultiply:gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL),pack:gl.getParameter(gl.PACK_ALIGNMENT),unpack:gl.getParameter(gl.UNPACK_ALIGNMENT)};
  };
  (gl as any).drawArrays=(...args:any[])=>{const fb=gl.getParameter(gl.FRAMEBUFFER_BINDING),p=gl.getParameter(gl.CURRENT_PROGRAM),r=raw.drawArrays(...args);events.push({phase,event:'draw',framebuffer:id(fb),program:id(p),signal:isSignal(fragments.get(p)??''),args});if(fb===null){normalDrawState=state();if(normalError){normalError=false;gl.enable(0xdead);events.push({phase,event:'controlled-normal-invalid-enum'});}}return r;};
  (gl as any).clear=(mask:number)=>{const r=raw.clear(mask);events.push({phase,event:'clear',framebuffer:id(gl.getParameter(gl.FRAMEBUFFER_BINDING)),mask});if(gl.getParameter(gl.FRAMEBUFFER_BINDING)===null)normalClearState=state();return r;};
  (gl as any).readPixels=(...args:any[])=>{events.push({phase,event:'read',framebuffer:id(gl.getParameter(gl.FRAMEBUFFER_BINDING)),w:args[2],h:args[3]});return raw.readPixels(...args);};
  const rgba64=(bytes:Uint8Array)=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
  const capture=(name:string)=>{const bytes=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);phase=name+'.pixels';raw.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,bytes);captures.push({name,width:gl.drawingBufferWidth,height:gl.drawingBufferHeight,rgba:rgba64(bytes),png:canvas.toDataURL('image/png')});};
  const images=new Map<string,any>();for(const asset of input.images){const image=new Image();image.src=asset.data;await image.decode();images.set(asset.id,image);}
  const control=(name:string,rgb:number,availability:'all'|'none'|'half')=>{const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d')!,pixels=x.createImageData(512,512);for(let i=0;i<pixels.data.length;i+=4){pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=rgb;pixels.data[i+3]=availability==='none'?0:availability==='half'&&((i/4)%512)<256?0:255;}x.putImageData(pixels,0,0);images.set(name,c);};
  control('black',0,'all');control('white',255,'all');control('missing',255,'none');control('half',100,'half');
  const basis=createSkyViewBasis(input.point[1],90+input.point[2],0)!,sun=skySolarLightAt(input.hourly,input.at)!;
  check('cached-actual-basis',JSON.stringify(basis)===JSON.stringify(input.basis));
  const registration=(which:string)=>registerSkySurvey(input.point,input.product.levels[which].fieldDegrees,512,256.5)!;
  const level=(image:string,which='MEDIUM')=>({image:images.get(image),registration:registration(which),sampleAvailability:'joint-area-alpha' as const});
  const view={basis,verticalFovDeg:.05};
  const plannedBytes=(w:number,h:number,groups:number)=>{let scratch=0,x=w,y=h;do{x=Math.ceil(x/2);y=Math.ceil(y/2);scratch+=x*y*4;}while(x>1||y>1);return {signal:w*h*4,scratch,total:w*h*4*groups+scratch};};
  const normalQualification=(renderer:any,draw:any)=>renderer.artworkLevelsQualification(draw),completed=(renderer:any,draw:any)=>renderer.artworkLevelsContribution(draw);
  let failure:string|null=null,renderer:any=null;
  try {
    for(const c of [
      {name:'disabled',enabled:false}, {name:'plain-pair'}, {name:'real-pair',enabled:true,foreground:true},
      {name:'black-fine',fine:'black'}, {name:'black-coarse',fine:'missing',coarse:'black'},
      {name:'joint-partial',fine:'half'}, {name:'joint-empty',fine:'missing',coarse:'missing'},
      {name:'multi-group',second:true}, {name:'group-limit',second:true,maxGroups:1},
      {name:'budget-rejected',budget:1},
      {name:'signal-compile',fault:'signal-compile'}, {name:'fbo-initial',fault:'fbo-initial'}, {name:'fbo-chain',fault:'fbo-chain'},
      {name:'normal-gl-error',normalError:true},
      {name:'high-dpr-disabled',enabled:false,high:true}, {name:'high-dpr',high:true},
    ].filter(c=>!input.onlyNames||input.onlyNames.includes(c.name)) as any[]) {
      const physical=c.high?[1170,2532]:[96,128],logical=c.high?[390,844]:[96,128];canvas.width=physical[0];canvas.height=physical[1];
      const plan=plannedBytes(physical[0],physical[1],c.second?2:1),start=events.length;peak=0;fault=c.fault??'';faultFbos=0;injected=false;signalLinked=false;
      phase=c.name+'.construct';renderer=createSkyGpuRenderer(gl,c.high?3:1,{nativeNavigationHeightPx:8,artworkContributions:c.enabled===false?undefined:{auxiliaryBytesLimit:c.budget??plan.total,maxGroups:c.maxGroups??(c.second?2:1)}});
      phase=c.name+'.begin';renderer.begin(logical[0],logical[1],'#040810');
      phase=c.name+'.group';const draw=renderer.artworkLevels({coarse:level(c.coarse??'OVERVIEW','OVERVIEW'),fine:level(c.fine??'MEDIUM')},view,1),q=normalQualification(renderer,draw),before=completed(renderer,draw);
      const afterGroup=state();check(c.name+'.group-state-restored',JSON.stringify(normalDrawState)===JSON.stringify(afterGroup),{normal:normalDrawState,after:afterGroup});
      check(c.name+'.unfinished-no-credit',!before.completed&&before.finePhoto==='unknown'&&before.coarsePhoto==='unknown',before);
      let second:any=null,secondQualification:any=null,error:string|null=null;
      if(c.second){phase=c.name+'.second-group';second=renderer.artworkLevels({fine:level('white')},view,1);secondQualification=normalQualification(renderer,second);}
      if(c.foreground){phase=c.name+'.additive';renderer.artwork(images.get('OVERVIEW'),registration('OVERVIEW'),view,.35,'#ffffff','additive');phase=c.name+'.terrain';renderer.landscape(view,sun,false,null,.25);phase=c.name+'.pending-disc';renderer.disc(logical[0]/2,logical[1]/2,16,'#ffffff',.75);}
      if(c.normalError){normalError=true;renderer.disc(logical[0]/2,logical[1]/2,16,'#ffffff',.75);}
      phase=c.name+'.finish';try{renderer.finish();}catch(e){error=String(e);}
      const result=completed(renderer,draw),secondResult=second?completed(renderer,second):null;
      if(!error){const expected={...normalClearState,scissor:false};check(c.name+'.finish-state-restored',JSON.stringify(expected)===JSON.stringify(state()),{normal:expected,after:state()});capture(c.name);}
      const observed={name:c.name,physical,logical,plan,draw,qualification:q,before,result,secondQualification,secondResult,error,resources:counts(),peakLogicalTextureBytes:peak,injected,eventsFrom:start,eventsTo:events.length};rows.push(observed);
      if(c.fault){
        check(c.name+'.fault-exercised',injected);fault='';phase=c.name+'.latched';const attemptStart=events.length;renderer.begin(...logical,'#040810');const skip=renderer.artworkLevels({fine:level('MEDIUM')},view,1);renderer.finish();
        const latchEvents=events.slice(attemptStart);check(c.name+'.latched-no-signal-or-allocation',!latchEvents.some(e=>e.event==='draw'&&e.signal)&&!latchEvents.some(e=>e.event==='allocate'&&e.w===physical[0]&&e.h===physical[1]),latchEvents);
        check(c.name+'.latched-unknown',normalQualification(renderer,skip).any==='unknown');phase=c.name+'.explicit-reset';renderer.resetArtworkContributions();renderer.begin(...logical,'#040810');const recovered=renderer.artworkLevels({fine:level('MEDIUM')},view,1);renderer.finish();observed.recovered=completed(renderer,recovered);check(c.name+'.explicit-retry-restores',observed.recovered.completed&&observed.recovered.finePhoto==='positive',observed.recovered);
      }
      phase=c.name+'.retire';renderer.begin(...logical,'#040810');const stale=completed(renderer,draw);check(c.name+'.retired-no-credit',!stale.completed&&stale.finePhoto==='unknown'&&stale.coarsePhoto==='unknown',stale);renderer.finish();
      phase=c.name+'.dispose';renderer.dispose();renderer=null;observed.disposed=counts();check(c.name+'.all-objects-released',Object.values(observed.disposed.counts).every(v=>v===0)&&observed.disposed.logicalTextureBytes===0,observed.disposed);
      check(c.name+'.GL-clean',gl.getError()===0);
    }
    const find=(name:string)=>rows.find(r=>r.name===name)!;
    if(input.onlyNames)return {checks,rows,captures,events,final:{...counts(),glError:gl.getError(),contextLost:gl.isContextLost()},failure,scope:'Bounded before-repair pending-disc witness from actual saved production owner; no full-suite rerun.'};
    for(const name of ['disabled','budget-rejected','signal-compile','fbo-initial','fbo-chain'])check(name+'.unknown-not-empty',find(name).qualification.any==='unknown'&&find(name).result.finePhoto==='unknown',find(name));
    const reads=events.slice(find('disabled').eventsFrom,find('disabled').eventsTo).filter(e=>e.event==='read');check('default-no-auxiliary-readback',reads.length===0,reads);
    check('valid-fine-black-blocks-coarse-without-credit',find('black-fine').qualification.fine==='has'&&find('black-fine').qualification.coarse==='empty'&&find('black-fine').result.finePhoto==='unknown'&&find('black-fine').result.coarsePhoto==='unknown');
    check('valid-coarse-black-distinguished',find('black-coarse').qualification.fine==='empty'&&find('black-coarse').qualification.coarse==='has'&&find('black-coarse').result.coarsePhoto==='unknown');
    check('partial-original-stencil-selects-both',find('joint-partial').qualification.fine==='has'&&find('joint-partial').qualification.coarse==='has'&&find('joint-partial').result.finePhoto==='positive'&&find('joint-partial').result.coarsePhoto==='positive');
    check('full-qualification-empty-is-measured',find('joint-empty').qualification.any==='empty');
    check('later-group-removes-first-photo-keeps-qualification',find('multi-group').result.finePhoto==='unknown'&&find('multi-group').result.qualification.fine==='has'&&find('multi-group').secondResult.finePhoto==='positive');
    check('refused-second-probe-still-occludes-first',find('group-limit').secondQualification.any==='unknown'&&find('group-limit').result.finePhoto==='unknown');
    check('ordinary-GL-error-not-swallowed',find('normal-gl-error').error?.includes('sky_gpu_draw_failed')&&!find('normal-gl-error').result.completed);
    check('high-DPR-exact-budget',find('high-dpr').plan.total===15803512&&find('high-dpr').result.finePhoto==='positive',find('high-dpr'));
    // Actual context loss then restored-context renderer reconstruction.
    canvas.width=96;canvas.height=128;phase='context-loss';const extension=gl.getExtension('WEBGL_lose_context');
    if(extension){
      const restored=new Promise<boolean>(resolve=>{canvas.addEventListener('webglcontextlost',e=>e.preventDefault(),{once:true});canvas.addEventListener('webglcontextrestored',()=>resolve(true),{once:true});setTimeout(()=>resolve(false),5000);});
      renderer=createSkyGpuRenderer(gl,1,{artworkContributions:{auxiliaryBytesLimit:plannedBytes(96,128,1).total,maxGroups:1}});renderer.begin(96,128,'#040810');const draw=renderer.artworkLevels({fine:level('MEDIUM')},view,1);extension.loseContext();let error=null;try{renderer.finish();}catch(e){error=String(e);}const receipt=completed(renderer,draw);check('actual-context-loss-no-completed-credit',gl.isContextLost()&&error?.includes('sky_gpu_context_lost')&&!receipt.completed,{error,receipt});renderer.dispose();renderer=null;setTimeout(()=>extension.restoreContext(),100);const success=await restored;check('actual-context-restored',success);
      if(success){phase='restored-reconstruction';renderer=createSkyGpuRenderer(gl,1,{artworkContributions:{auxiliaryBytesLimit:plannedBytes(96,128,1).total,maxGroups:1}});renderer.begin(96,128,'#040810');const recovered=renderer.artworkLevels({fine:level('MEDIUM')},view,1);renderer.finish();check('restored-new-owner-no-stale-token',completed(renderer,recovered).finePhoto==='positive'&&!completed(renderer,draw).completed);renderer.dispose();renderer=null;}
    }else rows.push({name:'context-loss',unverified:'extension-unavailable'});
  }catch(error){failure=String(error);}finally{phase='final';renderer?.dispose();}
  return {checks,rows,captures,events,final:{...counts(),glError:gl.getError(),contextLost:gl.isContextLost()},failure,scope:'Actual production opt-in receipt API/software WebGL with cached real pair and identified synthetic black/alpha/white controls. New mechanism only; no normal science adoption, W3/page/source migration, native WEAPP/devices/FPS/RAM or final quality/capacity.'};
}
