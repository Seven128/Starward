"""Read-only allocation of current retained offline inputs and work products.

No release/export/HTTP, source download, processing, deletion or reclaim claim.
This extends the single-export measurement to different offline source paths.
"""
import ast
import ctypes
from ctypes import wintypes
import hashlib
import json
import os
from pathlib import Path
import time

ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
OUT=ROOT/'output/offline-sky-chain-allocation-1003-r1'
assert os.name=='nt'
owner=TASK/'scripts/inspect-static-file-allocation-2026-10-03.py'
# Reuse the already exercised Windows file-attribute/identity implementation,
# without executing its historical fixed-export scan or hashing payloads again.
tree=ast.parse(owner.read_text(encoding='utf-8'))
selected=[]
for node in tree.body:
    if isinstance(node,(ast.ClassDef,ast.FunctionDef)) and node.name in ('StandardInfo','FileIdInfo','info'):
        selected.append(node)
    elif isinstance(node,ast.Assign):
        target=node.targets[0]
        if (isinstance(target,ast.Name) and target.id=='kernel') or (
            isinstance(target,ast.Attribute) and ast.unparse(target).startswith('kernel.')):
            selected.append(node)
namespace={'ctypes':ctypes,'wintypes':wintypes}
exec(compile(ast.Module(body=selected,type_ignores=[]),str(owner),'exec'),namespace)
info=namespace['info']

def bind(p):
    data=p.read_bytes()
    return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}

cp=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json'
qp=ROOT/'output/sdss-m51-mosaic-quality-diagnosis-1002-r3/result.json'
assert bind(cp)['sha256']=='73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52'
assert bind(qp)['sha256']=='9322203537531e0cba3fbf9addcd3ea6e19fd75fdfeb2dc57637bd2d42bee4d0'
c=json.loads(cp.read_bytes());q=json.loads(qp.read_bytes())
assert q['candidate']['sha256']==bind(cp)['sha256']
coverage=ROOT/'workers/miniapp-api/assets/moon/coverage-manifest.json'
moon=json.loads(coverage.read_bytes())
raw_moon=ROOT/'output/moon-source-cache/clementine-v21.tif'
assert raw_moon.stat().st_size==moon['source']['bytes']==4247470871
frames=[]
for field in c['mosaic']['fields']:
    for band in ('g','r','i'):
        source=field['perBand'][band]['sourceReceipt']['source']
        path=Path(source['path']).resolve()
        assert path.is_relative_to(ROOT.resolve()) and path.stat().st_size==source['bytes']
        frames.append(path)
assert len(set(frames))==18
masks=[(ROOT/field['bands'][band]['maskSource']['path']).resolve() for field in q['fields'] for band in ('g','r','i')]
assert len(set(masks))==18
camera=ROOT/'output/sdss-m51-field-quality-1002-r3'
groups=[
 ('raw-moon-cache','retained-offline-input',[ROOT/'output/moon-source-cache']),
 ('current-sdss-frames','retained-offline-input',frames),
 ('current-sdss-fpm','retained-offline-input',masks),
 ('current-sdss-camera','retained-offline-input',[camera/'response.csv',camera/'receipt.json']),
 ('sdss-science-master-workspace','offline-science-and-diagnostics',[cp.parent]),
 ('common-display-candidate','unadopted-offline-display',[ROOT/'output/shared-noise-display-1003-r1/candidate']),
 ('cross-run-display-candidate','unadopted-offline-display',[ROOT/'output/shared-flag-display-recovery-1003-r2/candidate']),
 ('bright-sat-trial-workspace','unadopted-task-workspace',[ROOT/'output/sdss-bright-sat-colour-trial-1003-r1']),
 ('frozen-science-publication-workspace','explicit-offline-publication-not-default',[ROOT/'output/frozen-zscale-publication-1003-r1']),
 ('partial-science-publication-workspace','explicit-offline-publication-not-default',[ROOT/'output/partial-science-publication-1003-r1']),
 ('prepared-master-workspace','unadopted-offline-display',[ROOT/'output/prepared-rgb-tan-generation-1003-r1']),
 ('prepared-sealed-publication','explicit-offline-publication-not-default',[ROOT/'output/prepared-optical-publication-1003-r4/publication']),
 ('moon-service-source-assets','service-source-files-not-route-admission',[ROOT/'workers/miniapp-api/assets/moon']),
]
protected=json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
pins=[Path(__file__),owner,cp,qp,coverage,TASK/'PLAN.md',*(ROOT/p['path'] for p in protected)]
before_pins=[bind(p) for p in pins]
for p in protected:assert bind(ROOT/p['path'])['sha256']==p['sha256']

