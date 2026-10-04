/** Reuse the current page extractor; rebuild changed dependencies, no old journey replay. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const task='.codex/work-items/cloud-sky-native-2026-09-22';
const scaffold=fs.readFileSync(path.join(root,task,'scripts/experience-current-scene-journey-2026-10-03.mts'),'utf8');
const once=(text,before,after)=>{assert.equal(text.split(before).length,2,before);return text.replace(before,after);};
let block=scaffold.slice(scaffold.indexOf('const pagePath=sky+'),scaffold.indexOf('const toolFiles='));
assert(block.startsWith('const pagePath=sky+'));assert(block.includes('const compiled='));
block=once(block,'const compiled=bundle.outputFiles[0]!.text;','const compiled=bundle.outputFiles[0]!.text;');
block=once(block,'${saoAdapter}`,loader:',"export const saoCatalogClient=globalThis.liveApi.saoCatalogClient;`,loader:");
block=once(block,"report:await bind(reportPath)",'report:null');
// The extractor still owns page effects/paint/render/lifecycle. Only its API
// facade now delegates to the full current operation/cache/SAO client bundle.
const header=`import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';import ts from 'typescript';import {build} from 'esbuild';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url)),task='${task}',sky='apps/wechat-miniapp/src/features/sky/';
const relative=process.argv[2];assert.match(relative,/^output\\/playwright\\/cloud-sky-live-mixed-1003-r[1-9][0-9]*$/);
const out=path.join(ROOT,relative);await fs.mkdir(out);
const hash=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const bind=async(p:string)=>{const b=await fs.readFile(path.join(ROOT,p));return {path:p,bytes:b.length,sha256:hash(b)};};
const checkpoint=JSON.parse(await fs.readFile(path.join(ROOT,task+'/evidence/current-execution-state-2026-10-03-r42.json'),'utf8'));
for(const row of [...checkpoint.protected,...checkpoint.currentSources])assert.deepEqual(await bind(row.path),row);
const inputs=[await bind(task+'/scripts/build-live-page-bundles-2026-10-03.mjs'),await bind(task+'/scripts/live-page-bundle-generated-2026-10-03.mts')],metadata={},assets=[];
const preserved=checkpoint.protected.map(({path,sha256}:any)=>({path,sha256})),nodePreparationBindings=[],nodeVirtualInputs=[];
await fs.copyFile(fileURLToPath(import.meta.url),path.join(out,'executed-build.mts'));
`;
const footer=`
const clientEntry=\`export * from './apps/wechat-miniapp/src/services/api-client';
export {attachSkyCatalog} from './apps/wechat-miniapp/src/features/sky/sky-stellar-scene';
export {exactSkyObservationFrame} from './apps/wechat-miniapp/src/features/sky/sky-observation-frame';
\`;
const client=await build({absWorkingDir:ROOT,stdin:{contents:clientEntry,resolveDir:ROOT,sourcefile:'task-live-api.ts',loader:'ts'},bundle:true,write:false,metafile:true,
platform:'browser',format:'iife',globalName:'liveApi',target:'es2022',tsconfig:path.join(ROOT,'apps/wechat-miniapp/tsconfig.json'),
define:{__MINIAPP_API_BASE__:'"https://approved.fixture.invalid"',__MINIAPP_DEVELOPMENT_FIXTURE_MODE__:'false',__MINIAPP_OPERATOR_PREVIEW_TOKEN__:'""',__MINIAPP_ACCEPTANCE_DIAGNOSTICS__:'false',__MINIAPP_DEVICE_REQUEST_DIAGNOSTICS__:'false'},
plugins:[{name:'only-explicit-native-transport',setup(b){b.onResolve({filter:/^@tarojs\\/taro$/},()=>({path:'taro',namespace:'native'}));
b.onLoad({filter:/.*/,namespace:'native'},()=>({contents:'export default globalThis.__controlled.Taro;',loader:'ts'}));}}]});
await fs.writeFile(path.join(out,'api-bundle.js'),client.outputFiles[0].text,{flag:'wx'});
await fs.writeFile(path.join(out,'api-metafile.json'),JSON.stringify(client.metafile,null,2)+'\\n',{flag:'wx'});
const clientBindings=[];
for(const key of Object.keys(client.metafile.inputs)){if(key==='task-live-api.ts'||key==='native:taro')continue;
 const relative=path.relative(ROOT,path.resolve(ROOT,key)).replaceAll('\\\\','/');assert(!relative.startsWith('../'));clientBindings.push(await bind(relative));}
await fs.writeFile(path.join(out,'api-inputs.json'),JSON.stringify({entry:clientEntry,sourceBindings:clientBindings,virtual:['task-live-api.ts','native:taro'],scope:'Full current api-client/request-operation/response-cache/catalog/SAO contracts, actual modules; Taro transport/storage controlled.'},null,2)+'\\n',{flag:'wx'});
const runtimeAst=ts.createSourceFile('scaffold.mts',await fs.readFile(path.join(ROOT,task+'/scripts/experience-current-scene-journey-2026-10-03.mts'),'utf8'),ts.ScriptTarget.Latest,true);
let runtime:ts.Expression|undefined;
const runtimeVisit=(n:ts.Node)=>{if(ts.isVariableDeclaration(n)&&n.name.getText(runtimeAst)==='runtimeExecutor')runtime=n.initializer;ts.forEachChild(n,runtimeVisit);};runtimeVisit(runtimeAst);assert(runtime);
const js=ts.transpileModule('export const runtimeExecutor='+runtime!.getText(runtimeAst)+';', {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
await fs.writeFile(path.join(out,'runtime-executor.js.txt'),js,{flag:'wx'});
console.log(JSON.stringify({output:relative,pageSources:sourceBindings.length,apiSources:clientBindings.length,browserInputs:'NO_PRELOADED_REPORT_CATALOG_FIGURES_POSITIONS_OR_IMAGE_BYTES'}));
`;
const file=path.join(root,task,'scripts/live-page-bundle-generated-2026-10-03.mts');
fs.writeFileSync(file,header+block+footer,{flag:'wx'});
console.log(JSON.stringify({generated:path.relative(root,file).replaceAll('\\','/'),scaffoldBlockBytes:Buffer.byteLength(block)}));
