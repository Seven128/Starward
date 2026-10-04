"""One globally fitted Astropy asinh display variant on saved M82 noise-v2.

Keep the original zero-intensity derivative and choose the least extra asinh
compression whose complete master and delivered levels fit the RGB range.
This scalar constraint solve is not an aesthetic parameter sweep, new science
fit, source correction, local mask, gamma assumption or production adoption.
"""
from pathlib import Path
import sys,json,hashlib,copy,time,importlib.util
ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image,ImageDraw
import astropy
from astropy.visualization import LuptonAsinhStretch,ManualInterval,make_lupton_rgb
from sdss_gri_tan import coherent_box_means

OUT=ROOT/'output/sdss-m82-slope-preserving-range-1004-r2'
CURRENT=ROOT/'output/sdss-m82-noise-v2-increment-1004-r1/candidate'
SCIENCE=ROOT/'output/sdss-m82-first-science-master-1004-r2/candidate'
REFERENCE='https://docs.astropy.org/en/stable/_modules/astropy/visualization/lupton_rgb.html'

def bind(p):
    p=Path(p);h=hashlib.sha256()
    with p.open('rb') as f:
        for part in iter(lambda:f.read(1048576),b''):h.update(part)
    return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}

def save(p,value):
    with Path(p).open('x',encoding='utf-8') as f:f.write(json.dumps(value,ensure_ascii=False,indent=2)+'\n')

def curve_parameters(h,slope):
    # Astropy f(I)=0.1/asinh(0.1Q)*asinh(Q*I/stretch).
    # h=asinh(0.1Q); imposing f'(0)=slope leaves one scalar h.
    if not np.isfinite(h) or not np.isfinite(slope) or h<=0 or slope<=0:
        raise ValueError('Positive finite display curve parameters required')
    q=float(10*np.sinh(h));stretch=float(.1*q/(slope*h))
    if not 0<q<=1e10 or not np.isfinite(stretch) or stretch<=0:
        raise ValueError('Outside the existing Astropy Q limit')
    return {'Q':q,'stretch':stretch}

def pre_rgb(v,parameters):
    if v.dtype!=np.float32 or v.ndim!=3 or v.shape[0]!=3 or not np.isfinite(v).all():
        raise ValueError('Finite float32 display channel-first values required')
    intensity=(v[0]+v[1]+v[2])/3
    with np.errstate(invalid='ignore',divide='ignore'):
        multiplier=np.where(intensity<=0,0,LuptonAsinhStretch(**parameters)(intensity,clip=False)/intensity)
    result=np.maximum(v*multiplier,0)
    if not np.isfinite(result).all():raise ValueError('Display mapping overflow')
    return result

def fit_range(intensity,maximum,frozen):
    if (intensity.dtype!=np.float32 or maximum.dtype!=np.float32 or intensity.ndim!=1 or
        maximum.shape!=intensity.shape or not intensity.size or not np.isfinite(intensity).all() or
        not np.isfinite(maximum).all() or not (intensity>0).all() or not (maximum>0).all()):
        raise ValueError('Complete finite positive display constraint samples required')
    original_h=float(np.arcsinh(.1*frozen['Q']))
    slope=float(.1*frozen['Q']/(frozen['stretch']*original_h))
    # One float32 ULP below 1 reserves arithmetic rounding, not visual headroom.
    limit=float(np.nextafter(np.float32(1),np.float32(0)))
    evaluations=[]
    def evaluate(h):
        parameters=curve_parameters(h,slope)
        floating=LuptonAsinhStretch(**parameters)(intensity,clip=False)
        peak=maximum*(floating/intensity)
        if not np.isfinite(peak).all():raise ValueError('Constraint mapping overflow')
        index=int(peak.argmax());value=float(peak[index])
        evaluations.append({'h':float(h),'maximum':value,'poolIndex':index,**parameters})
        return value
    lo=original_h;old_max=evaluate(lo)
    if old_max<=limit:
        return {**curve_parameters(lo,slope),'h':lo,'zeroIntensitySlope':slope,'limit':limit,
                'constraintAlreadyFits':True,'evaluations':evaluations,'lowerBound':lo,'upperBound':lo}
    upper_limit=float(np.arcsinh(1e9));hi=min(2*lo,upper_limit)
    while evaluate(hi)>limit:
        if hi==upper_limit:raise ValueError('Cannot fit within the existing Astropy limit')
        hi=min(2*hi,upper_limit)
    for _ in range(80):
        if hi-lo<=8*np.finfo('f8').eps*max(1,hi):break
        mid=(lo+hi)/2
        if evaluate(mid)>limit:lo=mid
        else:hi=mid
    else:raise ValueError('Display scalar constraint did not converge')
    low_peak=evaluate(lo);high_peak=evaluate(hi)
    assert low_peak>limit and high_peak<=limit
    return {**curve_parameters(hi,slope),'h':hi,'zeroIntensitySlope':slope,'limit':limit,
            'constraintAlreadyFits':False,'evaluations':evaluations,'lowerBound':lo,'upperBound':hi,
            'lowerPeak':low_peak,'upperPeak':high_peak,'constraintSamples':int(intensity.size)}

