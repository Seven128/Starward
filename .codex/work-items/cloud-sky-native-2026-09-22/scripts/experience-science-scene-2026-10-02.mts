import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const root=process.cwd(),task='.codex/work-items/cloud-sky-native-2026-09-22/';
const source=task+'scripts/experience-science-scene-browser-2026-10-02.ts';
const argument=process.argv.find(arg=>arg.startsWith('--output='))?.slice(9);assert(argument,'exclusive output required');
const onlyNames=process.argv.find(arg=>arg.startsWith('--only='))?.slice(7).split(',');
if(onlyNames){assert(onlyNames.length>0&&onlyNames.length<=2);assert.equal(new Set(onlyNames).size,onlyNames.length);
  assert(onlyNames.every(name=>['no-intent','late-opaque'].includes(name)),'bounded repair runs only affected cases');}
const output=path.resolve(argument),relative=path.relative(root,output).replaceAll('\\','/');
assert(relative.startsWith('output/playwright/')&&!relative.includes('..'));await assert.rejects(fs.access(output),{code:'ENOENT'});await fs.mkdir(output,{recursive:true});
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const bind=async file=>{const bytes=await fs.readFile(path.resolve(root,file));return{path:file.replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)};};
const write=(name:string,data:any)=>fs.writeFile(path.join(output,name),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const publicationPath='output/sdss-science-optical-writer-1002-r1/publication/manifest.json';
const reportPath=task+'tmp/current-native-report-2026-10-01.json';
const timePath='output/playwright/cloud-sky-sdss-level-composition-1002-r3/result.json';
const w3ManifestPath='workers/miniapp-api/assets/deep-sky/manifest.json';
const preservedPath=task+'tmp/resume-preserved-hashes-2026-10-01.json';
let browser:any=null,before:any[]=[],after:any[]=[],observed:any=null;
try{
  const publication=JSON.parse(await fs.readFile(publicationPath,'utf8'));
  assert.equal(publication.publicationHash,'34015aff7ebbbaa7ddabc0a100844c802ebc7f860d5d15b076dd0f169cffc1a0');
  const report=JSON.parse(await fs.readFile(reportPath,'utf8')).data;
  const at=JSON.parse(await fs.readFile(timePath,'utf8')).rows.find(row=>row.name==='night-real-pair')?.at;assert(at);
  assert(report.observationFrames.some(frame=>frame.at===at));
  const w3Publication=JSON.parse(await fs.readFile(w3ManifestPath,'utf8'));
  const w3Entry=w3Publication.entries.find(entry=>entry.objectRef===publication.objectRef);assert(w3Entry);
  const w3Asset=w3Entry.levels.DETAIL;
  const files=[path.relative(root,fileURLToPath(import.meta.url)),source,publicationPath,reportPath,timePath,w3ManifestPath,preservedPath],images:any[]=[];
  for(const [id,asset] of [...Object.entries(publication.levels),['W3',w3Asset]] as any[]){
    const file=path.join(id==='W3'?'workers/miniapp-api/assets/deep-sky':path.dirname(publicationPath),asset.file).replaceAll('\\','/');
    const bytes=await fs.readFile(file);assert.equal(sha(bytes),asset.sha256);assert.equal(bytes.length,asset.bytes);files.push(file);
    images.push({id,file,sha256:asset.sha256,bytes:asset.bytes,data:'data:image/'+(asset.format==='png'||id!=='W3'?'png':'jpeg')+';base64,'+bytes.toString('base64')});
  }
  const preserved=JSON.parse(await fs.readFile(preservedPath,'utf8'));files.push(...preserved.map(entry=>entry.path));
  const bundle=await build({entryPoints:[source],absWorkingDir:root,bundle:true,write:false,metafile:true,format:'iife',globalName:'scienceSceneTrial',platform:'browser',target:'es2022',tsconfig:path.resolve('apps/wechat-miniapp/tsconfig.json')});
  for(const file of Object.keys(bundle.metafile!.inputs)){const relativePath=path.relative(root,path.resolve(root,file)).replaceAll('\\','/');assert(relativePath&&!relativePath.startsWith('..'));files.push(relativePath);}
  const code=bundle.outputFiles[0]!.text;await fs.writeFile(path.join(output,'executed-bundle.js'),code,{flag:'wx'});
  before=await Promise.all([...new Set(files)].map(bind));for(const entry of preserved)assert.equal(before.find(item=>item.path===entry.path)?.sha256,entry.sha256);
  await write('inputs-before.json',{before,metafile:bundle.metafile,bundle:{bytes:Buffer.byteLength(code),sha256:sha(code)}});
  await write('prepared-input.json',{publicationHash:publication.publicationHash,at,reportBinding:before.find(item=>item.path===reportPath),
    images:images.map(({data,...entry})=>entry),policy:{auxiliaryBytesLimit:15803512,maxGroups:1},
    onlyNames:onlyNames??null,scope:'Actual cached science/W3 files and report. No source acquisition; synthetic source pixels are generated explicitly by the bound browser script.'});
  const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors:string[]=[];
  page.on('pageerror',(error:any)=>errors.push(String(error)));await page.setContent('<style>body{margin:0}</style><canvas width="390" height="844"></canvas>');await page.addScriptTag({content:code});
  observed=await page.evaluate(input=>(globalThis as any).scienceSceneTrial.run(input),{publication,report,at,w3Asset,images,onlyNames});
  const captures:any[]=[];
  for(const capture of observed.captures){
    const stem=capture.name;await fs.writeFile(path.join(output,stem+'.rgba'),Buffer.from(capture.rgba,'base64'),{flag:'wx'});
    await fs.writeFile(path.join(output,stem+'.png'),Buffer.from(capture.png.split(',')[1],'base64'),{flag:'wx'});
    captures.push({name:capture.name,width:capture.width,height:capture.height,raw:await bind(relative+'/'+stem+'.rgba'),png:await bind(relative+'/'+stem+'.png')});
  }
  const observations={...observed,captures,pageErrors:errors};await write('observations.json',observations);await page.close();
  after=await Promise.all(before.map(entry=>bind(entry.path)));assert.deepEqual(after,before);await write('inputs-after.json',{after,unchanged:true});
  const comparisons:any[]=[];
  for(const [a,b] of [['actual-pair','probe-budget-denied'],['no-intent','complete-ready-empty'],['no-intent','whole-unsubmitted']]){
    const first=captures.find(capture=>capture.name===a),second=captures.find(capture=>capture.name===b);
    if(onlyNames)continue;assert(first&&second);
    const x=await fs.readFile(path.resolve(root,first.raw.path)),y=await fs.readFile(path.resolve(root,second.raw.path));let unequal=0;
    for(let i=0;i<x.length;i++)if(x[i]!==y[i])unequal++;
    comparisons.push({name:a+'→'+b,bytes:x.length,unequal,pass:x.length===y.length&&unequal===0});
  }
  const allPassed=!observed.failure&&errors.length===0&&observed.checks.every(check=>check.pass)&&comparisons.every(comparison=>comparison.pass)&&!observed.final.contextLost&&observed.final.glError===0&&Object.values(observed.final.counts).every(value=>value===0);
  const result={allPassed,scope:observed.scope,observations:await bind(relative+'/observations.json'),before,after,comparisons,
    limitation:'Software WebGL actual Scene task opt-in only. Other optional imagery absent, source color/PSF not adopted, natural aid fade/native total resources and ordinary default enablement remain open.'};
  await write('result.json',result);console.log(JSON.stringify({output:relative,result:await bind(relative+'/result.json'),allPassed,
    failed:observed.checks.filter(check=>!check.pass),failure:observed.failure,rows:observed.rows.map(row=>({name:row.name,error:row.error,fields:row.published?.sources.optical?.fields,infrared:row.published?.sources.infrared})),comparisons}));
  assert(allPassed,'actual Scene integration controls failed; complete generation retained');
}catch(error){await write('failed.json',{error:String(error),before,after,observedFailure:observed?.failure});throw error;}finally{await browser?.close();}
