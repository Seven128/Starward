/** Actual page/API production sources with one shared runtime across task bundles. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));let s=fs.readFileSync(path.join(dir,'live-page-bundle-generated-2026-10-03.mts'),'utf8').replaceAll('\r','');
const once=(before,after)=>{assert.equal(s.split(before).length,2,before.slice(0,100));s=s.replace(before,after);};
once('current-execution-state-2026-10-03-r42.json','current-execution-state-2026-10-03-r46.json');
s=s.replaceAll('build-live-page-bundles-2026-10-03.mjs','build-shared-page-bundles-2026-10-03.mjs').replaceAll('live-page-bundle-generated-2026-10-03.mts','shared-page-bundle-generated-2026-10-03.mts');
const insertion="  b.onLoad({filter:/[\\\\/]sky-stellar-tile-loader\\.ts$/},async a=>{const original=await fs.readFile(a.path,'utf8');";
assert.equal(s.split(insertion).length,2);
s=s.replace(insertion,`  b.onLoad({filter:/[\\\\/]sky-public-image-runtime\\.ts$/},async a=>{
   const original=await fs.readFile(a.path,'utf8'),ast=ts.createSourceFile(a.path,original,ts.ScriptTarget.Latest,true),names:string[]=[];
   for(const statement of ast.statements){if(!statement.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword))continue;
    if(ts.isFunctionDeclaration(statement)&&statement.name)names.push(statement.name.text);
    if(ts.isVariableStatement(statement))for(const d of statement.declarationList.declarations){assert(ts.isIdentifier(d.name));names.push(d.name.text);}}
   const forwarding=names.map(n=>'export const '+n+'=(...args)=>globalThis.liveApi.'+n+'(...args);').join('\\n');
   await fs.writeFile(path.join(out,'shared-runtime-forwarding.ts.txt'),forwarding,{flag:'wx'});
   await fs.writeFile(path.join(out,'shared-runtime-forwarding.json'),JSON.stringify({path:path.relative(ROOT,a.path).replaceAll('\\\\','/'),originalSha256:hash(original),forwardingSha256:hash(forwarding),exports:names,
    scope:'Page task forwards public runtime exports to the same full actual API module instance. No second owner/budget or production runtime policy substitution; both compile inputs pinned.'},null,2)+'\\n',{flag:'wx'});
   return {contents:forwarding,loader:'ts'};
  });
`+insertion);
const anchor="export {exactSkyObservationFrame} from './apps/wechat-miniapp/src/features/sky/sky-observation-frame';\n`;";
once(anchor,"export {exactSkyObservationFrame} from './apps/wechat-miniapp/src/features/sky/sky-observation-frame';\nexport * from './apps/wechat-miniapp/src/services/sky-public-image-runtime';\n`;");
const native="b.onLoad({filter:/.*/,namespace:'native'},()=>({contents:'export default globalThis.__controlled.Taro;',loader:'ts'}));";
once(native,native+`
b.onLoad({filter:/[\\\\/]sky-public-image-cache\\.ts$/},async a=>{
 const original=await fs.readFile(a.path,'utf8');assert.equal(original.split('export function createSkyPublicImageCache(').length,2);
 const changed=original.replace('export function createSkyPublicImageCache(','function createActualSkyPublicImageCache(')+
  '\\nexport function createSkyPublicImageCache(...args:Parameters<typeof createActualSkyPublicImageCache>){const owner=createActualSkyPublicImageCache(...args);globalThis.__controlled.caches.push(owner);(globalThis.__controlled.publicFileOwners??=[]).push(owner);return owner;}\\n';
 await fs.writeFile(path.join(out,'api-file-cache.original.ts'),original,{flag:'wx'});await fs.writeFile(path.join(out,'api-file-cache.observed.ts'),changed,{flag:'wx'});
 return {contents:changed,loader:'ts'};
});`);
const runtimeStart="const runtimeAst=ts.createSourceFile('scaffold.mts'";const start=s.indexOf(runtimeStart);assert(start>0);
s=s.slice(0,start)+`const scaffoldSource='output/playwright/cloud-sky-live-mixed-1003-r10/runtime-executor.js.txt';
await fs.copyFile(path.join(ROOT,scaffoldSource),path.join(out,'runtime-executor.js.txt'));
await fs.writeFile(path.join(out,'native-scaffold-origin.json'),JSON.stringify({source:scaffoldSource,...await bind(scaffoldSource),
 scope:'Reuse successful controlled native UTF8/file callbacks. No preloaded data. Task TextDecoder models native UTF8; no production browser decoder requirement.'},null,2)+'\\n');
console.log(JSON.stringify({output:relative,pageSourceBindings:sourceBindings.length,apiSourceBindings:clientBindings.length,sharedFileOwner:true}));
`;
fs.writeFileSync(path.join(dir,'shared-page-bundle-generated-2026-10-03.mts'),s,{flag:'wx'});
console.log(JSON.stringify({generated:'shared-page-bundle-generated-2026-10-03.mts',productionChanged:false}));