def regression():
    frozen={'Q':8.,'stretch':.2358548697680099}
    values=np.array([[[.00001,.00002,2.,4.,0.,-1.]],[[.000005,.00001,1.,2.,0.,-1.]],
                     [[.000003,.000006,.5,1.,0.,-1.]]],dtype='f4')
    original=pre_rgb(values,frozen);i=(values[0]+values[1]+values[2])/3;m=values.max(axis=0);positive=i>0
    fit=fit_range(i[positive],m[positive],frozen);parameters={k:fit[k] for k in ('Q','stretch')}
    new=pre_rgb(values,parameters);old=original/np.maximum(1,original.max(axis=0))
    assert old[:,0,2].max()==old[:,0,3].max()==1 and new[:,0,3].max()>new[:,0,2].max()
    assert new.max()<=1 and np.array_equal(new[:,:,4:],np.zeros_like(new[:,:,4:]))
    assert abs(.1*fit['Q']/(fit['stretch']*np.arcsinh(.1*fit['Q']))/fit['zeroIntensitySlope']-1)<8*np.finfo('f8').eps
    assert np.allclose(new[:,:,:2],original[:,:,:2],rtol=1e-6,atol=0)
    for invalid in (values.astype('f8'),values+np.nan,values[0]):
        try:pre_rgb(invalid,parameters)
        except ValueError:pass
        else:raise AssertionError('Invalid display input accepted')
    return {'oldSameColorBrightPlateauFailsOrder':True,'newStrictBrightnessOrderAndRange':True,
            'originalAnalyticZeroSlopeAndWeakLimit':True,'blackAndNegativeDisplayRemainZero':True,'invalidInputRejected':True}

