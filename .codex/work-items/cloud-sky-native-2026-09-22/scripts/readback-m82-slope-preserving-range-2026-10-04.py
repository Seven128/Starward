"""Saved actual M82 global-curve readback; no fit/search/source/runtime replay.

Derive the documented asinh formula directly, inspect all saved input domains,
PNG payloads and catalog consumers. Self verification is not independent review
and numeric range/unchanged geometry do not establish useful image quality.
"""
from pathlib import Path
import sys,json,hashlib,math,time
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True;sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from PIL import Image
SOURCE=ROOT/'output/sdss-m82-slope-preserving-range-1004-r2'
OUT=ROOT/'output/sdss-m82-slope-preserving-readback-1004-r1'
CURRENT=ROOT/'output/sdss-m82-noise-v2-increment-1004-r1/candidate'
SCIENCE=ROOT/'output/sdss-m82-first-science-master-1004-r2/candidate'

def bind(p):
    p=Path(p);h=hashlib.sha256()
    with p.open('rb') as f:
        for part in iter(lambda:f.read(1048576),b''):h.update(part)
    return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}

def save(p,value):
    with Path(p).open('x',encoding='utf-8') as f:f.write(json.dumps(value,ensure_ascii=False,indent=2)+'\n')

def explicit_mapping(v,parameters):
    intensity=(v[0]+v[1]+v[2])/3
    f=intensity.copy();np.multiply(f,parameters['Q']/parameters['stretch'],out=f)
    np.arcsinh(f,out=f);np.multiply(f,.1/np.arcsinh(.1*parameters['Q']),out=f)
    ratio=np.zeros_like(intensity);np.divide(f,intensity,out=ratio,where=intensity>0)
    return np.maximum(v*ratio,0)

