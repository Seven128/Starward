"""Saved signed samples, parent retention and fixed RGB derivation; no producer."""
from pathlib import Path
import hashlib,json,sys
ROOT=Path(__file__).resolve().parents[4];sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from PIL import Image,ImageDraw
from astropy.visualization import ManualInterval,LuptonAsinhStretch,make_lupton_rgb

O=ROOT/'output/shared-adaptive-flag-recovery-1003-r2';OUT=O/'readback';OUT.mkdir(exist_ok=False)
paths=[Path(__file__)]
def bind(p):
    data=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
def doc(p,pin=None):
    if pin:assert bind(p)['sha256']==pin
    paths.append(p);return json.loads(p.read_bytes())
def canonical(v):return json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode('utf-8')
run=doc(O/'result.json');r=doc(O/'candidate/candidate.json',run['candidate']['sha256'])
parent_dir=ROOT/Path(run['parentCandidate']['path']).parent;p=doc(parent_dir/'candidate.json',run['parentCandidate']['sha256'])
old_dir=ROOT/Path(run['savedSupplyCandidate']['path']).parent;s=doc(old_dir/'candidate.json',run['savedSupplyCandidate']['sha256'])
v=doc(ROOT/run['savedQualificationExecution']['path'],run['savedQualificationExecution']['sha256'])
cpath=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json'
c=doc(cpath,'73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52')
assert r['savedSupplyReportCanonicalSha256']==hashlib.sha256(canonical(s)).hexdigest()
assert r['savedExecutionCanonicalSha256']==hashlib.sha256(canonical(v)).hexdigest()
assert r['currentSourceInputs']['masterAndFieldsCanonicalSha256']==hashlib.sha256(canonical({k:v['currentInputSnapshot'][k] for k in ('master','fields')})).hexdigest()
before=doc(O/'inputs-before.json');assert before==doc(O/'inputs-after.json')
for record in before:assert bind(ROOT/record['path'])==record
def arr(meta,directory):
    q=directory/meta['file'];assert bind(q)['sha256']==meta['sha256'];paths.append(q)
    return np.load(q,mmap_mode='r',allow_pickle=False)
BANDS=('g','r','i')
a={b:arr(r['arrays'][b],O/'candidate') for b in BANDS}
pa={b:arr(p['arrays'][b],parent_dir) for b in BANDS}
sa={b:arr(s['arrays'][b],old_dir) for b in BANDS}
mask=arr(r['arrays']['alternative-supply'],O/'candidate');old_mask=arr(s['arrays']['alternative-supply'],old_dir)
qualified=arr(p['arrays']['qualified'],parent_dir);joint=arr(c['arrays']['joint-availability'],cpath.parent)
assert np.array_equal(mask,old_mask&~qualified) and int(mask.sum())==13323
trial_path=ROOT/'output/sdss-flag-alternative-1003-r2/alternative-supply.npy';paths.append(trial_path)
trial=np.load(trial_path,allow_pickle=False);rejected=trial&~old_mask;assert int(rejected.sum())==53
for b in BANDS:
    assert np.array_equal(a[b][mask],sa[b][mask])
    assert np.array_equal(a[b][~mask],pa[b][~mask],equal_nan=True)
    assert np.array_equal(a[b][rejected],pa[b][rejected])
    assert r['baselineEstimateCOrderSha256'][b]==p['displayEstimatesCOrderSha256'][b]
assert r['baselineDiagnosticCOrderSha256']==p['diagnosticCOrderSha256']
recipe=r['sourceResolvedRecipe'];assert recipe==p['sourceResolvedRecipe']==s['sourceResolvedRecipe']
def rgb(v):
    return make_lupton_rgb(v[2],v[1],v[0],interval=ManualInterval(vmin=0,vmax=None),
        stretch_object=LuptonAsinhStretch(stretch=recipe['stretch'],Q=recipe['Q']),output_dtype=np.uint8)
