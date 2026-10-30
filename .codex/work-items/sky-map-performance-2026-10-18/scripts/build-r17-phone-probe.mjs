// Disposable, complete WEAPP source builds for one bounded Android A/B probe.
// No normal source/config/output, feedback entry, watch process or phone is
// changed. Baseline differs by exactly the five preserved stellar owners.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const run=promisify(execFile), here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../../..'), work=path.resolve(here,'..');
const staging=path.join(work,'tmp/r17-phone-probe');
const baselineSource=path.join(process.env.TEMP??'', 'starward-stellar-r17-baseline-20261018');
const baselineCommit='a36aebf8b29da9e6054dc5ecda8c564c7d921291';
const require=createRequire(import.meta.url), ts=require(path.join(root,'apps/wechat-miniapp/node_modules/typescript'));
const sha=value=>createHash('sha256').update(value).digest('hex');
const read=relative=>fs.readFile(path.join(root,relative));
const mode=process.argv[2]??'prepare';
if(!['prepare','build','inspect','cleanup'].includes(mode))throw Error('use_prepare_build_inspect_or_cleanup');
if(!staging.startsWith(path.join(work,'tmp')+path.sep))throw Error('staging_scope_required');
if(mode==='cleanup'){
  const resolved=await fs.realpath(staging), expected=path.join(await fs.realpath(work),'tmp/r17-phone-probe');
  if(resolved.toLowerCase()!==expected.toLowerCase())throw Error('cleanup_scope_mismatch');
  const manifest=JSON.parse(await fs.readFile(path.join(staging,'manifest.json'),'utf8'));
  if(manifest.scope!=='TASK_ONLY_DIAGNOSTIC_NOT_FORMAL_ACCEPTANCE'||Object.keys(manifest.variants).sort().join(',')!=='baseline,candidate')throw Error('cleanup_owner_mismatch');
  // Junctions point to shared installed dependencies. Unlink each junction
  // itself before removing this reproducible generated staging tree.
  for(const variant of ['baseline','candidate'])for(const relative of ['node_modules','apps/wechat-miniapp/node_modules']){
    const link=path.join(staging,variant,relative);const stat=await fs.lstat(link).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
    if(!stat)continue;
    if(!stat.isSymbolicLink())throw Error('cleanup_dependency_link_mismatch');await fs.unlink(link);
  }
  await fs.rm(staging,{recursive:true});console.log(JSON.stringify({removedGeneratedStaging:true}));process.exit(0);
}
const runtimeTemplate=await fs.readFile(path.join(here,'r17-phone-probe-runtime.ts'),'utf8');
const controlsTemplate=await fs.readFile(path.join(here,'r17-phone-probe-controls.tsx'),'utf8');
const baselineRecords=JSON.parse(await fs.readFile(path.join(baselineSource,'sources.json'),'utf8'));
const preserved=new Map();
for(const record of baselineRecords){
  const {stdout}=await run('git',['show',`${baselineCommit}:${record.path}`],{cwd:root,encoding:'buffer',windowsHide:true,maxBuffer:2*1024*1024});
  // Git stores LF while this Windows checkout's preserved working owners can
  // contain CRLF. Accept that representation only if its complete recorded
  // byte length and SHA-256 both match, never merely a normalized comparison.
  const choices=[stdout,Buffer.from(stdout.toString('utf8').replaceAll('\r\n','\n').replaceAll('\n','\r\n'))];
  const exact=choices.find(bytes=>sha(bytes)===record.sha256&&bytes.length===record.bytes);
  if(!exact)throw Error(`baseline_source_fingerprint_mismatch:${record.path}`);
  preserved.set(record.path,exact);
}
if(preserved.size!==5)throw Error('five_stellar_baseline_owners_required');
const sourceLocations=[
  'apps/wechat-miniapp/src','apps/wechat-miniapp/config','apps/wechat-miniapp/runtime-assets','apps/wechat-miniapp/THIRD_PARTY_NOTICES',
  'packages/miniapp-contracts/src','packages/coordinate-system/src','packages/astronomy-core/src',
];
const sourceFiles=['package.json','package-lock.json','apps/wechat-miniapp/package.json','apps/wechat-miniapp/babel.config.cjs',
  'apps/wechat-miniapp/tsconfig.json','apps/wechat-miniapp/project.config.json','apps/wechat-miniapp/sitemap.json',
  'packages/miniapp-contracts/package.json','packages/coordinate-system/package.json','packages/astronomy-core/package.json',
  'tools/miniapp/release-bundle-location.cjs'];
