import {createSkyGpuRenderer} from '../../../../apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
import {drawSkyScene} from '../../../../apps/wechat-miniapp/src/features/sky/sky-scene-render';
import {skySdssOpticalFrame} from '../../../../apps/wechat-miniapp/src/features/sky/sky-sdss-optical-frame';
import {exactSkyObservationFrame,skyEquatorialDirectionToEnu} from '../../../../apps/wechat-miniapp/src/features/sky/sky-observation-frame';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection';
import {registerSkyNativeImageLifetime} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-loader';

/** Actual Scene/renderer and frozen cached publication. Identified synthetic
 * black/availability/invalid-native controls are not source-quality claims. */
export async function run(input:any){
  const canvas=document.querySelector('canvas')!,gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
  if(!gl)throw Error('webgl_unavailable');
  const freeze=(x:any):any=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
  const publication=freeze(input.publication),images=new Map<string,HTMLImageElement|HTMLCanvasElement>();
  for(const entry of input.images){const image=new Image();image.src=entry.data;await image.decode();images.set(entry.id,image);}
  const control=(name:string,color:number,alpha:'all'|'empty'|'partial')=>{
    const image=document.createElement('canvas');image.width=image.height=512;
    const context=image.getContext('2d')!,data=context.createImageData(512,512);
    for(let i=0;i<data.data.length;i+=4){data.data[i]=data.data[i+1]=data.data[i+2]=color;
      data.data[i+3]=alpha==='empty'||alpha==='partial'&&(i/4)%512<256?0:255;}
    context.putImageData(data,0,0);images.set(name,image);
  };
  control('black',0,'all');control('white',100,'all');control('empty',100,'empty');control('empty-coarse',100,'empty');control('partial',180,'partial');
  const invalid=document.createElement('canvas');invalid.width=invalid.height=0;images.set('invalid-native',invalid);
  const invalidCoarse=document.createElement('canvas');invalidCoarse.width=invalidCoarse.height=0;images.set('invalid-coarse-native',invalidCoarse);
  const foreground=document.createElement('canvas');foreground.width=foreground.height=8;
  const fg=foreground.getContext('2d')!;fg.fillStyle='#ffffff';fg.fillRect(0,0,8,8);
  const observation=exactSkyObservationFrame(input.report,input.at);if(!observation)throw Error('actual_observation_missing');
  const rad=Math.PI/180,ra=publication.center.raDeg*rad,dec=publication.center.decDeg*rad;
  const centerRay=skyEquatorialDirectionToEnu(observation.equatorialToEnu,
    [Math.cos(dec)*Math.cos(ra),Math.cos(dec)*Math.sin(ra),Math.sin(dec)]);
  const altitude=Math.atan2(centerRay[2],Math.hypot(centerRay[0],centerRay[1]))/rad;
  // The adopted phone-back basis is beta=90+altitude; beta is not zenith distance.
  const basis=createSkyViewBasis(Math.atan2(centerRay[0],centerRay[1])/rad,90+altitude,0)!;
  const centerAlignment=basis.forward.reduce((sum,value,index)=>sum+value*centerRay[index]!,0)/Math.hypot(...centerRay);
  if(Math.abs(centerAlignment-1)>1e-12)throw Error('task_camera_does_not_face_publication_center');
  const ids=new WeakMap<object,number>(),resources=new Map<any,any>(),events:any[]=[],rows:any[]=[],captures:any[]=[],checks:any[]=[];
  let serial=0,phase='setup',peak=0,peakAuxiliary=0;
  const id=(x:any)=>x==null?null:ids.get(x)??(ids.set(x,++serial),serial);
  const totals=()=>{const counts:any={texture:0,framebuffer:0,buffer:0,program:0,shader:0};let textureBytes=0,auxiliaryBytes=0;
    for(const resource of resources.values()){counts[resource.kind]++;if(resource.kind==='texture'){textureBytes+=resource.bytes;if(resource.attached)auxiliaryBytes+=resource.bytes;}}
    return{counts,logicalTextureBytes:textureBytes,logicalAttachedTextureBytes:auxiliaryBytes};};
  const raw:any={};
  for(const name of ['createTexture','deleteTexture','createFramebuffer','deleteFramebuffer','createBuffer','deleteBuffer','createProgram','deleteProgram','createShader','deleteShader','texImage2D','copyTexImage2D','framebufferTexture2D','readPixels'])raw[name]=(gl as any)[name].bind(gl);
  const measure=()=>{const now=totals();peak=Math.max(peak,now.logicalTextureBytes);peakAuxiliary=Math.max(peakAuxiliary,now.logicalAttachedTextureBytes);};
  for(const [kind,suffix] of [['texture','Texture'],['framebuffer','Framebuffer'],['buffer','Buffer'],['program','Program'],['shader','Shader']]){
    (gl as any)['create'+suffix]=(...args:any[])=>{const object=raw['create'+suffix](...args);if(object){resources.set(object,{kind,id:id(object),bytes:0,attached:false});events.push({phase,event:'create',kind,id:id(object)});}return object;};
    (gl as any)['delete'+suffix]=(object:any)=>{events.push({phase,event:'delete',kind,id:id(object),bytes:resources.get(object)?.bytes??0});resources.delete(object);return raw['delete'+suffix](object);};
  }
  (gl as any).texImage2D=(...args:any[])=>{const result=raw.texImage2D(...args),source=args.at(-1),width=args.length===9?args[3]:source.width,height=args.length===9?args[4]:source.height;
    const texture=gl.getParameter(gl.TEXTURE_BINDING_2D),resource=resources.get(texture);if(resource)resource.bytes=width*height*4;
    events.push({phase,event:'allocate',id:id(texture),width,height,bytes:width*height*4});measure();return result;};
  (gl as any).copyTexImage2D=(...args:any[])=>{const result=raw.copyTexImage2D(...args),texture=gl.getParameter(gl.TEXTURE_BINDING_2D),resource=resources.get(texture);
    if(resource)resource.bytes=args[5]*args[6]*4;events.push({phase,event:'copy',id:id(texture),bytes:args[5]*args[6]*4});measure();return result;};
  (gl as any).framebufferTexture2D=(...args:any[])=>{const result=raw.framebufferTexture2D(...args);if(resources.has(args[3]))resources.get(args[3]).attached=true;
    events.push({phase,event:'attach',framebuffer:id(gl.getParameter(gl.FRAMEBUFFER_BINDING)),texture:id(args[3])});measure();return result;};
  (gl as any).readPixels=(...args:any[])=>{events.push({phase,event:'read',width:args[2],height:args[3],framebuffer:id(gl.getParameter(gl.FRAMEBUFFER_BINDING))});return raw.readPixels(...args);};
  const check=(name:string,pass:boolean,details?:any)=>checks.push({name,pass,details});
  const plannedBytes=(width:number,height:number)=>{let x=width,y=height,scratch=0;do{x=Math.ceil(x/2);y=Math.ceil(y/2);scratch+=x*y*4;}while(x>1||y>1);return{signal:width*height*4,scratch,total:width*height*4+scratch};};
  const base64=(data:Uint8Array)=>{let string='';for(let i=0;i<data.length;i+=32768)string+=String.fromCharCode(...data.subarray(i,i+32768));return btoa(string);};
  let failure:string|null=null,renderer:any=null;
  try{
    for(const c of [
      {name:'no-intent',intent:false}, {name:'actual-pair'}, {name:'probe-budget-denied',budget:1},
      {name:'actual-ready-medium',fineLevel:'MEDIUM'},
      {name:'fine-unprepared-coarse-positive',fine:'invalid-native',coarse:'white'},
      {name:'expected-fine-unprepared-coarse-empty',fine:'invalid-native',coarse:'empty'},
      {name:'complete-ready-empty',fine:'empty',coarse:'empty-coarse'},
      {name:'whole-unsubmitted',fine:'invalid-native',coarse:'invalid-coarse-native'},
      {name:'valid-black-fine',fine:'black',coarse:'white',fov:.03},
      {name:'partial-fine-coarse',fine:'partial',coarse:'white',fov:.06},
      {name:'late-opaque',foreground:true}, {name:'ordinary-finish-error',ordinaryError:true},
      {name:'actual-high-dpr',high:true},
    ].filter(c=>!input.onlyNames||input.onlyNames.includes(c.name)) as any[]){
      canvas.width=c.high?1170:390;canvas.height=c.high?2532:844;
      const start=events.length;peak=peakAuxiliary=0;phase=c.name+'.construct';
      renderer=createSkyGpuRenderer(gl,c.high?3:1,{nativeNavigationHeightPx:8,
        artworkContributions:c.intent===false?undefined:{auxiliaryBytesLimit:c.budget??15803512,maxGroups:1}});
      const selectedImages={fine:images.get(c.fine??c.fineLevel??'DETAIL')!,coarse:images.get(c.coarse??'OVERVIEW')!};
      const frame=skySdssOpticalFrame({publication,image:selectedImages.fine,renderedLevel:c.fineLevel??'DETAIL',
        renderedAsset:publication.levels[c.fineLevel??'DETAIL'],coarser:{image:selectedImages.coarse,level:'OVERVIEW',asset:publication.levels.OVERVIEW}})!;
      const retirees=[registerSkyNativeImageLifetime(selectedImages.fine,()=>true),registerSkyNativeImageLifetime(selectedImages.coarse,()=>true)];
      const calls:any[]=[],failed:any[]=[],draws:any[]=[],q:any[]=[],receipts:any[]=[];
      let finished=false,published:any=null,completed=0,finishCalls=0;
      const original={artwork:renderer.artwork,levels:renderer.artworkLevels,qualification:renderer.artworkLevelsQualification,contribution:renderer.artworkLevelsContribution,finish:renderer.finish};
      renderer.artwork=(image:any,...args:any[])=>{calls.push({kind:'artwork',image:image===images.get('W3')?'W3':'other',phase});return original.artwork(image,...args);};
      renderer.artworkLevels=(levels:any,view:any,opacity:number)=>{phase=c.name+'.group';const draw=original.levels(levels,view,opacity);draws.push(draw);calls.push({kind:'group',drawId:id(draw),fineImage:levels.fine?.image===selectedImages.fine,coarseImage:levels.coarse?.image===selectedImages.coarse});return draw;};
      renderer.artworkLevelsQualification=(draw:any)=>{const value=original.qualification(draw);q.push({drawId:id(draw),value,finished});return value;};
      renderer.artworkLevelsContribution=(draw:any)=>{const value=original.contribution(draw);receipts.push({drawId:id(draw),value,finished});return value;};
      renderer.finish=()=>{phase=c.name+'.finish';finishCalls++;
        if(c.foreground)renderer.image(foreground,[390,0,0,844,195,422],1);
        if(c.ordinaryError){renderer.disc(195,422,3,'#ffffff',1);gl.enable(-1);}
        original.finish();finished=true;phase=c.name+'.finished';};
      const args:any[]=Array(37).fill(undefined);
      Object.assign(args,{0:renderer,1:input.report,2:input.at,3:null,4:null,5:390,6:844,7:'NIGHT',
        8:(snapshot:any,sources:any)=>{check(c.name+'.published-after-finish',finished);published={snapshotPresent:!!snapshot,
          sources:{infrared:sources.deepSkyImage===images.get('W3'),optical:sources.sdssOptical?{kind:sources.sdssOptical.kind,
            reference:sources.sdssOptical.reference,publicationHash:sources.sdssOptical.publicationHash,
            fields:sources.sdssOptical.participatingFields?.map((field:any)=>({slot:field.slot,level:field.level,
              assetExact:field.asset===publication.levels[field.level],imageExact:field.image===selectedImages[field.slot==='fine'?'fine':'coarse']})),receipt:sources.sdssOptical.receipt}:null}};},
        9:()=>{check(c.name+'.done-after-finish',finished);completed++;},10:c.fov??.18,
        11:{...input.w3Asset,reference:'M:51',level:'DETAIL',image:images.get('W3')},12:basis,30:frame,
        31:(image:any)=>failed.push(image===selectedImages.fine?'fine':image===selectedImages.coarse?'coarse':'foreign'),
        34:{enabled:true},35:{horizontal:false,equatorial:false},
        36:c.intent===false?undefined:{surface:renderer,reference:publication.objectRef,publicationHash:publication.publicationHash}});
      phase=c.name+'.scene';let error:string|null=null;
      try{drawSkyScene(...args as any);}catch(e){error=String(e);}
      const sceneReceipts=receipts.slice(),ledgerEnd=events.length;
      const row:any={name:c.name,physical:[canvas.width,canvas.height],logical:[390,844],plannedAuxiliary:plannedBytes(canvas.width,canvas.height),
        policy:c.intent===false?null:{auxiliaryBytesLimit:c.budget??15803512,maxGroups:1},calls,draws:draws.map(draw=>({id:id(draw),...draw})),q,receipts:sceneReceipts,published,completed,finishCalls,error,failed,
        peakLogicalTextureBytes:peak,peakLogicalAttachedTextureBytes:peakAuxiliary,eventsFrom:start,eventsTo:ledgerEnd};
      if(!error){phase=c.name+'.external-capture';const pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
        if(c.foreground){let bad=0;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
          const offset=(y*canvas.width+x)*4,expected=y<canvas.height-8?[255,255,255,255]:[8,13,23,255];
          if(expected.some((value,index)=>pixels[offset+index]!==value))bad++;}
          check(c.name+'.actual-complete-opaque-and-navigation-output',bad===0,{pixels:canvas.width*canvas.height,bad});}
        captures.push({name:c.name,width:canvas.width,height:canvas.height,rgba:base64(pixels),png:canvas.toDataURL('image/png')});}
      check(c.name+'.only-one-group',draws.length<=1);
      check(c.name+'.exact-draw-qualification-finish-association',q.every(value=>value.drawId===id(draws[0])&&!value.finished)&&sceneReceipts.every(value=>value.drawId===id(draws[0])&&value.finished));
      phase=c.name+'.dispose';renderer.dispose();renderer=null;retirees.forEach(retire=>retire());row.disposed=totals();row.glError=gl.getError();
      check(c.name+'.released-all-GPU-objects',Object.values(row.disposed.counts).every(count=>count===0)&&row.disposed.logicalTextureBytes===0);
      check(c.name+'.clean-GL',row.glError===0);rows.push(row);
    }
    const find=(name:string)=>rows.find(row=>row.name===name)!;
    const infrared=(row:any)=>row.published?.sources.infrared===true;
    const fields=(row:any)=>row.published?.sources.optical?.fields??[];
    const defaultRow=find('no-intent');
    if(defaultRow)check('default-no-group-no-auxiliary-readbacks',defaultRow.draws.length===0&&infrared(defaultRow)&&defaultRow.q.length===0&&defaultRow.receipts.length===0&&
      !events.slice(defaultRow.eventsFrom,defaultRow.eventsTo).some(event=>event.event==='read'),{sourceWindowAttachedTextureBytes:defaultRow.peakLogicalAttachedTextureBytes,scope:'Normal source-window FBO is independent; attached textures alone do not identify receipt auxiliary allocation.'});
    if(input.onlyNames){
      const late=find('late-opaque');if(late)check('late-occlusion-withdraws-credit-not-spectral-selection',late.q[0]?.value.any==='has'&&fields(late).length===0&&!infrared(late)&&late.calls.filter((call:any)=>call.image==='W3').length===0);
      check('bounded-selected-cases-all-executed',rows.length===input.onlyNames.length&&input.onlyNames.every(name=>find(name)));
      return{scope:'Only affected default auxiliary-readback oracle and late-opaque full normalized-UV draw; remaining r3 Scene controls are not rerun or upgraded.',basis,at:input.at,publicationHash:publication.publicationHash,checks,rows,captures,events,failure,final:{...totals(),glError:gl.getError(),contextLost:gl.isContextLost()}};
    }
    check('actual-real-pair-both-fields',fields(find('actual-pair')).length===2&&fields(find('actual-pair')).every((field:any)=>field.assetExact&&field.imageExact)&&!infrared(find('actual-pair')));
    check('ready-medium-is-actual-fine',fields(find('actual-ready-medium')).some((field:any)=>field.slot==='fine'&&field.level==='MEDIUM'));
    check('submitted-budget-unknown-withholds-W3',find('probe-budget-denied').draws[0]?.submitted&&find('probe-budget-denied').q[0]?.value.any==='unknown'&&!infrared(find('probe-budget-denied')));
    check('fine-prepare-failure-preserves-coarse-source',fields(find('fine-unprepared-coarse-positive')).length===1&&fields(find('fine-unprepared-coarse-positive'))[0]?.slot==='coarse'&&find('fine-unprepared-coarse-positive').failed.includes('fine'));
    check('selected-empty-does-not-certify-failed-expected-fine',find('expected-fine-unprepared-coarse-empty').draws[0]?.submitted&&find('expected-fine-unprepared-coarse-empty').q[0]?.value.any==='empty'&&!infrared(find('expected-fine-unprepared-coarse-empty')));
    check('complete-ready-empty-permits-whole-W3',find('complete-ready-empty').draws[0]?.finePrepared&&find('complete-ready-empty').draws[0]?.coarsePrepared&&find('complete-ready-empty').q[0]?.value.any==='empty'&&infrared(find('complete-ready-empty')));
    check('known-no-submission-is-separate-W3-alternative',!find('whole-unsubmitted').draws[0]?.submitted&&infrared(find('whole-unsubmitted')));
    check('valid-black-selects-optical-without-photo',find('valid-black-fine').q[0]?.value.fine==='has'&&find('valid-black-fine').q[0]?.value.coarse==='empty'&&fields(find('valid-black-fine')).length===0&&!infrared(find('valid-black-fine')));
    check('partial-availability-keeps-both-sources',fields(find('partial-fine-coarse')).length===2&&!infrared(find('partial-fine-coarse')));
    check('late-occlusion-withdraws-credit-not-spectral-selection',find('late-opaque').q[0]?.value.any==='has'&&fields(find('late-opaque')).length===0&&!infrared(find('late-opaque'))&&find('late-opaque').calls.filter((call:any)=>call.image==='W3').length===0);
    check('ordinary-finish-error-propagates-without-publication',find('ordinary-finish-error').error?.includes('sky_gpu_draw_failed')&&find('ordinary-finish-error').published===null&&find('ordinary-finish-error').completed===0&&find('ordinary-finish-error').receipts.length===0);
    const high=find('actual-high-dpr'),highReads=events.slice(high.eventsFrom,high.eventsTo).filter(event=>event.event==='read');
    check('fixed-high-DPR-complete-buffer-budget',high.plannedAuxiliary.total===15803512&&high.peakLogicalAttachedTextureBytes===15803512&&fields(high).length===2,{high:high.plannedAuxiliary,attachedPeak:high.peakLogicalAttachedTextureBytes});
    check('actual-high-DPR-two-one-pixel-probe-reads',highReads.length===2&&highReads.every(event=>event.width===1&&event.height===1),highReads);
  }catch(e){failure=String(e);}finally{renderer?.dispose();}
  return{scope:'Actual production Scene+renderer/task-only explicit science group and cached inputs. Full-buffer software WebGL captures, identified synthetic controls. Optional whole-scene imagery absent; no WEAPP/native timing/RAM/quality or normal default adoption.',
    basis,at:input.at,publicationHash:publication.publicationHash,checks,rows,captures,events,failure,final:{...totals(),glError:gl.getError(),contextLost:gl.isContextLost()}};
}
