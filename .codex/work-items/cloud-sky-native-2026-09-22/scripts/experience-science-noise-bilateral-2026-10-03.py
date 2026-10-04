"""Single task-only signed multiband bilateral display trial with native covariance.

One fixed 5x5 / spatial sigma1 / range sigma1 experiment, not a parameter sweep.
Never edit science, fit sky/gain/PSF, certify SNR or smooth a mixed coadd using a
single exposure's noise. Outputs are display estimates, not new observations.
"""
from dataclasses import asdict
import argparse
import importlib.util
import json
from pathlib import Path
import sys
import time

ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image,ImageDraw
from astropy.visualization import ManualInterval,LuptonAsinhStretch,make_lupton_rgb
from sdss_corrected_frame import read_cached_frame
from sdss_frame_noise import read_cached_field_noise,native_noise_samples
from sdss_frame_quality import read_cached_psfield,read_cached_fpm,check_frame_quality
from sdss_source_stencil import source_pixel_stencil,bilinear_source_samples
from sdss_gri_tan import target_tan
from sdss_noise_display import pair_difference_variance as covariance_difference, filter_shared

spec=importlib.util.spec_from_file_location('existing_local_diagnostic',TASK/'scripts/experience-sdss-local-overlap-diagnosis-2026-10-02.py')
local=importlib.util.module_from_spec(spec);spec.loader.exec_module(local)
bound,save,save_array,stats=local.bound,local.save,local.save_array,local.stats
RADIUS=2
# A processing trial qualification only; flagged science remains observed data.
REJECT_PROCESSING_BITS=sum(1<<bit for bit in (0,1,8,9))
# NOTCHECKED (bit2) is object-detection status, not absent/bad measurement.
# BRIGHTOBJECT/OBJECT/SUBTRACTED remain recorded; no model is restored here.






