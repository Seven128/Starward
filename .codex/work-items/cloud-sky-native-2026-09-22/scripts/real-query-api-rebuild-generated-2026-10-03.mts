import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import {build} from 'esbuild';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url)),relative=process.argv[2];assert.match(relative,/^output\/playwright\/cloud-sky-live-mixed-1003-r[1-9][0-9]*$/);
const out=path.join(ROOT,relative);assert((await fs.stat(path.join(out,'bundle.js'))).isFile());
const bind=async p=>{const b=await fs.readFile(path.join(ROOT,p));return {path:p,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};};
await fs.copyFile(fileURLToPath(import.meta.url),path.join(out,'executed-api-rebuild.mts'));
const clientEntry=`export * from './apps/wechat-miniapp/src/services/api-client';
export {attachSkyCatalog} from './apps/wechat-miniapp/src/features/sky/sky-stellar-scene';
export {exactSkyObservationFrame} from './apps/wechat-miniapp/src/features/sky/sky-observation-frame';
export * from './apps/wechat-miniapp/src/services/sky-public-image-runtime';
export {miniappQueryClient} from './apps/wechat-miniapp/src/services/query-client';
export {QueryObserver,onlineManager} from './apps/wechat-miniapp/node_modules/@tanstack/react-query/build/modern/index.js';
`;
const client=await build({absWorkingDir:ROOT,stdin:{contents:clientEntry,resolveDir:ROOT,sourcefile:'task-live-api.ts',loader:'ts'},bundle:true,write:false,metafile:true,
platform:'browser',format:'iife',globalName:'liveApi',target:'es2022',tsconfig:path.join(ROOT,'apps/wechat-miniapp/tsconfig.json'),
define:{__MINIAPP_API_BASE__:'"https://approved.fixture.invalid"',__MINIAPP_DEVELOPMENT_FIXTURE_MODE__:'false',__MINIAPP_OPERATOR_PREVIEW_TOKEN__:'""',__MINIAPP_ACCEPTANCE_DIAGNOSTICS__:'false',__MINIAPP_DEVICE_REQUEST_DIAGNOSTICS__:'false'},
plugins:[{name:'only-explicit-native-transport',setup(b){b.onResolve({filter:/^@tarojs\/taro$/},()=>({path:'taro',namespace:'native'}));
b.onLoad({filter:/.*/,namespace:'native'},()=>({contents:'export default globalThis.__controlled.Taro;',loader:'ts'}));
b.onLoad({filter:/[\\/]sky-public-image-cache\.ts$/},async a=>{
 const original=await fs.readFile(a.path,'utf8');assert.equal(original.split('export function createSkyPublicImageCache(').length,2);
 const changed=original.replace('export function createSkyPublicImageCache(','function createActualSkyPublicImageCache(')+
  '\nexport function createSkyPublicImageCache(...args:Parameters<typeof createActualSkyPublicImageCache>){const owner=createActualSkyPublicImageCache(...args);globalThis.__controlled.caches.push(owner);(globalThis.__controlled.publicFileOwners??=[]).push(owner);return owner;}\n';
 await fs.writeFile(path.join(out,'api-file-cache.original.ts'),original,{flag:'wx'});await fs.writeFile(path.join(out,'api-file-cache.observed.ts'),changed,{flag:'wx'});
 return {contents:changed,loader:'ts'};
});}}]});
await fs.writeFile(path.join(out,'api-bundle.js'),client.outputFiles[0].text,{flag:'wx'});
await fs.writeFile(path.join(out,'api-metafile.json'),JSON.stringify(client.metafile,null,2)+'\n',{flag:'wx'});
const clientBindings=[];
for(const key of Object.keys(client.metafile.inputs)){if(key==='task-live-api.ts'||key==='native:taro')continue;
 const relative=path.relative(ROOT,path.resolve(ROOT,key)).replaceAll('\\','/');assert(!relative.startsWith('../'));clientBindings.push(await bind(relative));}
await fs.writeFile(path.join(out,'api-inputs.json'),JSON.stringify({entry:clientEntry,sourceBindings:clientBindings,virtual:['task-live-api.ts','native:taro'],scope:'Full current api-client/request-operation/response-cache/catalog/SAO contracts, actual modules; Taro transport/storage controlled.'},null,2)+'\n',{flag:'wx'});

console.log(JSON.stringify({output:relative,apiSourceBindings:clientBindings.length,reusedPage:true}));
