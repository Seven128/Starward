import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const command=process.argv[2];
const option=name=>{const at=process.argv.indexOf(name);return at<0?undefined:process.argv[at+1];};
const assert=(value,message)=>{if(!value)throw new Error(message);};
const readJson=file=>JSON.parse(readFileSync(file,'utf8').replace(/^\uFEFF/u,''));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function hashFile(file){const digest=createHash('sha256');for await(const chunk of createReadStream(file))digest.update(chunk);return digest.digest('hex');}
function child(root,name){assert(typeof name==='string'&&!path.isAbsolute(name)&&!name.includes('\\'),'invalid_relative_path');const result=path.resolve(root,name);assert(result.startsWith(path.resolve(root)+path.sep),'path_outside_package');return result;}
function filesUnder(root){return readdirSync(root,{withFileTypes:true}).flatMap(entry=>{assert(!entry.isSymbolicLink(),'symlink_rejected');const file=path.join(root,entry.name);return entry.isDirectory()?filesUnder(file):[file];});}
async function verify(directory){
  const root=path.resolve(directory);const manifest=readJson(path.join(root,'FILES.json'));
  assert(manifest.schemaVersion==='starward-handoff-files-v1','manifest_schema_invalid');
  assert(new Set(manifest.files.map(f=>f.path)).size===manifest.files.length,'duplicate_manifest_path');
  for(const record of manifest.files){const file=child(root,record.path);assert(statSync(file).isFile()&&statSync(file).size===record.bytes,'file_size_mismatch');assert(await hashFile(file)===record.sha256,'file_hash_mismatch');}
  assert(filesUnder(root).length===manifest.files.length+1,'unexpected_or_missing_files');
  return {files:manifest.files.length,totalBytes:manifest.files.reduce((sum,file)=>sum+file.bytes,0),fileIndexExcludedFromTotals:true};
}
if(command==='verify'){
  assert(option('--directory'),'directory_required');
  console.log(JSON.stringify({status:'ALL_FILES_VERIFIED',...await verify(option('--directory'))}));
}else if(command==='decrypt'){
  const repo=path.resolve(option('--repo')??'');const input=option('--input');const output=option('--output');const expected=option('--sha256');
  assert(input&&output&&option('--key-file')&&/^[a-f0-9]{64}$/u.test(expected??''),'decrypt_arguments_required');
  assert(!existsSync(output),'fresh_output_required');assert(statSync(input).size<=256*1024*1024,'private_envelope_size_exceeded');
  assert(await hashFile(input)===expected,'encrypted_package_hash_mismatch');
  const {decryptBackup,readBackupKeyFile}=await import(pathToFileURL(path.join(repo,'tools/deployment/verified-backup.mjs')));
  const key=await readBackupKeyFile(option('--key-file'));
  try {const plain=decryptBackup(readFileSync(input),key);assert(plain[0]===0x50&&plain[1]===0x4b,'handoff_plaintext_is_not_zip');writeFileSync(output,plain,{flag:'wx'});console.log(JSON.stringify({status:'PRIVATE_ZIP_AUTHENTICATED',bytes:plain.length,sha256:hash(plain)}));plain.fill(0);}finally{key.fill(0);}
}else if(command==='restore-db'){
  const repo=path.resolve(option('--repo')??'');const privateRoot=option('--private-root');const configPath=option('--infra-config');const target=option('--target');
  assert(privateRoot&&configPath&&/^starward_restore_[a-z0-9_]{1,40}$/u.test(target??''),'restore_arguments_required');
  await verify(privateRoot);
  const config=readJson(configPath);
  for(const name of ['MINIAPP_INFRA_MODE','MINIAPP_ADMIN_DATABASE_URL','MINIAPP_INFRA_REDIS_URL','MINIAPP_POSTGRES_BIN_DIR']){assert(typeof config[name]==='string','private_infra_configuration_missing');process.env[name]=config[name];}
  assert(config.MINIAPP_INFRA_MODE==='external','isolated_external_postgres_required');
  const runtimeModule=await import(pathToFileURL(path.join(repo,'tools/miniapp/infrastructure-runtime.mjs')));
  const runtime=runtimeModule.readInfrastructureRuntime();
  const {restoreBackup}=await import(pathToFileURL(path.join(repo,'tools/miniapp/backup-restore.mjs')));
  const result=await restoreBackup({inputPath:path.join(privateRoot,'database/working-r6.dump'),targetDatabase:target});
  const require=createRequire(path.join(repo,'package.json'));const {Client}=require('pg');const client=new Client({connectionString:runtimeModule.databaseUrlFor(runtime,target)});
  await client.connect();
  try{
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const expected=readJson(path.join(privateRoot,'database-state.json'));
    const tables=(await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r=>r.tablename);
    assert(JSON.stringify(tables)===JSON.stringify(expected.tables.map(r=>r.table)),'restored_table_set_differs');
    for(const item of expected.tables){const quoted='"'+item.table.replaceAll('"','""')+'"';const rows=(await client.query(`SELECT row_to_json(t)::text AS data FROM public.${quoted} AS t`)).rows.map(r=>r.data).sort();assert(rows.length===item.rows&&hash(JSON.stringify(rows))===item.sha256,'restored_table_content_differs');}
    const publication=(await client.query('SELECT state,payload FROM dark_sky_dataset_publications WHERE dataset_version=$1',['eog-vnl-v22-2025-gba-fixed-20261017-r6'])).rows;
    assert(publication.length===1&&publication[0].state==='PUBLISHED'&&JSON.stringify(publication[0].payload).includes('d91fd8f7fcdd68d63f9a219df11fdad13673fefa2e1a99e313a148e29676c5bd'),'restored_publication_not_bound');
    await client.query('COMMIT');
    console.log(JSON.stringify({status:result.status,allTableRowsAndHashesVerified:tables.length,publishedDataset:'eog-vnl-v22-2025-gba-fixed-20261017-r6',runtimeApplied:false,messagesSent:0}));
  }finally{await client.end();}
}else throw new Error('usage: verify|decrypt|restore-db; see RESTORE.txt');
