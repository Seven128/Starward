"""Bounded local centroid nuisance fit, no WCS or source correction."""
from pathlib import Path
import hashlib,json,sys,time
ROOT=Path(__file__).resolve().parents[4];sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/sdss-psf-tools-1003-r1/python-deps'),str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from photutils.psf import ImagePSF
from astropy.modeling.models import Planar2D
from astropy.modeling.fitting import TRFLSQFitter
from PIL import Image,ImageDraw
def bind(p):
    d=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(d),'sha256':hashlib.sha256(d).hexdigest()}
def save(p,v):
    with p.open('x',encoding='utf-8') as f:json.dump(v,f,indent=2,allow_nan=False);f.write('\n')
def initialize(kernel,coefficients):
    source=ImagePSF(kernel/kernel.sum(),flux=coefficients[0],x_0=0,y_0=0,origin=(25,25),oversampling=1,fill_value=np.nan)
    source.x_0.bounds=(-.5,.5);source.y_0.bounds=(-.5,.5);source.flux.bounds=(0,None)
    return source+Planar2D(slope_x=coefficients[2],slope_y=coefficients[3],intercept=coefficients[1])
def main():
    started=time.perf_counter();prior=ROOT/'output/sdss-imagepsf-interpolation-1003-r1';out=ROOT/'output/sdss-imagepsf-centering-1003-r1';assert not out.exists()
    rp=prior/'result.json';assert bind(rp)['sha256']=='9a0477e9b21ea9dfc918b2ee82381a7ce271af0c6cb14aca64aa4c29f25b6ad2';old=json.loads(rp.read_bytes())
    original_pins=json.loads((prior/'inputs-before.json').read_bytes());assert original_pins==json.loads((prior/'inputs-after.json').read_bytes())
    for p in original_pins:assert bind(ROOT/p['path'])==p
    paths=[Path(__file__),rp,prior/'inputs-before.json',prior/'inputs-after.json']
    for r in old['records']:
        for m in r['bands'].values():
            for k in ('sourceDataAndSupport','output'):
                p=ROOT/m[k]['path'];assert bind(p)==m[k];paths.append(p)
    before=[bind(p) for p in paths];out.mkdir();save(out/'inputs-before.json',before);(out/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    records=[];sheet=Image.new('RGB',(738,142*len(old['records'])),'#181818');draw=ImageDraw.Draw(sheet)
    for index,r in enumerate(old['records']):
        row={'objID':r['objID'],'run':r['run'],'field':r['field'],'bands':{}}
        for at,(b,m) in enumerate(r['bands'].items()):
            with np.load(ROOT/m['sourceDataAndSupport']['path'],allow_pickle=False) as z:values={k:z[k] for k in z.files}
            use=values['fit_mask'];weights=1/np.sqrt(values['variance'][use]);fitter=TRFLSQFitter()
            model=fitter(initialize(values['kernel'],m['coefficients']),values['dx'][use],values['dy'][use],values['data'][use],weights=weights,maxiter=100)
            info=fitter.fit_info;predicted=model(values['dx'],values['dy']);residual=values['data']-predicted
            assert np.isfinite(predicted).all() and info['success'] and info['nfev']<=100
            dof=int(use.sum())-6;chi=float(np.square(residual[use]*weights).sum()/dof)
            pos=[float(model.x_0_0.value),float(model.y_0_0.value)]
            p=out/f'{r["objID"]}-{b}.npz';np.savez_compressed(p,model=predicted,residual=residual)
            row['bands'][b]={'cubicFixedCenterChiSquarePerDof':m['newConditionalChiSquarePerDof'],
              'localCenterChiSquarePerDof':chi,'parameters':model.parameters.tolist(),'parameterNames':list(model.param_names),
              'relativeNativeCenterXY':pos,'centerAtBounds':any(abs(v)>=.499999 for v in pos),
              'support':int(use.sum()),'dof':dof,'optimizer':{'success':bool(info['success']),'status':int(info['status']),'nfev':int(info['nfev']),'message':str(info['message'])},
              'saved':bind(p),'meaning':'Local nuisance centroid relative to catalog native center. It is neither global astrometric shift nor PSF/galaxy matching qualification.'}
            # Signed nuisance-plane/known subpixel-center synthetic control.
            injected=initialize(values['kernel'],[2.5,-.01,.0003,-.0002]);injected.x_0_0=.13;injected.y_0_0=-.18
            samples=injected(values['dx'][use],values['dy'][use]);control_fitter=TRFLSQFitter()
            control=control_fitter(initialize(values['kernel'],[2.4,-.009,.0002,-.0001]),values['dx'][use],values['dy'][use],samples,weights=weights,maxiter=100)
            assert control_fitter.fit_info['success'];np.testing.assert_allclose(control.parameters,injected.parameters,rtol=0,atol=1e-6)
            row['bands'][b]['syntheticSignedModelCenterControlExact']=True
            minimum=float(np.percentile(values['data'][use],5));maximum=float(np.percentile(values['data'][use],99));scale=max(maximum-minimum,1e-12)
            for column,(label,v) in enumerate((('native unchanged',values['data']),('local center PSF+plane',predicted),('local residual',residual))):
                gray=np.clip((v-minimum)/scale if column<2 else .5+v/scale,0,1);image=Image.fromarray(np.rint(gray*255).astype(np.uint8))
                sheet.paste(image.resize((82,82),Image.Resampling.NEAREST),(column*246+at*82,index*142+44))
                if at==0:draw.text((column*246+2,index*142+3),r['objID']+' '+label,fill='white')
            draw.text((at*82+2,index*142+28),b,fill='white')
        records.append(row)
    sheet.save(out/'actual-local-center-model-residuals.png')
    after=[bind(p) for p in paths];assert before==after;save(out/'inputs-after.json',after)
    for p in original_pins:assert bind(ROOT/p['path'])==p
    report={'status':'COMPLETED_ACTUAL_LOCAL_IMAGEPSF_CENTER_DIAGNOSTIC','records':records,'fixedCenterInput':bind(rp),
       'actualComparison':bind(out/'actual-local-center-model-residuals.png'),'allInputPinsExact':True,
       'libraries':old['libraries'],'policy':'Photutils ImagePSF + Astropy Planar2D/TRFLSQFitter, same radius12/support/native variance; fit flux/xy and plane, single-pixel[-.5,+.5] center bounds,max100 evaluations. No sigma/shape/origin scan.',
       'elapsedSeconds':time.perf_counter()-started,'sourceRequests':0,'catalogQueries':0,'nativeFrameReprojections':0,
       'scientificCorrections':'NONE','wholeFilterRuns':0,'productionDependencyChanged':False,
       'limitations':['Conditional native noise omits source-model/SKY/systematic/centroid/PSF/blend uncertainty.',
          'Better nuisance fit with more parameters is not independent PSF accuracy, true source color or photometry.',
          'No central-field detections, projected/coadded target PSF, extended-source DCR or global matching adoption.'],
       'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    save(out/'result.json',report)
    print(json.dumps({'result':bind(out/'result.json'),'elapsedSeconds':report['elapsedSeconds'],
       'conditionalChiSquarePerDof':{b:[r['bands'][b]['localCenterChiSquarePerDof'] for r in records] for b in ('g','r','i')},
       'centers':{b:[r['bands'][b]['relativeNativeCenterXY'] for r in records] for b in ('g','r','i')}}))
if __name__=='__main__':main()
