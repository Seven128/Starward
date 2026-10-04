"""Saved actual common-support means and frozen RGB, no filter/source reread."""
import hashlib
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[4]
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from PIL import Image
from astropy.visualization import ManualInterval,LuptonAsinhStretch,make_lupton_rgb
SOURCE=ROOT/'output/sdss-adaptive-local-1003-r1';OUT=SOURCE/'readback';OUT.mkdir()
def bind(p):
    b=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
report=SOURCE/'result.json';assert bind(report)['sha256']=='ce7a657ba55984d2ea24d934af146d00bda74422feb5e009f180fed43534b900'
data=json.loads(report.read_bytes());recipe=data['recipe'];rows=[];pins=[bind(report),bind(Path(__file__))]
def rgb(v):return make_lupton_rgb(v[2],v[1],v[0],interval=ManualInterval(vmin=0,vmax=None),stretch_object=LuptonAsinhStretch(stretch=recipe['stretch'],Q=recipe['Q']),output_dtype=np.uint8)
for row in data['rows']:
    files={}
    for f in row['outputs']:
        p=ROOT/f['path'];assert bind(p)==f;pins.append(bind(p));files[p.name]=p
    name=row['name']
    load=lambda suffix:np.load(files[f'{name}-{suffix}.npy'],allow_pickle=False)
    original=load('original-measurements');saved=load('display-estimates');valid=load('eligible');protected=load('protected');radius=load('radius')
    expected=original.copy();changed=0
    for y in range(8,41):
        for x in range(8,41):
            r=int(radius[y,x])
            if r<=0:continue
            dy,dx=np.mgrid[-r:r+1,-r:r+1];circle=dx*dx+dy*dy<=r*r
            assert valid[y-r:y+r+1,x-r:x+r+1][circle].all()
            selected=circle&~protected[y-r:y+r+1,x-r:x+r+1]
            assert selected[r,r]
            coordinates=np.argwhere(selected)
            # Explicit sum of each actual chosen coordinate; no adaptive or
            # aperture helper import and no threshold/kernel re-execution.
            value=np.zeros(3)
            for sy,sx in coordinates:value+=original[:,y-r+sy,x-r+sx].astype(float)
            expected[:,y,x]=value/len(coordinates);changed+=1
    np.testing.assert_array_equal(expected,saved)
    np.testing.assert_array_equal(saved[:,protected],original[:,protected])
    np.testing.assert_array_equal(saved[:,~valid],original[:,~valid])
    np.testing.assert_array_equal(rgb(saved),np.array(Image.open(files[f'{name}-adaptive.png'])))
    np.testing.assert_array_equal(rgb(original),np.array(Image.open(files[f'{name}-original.png'])))
    rows.append({'name':name,'savedCommonSupportMeansExact':True,'assignedApertures':changed,
      'protectedAndUnknownExact':True,'frozenLibraryRgbExact':True})
assert sum(row['assignedApertures'] for row in rows)==1077
result={'status':'PASSED_SAVED_ADAPTIVE_MEANS_AND_RGB','inputs':pins,'rows':rows,'scope':__doc__,
 'limitations':'Reconstructs recorded support and means, not ratio/variance qualification or independent review. Source-noise and adaptive selection remain established only by their original actual execution and bounded tests. No full quality or source scientific validity claim.',
 'filterRuns':0,'sourceRequests':0,'independentReview':'MISSING'}
(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
with (OUT/'result.json').open('x',encoding='utf-8') as stream:json.dump(result,stream,indent=2);stream.write('\n')
print(json.dumps({'receipt':bind(OUT/'result.json'),'assignedApertures':1077}))
