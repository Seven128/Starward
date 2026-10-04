"""New bounded per-RUN comparison of saved real source and current noise-v2.

Same recorded residual/control coordinates, not a quality sample ceiling. Raw
source samples/flags/weights are reused, old noise eligibility is not. No native
read/projection, whole coadd, variance/PSF fit, recovery or tone trial repeated.
Per-RUN diagnostic means are neither a new scientific master nor background.
"""
from pathlib import Path
import sys,json,hashlib,time,copy,importlib.util
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True;sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from PIL import Image,ImageDraw
NATIVE=ROOT/'output/sdss-m82-visible-native-display-1004-r2'
CURRENT=ROOT/'output/sdss-m82-noise-v2-increment-1004-r1/candidate'
SCIENCE=ROOT/'output/sdss-m82-first-science-master-1004-r2/candidate'
OUT=ROOT/'output/sdss-m82-current-source-colour-1004-r1'
RUNS=(4264,4294)

def bind(p):
    p=Path(p);h=hashlib.sha256()
    with p.open('rb') as f:
        for part in iter(lambda:f.read(1048576),b''):h.update(part)
    return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}

def save(p,v):
    with Path(p).open('x',encoding='utf-8') as f:f.write(json.dumps(v,ensure_ascii=False,indent=2)+'\n')

def grouped(data,fields,shape):
    result={};field_keys=sorted({row['fieldKey'] for row in fields})
    for run in RUNS:
        run_keys=[key for key in field_keys if next(f['nativeReceipt']['identity']['run'] for f in fields if f['fieldKey']==key)==run]
        denominator=np.zeros(shape,'f8');numerator=np.zeros((3,*shape),'f8');flag_reject=np.zeros(shape,bool)
        for key in run_keys:
            prefix=key.replace('/','-');w=data[prefix+'-weight'].astype('f8');assert w.shape==shape and np.isfinite(w).all() and (w>=0).all()
            active=w>0;denominator+=w
            for at,b in enumerate('gri'):
                record=next(v for v in fields if v['fieldKey']==key and v['band']==b)
                assert record['nativeReceipt']['identity']['run']==run
                a=data[prefix+'-'+b+'-sample'];assert a.shape==shape and np.isfinite(a[active]).all()
                numerator[at]+=np.where(active,a,0).astype('f8')*w
                flag_reject|=data[prefix+'-'+b+'-reject']&active
        available=denominator>0;values=np.full((3,*shape),np.nan,'f8');values[:,available]=numerator[:,available]/denominator[available]
        result[run]={'values':values,'weights':denominator,'available':available,'nativeFlagReject':flag_reject,'fields':run_keys}
    return result

def stats(values,mask):
    a=values[mask]
    if not a.size:return {'pixels':0,'mean':None,'median':None,'min':None,'max':None,'rms':None,'negative':0}
    assert np.isfinite(a).all()
    return {'pixels':int(a.size),'mean':float(a.mean()),'median':float(np.median(a)),
            'min':float(a.min()),'max':float(a.max()),'rms':float(np.sqrt(np.mean(a*a))),'negative':int((a<0).sum())}

def signed_image(values,scale):
    known=np.isfinite(values);v=np.zeros(values.shape,'f8');v[known]=np.clip(values[known]/scale,-1,1)
    pos,neg=np.maximum(v,0),np.maximum(-v,0);rgb=np.rint(np.stack((255*pos,190*pos+120*neg,255*neg),axis=-1)).astype('u1');rgb[~known]=(255,0,255)
    return Image.fromarray(rgb)

def regression():
    # A zero-weight NaN field is absent, never a zero-valued observation.
    fields=[{'fieldKey':'301/4264/5/1','band':b,'nativeReceipt':{'identity':{'run':4264}}} for b in 'gri']
    data={'301-4264-5-1-weight':np.array([[1.,0.]])}
    for b in 'gri':data['301-4264-5-1-'+b+'-sample']=np.array([[2.,np.nan]]);data['301-4264-5-1-'+b+'-reject']=np.array([[False,True]])
    out=grouped(data,fields,(1,2));assert np.array_equal(out[4264]['available'],[[True,False]])
    assert np.isnan(out[4294]['values']).all() and not out[4294]['available'].any() and not out[4264]['nativeFlagReject'].any()
    data['301-4264-5-1-i-sample'][0,0]=np.nan
    try:grouped(data,fields,(1,2))
    except AssertionError:pass
    else:raise AssertionError('Positive-weight nonfinite source admitted')
    return {'zeroWeightNonfiniteAbsentNotBlack':True,'missingRunNotZeroOrComparison':True,'activeNonfiniteRejected':True}

