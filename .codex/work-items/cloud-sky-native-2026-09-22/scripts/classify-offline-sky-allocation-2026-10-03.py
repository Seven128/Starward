"""Classify the saved actual allocation; no second filesystem scan."""
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
OUT=ROOT/'output/offline-sky-chain-allocation-1003-r1'
def bind(path):
    b=path.read_bytes();return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
base=OUT/'result.json';assert bind(base)['sha256']=='f5ea5dcced23ccafb7e0274e1b9f4edb714d488a11f5a157ff164a608ab3c1c2'
rows_path=OUT/'file-readback.json';rows=json.loads(rows_path.read_bytes())
moon_prefix='output/moon-source-cache/'
parts={'moon-raster':[],'moon-range-probes':[],'moon-local-processing-environment':[],'moon-other-workspace-files':[]}
others=[]
for row in rows:
    if row['group']!='raw-moon-cache':others.append(row);continue
    relative=row['path'].removeprefix(moon_prefix);assert relative!=row['path']
    if relative=='clementine-v21.tif':name='moon-raster'
    elif relative in ('clementine-v21-range-probe.bin','clementine-v21-range16.bin'):name='moon-range-probes'
    elif relative.startswith('venv/'):name='moon-local-processing-environment'
    else:name='moon-other-workspace-files'
    parts[name].append(row)
assert len(parts['moon-raster'])==1 and len(parts['moon-range-probes'])==2
assert parts['moon-local-processing-environment']
def summary(values):
    ids={row['identity']:row for row in values}
    return {'paths':len(values),'logicalBytes':sum(v['bytes'] for v in values),
      'allocationBytesByPath':sum(v['reportedAllocationBytes'] for v in values),
      'distinctFileIdentities':len(ids),'allocationBytesByUniqueIdentity':sum(v['reportedAllocationBytes'] for v in ids.values())}
assert sum(summary(v)['paths'] for v in parts.values())+len(others)==len(rows)
totals=summary(rows);raw=summary(parts['moon-raster']+parts['moon-range-probes']+[r for r in others if r['role']=='retained-offline-input'])
tooling=summary(parts['moon-local-processing-environment']);other=summary(parts['moon-other-workspace-files']+others)
result={'status':'SAVED_FILE_ROLE_REFINEMENT_NOT_RESCAN_OR_CAPACITY',
 'base':bind(base),'fileReadback':bind(rows_path),
 'corrects':'Original raw-moon-cache group is a cache workspace, not exclusively raw input: it also contains a local venv. Original allocation/file identity measurements remain unchanged; original group role is not used as a raw-only cost.',
 'moonPartition':[{'role':name,**summary(values)} for name,values in parts.items()],
 'qualifiedPathRoleTotals':{'rawInputsAndCameraMetadata':raw,'localMoonProcessingEnvironment':tooling,
  'otherWorkspacesAndServiceSourceAssets':summary(parts['moon-other-workspace-files']+[r for r in others if r['role']!='retained-offline-input'])},
 'totalSelectedPaths':totals,'sumsExact':True,
 'scope':'Current saved file identities and AllocationSize only, no new content/attribute read or new source admission. Workspaces include arrays, reports and code snapshots. Local venv is offline tooling, not deployed worker/client memory or added production dependency. These files are not one publication or one client download. No deletion, global cleanup or production headroom conclusion.',
 'fileAttributeScans':0,'sourceContentRehash':False,'independentReview':'MISSING'}
assert sum(v['allocationBytesByUniqueIdentity'] for v in result['qualifiedPathRoleTotals'].values())==totals['allocationBytesByUniqueIdentity']
with (OUT/'role-refinement.json').open('x',encoding='utf-8') as stream:json.dump(result,stream,ensure_ascii=False,indent=2);stream.write('\n')
(OUT/'role-refinement-executed.py').write_bytes(Path(__file__).read_bytes())
print(json.dumps({'receipt':bind(OUT/'role-refinement.json'),'roles':result['qualifiedPathRoleTotals'],'moon':result['moonPartition']}))
