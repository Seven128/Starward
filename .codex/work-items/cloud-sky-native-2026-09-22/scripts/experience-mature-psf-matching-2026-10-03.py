"""Bounded real science cuts via Photutils Wiener PSF matching.

One recorded default-regularization development trial. No source acquisition,
global matching, adaptive rerun or production/image/recipe changes.
"""
from pathlib import Path
import hashlib,json,sys,time,inspect
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.path[:0]=[str(ROOT/'output/sdss-psf-tools-1003-r1/python-deps'),str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from scipy.signal import convolve2d
from scipy.ndimage import minimum_filter
from photutils.psf_matching import make_wiener_kernel
from astropy.visualization import ManualInterval,LuptonAsinhStretch,make_lupton_rgb
from PIL import Image,ImageDraw
OUT=ROOT/'output/mature-psf-matching-1003-r1'
BANDS=('g','r','i')
def bind(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for v in iter(lambda:f.read(1024*1024),b''):h.update(v)
    return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}
def save(p,v):
    with p.open('x',encoding='utf-8') as f:json.dump(v,f,indent=2,allow_nan=False);f.write('\n')
def main():
    OUT.mkdir(exist_ok=False);(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes());started=time.perf_counter();paths=[Path(__file__),Path(inspect.getfile(make_wiener_kernel))]
    def doc(p,pin):
        assert bind(p)['sha256']==pin;paths.append(p);return json.loads(p.read_bytes())
    base=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2'
    c=doc(base/'candidate.json','73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52')
    current_dir=ROOT/'output/shared-adaptive-flag-recovery-1003-r2/candidate'
    current=doc(current_dir/'candidate.json','e3f8f732ed0fda1121ac38aec2cae9ad57521c3d2807b3d985955f64e5548235')
    response=doc(ROOT/'output/target-psf-response-1003-r3/result.json','bd5e6755e8552866298757dab8eb91ec2bbb9eacefeb7217c78def661a056041')
    qdir=ROOT/'output/shared-adaptive-real-halo-1003-r1/candidate'
    parent=doc(qdir/'candidate.json','110462fb0d487009b03f221a013f1387f7ab27812ed9c7394bece1aab05bc1ee')
    def array(directory,v):
        p=directory/v['file'];assert bind(p)['sha256']==v['sha256'];paths.append(p);return np.load(p,mmap_mode='r',allow_pickle=False)
    science={b:array(base,c['arrays'][b+'-science']) for b in BANDS};display={b:array(current_dir,current['arrays'][b]) for b in BANDS}
    qualified=array(qdir,parent['arrays']['qualified']);joint=array(base,c['arrays']['joint-availability'])
    for m in current['levels'].values():paths.append(current_dir/m['file'])
    for v in json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes()):
        p=ROOT/v['path'];assert bind(p)['sha256']==v['sha256'];paths.append(p)
    # One relatively isolated compact cut and one actual extended/mixed-RUN
    # cut, observed in the preceding figures. No star classification claim.
    locations=[response['records'][i] for i in (10,84)]
    for row in locations:
        p=ROOT/row['saved']['path'];assert bind(p)==row['saved'];paths.append(p)
    before=[bind(p) for p in paths];save(OUT/'inputs-before.json',before)
    recipe=current['sourceResolvedRecipe'];assert recipe['rgbBands']==['i','r','g'] and recipe['intervalMinimum']==0
    def rgb(a):
        # Same whole-master resolved parameters, never fit the local cuts.
        return make_lupton_rgb(a[2].astype(float),a[1].astype(float),a[0].astype(float),interval=ManualInterval(vmin=0),
                               stretch_object=LuptonAsinhStretch(stretch=recipe['stretch'],Q=recipe['Q']),output_dtype=np.uint8)
    rows=[];panel=Image.new('RGB',(732,294*len(locations)),'#181818');draw=ImageDraw.Draw(panel)
    for order,row in enumerate(locations):
        with np.load(ROOT/row['saved']['path'],allow_pickle=False) as z:
            psfs=np.stack([z['coadd-'+b][5:36,5:36].astype(float) for b in BANDS])
        assert np.isfinite(psfs).all() and (psfs.sum(axis=(1,2))>0).all()
        finite_sums=psfs.sum(axis=(1,2));psfs/=finite_sums[:,None,None]
        yy,xx=np.mgrid[-15:16,-15:16];dist=np.sqrt(xx**2+yy**2)
        # Reference choice based on actual positive core encircled radius;
        # positive-only values used ONLY for this width diagnostic, not PSFs.
        core=dist<=6;order_radius=np.argsort(dist[core]);radii=dist[core][order_radius];r50=[]
        for p in psfs:
            v=np.maximum(p[core],0)[order_radius];at=np.searchsorted(np.cumsum(v),v.sum()/2);r50.append(float(radii[at]))
        reference=int(np.argmax(r50));yy7,xx7=np.mgrid[-3:4,-3:4]
        broaden=np.exp(-(xx7**2+yy7**2)/2);broaden/=broaden.sum()
        target=convolve2d(psfs[reference],broaden,mode='same');target/=target.sum()
        # The added sigma=1 target-pixel blur is an explicit trial setting,
        # not observed astronomical detail or a chosen product resolution.
        kernels=np.stack([make_wiener_kernel(p,target,regularization=1e-4,penalty=None,window=None) for p in psfs])
        assert np.isfinite(kernels).all() and np.allclose(kernels.sum(axis=(1,2)),1,atol=2e-15,rtol=0)
        cx,cy=map(lambda v:int(round(v)),row['anchorTargetXY']);x0=cx-30;y0=cy-30
        region=(slice(y0-15,y0+61+15),slice(x0-15,x0+61+15));assert region[0].start>=0 and region[1].start>=0
        halo=np.stack([np.asarray(science[b][region]) for b in BANDS]);assert halo.shape==(3,91,91)
        real_eligible=np.asarray(qualified[region])&np.asarray(joint[region])&np.isfinite(halo).all(axis=0)
        admitted=minimum_filter(real_eligible.astype(np.uint8),size=31,mode='constant',cval=0)[15:-15,15:-15].astype(bool)
        raw=halo[:,15:-15,15:-15].copy();processed=raw.copy()
        convolution=np.stack([convolve2d(v.astype(float),k,mode='valid') for v,k in zip(halo,kernels)])
        assert convolution.shape==raw.shape and np.isfinite(convolution[:,admitted]).all()
        processed[:,admitted]=convolution[:,admitted].astype(np.float32)
        assert np.array_equal(processed[:,~admitted],raw[:,~admitted])
        now=np.stack([np.asarray(display[b][y0:y0+61,x0:x0+61]) for b in BANDS]);rgba=np.asarray(joint[y0:y0+61,x0:x0+61])
        images=[rgb(raw),rgb(processed),rgb(now)];assert all(v.shape==(61,61,3) for v in images)
        # Signed model readback with physical linear convolution rather than
        # merely the library's circular Fourier-domain reconstruction.
        model_outputs=np.stack([convolve2d(p,k,mode='same') for p,k in zip(psfs,kernels)])
        p=OUT/f'actual-cut-{row["index"]:03}.npz'
        np.savez_compressed(p,source_psfs=psfs,finite_psf_sums=finite_sums,broaden=broaden,target_psf=target,kernels=kernels,
            model_outputs=model_outputs,halo=halo,halo_eligible=real_eligible,admitted=admitted,original=raw,matched=processed,
            current_estimate=now,alpha=rgba,rgb_original=images[0],rgb_matched=images[1],rgb_current=images[2])
        record={'sourceLocation':row['index'],'anchorTargetXY':row['anchorTargetXY'],'boundsXYExclusive':[x0,y0,x0+61,y0+61],
            'realHaloBoundsXYExclusive':[x0-15,y0-15,x0+76,y0+76],'runs':row['distinctRuns'],'referenceBand':BANDS[reference],
            'positiveCoreR50TargetPixels':r50,'finiteSourcePsfPatchSums':finite_sums.tolist(),
            'admittedPixels':int(admitted.sum()),'keptOriginalPixels':int((~admitted).sum()),'changedPixels':int(np.any(processed!=raw,axis=0).sum()),
            'kernelL1':np.abs(kernels).sum(axis=(1,2)).tolist(),'negativeKernelMass':(-np.minimum(kernels,0)).sum(axis=(1,2)).tolist(),
            'signedNegativeSourceSamples':int((halo<0).sum()),'signedNegativeMatchedSamples':int((processed<0).sum()),
            'linearModelMismatchL1':[float(np.abs(p-target).sum()) for p in model_outputs],
            'maximumPixelScienceChange':float(np.abs(processed.astype(float)-raw).max()),'saved':bind(p),
            'quality':'UNVERIFIED','adopted':False}
        rows.append(record)
        for col,(label,im) in enumerate(zip(('original linear science','matched linear science','current nonlinear display'),images)):
            draw.text((col*244+2,order*294+3),str(row['index'])+' '+label,fill='white')
            panel.paste(Image.fromarray(im).resize((244,244),Image.Resampling.NEAREST),(col*244,order*294+24))
        draw.text((2,order*294+273),f'actual halo; admitted {int(admitted.sum())}/3721; runs {row["distinctRuns"]}',fill='white')
    panel.save(OUT/'actual-science-matching-current-comparison.png')
    after=[bind(p) for p in paths];assert before==after;save(OUT/'inputs-after.json',after)
    report={'version':'sdss-local-wiener-matching-trial-v1','records':rows,'sourceResolvedRecipe':recipe,'elapsedSeconds':time.perf_counter()-started,
        'method':{'library':'Photutils3.0.0 make_wiener_kernel','regularization':1e-4,'penalty':None,'window':None,
            'modelSize':31,'reference':'largest radius50 of positive core within radius6; ties stable g/r/i','broaden':'Gaussian sigma1 target pixel, finite7 kernel, model only',
            'target':'reference finite signed PSF linearly broadened, crop31 and normalized finite sum','spatialScope':'constant response at anchor, NOT position-dependent full-image matching'},
        'sourceRequests':0,'rawFrameReads':0,'newDetections':0,'fitRuns':0,'wholeFilterRuns':0,'scientificOrCandidateCorrections':'NONE',
        'limits':['Image material is not certified stars or independent empirical PSF; spatially constant kernels are only local trials.',
            'Source31 and target31 are explicit truncated finite models; tails outside, absolute flux/registration/fullDCR and all-field systematics unverified.',
            'Added blur/reference width are development parameters, not approved resolution/quality or proof target broader at every frequency.',
            'Matching kernels retain negative coefficients; conditional noise must propagate combined native stencils, never treat target pixels independent.',
            'The current adaptive display is nonlinear and was NOT matched, deconvolved, filtered or regenerated.',
            'Actual finite halo and every31-window source qualification required; unsupported positions retain original. No zero/mirror/wrap border image supply.',
            'Same frozen whole-master display parameters, no local color fit/gain/sky/shift; source science/current output/alpha/recipe/protected bytes preserved.'],
        'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    save(OUT/'result.json',report);print(json.dumps({'result':bind(OUT/'result.json'),'elapsedSeconds':report['elapsedSeconds'],'records':rows}),flush=True)
if __name__=='__main__':
    try:main()
    except Exception as e:
        if OUT.exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e),'candidateChanges':False})
        raise
