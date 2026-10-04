import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {spawnSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {writeSkyStaticBundle,validateSkyStaticBundle,skyStaticDeliveryFragment} from '../../../../tools/deployment/sky-static-bundle.mjs';
import {skyPublicAssetHeaders} from '../../../../workers/miniapp-api/src/sky-public-asset-headers.ts';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),file=(p:string)=>path.join(root,p),sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const bind=(p:string)=>{const b=fs.readFileSync(file(p));return{path:p,bytes:b.length,sha256:sha(b)}};
const out=process.argv[2];assert.match(out??'',/^output\/[a-z0-9-]+$/);assert.ok(!fs.existsSync(file(out)));fs.mkdirSync(file(out));
const save=(p:string,v:unknown)=>fs.writeFileSync(file(out+'/'+p),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
fs.copyFileSync(fileURLToPath(import.meta.url),file(out+'/executed-script.mts.txt'),fs.constants.COPYFILE_EXCL);
const sourceNames=['tools/deployment/sky-static-bundle.mjs','workers/miniapp-api/src/sky-public-asset-headers.ts','workers/miniapp-api/assets/deep-sky/manifest.json'];
const sources=sourceNames.map(bind),protectedFiles=[...sources];
const baseline=JSON.parse(fs.readFileSync(file('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'),'utf8'));
for(const b of baseline){assert.equal(bind(b.path).sha256,b.sha256);protectedFiles.push(bind(b.path))}
for(const p of fs.readdirSync(file('workers/miniapp-api/assets/deep-sky'),{recursive:true,withFileTypes:true}) as any[])if(p.isFile())protectedFiles.push(bind(path.relative(root,path.join(p.parentPath,p.name)).replaceAll('\\','/')));
const manifest=JSON.parse(fs.readFileSync(file('workers/miniapp-api/assets/deep-sky/manifest.json'),'utf8')),publicationHash=sha(JSON.stringify(manifest)),m42=manifest.entries.find((e:any)=>e.objectRef==='M:42');
assert.equal(publicationHash,'8b970f207d1b99b3b92e74eb68f0aa6a7ca1f7b5ac51ad86e9d0c6e239540054');
const inputs:any[]=[],realMetadata:any[]=[];
for(const [level,descriptor]of Object.entries(m42.levels) as any){
 const bytes=fs.readFileSync(file('workers/miniapp-api/assets/deep-sky/'+descriptor.file));assert.equal(bytes.length,descriptor.bytes);assert.equal(sha(bytes),descriptor.sha256);
 const headers=skyPublicAssetHeaders('deep-sky','image/png',descriptor.fieldDegrees,{publicationHash,sourceId:`imagery:${manifest.publicationId}:${publicationHash}`,descriptor:{...descriptor,format:'png'}});
 assert.equal(headers['x-starward-image-display-support'],JSON.stringify(descriptor.displaySupport));
 inputs.push({route:`/v2/sky/deep-sky/${publicationHash}/${descriptor.file}`,bytes,headers});realMetadata.push({level,file:descriptor.file,bytes:bytes.length,sha256:descriptor.sha256,displaySupportHeaderBytes:Buffer.byteLength(headers['x-starward-image-display-support']),displaySupport:descriptor.displaySupport});
}
const literal={foo:'quote " backslash \\ hash # braces {http.request.uri} {http.request.host} } header X-Injected yes',nested:{quote:'" respond 299 #',slash:'\\',newline:'literal \\n'}};
const literalValue=JSON.stringify(literal),syntheticBytes=Buffer.from('owned header quoting fixture');
const synthetic={route:`/v2/sky/deep-sky/${'d'.repeat(64)}/M-1/M-1-overview.jpg`,bytes:syntheticBytes,headers:{'content-type':'image/jpeg','cache-control':'public, max-age=31536000, immutable','x-content-type-options':'nosniff','x-starward-image-display-support':literalValue}};
inputs.push(synthetic);
const rejected:any[]=[];
for(const [name,value]of [['environment interpolation',JSON.stringify({foo:'{$STARWARD_HEADER_PROBE}'})],['raw token delimiter',JSON.stringify({foo:String.fromCharCode(96)+' header bad'})],['actual CR LF',JSON.stringify({foo:'okay'})+'\r\nrespond 299'],['noncanonical JSON','{ "foo": "bar" }'],['not object','["x"]']] as const){
 let error:string|undefined;try{skyStaticDeliveryFragment([{...synthetic,bytes:syntheticBytes.length,sha256:sha(syntheticBytes),headers:{...synthetic.headers,'x-starward-image-display-support':value}}])}catch(e){error=String(e)}
 assert.ok(error,name);rejected.push({name,value,error});
}
const bundle=await writeSkyStaticBundle(file(out+'/container'),(async function*(){yield* inputs})()),checked=await validateSkyStaticBundle(bundle.output);
const caddyfile='{\n admin off\n auto_https off\n}\nhttp://:8080 {\n import /etc/caddy/delivery.caddy\n handle {\n  respond "fallback" 404\n }\n}\n';
fs.writeFileSync(file(out+'/Caddyfile'),caddyfile,{flag:'wx'});
const image='caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648',owner=randomUUID(),name='sky-header-'+owner,calls:any[]=[],responses:any[]=[];
const docker=(args:string[],step:string)=>{const r=spawnSync('docker',args,{encoding:'utf8',windowsHide:true,timeout:20_000,maxBuffer:4*1024*1024});calls.push({step,args,exitCode:r.status,stdout:r.stdout,stderr:r.stderr,error:r.error?.message});if(r.error||r.status!==0)throw Error('owned_caddy_'+step+'_failed');return r.stdout.trim()};
const mounts=['--mount',`type=bind,source=${path.join(bundle.output,'files')},target=/srv/sky-public/files,readonly`,'--mount',`type=bind,source=${path.join(bundle.output,'delivery.caddy')},target=/etc/caddy/delivery.caddy,readonly`,'--mount',`type=bind,source=${file(out+'/Caddyfile')},target=/etc/caddy/Caddyfile,readonly`];
let attempted=false;
try{
 const adapted=docker(['run','--rm','--pull','never',...mounts,image,'caddy','adapt','--config','/etc/caddy/Caddyfile','--validate'],'adapt');save('adapted.json',JSON.parse(adapted));
 attempted=true;docker(['run','-d','--pull','never','--name',name,'--label','starward.independent-w3-header='+owner,'--memory','128m','--cpus','1','--pids-limit','64','--read-only','--tmpfs','/data:size=8m','--tmpfs','/config:size=8m','--tmpfs','/tmp:size=8m','-p','127.0.0.1::8080',...mounts,image],'start');
 const port=Number(docker(['port',name,'8080/tcp'],'port').split(':').at(-1));
 const request=(route:string,method='GET')=>new Promise<any>((resolve,reject)=>{const r=http.request({hostname:'127.0.0.1',port,path:route,method,maxHeaderSize:65536,headers:{'Accept-Encoding':'identity'}},response=>{const chunks:Buffer[]=[];let size=0;response.on('data',b=>{size+=b.length;if(size>8*1024*1024)r.destroy(Error('response_size'));else chunks.push(b)});response.on('error',reject);response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,bytes:Buffer.concat(chunks)}))});r.setTimeout(5000,()=>r.destroy(Error('local_request_timeout')));r.on('error',reject);r.end()});
 for(const record of checked.records){
  for(const method of ['GET','HEAD']){
   const reply=await request(record.route+(record.route===synthetic.route?'?independent-placeholder-probe=actual-query':''),method);
   const observed={route:record.route,method,status:reply.status,headers:reply.headers,bytes:reply.bytes.length,sha256:sha(reply.bytes)};responses.push(observed);save(`response-${responses.length}.json`,observed);
   assert.equal(reply.status,200);assert.equal(reply.headers['x-starward-sky-delivery'],'static');assert.equal(reply.headers['x-injected'],undefined);
   for(const [key,value]of Object.entries(record.headers))assert.equal(reply.headers[key],value,key);
   if(method==='GET'){assert.equal(reply.bytes.length,record.bytes);assert.equal(sha(reply.bytes),record.sha256)}else assert.equal(reply.bytes.length,0);
  }
 }
 save('responses.json',responses);
 const fallback=await request('/injection-never-admitted');assert.equal(fallback.status,404);assert.equal(fallback.bytes.toString(),'fallback');
 save('result.json',{scope:'Actual pinned Caddy local HTTP literal header parser/handler roundtrip, real M42 three existing PNG descriptors and bytes, synthetic legal JSON only for quoting. No new publication entitlement, source refinement, full deployment/TLS/WEAPP/native performance claim',status:'PASS',sources,publicationHash,realMetadata,literalFixture:literal,literalValue,rejected,responses,fallback:{status:fallback.status,body:fallback.bytes.toString()},image,containerName:name,maxResponseHeaderSize:65536});
}catch(e){save('failure.json',{message:String(e),stack:(e as Error).stack,sources,realMetadata,rejected,responses,calls});throw e}
finally{
 if(attempted){
  const selected=docker(['container','ls','--all','--filter',`name=^/${name}$`,'--filter','label=starward.independent-w3-header='+owner,'--format','{{.ID}}'],'own-discovery');
  if(selected){assert.match(selected,/^[a-f0-9]{12,64}$/);docker(['logs',selected],'logs');docker(['stop','--time','3',selected],'own-stop');docker(['rm',selected],'own-remove')}
 }
 save('process-calls.json',calls);
 const after=protectedFiles.map(b=>bind(b.path));save('binding.json',{script:bind(out+'/executed-script.mts.txt'),sources,inputsBefore:protectedFiles,inputsAfter:after,unchanged:JSON.stringify(after)===JSON.stringify(protectedFiles)});
 assert.deepEqual(after,protectedFiles);
}
console.log(JSON.stringify({result:bind(out+'/result.json'),binding:bind(out+'/binding.json'),calls:bind(out+'/process-calls.json'),responses:responses.length}));
