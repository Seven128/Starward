"""Independent dense H diag(V) H^T arithmetic on saved actual stencils.

Root arithmetic readback, not independent reviewer/qualified physical model.
"""
import hashlib
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[4]
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
SOURCE=ROOT/'output/sdss-aperture-noise-1003-r1'
OUT=SOURCE/'readback';OUT.mkdir()
def bind(path):
    b=path.read_bytes();return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
report=SOURCE/'result.json';assert bind(report)['sha256']=='6796b1bc1216d960f09d828c2cc4c79470daafd538d1a5f2c1239393e1a461a9'
data=json.loads(report.read_bytes());yy,xx=np.mgrid[-8:9,-8:9];rows=[]
pins=[bind(report),bind(Path(__file__))]
for patch in data['rows']:
    stencils=[]
    for row in patch['stencils']:
        path=ROOT/row['path'];assert bind(path)==row;pins.append(bind(path));stencils.append(dict(np.load(path,allow_pickle=False)))
    for aperture in patch['apertures']:
        if not aperture['allActualSourceSupportQualified']:continue
        selected=xx**2+yy**2<=aperture['radius']**2;count=int(selected.sum());variances=[];diagonals=[]
        for stencil in stencils:
            field=[];wrong=[]
            for band in range(3):
                ids=stencil['ids'][band][:,selected].T;weights=stencil['weights'][band][:,selected].T
                values=stencil['native_variance'][band][:,selected].T
                native={}
                for at in range(count):
                    for neighbour in range(4):
                        if weights[at,neighbour]==0:continue
                        identity=int(ids[at,neighbour]);variance=float(values[at,neighbour])
                        assert identity>=0 and np.isfinite(variance) and variance>=0
                        if identity in native:assert native[identity]==variance
                        native[identity]=variance
                columns={identity:index for index,identity in enumerate(native)}
                H=np.zeros((count,len(columns)))
                for at in range(count):
                    for neighbour in range(4):
                        if weights[at,neighbour]>0:H[at,columns[int(ids[at,neighbour])]]+=weights[at,neighbour]
                V=np.array(list(native.values()));covariance=(H*V[None])@H.T
                field.append(float(covariance.sum()/count**2));wrong.append(float(np.trace(covariance)/count**2))
            variances.append(field);diagonals.append(wrong)
        actual=np.square(np.sqrt(np.array(variances)).sum(axis=0))
        diagonal=np.square(np.sqrt(np.array(diagonals)).sum(axis=0))
        np.testing.assert_allclose(actual,aperture['conditionalVarianceUpperGRI'],rtol=2e-13,atol=0)
        np.testing.assert_allclose(diagonal,aperture['wrongIndependentTargetUpperGRI'],rtol=2e-13,atol=0)
        rows.append({'patch':patch['name'],'radius':aperture['radius'],'count':count,'denseCovarianceUpperGRI':actual.tolist(),
          'wrongDiagonalOnlyUpperGRI':diagonal.tolist(),'offDiagonalMatters':bool((actual>diagonal*(1+1e-10)).any())})
assert len(rows)==15 and all(r['offDiagonalMatters'] for r in rows if r['radius']>0)
result={'status':'PASSED_SAVED_ACTUAL_DENSE_COVARIANCE_READBACK','inputs':pins,'rows':rows,
 'scope':__doc__,'productionHelperImports':0,'sourceReads':0,'sourceRequests':0,'filterRuns':0,'independentReview':'MISSING'}
(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
with (OUT/'result.json').open('x',encoding='utf-8') as stream:json.dump(result,stream,indent=2);stream.write('\n')
print(json.dumps({'receipt':bind(OUT/'result.json'),'apertures':len(rows)}))
