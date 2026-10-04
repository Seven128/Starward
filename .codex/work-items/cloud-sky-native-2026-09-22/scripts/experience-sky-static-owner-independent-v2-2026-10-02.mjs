/** Frozen actual owner modules + real task-only FS, controlled Docker/fetch. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
const file=p=>path.join(ROOT,p),sha=raw=>createHash('sha256').update(raw).digest('hex');
const bound=p=>{const b=fs.readFileSync(file(p));return{path:p,bytes:b.length,sha256:sha(b)}};
const json=p=>JSON.parse(fs.readFileSync(file(p),'utf8'));
const sourceNames=['tools/deployment/sky-static-bundle.mjs','tools/deployment/sky-static-release.mjs',
  'tools/deployment/compose-runtime.mjs','tools/deployment/operator-preview-tls.mjs',
  'tools/deployment/sky-static-bundle.d.mts','workers/miniapp-api/src/sky-public-asset-export.ts',
  'infrastructure/deployment/miniapp-api.Dockerfile','tools/deployment/sky-static-bundle.test.mjs','tools/deployment/sky-static-release.test.mjs'];
const sources=sourceNames.map(bound),baseline=json('.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json');
for(const i of baseline)assert.equal(bound(i.path).sha256,i.sha256);
const protectedInputs=[...sources,...baseline.map(i=>bound(i.path))];
function inventory(name){for(const i of fs.readdirSync(file(name),{withFileTypes:true})){
  const p=name+'/'+i.name;if(i.isDirectory())inventory(p);else if(i.isFile())protectedInputs.push(bound(p));
}}
inventory('workers/miniapp-api/assets/deep-sky');
const sourceIndex='output/sky-static-approved-export-1002-r3/publication/index.json';protectedInputs.push(bound(sourceIndex));
const approved=json(sourceIndex),fixtures=['triangulum-australe.png','telescopium.png'].map(name=>{
  const record=approved.records.find(r=>r.route.endsWith('/'+name));assert.ok(record);
  const p='workers/miniapp-api/assets/constellations/'+name,bytes=fs.readFileSync(file(p));
  assert.equal(bytes.length,record.bytes);assert.equal(sha(bytes),record.sha256);protectedInputs.push(bound(p));return{record,bytes,source:bound(p)};
});
const output=process.argv[2];assert.ok(output?.startsWith('output/'));assert.ok(!fs.existsSync(file(output)));fs.mkdirSync(file(output));
const frozen=output+'/frozen';fs.mkdirSync(file(frozen));
for(const p of sourceNames){const target=frozen+'/'+path.basename(p);fs.copyFileSync(file(p),file(target),fs.constants.COPYFILE_EXCL);assert.equal(bound(target).sha256,bound(p).sha256)}
fs.copyFileSync(fileURLToPath(import.meta.url),file(output+'/executed-script.mjs.txt'),fs.constants.COPYFILE_EXCL);
const save=(name,value)=>fs.writeFileSync(file(output+'/'+name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const bundle=await import(pathToFileURL(file(frozen+'/sky-static-bundle.mjs')).href);
const owner=await import(pathToFileURL(file(frozen+'/sky-static-release.mjs')).href);
const cases=[];
async function artifact(name,items,revision,digest){
  const result=await bundle.writeSkyStaticBundle(file(output+'/image-'+name),(async function*(){for(const item of items)yield{route:item.record.route,headers:item.record.headers,bytes:item.bytes}})());
  const seal={schemaVersion:'starward-sky-static-image-artifact-v1',revision,publicationHash:result.publicationHash,
    indexSha256:sha(fs.readFileSync(path.join(result.output,'index.json'))),fragmentSha256:sha(fs.readFileSync(path.join(result.output,'delivery.caddy')))};
  fs.writeFileSync(path.join(result.output,'image-artifact.json'),JSON.stringify(seal,null,2)+'\n',{flag:'wx'});
  return{...result,revision,digest,seal};
}
function input(store,image,options={}){
  const calls=[],containers=new Map();let nextId=1;
  return{calls,containers,validation:{revision:image.revision,imageDigest:image.digest,domain:'api-staging.controlled.invalid',operations:{skyStaticDirectory:store}},
    deploy:{STARWARD_SKY_STATIC_DIRECTORY:store,STARWARD_IMAGE_REF:'controlled/image@'+image.digest,...options},
    execute({command,args,step}){
      assert.equal(command,'docker');calls.push({args:[...args],step});
      if(args[0]==='image'){assert.equal(args[1],'inspect');return{stdout:Buffer.from((options.inspectRevision??image.revision)+'\n'),stderr:Buffer.alloc(0)}}
      if(args[0]==='create'){
        assert.equal(args[2],'never');const name=args[args.indexOf('--name')+1];assert.ok(name.startsWith('starward-sky-artifact-'));
        const owner=args[args.indexOf('--label')+1];assert.match(owner,/^starward\.sky-artifact-owner=[a-f0-9-]{36}$/);
        const id=String(nextId++).padStart(64,'a');containers.set(id,{name,owner:options.foreignConflict?'starward.sky-artifact-owner=foreign':owner});
        if(options.foreignConflict)throw Error('controlled_foreign_name_conflict');
        if(options.lostCreateResult)throw Error('controlled_process_result_lost_after_create');return{stdout:Buffer.from('controlled-container-id\n'),stderr:Buffer.alloc(0)};
      }
      if(args[0]==='container'){
        assert.deepEqual(args.slice(0,3),['container','ls','--all']);assert.equal(args.at(-1),'{{.ID}}');
        if(options.listFailure)throw Error('controlled_container_list_unavailable');
        const filters=args.filter((_,i)=>args[i-1]==='--filter'),name=filters.find(s=>s.startsWith('name=')).slice(7,-1),owner=filters.find(s=>s.startsWith('label=')).slice(6);
        const ids=[...containers].filter(([_,c])=>c.name===name&&c.owner===owner).map(([id])=>id);
        return{stdout:Buffer.from(options.invalidList?'not-an-id\n':ids.join('\n')),stderr:Buffer.alloc(0)};
      }
      if(args[0]==='cp'){assert.ok(args[1].endsWith(':/app/sky-public/publication'));fs.cpSync(image.output,args[2],{recursive:true});return{stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)}}
      if(args[0]==='rm'){assert.ok(containers.has(args[1]),'must remove own controlled container');assert.notEqual(containers.get(args[1]).owner,'starward.sky-artifact-owner=foreign');containers.delete(args[1]);return{stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)}}
      throw Error('unexpected controlled Docker action');
    }};
}
async function record(name,work){const result={name,...await work()};cases.push(result);save(`case-${cases.length}.json`,result)}
try{
  const old=await artifact('old',[fixtures[0]],'1'.repeat(40),'sha256:'+'1'.repeat(64));
  const next=await artifact('next',[fixtures[1]],'2'.repeat(40),'sha256:'+'2'.repeat(64));
  await record('actual no-static and immutable image source preparation, union/rollback/load/lease',async()=>{
    const prohibited=()=>{throw Error('must not execute')};assert.equal(await owner.prepareSkyStaticDelivery({validation:{},deploy:{},execute:prohibited}),null);
    assert.equal(await owner.loadSkyStaticDelivery({validation:{},deploy:{}}),null);
    const store=file(output+'/normal-store'),a=input(store,old),b=input(store,next);
    const first=await owner.prepareSkyStaticDelivery(a);assert.equal(first.identity.files,1);assert.equal(a.containers.size,0);
    await assert.rejects(owner.loadSkyStaticDelivery(a),/store_locked/);await first.dispose();await first.dispose();
    const second=await owner.prepareSkyStaticDelivery(b);assert.equal(second.identity.files,2);const union=second.identity.deliveryPublicationHash;await second.dispose();
    const rollback=await owner.prepareSkyStaticDelivery(a);assert.equal(rollback.identity.imagePublicationHash,old.publicationHash);assert.equal(rollback.identity.deliveryPublicationHash,union);
    assert.deepEqual(rollback.records.map(r=>r.route).sort(),fixtures.map(i=>i.record.route).sort());await rollback.dispose();
    const n=a.calls.length,loaded=await owner.loadSkyStaticDelivery(a);assert.equal(a.calls.length,n);assert.equal(loaded.identity.deliveryPublicationHash,union);await loaded.dispose();
    assert.ok(!fs.existsSync(path.join(store,'preparation.lock')));
    return{status:'PASS',syntheticImageIdentity:true,realPayloads:fixtures.map(i=>i.source),identity:rollback.identity,calls:a.calls,secondCalls:b.calls,loadExtraDockerCalls:0};
  });
  await record('unknown image revision and immutable route conflict fail before prepared pointer promotion',async()=>{
    const store=file(output+'/failure-store'),initial=await owner.prepareSkyStaticDelivery(input(store,old));await initial.dispose();
    const pointer=fs.readFileSync(path.join(store,'prepared-inventory.json'));
    const mismatch=input(store,next,{inspectRevision:'3'.repeat(40)});await assert.rejects(owner.prepareSkyStaticDelivery(mismatch),/image_revision_mismatch/);
    assert.equal(mismatch.calls.length,1);assert.ok(fs.readFileSync(path.join(store,'prepared-inventory.json')).equals(pointer));
    const changed=await artifact('conflict',[{...fixtures[0],bytes:Buffer.from('different bytes at the same immutable route')}],'3'.repeat(40),'sha256:'+'3'.repeat(64));
    const conflict=input(store,changed);await assert.rejects(owner.prepareSkyStaticDelivery(conflict),/history_conflict/);
    assert.equal(conflict.containers.size,0);assert.ok(fs.readFileSync(path.join(store,'prepared-inventory.json')).equals(pointer));assert.ok(!fs.existsSync(path.join(store,'preparation.lock')));
    return{status:'PASS',pointerSha256:sha(pointer),mismatchCalls:mismatch.calls,conflictCalls:conflict.calls};
  });
  await record('same exact bytes without static marker and wrong headers cannot qualify; valid controlled full GET/HEAD succeeds',async()=>{
    const selected=input(file(output+'/verify-store'),old,{STARWARD_OPERATOR_PREVIEW_TOKEN:'synthetic-controlled-preview-token'}),delivery=await owner.prepareSkyStaticDelivery(selected);
    const fetch=(mode)=>async(url,options)=>{
      if(!options.headers['X-Starward-Operator-Preview'])return new Response(null,{status:mode==='unguarded'?200:404});
      const headers={...fixtures[0].record.headers,...(mode==='api'?{}:{'x-starward-sky-delivery':'static'})};
      if(mode==='wrong-header')headers['cache-control']='no-cache';
      return new Response(options.method==='HEAD'?null:mode==='corrupt'?Buffer.from('wrong'):fixtures[0].bytes,{headers});
    };
    try{
      for(const [mode,error]of [['api','http_identity_mismatch'],['unguarded','preview_static_not_guarded'],['wrong-header','http_header_mismatch'],['corrupt','http_identity_mismatch']])
        await assert.rejects(owner.verifySkyStaticDelivery({...selected,delivery,fetchImpl:fetch(mode)}),new RegExp(error));
      const result=await owner.verifySkyStaticDelivery({...selected,delivery,fetchImpl:fetch('valid')});assert.equal(result.checkedBytes,fixtures[0].bytes.length);
      return{status:'PASS',result,scope:'controlled Fetch; no HTTP/TLS/native or server offload claim'};
    }finally{await delivery.dispose()}
  });
  await record('persistent inventory must reject an extra canonical route absent from every retained image source',async()=>{
    const store=file(output+'/extra-store'),selected=input(store,old),delivery=await owner.prepareSkyStaticDelivery(selected);await delivery.dispose();
    const pointerPath=path.join(store,'prepared-inventory.json'),pointer=JSON.parse(fs.readFileSync(pointerPath,'utf8'));
    const sourceBefore=pointer.sources.map(s=>({source:s,index:sha(fs.readFileSync(path.join(store,s.directory,'publication','index.json'))),seal:sha(fs.readFileSync(path.join(store,s.directory,'publication','image-artifact.json')))}));
    const directory=path.join(store,pointer.generation,'publication'),idx=JSON.parse(fs.readFileSync(path.join(directory,'index.json'),'utf8'));
    const extraBytes=Buffer.from('SYNTHETIC UNAPPROVED EXTRA PAYLOAD'),extra={route:'/v2/sky/moon/'+'d'.repeat(64)+'/unapproved.jpg',bytes:extraBytes.length,sha256:sha(extraBytes),headers:{'content-type':'image/jpeg','cache-control':'public, max-age=31536000, immutable','x-content-type-options':'nosniff'}};
    fs.mkdirSync(path.dirname(path.join(directory,'files',extra.route)),{recursive:true});fs.writeFileSync(path.join(directory,'files',extra.route),extraBytes,{flag:'wx'});
    idx.records.push(extra);idx.records.sort((a,b)=>a.route.localeCompare(b.route,'en'));idx.publicationHash=sha(JSON.stringify(idx.records));
    fs.writeFileSync(path.join(directory,'index.json'),JSON.stringify(idx,null,2)+'\n');fs.writeFileSync(path.join(directory,'delivery.caddy'),bundle.skyStaticDeliveryFragment(idx.records));
    pointer.publicationHash=idx.publicationHash;fs.writeFileSync(pointerPath,JSON.stringify(pointer,null,2)+'\n');
    const layout=await bundle.validateSkyStaticBundle(directory);assert.equal(layout.files,2);
    let result,error;try{result=await owner.loadSkyStaticDelivery(selected)}catch(e){error=String(e)}
    const sourceAfter=pointer.sources.map(s=>({source:s,index:sha(fs.readFileSync(path.join(store,s.directory,'publication','index.json'))),seal:sha(fs.readFileSync(path.join(store,s.directory,'publication','image-artifact.json')))}));assert.deepEqual(sourceAfter,sourceBefore);
    const admitted=Boolean(result?.records.some(r=>r.route===extra.route));if(result)await result.dispose();
    return{status:admitted?'FAILED_SOURCE_ADMISSION':'PASS',bugDetected:admitted,error,extra,sourceBefore,sourceAfter,originalApprovedSourceUnchanged:true,
      loadAdmittedUnreferencedExtra:admitted,returnedIdentity:result?.identity,zeroDockerLoad:true};
  });
  await record('Docker create result loss must not silently orphan this operation-owned stopped container',async()=>{
    const store=file(output+'/lost-create-store'),selected=input(store,old,{lostCreateResult:true});let error;
    try{await owner.prepareSkyStaticDelivery(selected)}catch(e){error=String(e)}
    assert.ok(error);assert.ok(!fs.existsSync(path.join(store,'preparation.lock')));
    const ownedStillPresent=[...selected.containers];
    return{status:ownedStillPresent.length?'FAILED_OWNED_RESOURCE_CLEANUP':'PASS',bugDetected:ownedStillPresent.length>0,error,calls:selected.calls,ownedStillPresent,
      pointerNotPublished:!fs.existsSync(path.join(store,'prepared-inventory.json')),scope:'controlled process result lost after container creation; no actual Docker daemon'};
  });
  await record('Docker ambiguous create failure never removes a foreign owner and list failure is explicit',async()=>{
    const observations=[];
    for(const options of [{foreignConflict:true},{lostCreateResult:true,listFailure:true},{lostCreateResult:true,invalidList:true}]){
      const selected=input(file(output+'/cleanup-'+observations.length),old,options);let error;
      try{await owner.prepareSkyStaticDelivery(selected)}catch(e){error={message:e.message,cause:e.cause?.message}}
      assert.ok(error);assert.ok(!fs.existsSync(path.join(selected.deploy.STARWARD_SKY_STATIC_DIRECTORY,'preparation.lock')));
      assert.ok(!selected.calls.some(c=>c.args[0]==='rm'));
      if(options.foreignConflict)assert.equal(error.message,'controlled_foreign_name_conflict');
      else assert.equal(error.message,'sky_static_artifact_cleanup_unverified');
      observations.push({options,error,calls:selected.calls,retained:[...selected.containers]});
    }
    return{status:'PASS',observations,scope:'controlled external result and ownership; no Docker daemon'};
  });
  await record('HEAD alone must preserve published headers independently of valid GET',async()=>{
    const selected=input(file(output+'/head-store'),old),delivery=await owner.prepareSkyStaticDelivery(selected);let result,error;
    try{
      const fetchImpl=async(_url,options)=>new Response(options.method==='HEAD'?null:fixtures[0].bytes,{headers:{...fixtures[0].record.headers,'x-starward-sky-delivery':'static',...(options.method==='HEAD'?{'cache-control':'no-store','content-type':'application/octet-stream','x-content-type-options':'invalid'}:{})}});
      try{result=await owner.verifySkyStaticDelivery({...selected,delivery,fetchImpl})}catch(e){error=String(e)}
      return{status:result?'FAILED_HEAD_HEADER_VERIFICATION':'PASS',bugDetected:Boolean(result),result,error,scope:'actual verifier with controlled GET-correct HEAD-invalid HTTP semantics'};
    }finally{await delivery.dispose()}
  });
  save('review.json',{scope:'Frozen actual owner modules; real Windows task-only FS and existing approved bytes; Docker/Fetch controlled; no image build/pull/container/HTTP/deployment/native acceptance',
    sources,cases,status:cases.some(c=>c.bugDetected)?'FAILED_CURRENT_OWNER_REVIEW':'INDEPENDENT_OWNER_CONTROLLED_PASS'});
  const after=protectedInputs.map(i=>bound(i.path));assert.deepEqual(after,protectedInputs);
  save('binding.json',{script:bound(output+'/executed-script.mjs.txt'),review:bound(output+'/review.json'),inputsBefore:protectedInputs,inputsAfter:after,unchanged:true});
  console.log(JSON.stringify({review:bound(output+'/review.json'),binding:bound(output+'/binding.json'),cases:cases.map(c=>({name:c.name,status:c.status,bugDetected:c.bugDetected}))}));
}catch(e){save('failure.json',{message:String(e),stack:e.stack,sources,cases});throw e}
