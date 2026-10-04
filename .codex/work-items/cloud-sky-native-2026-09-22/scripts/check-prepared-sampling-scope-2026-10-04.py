"""Fresh source/protected/publication/process scope; no product certificate."""
from pathlib import Path
from collections import Counter
import hashlib,json,re,subprocess,tomllib
ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
ARCHIVE=TASK/'tmp/prepared-sampling-before-2026-10-04'
def read(p):return json.loads(p.read_bytes())
def bind(p):
 b=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def same(row,p=None):
 actual=bind(p or ROOT/row['path']);assert actual['sha256']==row['sha256'],row['path']
 if 'bytes' in row:assert actual['bytes']==row['bytes'],row['path']
 return actual
def command(*a):return subprocess.run(a,cwd=ROOT,capture_output=True,text=True,check=True).stdout.strip()
def links(text):return Counter(re.findall(r'\[[^\]\n]+\]\(([^)\n]+)\)',text))
def main():
 before=read(ARCHIVE/'scope-before.json');sources=[same(r) for r in before['sources']];protected=[same(r) for r in before['protected']]
 assert [{'path':r['path'],'sha256':r['sha256']} for r in protected]==read(TASK/'tmp/resume-preserved-hashes-2026-10-01.json')
 original=read(TASK/'evidence/prepared-display-identity-scope-verification-2026-10-04.json')
 immutable={}
 for key in ['unchangedSeparateOfflineOwners','unchangedCachedPhotos','unchangedLargeTrialMaterials','unchangedOldPublications']:
  immutable[key]=[same(r) for r in original[key]]
 for key in ['largerSourceImage','unchangedRightsReceipt']:immutable[key]=same(original[key])
 published=[]
 for r in original['publishedOutputs']:
  manifest=same(r['manifest']);assert read(ROOT/manifest['path'])['publicationHash']==r['hash']
  published.append({'manifest':manifest,'hash':r['hash'],'binaryPins':[same(x) for x in r['binaryPins']]})
 documents=[];new_links=[]
 for row in before['documents']:
  saved=same(row,ARCHIVE/row['path']);p=ROOT/row['path'];after=bind(p);assert after!=row
  documents.append({'before':row,'archive':saved,'after':after})
  new_links += [(p,t) for t in (links(p.read_text(encoding='utf-8'))-links((ARCHIVE/row['path']).read_text(encoding='utf-8')))]
 human=TASK/'evidence/experience-prepared-sampling-applicability-2026-10-04.md'
 new_links += [(human,t) for t in links(human.read_text(encoding='utf-8'))]
 checked_links=[]
 for p,t in new_links:
  if '://' in t or t.startswith('#'):continue
  resolved=(p.parent/t.split('#',1)[0]).resolve();assert resolved.is_file(),(p,t)
  checked_links.append({'owner':p.relative_to(ROOT).as_posix(),'target':t,'exists':True})
 context=tomllib.loads((ROOT/'project_context/context.toml').read_text(encoding='utf-8'))
 declared=[r['path'] for r in context.get('context',[])]+[r['context'] for r in context.get('areas',[]) if r.get('context')]+context.get('default_files',[])
 assert len(declared)==47 and all((ROOT/p).is_file() for p in declared)
 assert (TASK/'PLAN.md').read_text(encoding='utf-8').count('**当前唯一下一依赖')==1
 assert len((TASK/'GOAL-CURRENT.md').read_text(encoding='utf-8'))<=4000
 names=['measure-prepared-sampling-applicability-2026-10-04.mts','trial-prepared-hubble-fine-sampling-2026-10-04.py',
  'generate-prepared-hubble-sampling-page-2026-10-04.py','build-prepared-hubble-sampling-page-2026-10-04.mts','experience-prepared-hubble-sampling-page-2026-10-04.mts',
  'generate-prepared-hubble-sampling-qualified-2026-10-04.py','experience-prepared-hubble-sampling-qualified-2026-10-04.mts',
  'readback-prepared-hubble-sampling-2026-10-04.py','readback-prepared-hubble-sampling-r2-2026-10-04.py',
  'update-prepared-sampling-docs-2026-10-04.py','check-prepared-sampling-scope-2026-10-04.py']
 scripts=[bind(TASK/'scripts'/name) for name in names]
 for row in scripts+[bind(human)]:
  assert all(line==line.rstrip(' \t') for line in (ROOT/row['path']).read_text(encoding='utf-8').splitlines()),row['path']
 assert not command('git','diff','--check','--',*[r['after']['path'] for r in documents],*[r['path'] for r in scripts],str(human.relative_to(ROOT)))
 assert command('git','branch','--show-current')=='codex/remote-main-20260908'
 assert command('git','rev-parse','HEAD')=='72e65cf309d700cb7d40c5b7afd53660fd39fa35'
 assert not command('git','diff','--cached','--name-only')
 processes=json.loads(command('pwsh','-NoProfile','-Command',"@(Get-Process -Id 24040,18132 | ForEach-Object { @{id=$_.Id;startUtc=$_.StartTime.ToUniversalTime().ToString('o')} }) | ConvertTo-Json -Compress"))
 wanted={24040:'2026-09-30T18:03:53.4146084Z',18132:'2026-09-30T18:18:41.4359228Z'}
 assert all(wanted.get(r['id'])==r['startUtc'] for r in processes) and len(processes)==2
 output_paths=['output/prepared-sampling-applicability-1004-r1','output/prepared-hubble-fine-sampling-1004-r1',
  'output/playwright/cloud-sky-prepared-hubble-sampling-1004-r1','output/playwright/cloud-sky-prepared-hubble-sampling-1004-r2',
  'output/prepared-hubble-sampling-readback-1004-r1','output/prepared-hubble-sampling-readback-1004-r2']
 outputs=[{'path':p,'files':len([f for f in (ROOT/p).rglob('*') if f.is_file()]),'logicalBytes':sum(f.stat().st_size for f in (ROOT/p).rglob('*') if f.is_file())} for p in output_paths]
 report={'status':'UNCHANGED_PRODUCTION_PROTECTED_PUBLISHED_AND_PROCESS_SCOPE','head':command('git','rev-parse','HEAD'),
  'branch':command('git','branch','--show-current'),'stagedFiles':0,'unchangedSources':sources,'protected':protected,
  'unchangedOriginalMaterial':immutable,'unchangedPublishedOutputs':published,'updatedDocuments':documents,'newTaskScripts':scripts,
  'newHumanEvidence':bind(human),'newLocalLinksChecked':checked_links,'declaredContextPathsChecked':len(declared),
  'processesUnchanged':processes,'currentOutputs':outputs,'currentOutputLogicalBytes':sum(r['logicalBytes'] for r in outputs),
  'noProductionChangesThisPhase':True,'ordinaryRegistryAdopted':False,'goalAcceptance':'UNVERIFIED_AND_ACTIVE',
  'limits':'Current bounded hash/owner checks and task-only changes. Not complete uncommitted-worktree inventory, physical capacity, independent review, native/runtime or final Goal acceptance.'}
 with (TASK/'evidence/prepared-sampling-scope-verification-2026-10-04.json').open('x',encoding='utf-8') as f:json.dump(report,f,ensure_ascii=False,indent=2);f.write('\n')
 print(json.dumps({'status':report['status'],'unchangedSourcePins':len(sources),'protected':len(protected),'updatedOwners':len(documents),'newTaskScripts':len(scripts),'contextPaths':len(declared),'outputLogicalBytes':report['currentOutputLogicalBytes']},ensure_ascii=False))
if __name__=='__main__':main()
