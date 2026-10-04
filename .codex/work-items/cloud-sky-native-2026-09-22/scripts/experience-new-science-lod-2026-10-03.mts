import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {assertSdssScienceOpticalManifest} from '../../../../packages/miniapp-contracts/src/sdss-science-optical-publication';

const ROOT=process.cwd(),TASK='.codex/work-items/cloud-sky-native-2026-09-22/';
const OUT='output/playwright/cloud-sky-new-science-lod-1003-r1';
await assert.rejects(access(OUT),{code:'ENOENT'});await mkdir(OUT,{recursive:true});
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const bind=async(file:string)=>{const bytes=await readFile(file);return{path:file.replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)};};
const save=(name:string,value:any)=>writeFile(path.join(OUT,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const source=TASK+'scripts/experience-new-science-lod-browser-2026-10-03.ts';
const files=[source,TASK+'scripts/experience-new-science-lod-2026-10-03.mts','apps/wechat-miniapp/tsconfig.json'];
const datasets:any[]=[];
for(const entry of [{name:'partial-fixed',directory:'output/partial-science-publication-1003-r1',manifestSha:'5a8696100a2ccc6e1279a720a731252a9262f378644f12aaa9ed919704962163',hash:'12b07bb699f494abbb8ecc95a523d5f65f6cb511839bc7d18cb958a0d795129a'},
 {name:'frozen-zscale',directory:'output/frozen-zscale-publication-1003-r1',manifestSha:'8679b44e97e4b51a6893239d49db1b3931ac12b79c9692d91086f5190f9f0368',hash:'3f98c194d5ab2ea8935a0eb87c37fbc23d4a8fee5f1f7539a72e7c9b0e7acf7b'}]){
 const manifestPath=entry.directory+'/manifest.json',raw=await readFile(manifestPath);assert.equal(sha(raw),entry.manifestSha);
 const publication=JSON.parse(raw.toString());assertSdssScienceOpticalManifest(publication,'M:51',entry.hash);files.push(manifestPath);
 const data:any={};for(const[level,asset]of Object.entries(publication.levels) as any){
  const file=entry.directory+'/'+asset.file,bytes=await readFile(file);assert.equal(bytes.length,asset.bytes);assert.equal(sha(bytes),asset.sha256);
  files.push(file);data[level]='data:image/png;base64,'+bytes.toString('base64');
 }
 datasets.push({name:entry.name,publication,data});
}
const reportFile=TASK+'tmp/current-native-report-2026-10-01.json';
const timeFile='output/playwright/cloud-sky-sdss-level-composition-1002-r3/result.json';
const report=JSON.parse(await readFile(reportFile,'utf8')).data;
const at=JSON.parse(await readFile(timeFile,'utf8')).rows.find((row:any)=>row.name==='night-real-pair')?.at;
assert(at&&report.observationFrames.some((frame:any)=>frame.at===at));files.push(reportFile,timeFile);
const protectedRows=JSON.parse(await readFile(TASK+'tmp/resume-preserved-hashes-2026-10-01.json','utf8'));
files.push(...protectedRows.map((entry:any)=>entry.path));
const parsed=new Map<string,any>();
const bundle=await build({entryPoints:[source],absWorkingDir:ROOT,bundle:true,write:false,metafile:true,format:'iife',globalName:'newScienceLod',platform:'browser',target:'es2022',tsconfig:'apps/wechat-miniapp/tsconfig.json',
 plugins:[{name:'bind-parsed-source',setup(api){api.onLoad({filter:/\.(?:[cm]?js|tsx?|json)$/},async args=>{
  const bytes=await readFile(args.path),relative=path.relative(ROOT,args.path).replaceAll('\\','/');
  assert(!relative.startsWith('..'));parsed.set(relative,{path:relative,bytes:bytes.length,sha256:sha(bytes)});
  const extension=path.extname(args.path).slice(1);return{contents:bytes.toString('utf8'),loader:extension==='json'?'json':extension==='tsx'?'tsx':extension==='ts'?'ts':'js',resolveDir:path.dirname(args.path)};
 });}}]});
files.push(...parsed.keys());const before=await Promise.all([...new Set(files)].map(bind));
for(const entry of protectedRows)assert.equal(before.find(row=>row.path===entry.path)?.sha256,entry.sha256);
for(const entry of parsed.values())assert.deepEqual(before.find(row=>row.path===entry.path),entry);
await writeFile(path.join(OUT,'executed-bundle.js'),bundle.outputFiles[0].contents,{flag:'wx'});
await writeFile(path.join(OUT,'executed-browser-source.ts'),await readFile(source),{flag:'wx'});
await save('inputs-before.json',before);await save('bundle-metafile.json',bundle.metafile);
const {chromium}=createRequire(import.meta.url)('C:/Users/777/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const launch={headless:true,args:['--use-gl=angle','--use-angle=swiftshader']};
const browser=await chromium.launch(launch);let observed:any,error:any;
const pageErrors:string[]=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',(value:any)=>pageErrors.push(String(value)));
 await page.setContent('<!doctype html><canvas style="width:390px;height:844px"></canvas>');await page.addScriptTag({content:bundle.outputFiles[0].text});
 observed=await page.evaluate((input:any)=>(globalThis as any).newScienceLod.run(input),{datasets,report,at});
 for(const capture of observed.captures){
  await writeFile(path.join(OUT,capture.name+'.rgba'),Buffer.from(capture.rgba,'base64'),{flag:'wx'});
  await writeFile(path.join(OUT,capture.name+'.png'),Buffer.from(capture.png.split(',')[1],'base64'),{flag:'wx'});
 }
 const captures=await Promise.all(observed.captures.map(async(c:any)=>({name:c.name,width:c.width,height:c.height,raw:await bind(OUT+'/'+c.name+'.rgba'),png:await bind(OUT+'/'+c.name+'.png')})));
 await save('observations.json',{...observed,captures,pageErrors});
 await save('toolchain.json',{node:process.version,browser:browser.version(),launch,executable:chromium.executablePath(),scope:'Bundled software WebGL reproducible trial; not native.'});
 assert.deepEqual(observed.failures,[]);assert.deepEqual(pageErrors,[]);assert(!observed.contextLost);
 assert(Object.values(observed.final.counts).every(count=>count===0));
 const comparisons:any[]=[];
 for(const row of observed.rows.filter((row:any)=>!row.baseline)){
  const pixels=await readFile(OUT+'/'+row.name+'.rgba'),baseline=await readFile(OUT+'/'+row.name+'-baseline.rgba');
  let differentPixels=0,maxDelta=0;for(let i=0;i<pixels.length;i+=4){let different=false;for(let k=0;k<3;k++){const delta=Math.abs(pixels[i+k]!-baseline[i+k]!);maxDelta=Math.max(maxDelta,delta);different ||= delta>0;}differentPixels+=Number(different);}
  if(row.condition.mode==='OBSERVATION'){
   // The controlling Sky contract explicitly suppresses survey imagery in
   // red mode. Retained image intent cannot claim a painted source there.
   assert.equal(differentPixels,0);assert.equal(row.completed,null);
  }else{
   assert(differentPixels>0,'real image must affect actual ordinary-mode output');
   assert(row.completed&&row.completed.publicationHash===datasets.find(item=>item.name===row.dataset).publication.publicationHash);
   assert(row.completed.fields.length>0&&row.completed.fields.every((field:any)=>field.assetExact&&field.nativeExact));
  }
  comparisons.push({name:row.name,differentPixels,maxDelta,sourceFields:row.completed?.fields??[]});
 }
 for(const dataset of datasets){
  const retired=await readFile(OUT+'/'+dataset.name+'-retired-detail.rgba');
  const parent=await readFile(OUT+'/'+dataset.name+'-medium-only-rotated.rgba');assert.deepEqual(retired,parent,'retired actual fine must preserve exact current medium pixels');
  const row=observed.rows.find((row:any)=>row.name===dataset.name+'-retired-detail');
  assert.deepEqual(row.imageFailures,['DETAIL']);assert(row.completed.fields.every((field:any)=>field.level==='MEDIUM'));
 }
 const after=await Promise.all(before.map(entry=>bind(entry.path)));assert.deepEqual(before,after);await save('inputs-after.json',after);
 const result={status:'ACTUAL_NEW_V3_SCENE_OUTPUT_DEVELOPMENT_NOT_QUALITY_ACCEPTANCE',at,comparisons,final:observed.final,
  peakLogicalRgbaTextureBytes:observed.peakLogicalRgbaTextureBytes,rows:observed.rows,captures,
  inputsUnchanged:true,retiredFineExactMediumFallback:true,observations:await bind(OUT+'/observations.json'),
  limitation:observed.scope+' Full image quality/seams/color/PSF/weak structure and source Back still require assessment; no default, new reference processing, physical device or whole-miniapp resource claim.'};
 await save('result.json',result);console.log(JSON.stringify({result:await bind(OUT+'/result.json'),comparisons,final:observed.final,peakLogicalRgbaTextureBytes:observed.peakLogicalRgbaTextureBytes}));
}catch(value){error=String(value);await save('failed.json',{error,pageErrors,observed:observed?{rows:observed.rows,failures:observed.failures}:null});throw value;}
finally{await browser.close();}
