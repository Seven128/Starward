"""Actual mixed-coadd common display, conditional unknown-covariance upper.

Cauchy-Schwarz bounds covariance across field differences conditional on the
existing diagonal-native marginal models. Not calibrated confidence, a new
scientific image, independence, PSF matching or an ordinary publication.
"""
from dataclasses import asdict
import argparse
import importlib.util
import json
from pathlib import Path
import sys
import time

ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image,ImageDraw
from astropy.visualization import ManualInterval,LuptonAsinhStretch,make_lupton_rgb
from sdss_corrected_frame import read_cached_frame
from sdss_frame_noise import read_cached_field_noise,native_noise_samples
from sdss_source_stencil import source_pixel_stencil,bilinear_source_samples
from sdss_gri_tan import target_tan
from sdss_noise_display import conditional_variance_upper as conditional_upper
spec=importlib.util.spec_from_file_location('bilateral_trial',TASK/'scripts/experience-science-noise-bilateral-2026-10-03.py')
trial=importlib.util.module_from_spec(spec);spec.loader.exec_module(trial)
bound,save,save_array,stats=trial.bound,trial.save,trial.save_array,trial.stats




def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',default='science-mixed-noise-display-1003-r2');args=parser.parse_args()
    assert Path(args.output).name==args.output and args.output.startswith('science-mixed-noise-display-1003-r')
    out=ROOT/'output'/args.output;assert not out.exists();out.mkdir()
    cp=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json'
    pp=ROOT/'output/frozen-zscale-publication-1003-r1/manifest.json'
    qp=ROOT/'output/sdss-m51-mosaic-quality-diagnosis-1002-r3/result.json'
    assert bound(cp)['sha256']=='73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52'
    assert bound(pp)['sha256']=='8679b44e97e4b51a6893239d49db1b3931ac12b79c9692d91086f5190f9f0368'
    c=json.loads(cp.read_bytes());p=json.loads(pp.read_bytes());q=json.loads(qp.read_bytes());recipe=p['master']['transfer']['recipe']
    field_dir=ROOT/'output/sdss-m51-field-quality-1002-r3';receipt=json.loads((field_dir/'receipt.json').read_bytes())
    x0,y0,x1,y1=1952,1984,1985,2017;rad=2
    region=(slice(y0-rad,y1+rad),slice(x0-rad,x1+rad))
    paths=[Path(__file__),Path(trial.__file__),cp,pp,qp,
        *(field_dir/f for f in ('response.csv','receipt.json')),
        *(ROOT/'data-pipelines/deep-sky'/f for f in ('sdss_corrected_frame.py','sdss_frame_noise.py','sdss_source_stencil.py','sdss_gri_tan.py'))]
    def cached(meta,base=cp.parent):
        path=base/meta.get('file',meta.get('path'));assert bound(path)['sha256']==meta['sha256'];paths.append(path)
        return np.load(path,mmap_mode='r',allow_pickle=False)[region].copy()
    coadd=np.stack([cached(c['arrays'][b+'-science']) for b in 'gri'])
    flags=np.stack([cached(q['projectedFlagArrays'][b],ROOT) for b in 'gri'])
    reference_path=ROOT/'output/sdss-m51-shared-transfer-1002/global-zscale-q8/rgb-master.npy'
    assert bound(reference_path)['sha256']=='3073421521ca303701a5a5c5090753f6e43a00034d022838080dad66d791d4b6';paths.append(reference_path)
    fields=[];weight_sum=np.zeros(coadd.shape[1:]);reconstructed=np.zeros_like(coadd,dtype=np.float64)
    for field in c['mosaic']['fields']:
        diagnostics=c['mosaic']['diagnostics'][field['fieldKey']];weight=cached(diagnostics['normalized-weight'])
        weight_sum+=weight
        if not weight.any():continue
        data=np.stack([cached(diagnostics[b+'-science']) for b in 'gri'])
        reconstructed+=np.where(weight[None]>0,data,0)*weight[None]
        fields.append((field,weight,data))
        paths.extend(Path(field['perBand'][b]['sourceReceipt']['source']['path']) for b in 'gri')
    assert len(fields)==2 and {f['fieldKey'] for f,w,d in fields}=={'301/3699/6/99','301/3699/6/100'}
    assert np.allclose(weight_sum,1,rtol=0,atol=2e-7)
    # Saved weights are f32; original f64 normalization may differ by one ulp.
    assert np.allclose(reconstructed,coadd,rtol=2e-7,atol=1e-9)
    for row in json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes()):
        path=ROOT/row['path'];assert bound(path)['sha256']==row['sha256'];paths.append(path)
    before=[bound(path) for path in paths];save(out/'inputs-before.json',before)
    (out/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    py,px=np.mgrid[y0-rad:y1+rad,x0-rad:x1+rad];target=target_tan(c['center'],c['pixels'],c['fieldDegrees'])
    ra,dec=target.all_pix2world(px,c['pixels']-1-py,0)
    stencils=[];model_available=np.ones(coadd.shape[1:],bool);details=[]
    for field,field_weight,data in fields:
        ids=[];coeff=[];nvar=[];variances=[];availability=[];cameras=[]
        for at,band in enumerate('gri'):
            old=field['perBand'][band]['sourceReceipt'];source=old['source']
            frame=read_cached_frame(Path(source['path']),old['identity'] | {k:source[k] for k in ('bytes','sha256','sourceUrl')},max_uncompressed_bytes=32*1024*1024)
            assert frame.receipt==old
            camera=read_cached_field_noise(field_dir/'response.csv',receipt,old['identity']);cameras.append(asdict(camera))
            sx,sy=frame.wcs.all_world2pix(ra,dec,0);projected,geometry,finite=bilinear_source_samples(frame.data,sx,sy)
            active=field_weight>0;assert np.array_equal(projected[active],data[at][active])
            stencil=source_pixel_stencil(frame.data.shape,sx,sy);bx=stencil.x0.reshape(sx.shape);by=stencil.y0.reshape(sy.shape)
            fx,fy=sx-bx,sy-by;nx=np.stack([bx,bx+1,bx,bx+1]);ny=np.stack([by,by,by+1,by+1])
            weights=np.stack([(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy])*field_weight[None]
            noise=native_noise_samples(frame,camera,nx,ny)
            available=(~active)|(geometry&finite&noise.available.all(axis=0));availability.append(available)
            variance=np.where(active[None],noise.variance_nmgy_squared,0)
            weights=np.where(active[None],weights,0)
            ids.append(ny*2048+nx);coeff.append(weights);nvar.append(variance);variances.append((weights**2*variance).sum(axis=0))
            del frame
        model_available &= np.all(availability,axis=0)
        stencils.append({'ids':np.stack(ids),'weights':np.stack(coeff),'native_variance':np.stack(nvar),'variance':np.stack(variances)})
        details.append({'field':field['fieldKey'],'weight':stats(field_weight),'cameras':cameras})
    eligible=model_available&np.isfinite(coadd).all(axis=0)&np.all((flags&trial.REJECT_PROCESSING_BITS)==0,axis=0)
    def difference(dy,dx):return conditional_upper([trial.covariance_difference(s,dy,dx) for s in stencils])
    center=coadd[:,rad:-rad,rad:-rad]
    def rgb(values):return make_lupton_rgb(values[2],values[1],values[0],interval=ManualInterval(vmin=0,vmax=None),
        stretch_object=LuptonAsinhStretch(stretch=recipe['stretch'],Q=recipe['Q']),output_dtype=np.uint8)
    baseline=rgb(center);reference=np.load(reference_path,mmap_mode='r',allow_pickle=False)[y0:y1,x0:x1]
    assert np.array_equal(baseline,reference)
    started=time.perf_counter();filtered,diagnostic=trial.filter_shared(coadd,eligible,difference);elapsed=time.perf_counter()-started
    display=rgb(filtered);processable=diagnostic['centerProcessable']
    assert np.array_equal(filtered[:,~processable],center[:,~processable]) and np.array_equal(display[~processable],baseline[~processable])
    # Cauchy controls exercise actual algebra, including +/- correlation. They
    # never certify the native marginal estimates or real coadd uncertainty.
    marginals=np.array([.2,.4]);upper=conditional_upper([np.array(.2),np.array(.4)])
    rho=np.linspace(-1,1,201);possible=.2+.4+2*rho*np.sqrt(.2*.4)
    assert np.all(possible<=upper+1e-15) and possible[-1]>.2+.4
    assert np.isnan(conditional_upper([np.array(.2),np.array(np.nan)]))
    assert np.isclose(conditional_upper([np.array(.2),np.array(0.)]),.2,rtol=1e-15,atol=0)
    right=[trial.covariance_difference(s,0,1) for s in stencils]
    upper=conditional_upper(right);independent=sum(right)
    assert (upper>=independent-1e-14).all()
    def metrics(image):return {'meanRGB':image.mean(axis=(0,1)).tolist(),
        'redMinusGreenStd':float((image[:,:,0].astype(float)-image[:,:,1]).std()),
        'blueMinusGreenStd':float((image[:,:,2].astype(float)-image[:,:,1]).std()),
        'nonblackPixels':int(np.any(image!=0,axis=2).sum())}
    arrays={name:save_array(out/(name+'.npy'),value) for name,value in (
        ('original-measurements',center),('display-estimates',filtered),('processable',processable),
        ('right-difference-conditional-upper',upper),('right-difference-wrong-independent',independent))}
    Image.fromarray(baseline).save(out/'original.png');Image.fromarray(display).save(out/'common-upper.png')
    sheet=Image.new('RGB',(512,282),'#101010');ImageDraw.Draw(sheet).text((5,5),'mixed coadd original / common conditional upper',fill='white')
    sheet.paste(Image.fromarray(baseline).resize((256,256),Image.Resampling.NEAREST),(0,26))
    sheet.paste(Image.fromarray(display).resize((256,256),Image.Resampling.NEAREST),(256,26));sheet.save(out/'comparison.png')
    after=[bound(path) for path in paths];assert after==before;save(out/'inputs-after.json',after)
    report={'scope':__doc__,'boundsXYExclusive':[x0,y0,x1,y1],'halo':rad,'fields':details,
        'recipe':recipe,'allCachedFieldSamplesExact':True,'originalRgbExact':True,'savedWeightReconstructionMaximumError':float(np.abs(reconstructed-coadd).max()),
        'original':metrics(baseline),'trial':metrics(display),'changedPixels':int(np.any(display!=baseline,axis=2).sum()),
        'unprocessedCenters':int((~processable).sum()),'unprocessedByteExact':True,'arrays':arrays,
        'rightDifferenceUpperOverWrongIndependentMedianGRI':np.median(upper/independent,axis=(1,2)).tolist(),
        'modelMeaning':'Conditional Cauchy upper from admitted per-field diagonal-native marginal difference models, within-field repeated-native covariance and actual spatial coadd weights. Cross-field covariance is not guessed zero or assigned exact identity. This excludes missing sky/systematic/processing noise; not a confidence or truth bound.',
        'controls':{'rhoMinusOneThroughPlusOneUnderConditionalUpper':True,'independenceMutationDetected':True,'unknownMarginalNotFilled':True,'zeroContributorNeutral':True},
        'elapsedKernelSeconds':elapsed,'sourceRequests':0,'fullMatrixRuns':0,'inputsUnchanged':True,
        'independentReview':'MISSING','qualityAcceptance':'UNVERIFIED','adopted':False}
    save(out/'result.json',report);print(json.dumps({'result':bound(out/'result.json'),'original':report['original'],'trial':report['trial'],'unprocessed':report['unprocessedCenters'],'upperRatio':report['rightDifferenceUpperOverWrongIndependentMedianGRI']}))


if __name__=='__main__':main()
