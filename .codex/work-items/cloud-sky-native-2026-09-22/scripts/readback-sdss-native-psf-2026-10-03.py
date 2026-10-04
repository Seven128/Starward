"""Saved PSF diagnostics readback using row-first spline and normal equations."""
from pathlib import Path
import hashlib,json,sys
ROOT=Path(__file__).resolve().parents[4];sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/sdss-psf-tools-1003-r1/python-deps'),str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from scipy.interpolate import RectBivariateSpline
def bind(p):
    d=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(d),'sha256':hashlib.sha256(d).hexdigest()}
def save(p,v):
    with p.open('x',encoding='utf-8') as f:json.dump(v,f,indent=2,allow_nan=False);f.write('\n')
O=ROOT/'output/sdss-imagepsf-centering-1003-r1';OUT=O/'readback';OUT.mkdir(exist_ok=False)
paths=[Path(__file__)]
def doc(path,pin):
    assert bind(path)['sha256']==pin;paths.append(path);return json.loads(path.read_bytes())
native=doc(ROOT/'output/sdss-measured-native-psf-1003-r2/result.json','d1e4d98f6c2c02ba34fc34bc84c2f4b4ebe858c3a38d32f0634e88442b09a804')
cubic=doc(ROOT/'output/sdss-imagepsf-interpolation-1003-r1/result.json','9a0477e9b21ea9dfc918b2ee82381a7ce271af0c6cb14aca64aa4c29f25b6ad2')
center=doc(O/'result.json','fc4eafae57fb2993c1339135c974d0923328689d8244877341110fa8932952b7')
for folder in ('sdss-measured-native-psf-1003-r2','sdss-imagepsf-interpolation-1003-r1','sdss-imagepsf-centering-1003-r1'):
    base=ROOT/'output'/folder;first=json.loads((base/'inputs-before.json').read_bytes());assert first==json.loads((base/'inputs-after.json').read_bytes())
    for record in first:assert bind(ROOT/record['path'])==record
def arrays(binding):
    p=ROOT/binding['path'];assert bind(p)==binding;paths.append(p)
    with np.load(p,allow_pickle=False) as z:return {k:z[k] for k in z.files}
rows=[];worst_wrong_axis=0.
for a,b,c in zip(native['records'],cubic['records'],center['records']):
    assert a['objID']==b['objID']==c['objID']
    for band in ('g','r','i'):
        original=arrays(a['bands'][band]['saved']);saved_cubic=arrays(b['bands'][band]['output']);saved_center=arrays(c['bands'][band]['saved'])
        k=original['kernel']/original['kernel'].sum();dx,dy=original['dx'],original['dy'];v=original['variance'];mask=original['fit_mask']
        # Row-first independent API orientation; producer ImagePSF uses x/y
        # and transposed kernel. Do not import ImagePSF or the fit helper.
        spline=RectBivariateSpline(np.arange(51),np.arange(51),k,kx=3,ky=3,s=0)
        template=spline.ev(dy+25,dx+25);np.testing.assert_allclose(template,saved_cubic['template'],rtol=0,atol=5e-17)
        design=np.stack((template,np.ones(template.shape),dx,dy),axis=-1)[mask];weights=1/v[mask]
        normal=design.T@(design*weights[:,None]);rhs=design.T@(original['data'][mask]*weights)
        coefficients=np.linalg.solve(normal,rhs);np.testing.assert_allclose(coefficients,b['bands'][band]['coefficients'],rtol=1e-10,atol=1e-10)
        data=original['data'];p=np.array(c['bands'][band]['parameters']);assert c['bands'][band]['parameterNames']==['flux_0','x_0_0','y_0_0','slope_x_1','slope_y_1','intercept_1']
        shifted=spline.ev(dy-p[2]+25,dx-p[1]+25)
        model=p[0]*shifted+p[3]*dx+p[4]*dy+p[5];residual=data-model
        np.testing.assert_allclose(model,saved_center['model'],rtol=0,atol=1e-12)
        np.testing.assert_allclose(residual,saved_center['residual'],rtol=0,atol=1e-12)
        chi=float((np.square(residual[mask])/v[mask]).sum()/(int(mask.sum())-6))
        np.testing.assert_allclose(chi,c['bands'][band]['localCenterChiSquarePerDof'],rtol=1e-11,atol=1e-11)
        wrong=RectBivariateSpline(np.arange(51),np.arange(51),k.T,kx=3,ky=3,s=0).ev(dy-p[2]+25,dx-p[1]+25)
        error=float(np.max(np.abs(p[0]*wrong-p[0]*shifted)));worst_wrong_axis=max(worst_wrong_axis,error)
        rows.append({'objID':a['objID'],'band':band,'sourceField':f'301/{a["run"]}/6/{a["field"]}',
          'conditionalChiSquarePerDof':chi,'relativeNativeCenterXY':p[1:3].tolist(),
          'savedModelResidualExactToRoundoff':True,'fixedCenterNormalEquationExactToRoundoff':True,
          'wrongKernelAxisMaximumModelDelta':error})
assert len(rows)==45 and worst_wrong_axis>1e-6
pip_path=ROOT/'output/sdss-psf-tools-1003-r1/pip-report.json';pip=json.loads(pip_path.read_bytes());paths.append(pip_path)
tool_root=ROOT/'output/sdss-psf-tools-1003-r1/python-deps';tool_files=[p for p in tool_root.rglob('*') if p.is_file()]
result={'status':'PASSED_SAVED_NATIVE_PSF_DIAGNOSTIC_READBACK','rows':rows,'inputs':[bind(p) for p in paths],
   'actual45ProfilesReadBack':True,'fixedCenterNormalEquationsExact':True,'rowFirstSavedCubicAndCenterModelsExact':True,
   'savedResidualAndConditionalStatisticsExact':True,'wrongKernelAxisControlMaximumModelDelta':worst_wrong_axis,
   'tools':{'pipReport':bind(pip_path),'packages':[{'name':p['metadata']['name'],'version':p['metadata']['version'],'source':p['download_info']} for p in pip['install']],
      'newToolDirectoryFiles':len(tool_files),'newToolDirectoryLogicalBytes':sum(p.stat().st_size for p in tool_files),
      'meaning':'New isolated offline Windows tool files only, includes wheel binary libraries/license records; no production/runtime dependency change, full retained inventory or Linux physical capacity claim.'},
   'fitReruns':0,'sourceRequests':0,'scientificCorrections':'NONE','quality':'UNVERIFIED','independentReview':'MISSING','adopted':False,
   'meaning':'Independent arithmetic path in root, not independent reviewer or PSF/weak-structure quality acceptance. Central source profiles and projected/coadded target model remain absent.'}
save(OUT/'result.json',result)
print(json.dumps({k:v for k,v in result.items() if k not in ('rows','inputs')}))
