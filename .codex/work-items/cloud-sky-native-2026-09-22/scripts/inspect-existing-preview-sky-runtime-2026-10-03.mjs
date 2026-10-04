// Read-only existing staging connection/runtime. No secret refresh, workflow,
// deployment, check operation (which writes a receipt), or container mutation.
import {spawnSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {parseDeploymentConnection,connectionKeys} from '../../../../tools/deployment/deployment-connection.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const out=path.join(root,'output/sky-existing-runtime-observation-1003-r1');
await mkdir(out,{recursive:false});await writeFile(path.join(out,'executed-script.mjs'),await readFile(fileURLToPath(import.meta.url)),{flag:'wx'});
const env={...process.env};delete env.GH_REPO;delete env.GH_HOST;
const options={cwd:root,env,encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:256*1024};
let result;
try {
 const vars=spawnSync('gh',['api','repos/{owner}/{repo}/environments/staging/variables?per_page=100'],options);
 if(vars.error||vars.status!==0)throw Error('connection_read_unavailable');
 const value=JSON.parse(vars.stdout);if(!Array.isArray(value.variables)||value.total_count>100)throw Error('connection_read_invalid');
 const packet=Object.fromEntries(connectionKeys.map(k=>[k,value.variables.find(v=>v.name===`STARWARD_${k}`)?.value]));
 const c=parseDeploymentConnection(JSON.stringify(packet));
 const python=`import json,sys,pathlib,subprocess,re,hashlib
def envfile(p):
 d={}
 for line in pathlib.Path(p).read_text().splitlines():
  if '=' not in line or line.lstrip().startswith('#'):continue
  k,v=line.split('=',1);k=k.strip();v=v.strip()
  if v.startswith('"') and v.endswith('"'):v=json.loads(v)
  elif v.startswith("'") and v.endswith("'"):v=v[1:-1]
  if k in ('STARWARD_RECEIPT_DIRECTORY','STARWARD_SKY_STATIC_DIRECTORY','COMPOSE_PROJECT_NAME'):d[k]=v
 return d
base=envfile(sys.argv[1]);rd=pathlib.Path(base['STARWARD_RECEIPT_DIRECTORY']);pp=rd/'operator-preview-current.json'
raw=pp.read_bytes();pointer=json.loads(raw);e=envfile(pointer['deployEnvPath'])
receiptpath=pathlib.Path(pointer['receiptPath']);assert receiptpath.parent==rd
rr=receiptpath.read_bytes();receipt=json.loads(rr)
project=e['COMPOSE_PROJECT_NAME'];assert re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9_.-]*',project)
ids=subprocess.check_output(['docker','container','ls','--filter','label=com.docker.compose.project='+project,'--filter','label=com.docker.compose.service=caddy','--format','{{.ID}}'],timeout=15,text=True).split()
data={'scope':'Existing staging operator-preview only; not production or200DAU. Read-only current pointer/receipt/env and live Docker caddy only; not full receipt/rollback/backup reference inventory.',
 'pointerSha256':hashlib.sha256(raw).hexdigest(),'receiptSha256':hashlib.sha256(rr).hexdigest(),'receiptSchema':receipt.get('schemaVersion'),'receiptStatus':receipt.get('status'),
 'receiptOperation':receipt.get('operation'),'receiptRevision':receipt.get('revision'),'pointerRevision':pointer.get('revision'),'imageDigest':pointer.get('imageDigest'),
 'receiptIdentityMatchesPointer':receipt.get('revision')==pointer.get('revision') and receipt.get('imageDigest')==pointer.get('imageDigest'),
 'staticConfigured':bool(e.get('STARWARD_SKY_STATIC_DIRECTORY')),'pointerHasStaticDelivery':bool(pointer.get('skyStaticDelivery')),'receiptHasStaticDelivery':bool(receipt.get('skyStaticDelivery')),
 'runningCaddyContainers':len(ids),'referenceCompleteness':'UNVERIFIED','mutation':'NONE'}
if len(ids)==1:
 assert re.fullmatch(r'[a-f0-9]{12,64}',ids[0])
 fmt='{ "id":{{json .Id}},"running":{{json .State.Running}},"mounts":{{json .Mounts}} }'
 obj=json.loads(subprocess.check_output(['docker','container','inspect',ids[0],'--format',fmt],timeout=15,text=True))
 data['caddyRunning']=obj['running'];data['containerId']=obj['id']
 mounts=[m for m in obj['mounts'] if m['Destination'] in ('/srv/sky-public','/etc/caddy/sky-static-delivery.caddy')]
 data['skyMounts']=[{'destination':m['Destination'],'type':m['Type'],'readOnly':not m['RW'],'sourceSha256':hashlib.sha256(m['Source'].encode()).hexdigest()} for m in mounts]
print(json.dumps(data,separators=(',',':')))
`;
 // Metadata parser excludes shell metacharacters in the one private path.
 const command=`python3 - '${c.REMOTE_BASE_DEPLOY_ENV}' <<'STARWARD_READ_ONLY_PY'\n${python}\nSTARWARD_READ_ONLY_PY`;
 const ssh=spawnSync('ssh',['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=10','-p',c.SSH_PORT,`${c.SSH_USER}@${c.SSH_HOST}`,command],{...options,timeout:45000,maxBuffer:64*1024});
 if(ssh.error||ssh.status!==0)throw Error('existing_ssh_read_unavailable');
 const observed=JSON.parse(ssh.stdout);if(observed.mutation!=='NONE')throw Error('runtime_read_invalid');
 result={status:'observed',connectionMetadataRead:true,observation:observed};
}catch(error){result={status:'unavailable',category:['connection_read_unavailable','connection_read_invalid','existing_ssh_read_unavailable','runtime_read_invalid'].includes(error.message)?error.message:'read_boundary_unavailable',meaning:'No underlying stdout/stderr/metadata/private values persisted; unavailable is not empty/absent runtime.',mutation:'NONE'};}
await writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
