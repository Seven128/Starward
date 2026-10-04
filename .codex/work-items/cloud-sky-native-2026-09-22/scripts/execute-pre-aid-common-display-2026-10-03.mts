/** Consume the independently reviewed frozen R3 bundle once; no rebuilding. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const root=process.cwd(),arg=(key:string)=>process.argv.find(a=>a.startsWith('--'+key+'='))?.slice(key.length+3);
const prepared=arg('prepared'),relative=arg('output');assert(prepared==='output/pre-aid-common-display-candidate-1003-r3');
assert(relative?.startsWith('output/playwright/cloud-sky-pre-aid-common-display-')&&!relative.includes('..'));
const output=path.resolve(root,relative);assert(!fs.existsSync(output),'exclusive output');fs.mkdirSync(output,{recursive:true});
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex'),read=(p:string)=>fs.readFileSync(path.resolve(root,p)),json=(p:string)=>JSON.parse(read(p).toString());
const bind=(p:string)=>{const resolved=fs.realpathSync(path.resolve(root,p)),bytes=fs.readFileSync(resolved);return{path:p.replaceAll('\\','/'),resolved:resolved.replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)};};
const save=(name:string,value:any)=>fs.writeFileSync(path.join(output,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const self=path.relative(root,fileURLToPath(import.meta.url)).replaceAll('\\','/');fs.copyFileSync(fileURLToPath(import.meta.url),path.join(output,'executed-script.mts.txt'));
let browser:any=null,observed:any=null,before:any[]=[];
try {
 const frozen=json(prepared+'/result.json');assert.equal(frozen.status,'PREPARED_FOR_STATIC_REVIEW');
 assert.equal(bind(prepared+'/result.json').sha256,'db7b8d21cbf59eaaacb6ec07e13bf44858afdb09e570d76a1e037cfe01a814a2');
 before=frozen.before.map((row:any)=>bind(row.path));assert.deepEqual(before,frozen.before);
 for(const key of ['browser','bundle','metafile','runtimeInput'])assert.deepEqual(bind(frozen[key].path),frozen[key]);
 for(const replacement of frozen.replacements)assert.deepEqual(bind(replacement.candidate.path),replacement.candidate);
 const executable=bind(frozen.toolchain.browser.executable),node=bind(process.execPath);
 assert(before.some(row=>row.resolved===executable.resolved&&row.sha256===executable.sha256));
 assert(before.some(row=>row.resolved===node.resolved&&row.sha256===node.sha256));
 const beforeExtra=[self,prepared+'/result.json',...['browser','bundle','metafile','runtimeInput'].map(k=>frozen[k].path),...frozen.replacements.map((r:any)=>r.candidate.path)].map(bind);
 save('input-binding.json',{before,extra:beforeExtra,executable,node,preparedResult:bind(prepared+'/result.json')});
 const pwPath='C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',require=createRequire(path.join(pwPath,'package.json')),{chromium}=require(pwPath);
 browser=await chromium.launch({headless:true,executablePath:frozen.toolchain.browser.executable,args:['--use-gl=angle','--use-angle=swiftshader']});
 save('browser-version.json',{actual:browser.version(),executable,node,scope:'Explicit bound Chrome/software ANGLE SwiftShader. No native precision/cost/target-runtime claim.'});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors:string[]=[];
 page.on('pageerror',(e:any)=>errors.push(String(e)));await page.setContent('<style>body{margin:0}</style><canvas width="390" height="844"></canvas>');
 await page.addScriptTag({content:read(frozen.bundle.path).toString()});
 observed=await page.evaluate(input=>(globalThis as any).preAidCommonDisplayTrial.run(input),json(frozen.runtimeInput.path));
 const captures:any[]=[];
 for(const capture of observed.captures){
   fs.writeFileSync(path.join(output,capture.name+'.rgba'),Buffer.from(capture.rgba,'base64'),{flag:'wx'});
   fs.writeFileSync(path.join(output,capture.name+'.png'),Buffer.from(capture.png.split(',')[1],'base64'),{flag:'wx'});
   captures.push({name:capture.name,width:capture.width,height:capture.height,rgba:bind(relative+'/'+capture.name+'.rgba'),png:bind(relative+'/'+capture.name+'.png')});
 }
 save('observations.json',{...observed,captures,pageErrors:errors});await page.close();
 const after=before.map(row=>bind(row.path)),afterExtra=beforeExtra.map(row=>bind(row.path));assert.deepEqual(after,before);assert.deepEqual(afterExtra,beforeExtra);save('inputs-after.json',{after,extra:afterExtra});
 const allPassed=!observed.failure&&errors.length===0&&observed.checks.every((check:any)=>check.pass)&&observed.unexpectedTimers===0&&
   observed.final.glError===0&&!observed.final.contextLost&&Object.values(observed.final.counts).every(value=>value===0);
 save('result.json',{status:allPassed?'BOUNDED_MODEL_DISPLAY_PATH_PASS':'MEASURED_WITH_FAILURES',allPassed,scope:observed.scope,
   before,after,extra:beforeExtra,observations:bind(relative+'/observations.json'),browser:bind(relative+'/browser-version.json'),
   limits:['Five pose software scale/return path is not native continuous gestures, animation, WXML or full product acceptance.',
     'Exact renderer-region shader-model display guard; physical registration and science availability remain independent UNKNOWN.',
     '24–96 candidate curve not adopted. Current production/default/auxiliary budget unchanged; no diagnostics approved for production.',
     'Fixed ready pair and controlled React/Taro/lease acquisition/clock; real Hooks/HTTP/fallback qualification are outside this lane.',
     'GL resources/delete requests/readbacks are logical observations, not driver/RSS/GC/native performance/200DAU capacity.']});
 console.log(JSON.stringify({allPassed,failure:observed.failure,failed:observed.checks.filter((check:any)=>!check.pass),captures:captures.length,
   rows:observed.rows.map((row:any)=>({name:row.name,opacity:row.opacity,label:row.label,ring:row.ring,error:row.error,rejected:row.rejected})),result:bind(relative+'/result.json')}));
 assert(allPassed,'bounded candidate failed; exact generation preserved');
}catch(error){save('failed.json',{error:String(error),before,observedFailure:observed?.failure});throw error;}finally{await browser?.close();}