def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes());started,cpu=time.perf_counter(),time.process_time();pins={}
    def pin(p,expected=None):
        value=bind(p)
        if expected is not None:assert value==expected,value['path']
        assert pins.setdefault(value['path'],value)==value;return value
    def doc(p):pin(p);return json.loads(p.read_bytes())
    checkpoint=TASK/'evidence/current-execution-state-2026-10-04-r103.json';cp=doc(checkpoint)
    assert bind(checkpoint)['sha256']=='10c1df67bb329141c2d92754d1513828f345e322fc64a373a6de8aa3e52fc867'
    for row in cp['currentSources']+cp['protected']+cp['evidence']:assert bind(ROOT/row['path'])==row
    for p in (Path(__file__),TASK/'scripts/experience-shared-noise-display-2026-10-03.py',ROOT/'data-pipelines/deep-sky/sdss_noise_model_increment.py'):pin(p)
    native,current,science=doc(NATIVE/'result.json'),doc(CURRENT/'candidate.json'),doc(SCIENCE/'candidate.json')
    maps={k:np.load(CURRENT/current['arrays'][k]['file'],mmap_mode='r',allow_pickle=False) for k in ('qualified','protected','radius','reached','requested','changed')}
    estimates={b:np.load(CURRENT/current['arrays'][b]['file'],mmap_mode='r',allow_pickle=False) for b in 'gri'}
    for meta in current['arrays'].values():
        row=pin(CURRENT/meta['file']);assert (row['bytes'],row['sha256'])==(meta['bytes'],meta['sha256'])
    sci={b:np.load(SCIENCE/science['arrays'][b+'-science']['file'],mmap_mode='r',allow_pickle=False) for b in 'gri'}
    for b in 'gri':pin(SCIENCE/science['arrays'][b+'-science']['file'])
    reg=regression();rows=[];images=[]
    for entry in native['records']:
        name=entry['name'];x0,y0,x1,y1=entry['boundsXYExclusive'];region=np.s_[y0:y1,x0:x1];shape=(y1-y0,x1-x0)
        raw_path=NATIVE/(name+'-native-stage.npz');pin(raw_path);metadata=doc(NATIVE/(name+'-native-stage.json'))
        assert metadata['fields']==entry['fields'] and metadata['boundsXYExclusive']==entry['boundsXYExclusive']
        with np.load(raw_path,allow_pickle=False) as source:
            data={key:source[key] for key in source.files if key.endswith(('-weight','-sample','-reject'))}
            fields=grouped(data,metadata['fields'],shape)
            original=np.stack([sci[b][region] for b in 'gri']);display=np.stack([estimates[b][region] for b in 'gri'])
            for at,b in enumerate('gri'):assert np.array_equal(source['science-'+b],original[at])
            legacy_q=source['qualified'];legacy_protected=source['protected']
        diagnostics={k:a[region].copy() for k,a in maps.items()};q=diagnostics['qualified'];protected=diagnostics['protected'];radius=diagnostics['radius']
        assert not (protected&~q).any() and not (diagnostics['reached']&(radius<=0)).any()
        both=fields[4264]['available']&fields[4294]['available'];clean=both&~fields[4264]['nativeFlagReject']&~fields[4294]['nativeFlagReject']
        delta=fields[4294]['values']-fields[4264]['values'];error=display.astype('f8')-original
        # r feeds the RGB green channel; this descriptive dominance is not a
        # sky/background mask or a significance/artifact classification.
        green_science=original[1]>np.maximum(original[0],original[2]);green_current=display[1]>np.maximum(display[0],display[2])
        masks={'ALL':np.ones(shape,bool),'CURRENT_UNQUALIFIED':~q,'CURRENT_PROTECTED':protected,
            'CURRENT_NONPROTECTED':~protected,'CURRENT_NONPROTECTED_RADIUS8':~protected&(radius==8),
            'CURRENT_NONPROTECTED_NOT_REACHED':q&~protected&~diagnostics['reached'],
            'CURRENT_NONPROTECTED_NOT_REACHED_RADIUS8':q&~protected&~diagnostics['reached']&(radius==8),
            'CURRENT_GREEN_DOMINANT':green_current,'CURRENT_GREEN_DOMINANT_NONPROTECTED':green_current&~protected}
        summaries={}
        for label,mask in masks.items():
            summaries[label]={'pixels':int(mask.sum()),'griScience':[stats(original[at],mask) for at in range(3)],
                'griCurrent':[stats(display[at],mask) for at in range(3)],'griCurrentMinusScience':[stats(error[at],mask) for at in range(3)],
                'bothRunsNativeFlagClearPixels':int((clean&mask).sum()),'griRun4294Minus4264':[stats(delta[at],clean&mask) for at in range(3)]}
        packet={'science_gri':original,'current_v2_gri':display,'run_difference_gri':delta,'current_minus_science_gri':error,
                'both_runs_available':both,'both_runs_native_flags_clear':clean,'science_green_dominant':green_science,'current_green_dominant':green_current,
                **{'current_'+k:v for k,v in diagnostics.items()}}
        for run,values in fields.items():
            for k in ('values','weights','available','nativeFlagReject'):packet['run'+str(run)+'_'+k]=values[k]
        path=OUT/(name+'-comparison.npz');np.savez_compressed(path,**packet)
        scales={b:max(float(np.nanmax(abs(fields[run]['values'][at]))) if fields[run]['available'].any() else 0 for run in RUNS) for at,b in enumerate('gri')}
        for at,b in enumerate('gri'):scales[b]=max(scales[b],float(abs(original[at]).max()),float(abs(display[at]).max()),float(abs(error[at]).max()),np.finfo('f4').tiny)
        sheet=Image.new('RGB',(1280,3*286+284),(16,16,16));draw=ImageDraw.Draw(sheet)
        for at,b in enumerate('gri'):
            for column,(label,a) in enumerate((('RUN4264',fields[4264]['values'][at]),('RUN4294',fields[4294]['values'][at]),('4294-4264',delta[at]),('currentV2',display[at]),('v2-SCI',error[at]))):
                sheet.paste(signed_image(a,scales[b]).resize((256,256),Image.Resampling.NEAREST),(column*256,at*286+30))
                draw.text((column*256+3,at*286+4),f'{name} {b} {label}; +/-{scales[b]:.5g}',fill='white')
        for column,(label,mask) in enumerate((('q v2',q),('protected v2',protected),('both RUN flag-clear',clean),('r-dominant v2',green_current),('radius8 not reached',masks['CURRENT_NONPROTECTED_NOT_REACHED_RADIUS8']))):
            img=np.zeros((*shape,3),np.uint8);img[mask]=(220,220,220);sheet.paste(Image.fromarray(img).resize((256,256),Image.Resampling.NEAREST),(column*256,3*286+28));draw.text((column*256+3,3*286+3),label,fill='white')
        image=OUT/(name+'-actual-source-v2-comparison.png');sheet.save(image);images.append(bind(image))
        row={'name':name,'boundsXYExclusive':entry['boundsXYExclusive'],'inputNativeStage':bind(raw_path),'saved':bind(path),'summaries':summaries,
            'runs':{str(run):{'fields':f['fields'],'availablePixels':int(f['available'].sum()),'nativeFlagRejectedPixels':int(f['nativeFlagReject'].sum()),
                'griAllAvailable':[stats(f['values'][at],f['available']) for at in range(3)]} for run,f in fields.items()},
            'legacyQualificationPixelsChanged':int((legacy_q!=q).sum()),'legacyProtectedPixelsChanged':int((legacy_protected!=protected).sum()),
            'legacyNoiseMasksUsedForSelection':False,'currentRadiusHistogram':{str(int(k)):int(n) for k,n in zip(*np.unique(radius,return_counts=True))},
            'greenSciencePixels':int(green_science.sum()),'greenCurrentPixels':int(green_current.sum()),'greenDominanceChangedPixels':int((green_science!=green_current).sum())}
        rows.append(row);save(OUT/(name+'-result.json'),row)
    assert list(pins.values())==[bind(ROOT/v['path']) for v in pins.values()]
    spec=importlib.util.spec_from_file_location('colour_memory',TASK/'scripts/experience-shared-noise-display-2026-10-03.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
    result={'scope':__doc__,'checkpoint':bind(checkpoint),'inputs':list(pins.values()),'inputsAfterExact':True,'regressions':reg,'records':rows,'images':images,
        'diagnosticSemantics':'Same actual projected sample units nMgy/native pixel. PerRUN values only group saved geometric weights; missing RUN stays NaN, no zero comparison. Current-v2 qualification not old legacy noise mask. Band/color/signed residuals are not background, probabilities, flux photometry or cause/adoption conclusions.',
        'elapsedSeconds':time.perf_counter()-started,'cpuSeconds':time.process_time()-cpu,'offlineProcessMemory':m.memory(),
        'nativeSourceReadsOrRequests':0,'originalProjectionWholeCoaddVariancePsfNoiseFitsRecoveryOrToneTrials':0,'boundedNewPerRunComparisons':len(rows),
        'candidateChanges':False,'productionChanges':[],'otherBusinessLogicEdited':False,'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
    save(OUT/'result.json',result);print(json.dumps({k:v for k,v in result.items() if k not in ('inputs','records','images')},ensure_ascii=False),flush=True)

if __name__=='__main__':
    try:main()
    except Exception as e:
        if OUT.exists() and not (OUT/'failed.json').exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e)})
        raise