def check_covariance_coefficients(stencils):
    """Independent algebra path: combine eight signed native coefficients first."""
    h,w=stencils['variance'].shape[1:];checks=[];ignored_covariance_errors=[]
    for dy,dx in ((0,0),(0,1),(1,0),(1,1),(-1,-1),(2,2)):
        actual=covariance_difference(stencils,dy,dx)
        for band in range(3):
            for cy,cx in ((RADIUS,RADIUS),(h//2,w//2),(h-RADIUS-1,w-RADIUS-1)):
                combined={};variances={}
                for sign,y,x in ((1,cy,cx),(-1,cy+dy,cx+dx)):
                    for corner in range(4):
                        identity=int(stencils['ids'][band,corner,y,x])
                        coefficient=float(stencils['weights'][band,corner,y,x])
                        variance=float(stencils['native_variance'][band,corner,y,x])
                        assert identity>=0 and np.isfinite(variance)
                        if identity in variances:assert variances[identity]==variance
                        variances[identity]=variance
                        combined[identity]=combined.get(identity,0)+sign*coefficient
                expected=sum(value**2*variances[identity] for identity,value in combined.items())
                observed=float(actual[band,cy-RADIUS,cx-RADIUS])
                assert np.isclose(observed,expected,rtol=1e-12,atol=1e-16)
                independent=float(stencils['variance'][band,cy,cx]+stencils['variance'][band,cy+dy,cx+dx])
                if dy or dx:ignored_covariance_errors.append(abs(independent-expected)/max(expected,1e-100))
                checks.append({'offsetYX':[dy,dx],'band':'gri'[band],'centerHaloYX':[cy,cx],
                    'combinedSignedNativeVariance':expected,'pairCovarianceVariance':observed})
    assert max(ignored_covariance_errors)>.01
    return {'checks':checks,'ignoredCovarianceMutationDetected':True,
        'maximumWrongIndependentRelativeError':max(ignored_covariance_errors),
        'meaning':'Algebra self-check, not independent review or native-noise-model acceptance.'}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',default='science-noise-bilateral-1003-r1')
    parser.add_argument('--regions',nargs='+');args=parser.parse_args()
    assert Path(args.output).name==args.output and args.output.startswith('science-noise-bilateral-1003-r')
    out=ROOT/'output'/args.output;assert not out.exists();out.mkdir()
    candidate_path=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json'
    publication_path=ROOT/'output/frozen-zscale-publication-1003-r1/manifest.json'
    assert bound(candidate_path)['sha256']=='73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52'
    assert bound(publication_path)['sha256']=='8679b44e97e4b51a6893239d49db1b3931ac12b79c9692d91086f5190f9f0368'
    c=json.loads(candidate_path.read_bytes());p=json.loads(publication_path.read_bytes());recipe=p['master']['transfer']['recipe']
    field=next(f for f in c['mosaic']['fields'] if f['fieldKey']=='301/3699/6/100')
    field_dir=ROOT/'output/sdss-m51-field-quality-1002-r3';camera_receipt=json.loads((field_dir/'receipt.json').read_bytes())
    quality_path=ROOT/'output/sdss-m51-core-quality-inputs-1002-r1/acquisition.json'
    q=json.loads(quality_path.read_bytes());sources={s['filename']:s for s in q['sourceFiles']}
    paths=[Path(__file__),Path(local.__file__),candidate_path,publication_path,quality_path,
        *(ROOT/'data-pipelines/deep-sky'/s for s in ('sdss_frame_noise.py','sdss_frame_quality.py','sdss_source_stencil.py','sdss_corrected_frame.py','sdss_gri_tan.py')),
        *(field_dir/s for s in ('response.csv','receipt.json'))]
    reference_path=ROOT/'output/sdss-m51-shared-transfer-1002/global-zscale-q8/rgb-master.npy'
    assert bound(reference_path)['sha256']=='3073421521ca303701a5a5c5090753f6e43a00034d022838080dad66d791d4b6'
    original=np.load(reference_path,mmap_mode='r',allow_pickle=False);paths.append(reference_path)
    weight_meta=c['mosaic']['diagnostics'][field['fieldKey']]['normalized-weight']
    weight_path=candidate_path.parent/weight_meta['file'];assert bound(weight_path)['sha256']==weight_meta['sha256']
    field_weight=np.load(weight_path,mmap_mode='r',allow_pickle=False);paths.append(weight_path)
    for band in 'gri':
        source=field['perBand'][band]['sourceReceipt']['source'];paths.append(Path(source['path']))
        science_meta=c['mosaic']['diagnostics'][field['fieldKey']][band+'-science']
        path=candidate_path.parent/science_meta['file'];assert bound(path)['sha256']==science_meta['sha256'];paths.append(path)
    for s in sources.values():
        assert s['httpStatus']==200 and s['actualFinalUrl']==s['url'] and bound(ROOT/s['raw']['path'])==s['raw']
        paths.append(ROOT/s['raw']['path'])
    for row in json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes()):
        path=ROOT/row['path'];assert bound(path)['sha256']==row['sha256'];paths.append(path)
    before=[bound(path) for path in paths];save(out/'inputs-before.json',before)
    (out/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    def quality_input(name,band='g'):
        s=sources[name]
        return ROOT/s['raw']['path'],field['identity'] | {'band':band,'bytes':s['bytes'],'sha256':s['sha256'],'sourceUrl':s['url']}
    path,expected=quality_input('psField-003699-6-0100.fit')
    psf=read_cached_psfield(path,expected,max_uncompressed_bytes=16*1024*1024)
    frames,cameras,masks,associations={},{},{},{}
    for band in 'gri':
        receipt=field['perBand'][band]['sourceReceipt'];source=receipt['source']
        assert bound(Path(source['path']))['sha256']==source['sha256']
        frames[band]=read_cached_frame(Path(source['path']),receipt['identity'] | {k:source[k] for k in ('bytes','sha256','sourceUrl')},max_uncompressed_bytes=32*1024*1024)
        assert frames[band].receipt==receipt
        cameras[band]=read_cached_field_noise(field_dir/'response.csv',camera_receipt,receipt['identity'])
        path,expected=quality_input(f'fpM-003699-{band}6-0100.fit.gz',band)
        masks[band]=read_cached_fpm(path,expected,max_uncompressed_bytes=16*1024*1024)
        associations[band]=check_frame_quality(frames[band],psf,masks[band])
    target=target_tan(c['center'],c['pixels'],c['fieldDegrees'])
    def rgb(values):
        return make_lupton_rgb(values[2],values[1],values[0],interval=ManualInterval(vmin=0,vmax=None),
            stretch_object=LuptonAsinhStretch(stretch=recipe['stretch'],Q=recipe['Q']),output_dtype=np.uint8)
    def display_stats(image):
        return {'meanRGB':image.mean(axis=(0,1)).tolist(),'redMinusGreenStd':float((image[:,:,0].astype(float)-image[:,:,1]).std()),
            'blueMinusGreenStd':float((image[:,:,2].astype(float)-image[:,:,1]).std()),'nonblackPixels':int(np.any(image!=0,axis=2).sum())}
    records=[];tiles=[]
    regions=[('arm', [1056,960,1184,1088],True),('diffuse-arm',[1100,1140,1228,1268],True),
        ('foreground-2',[1219,1364,1284,1429],True),('flagged-foreground-1',[1407,1393,1440,1426],True),
        ('single-field-outer',[1952,1984,1985,2017],False)]
    if args.regions:
        assert len(set(args.regions))==len(args.regions) and set(args.regions)<=set(r[0] for r in regions)
        regions=[r for r in regions if r[0] in args.regions]
    for name,bounds,same_coadd in regions:
        x0,y0,x1,y1=bounds;h=y1-y0;w=x1-x0;rad=RADIUS
        py,px=np.mgrid[y0-rad:y1+rad,x0-rad:x1+rad];ra,dec=target.all_pix2world(px,c['pixels']-1-py,0)
        if same_coadd:assert (field_weight[y0-rad:y1+rad,x0-rad:x1+rad]==1).all()
        data=[];flags=[];ids=[];coeff=[];nvar=[];variances=[];availability=[]
        for band in 'gri':
            frame=frames[band];sx,sy=frame.wcs.all_world2pix(ra,dec,0)
            values,geometric,finite=bilinear_source_samples(frame.data,sx,sy)
            meta=c['mosaic']['diagnostics'][field['fieldKey']][band+'-science']
            cached=np.load(candidate_path.parent/meta['file'],mmap_mode='r',allow_pickle=False)
            assert np.array_equal(values,cached[y0-rad:y1+rad,x0-rad:x1+rad])
            stencil=source_pixel_stencil(frame.data.shape,sx,sy);assert stencil.geometry.all()
            bx=stencil.x0.reshape(sx.shape);by=stencil.y0.reshape(sy.shape);fx=sx-bx;fy=sy-by
            nx=np.stack([bx,bx+1,bx,bx+1]);ny=np.stack([by,by,by+1,by+1])
            weights=np.stack([(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy])
            native=native_noise_samples(frame,cameras[band],nx,ny)
            mask=masks[band].stencil(sx,sy);assert mask.geometry.all()
            data.append(values);flags.append(mask.flags);ids.append(ny*2048+nx);coeff.append(weights)
            nvar.append(native.variance_nmgy_squared);variances.append((weights**2*native.variance_nmgy_squared).sum(axis=0))
            availability.append(geometric&finite&native.available.all(axis=0))
        values=np.stack(data);actual_flags=np.stack(flags)
        stencils={'ids':np.stack(ids),'weights':np.stack(coeff),'native_variance':np.stack(nvar),'variance':np.stack(variances)}
        coefficient_check=check_covariance_coefficients(stencils)
        eligible=np.all(np.stack(availability),axis=0)&np.all((actual_flags&REJECT_PROCESSING_BITS)==0,axis=0)
        center=values[:,rad:-rad,rad:-rad];baseline=rgb(center)
        if same_coadd:assert np.array_equal(baseline,original[y0:y1,x0:x1])
        started=time.perf_counter();filtered,diagnostic=filter_shared(values,eligible,lambda dy,dx:covariance_difference(stencils,dy,dx))
        elapsed=time.perf_counter()-started;display=rgb(filtered)
        processable=diagnostic['centerProcessable'];assert np.array_equal(filtered[:,~processable],center[:,~processable])
        assert np.array_equal(display[~processable],baseline[~processable])
        ordinary_difference=stencils['variance'][:,rad:-rad,rad:-rad]+stencils['variance'][:,rad:-rad,rad+1:rad+1+w]
        actual_difference=covariance_difference(stencils,0,1)
        assert np.all(actual_difference<=ordinary_difference+1e-12)
        arrays={'filteredDisplayEstimates':save_array(out/(name+'-filtered-values.npy'),filtered),
            'originalMeasurements':save_array(out/(name+'-original-values.npy'),center),
            'processable':save_array(out/(name+'-processable.npy'),processable),
            'weightsSum':save_array(out/(name+'-weight-sum.npy'),diagnostic['weightSum'])}
        Image.fromarray(baseline).save(out/(name+'-original.png'));Image.fromarray(display).save(out/(name+'-bilateral.png'))
        blocks=[]
        for by in range(0,h-7,8):
            for bx in range(0,w-7,8):
                a=center[:,by:by+8,bx:bx+8].mean(axis=(1,2),dtype=np.float64)
                b=filtered[:,by:by+8,bx:bx+8].mean(axis=(1,2),dtype=np.float64)
                blocks.append({'topLeftXY':[bx,by],'originalMeanGRI':a.tolist(),'displayEstimateMeanGRI':b.tolist(),'deltaGRI':(b-a).tolist()})
        moment=None
        if name=='foreground-2':
            # Exactly the previous peak-centered 33x33 estimator, not fitted PSF.
            cx,cy=1251-x0,1396-y0
            moment={band:{'original':local.centroid(center[at,cy-16:cy+17,cx-16:cx+17],6),
                          'trial':local.centroid(filtered[at,cy-16:cy+17,cx-16:cx+17],6)} for at,band in enumerate('gri')}
        record={'name':name,'boundsXYExclusive':bounds,'halo':rad,'coaddEqualsSingleField':same_coadd,
            'original':display_stats(baseline),'trial':display_stats(display),'eligibleCenters':int(processable.sum()),
            'unprocessedCenters':int((~processable).sum()),'unprocessedPixelsByteExact':True,
            'actualPerBandFlags':{band:{flag:int(np.count_nonzero(actual_flags[at,rad:-rad,rad:-rad]&(1<<bit))) for flag,bit in masks[band].enum.items() if bit<10} for at,band in enumerate('gri')},
            'rightNeighborDifferenceVarianceOverIndependentMedianGRI':np.median(actual_difference/ordinary_difference,axis=(1,2)).tolist(),
            'directSignedNativeCoefficientCheck':coefficient_check,
            'conditionalSingleFrameNoise':True,'blocks8x8':blocks,'stellarDiagnosticMoment':moment,'arrays':arrays,
            'changedDisplayPixels':int(np.any(display!=baseline,axis=2).sum()),'elapsedSeconds':elapsed,
            'meaning':'Display processing only; coefficients depend on noisy samples, so this is not calibrated post-filter covariance or unbiased photometry.'}
        records.append(record)
        sheet=Image.new('RGB',(512,282),'#101010');draw=ImageDraw.Draw(sheet);draw.text((5,5),name+' original / common bilateral',fill='white')
        sheet.paste(Image.fromarray(baseline).resize((256,256),Image.Resampling.NEAREST),(0,26))
        sheet.paste(Image.fromarray(display).resize((256,256),Image.Resampling.NEAREST),(256,26));sheet.save(out/(name+'-comparison.png'))
        tiles.append(sheet)
        print(name,'changed',record['changedDisplayPixels'],'unprocessed',record['unprocessedCenters'],'RGB',record['original']['meanRGB'],record['trial']['meanRGB'],flush=True)
    # Mechanism controls are never observations or weak-structure acceptance.
    constant=np.stack([np.full((37,37),v,np.float32) for v in (.1,.2,.3)])
    dummy=lambda dy,dx:np.full((3,33,33),2*.005**2)
    controls=[]
    for name,values in [('constant',constant),('valid-zero',np.zeros_like(constant)),('valid-negative',-constant)]:
        result,_=filter_shared(values,np.ones((37,37),bool),dummy)
        assert np.array_equal(result,values[:,2:-2,2:-2]);controls.append({'name':name,'signedSamplesExact':True})
    step=np.zeros_like(constant);step[2,:,:18]=.2;step[0,:,18:]=.2
    edged,_=filter_shared(step,np.ones((37,37),bool),dummy)
    assert np.array_equal(rgb(edged),rgb(step[:,2:-2,2:-2]))
    controls.append({'name':'old-sharp-red-blue-counterexample','displayByteExact':True})
    missing=constant.copy();missing[0,18,18]=np.nan;eligible=np.isfinite(missing).all(axis=0)
    result,_=filter_shared(missing,eligible,dummy)
    assert np.isnan(result[0,16,16]) and np.array_equal(result[1:,16,16],missing[1:,18,18])
    controls.append({'name':'missing-band','notFilled':True,'otherCenterMeasurementsKept':True})
    unknown,_=filter_shared(constant,np.zeros((37,37),bool),dummy)
    assert np.array_equal(unknown,constant[:,2:-2,2:-2]);controls.append({'name':'unknown-noise-or-flags','originalKept':True})
    save(out/'controls.json',controls)
    after=[bound(path) for path in paths];assert after==before;save(out/'inputs-after.json',after)
    report={'scope':__doc__,'recipe':recipe,'associations':associations,'cameras':{b:asdict(v) for b,v in cameras.items()},
        'range':'sum of squared signed-gri differences / conditional Var(A-B); sigma1. Shared noise pixels included, native diagonal model only.',
        'qualification':{'rejectProcessingFpmBits':[0,1,8,9],'recordWithoutRejecting':[2,3,4,7],
            'notcheckedMeaning':'Pixel was not examined for an object; not missing or invalid science.',
            'subtractedMeaning':'Recorded model-subtraction flag; exact local origin unresolved; no restoration, reweighting, alpha or noise-model rewrite inferred.'},
        'sourceUrls':{'bilateral':'https://homepages.inf.ed.ac.uk/rbf/CVonline/LOCAL_COPIES/MANDUCHI1/Bilateral_Filtering.html',
            'opencv':'https://docs.opencv.org/4.13.0/d4/d86/group__imgproc__filter.html',
            'adaptive':'https://arxiv.org/html/0911.4956'},
        'reuse':'Existing NumPy/Astropy/readers; self-written small task adaptation of bilateral formula for per-pair spatial variance/covariance and unknown masks, unsupported by scalar sigmaColor API. No external source code copied, packages installed or production framework introduced.',
        'controls':controls,'records':records,'sourceRequests':0,'fullMatrixRuns':0,'inputsUnchanged':True,
        'independentReview':'MISSING','qualityAcceptance':'UNVERIFIED','adopted':False}
    save(out/'result.json',report)
    print(json.dumps(bound(out/'result.json')))


if __name__=='__main__':main()
