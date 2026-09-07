import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:net';
import path from 'node:path';
const root=process.cwd(),task=path.join(root,'.codex/work-items/miniapp-integrated-2026-09-06');
const candidate=JSON.parse(await readFile(path.join(task,'observatory-source-candidates.json'),'utf8'));
assert.equal(candidate.mode,'candidate_only_not_applied');
const docker=JSON.parse(execFileSync('docker',['inspect','starward-miniapp-demo-postgres-1'],{encoding:'utf8',windowsHide:true}))[0];
const vars=Object.fromEntries(docker.Config.Env.map(v=>{const i=v.indexOf('=');return[v.slice(0,i),v.slice(i+1)];}));
const databaseUrl=`postgresql://${encodeURIComponent(vars.POSTGRES_USER)}:${encodeURIComponent(vars.POSTGRES_PASSWORD)}@127.0.0.1:55432/${encodeURIComponent(vars.POSTGRES_DB)}`;
assert.equal(vars.POSTGRES_DB,'starward_miniapp');
const listener=createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
const token=randomUUID(),actor='admin:source-intake',headers={'x-admin-token':token,'x-admin-actor':actor,'content-type':'application/json'};
const env={...process.env,DATABASE_URL:databaseUrl,REDIS_URL:'',MINIAPP_STORAGE_MODE:'postgres',MINIAPP_AUTO_MIGRATE:'0',MINIAPP_DEVELOPMENT_FIXTURE_MODE:'0',MINIAPP_ADMIN_TOKEN:token,MINIAPP_ADMIN_RBAC:JSON.stringify({[actor]:['OWNER']}),MINIAPP_API_HOST:'127.0.0.1',MINIAPP_API_PORT:String(port),MINIAPP_AUTH_MODE:'LOCAL_TEST',MINIAPP_RELEASE_PROFILE:'LOCAL',MINIAPP_SESSION_SECRET:randomUUID()+randomUUID(),MINIAPP_MEDIA_STORAGE_MODE:'DISABLED'};
const child=spawn(process.execPath,['--import','tsx','src/main.ts'],{cwd:path.join(root,'workers/miniapp-api'),env,stdio:'ignore',windowsHide:true});
const base=`http://127.0.0.1:${port}`;let result;
try{
let ready=false;for(let i=0;i<50;i++){if(child.exitCode!==null)throw Error('temporary_admin_exited');try{if((await fetch(base+'/v2/capabilities')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}assert.ok(ready,'temporary_admin_not_ready');
async function getSpot(){const r=await fetch(base+'/v2/admin/spots',{headers});assert.equal(r.status,200);const data=(await r.json()).data;const row=data.find(x=>x.spot_id==='spot:sz-astronomical-observatory');assert.ok(row);return row;}
const before=await getSpot();assert.equal(before.name,candidate.spotName);assert.equal(before.status,'DATA_INSUFFICIENT');
const ids=new Set(before.detail.dataDisclosure.map(s=>s.id));const additions=candidate.sources.filter(s=>!ids.has(s.id)).map(s=>({...s,retrievedAt:'2026-09-07'}));
assert.equal(additions.length,2,'source_already_present_or_partial_apply');
const patch={dataDisclosure:[...before.detail.dataDisclosure,...additions],reason:'追加两条已核对的官方公众开放规则来源；不构成现场核验或发布审核，保留全部既有资料和未证项。'};
const check=await getSpot();assert.equal(check.version,before.version,'source_changed_before_patch');
const response=await fetch(base+'/v2/admin/spots/'+encodeURIComponent(before.spot_id),{method:'PATCH',headers,body:JSON.stringify(patch)});assert.equal(response.status,200,'source_patch_failed');
const after=await getSpot();assert.equal(after.version,before.version+1);assert.equal(after.status,before.status);assert.deepEqual(after.payload,before.payload);
const {dataDisclosure:oldSources,...oldDetail}=before.detail;const {dataDisclosure:newSources,...newDetail}=after.detail;assert.deepEqual(newDetail,oldDetail);assert.deepEqual(newSources,patch.dataDisclosure);assert.equal(after.publication_assessment?.complete,false);
result={mode:'local_source_intake_via_admin_http',spotId:before.spot_id,addedSourceIds:additions.map(s=>s.id),priorSourceCount:oldSources.length,sourceCount:newSources.length,priorRevision:before.version,revision:after.version,status:after.status,allOtherDetailFieldsUnchanged:true,complete:false,temporaryServiceStopped:false};
}finally{if(child.exitCode===null){child.kill();await new Promise(resolve=>{child.once('exit',resolve);setTimeout(resolve,3000);});}if(child.exitCode===null&&child.signalCode===null)throw Error('temporary_admin_cleanup_pending');}
result.temporaryServiceStopped=true;await writeFile(path.join(task,'observatory-source-intake-result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
