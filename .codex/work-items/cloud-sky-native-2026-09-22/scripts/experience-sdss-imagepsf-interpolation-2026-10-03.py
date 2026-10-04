"""One mature cubic ImagePSF comparison on saved actual native samples."""
from pathlib import Path
import importlib.util,json,sys,time
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True;sys.path[:0]=[str(ROOT/'output/sdss-psf-tools-1003-r1/python-deps'),str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np,scipy,photutils,astropy
from photutils.psf import ImagePSF
from PIL import Image,ImageDraw
spec=importlib.util.spec_from_file_location('native_psf_fit',TASK/'scripts/experience-sdss-measured-native-psf-r2-2026-10-03.py')
helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
bind,fit,write_report=helper.bind,helper.weighted_model_fit,helper.write_report

def main():
    started=time.perf_counter();prior=ROOT/'output/sdss-measured-native-psf-1003-r2';out=ROOT/'output/sdss-imagepsf-interpolation-1003-r1';assert not out.exists()
    result_path=prior/'result.json';assert bind(result_path)['sha256']=='d1e4d98f6c2c02ba34fc34bc84c2f4b4ebe858c3a38d32f0634e88442b09a804'
    old=json.loads(result_path.read_bytes());source_pins=json.loads((prior/'inputs-before.json').read_bytes())
    assert source_pins==json.loads((prior/'inputs-after.json').read_bytes())
    for record in source_pins:assert bind(ROOT/record['path'])==record
    paths=[Path(__file__),Path(helper.__file__),result_path,prior/'inputs-before.json',prior/'inputs-after.json',
      ROOT/'output/sdss-psf-tools-1003-r1/pip-report.json',
      Path(sys.modules[ImagePSF.__module__].__file__),Path(sys.modules[scipy.interpolate.RectBivariateSpline.__module__].__file__)]
    for d in (ROOT/'output/sdss-psf-tools-1003-r1/python-deps').glob('*.dist-info'):
        paths.append(d/'METADATA');paths.append(d/'RECORD');paths.extend(p for p in d.rglob('*') if p.is_file() and ('license' in p.name.lower() or 'copying' in p.name.lower()))
    for row in old['records']:
        for meta in row['bands'].values():
            path=ROOT/meta['saved']['path'];assert bind(path)==meta['saved'];paths.append(path)
    before=[bind(p) for p in paths];out.mkdir();write_report(out/'inputs-before.json',before)
    (out/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    records=[];sheet=Image.new('RGB',(3*246,len(old['records'])*142),'#181818');draw=ImageDraw.Draw(sheet)
    for index,row in enumerate(old['records']):
        current={'objID':row['objID'],'run':row['run'],'field':row['field'],'bands':{}}
        for at,(band,meta) in enumerate(row['bands'].items()):
            p=ROOT/meta['saved']['path']
            with np.load(p,allow_pickle=False) as arrays:values={k:arrays[k] for k in arrays.files}
            kernel=values['kernel'];psf=ImagePSF(kernel/kernel.sum(),flux=1,x_0=0,y_0=0,origin=(25,25),oversampling=1,fill_value=np.nan)
            template=psf(values['dx'],values['dy']);assert np.isfinite(template).all()
            coefficients,model,residual,stats=fit(values['data'],template,values['dx'],values['dy'],values['variance'],values['fit_mask'])
            test=np.arange(-25,26,dtype=float);xx,yy=np.meshgrid(test,test);np.testing.assert_allclose(psf(xx,yy),kernel/kernel.sum(),rtol=0,atol=5e-17)
            assert np.isnan(psf(np.array([26.]),np.array([0.]))).all()
            # Noiseless coefficient control establishes signed model/plane and
            # fractional sample arithmetic, not measured PSF truth.
            chosen=np.array([2.5,-.01,.0003,-.0002]);injected=chosen[0]*template+chosen[1]+chosen[2]*values['dx']+chosen[3]*values['dy']
            control=fit(injected,template,values['dx'],values['dy'],values['variance'],values['fit_mask'])
            np.testing.assert_allclose(control[0],chosen,rtol=0,atol=1e-12)
            np.savez_compressed(out/f'{row["objID"]}-{band}.npz',template=template,coefficients=coefficients,model=model,residual=residual)
            new_path=out/f'{row["objID"]}-{band}.npz'
            current['bands'][band]={'oldConditionalChiSquarePerDof':meta['fitStats']['conditionalChiSquarePerDof'],
              'newConditionalChiSquarePerDof':stats['conditionalChiSquarePerDof'],'coefficients':coefficients.tolist(),
              'fitStats':stats,'sourceDataAndSupport':meta['saved'],'output':bind(new_path),
              'integerKernelExactToRoundoff':True,'outOfKernelSupportUnavailable':True,'signedFractionalModelPlaneControlExact':True}
            use=values['fit_mask'];minimum=float(np.percentile(values['data'][use],5));maximum=float(np.percentile(values['data'][use],99));scale=max(maximum-minimum,1e-12)
            for column,(label,v) in enumerate((('native unchanged',values['data']),('cubic PSF+plane',model),('cubic residual',residual))):
                gray=np.clip((v-minimum)/scale if column<2 else .5+v/scale,0,1);image=Image.fromarray(np.rint(gray*255).astype(np.uint8))
                sheet.paste(image.resize((82,82),Image.Resampling.NEAREST),(column*246+at*82,index*142+44))
                if at==0:draw.text((column*246+2,index*142+3),row['objID']+' '+label,fill='white')
            draw.text((at*82+2,index*142+28),band,fill='white')
        records.append(current)
    sheet.save(out/'actual-cubic-native-model-residuals.png')
    after=[bind(p) for p in paths];assert before==after;write_report(out/'inputs-after.json',after)
    for record in source_pins:assert bind(ROOT/record['path'])==record
    report={'status':'COMPLETED_ACTUAL_MATURE_IMAGEPSF_INTERPOLATION_COMPARISON','records':records,
      'inputNativeDiagnosis':bind(result_path),'libraries':{'numpy':np.__version__,'astropy':astropy.__version__,'scipy':scipy.__version__,'photutils':photutils.__version__},
      'actualComparison':bind(out/'actual-cubic-native-model-residuals.png'),'inputsAndOriginalSourcePinsExact':True,
      'implementation':'Photutils ImagePSF cubic RectBivariateSpline, exact original fractional catalog centers and old support/variance; same four linear nuisance parameters.',
      'elapsedSeconds':time.perf_counter()-started,'sourceRequests':0,'catalogQueries':0,'nativeFrameReprojections':0,
      'scientificCorrections':'NONE','wholeFilterRuns':0,'productionDependencyChanged':False,
      'meaning':'This changes diagnostic template interpolation only. No source/data/center/variance/flags/candidate modification. Relative finite kernel normalization does not certify total flux, PSF, matching, galaxy background or complete weak structure.',
      'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    write_report(out/'result.json',report)
    print(json.dumps({'result':bind(out/'result.json'),'libraries':report['libraries'],'elapsedSeconds':report['elapsedSeconds'],
      'conditionalChiSquarePerDof':{b:[r['bands'][b]['newConditionalChiSquarePerDof'] for r in records] for b in ('g','r','i')}}))

if __name__=='__main__':main()
