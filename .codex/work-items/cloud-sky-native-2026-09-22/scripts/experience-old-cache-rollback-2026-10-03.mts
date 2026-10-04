import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createSkyPublicImageCache as current} from '../../../../apps/wechat-miniapp/src/services/sky-public-image-cache';
import type {PublicSkyFileDescriptor,SkyPublicImageFileSystem} from '../../../../apps/wechat-miniapp/src/services/sky-public-image-cache';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const output=path.resolve(root,process.argv[2]??'output/sky-old-cache-rollback-1003-r1');
assert(output.startsWith(path.join(root,'output')+path.sep));await fs.mkdir(output,{recursive:false});
const owned=path.join(output,'owned-cache');await fs.mkdir(owned);
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const bind=async(p:string)=>{const b=await fs.readFile(p);return {path:path.relative(root,p).replaceAll('\\','/'),bytes:b.length,sha256:sha(b)};};
const save=async(n:string,v:unknown)=>fs.writeFile(path.join(output,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const legacyPath=path.join(root,'output/playwright/cloud-sky-live-mixed-1003-r1/source-inputs/apps/wechat-miniapp/src/services/sky-public-image-cache.ts');
const legacy=await fs.readFile(legacyPath,'utf8');
const legacyBinding=(JSON.parse(await fs.readFile(path.join(root,'output/playwright/cloud-sky-live-mixed-1003-r1/source-binding-before.json'),'utf8')).sourceBindings as any[])
 .find(v=>v.path==='apps/wechat-miniapp/src/services/sky-public-image-cache.ts');
assert.equal((await bind(legacyPath)).sha256,legacyBinding.sha256);
const sources=['apps/wechat-miniapp/src/services/sky-public-image-cache.ts','apps/wechat-miniapp/src/services/sky-image-bytes.ts','apps/wechat-miniapp/src/services/sky-public-file-bytes.ts'];
const before=await Promise.all(sources.map(n=>bind(path.join(root,n))));await save('inputs-before.json',before);
await fs.copyFile(path.join(root,sources[0]!),path.join(output,'current-owner-executed.ts'));
await fs.copyFile(legacyPath,path.join(output,'legacy-owner-executed.ts'));
const require=createRequire(path.join(root,'package.json'));const esbuild=require('esbuild');
await esbuild.build({stdin:{contents:legacy,resolveDir:path.join(root,'apps/wechat-miniapp/src/services'),sourcefile:'archived-image-only-cache.ts',loader:'ts'},
 bundle:true,format:'esm',platform:'node',outfile:path.join(output,'legacy-owner.mjs'),logLevel:'silent'});
const old=(await import(pathToFileURL(path.join(output,'legacy-owner.mjs')).href)).createSkyPublicImageCache;
const operations:unknown[]=[];let download=0;const blockedRemoval=new Set<string>();
const exactPath=(p:string)=>{const absolute=path.resolve(p);assert(absolute.startsWith(owned+path.sep));return absolute;};
const filesystem:SkyPublicImageFileSystem={
 async mkdir(p){assert.equal(path.resolve(p),owned);},async list(p){assert.equal(path.resolve(p),owned);return fs.readdir(owned);},
 async size(p){return(await fs.stat(exactPath(p))).size;},async read(p){const b=await fs.readFile(exactPath(p));return Uint8Array.from(b).buffer;},
 async write(p,b){operations.push({operation:'write',file:path.basename(p),bytes:b.byteLength});await fs.writeFile(exactPath(p),new Uint8Array(b));},
 async rename(a,b){operations.push({operation:'rename',from:path.basename(a),to:path.basename(b)});await fs.rename(exactPath(a),exactPath(b));},
 async remove(p){operations.push({operation:'remove',file:path.basename(p)});const target=exactPath(p);
  if(blockedRemoval.has(target))throw Error('controlled native unlink failure');
  try{await fs.unlink(target);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}};
const imageBytes=await fs.readFile(path.join(root,'workers/miniapp-api/assets/constellations/camelopardalis.png'));
const jsonPath=path.join(root,'workers/miniapp-api/assets/sao-v2/00-00-10-0.json');const jsonBytes=await fs.readFile(jsonPath);
const assets:PublicSkyFileDescriptor[]=[{environment:'e'.repeat(64),sha256:sha(imageBytes),bytes:imageBytes.length,format:'png',
 width:imageBytes.readUInt32BE(16),height:imageBytes.readUInt32BE(20),url:'https://fixture.invalid/source.png'},
 {environment:'e'.repeat(64),sha256:sha(jsonBytes),bytes:jsonBytes.length,format:'json',url:'https://fixture.invalid/source.json'}];
const bodies=new Map(assets.map((v,i)=>[v.sha256,i?jsonBytes:imageBytes]));
const make=(factory:any,session:string)=>factory({fs:filesystem,root:owned,session,byteBudget:32*1024*1024,maxFileBytes:192*1024,cleanupWaitMs:50,
 transfer(asset:PublicSkyFileDescriptor){download++;return {promise:Promise.resolve(Uint8Array.from(bodies.get(asset.sha256)!).buffer),cancel(){}};}});
const inventory=async()=>Promise.all((await fs.readdir(owned)).sort().map(async n=>({file:n,...await bind(path.join(owned,n))})));
const phases:unknown[]=[];
try{
 const now=make(current,'current');await now.ready();
 const image=await now.acquire(assets[0]).promise;image.release();
 const json=await now.acquire(assets[1]).promise;json.release();await now.ready();
 phases.push({phase:'current-mixed',cache:now.inspect(),files:await inventory(),jsonFile:path.basename(json.filePath)});
 const rolled=make(old,'rollback');await rolled.ready();
 phases.push({phase:'old-image-only-boot',cache:rolled.inspect(),files:await inventory()});
 const recovered=await rolled.acquire(assets[0]).promise;recovered.release();await rolled.ready();
 const cleared=await rolled.clear();
 const leftovers=await inventory();phases.push({phase:'old-clear',result:cleared,cache:rolled.inspect(),files:leftovers});
 const unmanaged=leftovers.filter(v=>v.sha256===assets[1]!.sha256);
 const back=make(current,'reupgrade');await back.ready();
 const beforeWarm=download;const resumed=await back.acquire(assets[1]).promise;resumed.release();
 phases.push({phase:'current-reupgrade-json',cache:back.inspect(),files:await inventory(),downloads:download-beforeWarm});
 await back.clear();phases.push({phase:'final-current-clear',cache:back.inspect(),files:await inventory()});
 // Reuse the exact pre-fix v2 owner, not a handwritten approximation of its
 // persistent format, to produce an existing .json inventory for migration.
 const previousSource=path.join(root,'output/sky-old-cache-rollback-1003-r1/current-owner-executed.ts');
 assert.equal((await bind(previousSource)).sha256,JSON.parse(await fs.readFile(path.join(root,'output/sky-old-cache-rollback-1003-r1/inputs-before.json'),'utf8'))[0].sha256);
 await esbuild.build({stdin:{contents:await fs.readFile(previousSource,'utf8'),resolveDir:path.join(root,'apps/wechat-miniapp/src/services'),sourcefile:'archived-json-v2-cache.ts',loader:'ts'},
  bundle:true,format:'esm',platform:'node',outfile:path.join(output,'previous-v2-owner.mjs'),logLevel:'silent'});
 const previousV2=(await import(pathToFileURL(path.join(output,'previous-v2-owner.mjs')).href)).createSkyPublicImageCache;
 const previous=make(previousV2,'previous_v2');await previous.ready();
 const previousJson=await previous.acquire(assets[1]).promise;previousJson.release();await previous.ready();assert(previousJson.filePath.endsWith('.json'));
 phases.push({phase:'previous-v2-json',cache:previous.inspect(),files:await inventory()});
 const migrated=make(current,'migration');await migrated.ready();const migrationDownloads=download;
 const moved=await migrated.acquire(assets[1]).promise;assert.notEqual(moved.filePath,previousJson.filePath);
 assert.equal(sha(await fs.readFile(moved.filePath)),assets[1]!.sha256);assert.equal(download,migrationDownloads);moved.release();await migrated.ready();
 assert(!(await fs.readdir(owned)).includes(path.basename(previousJson.filePath)));
 phases.push({phase:'current-migrates-actual-v2',cache:migrated.inspect(),files:await inventory(),downloads:download-migrationDownloads,
  old:path.basename(previousJson.filePath),current:path.basename(moved.filePath)});
 // The old owner must keep failed-to-remove catalog data in its own accounting
 // and explicitly report partial, rather than claim a complete zero-byte clear.
 blockedRemoval.add(exactPath(moved.filePath));const failedOld=make(old,'rollback_unlink_failure');await failedOld.ready();
 const partial=await failedOld.clear();assert.equal(partial.status,'partial');assert.equal(failedOld.inspect().bytes,jsonBytes.length);
 phases.push({phase:'old-unlink-failure',result:partial,cache:failedOld.inspect(),files:await inventory()});
 blockedRemoval.clear();const retried=await failedOld.clear();assert.equal(retried.status,'complete');assert.equal(failedOld.inspect().bytes,0);
 assert(!(await inventory()).some(v=>v.sha256===assets[1]!.sha256));
 phases.push({phase:'old-clear-retry',result:retried,cache:failedOld.inspect(),files:await inventory()});
 const final=make(current,'final_reupgrade');await final.ready();await final.clear();
 assert.deepEqual(await fs.readdir(owned),['index-v2.json']);phases.push({phase:'final-migrated-current-clear',cache:final.inspect(),files:await inventory()});
 await save('operations.json',operations);await save('phases.json',phases);
 await save('inputs-after.json',await Promise.all(sources.map(n=>bind(path.join(root,n)))));
 const result={status:unmanaged.length?'FAILED_OLD_CLEAR_LEAVES_UNMANAGED_JSON':'OLD_BINARY_CLEAR_RETURNS_NO_UNMANAGED_JSON',
  legacySource:await bind(legacyPath),previousV2Source:await bind(previousSource),sourceFiles:await Promise.all([jsonPath,path.join(root,'workers/miniapp-api/assets/constellations/camelopardalis.png')].map(bind)),
  oldClearedStatus:cleared.status,oldAccountedBytes:rolled.inspect().bytes,unmanagedJsonBytes:unmanaged.reduce((n,v)=>n+v.bytes,0),
  unmanaged:unmanaged.length,downloads:download,phases,
  scope:'Actual archived image-only owner and current owner on isolated real Node filesystem with existing source PNG/SAO bytes; not old WEAPP binary/native filesystem/physical allocation/full 200MB. No source download, production edit or owned-original deletion.'};
 await save('result.json',result);console.log(JSON.stringify({result:await bind(path.join(output,'result.json')),status:result.status,unmanagedJsonBytes:result.unmanagedJsonBytes}));
}catch(e){await save('failed.json',{error:String(e),phases,operations});throw e;}
