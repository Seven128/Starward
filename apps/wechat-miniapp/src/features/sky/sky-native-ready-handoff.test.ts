import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createSkyArtworkLoader } from "./sky-artwork-loader";
import { createSkyCanvasLifecycle, type CanvasClock } from "./sky-canvas-lifecycle";

// Owner-level regression deliberately holds the React state dispatch. The
// actual loader and Canvas queue run; the complete page supplies React proof.
function nativeFixture() {
  const source=ts.createSourceFile("use-sky-artwork.ts",readFileSync(new URL("./use-sky-artwork.ts",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true);
  const declaration=source.statements.find((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&n.name?.text==="useSkyNativeImages")!;
  const refs:Array<{current:unknown}>=[],effects:Array<()=>void|(()=>void)>=[],cleanups:Array<()=>void>=[],dispatched:unknown[]=[],started:Array<{ready:(value:unknown)=>void;fail:()=>void;asset:{id:string}}>=[];
  let cursor=0;
  const runtime={useRef:(value:unknown)=>refs[cursor++]??(refs[cursor-1]={current:value}),useState:()=>[null,(value:unknown)=>dispatched.push(value)],
    useEffect:(run:()=>void|(()=>void))=>effects.push(run),useCallback:(run:unknown)=>run,createSkyArtworkLoader,
    startSkyArtworkRequest:(input:any)=>{started.push(input);return ()=>{};},acquirePublishedSkyImage(){throw Error("request stub owns this unit boundary");}};
  const hook=vm.runInNewContext(ts.transpileModule(source.statements.filter(ts.isVariableStatement).map(n=>n.getText(source)).join("\n")+"\n"+declaration.getText(source).replace(/^export\s+/u,"")+"\nuseSkyNativeImages;",{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,runtime);
  const canvas={},asset={id:"skymapper-dr4:8:401329",sha256:"a".repeat(64),width:512,height:512,bytes:100};
  const render=(revision=3,hash="b".repeat(64),active=true,selectedCanvas=canvas,paused=false)=>{cursor=0;return hook(selectedCanvas,revision,hash,active,[asset],()=>({url:"https://approved.fixture.invalid/tile",format:"png"}),20*1024*1024,[],undefined,paused);};
  const result=render();for(const run of effects.splice(0)){const cleanup=run();if(cleanup)cleanups.push(cleanup);}
  let released=0;const image={},retireCallbacks=new Set<()=>void>();
  const complete=()=>started[0]!.ready({image,isCurrent:()=>true,release:()=>released++,onRetire:(fn:()=>void)=>{retireCallbacks.add(fn);return()=>retireCallbacks.delete(fn);}});
  const current=(value=result)=>value.currentImages?.()??value;
  return {asset,image,result,render,complete,current,started,dispatched,cleanup:()=>cleanups.forEach(fn=>fn()),retire:()=>[...retireCallbacks].forEach(fn=>fn()),released:()=>released};
}

test("native ready snapshot is available before React publishes its queued state",()=>{
  const h=nativeFixture();assert.equal(h.current().images.size,0);h.complete();
  assert(h.dispatched.length>0);assert.equal(h.result.images.size,0,"the queued React view remains the original empty snapshot");
  assert.equal(h.current().images.get(h.asset.id),h.image,"the live native owner must already expose the exact qualified bitmap");
  h.retire();assert.equal(h.current().images.size,0,"native retirement removes the immediate snapshot too");assert.equal(h.released(),1);
  h.cleanup();assert.equal(h.released(),1);
});

test("a reader captured on Sources follows current pause state without crossing image ownership",()=>{
  const h=nativeFixture();h.complete();
  const paused=h.render(3,"b".repeat(64),true,undefined,true);
  assert.equal(h.current(paused).images.size,0,"hidden work cannot read a paused owner");
  h.render();
  assert.equal(h.current(paused).images.get(h.asset.id),h.image,"a retained reader must expose the same qualified image after Sources resumes");
  h.render(4);assert.equal(h.current(paused).images.size,0,"resuming never authorizes an old Canvas revision");
  h.cleanup();assert.equal(h.released(),1);
});

test("the page resumes Canvas from its visible render instead of native onShow's hidden render",()=>{
  const page=ts.createSourceFile("spot-sky-page.tsx",readFileSync(new URL("./spot-sky-page.tsx",import.meta.url),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let resume:ts.Expression|undefined;
  function visit(node:ts.Node){if(ts.isCallExpression(node)&&node.expression.getText(page)==="useEffect"&&node.arguments[0]?.getText(page).includes("canvasLifecycle.show()"))resume=node.arguments[0];
    if(ts.isCallExpression(node)&&node.expression.getText(page)==="useDidShow")assert(!node.arguments[0]?.getText(page).includes("canvasLifecycle.show()"),"native onShow must not paint before visible React scope");ts.forEachChild(node,visit);}visit(page);assert(resume);
  let shows=0;const scope=vm.createContext({pageVisible:false,canvasLifecycle:{show(){shows++;}}});const run=vm.runInContext(ts.transpileModule(`(${resume.getText(page)})`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,scope);
  run();assert.equal(shows,0);scope.pageVisible=true;run();assert.equal(shows,1);
});

test("queued native snapshot readers cannot cross active, Canvas revision or publication scope",()=>{
  for(const boundary of ["hidden","revision","publication","canvas"]){const h=nativeFixture();h.complete();assert.equal(h.current().images.size,1);
    const next=h.render(boundary==="revision"?4:3,boundary==="publication"?"c".repeat(64):"b".repeat(64),boundary!=="hidden",boundary==="canvas"?{}:undefined);
    assert.equal(h.current().images.size,0,"old queued reader rejects a newly rendered scope before its effects run: "+boundary);
    assert.equal(h.current(next).images.size,0);h.cleanup();assert.equal(h.current().images.size,0);
  }
});

test("native failure and disposal do not leave a ready snapshot or retain a late result",()=>{
  const h=nativeFixture();h.started[0]!.fail();assert.equal(h.current().failed,true);assert.equal(h.current().images.size,0);
  h.cleanup();assert.equal(h.current().images.size,0);h.complete();assert.equal(h.current().images.size,0);assert.equal(h.released(),1);
});

test("single Canvas writer resolves a queued empty frame from its live owner before paint",()=>{
  const h=nativeFixture(),jobs:Array<()=>void>=[];const clock:CanvasClock={schedule(run,delay){if(delay===0)jobs.push(run);return run;},cancel(){}};
  type Frame={images:ReadonlyMap<string,object>;at:string};const queued:Frame={images:h.result.images,at:"2026-10-06T13:00:00Z"};let painted:Frame|undefined,presented:Frame|undefined,resolves=0;
  const owner=createSkyCanvasLifecycle<Frame,object>({measure:done=>done({width:390,height:844}),createContext:()=>({}),
    resolveFrame:frame=>{resolves++;return {...frame,images:h.current().images};},
    paint:(_context,frame,_size,done)=>{painted=frame;done();},presented:frame=>{presented=frame;},invalidated(){},failed(error){throw error;}},clock);
  owner.ready();owner.request(queued);h.complete();jobs.shift()!();
  assert.equal(resolves,1);assert.equal(painted!.images.get(h.asset.id),h.image,"already-qualified source must participate in this timer's actual draw");
  assert.equal(presented,painted,"completion and draw use the same resolved frame");assert.equal(presented!.at,queued.at);assert.equal(queued.images.size,0,"do not mutate the captured React frame");assert.equal(jobs.length,0,"snapshot resolution does not create a rendering loop");
  owner.dispose();h.cleanup();
});

test("Canvas snapshot resolution failure retires its context once and is retryable",()=>{
  const jobs:Array<()=>void>=[],clock:CanvasClock={schedule(run,delay){if(delay===0)jobs.push(run);return run;},cancel(){}};
  let throws=true,released=0,paints=0,errors=0;
  const owner=createSkyCanvasLifecycle<number,object>({measure:done=>done({width:390,height:844}),createContext:()=>({}),releaseContext:()=>released++,
    resolveFrame:frame=>{if(throws)throw Error("snapshot-unavailable");return frame;},paint:(_context,_frame,_size,done)=>{paints++;done();},presented(){},invalidated(){},failed(){errors++;}},clock);
  owner.ready();owner.request(1);jobs.shift()!();assert.equal(errors,1);assert.equal(released,1);assert.equal(paints,0);
  throws=false;owner.retry();jobs.shift()!();assert.equal(paints,1);owner.dispose();assert.equal(released,2);
});

test("hide fences a queued native snapshot reader before it can inspect or draw",()=>{
  let queued:()=>void=()=>{},reads=0,paints=0;
  const clock:CanvasClock={schedule(run,delay){if(delay===0)queued=run;return run;},cancel(){}};
  const owner=createSkyCanvasLifecycle<number,object>({measure:done=>done({width:390,height:844}),createContext:()=>({}),
    resolveFrame:frame=>{reads++;return frame;},paint(){paints++;},presented(){},invalidated(){},failed(error){throw error;}},clock);
  owner.ready();owner.request(1);owner.hide();queued();assert.equal(reads,0);assert.equal(paints,0);owner.dispose();
});
