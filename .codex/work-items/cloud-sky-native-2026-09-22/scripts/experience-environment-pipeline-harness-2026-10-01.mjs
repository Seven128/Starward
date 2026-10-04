// Reuse the existing real-scene composition harness, preserving its history.
// This produces a task-local repeatable trial script, not application code.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const task='.codex/work-items/cloud-sky-native-2026-09-22';
let source=await fs.readFile(task+'/scripts/experience-environment-composition-2026-09-30.mts','utf8');
const replace=(before,after)=>{assert.equal(source.split(before).length,2,before.slice(0,80));source=source.replace(before,after);};
replace('cloud-sky-environment-composition-0930-r3','cloud-sky-environment-pipeline-1001');
replace("tmp/v53-current-public-report.json","tmp/current-native-report-2026-10-01.json");
replace('const inputRecords:any[]=[];','const inputRecords:any[]=[];\nconst prior=JSON.parse(await fs.readFile(\'output/playwright/cloud-sky-environment-composition-0930-r3/result.json\',\'utf8\'));');
replace("  const reply=await fetch('http://127.0.0.1:60065'+route,{signal:AbortSignal.timeout(15000)});",`  const pathname=route.split('?')[0],file=path.basename(pathname);
  const local=pathname.includes('/constellations/')&&pathname.includes('/assets/')?'workers/miniapp-api/assets/constellations/'+file:
    pathname.includes('/sky/landscape/')&&file!=='manifest'?'workers/miniapp-api/assets/landscape/'+file:
    pathname.includes('/sky/galactic/')&&file!=='manifest'?'workers/miniapp-api/assets/deep-sky/galactic-2mass/'+file:null;
  if(local){
    const record=prior.inputRecords.find((record:any)=>record.route===route);assert(record,'existing publication binding required');
    const bytes=await fs.readFile(local);assert.equal(sha(bytes),record.sha256);assert.equal(bytes.length,record.bytes);
    inputRecords.push({...record,transport:'BOUND_LOCAL_PUBLICATION_BYTES',path:local});return bytes;
  }
  const reply=await fetch('http://127.0.0.1:60065'+route,{signal:AbortSignal.timeout(15000)});`);
replace("const replacements=Object.fromEntries(await Promise.all(['sky-gpu-renderer','sky-landscape'].map(async name=>[name,await fs.readFile(task+'/tmp/v53-'+name+'-before.ts','utf8')])));",`const replacements={before:await fs.readFile(task+'/tmp/environment-transfer-before-renderer-2026-10-01.ts','utf8'),
  current:await fs.readFile('output/playwright/cloud-sky-twilight-pipeline-1001/experiment-renderer.ts','utf8')};`);
const pluginStart=source.indexOf("  const compiled=await build({...buildOptions,plugins:name==='before'?");
const pluginEnd=source.indexOf('  const production=compiled.outputFiles[0]!.text;',pluginStart);
assert(pluginStart>=0&&pluginEnd>pluginStart);
source=source.slice(0,pluginStart)+`  const compiled=await build({...buildOptions,plugins:[{name:'bounded-pipeline-owner',setup(builder){
    builder.onLoad({filter:/[\\\\/]sky-gpu-renderer\\.ts$/},()=>({contents:replacements[name as keyof typeof replacements],loader:'ts'}));
  }}]});
`+source.slice(pluginEnd);
replace("name==='before'&&replacements[path.basename(file,'.ts')]!==undefined?replacements[path.basename(file,'.ts')]:await fs.readFile(file)","path.basename(file)==='sky-gpu-renderer.ts'?replacements[name as keyof typeof replacements]:await fs.readFile(file)");
replace("  {name:'reference-twilight-return',", "  {name:'reference-twilight-all-grids',at:reference.utcAt,fov:referenceFov,mode:'DAY',basis:referenceBasis,equatorial:true},\n  {name:'reference-twilight-off',at:reference.utcAt,fov:referenceFov,mode:'DAY',basis:referenceBasis,landscape:false,grids:false,figures:false},\n  {name:'reference-twilight-return',");
replace('equatorial:false}});','equatorial:scenario.equatorial===true}});');
const regressionStart=source.indexOf('  const before=versionsResult[0].rows,current=versionsResult[1].rows;');
const regressionEnd=source.indexOf('}finally{await browser.close();}',regressionStart);
assert(regressionStart>=0&&regressionEnd>regressionStart);
source=source.slice(0,regressionStart)+`  const before=versionsResult[0].rows,current=versionsResult[1].rows;
  const byName=(rows:any[],name:string)=>rows.find(row=>row.condition.name===name);
  const unchanged=[];
  for(let index=0;index<current.length;index++){
    const a=current[index],b=before[index];assert.equal(a.condition.name,b.condition.name);
    assert.deepEqual(a.references,b.references);assert.deepEqual(a.picks,b.picks,'changed identity/picking: '+a.condition.name);
    if(a.condition.sunAltitudeDeg<=-18||a.condition.mode==='OBSERVATION'){
      assert.equal(a.rgbaSha256,b.rgbaSha256,'night/red composite must remain identical: '+a.condition.name);unchanged.push(a.condition.name);
    }
  }
  assert.deepEqual(versionsResult[0].retired,versionsResult[1].retired,'no additional GPU allocation or failed image/resource retirement');
  const oldTwilight=byName(before,'reference-twilight'),newTwilight=byName(current,'reference-twilight');
  const sample=(row:any,label:string)=>row.solarSamples.find((sample:any)=>sample.label===label).rgba;
  assert(sample(newTwilight,'solar-ten')[0]>sample(oldTwilight,'solar-ten')[0]*2,'visible twilight must escape the former cap');
  assert.deepEqual(sample(newTwilight,'ground'),sample(oldTwilight,'ground'),'atmosphere must not invent below-horizon light');
  const changed=current.filter((row:any,index:number)=>row.rgbaSha256!==before[index].rgbaSha256).map((row:any)=>row.condition.name);
  const result={scope:'Bounded complete software WebGL1 scene composition trial of the linear-display pipeline; no production adoption/native acceptance',
    reportSha256:sha(reportBytes),reference,observer:raw.skyScene.observer,viewport:{width:390,height:844,deviceScale:1},inputRecords,
    versions:versionsResult,regression:{unchangedNightAndRed:unchanged,changed,identityAndPickingUnchanged:true,noAdditionalGpuResources:true},
    limits:['BSC/88 figures/2MASS/landscape/M31 use existing actual source bytes; no SAO/W3/fine planet or Moon refinement in this bounded batch',
      'Temporary software times/camera perform no Context mutation; predecoded images do not measure native memory, loading or OS recovery',
      'Twilight reference luminance improves in finite rays; spectral/low-horizon mismatch and complete environment quality remain open']};
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\\n',{flag:'wx'});
  console.log(JSON.stringify({output,conditions:current.length,regression:result.regression,retired:versionsResult.map(row=>row.retired)}));
`+source.slice(regressionEnd);
await fs.writeFile(task+'/scripts/experience-environment-pipeline-composition-2026-10-01.mts',source,{flag:'wx'});
console.log('Existing composition harness adapted with exact replacement guards.');
