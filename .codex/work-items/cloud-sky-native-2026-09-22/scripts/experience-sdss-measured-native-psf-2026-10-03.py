"""Actual native samples versus position-dependent saved PSF models.

Diagnostic fits only. No scientific correction, matching kernel, global
background subtraction, whole filter, catalogue query or source acquisition.
"""
import copy,json,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True;sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image,ImageDraw
from image_quality import digest,write_report
from sdss_corrected_frame import read_cached_frame
from sdss_frame_quality import read_cached_psfield,read_cached_fpm,check_frame_quality
from sdss_frame_noise import read_cached_field_noise,native_noise_samples
from sdss_source_stencil import bilinear_source_samples

BANDS=('g','r','i');CUT_RADIUS=20;FIT_RADIUS=12
def bind(p):
    data=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':digest(data)}
def weighted_model_fit(data,template,dx,dy,variance,usable):
    if not usable.any():return None
    design=np.stack((template,np.ones(data.shape),dx,dy),axis=-1)
    scale=np.sqrt(variance[usable]);x=design[usable]/scale[:,None];y=data[usable].astype(float)/scale
    coefficients,_,rank,singular=np.linalg.lstsq(x,y,rcond=None)
    if rank!=4 or len(y)<=4:return None
    model=np.einsum('ijk,k->ij',design,coefficients);residual=data.astype(float)-model
    return coefficients,model,residual,{'rank':int(rank),'support':len(y),'dof':len(y)-4,
        'conditionalChiSquarePerDof':float(np.square(residual[usable]/scale).sum()/(len(y)-4)),
        'designSingularValues':singular.tolist()}

