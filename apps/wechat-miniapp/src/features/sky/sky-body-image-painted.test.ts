import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import {skyArtworkViewParameters,type SkyArtworkView} from "./sky-artwork-registration";
import {SKY_PLANET_ORDER,assertMoonCoverageManifest,type MoonCoverageManifestData} from "@starward/miniapp-contracts";
import {completeSkyBodyImages,sameSkyBodyImages,skyBodyImageBinding,type SkyBodyImageBinding} from "./sky-body-image-completion";
import {drawSkyScene,type SkyScenePaintedSources} from "./sky-scene-render";
import {registerSkyNativeImageLifetime} from "./sky-artwork-loader";
import type {SkyRenderSurface} from "./sky-render-surface";
import type {ResolvedSkyReport} from "./sky-stellar-scene";
import {skyPagePaintCommit} from "./sky-optical-page-test-support";
import {resolvedSkyBodyReferences} from "./sky-body-label-presentation";
import {reportRuntimeError} from "../../services/runtime-error";

// Exercise the production submission and wrappers, keeping only the native GL
// ports controlled. This verifies delivery meaning, not physical GPU pixels.
function fixture(){
  const file=ts.createSourceFile("renderer.ts",readFileSync(new URL("./sky-gpu-renderer.ts",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true);
  let paint="",moon="",planet="",reset="",check="";
  function visit(node:ts.Node){
    if(ts.isVariableDeclaration(node)&&node.name.getText(file)==="paintBodyTexture")paint=node.getText(file);
    if(ts.isVariableDeclaration(node)&&node.name.getText(file)==="assertDrawCompleted")check=node.getText(file);
    if(ts.isMethodDeclaration(node)&&node.name.getText(file)==="moon")moon=node.getText(file);
    if(ts.isMethodDeclaration(node)&&node.name.getText(file)==="planet")planet=node.getText(file);
    if(ts.isMethodDeclaration(node)&&node.name.getText(file)==='resetBodyImages')reset=node.getText(file);
    ts.forEachChild(node,visit);
  }visit(file);assert(paint&&moon&&planet&&reset&&check);
  const image={width:8,height:512},texture={},draws:Record<string,unknown>[]=[],failures:object[]=[];
  const control={upload:true,error:0,compile:true};
  const renderer=vm.runInNewContext(ts.transpileModule(`
    let bodyTextureUnavailable=false,bodyTextureProgram=null;
    const programs=[],imageBuffer={},width=100,height=100;
    const ${check}; const ${paint};
    ({${moon},${planet},${reset}});
  `,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
    skyArtworkViewParameters,reportRuntimeError,
    assertAvailable(){},flush(){},
    textures:{get:()=>control.upload?texture:null},
    makeProgram(){if(!control.compile)throw Error("compile");return {};},
    imageVertex:"",bodyTextureFragment:"",bodyDisplayUniforms:()=>({}),color:()=>[1,1,1],
    options:{imageFailed:(value:object)=>failures.push(value)},
    gl:{NO_ERROR:0,TRIANGLES:4,drawingBufferWidth:300,drawingBufferHeight:300,
      getError(){const value=control.error;control.error=0;return value;},deleteProgram(){}},
    submit(_program:unknown,_buffer:unknown,_vertices:unknown,_stride:number,_primitive:number,uniforms:Record<string,unknown>){draws.push(uniforms);},
    paintPhaseDisc:()=>true,
  });
  const disc={x:50,y:50,radiusPx:12,illuminatedFraction:.6,sunward:[1,0],
    surfaceOrientation:{observerBody:[0,0,1],rightBody:[1,0,0],downBody:[0,-1,0]}};
  const view:SkyArtworkView={basis:{right:[1,0,0],up:[0,-1,0],forward:[0,0,1]},verticalFovDeg:3};
  return {renderer,image,texture,disc,view,draws,failures,control};
}

test("Moon and shared planetary wrappers report the exact image only after successful texture submission",()=>{
  for(const body of ["MOON","MERCURY","MARS","JUPITER","SATURN","URANUS","NEPTUNE"]){
    const h=fixture(),painted:object[]=[];
    const result=body==="MOON"?h.renderer.moon(h.disc,h.view,false,h.image,(image:object)=>painted.push(image)):
      h.renderer.planet({...h.disc,body},h.view,"#FFFFFF",false,h.image,(image:object)=>painted.push(image));
    assert.equal(result,true);assert.equal(h.draws.length,1,JSON.stringify({body,parameters:skyArtworkViewParameters(h.view,100,100),failures:h.failures}));assert.equal(h.draws[0]!.u_image,h.texture);
    assert.equal(painted.length,1,body);assert.equal(painted[0],h.image);
  }
});

test("successful base-disc fallback never reports an image on missing, failed, unresolved or red-mode texture",()=>{
  for(const mode of ["missing","upload","draw","compile","unresolved","red","venus"]){
    const h=fixture(),painted:object[]=[];
    if(mode==="upload")h.control.upload=false;
    if(mode==="draw")h.control.error=1282;
    if(mode==="compile")h.control.compile=false;
    const disc=mode==="unresolved"?{...h.disc,radiusPx:2}:h.disc;
    const source=mode==="missing"?null:h.image;
    const callback=(image:object)=>painted.push(image);
    assert.equal(mode==="venus"?h.renderer.planet({...disc,body:"VENUS"},h.view,"#FFFFFF",false,source,callback):
      h.renderer.moon(disc,h.view,mode==="red",source,callback),true);
    assert.equal(painted.length,0,mode);
    if(mode==="draw"||mode==="compile")assert.equal(h.failures[0],h.image);
  }
});

test('internal body shader recovery reuses the current renderer and independent bitmap',()=>{
  const h=fixture(),painted:object[]=[];
  h.control.compile=false;
  h.renderer.moon(h.disc,h.view,false,h.image,(image:object)=>painted.push(image));
  assert.equal(painted.length,0);assert.equal(h.failures[0],h.image);
  h.control.compile=true;
  h.renderer.moon(h.disc,h.view,false,h.image,(image:object)=>painted.push(image));
  assert.equal(painted.length,0,'the shader failure stays latched until explicit recovery');
  h.renderer.resetBodyImages();
  h.renderer.planet({...h.disc,body:'JUPITER'},h.view,'#FFFFFF',false,h.image,(image:object)=>painted.push(image));
  assert.deepEqual(painted,[h.image]);assert.equal(h.draws[0]!.u_image,h.texture);

});

test("Scene preserves submitted body identity and rejects fallback, wrong, failed or retired deliveries",()=>{
  const at="2026-10-01T16:30:00.000Z",d=Math.SQRT1_2;
  const basis={right:[1,0,0],up:[0,-d,d],forward:[0,d,d]} as const;
  const report={hourly:[{at,sunAzimuthDeg:90,sunAltitudeDeg:0,
    moonAzimuthDeg:0,moonAltitudeDeg:45,moonAngularDiameterDeg:.5,moonIllumination:.6,
    planets:SKY_PLANET_ORDER.map(body=>({body,azimuthDeg:0,altitudeDeg:45,angularDiameterDeg:.05,
      illuminatedFraction:.6,visualMagnitude:0,ringTiltDeg:null,ringPoleEnu:null}))}],
    skyScene:{state:"UNAVAILABLE",frames:[]}} as unknown as ResolvedSkyReport;
  for(const mode of ["normal","fallback","wrong","failed","retired","red"]){
    const image={},wrong={};let live=true;
    registerSkyNativeImageLifetime(image,()=>live);
    let result:SkyScenePaintedSources|undefined;
    const sourceMethod=(source:object|null|undefined,callback?: (image:object)=>void)=>{
      if(source&&mode!=="fallback")callback?.(mode==="wrong"?wrong:source);
      return mode!=="failed";
    };
    const surface=new Proxy({}, {get(_target,key){
      if(key==="moon")return (_disc:unknown,_view:unknown,_red:boolean,source:object|null|undefined,callback?: (image:object)=>void)=>sourceMethod(source,callback);
      if(key==="planet")return (_disc:unknown,_view:unknown,_tint:string,_red:boolean,source:object|null|undefined,callback?: (image:object)=>void)=>sourceMethod(source,callback);
      if(key==="finish")return ()=>{if(mode==="retired")live=false;};
      return ()=>true;
    }}) as SkyRenderSurface;
    drawSkyScene(surface,report,at,null,null,400,800,mode==="red"?"OBSERVATION":"NIGHT",
      (_snapshot,sources)=>{result=sources;},undefined,3,null,basis,undefined,undefined,undefined,undefined,
      undefined,undefined,undefined,undefined,undefined,undefined,undefined,image,image,null,image,image,image,
      null,undefined,image,image,{enabled:false});
    assert(result);
    if(mode==="normal"){
      assert.deepEqual(result.bodyImages?.map(value=>value.reference),
        ["SOLAR:MOON",...SKY_PLANET_ORDER.filter(body=>body!=="VENUS").map(body=>`PLANET:${body}`)]);
      assert(result.bodyImages?.every(value=>value.image===image));
      assert(Object.isFrozen(result.bodyImages));
    }else assert.deepEqual(result.bodyImages,[],mode);
  }
});

test("accepted completion binds the queued publication and rejects another object, bitmap, ambiguity or retirement",()=>{
  const bytes=readFileSync(new URL("../../../../../workers/miniapp-api/assets/moon/coverage-manifest.json",import.meta.url));
  const publication=JSON.parse(bytes.toString("utf8"));
  publication.publicationHash=createHash("sha256").update(bytes).digest("hex");
  publication.image.downloadUrl=`/v2/sky/moon/coverage/${publication.publicationHash}/${publication.image.file}`;
  assertMoonCoverageManifest(publication);
  const image={},nextImage={};let live=true;
  registerSkyNativeImageLifetime(image,()=>live);
  const binding=skyBodyImageBinding("SOLAR:MOON",image,publication)!;
  const paint={reference:"SOLAR:MOON",image} as const;
  const result=completeSkyBodyImages([paint],[binding]);
  assert.equal(result.length,1);assert.equal(result[0]!.publication,publication);
  assert(Object.isFrozen(result));
  assert.equal(skyBodyImageBinding("SOLAR:MOON",null,publication),null);
  assert.equal(skyBodyImageBinding("SOLAR:MOON",image,undefined),null);
  const next=skyBodyImageBinding("SOLAR:MOON",nextImage,structuredClone(publication) as MoonCoverageManifestData)!;
  assert.deepEqual(completeSkyBodyImages([paint],[next]),[],"the latest hook cannot lend its publication to a queued bitmap");
  assert.deepEqual(completeSkyBodyImages([{reference:"PLANET:SATURN",image}],[binding]),[]);
  assert.deepEqual(completeSkyBodyImages([paint,paint],[binding]),[]);
  assert.deepEqual(completeSkyBodyImages([paint],[binding,binding]),[]);
  assert.deepEqual(completeSkyBodyImages(undefined,[binding]),[]);
  assert(sameSkyBodyImages(result,[binding]));assert(!sameSkyBodyImages(result,[next]));
  live=false;
  assert.deepEqual(completeSkyBodyImages([paint],[binding]),[]);
  assert.equal(skyBodyImageBinding("SOLAR:MOON",image,publication),null);
});

test("actual page publishes body metadata only on the matching accepted Canvas attempt",()=>{
  const bytes=readFileSync(new URL("../../../../../workers/miniapp-api/assets/moon/coverage-manifest.json",import.meta.url));
  const publication=JSON.parse(bytes.toString("utf8"));
  publication.publicationHash=createHash("sha256").update(bytes).digest("hex");
  publication.image.downloadUrl=`/v2/sky/moon/coverage/${publication.publicationHash}/${publication.image.file}`;
  assertMoonCoverageManifest(publication);
  const source=ts.createSourceFile("page.tsx",readFileSync(new URL("./spot-sky-page.tsx",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  for(const mode of ["accepted","fallback","wrong-frame","retired","new-canvas"]){
    const image={};let live=true,state:unknown=null;
    registerSkyNativeImageLifetime(image,()=>live);
    const binding=skyBodyImageBinding("SOLAR:MOON",image,publication)!;
    const frame={data:{},frameAt:"2026-10-01T16:30:00Z",mode:"NIGHT",bodyImageBindings:[binding],hipsTiles:[],
      constellations:null,constellationsEnabled:false,nativeImageGeneration:3};
    const owner=skyPagePaintCommit(source,{frame,canvasGenerationRef:{current:3},
      paintedSkyObjectsRef:{current:null},resolvedSkyBodyReferences,
      setPresentedSkyFrame(update:(previous:any)=>any){state=update(state);},
      setPresentedCamera(){},browsingTimerRef:{current:null},camera:{animating:false},
      basis:{right:[1,0,0],up:[0,-1,0],forward:[0,0,1]},fov:3,center:{x:195,y:422},
      orientation:{presented:{current:null}},
    });
    owner.stage(null,{sdssOptical:null,deepSkyImage:null,
      bodyImages:mode==="fallback"?[]:[{reference:"SOLAR:MOON",image}]});
    assert.equal(state,null,"submission alone cannot publish sources");
    if(mode==="retired")live=false;
    if(mode==="new-canvas")(owner.context.canvasGenerationRef as {current:number}).current=4;
    if(mode==="wrong-frame"){
      owner.context.done=()=>owner.accept({...frame},{width:390,height:844});
    }
    owner.complete();
    const accepted=state as {bodyImages:readonly SkyBodyImageBinding[]}|null;
    if(mode==="accepted"){assert(accepted);assert.equal(accepted.bodyImages.length,1);assert.equal(accepted.bodyImages[0]!.publication,publication);}
    else assert.equal(accepted,null,mode);
  }
});
