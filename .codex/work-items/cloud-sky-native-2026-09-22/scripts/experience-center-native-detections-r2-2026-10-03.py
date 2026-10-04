"""New centre-field image candidates, not catalog/PSF truth or image repair."""
from pathlib import Path
import hashlib
import inspect
import json
import sys
import time

ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
TOOLS=ROOT/'output/sdss-psf-tools-1003-r1/python-deps'
sys.path[:0]=[str(TOOLS),str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
import photutils
from scipy.ndimage import binary_erosion
from photutils.detection import DAOStarFinder
from photutils.psf import fit_fwhm,CircularGaussianPRF
from PIL import Image,ImageDraw
from sdss_corrected_frame import read_cached_frame
from sdss_frame_quality import read_cached_psfield,read_cached_fpm,check_frame_quality
from sdss_frame_noise import read_cached_field_noise,native_noise_samples
from sdss_gri_tan import target_tan

BANDS=('g','r','i');FIELDS=('301/3699/6/100','301/3716/6/117')
OUT=ROOT/'output/center-native-detections-1003-r2'
paths=[Path(__file__)]
def bind(p):
    raw=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
def doc(p,pin=None):
    v=bind(p)
    if pin:assert v['sha256']==pin
    paths.append(p);return json.loads(p.read_bytes())
def save(p,v):
    with p.open('x',encoding='utf-8') as f:json.dump(v,f,indent=2,allow_nan=False);f.write('\n')
def finite_number(v):return float(v) if np.isfinite(v) else None

def main():
    OUT.mkdir(exist_ok=False);started=time.perf_counter()
    c=doc(ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json','73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52')
    q=doc(ROOT/'output/sdss-m51-mosaic-quality-diagnosis-1002-r3/result.json','9322203537531e0cba3fbf9addcd3ea6e19fd75fdfeb2dc57637bd2d42bee4d0')
    current=doc(ROOT/'output/shared-adaptive-flag-recovery-1003-r2/candidate/candidate.json','e3f8f732ed0fda1121ac38aec2cae9ad57521c3d2807b3d985955f64e5548235')
    for m in current['levels'].values():
        p=ROOT/'output/shared-adaptive-flag-recovery-1003-r2/candidate'/m['file']
        assert bind(p)['sha256']==m['sha256'];paths.append(p)
    cas=ROOT/'output/sdss-m51-field-quality-1002-r3'
    receipt=doc(cas/'receipt.json');paths.append(cas/'response.csv')
    assert bind(cas/'response.csv')['sha256']==receipt['sha256']
    for n in ('sdss_corrected_frame.py','sdss_frame_quality.py','sdss_frame_noise.py','sdss_source_stencil.py','sdss_gri_tan.py'):
        paths.append(ROOT/'data-pipelines/deep-sky'/n)
    paths.extend([Path(inspect.getfile(DAOStarFinder)),Path(inspect.getfile(fit_fwhm)),
                  TOOLS/'photutils-3.0.0.dist-info/METADATA',TOOLS/'scipy-1.17.1.dist-info/METADATA'])
    protected=doc(TASK/'tmp/resume-preserved-hashes-2026-10-01.json')
    for v in protected:
        p=ROOT/v['path'];assert bind(p)['sha256']==v['sha256'];paths.append(p)
    # A known numeric detector control, never a generated astronomical input.
    yy,xx=np.mgrid[:51,:51]
    control=CircularGaussianPRF(x_0=25,y_0=25,fwhm=3.123,flux=100)(xx,yy)
    width=fit_fwhm(control,xypos=[(25,25)],fit_shape=11)
    assert abs(float(width[0])-3.123)<1e-6
    table=DAOStarFinder(1.,float(width[0]),exclude_border=True)(control)
    assert table is not None and len(table)==1 and abs(float(table['x_centroid'][0])-25)<.01
    target=target_tan(c['center'],c['pixels'],c['fieldDegrees'])
    groups={}
    for key in FIELDS:
        f=next(v for v in c['mosaic']['fields'] if v['fieldKey']==key)
        fq=next(v for v in q['fields'] if v['fieldKey']==key)
        ps=fq['psfSource'];p=ROOT/ps['path'];paths.append(p);assert bind(p)['sha256']==ps['sha256']
        identity=f['perBand']['g']['sourceReceipt']['identity']
        base=f'https://data.sdss.org/sas/dr17/eboss/photo/redux/301/{identity["run"]}/objcs/6/'
        psfield=read_cached_psfield(p,identity|{'sourceUrl':base+p.name,'bytes':ps['bytes'],'sha256':ps['sha256']},max_uncompressed_bytes=4*1024*1024)
        bands={}
        for b in BANDS:
            original=f['perBand'][b]['sourceReceipt'];s=original['source'];p=Path(s['path']);paths.append(p)
            frame=read_cached_frame(p,original['identity']|{k:s[k] for k in ('bytes','sha256','sourceUrl')},max_uncompressed_bytes=32*1024*1024)
            assert frame.receipt==original
            m=fq['bands'][b]['maskSource'];mp=ROOT/m['path'];paths.append(mp)
            flags=read_cached_fpm(mp,original['identity']|{'sourceUrl':base+mp.name,'bytes':m['bytes'],'sha256':m['sha256']},max_uncompressed_bytes=16*1024*1024)
            assert check_frame_quality(frame,psfield,flags)['processingIdentity']=='MATCH'
            camera=read_cached_field_noise(cas/'response.csv',receipt,original['identity'])
            bands[b]=(frame,flags,camera)
        groups[key]=(psfield,bands)
    before=[bind(p) for p in paths];save(OUT/'inputs-before.json',before)
    (OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    results={};triplets=[]
    for key,(psfield,bands) in groups.items():
        field_result={}
        for b,(frame,flags,camera) in bands.items():
            shape=frame.data.shape;h,w=shape
            # Bounded exact native variance evaluation; never alter science.
            variance=np.full(shape,np.nan);available=np.zeros(shape,bool)
            for start in range(0,h,128):
                y,x=np.mgrid[start:min(start+128,h),0:w]
                noise=native_noise_samples(frame,camera,x,y)
                variance[start:start+len(y)]=noise.variance_nmgy_squared
                available[start:start+len(y)]=noise.available
            eligible=available&np.isfinite(frame.data)&np.isfinite(variance)&(variance>0)&((flags.flags&771)==0)
            mx,my=frame.wcs.all_world2pix(c['center']['raDeg'],c['center']['decDeg'],0)
            target_center_native=[float(mx),float(my)]
            target_center_inside=bool(0<=mx<w and 0<=my<h)
            mx,my=(w-1)/2,(h-1)/2
            kernel=psfield.reconstruct(b,float(mx),float(my));assert np.isfinite(kernel).all() and kernel.sum()>0
            # Approximate model-core width for detection initialization only,
            # not a measured/native/target FWHM or matching target.
            fitted_width=float(fit_fwhm(kernel,xypos=[(25,25)],fit_shape=11)[0])
            assert np.isfinite(fitted_width) and 0<fitted_width<51
            threshold=np.where(eligible,5*np.sqrt(variance),np.inf)
            finder=DAOStarFinder(threshold,fitted_width,exclude_border=True,n_brightest=None)
            support=np.ones(finder.kernel.data.shape,bool)
            admitted=binary_erosion(eligible,structure=support,border_value=0)
            # Unavailable cells are zero only in a detector work buffer.
            # Eroded admission prohibits candidates whose kernel touches them.
            work=np.where(np.isfinite(frame.data),frame.data,0)
            detections=finder(work,mask=~admitted)
            records=[];outside=0;cut_unavailable=0
            for row in ([] if detections is None else detections):
                x,y=float(row['x_centroid']),float(row['y_centroid'])
                ra,dec=frame.wcs.all_pix2world(x,y,0);tx,ty=target.all_world2pix(ra,dec,0);ty=c['pixels']-1-ty
                if not (0<=tx<c['pixels'] and 0<=ty<c['pixels']):outside+=1;continue
                xc,yc=int(np.rint(x)),int(np.rint(y));rr=20
                if not(rr<=xc<w-rr and rr<=yc<h-rr):cut_unavailable+=1;continue
                reg=(slice(yc-rr,yc+rr+1),slice(xc-rr,xc+rr+1))
                gy,gx=np.mgrid[yc-rr:yc+rr+1,xc-rr:xc+rr+1]
                rad=np.hypot(gx-x,gy-y);clean=eligible[reg]
                qualified=bool(clean[rad<=12].all())
                label=f'{key.replace("/","-")}-{b}-{int(row["id"])}'
                p=OUT/(label+'.npz')
                np.savez_compressed(p,data=frame.data[reg],variance=variance[reg],flags=flags.flags[reg],
                                    admitted=clean,dx=gx-x,dy=gy-y,radius=rad)
                records.append({'candidateId':label,'detectorId':int(row['id']),
                    'nativeColumnRow':[x,y],'sourcePrimaryIcrsApprox':[float(ra),float(dec)],
                    'targetColumnRow':[float(tx),float(ty)],'radius12FullyNativeQualified':qualified,
                    'nativeCutBoundsXYExclusive':[xc-rr,yc-rr,xc+rr+1,yc+rr+1],
                    'detectorDiagnostics':{k:finite_number(row[k]) for k in ('sharpness','roundness1','roundness2','peak','flux')},
                    'saved':bind(p)})
            field_result[b]={'targetCenterNativeColumnRow':target_center_native,'targetCenterInsideNativeFrame':target_center_inside,
                'referenceNativeColumnRow':[float(mx),float(my)],'modelCoreGaussianWidthForDetection':fitted_width,
                'detectorKernelShape':list(support.shape),'nativeShape':list(shape),
                'allDetectorCandidates':0 if detections is None else len(detections),
                'outsideTarget':outside,'cutOutOfBounds':cut_unavailable,'insideTargetSaved':len(records),
                'fullyQualifiedRadius12':sum(r['radius12FullyNativeQualified'] for r in records),'records':records}
            save(OUT/(key.replace('/','-')+'-'+b+'-detections.json'),field_result[b])
            print(json.dumps({'field':key,'band':b,'detections':field_result[b]['allDetectorCandidates'],
                              'inside':len(records),'qualified':field_result[b]['fullyQualifiedRadius12']}),flush=True)
            del variance,available,eligible,admitted,work,threshold
        # Associate provisional detections in the same target coordinate plane.
        # A 2.5-target-pixel window (~1 arcsec) is diagnostic, not astrometry.
        for r in field_result['r']['records']:
            if not r['radius12FullyNativeQualified']:continue
            matches={'r':r};separations={};unique=True
            for b in ('g','i'):
                choices=[]
                for v in field_result[b]['records']:
                    if not v['radius12FullyNativeQualified']:continue
                    distance=float(np.linalg.norm(np.array(v['targetColumnRow'])-r['targetColumnRow']))
                    if distance<=2.5:choices.append((distance,v))
                if len(choices)!=1:unique=False;break
                distance,v=choices[0]
                reverse=[z for z in field_result['r']['records'] if z['radius12FullyNativeQualified'] and
                    np.linalg.norm(np.array(z['targetColumnRow'])-v['targetColumnRow'])<=2.5]
                if len(reverse)!=1:unique=False;break
                matches[b]=v;separations[b]=distance
            if unique:triplets.append({'fieldKey':key,'bands':matches,'targetSeparationFromR':separations,
                                      'classification':'PROVISIONAL_COMPACT_IMAGE_CANDIDATE_NOT_CATALOG_STAR'})
        results[key]=field_result
    after=[bind(p) for p in paths];assert before==after;save(OUT/'inputs-after.json',after)
    # One actual cut sheet for every uniquely associated candidate, no chosen
    # image subset or brightness recoding of the saved science samples.
    sheet=Image.new('RGB',(3*180,max(1,len(triplets))*210),'#181818');draw=ImageDraw.Draw(sheet)
    for i,t in enumerate(triplets):
        draw.text((3,i*210+3),t['fieldKey']+' / '+t['bands']['r']['candidateId'].split('-')[-1],fill='white')
        for at,b in enumerate(BANDS):
            v=np.load(ROOT/t['bands'][b]['saved']['path'],allow_pickle=False)['data']
            low=float(np.percentile(v,5));high=float(np.percentile(v,99));scale=max(high-low,1e-12)
            gray=np.rint(np.clip((v-low)/scale,0,1)*255).astype(np.uint8)
            sheet.paste(Image.fromarray(gray).resize((164,164),Image.Resampling.NEAREST),(at*180+4,i*210+32))
            draw.text((at*180+4,i*210+18),b,fill='white')
    sheet.save(OUT/'actual-center-native-cuts.png')
    report={'fields':results,'commonTriplets':triplets,'tripletCount':len(triplets),
        'currentDisplayCandidate':bind(ROOT/'output/shared-adaptive-flag-recovery-1003-r2/candidate/candidate.json'),
        'actualNativeCuts':bind(OUT/'actual-center-native-cuts.png'),'inputsExact':True,
        'photutils':photutils.__version__,'elapsedSeconds':time.perf_counter()-started,
        'sourceRequests':0,'catalogQueries':0,'imageProcessingCorrections':'NONE',
        'policy':'One model-core Gaussian initialization at the actual native frame centre per catalogue-empty field/band, DAO defaults/5 times native conditional RMS map, full detector footprint admission; all target candidates saved, no n_brightest cap. No new sky subtraction. Same-field cross-band unique provisional association within2.5 target pixels and radius12 native support.',
        'limits':['Detection threshold is a conditional diagnostic, not calibrated completeness/false discovery or classification.',
                  'Catalogue-empty field image candidates can be compact galaxy structure, blends or artifacts; morphology alone does not certify stars/PSF.',
                  'Same source primary TAN coordinates are not independent absolute truth; no global shift/full DCR or target coadd PSF certification.',
                  'Science/saved display/coverage/recipe unchanged; no repeating the old catalogue or45 old fits.'],
        'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    save(OUT/'result.json',report)
    print(json.dumps({'result':bind(OUT/'result.json'),'tripletCount':len(triplets),'elapsedSeconds':report['elapsedSeconds']}),flush=True)

if __name__=='__main__':
    try:main()
    except Exception as error:
        if OUT.exists():save(OUT/'failed.json',{'type':type(error).__name__,'error':str(error),'scienceOrCandidateChanges':False})
        raise
