"""Real parse-read race before/after and bounded malicious NPY header controls."""
from pathlib import Path
import hashlib, importlib.util, io, json, sys
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[4]
sys.path[:0]=[str(ROOT/'data-pipelines/deep-sky'),str(ROOT/'output/pyavm-metadata-trial-1002-r1/lib'),str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
import publish_prepared_optical as current
OUT=ROOT/'output/prepared-optical-independent-1003-r1'
oldpath=OUT/'pin-race-before-owner.py.txt'
spec=importlib.util.spec_from_file_location('independent_frozen_prepared_writer',oldpath,loader=__import__('importlib.machinery',fromlist=['SourceFileLoader']).SourceFileLoader('independent_frozen_prepared_writer',str(oldpath)))
old=importlib.util.module_from_spec(spec);sys.modules[spec.name]=old;spec.loader.exec_module(old)
def identity(p):
    raw=Path(p).read_bytes();return {'path':Path(p).relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
target=OUT/'pin-race-equal-size-fixture.json'
original=b'{"credit":"original reviewed credit"}\n'
replacement=b'{"credit":"unreviewed forged credit"}\n'
assert len(original)==len(replacement)
pin=hashlib.sha256(original).hexdigest();realopen=Path.open
def write_original(raw):
    with realopen(target,'wb') as f:f.write(raw)
def run(mod):
    write_original(original);events=[];reads=0
    class Restore:
        def __init__(self,f):self.f=f
        def __enter__(self):return self.f
        def __exit__(self,*args):self.f.close();write_original(original)
    def controlled_open(p,mode='r',*args,**kwargs):
        nonlocal reads
        if p.resolve()==target.resolve() and mode=='rb':
            reads+=1
            if reads==2:
                write_original(replacement);events.append({'actualReadNumber':reads,'actualFileSha256':hashlib.sha256(replacement).hexdigest(),'bytes':len(replacement)})
                return Restore(realopen(p,mode,*args,**kwargs))
        return realopen(p,mode,*args,**kwargs)
    returned=None;error=None
    with patch.object(Path,'open',controlled_open):
        try: returned,iden=mod.pinned_json(target,pin,root=ROOT)
        except RuntimeError as e:error=str(e)
    return {'ownerSha256':identity(Path(mod.__file__))['sha256'],'events':events,'actualReads':reads,'returned':returned,'error':error,'diskRestored':target.read_bytes()==original}
before=run(old);after=run(current)
assert before['events'] and after['events'] and before['diskRestored'] and after['diskRestored']
assert before['returned']=={'credit':'unreviewed forged credit'} and before['error'] is None
assert after['returned'] is None and after['error']=='prepared_optical_input_changed'
# Whole verify_cached API with tiny task-owned receipt/header and real unchanged
# admission facts. Only the array header is deliberately malformed; no trust or
# quality assertion is attached to this synthetic generation inventory.
cached=ROOT/'output/prepared-rgb-tan-cached-validation-1003-r1'
template=json.loads((cached/'result.json').read_bytes());inventory=json.loads((cached/'inputs-before.json').read_bytes())
sourceids=template['source']['jpeg'],template['source']['xmp']
source=[r for r in inventory['source'] if any(all(r[k]==s[k] for k in ('bytes','sha256')) for s in sourceids)]
assert len(source)==2
controls=[]
for name,shape,dtype,order in [('huge-shape',(1000000,1000000,4),'|u1',False),('wrong-dtype',(2048,2048,4),'<f8',False),('fortran',(2048,2048,4),'|u1',True),('missing-payload',(2048,2048,4),'|u1',False)]:
    directory=OUT/name;directory.mkdir()
    stream=io.BytesIO();np.lib.format.write_array_header_1_0(stream,{'descr':dtype,'fortran_order':order,'shape':shape})
    p=directory/'malformed.npy';p.write_bytes(stream.getvalue())
    receipt=json.loads(json.dumps(template));receipt.pop('cachedGeneration',None);receipt['master']=identity(p)
    tiny={'files':[identity(p)],'source':source,'historicalNominal':[],'allPublishedAssets':[]}
    for n,v in [('result.json',receipt),('inputs-before.json',tiny),('inputs-after.json',tiny)]:
        (directory/n).write_text(json.dumps(v)+'\n',encoding='utf8')
    kwargs={'root':ROOT,'result_sha256':identity(directory/'result.json')['sha256'],'before_sha256':identity(directory/'inputs-before.json')['sha256'],'after_sha256':identity(directory/'inputs-after.json')['sha256']}
    rows=[]
    for mod in (old,current):
        called=[]
        def prohibited_load(*a,**k):called.append(True);raise RuntimeError('independent_np_load_reached')
        with patch.object(np,'load',prohibited_load):
            try:mod.verify_cached_prepared_generation(directory,**kwargs)
            except RuntimeError as e:error=str(e)
            else:raise AssertionError('malformed header accepted')
        rows.append({'ownerSha256':identity(Path(mod.__file__))['sha256'],'npLoadCalls':len(called),'error':error})
    assert rows[0]['npLoadCalls']==1 and rows[1]['npLoadCalls']==0
    assert rows[1]['error'] in ('prepared_optical_master_shape_invalid','prepared_optical_master_trailing_or_missing_bytes')
    controls.append({'case':name,'headerBytes':len(stream.getvalue()),'shape':shape,'dtype':dtype,'fortran':order,'before':rows[0],'after':rows[1]})
record={'status':'PASS_BOUNDED_SAME_BUFFER_PIN_FENCE_AND_PRELOAD_HEADER_GUARDS','pin':pin,'equalSizeJsonBefore':before,'equalSizeJsonAfter':after,'npyHeaderControls':controls,'currentOwner':identity(Path(current.__file__)),'scope':'Real second rb-open boundary physically replaces only task JSON, restored on close. Same-size replacement accepted by frozen old owner but rejected by current byte-buffer digest. Tiny task-owned malformed NPY headers pass actual receipt/admission linkage then current rejects before np.load; old reaches trapped np.load without actual big allocation. Original source/cache files unchanged; no source JPEG decode/master/LOD/GPU.'}
(OUT/'buffer-after.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf8')
(OUT/'buffer-after-owner.py.txt').write_bytes(Path(current.__file__).read_bytes())
(OUT/'executed-buffer-after-script.py').write_bytes(Path(__file__).read_bytes())
print(json.dumps({'result':identity(OUT/'buffer-after.json'),'jsonAfter':after['error'],'npyControls':len(controls),'currentOwner':record['currentOwner']}))