def safe(p):
    assert p.is_absolute() and p.resolve().is_relative_to(ROOT.resolve()),'outside_workspace'
    for part in [p,*p.parents]:
        assert not part.lstat().st_file_attributes & 0x400,'reparse_path_not_admitted'
        if part==ROOT:break
    return p

def scan():
    rows=[];directories={}
    for name,kind,roots in groups:
        files=[]
        for path in roots:
            safe(path)
            if path.is_file():files.append(path)
            else:
                assert path.is_dir()
                for parent,dirs,names in os.walk(path,followlinks=False):
                    directory=safe(Path(parent));st=directory.stat()
                    directories[directory.relative_to(ROOT).as_posix()]={'mtimeNs':st.st_mtime_ns,'inode':st.st_ino}
                    for child in dirs:safe(directory/child)
                    files.extend(directory/child for child in names)
        assert len(set(files))==len(files)
        for path in sorted(files):
            safe(path)
            rows.append({'group':name,'role':kind,'path':path.relative_to(ROOT).as_posix(),**info(path)})
    assert len({r['path'] for r in rows})==len(rows),'groups_overlap_same_path'
    return rows,directories

started=time.perf_counter();rows,dirs=scan();after,after_dirs=scan()
assert after==rows and after_dirs==dirs,'retained_paths_changed_during_observation'
assert [bind(p) for p in pins]==before_pins
identities={}
for row in rows:
    identity=row['identity']
    if identity in identities:
        assert row['bytes']==identities[identity]['bytes'] and row['reportedAllocationBytes']==identities[identity]['reportedAllocationBytes']
    identities.setdefault(identity,row)
def summary(values):
    unique={v['identity']:v for v in values}
    return {'paths':len(values),'logicalBytesByPath':sum(v['bytes'] for v in values),
      'reportedAllocationBytesByPath':sum(v['reportedAllocationBytes'] for v in values),
      'distinctFileIdentities':len(unique),
      'reportedAllocationBytesByUniqueIdentity':sum(v['reportedAllocationBytes'] for v in unique.values())}
result={'status':'MEASURED_SELECTED_RETAINED_OFFLINE_CHAIN_NOT_HOST_CAPACITY',
 'methodOwner':bind(owner),'inputsExact':True,'scanStableBeforeAfter':True,'directoryIdentitiesAndMtimeStable':True,
 'groups':[{'group':name,'role':role,**summary([r for r in rows if r['group']==name])} for name,role,_ in groups],
 'totalSelectedPaths':summary(rows),'maximumLinkCount':max(r['links'] for r in rows),
 'measurementSeconds':time.perf_counter()-started,
 'rawContentRehashPerformed':False,'sourceSizeQualificationOnly':True,'processingRuns':0,'sourceRequests':0,
 'sourceIdentityMeaning':'Current raw file length/allocation/FileId/mtime observation with existing manifest byte expectations. No new full-source SHA reread, no scientific/rights admission or historical source-pin refresh claim.',
 'scope':'Selected current moon and M51 offline chain only; task workspace files counted separately by role. FileStandardInfo AllocationSize is not exclusive physical media/FS metadata/streams/snapshot usage. No export/store scan repeated. Excludes other historical candidates, complete other-family raw sources, OCI layers, DB/logs/backups, actual mount/release/rollback refs and production Linux disk. Cannot infer 180GB headroom, reclaimable bytes, per-DAU traffic, phone/cache/GPU cost or 200DAU mixed capacity. No deletion/TTL/retention change, new publication/adoption or deployment.',
 'independentReview':'MISSING'}
OUT.mkdir()
(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
(OUT/'reused-file-attribute-owner.py').write_bytes(owner.read_bytes())
for name,value in [('file-readback.json',rows),('directory-readback.json',dirs),('input-pins.json',before_pins),('result.json',result)]:
    with (OUT/name).open('x',encoding='utf-8') as stream:json.dump(value,stream,ensure_ascii=False,indent=2);stream.write('\n')
print(json.dumps({'result':bind(OUT/'result.json'),'total':result['totalSelectedPaths'],'seconds':result['measurementSeconds']}))
