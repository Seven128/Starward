import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

// Keep the complete production hook's lexical scope. Controlled dependency
// values isolate Query ownership after the component result is discarded;
// they do not emulate React/native retirement or measure phone heap bytes.
const probe = String.raw`
  const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
  const directory=process.argv[1],family=process.argv[2],noop=()=>{};
  const hash='a'.repeat(64),reference='M:51',signal=new AbortController().signal;
  const modes=family==='body'?['moon','mars','mercury','jupiter','saturn','uranus','neptune']:
    family==='optical'?['sdss-legacy','sdss-science','sdss-calibrated','prepared-native-optical-v1']:['deep'];
  const collect=async()=>{await new Promise(setImmediate);global.gc();await new Promise(setImmediate);global.gc();};
  function prepare(mode){
    let query;const weak={},calls=[];
    const result=Promise.resolve({marker:'original-service-result'});
    const service=name=>(...args)=>{calls.push({name,args});return result;};
    const prepared=mode.startsWith('prepared-');
    const namespace=family==='deep'?'infrared':prepared?'prepared':'sdss';
    const publication={objectRef:reference,publicationHash:hash,sourceId:'synthetic',
      ...(mode==='sdss-legacy'?{}:{imageVersion:prepared?mode:mode==='sdss-calibrated'?'sdss-display-optical-v1':'science-optical-v2'}),
      levels:Object.fromEntries(['OVERVIEW','MEDIUM','DETAIL'].map(level=>[level,{fieldDegrees:1,pixels:512,width:512,height:512}]))};
    const resource={publication,isCurrent:()=>true};
    const imageResult=()=>{const image={marker:'native-image'};weak.image=new WeakRef(image);
      const state={images:new Map([[namespace+':'+reference+':OVERVIEW',image]]),retainedImages:new Map()};
      return {...state,image,currentImages:()=>state,failed:false,loading:false,retryImages:noop,failedImage:noop};};
    const react={useMemo:read=>read(),useEffect:effect=>effect(),useRef:value=>({current:value})};
    const adapters={
      react,
      '@/hooks/use-resource-query':{useResourceQuery:options=>{query=options.queryFn;
        return {data:family==='body'?publication:mode==='sdss-legacy'?publication:resource,
          isError:false,isFetching:false,refetch:noop};}},
      '@/services/body-image-client':{getBodyImageManifest:service('body'),bodyImageUrl:value=>value},
      '../../services/deep-sky-image-client':{getDeepSkyImageResource:service('deep')},
      '../../services/bare-sky-resource':{skyResourceUrl:value=>value},
      '@/services/sdss-optical-client':{getSdssOpticalManifest:service('legacy'),sdssOpticalImageUrl:value=>value},
      '@/services/prepared-optical-resource':{getPreparedOpticalResource:service('prepared')},
      '@/services/prepared-optical-client':{preparedOpticalImageUrl:value=>value},
      '@/services/sdss-science-optical-resource':{getSdssScienceOpticalResource:service('science'),getSdssCalibratedOpticalResource:service('calibrated')},
      '@starward/miniapp-contracts':{sdssOpticalPublication:()=>publication,isPreparedOpticalReference:()=>true,
        opticalPublicationReference:p=>p.objectRef,opticalAssetDimensions:()=>({width:512,height:512}),
        isPreparedRenderedOpticalVersion:kind=>kind.startsWith('prepared-')},
      './use-sky-fixed-image':{useSkyFixedImage:imageResult},
      './use-sky-artwork':{useSkyNativeImages:imageResult},
      './use-sky-image-recovery':{useSkyImageRecovery:()=>noop},
      './sky-fixed-image-status':{skyFixedImageStatus:()=>({failed:false,refreshFailed:false})},
      './sky-body-image-completion':{skyBodyImageBinding:(reference,image,publication)=>({reference,image,publication})},
      './sky-moon-disc':{skyMoonDiscAt:()=>({radiusPx:10,surfaceOrientation:{}})},
      './sky-planet-disc':{skyPlanetProjectionsAt:()=>[{radiusPx:10,surfaceOrientation:{}}]},
      './sky-native-image-levels':{skyNativeImageLevels:()=>({primary:'OVERVIEW',coarser:null,fallback:null})},
      './sky-artwork-loader':{skyNativeImageIsCurrent:()=>true},
      './sky-target-image-visibility':{skyDeepSkyImageIntersectsView:()=>true},
      './sky-target-optical-visibility':{skyTargetOpticalIntersectsView:()=>true},
      './sky-sdss-optical-selection':{skyTargetOpticalLevelForView:()=> 'OVERVIEW'},
    };
    const file=family==='body'?'use-sky-body-image.ts':family==='deep'?'use-sky-deep-sky-image.ts':'use-sky-target-optical.ts';
    const exports={};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(directory,file),'utf8'),
      {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,
      {exports,require:name=>{assert(name in adapters,'unexpected dependency '+name);return adapters[name];}});
    (()=>{
      const report={hourly:[{at:'synthetic'}],marker:'render-report'},canvas={marker:'canvas'};
      const view={basis:{},verticalFovDeg:30};
      const footprint={report,view,at:'synthetic',width:390,height:844};
      weak.report=new WeakRef(report);weak.canvas=new WeakRef(canvas);weak.view=new WeakRef(view);
      if(family==='body')exports.useSkyBodyImage({kind:mode,body:mode.toUpperCase(),reference:mode,style:'surface',id:mode,queryKey:[mode]},
        report,'synthetic',view,390,844,canvas,1,true,false);
      else if(family==='deep')exports.useSkyDeepSkyImage(reference,'OVERVIEW',canvas,1,true,footprint,false);
      else exports.useSkyTargetOptical(mode,reference,30,canvas,1,true,hash,footprint,false);
    })();
    return {weak,query:()=>query,calls,result};
  }
  (async()=>{
    for(const mode of modes){const h=prepare(mode);await collect();
      for(const [name,ref] of Object.entries(h.weak))assert.equal(ref.deref(),undefined,mode+' Query must not retain '+name);
      assert.equal(h.query()(signal),h.result,mode+' must return the original service Promise');
      assert.equal(h.calls.length,1);
      const call=h.calls[0];
      const expected=family==='body'?['body',[mode,signal]]:family==='deep'?['deep',[reference,signal]]:
        mode==='sdss-legacy'?['legacy',[signal,reference]]:
        [mode==='sdss-science'?'science':mode==='sdss-calibrated'?'calibrated':'prepared',[reference,hash,signal]];
      assert.equal(call.name,expected[0]);assert.deepEqual(call.args,expected[1]);
      assert.equal(call.args[family==='optical'&&mode==='sdss-legacy'?0:call.args.length-1],signal,
        mode+' must forward the same AbortSignal');
    }
  })().catch(error=>{console.error(error);process.exitCode=1;});
`;

for (const family of ["body", "deep", "optical"]) {
  test(`${family} image metadata Query retains request identity without the retired render graph`, () => {
    const result = spawnSync(process.execPath, ["--expose-gc", "-e", probe,
      fileURLToPath(new URL(".", import.meta.url)), family],
    { encoding: "utf8", timeout: 20_000, windowsHide: true });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
}