async function list(directory){
  const rows=[];
  for(const entry of await fs.readdir(directory,{withFileTypes:true})){
    const file=path.join(directory,entry.name);
    if(entry.isDirectory())rows.push(...await list(file));
    else if(entry.isFile())rows.push(file);
    else throw Error('unexpected_source_link');
  }
  return rows;
}
function replaceOne(source,from,to,label){
  if(source.split(from).length!==2)throw Error(`probe_source_boundary_changed:${label}`);
  return source.replace(from,to);
}
function wrapNamed(source,name,stage,after=''){
  const ast=ts.createSourceFile('probe.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const candidates=ast.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name&&node.body);
  if(candidates.length!==1)throw Error(`probe_function_boundary_changed:${name}`);
  const body=candidates[0].body, start=body.getStart(ast), end=body.getEnd();
  return source.slice(0,start+1)+`\n return r17Probe.measure("${stage}",()=>{`+source.slice(start+1,end-1)+`\n }${after});\n`+source.slice(end-1);
}
function wrapCalls(source,predicate,format,label){
  const ast=ts.createSourceFile('probe.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS), replacements=[];
  const walk=node=>{if(ts.isCallExpression(node)&&predicate(node.expression.getText(ast)))replacements.push({start:node.getStart(ast),end:node.getEnd()});ts.forEachChild(node,walk);};walk(ast);
  if(!replacements.length)throw Error(`probe_call_boundary_changed:${label}`);
  for(const item of replacements.sort((a,b)=>b.start-a.start))source=source.slice(0,item.start)+format(source.slice(item.start,item.end))+source.slice(item.end);
  return {source,count:replacements.length};
}
async function instrument(directory,variant){
  const feature=path.join(directory,'apps/wechat-miniapp/src/features/sky');
  await fs.writeFile(path.join(feature,'r17-phone-probe-runtime.ts'),runtimeTemplate.replaceAll('__VARIANT__',variant));
  await fs.writeFile(path.join(feature,'r17-phone-probe-controls.tsx'),controlsTemplate.replaceAll('__VARIANT__',variant));
  const edits={};
  const edit=async(file,transform)=>{
    const full=path.join(feature,file), original=await fs.readFile(full,'utf8');let result=transform(original.replaceAll('\r\n','\n'));
    if(!result.includes('from "./r17-phone-probe-runtime"'))result='import { r17Probe } from "./r17-phone-probe-runtime";\n'+result;
    await fs.writeFile(full,result);edits[file]={beforeSha256:sha(original),afterSha256:sha(result)};
  };
  await edit('sky-time-presentation.ts',source=>wrapNamed(source,'presentSkyTime','presentation'));
  await edit('sky-stellar-scene.ts',source=>wrapNamed(source,'resolveSkySceneFrame','base'));
  await edit('sky-stellar-supplement-scene.ts',source=>wrapNamed(source,'resolveSkyStellarSupplement','supplement'));
  await edit('sky-stellar-tile-selection.ts',source=>wrapNamed(source,'selectSkyStellarTiles','selection',',result=>r17Probe.tiles(result.length)'));
  await edit('sky-constellation-scene.ts',source=>wrapNamed(source,'resolveConstellationFrame','constellations'));
  await edit('sky-observation-time.ts',source=>replaceOne(source,'state = { ...state, ...change }; return state;',
    'state = { ...state, ...change }; r17Probe.intent(state); return state;','time_intent_owner'));
  await edit('sky-scene-render.ts',source=>{
    source=replaceOne(source,'if (star.opacity <= 0) return;','if (star.opacity <= 0) return;\n    if(star.reference.startsWith("HR:"))__r17Bsc++; if(star.reference.startsWith("SAO:"))__r17Sao++;','actual_star_submissions');
    source=replaceOne(source,'  context.finish();\n  const contributingHipsGroups',
      '  context.finish();\n  r17Probe.sceneFinished(data,frameAt,frame,currentSupplement,width,height,verticalFovDeg,mode,__r17Bsc,__r17Sao);\n  const contributingHipsGroups','actual_scene_finish');
    source=wrapNamed(source,'drawSkyScene','draw');
    return replaceOne(source,'return r17Probe.measure("draw",()=>{','return r17Probe.measure("draw",()=>{\n let __r17Bsc=0,__r17Sao=0;','draw_counts');
  });
  await edit('sky-canvas-lifecycle.ts',source=>{
    source=replaceOne(source,'      latest = frame;\n      revision++;','      r17Probe.prepared(frame);\n      latest = frame;\n      revision++;','prepared_request');
    source=replaceOne(source,'    const frame = latest, frameRevision = revision, frameSize = size, visibleGeneration = visibilityEpoch;',
      '    const frame = latest, frameRevision = revision, frameSize = size, visibleGeneration = visibilityEpoch;\n    r17Probe.paintStarted(frame);','paint_attempt');
    source=replaceOne(source,'        finished = true;','        finished = true;\n        r17Probe.callback(frame);','native_completion');
    return wrapCalls(source,value=>value==='port.paint',call=>`r17Probe.measure("nativePaintOwner",()=>${call})`,'paint_cpu').source;
  });
  for(const file of ['sky-gpu-renderer.ts','sky-gpu-artwork-contributions.ts'])await edit(file,source=>{
    const result=wrapCalls(source,value=>value==='drawBufferInfo'||value==='gl.drawArrays'||value==='gl.drawElements',
      call=>`(${call},r17Probe.count("glDrawSubmissions"))`,'actual_gl_submissions');
    edits[`${file}:calls`]=result.count;return result.source;
  });
  await edit('spot-sky-page.tsx',source=>{
    source='import { R17PhoneProbeControls } from "./r17-phone-probe-controls";\n'+source;
    source=replaceOne(source,'      surface.present(selectionCurrent ? attempt.reticle : null, attempt.captions, selectionActive);\n      attempt.publish(excludedNameKeys);',
      '      r17Probe.measure("displayCopy",()=>surface.present(selectionCurrent ? attempt.reticle : null, attempt.captions, selectionActive));\n      r17Probe.measure("publishAccepted",()=>attempt.publish!(excludedNameKeys));\n      r17Probe.accepted(frame,paintedSkyObjectsRef.current);','accepted_native_copy');
    source=replaceOne(source,'    invalidated: () => {','    invalidated: () => {\n      r17Probe.count("invalidations");','invalidation');
    source=replaceOne(source,'    failed: (error, frame) => {','    failed: (error, frame) => {\n      r17Probe.count("failedFrames");','failed_frame');
    return replaceOne(source,'  </SkyNavigationMenu>;','    <R17PhoneProbeControls onPrepareFov={fov => { if (!skyDisplayCurrent()) return; stopBrowsingAnimation(); setVerticalFovDeg(fov); setSkyControlPanel(null); }} onStart={key => setSkyControlPanel(key.endsWith("-camera") ? null : "time")} />\n  </SkyNavigationMenu>;','probe_controls');
  });
  return edits;
}

if(mode==='prepare'){
  try{await fs.lstat(staging);throw Error('probe_staging_already_exists');}catch(error){if(error.code!=='ENOENT')throw error;}
  const selected=[...sourceFiles];
  for(const location of sourceLocations)for(const file of await list(path.join(root,location)))selected.push(path.relative(root,file).replaceAll('\\','/'));
  const sourceSnapshot={};for(const file of [...new Set(selected)].sort())sourceSnapshot[file]=sha(await read(file));
  await fs.mkdir(staging,{recursive:true});
  const {stdout:head}=await run('git',['rev-parse','HEAD'],{cwd:root,windowsHide:true});
  const manifest={scope:'TASK_ONLY_DIAGNOSTIC_NOT_FORMAL_ACCEPTANCE',createdAt:new Date().toISOString(),head:head.trim(),baselineCommit,
    baselineSources:baselineRecords,sourceSnapshot,probeTemplateSha256:sha(runtimeTemplate),controlsTemplateSha256:sha(controlsTemplate),variants:{}};
  for(const variant of ['baseline','candidate']){
    const directory=path.join(staging,variant);
    for(const file of Object.keys(sourceSnapshot)){
      const destination=path.join(directory,file);await fs.mkdir(path.dirname(destination),{recursive:true});
      await fs.writeFile(destination,variant==='baseline'&&preserved.has(file)?preserved.get(file):await read(file));
    }
    for(const relative of ['node_modules','apps/wechat-miniapp/node_modules']){
      const destination=path.join(directory,relative);await fs.symlink(path.join(root,relative),destination,'junction');
    }
    const edits=await instrument(directory,variant);
    manifest.variants[variant]={directory:path.relative(root,directory).replaceAll('\\','/'),instrumentation:edits};
  }
  for(const[file,hash]of Object.entries(sourceSnapshot))if(sha(await read(file))!==hash)throw Error('source_changed_during_staging');
  await fs.writeFile(path.join(staging,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({prepared:true,copiedSourceFiles:Object.keys(sourceSnapshot).length,baselineOwners:preserved.size,staging:path.relative(root,staging)}));
}else if(mode==='build'){
  const origin=process.env.MINIAPP_API_BASE??'';
  const parsed=new URL(origin);
  if(parsed.protocol!=='http:'||parsed.port!=='8795'||!/^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname)||parsed.hostname.startsWith('127.')||parsed.hostname==='0.0.0.0'||parsed.username||parsed.password||parsed.search||parsed.hash||parsed.pathname!=='/')throw Error('task_physical_bridge_origin_required');
  const manifest=JSON.parse(await fs.readFile(path.join(staging,'manifest.json'),'utf8'));
  // Source changes after preparation invalidate both sides before any build.
  for(const[file,hash]of Object.entries(manifest.sourceSnapshot))if(sha(await read(file))!==hash)throw Error('source_changed_after_staging');
  const {fingerprintBundle,inspectReleaseBundleBudget}=await import(pathToFileURL(path.join(root,'tools/miniapp/release-bundle-artifact.mjs')));
  const {inspectCandidate}=await import(pathToFileURL(path.join(root,'tools/miniapp/inspect-production.mjs')));
  const {assertPhysicalDeviceBundleSafe}=await import(pathToFileURL(path.join(root,'tools/miniapp/device-feedback-snapshot.mjs')));
  for(const variant of ['baseline','candidate']){
    const directory=path.join(root,manifest.variants[variant].directory), app=path.join(directory,'apps/wechat-miniapp');
    const bundle=path.join(app,`dist/weapp-check-r17-probe-${variant}`);
    try{await fs.lstat(bundle);throw Error('probe_output_already_exists');}catch(error){if(error.code!=='ENOENT')throw error;}
    const env={...process.env,MINIAPP_ISOLATED_CHECK_BUILD:'1',MINIAPP_ISOLATED_CHECK_BUILD_SLOT:`r17-probe-${variant}`,MINIAPP_API_BASE:origin,MINIAPP_SKY_RESOURCE_BASE:origin};
    for(const key of ['MINIAPP_DEVELOPMENT_FIXTURE_MODE','MINIAPP_ISOLATED_FIXTURE_BUILD','MINIAPP_ACCEPTANCE_DIAGNOSTICS','MINIAPP_DEVICE_REQUEST_DIAGNOSTICS','MINIAPP_OPERATOR_PREVIEW_TOKEN','MINIAPP_RELEASE_BUNDLE_ID','MINIAPP_SKY_FEEDBACK_ID'])delete env[key];
    try{
      const result=await run(process.execPath,[path.join(root,'tools/run-node.cjs'),'--bin','@tarojs/cli','taro','build','--type','weapp'],{cwd:app,env,windowsHide:true,maxBuffer:30*1024*1024});
      await fs.writeFile(path.join(staging,`${variant}-build-private.log`),result.stdout+'\n'+result.stderr);
    }catch(error){await fs.writeFile(path.join(staging,`${variant}-build-private.log`),(error.stdout??'')+'\n'+(error.stderr??''));throw Error(`probe_build_failed:${variant}`);}
    await assertPhysicalDeviceBundleSafe(bundle);
    const fingerprint=await fingerprintBundle(bundle),budget=await inspectReleaseBundleBudget(fingerprint,bundle);
    const inspection=await inspectCandidate({bundleDirectory:path.relative(root,bundle).replaceAll('\\','/')});
    if(Object.values(inspection.checks).some(value=>value!==true))throw Error('probe_static_candidate_checks_failed');
    const project=path.join(staging,`${variant}-project`);await fs.mkdir(project,{recursive:false});
    const config=JSON.parse(await read('apps/wechat-miniapp/project.config.json'));config.miniprogramRoot='weapp/';delete config.srcMiniprogramRoot;
    config.projectname=`starward-r17-phone-probe-${variant}`;
    if(config.setting)delete config.setting.useCompilerPlugins;
    await fs.writeFile(path.join(project,'project.config.json'),JSON.stringify(config,null,2)+'\n');
    await fs.cp(bundle,path.join(project,'weapp'),{recursive:true,errorOnExist:true,force:false});
    if((await fingerprintBundle(path.join(project,'weapp'))).sha256!==fingerprint.sha256)throw Error('probe_project_copy_mismatch');
    manifest.variants[variant].result={bundleDirectory:path.relative(root,bundle).replaceAll('\\','/'),projectDirectory:path.relative(root,project).replaceAll('\\','/'),
      bundleSha256:fingerprint.sha256,fileCount:fingerprint.fileCount,totalBytes:fingerprint.totalBytes,packages:budget.packages,
      mainHeadroomBytes:budget.limits.perPackageBytes-budget.packages.main.bytes,staticChecks:inspection.checks};
    await fs.writeFile(path.join(staging,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    console.log(JSON.stringify({variant,...manifest.variants[variant].result}));
  }
  for(const[file,hash]of Object.entries(manifest.sourceSnapshot))if(sha(await read(file))!==hash)throw Error('source_changed_during_build');
}else{
  const manifest=JSON.parse(await fs.readFile(path.join(staging,'manifest.json'),'utf8'));
  if(manifest.probeTemplateSha256!==sha(runtimeTemplate)||manifest.controlsTemplateSha256!==sha(controlsTemplate))throw Error('probe_template_changed_after_staging');
  const {fingerprintBundle}=await import(pathToFileURL(path.join(root,'tools/miniapp/release-bundle-artifact.mjs')));
  const sourcePairs={};
  for(const variant of ['baseline','candidate']){
    const item=manifest.variants[variant], directory=path.join(root,item.directory), feature='apps/wechat-miniapp/src/features/sky/';
    const hashes={};
    for(const[file,originalHash]of Object.entries(manifest.sourceSnapshot)){
      const edit=file.startsWith(feature)?item.instrumentation[file.slice(feature.length)]:null;
      const expected=edit?.afterSha256??(variant==='baseline'&&preserved.has(file)?sha(preserved.get(file)):originalHash);
      const actual=sha(await fs.readFile(path.join(directory,file)));
      if(actual!==expected)throw Error(`staged_source_readback_mismatch:${variant}:${file}`);
      hashes[file]=actual;
    }
    for(const[file,template]of [['r17-phone-probe-runtime.ts',runtimeTemplate],['r17-phone-probe-controls.tsx',controlsTemplate]]){
      const relative=feature+file, expected=sha(template.replaceAll('__VARIANT__',variant));
      if(sha(await fs.readFile(path.join(directory,relative)))!==expected)throw Error('staged_probe_readback_mismatch');
      hashes[relative]=expected;
    }
    if(!item.result)throw Error('complete_probe_build_pair_required');
    const compiled=await fingerprintBundle(path.join(root,item.result.bundleDirectory));
    const project=await fingerprintBundle(path.join(root,item.result.projectDirectory,'weapp'));
    if(compiled.sha256!==item.result.bundleSha256||project.sha256!==compiled.sha256)throw Error('probe_bundle_readback_mismatch');
    sourcePairs[variant]=hashes;
  }
  const allowedDifferences=new Set([...preserved.keys(),'apps/wechat-miniapp/src/features/sky/r17-phone-probe-runtime.ts','apps/wechat-miniapp/src/features/sky/r17-phone-probe-controls.tsx']);
  const differences=Object.keys(sourcePairs.baseline).filter(file=>sourcePairs.baseline[file]!==sourcePairs.candidate[file]);
  if(differences.length!==allowedDifferences.size||differences.some(file=>!allowedDifferences.has(file)))throw Error('probe_pair_source_parity_mismatch');
  const testOnlySourceChanges=[];
  const fixtureRepairs=new Set(['apps/wechat-miniapp/src/features/sky/sky-location-preview.test.ts',
    'apps/wechat-miniapp/src/features/sky/sky-page-action-ownership.test.ts']);
  for(const[file,hash]of Object.entries(manifest.sourceSnapshot)){
    const current=sha(await read(file));
    if(current!==hash){
      if(!fixtureRepairs.has(file))throw Error('normal_source_changed_after_probe_preparation');
      testOnlySourceChanges.push({file,buildInputSha256:hash,currentSha256:current});
    }
  }
  const evidence={scope:manifest.scope,head:manifest.head,baselineCommit:manifest.baselineCommit,
    measurementWindow:{startDelayMs:1000,durationLimitMs:45000,sampleLimit:2048},
    copiedSourceFiles:Object.keys(manifest.sourceSnapshot).length,sourceSnapshotSha256:sha(JSON.stringify(manifest.sourceSnapshot)),
    exactPairedDifferences:differences,baselineSources:manifest.baselineSources,probeTemplateSha256:manifest.probeTemplateSha256,controlsTemplateSha256:manifest.controlsTemplateSha256,
    postBuildSourceAndBundleReadback:true,normalSourceUnchanged:testOnlySourceChanges.length===0,
    normalProductSourceUnchanged:true,testOnlySourceChanges,
    variants:Object.fromEntries(Object.entries(manifest.variants).map(([name,value])=>[name,{...value.result,instrumentation:value.instrumentation}])),
    limitations:['Task-only instrumented Android diagnostic; no actual device execution is established by this build',
      'Same current time UI and geometry, except five precisely preserved original stellar owners on baseline',
      'Counters represent submitted GL calls and successful lifecycle-accepted Canvas copies, not physical display scanout or encoded recording FPS',
      'Nested CPU stages overlap and must not be added together; the same probe overhead is present on both builds',
      'Phone runner still must establish same public spot, committed instant, view, viewport, image readiness and gesture path']};
  await fs.writeFile(path.join(work,'R17-PHONE-PROBE-BUILD.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify({scope:evidence.scope,postBuildReadback:true,normalSourceUnchanged:evidence.normalSourceUnchanged,
    normalProductSourceUnchanged:true,testOnlyChanges:testOnlySourceChanges.map(value=>value.file),pairedDifferentFiles:differences.length,
    variants:Object.fromEntries(Object.entries(manifest.variants).map(([name,value])=>[name,value.result]))}));
}
