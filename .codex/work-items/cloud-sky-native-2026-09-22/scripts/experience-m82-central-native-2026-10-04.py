"""M82 catalogue-empty field: all native compact candidates and PSF diagnostics.

Anonymous image candidates, not catalog stars, source truth or science repair.
"""
from pathlib import Path
import hashlib,importlib.util,json,sys,time,inspect
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
TOOLS=ROOT/'output/sdss-psf-tools-1003-r1/python-deps';sys.dont_write_bytecode=True
sys.path[:0]=[str(TOOLS),str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np,photutils
from scipy.ndimage import binary_erosion
from photutils.detection import DAOStarFinder
from photutils.psf import fit_fwhm,ImagePSF
from astropy.modeling.fitting import TRFLSQFitter
from PIL import Image,ImageDraw
from sdss_corrected_frame import read_cached_frame
from sdss_frame_quality import PixelFlags,read_cached_psfield,check_frame_quality
from sdss_frame_noise import read_cached_field_noise,native_noise_samples
from sdss_gri_tan import target_tan
OUT=ROOT/'output/sdss-m82-central-native-1004-r2';DETECTOR=ROOT/'output/sdss-m82-central-native-1004-r1';KEY='301/4264/5/261';BANDS='gri'

def module(name,file):
    spec=importlib.util.spec_from_file_location(name,TASK/'scripts'/file);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
linear=module('linear_fit','experience-sdss-measured-native-psf-r2-2026-10-03.py')
centering=module('mature_center','experience-sdss-imagepsf-centering-2026-10-03.py')
resources=module('memory','experience-shared-noise-display-2026-10-03.py')

def bind(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for v in iter(lambda:f.read(1024*1024),b''):h.update(v)
    return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}
def save(p,v):
    with p.open('x',encoding='utf-8') as f:json.dump(v,f,indent=2,allow_nan=False);f.write('\n')
def number(v):return float(v) if np.isfinite(v) else None

def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes());started=time.perf_counter();cpu=time.process_time();pins={}
    def pin(p,expected=None):
        item=bind(p)
        if expected is not None:assert item==expected
        assert pins.setdefault(item['path'],item)==item;return item
    def doc(p):pin(p);return json.loads(p.read_bytes())
    cp_path=TASK/'evidence/current-execution-state-2026-10-04-r86.json';cp=doc(cp_path)
    for item in cp['currentSources']+cp['protected']+cp['evidence']:assert bind(ROOT/item['path'])==item
    pin(ROOT/'output/sdss-m82-measured-stars-readback-1004-r3/checkpoint-continuity.json')
    science_path=ROOT/'output/sdss-m82-first-science-master-1004-r2/candidate/candidate.json';science=doc(science_path)
    full_path=ROOT/'output/sdss-m82-recovered-complete-1004-r1/candidate/candidate.json';full=doc(full_path)
    for item in full['arrays'].values():p=full_path.parent/item['file'];assert pin(p)['sha256']==item['sha256']
    for item in full['levels'].values():p=full_path.parent/item['file'];assert pin(p)['sha256']==item['sha256']
    previous=doc(ROOT/'output/sdss-m82-measured-stars-1004-r4/result.json');assert previous['fieldDetectionCounts'][KEY]==0
    quality=doc(ROOT/'output/sdss-m82-quality-inputs-1004-r1/result.json');masks=doc(ROOT/'output/sdss-m82-fpm-frame-intersection-1004-r1/result-r2.json')
    camera_receipt=doc(ROOT/'output/sdss-m82-quality-inputs-1004-r1/camera-receipt.json');camera_path=ROOT/camera_receipt['raw']['path'];pin(camera_path,camera_receipt['raw'])
    field=next(v for v in science['mosaic']['fields'] if v['fieldKey']==KEY);identity=field['perBand']['g']['sourceReceipt']['identity'];identity={k:v for k,v in identity.items() if k!='band'}
    ps=next(v for v in quality['sourceRecords'] if v['filename'].startswith('psField') and v['identity']==identity);pin(ROOT/ps['raw']['path'],ps['raw'])
    psfield=read_cached_psfield(ROOT/ps['raw']['path'],identity|{'sourceUrl':ps['url'],'bytes':ps['bytes'],'sha256':ps['sha256']},max_uncompressed_bytes=16*1024*1024)
    group={}
    for b in BANDS:
        original=field['perBand'][b]['sourceReceipt'];s=original['source'];p=Path(s['path']);assert pin(p)['sha256']==s['sha256']
        frame=read_cached_frame(p,original['identity']|{k:s[k] for k in ('bytes','sha256','sourceUrl')},max_uncompressed_bytes=32*1024*1024);assert frame.receipt==original
        m=next(v for v in masks['fpMInputs'] if v['identity']==original['identity']);pin(ROOT/m['flags']['path'],m['flags']);admission=doc(ROOT/m['currentAdmission']['path']);assert pin(ROOT/m['currentAdmission']['path'])==m['currentAdmission']
        with np.load(ROOT/m['flags']['path'],allow_pickle=False) as z:flags=np.array(z['flags'])
        flags.setflags(write=False);flag_source=PixelFlags(flags,None,admission)
        association=check_frame_quality(frame,psfield,flag_source);assert association['processingIdentity']=='MATCH'
        camera=read_cached_field_noise(camera_path,camera_receipt,original['identity']);group[b]=(frame,flag_source,camera)
    for p in (Path(__file__),Path(linear.__file__),Path(centering.__file__),Path(resources.__file__),Path(inspect.getfile(DAOStarFinder)),Path(inspect.getfile(fit_fwhm)),Path(inspect.getfile(ImagePSF)),Path(inspect.getfile(TRFLSQFitter)),TOOLS/'photutils-3.0.0.dist-info/METADATA',TOOLS/'photutils-3.0.0.dist-info/licenses/LICENSE.rst'):
        pin(p)
    for name in ('sdss_corrected_frame.py','sdss_frame_quality.py','sdss_frame_noise.py','sdss_source_stencil.py','sdss_gri_tan.py'):pin(ROOT/'data-pipelines/deep-sky'/name)
    before=list(pins.values());save(OUT/'inputs-before.json',before);target=target_tan(science['center'],science['pixels'],science['fieldDegrees']);results={}
    # The first task completed all three detectors and saved every cut before
    # its progress-write failure. Reuse that terminal generation unchanged.
    old=json.loads((DETECTOR/'inputs-before.json').read_bytes())
    for item in old:
        if item['path']==Path(__file__).relative_to(ROOT).as_posix():
            archived=bind(DETECTOR/'executed-script.py');assert (archived['bytes'],archived['sha256'])==(item['bytes'],item['sha256'])
        else:pin(ROOT/item['path'],item)
    for p in sorted(DETECTOR.iterdir()):
        if p.is_file():pin(p)
    for b in BANDS:
        results[b]=doc(DETECTOR/(b+'-detections.json'))
        for record in results[b]['records']:pin(ROOT/record['saved']['path'],record['saved'])
    before=list(pins.values())
    save(OUT/'resumed-inputs-before.json',before)
    triplets=[];association_reasons={'rSupportUnknown':0,'missingOrAmbiguousBand':0,'ambiguousReverse':0}
    for r in results['r']['records']:
        if not r['radius12FullyNativeQualified']:association_reasons['rSupportUnknown']+=1;continue
        matches={'r':r};separations={};good=True
        for b in ('g','i'):
            options=[v for v in results[b]['records'] if v['radius12FullyNativeQualified'] and np.linalg.norm(np.array(v['targetXY'])-r['targetXY'])<=2.5]
            if len(options)!=1:association_reasons['missingOrAmbiguousBand']+=1;good=False;break
            v=options[0];reverse=[rr for rr in results['r']['records'] if rr['radius12FullyNativeQualified'] and np.linalg.norm(np.array(rr['targetXY'])-v['targetXY'])<=2.5]
            if len(reverse)!=1:association_reasons['ambiguousReverse']+=1;good=False;break
            matches[b]=v;separations[b]=float(np.linalg.norm(np.array(v['targetXY'])-r['targetXY']))
        if good:triplets.append({'fieldKey':KEY,'bands':matches,'targetSeparationFromR':separations,'classification':'PROVISIONAL_COMPACT_IMAGE_CANDIDATE_NOT_CATALOG_STAR'})
    fits=[]
    for t in triplets:
        row={'rCandidateId':t['bands']['r']['candidateId'],'fieldKey':KEY,'anchorTargetXY':t['bands']['r']['targetXY'],'bands':{}}
        for b in BANDS:
            rec=t['bands'][b];frame,flags,camera=group[b];x,y=rec['nativeXY']
            with np.load(ROOT/rec['saved']['path'],allow_pickle=False) as z:a={k:z[k] for k in z.files}
            kernel=psfield.reconstruct(b,x,y);assert kernel.sum()>0;model=ImagePSF(kernel/kernel.sum(),flux=1,x_0=0,y_0=0,origin=(25,25),oversampling=1,fill_value=np.nan)
            template=model(a['dx'],a['dy']);use=a['admitted']&(a['radius']<=12)
            fitted=linear.weighted_model_fit(a['data'],template,a['dx'],a['dy'],a['variance'],use)
            m={'detection':rec,'fitStatus':'UNAVAILABLE_SUPPORT_OR_RANK'};saved={'kernel':kernel,'template':template,'fit_mask':use}
            if fitted is not None:
                coeff,pred,resid,stats=fitted;m.update(fixedCoefficients=coeff.tolist(),fixedStats=stats)
                if coeff[0]<=0:m['fitStatus']='NONPOSITIVE_DIAGNOSTIC_AMPLITUDE'
                else:
                    fitter=TRFLSQFitter();fit=fitter(centering.initialize(kernel,coeff),a['dx'][use],a['dy'][use],a['data'][use],weights=1/np.sqrt(a['variance'][use]),maxiter=100)
                    info=fitter.fit_info;pred=fit(a['dx'],a['dy']);resid=a['data']-pred;xy=[float(fit.x_0_0.value),float(fit.y_0_0.value)]
                    m.update({'fitStatus':'CONDITIONAL_DIAGNOSTIC' if info['success'] else 'FAILED_OPTIMIZER','parameters':fit.parameters.tolist(),'parameterNames':list(fit.param_names),'relativeNativeCenterXY':xy,
                        'centerAtBounds':any(abs(v)>=.499999 for v in xy),'conditionalChiSquarePerDof':float(np.square(resid[use]/np.sqrt(a['variance'][use])).sum()/(use.sum()-6)),
                        'optimizer':{'success':bool(info['success']),'nfev':int(info['nfev'])}})
                    saved.update(model=pred,residual=resid,parameters=fit.parameters)
            p=OUT/(rec['candidateId']+'-psf.npz');np.savez_compressed(p,**saved);m['saved']=bind(p);row['bands'][b]=m
        fits.append(row);save(OUT/f'fit-progress-{len(fits):03}.json',row)
    # Every associated candidate is displayed in bounded pages, including
    # elongated/blended/failed/bound-centre cases. No chosen good-star subset.
    images=[]
    for start in range(0,len(fits),12):
        page=fits[start:start+12];sheet=Image.new('RGB',(738,120*len(page)),(20,20,20));draw=ImageDraw.Draw(sheet)
        for index,row in enumerate(page):
            draw.text((2,index*120+2),row['rCandidateId']+' native g/r/i | PSF+plane | residual',fill='white')
            for at,b in enumerate(BANDS):
                with np.load(ROOT/row['bands'][b]['detection']['saved']['path'],allow_pickle=False) as z:data=np.array(z['data'])
                with np.load(ROOT/row['bands'][b]['saved']['path'],allow_pickle=False) as z:values={k:z[k] for k in z.files}
                low,high=np.percentile(data,[5,99]);scale=max(float(high-low),1e-12)
                for col,(name,plane) in enumerate((('native',data),('model',values.get('model')),('residual',values.get('residual')))):
                    if plane is None:continue
                    gray=np.clip((plane-low)/scale if col<2 else .5+plane/scale,0,1)
                    sheet.paste(Image.fromarray(np.rint(gray*255).astype(np.uint8)).resize((82,82),Image.Resampling.NEAREST),(col*246+at*82,index*120+24))
        p=OUT/f'actual-central-profiles-{start//12+1}.png';sheet.save(p);images.append(bind(p))
    assert triplets,'no_actual_central_correspondence';after=[bind(ROOT/v['path']) for v in before];assert before==after;save(OUT/'inputs-after.json',after)
    for item in cp['currentSources']+cp['protected']+cp['evidence']:assert bind(ROOT/item['path'])==item
    report={'scope':__doc__,'checkpoint':pin(cp_path),'scienceCandidate':pin(science_path),'currentCandidate':pin(full_path),'fieldKey':KEY,'fields':results,'triplets':triplets,'associationReasons':association_reasons,'fits':fits,'tripletCount':len(triplets),'actualComparisons':images,
        'elapsedSeconds':time.perf_counter()-started,'cpuSeconds':time.process_time()-cpu,'memory':resources.memory(),'photutils':photutils.__version__,
        'policy':'Cached native conditional variance in128-row chunks; one target-center PSF Gaussian core initialization per band; DAO defaults/5*conditional RMS with full detector footprint admission/no n_brightest cap/no new sky subtraction; all target native cuts saved. Same-field reciprocal unique band association <=2.5 target pixels, radius12 full native eligibility. Existing ImagePSF local amplitude/plane/centroid diagnostics, +/-0.5 native center/max100 evaluations, no sweep.',
        'limits':['Anonymous compact candidates may be galaxy structure/blends/artifacts, not catalogue stars or empirical PSF truth.',
            'Conditional diagonal native variance and local nuisance fits omit sky/PSF/model/systematic/blend covariance.',
            'Native PSF model/primary TAN coordinate correspondence does not validate projected/coadded target response, nonlinear adaptive response or absolute registration.',
            'Failed/bound/elongated/weak candidate cases stay recorded; detection policy is not calibrated completeness or false discovery.'],
        'inputsExact':True,'oldSourcesExact':len(cp['currentSources']),'oldEvidenceExact':len(cp['evidence']),'protectedExact':6,'sourceRequests':0,'catalogQueries':0,'nativeFlagsRebuilt':0,'detectorRuns':0,'nativeVarianceReplays':0,'savedDetectorParent':bind(DETECTOR/'executed-script.py'),'wholeFilterCoaddRuns':0,'scienceOrDisplayCorrections':'NONE','productionChanges':'NONE','quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    save(OUT/'result.json',report)
    print(json.dumps({k:report[k] for k in ('tripletCount','associationReasons','elapsedSeconds','memory')}),flush=True)

if __name__=='__main__':
    try:main()
    except Exception as e:
        if OUT.exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e),'scienceOrCandidateChanges':False})
        raise