def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-reader.py').write_bytes(Path(__file__).read_bytes());started=time.perf_counter()
    pins={}
    def pin(p,expected=None):
        row=bind(p)
        if expected is not None:assert row==expected,row['path']
        assert pins.setdefault(row['path'],row)==row;return row
    def doc(p):pin(p);return json.loads(p.read_bytes())
    report=doc(SOURCE/'result.json');f=doc(SOURCE/'global-fit.json');candidate=doc(SOURCE/'candidate.json')
    pin(SOURCE/'global-fit.json',report['globalFit']);pin(SOURCE/'candidate.json',report['candidate'])
    for row in report['inputs']:pin(ROOT/row['path'],row)
    current=doc(CURRENT/'candidate.json');science=doc(SCIENCE/'candidate.json');fit=f['fitted'];parameters={k:fit[k] for k in ('Q','stretch')}
    assert candidate['trialResolvedParameters']==parameters and candidate['originalFrozenRecipe']==current['sourceResolvedRecipe']==science['display']['transfer']
    assert f['originalFrozenRecipe']==current['sourceResolvedRecipe']
    assert candidate['ordinaryAdoption'] is False and report['displayCurveConstraintSolves']==1
    slope=.1*parameters['Q']/(parameters['stretch']*math.asinh(.1*parameters['Q']))
    frozen={k:current['sourceResolvedRecipe'][k] for k in ('Q','stretch')}
    original_slope=.1*frozen['Q']/(frozen['stretch']*math.asinh(.1*frozen['Q']))
    assert abs(slope/original_slope-1)<=8*np.finfo('f8').eps
    assert 0<fit['upperBound']-fit['lowerBound']<=8*np.finfo('f8').eps*max(1,fit['upperBound'])
    lo={k:fit['evaluations'][-2][k] for k in ('Q','stretch')};assert fit['evaluations'][-2]['h']==fit['lowerBound']
    estimates={b:np.load(CURRENT/current['arrays'][b]['file'],mmap_mode='r',allow_pickle=False) for b in 'gri'}
    joint=np.load(SCIENCE/science['arrays']['joint-availability']['file'],mmap_mode='r',allow_pickle=False)
    science_arrays={b:np.load(SCIENCE/science['arrays'][b+'-science']['file'],mmap_mode='r',allow_pickle=False) for b in 'gri'}
    domains=[];peaks=[];scalar_checks=[];global_new=0.;global_lower=0.;total_samples=0
    def inspect(v,known,name,start_y=0):
        nonlocal global_new,global_lower,total_samples
        old,new,lower=[explicit_mapping(v,p) for p in (frozen,parameters,lo)]
        intensity=(v[0]+v[1]+v[2])/3;positive=known&(intensity>0);total_samples+=int(positive.sum())
        highmax=float(new.max());lowmax=float(lower.max());global_new=max(global_new,highmax);global_lower=max(global_lower,lowmax)
        xy=list(map(int,np.unravel_index(int(new.max(axis=0).argmax()),known.shape)[::-1]));x,y=xy
        if highmax>0:
            signal=v[:,y,x].astype('f8');i=float(intensity[y,x])
            factor=.1/math.asinh(.1*parameters['Q'])*math.asinh(parameters['Q']*i/parameters['stretch'])/i if i>0 else 0
            expected=np.maximum(signal*factor,0);actual=new[:,y,x].astype('f8')
            bound=8*np.finfo('f4').eps*np.maximum(1,abs(signal)*original_slope)
            assert (abs(actual-expected)<=bound).all()
            scalar_checks.append({'domain':name,'xy':[x,y+start_y],'signedDisplayIrg':signal.tolist(),'mappedIrg':actual.tolist(),'float64FormulaMaximumDifference':float(abs(actual-expected).max())})
        pos=np.maximum(v,0).astype('f8');mapped=new.astype('f8')
        for a,b in ((0,1),(0,2),(1,2)):
            lhs=mapped[a]*pos[b];rhs=mapped[b]*pos[a]
            assert (abs(lhs-rhs)<=4*np.finfo('f4').eps*np.maximum(abs(lhs),abs(rhs))).all()
        # This is display clipping only; negative scientific input still exists.
        assert np.array_equal(np.all(old==0,axis=0),np.all(new==0,axis=0))
        assert highmax<=fit['limit']
        peaks.append({'domain':name,'xy':[x,y+start_y],'maximum':highmax})
        return old,new,{'name':name,'pixels':int(known.size),'available':int(known.sum()),'positiveIntensitySamples':int(positive.sum()),
            'originalHardNormalizedPixels':int((old.max(axis=0)>1).sum()),'maximum':highmax,'lowerMaximum':lowmax}
    master_rows=[]
    for y in range(0,2048,128):
        known=joint[y:y+128];v=np.stack([np.where(known,estimates[b][y:y+128],0).astype('f4') for b in 'irg'])
        _,_,row=inspect(v,known,'MASTER',y);master_rows.append(row)
    master={'name':'MASTER',**{k:sum(r[k] for r in master_rows) for k in ('pixels','available','positiveIntensitySamples','originalHardNormalizedPixels')},
            'maximum':max(r['maximum'] for r in master_rows),'lowerMaximum':max(r['lowerMaximum'] for r in master_rows)}
    domains.append(master);levels=[];rgb_mutation_changed=0;images={}
    for row in report['levels']:
        level=row['level'];meta=current['levels'][level];entry=candidate['levels'][level]
        for key in ('crop','wcsHeader','fieldDegrees'):assert entry[key]==meta[key]
        pin(ROOT/row['savedImage']['path'],row['savedImage']);pin(ROOT/row['savedConsumer']['path'],row['savedConsumer'])
        with np.load(ROOT/row['savedConsumer']['path'],allow_pickle=False) as data:
            v=data['values'];known=data['counts']>0;old,new,domain=inspect(v,known,level)
            assert np.array_equal(old,data['pre_original']) and np.array_equal(new,data['pre_variant'])
            domains.append(domain);baseline=old/np.maximum(1,old.max(axis=0));before=(baseline.transpose(1,2,0).astype('f8')*255).astype('u1');before[~known]=0
            after=(new.transpose(1,2,0).astype('f8')*255).astype('u1');after[~known]=0
            old_image=np.asarray(Image.open(CURRENT/meta['file']).convert('RGBA'));saved=np.asarray(Image.open(ROOT/row['savedImage']['path']).convert('RGBA'))
            assert np.array_equal(before,old_image[:,:,:3]) and np.array_equal(after,saved[:,:,:3]) and np.array_equal(after,data['actual_rgb'])
            alpha=np.rint(data['counts'].astype('f8')*255/meta['crop']['boxFactor']**2).astype('u1')
            assert np.array_equal(alpha,old_image[:,:,3]) and np.array_equal(alpha,saved[:,:,3]) and np.array_equal(alpha,data['actual_alpha'])
            plateau=old.max(axis=0)>1;weak=old.max(axis=0)<=.1;delta=after.astype('i2')-before.astype('i2')
            unique=int(np.unique(after.max(axis=2)[plateau]).size);assert unique==row['newSameSubsetUniquePeak8bit'] and unique>1
            changed=int(np.any(delta!=0,axis=2).sum());assert changed==row['changedRgbPixels'] and changed>0;rgb_mutation_changed+=changed
            weak_changed=int(np.any(delta[weak]!=0,axis=1).sum());assert weak_changed==row['weakChangedPixels']
            maximum=int(abs(delta[weak]).max()) if weak.any() else None;assert maximum==row['weakMaximumChannelDelta']
            levels.append({'level':level,'fullRGBAlphaPngReadbackExact':True,'originalGeometryExact':True,'oldPlateauSubsetNewUniqueLevels':unique,
                'changedPixels':changed,'actualWeakPixels':int(weak.sum()),'actualWeakChangedPixels':weak_changed,'actualWeakMaximumChannelDelta':maximum,
                'meanBeforeRGB':before.mean(axis=(0,1)).tolist(),'meanAfterRGB':after.mean(axis=(0,1)).tolist()})
            images[level]=(before,after)
    assert total_samples==fit['constraintSamples'] and global_new==fit['upperPeak'] and global_lower==fit['lowerPeak']
    assert global_new<=fit['limit'] and global_lower>fit['limit']
    for actual,record in zip(domains,f['constraintDomains']):
        for key in ('name','pixels','available','positiveIntensitySamples','originalHardNormalizedPixels'):assert actual[key]==record[key]
    binding_peak=max(peaks,key=lambda r:r['maximum']);x,y=binding_peak['xy'];name=binding_peak['domain']
    if name=='MASTER':root_point=[x,y]
    else:
        meta=current['levels'][name];x0,y0,_,_=meta['crop']['boundsXYExclusive'];factor=meta['crop']['boxFactor'];root_point=[x0+factor*(x+.5)-.5,y0+factor*(y+.5)-.5]
    # The controlling whole-master sample is reported without classifying it as
    # a star, sky, cosmic ray or error from a tone-mapping result.
    ix,iy=map(lambda x:int(round(x)),root_point)
    binding_peak.update({'masterTargetXY':root_point,'nearestMasterSignedDisplayGri':{b:float(estimates[b][iy,ix]) for b in 'gri'},
        'nearestMasterOriginalScienceGri':{b:float(science_arrays[b][iy,ix]) for b in 'gri'},
        'scientificIdentityQuality':'Unchanged real master sample; no classification from tone curve or pixel maximum.'})
    stars=[]
    for row in report['catalogStars']:
        for level,record in row['levels'].items():
            before,after=images[level];x0,y0,x1,y1=record['boundsXYExclusive'];region=np.s_[y0:y1,x0:x1]
            assert int(before[region].max())==record['oldMaximumChannel'] and int(after[region].max())==record['newMaximumChannel']>0
        stars.append({'objID':row['objID'],'originalTargetXY':row['targetXY'],'actualLevelPeaks':{k:[v['oldMaximumChannel'],v['newMaximumChannel']] for k,v in row['levels'].items()}})
    assert len(stars)==20
    assert list(pins.values())==[bind(ROOT/row['path']) for row in pins.values()]
    result={'scope':__doc__,'status':'SAVED_FULL_GLOBAL_ASINH_VARIANT_FORMULA_AND_RANGE_READBACK','inputs':list(pins.values()),'inputsAfterExact':True,
        'completeConstraintSamples':total_samples,'globalUpperPeak':global_new,'globalLowerPeak':global_lower,'bindingPeak':binding_peak,
        'analyticOriginalZeroSlopeExactWithinFloat64Arithmetic':True,'levels':levels,'catalogStars':stars,'scalarPeaks':scalar_checks,
        'oldNormalizationMutationChangedActualPixels':rgb_mutation_changed,'rangeAndGeometryVerification':'Limited development contract evidence; not absolute astrometry, photometry or useful display acceptance.',
        'visualResult':'REJECTED_AS_CURRENT_DELIVERY: all three complete images and all saved 20 catalog consumers are visibly darker; finite weak values differ despite matching the zero-intensity derivative. Core gradation recovered, green/noise/structure quality still open.',
        'ordinaryAdoption':False,'independentReview':'MISSING','sourceRequests':0,'fitRepeats':0,'scienceReprocessing':0,'otherBusinessLogicEdited':False,
        'elapsedSeconds':time.perf_counter()-started}
    save(OUT/'result.json',result);print(json.dumps({k:v for k,v in result.items() if k not in ('inputs','levels','catalogStars','scalarPeaks')},ensure_ascii=False),flush=True)

if __name__=='__main__':
    try:main()
    except Exception as e:
        if OUT.exists() and not (OUT/'failed.json').exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e)})
        raise
