"""Qualify two new guards against the actual prior execution, no full rerun."""
import copy,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from image_quality import digest,write_report
from sdss_display_recovery import OtherScanDisplay,recovery_products
from sdss_gri_tan import BANDS,GriMaster,ProjectedBand,target_tan

def bind(p):
    raw=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':digest(raw)}
o=ROOT/'output/shared-flag-display-recovery-1003-r2';out=o/'guard-closeout';out.mkdir(exist_ok=False)
old_owner=o/'sdss_display_recovery.py';current=ROOT/'data-pipelines/deep-sky/sdss_display_recovery.py'
old=old_owner.read_text();expected=old.replace("if source.flags is not None and source.frame.header.get('PS_ID') is not None:","if (source.flags is not None and source.frame.header.get('PS_ID') is not None and\n                        source.flags.receipt['actualPrimaryIdentity'].get('PS_ID') is not None):")
expected=expected.replace("def recovery_products(master,candidate,entry,*,output_pixels=512):\n","def recovery_products(master,candidate,entry,*,output_pixels=512):\n    if candidate.report.get('sourceResolvedRecipe')!=master.report.get('display',{}).get('transfer'):\n        raise RuntimeError('sdss_display_recovery_recipe_changed')\n")
assert current.read_text()==expected
before=json.loads((o/'inputs-after.json').read_bytes());owner_path=current.relative_to(ROOT).as_posix()
for record in before:
    if record['path']==owner_path:assert bind(old_owner)['sha256']==record['sha256']
    else:assert bind(ROOT/record['path'])==record
packet=json.loads((o/'processing-inputs.json').read_bytes());ids=[]
for f in packet['currentInputSnapshot']['fields']:
    for b,v in f['bands'].items():
        frame_id=v['primaryHeaderProcessingId'];mask_id=v['flags']['admissionReceipt']['actualPrimaryIdentity']['PS_ID']
        assert frame_id is not None and frame_id==mask_id
        ids.append({'fieldKey':f['fieldKey'],'band':b,'primaryProcessingId':frame_id,'maskProcessingId':mask_id})
base=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2';c=json.loads((base/'candidate.json').read_bytes());p=json.loads((ROOT/'output/frozen-zscale-publication-1003-r1/manifest.json').read_bytes())
r=json.loads((o/'candidate/candidate.json').read_bytes())
def arr(m,folder):
    path=folder/m['file'];assert bind(path)['sha256']==m['sha256'];return np.load(path,allow_pickle=False)
joint=arr(c['arrays']['joint-availability'],base)
bands={b:ProjectedBand(arr(c['arrays'][b+'-science'],base),arr(c['arrays'][b+'-footprint'],base),arr(c['arrays'][b+'-finite-neighbors'],base),c['science']['perBand'][b]) for b in BANDS}
report=copy.deepcopy(c);report['display']['transfer']=copy.deepcopy(p['master']['transfer']['recipe'])
master=GriMaster(target_tan(c['center'],c['pixels'],c['fieldDegrees']),bands,joint,np.empty((0,0,3),dtype=np.uint8),report)
candidate=OtherScanDisplay({b:arr(r['arrays'][b],o/'candidate') for b in BANDS},arr(r['arrays']['alternative-supply'],o/'candidate'),r)
assert r['sourceResolvedRecipe']==report['display']['transfer']
levels={}
for level,(raw,meta) in recovery_products(master,candidate,c,output_pixels=512).items():
    path=o/'candidate'/r['levels'][level]['file'];assert path.read_bytes()==raw;assert meta=={k:v for k,v in r['levels'][level].items() if k!='file'}
    levels[level]={'original':bind(path),'currentGuardedProductsExact':True}
for record in before:
    if record['path']!=owner_path:assert bind(ROOT/record['path'])==record
result={'scope':'Explicit two-guard code delta and current actual saved-product consumption, not a full recovery/filter rerun or retroactive execution.',
 'originalExecution':bind(o/'result.json'),'executedRecoveryOwner':bind(old_owner),'currentRecoveryOwner':bind(current),
 'onlyDeclaredTwoGuardChanges':True,'actual18ProcessingIdentitiesKnownAndExact':ids,'actualFrozenRecipeExact':True,'levels':levels,
 'otherOriginalInputsStillExact':True,'filterRuns':0,'recoveryRuns':0,'fitRuns':0,'sourceRequests':0,
 'tests':{'command':'python -B -m unittest test_sdss_display_recovery test_sdss_noise_display test_sdss_noise_display_provenance test_sdss_science_pyramid test_publish_sdss_science','actualPassed':45,'meaning':'Affected development checks, not full quality or independent review.'},
 'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
write_report(out/'result.json',result);(out/'executed-script.py').write_bytes(Path(__file__).read_bytes());(out/'sdss_display_recovery.py').write_bytes(current.read_bytes())
print(json.dumps({'result':bind(out/'result.json'),'processingIdentities':len(ids),'levels':levels,'declaredGuardDelta':True}))
