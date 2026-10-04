"""All new compact candidates in the actual DETAIL crop versus native models."""
from pathlib import Path
import importlib.util
import json
import hashlib
import sys
import time

ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.path[:0]=[str(ROOT/'output/sdss-psf-tools-1003-r1/python-deps'),str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from photutils.psf import ImagePSF
from astropy.modeling.fitting import TRFLSQFitter
from PIL import Image,ImageDraw
from sdss_frame_quality import read_cached_psfield

OUT=ROOT/'output/detail-native-model-support-1003-r1'
def bind(p):
    raw=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
def save(p,v):
    with p.open('x',encoding='utf-8') as f:json.dump(v,f,indent=2,allow_nan=False);f.write('\n')

def main():
    OUT.mkdir(exist_ok=False);started=time.perf_counter()
    source=ROOT/'output/center-native-detections-1003-r2'
    rp=source/'result.json';assert bind(rp)['sha256']=='49077d1c2a10c2be4e69ae823c2f1d2370fc1758510153cd93f5bbe642456a6b'
    r=json.loads(rp.read_bytes());cpath=ROOT/'output/shared-adaptive-flag-recovery-1003-r2/candidate/candidate.json'
    assert bind(cpath)['sha256']=='e3f8f732ed0fda1121ac38aec2cae9ad57521c3d2807b3d985955f64e5548235'
    c=json.loads(cpath.read_bytes());bounds=c['levels']['DETAIL']['crop']['boundsXYExclusive']
    selected=[t for t in r['commonTriplets'] if bounds[0]<=t['bands']['r']['targetColumnRow'][0]<bounds[2] and
              bounds[1]<=t['bands']['r']['targetColumnRow'][1]<bounds[3]]
    assert len(selected)==87
    inputs=json.loads((source/'inputs-before.json').read_bytes());assert inputs==json.loads((source/'inputs-after.json').read_bytes())
    for v in inputs:assert bind(ROOT/v['path'])==v
    helper=TASK/'scripts/experience-sdss-imagepsf-centering-2026-10-03.py'
    spec=importlib.util.spec_from_file_location('saved_mature_center_model',helper)
    mature=importlib.util.module_from_spec(spec);spec.loader.exec_module(mature)
    qpath=ROOT/'output/sdss-m51-mosaic-quality-diagnosis-1002-r3/result.json'
    q=json.loads(qpath.read_bytes())
    master_path=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json'
    master=json.loads(master_path.read_bytes())
    paths=[Path(__file__),rp,cpath,source/'inputs-before.json',source/'inputs-after.json',helper,qpath,master_path]
    psfields={}
    for key in {t['fieldKey'] for t in selected}:
        f=next(f for f in master['mosaic']['fields'] if f['fieldKey']==key)
        fq=next(f for f in q['fields'] if f['fieldKey']==key);ps=fq['psfSource'];p=ROOT/ps['path'];paths.append(p)
        assert bind(p)['sha256']==ps['sha256']
        i=f['perBand']['g']['sourceReceipt']['identity'];url=f'https://data.sdss.org/sas/dr17/eboss/photo/redux/301/{i["run"]}/objcs/6/{p.name}'
        psfields[key]=read_cached_psfield(p,i|{'sourceUrl':url,'bytes':ps['bytes'],'sha256':ps['sha256']},max_uncompressed_bytes=4*1024*1024)
    for t in selected:
        for v in t['bands'].values():
            p=ROOT/v['saved']['path'];assert bind(p)==v['saved'];paths.append(p)
    before=[bind(p) for p in paths];save(OUT/'inputs-before.json',before)
    (OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes());(OUT/'mature-initialize-helper.py').write_bytes(helper.read_bytes())
    records=[];sheets=[];panel=None;draw=None
    for index,t in enumerate(selected):
        if index%16==0:
            panel=Image.new('RGB',(738,142*min(16,len(selected)-index)),'#181818');draw=ImageDraw.Draw(panel)
        record={'fieldKey':t['fieldKey'],'targetColumnRow':t['bands']['r']['targetColumnRow'],
                'classification':t['classification'],'bands':{}}
        for at,b in enumerate(('g','r','i')):
            m=t['bands'][b]
            with np.load(ROOT/m['saved']['path'],allow_pickle=False) as z:v={k:z[k] for k in z.files}
            use=v['admitted']&(v['radius']<=12);assert use[v['radius']<=12].all()
            kernel=psfields[t['fieldKey']].reconstruct(b,*m['nativeColumnRow']);assert kernel.sum()>0 and np.isfinite(kernel).all()
            template=ImagePSF(kernel/kernel.sum(),flux=1,x_0=0,y_0=0,origin=(25,25),oversampling=1,fill_value=np.nan)(v['dx'],v['dy'])
            design=np.stack((template,np.ones(template.shape),v['dx'],v['dy']),axis=-1)
            scale=np.sqrt(v['variance'][use]);coeff,_,rank,_=np.linalg.lstsq(design[use]/scale[:,None],v['data'][use]/scale,rcond=None)
            assert rank==4
            initial=coeff.copy();initial[0]=max(0,initial[0]);fitter=TRFLSQFitter()
            model=fitter(mature.initialize(kernel,initial),v['dx'][use],v['dy'][use],v['data'][use],weights=1/scale,maxiter=100)
            info=fitter.fit_info;predicted=model(v['dx'],v['dy']);residual=v['data'].astype(float)-predicted
            finite=bool(np.isfinite(predicted).all() and np.isfinite(model.parameters).all())
            center=[float(model.x_0_0.value),float(model.y_0_0.value)]
            n=int(use.sum());dof=n-6
            p=OUT/(m['candidateId']+'-model.npz')
            np.savez_compressed(p,kernel=kernel,template=template,coefficients=coeff,
                                model=predicted,residual=residual,parameters=model.parameters,fit_mask=use)
            rec={'candidateId':m['candidateId'],'source':m['saved'],'nativeColumnRow':m['nativeColumnRow'],
                'saved':bind(p),'support':n,'dof':dof,'parameters':model.parameters.tolist(),
                'parameterNames':list(model.param_names),'relativeNativeCenterXY':center,
                'centerAtBounds':any(abs(x)>=.499999 for x in center),
                'optimizer':{'success':bool(info['success']),'status':int(info['status']),'nfev':int(info['nfev'])},
                'finiteModel':finite,'conditionalChiSquarePerDof':float(np.square(residual[use]/scale).sum()/dof) if finite else None,
                'relativeAmplitudeMeaning':'Finite normalized signed PSF template plus local nuisance plane, not calibrated total flux or proof of star classification.'}
            record['bands'][b]=rec
            minimum=float(np.percentile(v['data'][use],5));maximum=float(np.percentile(v['data'][use],99));width=max(maximum-minimum,1e-12)
            row=index%16
            for column,(label,values) in enumerate((('native',v['data']),('position PSF+plane',predicted),('residual',residual))):
                gray=np.clip((values-minimum)/width if column<2 else .5+values/width,0,1)
                panel.paste(Image.fromarray(np.rint(gray*255).astype(np.uint8)).resize((82,82),Image.Resampling.NEAREST),
                            (column*246+at*82,row*142+44))
                if at==0:draw.text((column*246+2,row*142+3),str(index)+' '+label,fill='white')
            draw.text((at*82+2,row*142+28),b,fill='white')
        records.append(record)
        if index%16==15 or index==len(selected)-1:
            p=OUT/f'actual-native-model-residuals-{index//16+1}.png';panel.save(p);sheets.append(bind(p))
            print(json.dumps({'processedCandidates':index+1,'totalCandidates':len(selected)}),flush=True)
    after=[bind(p) for p in paths];assert before==after;save(OUT/'inputs-after.json',after)
    for v in inputs:assert bind(ROOT/v['path'])==v
    report={'candidateMaterial':bind(rp),'currentDisplayCandidate':bind(cpath),'actualDetailBoundsXYExclusive':bounds,
        'actualDetailCandidates':len(records),'records':records,'actualModelSheets':sheets,
        'successfulConditionalFits':sum(v['optimizer']['success'] and v['finiteModel'] for row in records for v in row['bands'].values()),
        'centerBoundFits':sum(v['centerAtBounds'] for row in records for v in row['bands'].values()),
        'elapsedSeconds':time.perf_counter()-started,'sourceRequests':0,'catalogQueries':0,
        'nativeFrameReads':0,'nativeFrameReprojections':0,'scientificCorrections':'NONE','wholeFilterRuns':0,
        'policy':'All newly detected unique compact image triplets in actual current DETAIL, no count cap. Original saved signed cut/noise/flags and per-position psField; reuse ImagePSF+Planar2D/TRF bounded six-parameter helper. No old45 fits or detector rerun.',
        'limits':['These image-selected candidates include extended galaxy structure or blends and are not certified stars.',
                  'More nuisance parameters/lower conditional chi-square do not establish PSF truth, photometry or uncertainty completeness.',
                  'Individual native PSF/sample correspondence does not supply the target coadd effective PSF, full DCR/absolute registration or a matching correction.',
                  'Any failed/nonfinite/center-bound fit remains explicit; no source/plane/WCS/image/alpha/recipe correction.'],
        'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    save(OUT/'result.json',report)
    print(json.dumps({'result':bind(OUT/'result.json'),'actualDetailCandidates':len(records),
                     'successfulConditionalFits':report['successfulConditionalFits'],'centerBoundFits':report['centerBoundFits'],
                     'elapsedSeconds':report['elapsedSeconds']}),flush=True)

if __name__=='__main__':
    try:main()
    except Exception as error:
        if OUT.exists():save(OUT/'failed.json',{'type':type(error).__name__,'error':str(error),'scienceOrCandidateChanges':False})
        raise
