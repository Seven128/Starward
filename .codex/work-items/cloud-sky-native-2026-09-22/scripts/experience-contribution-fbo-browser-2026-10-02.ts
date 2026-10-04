// TASK ONLY. RGBA8 software-WebGL feasibility; no production source credit.
// Readonly shader exports are appended by the task bundler to the exact owner.
import {createSkyGpuRenderer, taskArtworkVertex, taskSkyRay} from '../../../../apps/wechat-miniapp/src/features/sky/sky-gpu-renderer';
import {skyArtworkLevelsFragment} from '../../../../apps/wechat-miniapp/src/features/sky/sky-artwork-level-composition';
import {createSkyViewBasis} from '../../../../apps/wechat-miniapp/src/features/sky/sky-view-projection';
import {registerSkySurvey} from '../../../../apps/wechat-miniapp/src/features/sky/sky-survey-registration';
import {skySolarLightAt} from '../../../../apps/wechat-miniapp/src/features/sky/sky-solar-light';

export async function run(input: any) {
  const width=96,height=128,canvas=document.querySelector('canvas')!;
  canvas.width=width;canvas.height=height;
  const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true,antialias:false})!;
  if(!gl)throw Error('webgl_unavailable');
  const checks:any[]=[],events:any[]=[],captures:any[]=[],rows:any[]=[];
  const check=(name:string,pass:boolean,details?:any)=>checks.push({name,pass,details});
  const ids=new WeakMap<object,string>(),resources=new Map<string,{kind:string,bytes:number}>();
  let serial=0,phase='setup',peakBytes=0,failNextFbo=false;
  const id=(value:any)=>value==null?null:ids.get(value)??(ids.set(value,'external-'+(++serial)),ids.get(value));
  const usage=()=>{
    const counts:any={texture:0,framebuffer:0,buffer:0,program:0,shader:0};let bytes=0;
    for(const item of resources.values()){counts[item.kind]++;bytes+=item.bytes;}
    return {counts,logicalTextureBytes:bytes};
  };
  const raw:any={};
  for(const name of ['createTexture','deleteTexture','createFramebuffer','deleteFramebuffer','createBuffer','deleteBuffer','createProgram','deleteProgram','createShader','deleteShader','texImage2D','copyTexImage2D','drawArrays','clear'])raw[name]=(gl as any)[name].bind(gl);
  for(const [kind,suffix] of [['texture','Texture'],['framebuffer','Framebuffer'],['buffer','Buffer'],['program','Program'],['shader','Shader']]){
    (gl as any)['create'+suffix]=(...args:any[])=>{
      if(kind==='framebuffer'&&failNextFbo){failNextFbo=false;events.push({phase,event:'controlled-create-failure',kind});return null;}
      const object=raw['create'+suffix](...args);
      if(object){const key=kind+'-'+(++serial);ids.set(object,key);resources.set(key,{kind,bytes:0});events.push({phase,event:'create',kind,id:key});}
      return object;
    };
    (gl as any)['delete'+suffix]=(object:any)=>{const key=id(object);events.push({phase,event:'delete',kind,id:key,allocatedBytes:key?resources.get(key)?.bytes:0});if(key)resources.delete(key);return raw['delete'+suffix](object);};
  }
  const sourceNames=new WeakMap<object,string>(),textureSources=new Map<string,any>();
  (gl as any).texImage2D=(...args:any[])=>{
    const result=raw.texImage2D(...args),texture=gl.getParameter(gl.TEXTURE_BINDING_2D),key=id(texture)!;
    const source=args.at(-1),w=args.length===9?args[3]:source.width,h=args.length===9?args[4]:source.height,n=w*h*4;
    const resource=resources.get(key);if(resource)resource.bytes=n;
    const sourceName=sourceNames.get(source)??(source===null?'null-allocation':'typed-task-control');
    textureSources.set(key,{source:sourceName,width:w,height:h,allocation:'texImage2D'});
    peakBytes=Math.max(peakBytes,usage().logicalTextureBytes);
    events.push({phase,event:'texImage2D',texture:key,source:sourceName,width:w,height:h,bytes:n});return result;
  };
  (gl as any).copyTexImage2D=(...args:any[])=>{
    const framebuffer=gl.getParameter(gl.FRAMEBUFFER_BINDING),source=framebuffer?gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME):null;
    const result=raw.copyTexImage2D(...args),key=id(gl.getParameter(gl.TEXTURE_BINDING_2D))!,n=args[5]*args[6]*4;
    const resource=resources.get(key);if(resource)resource.bytes=n;
    textureSources.set(key,{sourceTexture:id(source),source:textureSources.get(id(source)!)?.source??'framebuffer',x:args[3],y:args[4],width:args[5],height:args[6],allocation:'copyTexImage2D'});
    peakBytes=Math.max(peakBytes,usage().logicalTextureBytes);
    events.push({phase,event:'copyTexImage2D',texture:key,...textureSources.get(key),bytes:n});return result;
  };
  const readState=()=>{
    const active=gl.getParameter(gl.ACTIVE_TEXTURE),units=[];
    for(let i=0;i<gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);i++){gl.activeTexture(gl.TEXTURE0+i);units.push(gl.getParameter(gl.TEXTURE_BINDING_2D));}
    gl.activeTexture(active);
    const attribs=[];
    for(let i=0;i<gl.getParameter(gl.MAX_VERTEX_ATTRIBS);i++)attribs.push({enabled:gl.getVertexAttrib(i,gl.VERTEX_ATTRIB_ARRAY_ENABLED),buffer:gl.getVertexAttrib(i,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING),size:gl.getVertexAttrib(i,gl.VERTEX_ATTRIB_ARRAY_SIZE),type:gl.getVertexAttrib(i,gl.VERTEX_ATTRIB_ARRAY_TYPE),normalized:gl.getVertexAttrib(i,gl.VERTEX_ATTRIB_ARRAY_NORMALIZED),stride:gl.getVertexAttrib(i,gl.VERTEX_ATTRIB_ARRAY_STRIDE),offset:gl.getVertexAttribOffset(i,gl.VERTEX_ATTRIB_ARRAY_POINTER),current:Array.from(gl.getVertexAttrib(i,gl.CURRENT_VERTEX_ATTRIB))});
    return {framebuffer:gl.getParameter(gl.FRAMEBUFFER_BINDING),viewport:Array.from(gl.getParameter(gl.VIEWPORT)),program:gl.getParameter(gl.CURRENT_PROGRAM),arrayBuffer:gl.getParameter(gl.ARRAY_BUFFER_BINDING),active,units,attribs,
      blend:gl.isEnabled(gl.BLEND),blendSrcRgb:gl.getParameter(gl.BLEND_SRC_RGB),blendDstRgb:gl.getParameter(gl.BLEND_DST_RGB),blendSrcAlpha:gl.getParameter(gl.BLEND_SRC_ALPHA),blendDstAlpha:gl.getParameter(gl.BLEND_DST_ALPHA),blendEquationRgb:gl.getParameter(gl.BLEND_EQUATION_RGB),blendEquationAlpha:gl.getParameter(gl.BLEND_EQUATION_ALPHA),
      scissor:gl.isEnabled(gl.SCISSOR_TEST),scissorBox:Array.from(gl.getParameter(gl.SCISSOR_BOX)),colorMask:Array.from(gl.getParameter(gl.COLOR_WRITEMASK)),clearColor:Array.from(gl.getParameter(gl.COLOR_CLEAR_VALUE)),depth:gl.isEnabled(gl.DEPTH_TEST),stencil:gl.isEnabled(gl.STENCIL_TEST),cull:gl.isEnabled(gl.CULL_FACE),dither:gl.isEnabled(gl.DITHER),
      unpackFlip:gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL),unpackPremultiply:gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL),unpackAlignment:gl.getParameter(gl.UNPACK_ALIGNMENT),packAlignment:gl.getParameter(gl.PACK_ALIGNMENT)};
  };
  const stateJson=(s:any)=>({...s,framebuffer:id(s.framebuffer),program:id(s.program),arrayBuffer:id(s.arrayBuffer),units:s.units.map(id),attribs:s.attribs.map((a:any)=>({...a,buffer:id(a.buffer)}))});
  const restore=(s:any)=>{
    gl.bindFramebuffer(gl.FRAMEBUFFER,s.framebuffer);gl.viewport(...s.viewport as [number,number,number,number]);gl.useProgram(s.program);
    for(let i=0;i<s.units.length;i++){gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,s.units[i]);}gl.activeTexture(s.active);
    s.attribs.forEach((a:any,i:number)=>{if(a.buffer){gl.bindBuffer(gl.ARRAY_BUFFER,a.buffer);gl.vertexAttribPointer(i,a.size,a.type,a.normalized,a.stride,a.offset);}if(a.enabled)gl.enableVertexAttribArray(i);else gl.disableVertexAttribArray(i);gl.vertexAttrib4fv(i,a.current);});
    gl.bindBuffer(gl.ARRAY_BUFFER,s.arrayBuffer);
    for(const [cap,on] of [[gl.BLEND,s.blend],[gl.SCISSOR_TEST,s.scissor],[gl.DEPTH_TEST,s.depth],[gl.STENCIL_TEST,s.stencil],[gl.CULL_FACE,s.cull],[gl.DITHER,s.dither]])on?gl.enable(cap as number):gl.disable(cap as number);
    gl.blendFuncSeparate(s.blendSrcRgb,s.blendDstRgb,s.blendSrcAlpha,s.blendDstAlpha);gl.blendEquationSeparate(s.blendEquationRgb,s.blendEquationAlpha);
    gl.scissor(...s.scissorBox as [number,number,number,number]);gl.colorMask(...s.colorMask as [boolean,boolean,boolean,boolean]);gl.clearColor(...s.clearColor as [number,number,number,number]);
  };
  const guarded=(label:string,work:()=>any)=>{
    const before=readState();let result;
    try{result=work();}finally{restore(before);const after=readState();const a=stateJson(before),b=stateJson(after);check(label+'.state-restored',JSON.stringify(a)===JSON.stringify(b),{before:a,after:b});}
    return result;
  };
  const shader=(type:number,source:string)=>{const value=gl.createShader(type)!;if(!value)throw Error('shader_allocate');gl.shaderSource(value,source);gl.compileShader(value);if(!gl.getShaderParameter(value,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(value);gl.deleteShader(value);throw Error('shader_compile:'+error);}return value;};
  const program=(vertex:string,fragment:string)=>{
    const shaders:any[]=[],p=gl.createProgram()!;if(!p)throw Error('program_allocate');
    try{shaders.push(shader(gl.VERTEX_SHADER,vertex));shaders.push(shader(gl.FRAGMENT_SHADER,fragment));shaders.forEach(s=>gl.attachShader(p,s));gl.bindAttribLocation(p,0,'a_position');gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('program_link:'+gl.getProgramInfoLog(p));return p;}
    catch(error){gl.deleteProgram(p);throw error;}finally{shaders.forEach(s=>gl.deleteShader(s));}
  };
  const target=(w:number,h:number,data:Uint8Array|null=null)=>{
    const texture=gl.createTexture();let framebuffer:WebGLFramebuffer|null=null;
    try{
      if(!texture)throw Error('texture_allocate');gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,data);
      framebuffer=gl.createFramebuffer();if(!framebuffer)throw Error('framebuffer_allocate');gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
      if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('framebuffer_incomplete');
      return {texture,framebuffer,w,h};
    }catch(error){if(framebuffer)gl.deleteFramebuffer(framebuffer);if(texture)gl.deleteTexture(texture);throw error;}
  };
  const drop=(value:any)=>{gl.deleteFramebuffer(value.framebuffer);gl.deleteTexture(value.texture);};
  const bytes64=(value:Uint8Array)=>{let binary='';for(let i=0;i<value.length;i+=8192)binary+=String.fromCharCode(...value.subarray(i,i+8192));return btoa(binary);};
  const pixels=(value:any)=>guarded('readback',()=>{gl.bindFramebuffer(gl.FRAMEBUFFER,value?.framebuffer??null);const data=new Uint8Array((value?.w??width)*(value?.h??height)*4);gl.readPixels(0,0,value?.w??width,value?.h??height,gl.RGBA,gl.UNSIGNED_BYTE,data);return data;});
  const save=(name:string,value:any,kind='signal')=>{
    const data=pixels(value);const maxima=[0,0,0,0],nonzero=[0,0,0,0];for(let i=0;i<data.length;i++){const c=i%4;maxima[c]=Math.max(maxima[c],data[i]);if(data[i])nonzero[c]++;}
    const capture={name,kind,width:value?.w??width,height:value?.h??height,origin:'bottom-left',rgba:bytes64(data),maxima,nonzero,...(kind==='normal'?{png:canvas.toDataURL('image/png')}:{} )};captures.push(capture);return capture;
  };
  const uniforms=(p:WebGLProgram)=>{
    const values:any[]=[];for(let i=0;i<gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);i++){const info=gl.getActiveUniform(p,i)!,location=gl.getUniformLocation(p,info.name)!,v=gl.getUniform(p,location);values.push({name:info.name,type:info.type,size:info.size,value:ArrayBuffer.isView(v)?Array.from(v as any):v});}return values;
  };
  const installUniforms=(p:WebGLProgram,values:any[])=>{
    for(const {name,type,value} of values){const loc=gl.getUniformLocation(p,name);if(loc===null)continue;
      if(type===gl.SAMPLER_2D||type===gl.INT||type===gl.BOOL)gl.uniform1i(loc,value);
      else if(type===gl.FLOAT)gl.uniform1f(loc,value);
      else if(type===gl.FLOAT_VEC2)gl.uniform2fv(loc,value);else if(type===gl.FLOAT_VEC3)gl.uniform3fv(loc,value);else if(type===gl.FLOAT_VEC4)gl.uniform4fv(loc,value);
      else throw Error('unhandled_uniform:'+name+':'+type);
    }
  };
  const originalFragment=skyArtworkLevelsFragment(taskSkyRay);
  const selectedLine='if (!fineSample(ray,rgb) && !coarseSample(ray,rgb)) discard;';
  const outputLine='gl_FragColor = vec4(straight,contribution*u_opacity);';
  if(originalFragment.split(selectedLine).length!==2||originalFragment.split(outputLine).length!==2)throw Error('shader_owner_drift');
  const candidateFragment=originalFragment.replace(selectedLine,'bool fineSelected = fineSample(ray,rgb);\n      if (!fineSelected && !coarseSample(ray,rgb)) discard;').replace(outputLine,
    'gl_FragColor = vec4(fineSelected ? contribution*u_opacity : 0.0, fineSelected ? 0.0 : contribution*u_opacity, fineSelected ? 1.0 : 0.0, 1.0);');
  // R/G: selected fine/coarse maxRGB*opacity. B/A: fine/any eligibility;
  // eligibility is intentionally NOT attenuated by later foreground layers.
  const reduceVertex='attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.,1.);}';
  const reduceFragment=`precision highp float;uniform sampler2D u_input;uniform vec2 u_size;uniform float u_average;
    vec4 sampleAt(vec2 p){return texture2D(u_input,clamp(p,vec2(.5),u_size-.5)/u_size);}
    void main(){vec2 p=floor(gl_FragCoord.xy)*2.+.5;vec4 a=sampleAt(p),b=sampleAt(p+vec2(1.,0.)),c=sampleAt(p+vec2(0.,1.)),d=sampleAt(p+vec2(1.,1.));gl_FragColor=u_average>.5?(a+b+c+d)*.25:max(max(a,b),max(c,d));}`;
  let contributionProgram:WebGLProgram|null=null,reduceProgram:WebGLProgram|null=null,reduceBuffer:WebGLBuffer|null=null,signal:any=null;
  let renderer:any=null,mode='idle',stage='',groupCaptures:any[]=[],draws:any[]=[],quantization:any=null;
  const browserInfo={renderer:gl.getParameter(gl.RENDERER),vendor:gl.getParameter(gl.VENDOR),version:gl.getParameter(gl.VERSION),shadingLanguage:gl.getParameter(gl.SHADING_LANGUAGE_VERSION),extensions:gl.getSupportedExtensions(),maxTextureSize:gl.getParameter(gl.MAX_TEXTURE_SIZE),dimensions:{width,height},sampleAlpha:'original four-texel min>=.999999',signal:'RGBA8 finePhoto,coarsePhoto,fineEligibility,anyEligibility',candidateScope:'full controlled 96x128 viewport; no small-ROI certification for narrow TAN or normal 390x844/DPR'};
  const reduce=(source:any,label:string,average=false)=>guarded('reduce.'+label,()=>{
    let current=source;const made:any[]=[],steps:any[]=[];
    try{
      do{
        const out=target(Math.ceil(current.w/2),Math.ceil(current.h/2));made.push(out);gl.bindFramebuffer(gl.FRAMEBUFFER,out.framebuffer);gl.viewport(0,0,out.w,out.h);gl.disable(gl.BLEND);gl.disable(gl.SCISSOR_TEST);gl.colorMask(true,true,true,true);gl.useProgram(reduceProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER,reduceBuffer);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,current.texture);
        gl.uniform1i(gl.getUniformLocation(reduceProgram!,'u_input'),0);gl.uniform2f(gl.getUniformLocation(reduceProgram!,'u_size'),current.w,current.h);gl.uniform1f(gl.getUniformLocation(reduceProgram!,'u_average'),average?1:0);
        raw.drawArrays(gl.TRIANGLES,0,6);const data=pixels(out);steps.push({width:out.w,height:out.h,bytes:out.w*out.h*4,rgba:bytes64(data)});current=out;
      }while(current.w>1||current.h>1);
      return {label,average,steps,value:Array.from(pixels(current))};
    }finally{made.forEach(drop);}
  });
  const captureDraw=(args:any[])=>{
    const p=gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram,s=readState(),u=uniforms(p);
    const samplers=u.filter(v=>v.type===gl.SAMPLER_2D).map(v=>({name:v.name,unit:v.value,texture:id(s.units[v.value]),binding:textureSources.get(id(s.units[v.value])!)}));
    return {p,s,u,args,receipt:{phase,stage,mode,args,program:id(p),uniforms:u,samplers,positionLocation:gl.getAttribLocation(p,'a_position'),attribs:stateJson(s).attribs,viewport:s.viewport,scissor:s.scissor,scissorBox:s.scissorBox,blend:{enabled:s.blend,srcRgb:s.blendSrcRgb,dstRgb:s.blendDstRgb,srcAlpha:s.blendSrcAlpha,dstAlpha:s.blendDstAlpha,equationRgb:s.blendEquationRgb,equationAlpha:s.blendEquationAlpha}}};
  };
  gl.drawArrays=(...args:any[])=>{
    const capture=captureDraw(args);const result=raw.drawArrays(...args);events.push({phase,event:'actual-renderer-draw',...capture.receipt});
    if(mode==='group'){
      groupCaptures.push(capture.receipt);
      check('same-prepared.position-location',capture.receipt.positionLocation===0);
      guarded('group.signal',()=>{
        gl.bindFramebuffer(gl.FRAMEBUFFER,signal.framebuffer);gl.viewport(0,0,width,height);gl.disable(gl.BLEND);gl.disable(gl.SCISSOR_TEST);gl.colorMask(true,true,true,true);gl.useProgram(contributionProgram);installUniforms(contributionProgram!,capture.u);
        // EXACT current group VBO and sampler bindings, not a second upload.
        raw.drawArrays(...args);events.push({phase,event:'candidate-same-prepared-draw',sourceProgram:id(capture.p),targetProgram:id(contributionProgram),samplers:capture.receipt.samplers});
      });
    }else if(mode==='foreground'){
      draws.push(capture.receipt);
      const destination=capture.s.blend?capture.s.blendDstRgb:gl.ZERO;
      check(stage+'.supported-destination',capture.s.blendEquationRgb===gl.FUNC_ADD&&[gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ZERO].includes(destination));
      guarded(stage+'.attenuate',()=>{gl.bindFramebuffer(gl.FRAMEBUFFER,signal.framebuffer);gl.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFuncSeparate(gl.ZERO,destination,gl.ZERO,destination);gl.colorMask(true,true,false,false);raw.drawArrays(...args);events.push({phase,event:'candidate-actual-alpha-replay',...capture.receipt,candidateBlend:{srcRgb:gl.ZERO,dstRgb:destination}});});
      if(stage==='partial-disc')quantization=guarded('quantization.actual-point-alpha',()=>{
        const one=target(1,1,new Uint8Array([1,0,255,255]));
        try{
          gl.bindFramebuffer(gl.FRAMEBUFFER,one.framebuffer);gl.viewport(0,0,1,1);gl.disable(gl.SCISSOR_TEST);gl.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFuncSeparate(gl.ZERO,gl.ONE_MINUS_SRC_ALPHA,gl.ZERO,gl.ONE_MINUS_SRC_ALPHA);gl.colorMask(true,true,false,false);
          // The actual partial disc is centered at logical (48,64), hence the
          // one pixel lands at gl_PointCoord=.5 and the actual disc alpha=.75.
          raw.drawArrays(...args);
          return {before:[1,0,255,255],after:Array.from(pixels(one)),actualDraw:capture.receipt,controlledViewport:[0,0,1,1],analyticCenterAlpha:.75,analyticRemaining:(1/255)*.25,meaning:'quantized zero is UNKNOWN for strictly positive mathematical contribution; not exact absence'};
        }finally{drop(one);}
      });
    }
    return result;
  };
  gl.clear=(mask:number)=>{
    const result=raw.clear(mask);
    if(mode==='finish'&&(mask&gl.COLOR_BUFFER_BIT)){
      const s=readState();events.push({phase,event:'actual-navigation-clear',scissor:s.scissor,box:s.scissorBox,color:s.clearColor});
      guarded('finish.navigation-replay',()=>{gl.bindFramebuffer(gl.FRAMEBUFFER,signal.framebuffer);gl.colorMask(true,true,false,false);gl.clearColor(0,0,0,0);raw.clear(mask);events.push({phase,event:'candidate-navigation-clear',scissor:s.scissor,box:s.scissorBox});});
    }
    return result;
  };
  let failure:any=null,allocationFailure:any=null,final:any=null;
  try{
    const images=new Map<string,any>();
    for(const asset of input.images){const image=new Image();image.src=asset.data;await image.decode();check(asset.id+'.decoded512',image.width===512&&image.height===512);sourceNames.set(image,asset.id);images.set(asset.id,image);}
    const black=document.createElement('canvas');black.width=black.height=512;const ctx=black.getContext('2d')!;ctx.drawImage(images.get('MEDIUM'),0,0);const blackPixels=ctx.getImageData(0,0,512,512);
    for(let i=0;i<blackPixels.data.length;i+=4){blackPixels.data[i]=blackPixels.data[i+1]=blackPixels.data[i+2]=0;blackPixels.data[i+3]=255;}ctx.putImageData(blackPixels,0,0);images.set('valid-black',black);sourceNames.set(black,'task-valid-black-512-RGB0-A255');
    renderer=createSkyGpuRenderer(gl,1,{nativeNavigationHeightPx:8,imageFailed:(image:object)=>events.push({phase,event:'image-failed',source:sourceNames.get(image)})});
    const point=input.point,basis=createSkyViewBasis(point[1],90+point[2],0)!,sun=skySolarLightAt(input.hourly,input.at)!;
    check('frozen-basis',JSON.stringify(basis)===JSON.stringify(input.basis));check('frozen-sun',sun?.altitudeDeg===input.sunAltitudeDeg);
    const coarseRegistration=registerSkySurvey(point,input.product.levels.OVERVIEW.fieldDegrees,512,256.5)!,fineRegistration=registerSkySurvey(point,input.product.levels.MEDIUM.fieldDegrees,512,256.5)!;
    check('real-registrations',!!coarseRegistration&&!!fineRegistration);
    phase='candidate.setup';
    // Set up only after a real group draw has installed a restorable attribute
    // pointer; candidate setup itself follows below inside the first group tap.
    const initialize=()=>guarded('candidate.initialize',()=>{
      contributionProgram=program(taskArtworkVertex,candidateFragment);reduceProgram=program(reduceVertex,reduceFragment);reduceBuffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,reduceBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);signal=target(width,height);
      gl.viewport(0,0,width,height);gl.disable(gl.SCISSOR_TEST);gl.colorMask(true,true,true,true);gl.clearColor(0,0,0,0);raw.clear(gl.COLOR_BUFFER_BIT);
    });
    const ordinaryTap=gl.drawArrays;
    let initialized=false;
    gl.drawArrays=(...args:any[])=>{if(mode==='group'&&!initialized){initialize();initialized=true;}return ordinaryTap(...args);};
    for(const condition of [{name:'real-pair',fine:'MEDIUM',fov:.12,foreground:true},{name:'valid-black',fine:'valid-black',fov:.05,foreground:false}]){
      const startEvent=events.length;groupCaptures=[];draws=[];phase=condition.name+'.begin';mode='idle';renderer.begin(width,height,'#040810');
      const view={basis,verticalFovDeg:condition.fov};
      // Candidate clear occurs after initialization on the first tap; new null
      // texture storage is already zero. Later frames clear explicitly.
      if(initialized)guarded('signal.frame-clear',()=>{gl.bindFramebuffer(gl.FRAMEBUFFER,signal.framebuffer);gl.disable(gl.SCISSOR_TEST);gl.colorMask(true,true,true,true);gl.clearColor(0,0,0,0);raw.clear(gl.COLOR_BUFFER_BIT);});
      phase=condition.name+'.group';mode='group';stage='artworkLevels';
      const submission=renderer.artworkLevels({coarse:{image:images.get('OVERVIEW'),registration:coarseRegistration,sampleAvailability:'joint-area-alpha'},fine:{image:images.get(condition.fine),registration:fineRegistration,sampleAvailability:'joint-area-alpha'}},view,1);mode='idle';
      save(condition.name+'.group.normal',null,'normal');const groupSignal=save(condition.name+'.group.signal',signal);
      const reductions=[reduce(signal,condition.name+'.group')];
      if(condition.foreground){
        mode='foreground';stage='additive-overlay';phase=condition.name+'.additive-overlay';const additive=renderer.artwork(images.get('OVERVIEW'),coarseRegistration,view,.35,'#ffffff','additive');mode='idle';check('additive.actual-submitted',additive===true);save(condition.name+'.additive.normal',null,'normal');save(condition.name+'.additive.signal',signal);
        mode='foreground';stage='partial-disc';phase=condition.name+'.partial-disc';renderer.disc(width/2,height/2,16,'#ffffff',.75);renderer.segments([],'#ffffff',1);mode='idle';save(condition.name+'.partial-disc.normal',null,'normal');save(condition.name+'.partial-disc.signal',signal);
        mode='foreground';stage='opaque-disc';phase=condition.name+'.opaque-disc';renderer.disc(width/4,height/2,10,'#ffffff',1);renderer.segments([],'#ffffff',1);mode='idle';save(condition.name+'.opaque-disc.normal',null,'normal');save(condition.name+'.opaque-disc.signal',signal);
        mode='foreground';stage='procedural-landscape';phase=condition.name+'.landscape';const terrain=renderer.landscape(view,sun,false,null,.25);mode='idle';check('landscape.actual-submitted',terrain===true);save(condition.name+'.terrain.normal',null,'normal');save(condition.name+'.terrain.signal',signal);
      }
      phase=condition.name+'.finish';stage='native-navigation';mode='finish';renderer.finish();mode='idle';gl.finish();save(condition.name+'.finished.normal',null,'normal');const finalSignal=save(condition.name+'.finished.signal',signal);reductions.push(reduce(signal,condition.name+'.finished'));
      rows.push({condition,submission,groupCaptures,draws,groupSignal:{maxima:groupSignal.maxima,nonzero:groupSignal.nonzero},finalSignal:{maxima:finalSignal.maxima,nonzero:finalSignal.nonzero},reductions,glError:gl.getError(),resources:usage(),eventsFrom:startEvent,eventsTo:events.length});
      if(condition.name==='real-pair'){
        phase='candidate.failure';const before=usage();failNextFbo=true;
        let error:any=null;guarded('candidate.failed-allocation',()=>{try{target(16,16);}catch(value){error=String(value);}});
        const after=usage();allocationFailure={error,before,after};check('allocation-failure.resources-restored',JSON.stringify(before)===JSON.stringify(after));check('allocation-failure.specific',error==='Error: framebuffer_allocate');
      }else{
        const priorDraws=events.filter(v=>v.event==='actual-renderer-draw').length;
        const invalid=renderer.artworkLevels({fine:{image:black,registration:{...fineRegistration,rows:[]},sampleAvailability:'joint-area-alpha'}},view,1);
        const laterDraws=events.filter(v=>v.event==='actual-renderer-draw').length;
        rows.push({control:'invalid-only-registration',submission:invalid,actualDrawDelta:laterDraws-priorDraws,eligibility:'NOT_EVALUATED_NO_SUBMISSION',photo:'UNKNOWN_NO_SUBMISSION',staleFboNotConsumed:true});
        check('invalid-only.no-draw',!invalid.submitted&&!invalid.finePrepared&&!invalid.coarsePrepared&&laterDraws===priorDraws);
      }
    }
    phase='reduction.control';const oneHot=guarded('control.onehot-create',()=>target(2,2,new Uint8Array([255,0,0,255,0,0,0,255,0,0,0,255,0,0,0,255])));
    try{const maximum=reduce(oneHot,'onehot.max'),average=reduce(oneHot,'onehot.average',true);rows.push({control:'one-hot',maximum,average});}finally{guarded('control.onehot-dispose',()=>drop(oneHot));}
  }catch(error){failure=String(error);}
  finally{
    phase='candidate.dispose';mode='idle';
    if(signal)drop(signal);if(reduceBuffer)gl.deleteBuffer(reduceBuffer);if(contributionProgram)gl.deleteProgram(contributionProgram);if(reduceProgram)gl.deleteProgram(reduceProgram);
    const afterCandidateDispose=usage();phase='renderer.dispose';if(renderer)renderer.dispose();final={afterCandidateDispose,afterRendererDispose:usage(),glError:gl.getError(),contextLost:gl.isContextLost(),peakLogicalTextureBytes:peakBytes};
  }
  return {browserInfo,at:input.at,point:input.point,basis:input.basis,sunAltitudeDeg:input.sunAltitudeDeg,sourceAssets:input.images.map((a:any)=>({id:a.id,sha256:a.sha256,bytes:a.bytes})),shaders:{actualVertex:taskArtworkVertex,actualFragment:originalFragment,candidateFragment,reduceVertex,reduceFragment},checks,events,captures,rows,quantization,allocationFailure,final,failure,
    scope:'Task-only full controlled 96x128 ROI RGBA8. Actual current prepared textures/uniforms/VBO and actual subsequent shader alpha plus finish scissor clear. Not normal science scene adoption, W3 suppression/source callback, client loader/lease lifetime, native WEAPP/device/FPS, physical GPU bytes, or exact mathematical zero certification.'};
}