def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    started,cpu=time.perf_counter(),time.process_time();pins={}
    def pin(p):
        value=bind(p);assert pins.setdefault(value['path'],value)==value;return value
    def doc(p):pin(p);return json.loads(p.read_bytes())
    checkpoint=TASK/'evidence/current-execution-state-2026-10-04-r101.json';cp=doc(checkpoint)
    assert pins[checkpoint.relative_to(ROOT).as_posix()]['sha256']=='7e45bdc115dbf8adb185b6c659da5002ed4d9561cb9a550e3c0228fb5f461b0c'
    for v in cp['currentSources']+cp['protected']+cp['evidence']:assert bind(ROOT/v['path'])==v
    for p in (Path(__file__),TASK/'scripts/experience-shared-noise-display-2026-10-03.py',ROOT/'data-pipelines/deep-sky/sdss_gri_tan.py',
              ROOT/'output/allwise-w3-atlas-0929/python-deps/astropy/visualization/lupton_rgb.py',
              ROOT/'output/allwise-w3-atlas-0929/python-deps/astropy/visualization/basic_rgb.py',
              ROOT/'output/allwise-w3-atlas-0929/python-deps/astropy/visualization/stretch.py'):
        pin(p)
    current,science=doc(CURRENT/'candidate.json'),doc(SCIENCE/'candidate.json')
    frozen=current['sourceResolvedRecipe'];assert frozen==science['display']['transfer'] and frozen['Q']==8 and frozen['stretch']==.2358548697680099
    def array(meta,directory):
        p=directory/meta['file'];value=pin(p)
        assert (value['bytes'],value['sha256'])==(meta['bytes'],meta['sha256'])
        a=np.load(p,mmap_mode='r',allow_pickle=False);assert list(a.shape)==meta['shape'] and a.dtype.str==meta['dtype'];return a
    estimates={b:array(current['arrays'][b],CURRENT) for b in 'gri'}
    # Preserve all old scientific and display qualification resources by binding.
    for meta in current['arrays'].values():pin(CURRENT/meta['file'])
    for meta in science['arrays'].values():pin(SCIENCE/meta['file'])
    joint=array(science['arrays']['joint-availability'],SCIENCE)
    catalog=doc(ROOT/'output/sdss-m82-measured-stars-1004-r4/result.json')
    stars=[{'objID':v['objID'],'targetXY':v['targetXY']} for v in catalog['records'] if 'targetSaved' in v];assert len(stars)==20
    causes=doc(ROOT/'output/sdss-m82-visible-native-display-1004-r2/result.json')
    windows={v['name']:v['boundsXYExclusive'] for v in causes['records']}
    historical_jpeg=ROOT/'workers/miniapp-api/assets/deep-sky/sdss-m82/M-82-overview.jpg';pin(historical_jpeg)
    original_parameters={k:frozen[k] for k in ('Q','stretch')}
    regression_result=regression();consumers={};pool_i=[];pool_m=[];pool_records=[]
    def constraint(v,known,name):
        intensity=(v[0]+v[1]+v[2])/3;maximum=v.max(axis=0);valid=known&(intensity>0)
        assert np.isfinite(v[:,known]).all() and (maximum[valid]>0).all()
        begin=sum(a.size for a in pool_i);pool_i.append(intensity[valid]);pool_m.append(maximum[valid])
        old_peak=pre_rgb(v,original_parameters).max(axis=0)
        row={'name':name,'pixels':int(known.size),'available':int(known.sum()),'positiveIntensitySamples':int(valid.sum()),
             'poolBegin':begin,'poolEnd':begin+int(valid.sum()),'originalMaximum':float(old_peak.max()),
             'originalHardNormalizedPixels':int((old_peak>1).sum()),'originalPeakXY':list(map(int,np.unravel_index(int(old_peak.argmax()),old_peak.shape)[::-1]))}
        pool_records.append(row)
    master=np.stack([np.where(joint,estimates[b],0).astype('f4') for b in 'irg']);constraint(master,joint,'MASTER');del master
    for level,meta in current['levels'].items():
        x0,y0,x1,y1=meta['crop']['boundsXYExclusive'];factor=meta['crop']['boxFactor'];region=np.s_[y0:y1,x0:x1]
        means,counts=coherent_box_means({b:estimates[b][region] for b in 'gri'},joint[region],factor);known=counts>0
        values=np.stack([np.where(known,means[b],0).astype('f4') for b in 'irg'])
        original_path=CURRENT/meta['file'];b=pin(original_path);assert (b['bytes'],b['sha256'])==(meta['bytes'],meta['sha256'])
        old=np.asarray(Image.open(original_path).convert('RGBA'));alpha=np.rint(counts.astype('f8')*255/(factor*factor)).astype('u1')
        baseline=make_lupton_rgb(*values,interval=ManualInterval(vmin=0,vmax=None),stretch_object=LuptonAsinhStretch(**original_parameters),output_dtype=np.uint8)
        baseline[~known]=0;assert np.array_equal(baseline,old[:,:,:3]) and np.array_equal(alpha,old[:,:,3])
        consumers[level]={'v':values,'counts':counts,'old':old,'known':known,'meta':meta};constraint(values,known,level)
    intensity,maximum=np.concatenate(pool_i),np.concatenate(pool_m);del pool_i,pool_m
    save(OUT/'inputs-before.json',list(pins.values()))
    fitted=fit_range(intensity,maximum,frozen);parameters={k:fitted[k] for k in ('Q','stretch')}
    save(OUT/'global-fit.json',{'scope':__doc__,'reference':REFERENCE,'referenceMeaning':'Astropy documented formula and RGB implementation reused. Coupled slope/range constraint is this task decision, not an Astropy recommended exposure or physical sRGB/photometric claim.',
        'astropyVersion':astropy.__version__,'originalFrozenRecipe':frozen,'constraintDomains':pool_records,'fitted':fitted,
        'selection':'One global all-finite master plus three delivered mean domains; no percentile, local masks or per-level fit. Least h >= original satisfying float32 range with one ULP arithmetic margin.',
        'scienceChanges':False,'originalRecipeChanges':False,'ordinaryAdoption':False})
    del intensity,maximum
    records=[];new_images={};image_records=[];candidate_levels={}
    for level,c in consumers.items():
        values,old,known,meta=c['v'],c['old'],c['known'],c['meta'];pre=pre_rgb(values,parameters)
        floating=make_lupton_rgb(*values,interval=ManualInterval(vmin=0,vmax=None),stretch_object=LuptonAsinhStretch(**parameters),output_dtype=np.float64)
        assert pre.max()<=fitted['limit'] and np.array_equal(floating,pre.transpose(1,2,0).astype('f8'))
        rgb=(floating*255).astype('u1');rgb[~known]=0;payload=np.dstack((rgb,old[:,:,3]));path=OUT/meta['file'];Image.fromarray(payload).save(path)
        npz=OUT/(level.lower()+'-consumer.npz');np.savez_compressed(npz,values=values,counts=c['counts'],pre_original=pre_rgb(values,original_parameters),pre_variant=pre,actual_rgb=rgb,actual_alpha=old[:,:,3])
        normalized=pre_rgb(values,original_parameters).max(axis=0)>1;old_max=old[:,:,:3].max(axis=2);new_max=rgb.max(axis=2)
        weak=pre_rgb(values,original_parameters).max(axis=0)<=.1
        delta=rgb.astype('i2')-old[:,:,:3].astype('i2');local=[]
        x0,y0,x1,y1=meta['crop']['boundsXYExclusive'];factor=meta['crop']['boxFactor']
        for name,(bx0,by0,bx1,by1) in windows.items():
            if x0<=bx0<bx1<=x1 and y0<=by0<by1<=y1:
                region=np.s_[(by0-y0)//factor:(by1-y0)//factor,(bx0-x0)//factor:(bx1-x0)//factor]
                before,after=old[:,:,:3][region],rgb[region]
                local.append({'name':name,'boundsMasterXYExclusive':[bx0,by0,bx1,by1],
                    'beforeMeanRGB':before.mean(axis=(0,1)).tolist(),'afterMeanRGB':after.mean(axis=(0,1)).tolist(),
                    'oldPeakUnique':int(np.unique(before.max(axis=2)).size),'newPeakUnique':int(np.unique(after.max(axis=2)).size)})
        row={'level':level,'savedImage':bind(path),'savedConsumer':bind(npz),'sourceGeometry':copy.deepcopy(meta),
            'pixels':int(known.size),'available':int(known.sum()),'originalRGBAndAlphaExact':True,
            'variantHardNormalizationPixels':int((pre.max(axis=0)>1).sum()),'originalHardNormalizedPixels':int(normalized.sum()),
            'oldPlateauSubsetUniquePeak8bit':int(np.unique(old_max[normalized]).size),'newSameSubsetUniquePeak8bit':int(np.unique(new_max[normalized]).size),
            'originalAny255':int((old_max==255).sum()),'variantAny255':int((new_max==255).sum()),
            'beforeMeanRGB':old[:,:,:3].mean(axis=(0,1)).tolist(),'afterMeanRGB':rgb.mean(axis=(0,1)).tolist(),
            'weakOriginalMaxAtMostPointOnePixels':int(weak.sum()),'weakChangedPixels':int(np.any(delta[weak]!=0,axis=1).sum()),
            'weakMaximumChannelDelta':int(abs(delta[weak]).max()) if weak.any() else None,
            'changedRgbPixels':int(np.any(delta!=0,axis=2).sum()),'maximumChannelDelta':int(abs(delta).max()),'localWindows':local}
        records.append(row);new_images[level]=rgb
        candidate_levels[level]={k:copy.deepcopy(meta[k]) for k in ('crop','wcsHeader','fieldDegrees')};candidate_levels[level].update({'file':path.name,'bytes':row['savedImage']['bytes'],'sha256':row['savedImage']['sha256']})
        sheet=Image.new('RGB',(1024,544),(16,16,16));draw=ImageDraw.Draw(sheet);sheet.paste(Image.fromarray(old[:,:,:3]),(0,32));sheet.paste(Image.fromarray(rgb),(512,32))
        draw.text((5,5),level+' noise-v2 frozen current',fill='white');draw.text((517,5),level+' globally fitted asinh VARIANT',fill='white')
        comparison=OUT/(level.lower()+'-actual-comparison.png');sheet.save(comparison);image_records.append(bind(comparison))
    star_rows=[];sheet=Image.new('RGB',(1152,144*len(stars)),(16,16,16));draw=ImageDraw.Draw(sheet)
    for index,star in enumerate(stars):
        row={**star,'levels':{}}
        for at,(level,c) in enumerate(consumers.items()):
            meta=c['meta'];x0,y0,x1,y1=meta['crop']['boundsXYExclusive'];factor=meta['crop']['boxFactor'];x,y=star['targetXY']
            if not x0<=x<x1 or not y0<=y<y1:continue
            cx,cy=(x-x0+.5)/factor-.5,(y-y0+.5)/factor-.5;ix,iy=int(round(cx)),int(round(cy))
            bounds=[max(0,ix-5),max(0,iy-5),min(512,ix+6),min(512,iy+6)];bx0,by0,bx1,by1=bounds;region=np.s_[by0:by1,bx0:bx1]
            old,new=c['old'][:,:,:3][region],new_images[level][region]
            row['levels'][level]={'imageCenterXY':[cx,cy],'boundsXYExclusive':bounds,'oldMaximumChannel':int(old.max()),'newMaximumChannel':int(new.max()),
                'meanBeforeRGB':old.mean(axis=(0,1)).tolist(),'meanAfterRGB':new.mean(axis=(0,1)).tolist()}
            for col,(label,img) in enumerate((('current',old),('VARIANT',new))):
                xx=at*384+col*192;sheet.paste(Image.fromarray(img).resize((132,132),Image.Resampling.NEAREST),(xx,index*144+12));draw.text((xx+3,index*144),f'{index+1} {level} {label}',fill='white')
        star_rows.append(row)
    path=OUT/'all-qualified-catalog-star-stamps.png';sheet.save(path);image_records.append(bind(path))
    manifest={'version':'sdss-slope-preserving-global-asinh-display-trial-v1','objectRef':'M:82','center':science['center'],'orientation':science['orientation'],
        'sourceScientificMaster':pin(SCIENCE/'candidate.json'),'sourceDisplayEstimates':pin(CURRENT/'candidate.json'),
        'levels':candidate_levels,'originalFrozenRecipe':frozen,'trialResolvedParameters':parameters,'globalFit':bind(OUT/'global-fit.json'),
        'scope':'Explicit display-only experiment; original science/availability/alpha/WCS/recipe/publications unchanged.',
        'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
    save(OUT/'candidate.json',manifest)
    assert list(pins.values())==[bind(ROOT/v['path']) for v in pins.values()]
    spec=importlib.util.spec_from_file_location('range_memory',TASK/'scripts/experience-shared-noise-display-2026-10-03.py');mem=importlib.util.module_from_spec(spec);spec.loader.exec_module(mem)
    report={'scope':__doc__,'checkpoint':bind(checkpoint),'inputs':list(pins.values()),'inputsAfterExact':True,'regressions':regression_result,
        'globalFit':bind(OUT/'global-fit.json'),'levels':records,'catalogStars':star_rows,'comparisons':image_records,'candidate':bind(OUT/'candidate.json'),
        'elapsedSeconds':time.perf_counter()-started,'cpuSeconds':time.process_time()-cpu,'offlineProcessMemory':mem.memory(),
        'sourceRequests':0,'nativeSourceReads':0,'noiseVarianceCoaddOrRecoveryReprocessing':0,'displayCurveConstraintSolves':1,
        'sourceScientificOrEstimatesOrAlphaWcsChanges':False,'originalRecipeOrPublicationChanges':False,'productionCodeChanges':[],
        'otherBusinessLogicEdited':False,'ordinaryAdoption':False,'quality':'UNVERIFIED_FULL_THREE_LOD_VARIANT','independentReview':'MISSING'}
    save(OUT/'result.json',report);print(json.dumps({k:v for k,v in report.items() if k not in ('inputs','levels','catalogStars','comparisons')},ensure_ascii=False),flush=True)

if __name__=='__main__':
    try:main()
    except Exception as e:
        if OUT.exists() and not (OUT/'failed.json').exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e)})
        raise
