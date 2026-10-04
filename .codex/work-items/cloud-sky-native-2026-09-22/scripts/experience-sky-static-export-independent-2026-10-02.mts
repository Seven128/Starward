/** Independent offline publication/handler/staging review. No services or network. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import * as contracts from '../../../../packages/miniapp-contracts/src/index.ts';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const require=createRequire(path.join(ROOT,'apps/wechat-miniapp/package.json'));
const ts=require('typescript');
const read=(name:string)=>fs.readFileSync(path.join(ROOT,name));
const sha=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
const bind=(name:string)=>{const b=read(name);return {path:name.replaceAll('\\','/'),bytes:b.length,sha256:sha(b)}};
const supplemental=process.argv.includes('--canonical-only');
let output='output/sky-static-export-independent-1002-r1';
for(let n=2;fs.existsSync(path.join(ROOT,output));n++)output=`output/sky-static-export-independent-1002-r${n}`;
fs.mkdirSync(path.join(ROOT,output));
const out=(name:string)=>path.join(ROOT,output,name);
const save=(name:string,data:unknown)=>fs.writeFileSync(out(name),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const exporterPath='workers/miniapp-api/src/sky-public-asset-export.ts';
const exportSource=read(exporterPath).toString('utf8');
const publication='output/sky-static-approved-export-1002-r2/publication';
const ownerNames=['moon-texture-publication','mars-texture-publication','mercury-texture-publication',
 'jupiter-bands-publication','saturn-bands-publication','uranus-bands-publication','neptune-bands-publication',
 'galactic-image-publication','sky-landscape-publication','wide-field-w3-publication','constellation-publication','sdss-optical-imagery'];
const modules=new Map<string,any>();
for(const name of [...ownerNames,'sky-public-asset-headers'])modules.set('./'+name+'.ts',await import(pathToFileURL(path.join(ROOT,'workers/miniapp-api/src/'+name+'.ts')).href));
const sourceFiles=[exporterPath,'workers/miniapp-api/src/sky-public-asset-headers.ts',
 'workers/miniapp-api/src/controller.ts','workers/miniapp-api/src/constellation.controller.ts',
 ...ownerNames.map(n=>'workers/miniapp-api/src/'+n+'.ts'),'workers/miniapp-api/src/fixed-body-texture-publication.ts',
 'packages/miniapp-contracts/src/sdss-optical-publication.ts',publication+'/index.json',publication+'/delivery.caddy'];
const sourceBefore=sourceFiles.map(bind);
for(let i=0;i<sourceFiles.length;i++)fs.copyFileSync(path.join(ROOT,sourceFiles[i]),out(String(i).padStart(2,'0')+'-'+path.basename(sourceFiles[i])+'.txt'),fs.constants.COPYFILE_EXCL);
fs.copyFileSync(fileURLToPath(import.meta.url),out('executed-script.mts.txt'),fs.constants.COPYFILE_EXCL);
const preserved=JSON.parse(read('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json').toString());
for(const item of preserved)assert.equal(bind(item.path).sha256,item.sha256);
function walk(relative:string):any[]{return fs.readdirSync(path.join(ROOT,relative),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(relative+'/'+e.name):e.isFile()?[bind(relative+'/'+e.name)]:[]);}
const allOriginalAssets=walk('workers/miniapp-api/assets');
const originalDeep=allOriginalAssets.filter(x=>x.path.startsWith('workers/miniapp-api/assets/deep-sky/'));assert.equal(originalDeep.length,201);
save('preserved-before.json',{preserved,assets:allOriginalAssets});
function frozenModule(source:string,name:string,fsOwner:any=fsp){
 const exports:any={};
 const noOpDecorator=(..._args:any[])=>(..._targets:any[])=>undefined;
 const localRequire=(key:string)=>{
  if(key==='node:fs/promises')return fsOwner;
  if(key==='@starward/miniapp-contracts')return contracts;
  if(key==='@nestjs/common')return new Proxy({BadRequestException:Error,NotFoundException:Error},{get:(o,k)=>k in o?(o as any)[k]:noOpDecorator});
  if(key==='./miniapp-service.ts')return {MiniappService:class {}};
  if(key==='./celestial-object-position.ts')return {celestialObjectPosition:()=>{throw new Error('outside review scope')}};
  if(modules.has(key))return modules.get(key);
  return require(key);
 };
 // VM calls exported functions; the terminal-only top-level-await entry is outside this adapter.
 const moduleSource=source.slice(0,source.indexOf('\nif (process.argv[1]')<0?source.length:source.indexOf('\nif (process.argv[1]'));
 const code=ts.transpileModule(moduleSource.replaceAll('import.meta.url',JSON.stringify('task://frozen-static-export')),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{exports,require:localRequire,Buffer,process:{argv:[]},console},{filename:name});
 return exports;
}
const frozen=frozenModule(exportSource,'actual-frozen-exporter.ts');
const index=JSON.parse(read(publication+'/index.json').toString());
const noncanonical=[
 '/v2/sky/constellations/'+'a'.repeat(64)+'/assets/.',
 '/v2/sky/constellations/'+'a'.repeat(64)+'/assets/..',
 '/v2/sky/constellations/'+'a'.repeat(64)+'/assets/%2e%2e',
 '/v2/sky/constellations/'+'a'.repeat(64)+'/assets//notice.txt',
 '/v2/sky/constellations/'+'a'.repeat(64)+'/assets/a/../notice.txt',
 '/v2/sky/moon/'+'a'.repeat(64)+'/../private.jpg',
 '/v2/sky/moon/'+'a'.repeat(64)+'/private.jpg?token=x',
 '/v2/sky/moon/'+'a'.repeat(64)+'/private.jpg\r\nrespond 200',
 '/v2/sky/moon/'+'a'.repeat(64)+'/private%2fsecret.jpg',
 '/v2/sky/moon/'+'a'.repeat(64)+'/private\\secret.jpg',
 '/v2/sky/moon/'+'a'.repeat(64)+'/private.jpg/',
 '/v2/sky/optical/'+'a'.repeat(64)+'/Npix0.jpg',
 '/v2/sky/deep-sky/'+'a'.repeat(64)+'/M82.fits',
 '/v2/accounts/private/image.jpg'];
const routeControls=noncanonical.map(route=>{try{frozen.skyStaticDeliveryFragment([{route,bytes:1,sha256:'a'.repeat(64),headers:{'content-type':'text/plain'}}]);return {route,accepted:true,canonical:path.posix.normalize(route),lookup:path.resolve('/stage/files',route.slice(1))};}catch(e){return {route,accepted:false,error:String(e)}}});
save('canonical-route-controls.json',{source:sourceBefore[0],cases:routeControls});
// Saved first, so the parent can repair the production guard without losing before facts.
console.log(JSON.stringify({output,canonicalCounterexample:bind(output+'/canonical-route-controls.json'),source:sourceBefore[0]}));
if(supplemental){
 assert.equal(routeControls.filter(x=>x.accepted).length,0);
 assert.equal(frozen.skyStaticDeliveryFragment(index.records),read(publication+'/delivery.caddy').toString());
 const newPublication='output/sky-static-approved-export-1002-r3/publication';
 const priorInventory=walk(publication),newInventory=walk(newPublication);
 assert.deepEqual(newInventory.map(x=>({...x,path:x.path.replace(newPublication,publication)})),priorInventory);
 const newIndex=JSON.parse(read(newPublication+'/index.json').toString());assert.deepEqual(newIndex,index);
 const http='output/sky-static-http-1002-r4',httpResult=JSON.parse(read(http+'/result.json').toString()),httpBinding=JSON.parse(read(http+'/binding.json').toString());
 assert.equal(bind(http+'/result.json').sha256,'e8f6ef3c1a1b90233a418fb153df1873084c0233045495d70844e09fc91951dd');
 assert.equal(bind(http+'/binding.json').sha256,'c96146bc14db60f0eaeef8a10bc1b6e9990fa947ef13738dc1298030300c2f38');
 assert.deepEqual(httpBinding.before,httpBinding.after);assert.equal(httpBinding.unchanged,true);
 // Production exporter changed only after this earlier real HTTP run; retain its own snapshot hash.
 for(const item of httpBinding.before)if(item.path!==exporterPath)assert.deepEqual(bind(item.path),item);
 const httpScript=read(http+'/executed-script.mts.txt').toString();assert.equal(sha(httpScript),httpBinding.script.sha256);
 assert.ok(httpScript.includes('servername: "localhost", ca, path: url'));assert.ok(!httpScript.includes('rejectUnauthorized: false'));
 assert.ok(httpScript.includes('"--pull", "never"'));assert.ok(httpScript.includes('readonly'));
 const rawLog=read(http+'/caddy.log').toString().trim().split(/\r?\n/).map(line=>JSON.parse(line));
 const access=rawLog.filter(x=>String(x.logger??'').startsWith('http.log.access.'));
 assert.equal(access.length,149);
 for(let i=0;i<136;i++){
  assert.equal(access[i].logger,'http.log.access.log0');assert.equal(access[i].status,200);assert.equal(access[i].size,index.records[i].bytes);
  assert.equal(access[i].bytes_read,0);assert.ok(!('request' in access[i]));assert.ok(!('resp_headers' in access[i]));
 }
 assert.equal(access[136].size,1595187);assert.equal(access[137].size,0);assert.equal(access[137].status,200);
 assert.deepEqual(access.slice(138,141).map(x=>({logger:x.logger,status:x.status,size:x.size})),[
  {logger:'http.log.access.log1',status:404,size:0},{logger:'http.log.access.log1',status:404,size:0},{logger:'http.log.access.log1',status:200,size:1595187}]);
 assert.equal(access[141].status,200);assert.equal(access[142].size,1595187);assert.ok(access.slice(143).every(x=>x.status===404));
 assert.equal(httpResult.status,'PASS');assert.equal(httpResult.staticBytes,22954411);assert.equal(httpResult.cases.length,5);
 assert.equal(httpResult.apiRequests.length,8);assert.equal(httpResult.publicationHash,index.publicationHash);
 const adapted=JSON.parse(JSON.parse(read(http+'/validation.json').toString()).output);
 const pathMatchers:any[]=[];function inspect(value:any){if(!value||typeof value!=='object')return;if(Array.isArray(value))value.forEach(inspect);else{
  if(Array.isArray(value.path))pathMatchers.push(value.path);Object.values(value).forEach(inspect);}}
 // Logging classifiers also have broad path matchers; the exact static routes all contain a publication hash.
 inspect(adapted);const actualPaths=pathMatchers.flat().filter(x=>String(x).startsWith('/v2/sky/')&&/\/[a-f0-9]{64}\//.test(x));
 for(const r of index.records)assert.equal(actualPaths.filter(x=>x===r.route).length,2);
 assert.equal(actualPaths.length,272);
 const httpAudit={inputs:['result.json','binding.json','executed-script.mts.txt','caddy.log','validation.json','Caddyfile','local-ca.crt','container.json','final-stats.json'].map(n=>bind(http+'/'+n)),
  actualAccessRequests:access.length,sequentialFileRequests:136,sequentialFilePayloadBytes:access.slice(0,136).reduce((n,x)=>n+x.size,0),
  authorizedPreviewAndWarmHead:access.slice(136,141),discoveryFallbackRejected:access.slice(141),
  exactAdaptedRouteEntries:actualPaths.length,httpRuntimeSource:httpBinding.before.find((x:any)=>x.path===exporterPath),currentSource:sourceBefore[0],
  scope:'Independent saved-output/source/log audit, no new HTTP execution. Local verified-TLS assertion execution is the author run; each logged first-136 actual size and adapted exact route independently corroborated. Memory is a final snapshot, not peak or capacity.'};
 save('http-output-independent-audit.json',httpAudit);
 assert.deepEqual(sourceFiles.map(bind),sourceBefore);
 assert.deepEqual(walk('workers/miniapp-api/assets'),allOriginalAssets);for(const item of preserved)assert.equal(bind(item.path).sha256,item.sha256);
 save('review.json',{status:'PASS',scope:'Only repaired canonical guard / unchanged r2-r3 whole bundle plus saved actual local HTTP output audit, not a repeat of publication, staging or HTTP matrix.',sourceBefore,routeControls,
  priorIndependentReview:bind('output/sky-static-export-independent-1002-r2/review.json'),priorDotOnly:bind('output/sky-static-export-independent-1002-r2/canonical-route-controls.json'),
  publication:bind(publication+'/index.json'),newPublication:bind(newPublication+'/index.json'),exactOldNewInventory:priorInventory,
  httpAudit:bind(output+'/http-output-independent-audit.json'),preservedUnchanged:preserved});
 console.log(JSON.stringify({output,result:bind(output+'/review.json')}));
}else try{
 const api=Object.fromEntries(ownerNames.map(name=>[name,modules.get('./'+name+'.ts')]));
 const owners:any={moonTexture:new api['moon-texture-publication'].MoonTexturePublicationService(),
  marsTexture:new api['mars-texture-publication'].MarsTexturePublicationService(),mercuryTexture:new api['mercury-texture-publication'].MercuryTexturePublicationService(),
  jupiterBands:new api['jupiter-bands-publication'].JupiterBandsPublicationService(),saturnBands:new api['saturn-bands-publication'].SaturnBandsPublicationService(),
  uranusBands:new api['uranus-bands-publication'].UranusBandsPublicationService(),neptuneBands:new api['neptune-bands-publication'].NeptuneBandsPublicationService(),
  galacticImage:new api['galactic-image-publication'].GalacticImagePublicationService(),landscape:new api['sky-landscape-publication'].SkyLandscapePublicationService(),
  wideFieldW3:new api['wide-field-w3-publication'].WideFieldW3PublicationService(),sdssOpticalImages:new api['sdss-optical-imagery'].SdssOpticalImageryService()};
 const constellation=new api['constellation-publication'].ConstellationPublicationService();
 const expected=new Map<string,any>();
 const put=(route:string,body:Buffer,extra:any={})=>{assert.ok(!expected.has(route));expected.set(route,{route,bytes:body.length,sha256:sha(body),...extra});};
 for(const name of ['moonTexture','marsTexture','mercuryTexture','jupiterBands','saturnBands','uranusBands','neptuneBands','galacticImage']){
  const owner=owners[name],m=owner.manifest();put(m.image.downloadUrl,await owner.image(m.publicationHash),{owner:name});}
 const moon=owners.moonTexture.manifest();const oldHash='ccdcceac70cf74c041cff589f59ea6a2b06f8b741f0be97e67b59799b22b73e6';
 assert.match(execFileSync('git',['show','HEAD:workers/miniapp-api/src/moon-texture-publication.ts'],{cwd:ROOT,encoding:'utf8'}),new RegExp(oldHash));
 put(`/v2/sky/moon/${oldHash}/${moon.image.file}`,await owners.moonTexture.image(oldHash),{owner:'old immutable Moon alias'});
 const coverage=owners.moonTexture.coverageManifest();put(coverage.image.downloadUrl,await owners.moonTexture.coverageImage(coverage.publicationHash),{owner:'coverage'});
 const lm=owners.landscape.manifest();for(const file of ['stara-lesna-original.zip',...lm.resources.flatMap((r:any)=>[r.image.file,r.alpha.file])]){
  const a=await owners.landscape.asset(lm.publicationHash,file);put(`/v2/sky/landscape/${lm.publicationHash}/${file}`,a.bytes,{owner:'landscape',originalSource:file.endsWith('.zip')});}
 const wm=owners.wideFieldW3.manifest();put(wm.propertiesUrl,Buffer.from(await owners.wideFieldW3.properties(wm.publicationHash)),{owner:'wide-field properties'});
 for(let pixel=0;pixel<12;pixel++)put(`/v2/sky/wide-field/${wm.publicationHash}/Norder0/Dir0/Npix${pixel}.jpg`,await owners.wideFieldW3.tile(wm.publicationHash,pixel),{owner:'wide-field',pixel});
 const cm=constellation.get().data,sourceNotices:any[]=[];
 for(const file of [...cm.images.map((x:any)=>x.file),cm.geometryAsset.file,...Object.keys(cm.provenance.definitions.sourceFiles)]){
  const a=await constellation.asset(cm.catalogHash,file);put(`/v2/sky/constellations/${cm.catalogHash}/assets/${file}`,a.bytes,{owner:'constellation'});
  if(Object.hasOwn(cm.provenance.definitions.sourceFiles,file)){
   const disk=read('workers/miniapp-api/assets/constellations/'+file),normalized=Buffer.from(disk.toString().replaceAll('\r\n','\n'));
   assert.ok(a.bytes.equals(normalized));assert.equal(sha(a.bytes),cm.provenance.definitions.sourceFiles[file]);
   sourceNotices.push({file,diskBytes:disk.length,diskSha256:sha(disk),originalLFBytes:a.bytes.length,originalLFSha256:sha(a.bytes),crlfPairs:(disk.toString().match(/\r\n/g)??[]).length});
  }
 }
 for(const reference of Object.keys(contracts.SDSS_OPTICAL_PUBLICATIONS)){
  const m=owners.sdssOpticalImages.currentManifest(reference);for(const level of Object.values(m.levels) as any[]){
   const a=await owners.sdssOpticalImages.get(reference,Object.keys(m.levels).find(k=>m.levels[k]===level),m.publicationHash);put(level.downloadUrl,a.bytes,{owner:'approved SDSS JPEG',reference,fieldDegrees:level.fieldDegrees});}}
 assert.equal(expected.size,136);assert.equal(index.schemaVersion,'starward-sky-static-export-v1');assert.equal(sha(JSON.stringify(index.records)),index.publicationHash);
 assert.equal(index.records.length,expected.size);
 const inventory=walk(publication+'/files');assert.equal(inventory.length,136);
 const readback=index.records.map((r:any)=>{
  const a=bind(publication+'/files'+r.route),e=expected.get(r.route);assert.ok(e,'unapproved route '+r.route);
  assert.equal(a.bytes,r.bytes);assert.equal(a.sha256,r.sha256);assert.equal(a.bytes,e.bytes);assert.equal(a.sha256,e.sha256);
  assert.ok(!r.route.includes('/optical/')&&!r.route.includes('/deep-sky/')&&!/\.(fits|fit|fz|bzip2|npy|tiff)$/i.test(r.route));
  return {...a,owner:e.owner,reference:e.reference??null};});
 assert.equal(readback.reduce((s:any,x:any)=>s+x.bytes,0),22954411);
 assert.equal(frozen.skyStaticDeliveryFragment(index.records),read(publication+'/delivery.caddy').toString());
 const oldController=execFileSync('git',['show','HEAD:workers/miniapp-api/src/controller.ts'],{cwd:ROOT,encoding:'utf8'});
 const oldConstellation=execFileSync('git',['show','HEAD:workers/miniapp-api/src/constellation.controller.ts'],{cwd:ROOT,encoding:'utf8'});
 fs.writeFileSync(out('HEAD-controller.ts.txt'),oldController,{flag:'wx'});fs.writeFileSync(out('HEAD-constellation.controller.ts.txt'),oldConstellation,{flag:'wx'});
 const beforeController=new (frozenModule(oldController,'HEAD-controller.ts').MiniappController)(owners);
 const afterController=new (frozenModule(read('workers/miniapp-api/src/controller.ts').toString(),'current-controller.ts').MiniappController)(owners);
 const beforeConst=new (frozenModule(oldConstellation,'HEAD-constellation.controller.ts').ConstellationController)(constellation);
 const afterConst=new (frozenModule(read('workers/miniapp-api/src/constellation.controller.ts').toString(),'current-constellation.controller.ts').ConstellationController)(constellation);
 function reply(){const headers:any={};return {headersObject:headers,body:null as any,header(k:string,v:string){headers[k.toLowerCase()]=v;return this},headers(h:any){for(const [k,v]of Object.entries(h))headers[k.toLowerCase()]=v;return this},send(b:any){this.body=Buffer.isBuffer(b)?b:Buffer.from(b);return this}};}
 async function call(r:any,controller:any,constCtrl:any){
  const parts=r.route.split('/'),kind=parts[3],rp=reply();
  if(kind==='constellations')await constCtrl.asset(parts[4],parts[6],rp);
  else if(kind==='moon'&&parts[4]==='coverage')await controller.moonCoverageImage(parts[5],parts[6],rp);
  else if(kind==='wide-field'&&parts[5]==='properties')await controller.wideFieldProperties(parts[4],rp);
  else if(kind==='wide-field')await controller.wideFieldTile(parts[4],parts[7],rp);
  else await controller[({moon:'moonTextureImage',mars:'marsTextureImage',mercury:'mercuryTextureImage',jupiter:'jupiterBandsImage',saturn:'saturnBandsImage',uranus:'uranusBandsImage',neptune:'neptuneBandsImage',galactic:'galacticImage',landscape:'skyLandscapeAsset','sdss-optical':'sdssOpticalImage'} as any)[kind]](parts[4],parts[5],rp);
  return rp;
 }
 const handlerReadbacks=[];for(const r of index.records){const before=await call(r,beforeController,beforeConst),after=await call(r,afterController,afterConst);
  assert.deepEqual(after.headersObject,before.headersObject);assert.deepEqual(after.headersObject,r.headers);assert.ok(after.body.equals(before.body));assert.equal(sha(after.body),r.sha256);
  handlerReadbacks.push({route:r.route,oldHeaders:before.headersObject,currentHeaders:after.headersObject,sha256:sha(after.body),bytes:after.body.length});}
 save('actual-publication-readback.json',{expected:[...expected.values()],readback,sourceNotices,handlerReadbacks});
 const headerControls=[];for(const bad of [{'content-type':'text/plain\r\nX: y'},{'content-type':'text/plain"\nrespond 200'},{'Bad-Header':'text/plain'},{'content-type':'{bad}'},{'content-type':'\\bad'}]){
  assert.throws(()=>frozen.skyStaticDeliveryFragment([{...index.records[0],headers:bad}]),/sky_static_header_invalid/);headerControls.push(bad);}
 // Actual exporter code, real validated owner bytes, actual filesystem; controlled failures only at FS effects.
 const good=await frozen.exportSkyPublicAssets(out('fresh-success'));
 assert.equal(good.files,136);assert.equal(good.bytes,22954411);assert.equal(good.publicationHash,index.publicationHash);
 const successInventory=walk(output+'/fresh-success/publication');
 await assert.rejects(frozen.exportSkyPublicAssets(out('fresh-success')),(e:any)=>e.code==='EEXIST');
 assert.deepEqual(walk(output+'/fresh-success/publication'),successInventory);
 let writes=0;
 const failed=frozenModule(exportSource,'actual-export-write-failure.ts',{...fsp,writeFile:async(...args:any[])=>{if(++writes===2)throw new Error('bounded native write failure');return (fsp.writeFile as any)(...args)}});
 await assert.rejects(failed.exportSkyPublicAssets(out('write-failure')),/bounded native write failure/);
 assert.ok(!fs.existsSync(out('write-failure/publication')));const writeFailure=walk(output+'/write-failure');assert.equal(writeFailure.length,1);
 let reads=0;
 const corrupt=frozenModule(exportSource,'actual-export-readback-failure.ts',{...fsp,readFile:async(...args:any[])=>{const b=await (fsp.readFile as any)(...args);if(++reads===1){const c=Buffer.from(b);c[0]^=1;return c}return b}});
 await assert.rejects(corrupt.exportSkyPublicAssets(out('readback-failure')),/sky_static_write_readback_failed/);
 assert.ok(!fs.existsSync(out('readback-failure/publication')));const readFailure=walk(output+'/readback-failure');assert.equal(readFailure.length,1);
 const recovered=await frozen.exportSkyPublicAssets(out('fresh-recovery'));assert.equal(recovered.publicationHash,index.publicationHash);
 assert.deepEqual(walk(output+'/write-failure'),writeFailure);assert.deepEqual(walk(output+'/readback-failure'),readFailure);
 await assert.rejects(frozen.exportSkyPublicAssets('relative-output'),/sky_static_output_not_absolute/);
 // Bounded mutation: skipping real-file readback would incorrectly promote the same corrupt-read result.
 const guard='if (!readback.equals(input.bytes)) throw new Error("sky_static_write_readback_failed");';assert.equal(exportSource.split(guard).length-1,1);
 const mutant=exportSource.replace(guard,'/* task-only bypass readback */');fs.writeFileSync(out('readback-bypass-mutant.ts.txt'),mutant,{flag:'wx'});
 const mutation=frozenModule(mutant,'mutant-export.ts',{...fsp,readFile:async(...args:any[])=>{const b=await (fsp.readFile as any)(...args);const c=Buffer.from(b);c[0]^=1;return c}});
 const mutated=await mutation.exportSkyPublicAssets(out('mutant-readback-bypass'));assert.equal(mutated.files,136);
 const lifecycle={good,writeFailure,readFailure,recovered,rejectedExistingContainer:true,relativeRejected:true,
  readbackMutation:{promotedDespiteWrongObservedReadback:true,output:mutated,source:bind(output+'/readback-bypass-mutant.ts.txt')},
  scope:'Real publication owners and filesystem; write/read errors controlled. Directory rename is atomic publication naming, not power-loss fsync durability or remote deployment.'};
 save('staging-controls.json',lifecycle);
 assert.deepEqual(sourceFiles.map(bind),sourceBefore);assert.deepEqual(walk('workers/miniapp-api/assets'),allOriginalAssets);
 for(const item of preserved)assert.equal(bind(item.path).sha256,item.sha256);
 save('review.json',{status:routeControls.some(x=>x.accepted)?'PASS_WITH_CANONICAL_GUARD_GAP':'PASS',sourceBefore,routeControls,headerControls,
  completeActualReadback:bind(output+'/actual-publication-readback.json'),lifecycle:bind(output+'/staging-controls.json'),
  originalAssetsUnchanged:allOriginalAssets,preservedUnchanged:preserved,
  scope:['136 approved route/file payloads independently enumerated at publication owners; exact readback and old/new 14 handler header/byte semantics.',
   'Not a client download inventory: includes 12,377,473-byte original landscape ZIP and constellation licence/source notices.',
   'No Caddy HTTP execution here; matcher/path canonicalization, fallback, TLS/operator-preview integration and remote service capacity remain separate actual-runtime obligations.',
   'Trust boundary is existing approved owners and fresh local output; no scientific/raw/private disk crawl or discovery is exported.']});
 console.log(JSON.stringify({output,result:bind(output+'/review.json')}));
}catch(error){save('failure.json',{status:'FAILED',error:String(error),stack:(error as Error).stack,sourceBefore});process.exitCode=1;console.log(JSON.stringify({output,failure:bind(output+'/failure.json')}));}