levels={};contact=Image.new('RGB',(1024,3*540),'#181818');draw=ImageDraw.Draw(contact)
for at,(level,m) in enumerate(r['levels'].items()):
    x0,y0,x1,y1=m['crop']['boundsXYExclusive'];region=(slice(y0,y1),slice(x0,x1));factor=m['crop']['boxFactor'];size=m['pixels']
    boxes=joint[region].reshape(size,factor,size,factor);counts=boxes.sum(axis=(1,3));means=[]
    for b in BANDS:
        values=np.where(joint[region],a[b][region],0).astype(np.float64).reshape(size,factor,size,factor).sum(axis=(1,3))
        mean=np.full(counts.shape,np.nan,dtype=np.float64);np.divide(values,counts,out=mean,where=counts>0);means.append(mean.astype(np.float32))
    alpha=np.rint(counts.astype(float)*255/(factor*factor)).astype(np.uint8)
    expected=np.dstack([rgb(np.stack(means)),alpha]);q=O/'candidate'/m['file'];paths.append(q)
    actual=np.asarray(Image.open(q));assert np.array_equal(actual,expected)
    pp=parent_dir/p['levels'][level]['file'];paths.append(pp);prior=np.asarray(Image.open(pp))
    assert np.array_equal(actual[:,:,3],prior[:,:,3])
    for column,(name,image) in enumerate((('adaptive real halo',prior),('saved alternatives applied',actual))):
        draw.text((column*512+4,at*540+4),level+' / '+name,fill='white');contact.paste(Image.fromarray(image).convert('RGB'),(column*512,at*540+24))
    levels[level]={'png':bind(q),'numericDerivationExact':True,'originalAlphaExact':True,
        'changedRgbFromParent':int(np.any(actual[:,:,:3]!=prior[:,:,:3],axis=2).sum())}
contact.save(OUT/'actual-full-lod-pairs.png')
# Actual supply-dense tile, fixed raster partition; no inferred halo/image fill.
n=mask.shape[0];tile=128;tiles=mask.reshape(n//tile,tile,n//tile,tile).sum(axis=(1,3))
iy,ix=np.unravel_index(int(tiles.argmax()),tiles.shape);y0,x0=iy*tile,ix*tile;reg=(slice(y0,y0+tile),slice(x0,x0+tile))
sheet=Image.new('RGB',(3*384,412),'#181818');d=ImageDraw.Draw(sheet)
source={b:arr(c['arrays'][b+'-science'],cpath.parent) for b in BANDS}
for column,(name,values) in enumerate((('source coadd',source),('adaptive real halo',pa),('qualified other scan',a))):
    image=rgb(np.stack([values[b][reg] for b in BANDS]));d.text((column*384+4,4),name,fill='white')
    sheet.paste(Image.fromarray(image).resize((384,384),Image.Resampling.NEAREST),(column*384,24))
sheet.save(OUT/'actual-supply-dense-pairs.png')
after=[bind(q) for q in paths];assert all(before_record==bind(ROOT/before_record['path']) for before_record in before)
result={'status':'PASSED_SAVED_REBASE_NUMERIC_LOD_READBACK','candidate':bind(O/'candidate/candidate.json'),
  'inputs':after,'alternativePixels':13323,'nativeRejectedStillParent':53,'admittedSavedValuesExact':True,
  'outsideAdmittedLatestParentExact':True,'baselineDiagnosticLineageExact':True,
  'oldQualificationCanonicalInputsExact':True,'levels':levels,'actualLevels':bind(OUT/'actual-full-lod-pairs.png'),
  'actualSupplyDensePatch':{'boundsXYExclusive':[int(x0),int(y0),int(x0+tile),int(y0+tile)],
    'admittedPixels':int(mask[reg].sum()),'image':bind(OUT/'actual-supply-dense-pairs.png')},
  'candidateLogicalBytes':sum(f.stat().st_size for f in (O/'candidate').iterdir() if f.is_file()),
  'filterRuns':0,'supplyProjectionRuns':0,'sourceRequests':0,'statisticalFitCalls':0,
  'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False,
  'meaning':'Saved values and frozen RGB readback only; actual alternative exposure/epoch/PSF differences do not certify complete weak structure/colour/background/registration.'}
with (OUT/'result.json').open('x',encoding='utf-8') as f:json.dump(result,f,indent=2);f.write('\n')
print(json.dumps({k:v for k,v in result.items() if k!='inputs'}))