def main():
    out=ROOT/'output/sdss-measured-native-psf-1003-r1';assert not out.exists();started=time.perf_counter();paths=[Path(__file__)]
    def doc(path,pin=None):
        if pin:assert bind(path)['sha256']==pin
        paths.append(path);return json.loads(path.read_bytes())
    c=doc(ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json','73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52')
    q=doc(ROOT/'output/sdss-m51-mosaic-quality-diagnosis-1002-r3/result.json','9322203537531e0cba3fbf9addcd3ea6e19fd75fdfeb2dc57637bd2d42bee4d0')
    old=doc(ROOT/'output/sdss-measured-registration-1003-r1/result.json','2b1d33729c1d10550860bc67cc146d1fa464858ea0ac68b0962e88606862371d')
    current=doc(ROOT/'output/shared-adaptive-flag-recovery-1003-r2/candidate/candidate.json','e3f8f732ed0fda1121ac38aec2cae9ad57521c3d2807b3d985955f64e5548235')
    # Current candidate's byte identity ties the investigation to its parent;
    # observed samples themselves come from original native frames, never RGB.
    for m in current['levels'].values():
        path=ROOT/'output/shared-adaptive-flag-recovery-1003-r2/candidate'/m['file'];assert bind(path)['sha256']==m['sha256'];paths.append(path)
    selected=[r for r in old['records'] if 'savedPatch' in r];assert len(selected)==15
    cas=ROOT/'output/sdss-m51-field-quality-1002-r3';receipt=doc(cas/'receipt.json');paths.append(cas/'response.csv')
    assert bind(cas/'response.csv')['sha256']==receipt['sha256']
    owners=[ROOT/'data-pipelines/deep-sky'/name for name in ('sdss_corrected_frame.py','sdss_frame_quality.py','sdss_frame_noise.py','sdss_source_stencil.py')];paths.extend(owners)
    inputs={}
    for r in selected:
        key=f'301/{r["run"]}/6/{r["field"]}'
        if key in inputs:continue
        f=next(f for f in c['mosaic']['fields'] if f['fieldKey']==key);fq=next(f for f in q['fields'] if f['fieldKey']==key)
        ps=fq['psfSource'];path=ROOT/ps['path'];assert bind(path)['sha256']==ps['sha256'];paths.append(path)
        i=f['perBand']['g']['sourceReceipt']['identity'];url=f'https://data.sdss.org/sas/dr17/eboss/photo/redux/301/{i["run"]}/objcs/6/{path.name}'
        psfield=read_cached_psfield(path,i|{'sourceUrl':url,'bytes':ps['bytes'],'sha256':ps['sha256']},max_uncompressed_bytes=4*1024*1024)
        group={}
        for b in BANDS:
            original=f['perBand'][b]['sourceReceipt'];s=original['source'];path=Path(s['path']);paths.append(path)
            frame=read_cached_frame(path,original['identity']|{k:s[k] for k in ('bytes','sha256','sourceUrl')},max_uncompressed_bytes=32*1024*1024)
            assert frame.receipt==original
            mask=fq['bands'][b]['maskSource'];mp=ROOT/mask['path'];paths.append(mp)
            url=f'https://data.sdss.org/sas/dr17/eboss/photo/redux/301/{i["run"]}/objcs/6/{mp.name}'
            flags=read_cached_fpm(mp,original['identity']|{'sourceUrl':url,'bytes':mask['bytes'],'sha256':mask['sha256']},max_uncompressed_bytes=16*1024*1024)
            association=check_frame_quality(frame,psfield,flags);assert association['processingIdentity']=='MATCH'
            camera=read_cached_field_noise(cas/'response.csv',receipt,original['identity'])
            group[b]=(frame,flags,camera,association)
        inputs[key]=(psfield,group)
    for r in json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes()):
        path=ROOT/r['path'];assert bind(path)['sha256']==r['sha256'];paths.append(path)
    before=[bind(p) for p in paths];out.mkdir();write_report(out/'inputs-before.json',before)
    (out/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    records=[];sheet=Image.new('RGB',(3*246,len(selected)*142),'#181818');draw=ImageDraw.Draw(sheet)
    for index,r in enumerate(selected):
        key=f'301/{r["run"]}/6/{r["field"]}';psfield,group=inputs[key];row={'objID':r['objID'],'run':r['run'],'field':r['field'],'targetColumnRow':r['targetColumnRow'],'bands':{}}
        for at,b in enumerate(BANDS):
            frame,flags,camera,association=group[b]
            x,y=np.array(r['bands'][b]['catalogColumnRow'])-.5;xc,yc=int(np.rint(x)),int(np.rint(y));rr=CUT_RADIUS
            xx,yy=np.meshgrid(np.arange(xc-rr,xc+rr+1),np.arange(yc-rr,yc+rr+1));assert np.all((xx>=0)&(xx<frame.data.shape[1])&(yy>=0)&(yy<frame.data.shape[0]))
            dx,dy=xx-x,yy-y;radius=np.hypot(dx,dy);data=frame.data[yy,xx];flag=flags.flags[yy,xx]
            kernel=psfield.kernel(b,float(x),float(y));assert np.isfinite(kernel).all() and kernel.sum()>0
            template,geometry,finite=bilinear_source_samples(kernel/kernel.sum(),dx+25,dy+25);assert geometry.all() and finite.all()
            noise=native_noise_samples(frame,camera,xx,yy);reject=(flag&771)!=0
            admitted=np.isfinite(data)&noise.available&(noise.variance_nmgy_squared>0)&~reject
            fit_mask=admitted&(radius<=FIT_RADIUS);result=weighted_model_fit(data,template,dx,dy,noise.variance_nmgy_squared,fit_mask)
            metadata={'catalogNativeColumnRow':[float(x),float(y)],'nativeCutBoundsXYExclusive':[xc-rr,yc-rr,xc+rr+1,yc+rr+1],
                'psfSource':q['fields'][next(i for i,f in enumerate(q['fields']) if f['fieldKey']==key)]['psfSource'],
                'association':association,'psfStatus':psfield.receipt['psf']['status'],'kernelSignedSum':float(kernel.sum()),
                'kernelNegativePixels':int((kernel<0).sum()),'supportPolicy':'Native finite/positive conditional variance; actual INTERP/SATUR/GHOST/CR excluded. No filled or renormalized missing science.',
                'fitExcludedPixels':int(((radius<=FIT_RADIUS)&~admitted).sum()),'coreRadius3Excluded':int(((radius<=3)&~admitted).sum()),
                'templateSampling':'Existing four-neighbour bilinear sampler from signed relative51 kernel normalized by total, at measured fractional native center; interpolation/model errors remain.'}
            saved={'data':data,'template':template,'kernel':kernel,'variance':noise.variance_nmgy_squared,'flags':flag,
                'fit_mask':fit_mask,'admitted':admitted,'dx':dx,'dy':dy,'radius':radius}
            if result is None:metadata.update({'fitStatus':'UNAVAILABLE_RANK_OR_SUPPORT','parameters':None})
            else:
                coefficients,model,residual,fit_stats=result;saved.update({'model':model,'residual':residual})
                metadata.update({'fitStatus':'CONDITIONAL_LINEAR_DIAGNOSTIC','parameters':coefficients.tolist(),'fitStats':fit_stats,
                    'parametersMeaning':'Relative PSF amplitude + diagnostic local constant/x/y plane in native nMgy samples; not scientific sky correction/photometry/PSF quality.'})
                metadata['annuli']=[]
                for low,high in ((0,3),(3,6),(6,9),(9,12)):
                    use=admitted&(radius>low)&(radius<=high);metadata['annuli'].append({'radiiNativePixels':[low,high],
                       'count':int(use.sum()),'residualSignedSum':float(residual[use].sum()),
                       'modelStarSignedSum':float((template*coefficients[0])[use].sum()),
                       'observedMinusFittedPlaneSignedSum':float((data-coefficients[1]-coefficients[2]*dx-coefficients[3]*dy)[use].sum()),
                       'conditionalNativeVarianceSum':float(noise.variance_nmgy_squared[use].sum()),
                       'meaning':'Model/fit/sky/contaminant covariance omitted; not an uncertainty or source-color verdict.'})
                maximum=float(np.percentile(data[fit_mask],99));minimum=float(np.percentile(data[fit_mask],5));scale=max(maximum-minimum,1e-12)
                for col,(label,v) in enumerate((('native',data),('PSF+plane model',model),('residual',residual))):
                    gray=np.clip((v-minimum)/scale if col<2 else .5+v/scale,0,1);image=Image.fromarray(np.rint(gray*255).astype(np.uint8))
                    sheet.paste(image.resize((82,82),Image.Resampling.NEAREST),(col*246+at*82,index*142+44))
                    if at==0:draw.text((col*246+2,index*142+3),r['objID']+' '+label,fill='white')
            path=out/f'{r["objID"]}-{b}.npz';np.savez_compressed(path,**saved);metadata['saved']=bind(path);row['bands'][b]=metadata
            draw.text((at*82+2,index*142+28),b,fill='white')
        records.append(row)
    sheet.save(out/'actual-native-model-residuals.png')
    after=[bind(p) for p in paths];assert before==after;write_report(out/'inputs-after.json',after)
    report={'status':'COMPLETED_ACTUAL_NATIVE_PSF_CORRESPONDENCE_DIAGNOSTIC','records':records,'actualDetections':len(records),
      'distinctFields':list(inputs),'currentDisplayCandidate':bind(ROOT/'output/shared-adaptive-flag-recovery-1003-r2/candidate/candidate.json'),
      'actualComparison':bind(out/'actual-native-model-residuals.png'),'inputsExact':True,'elapsedSeconds':time.perf_counter()-started,
      'sourceRequests':0,'catalogQueries':0,'wholeFilterRuns':0,'scientificCorrections':'NONE',
      'fitPolicy':{'nativeCutRadius':CUT_RADIUS,'fitRadius':FIT_RADIUS,'parameters':['relative PSF amplitude','constant','x plane','y plane'],'weightedLeastSquares':'NumPy linalg.lstsq, conditional diagonal native pixel model only'},
      'limitations':['Actual15 catalogue detections reuse earlier qualification; repeated sources/scans are not independent full-field coverage.',
       'No central3699/100 or3716/117 detections supplied; off-center profiles cannot validate central galaxy PSF/weak structure.',
       'Relative signed PSF model uses native pixel grid, not matched/reprojected/coadded target PSF.',
       'Fractional bilinear template adds interpolation error; centroids/PSF/SKY/model/systematics/blends omitted from conditional pixel variance.',
       'Local nuisance plane is fitted only for diagnostics; it is never subtracted from science, whole galaxy or candidate.',
       'Reduced conditional chi-square is descriptive, not calibrated PSF fit quality or acceptance.'],
      'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    write_report(out/'result.json',report)
    print(json.dumps({'result':bind(out/'result.json'),'actualDetections':15,'elapsedSeconds':report['elapsedSeconds'],
       'conditionalFits':sum(v['parameters'] is not None for r in records for v in r['bands'].values()),
       'conditionalChiSquarePerDof':{b:[v['bands'][b].get('fitStats',{}).get('conditionalChiSquarePerDof') for v in records] for b in BANDS}}))

if __name__=='__main__':
    try:main()
    except Exception as error:
        out=ROOT/'output/sdss-measured-native-psf-1003-r1'
        if out.exists():write_report(out/'failed.json',{'error':str(error),'type':type(error).__name__})
        raise
