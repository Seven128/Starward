"""One fixed common highlight shoulder on saved actual M82 noise-v2 consumers.

Reuse all three original signed means/pre-Astropy-normalization RGB from the
saved, byte-bound r102 consumer. No original source/science/noise/variance/PSF/
coadd/filter/mean computation, fit or acquisition is repeated. Explicit display
candidate only; ordinary registries, frozen recipes and publications stay put.
"""
from pathlib import Path
import sys,json,hashlib,copy,time,importlib.util
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image,ImageDraw
from optical_display_highlights import compress_display_highlights,KNEE,VERSION
SOURCE=ROOT/'output/sdss-m82-slope-preserving-range-1004-r2'
CURRENT=ROOT/'output/sdss-m82-noise-v2-increment-1004-r1/candidate'
OUT=ROOT/'output/sdss-m82-highlight-shoulder-1004-r1'

def bind(p):
    p=Path(p);h=hashlib.sha256()
    with p.open('rb') as f:
        for part in iter(lambda:f.read(1048576),b''):h.update(part)
    return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}

def save(p,value):
    with Path(p).open('x',encoding='utf-8') as f:f.write(json.dumps(value,ensure_ascii=False,indent=2)+'\n')

def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes());started,cpu=time.perf_counter(),time.process_time();pins={}
    def pin(p,expected=None):
        value=bind(p)
        if expected is not None:assert value==expected,value['path']
        assert pins.setdefault(value['path'],value)==value;return value
    def doc(p):pin(p);return json.loads(p.read_bytes())
    checkpoint=TASK/'evidence/current-execution-state-2026-10-04-r102.json';cp=doc(checkpoint)
    assert bind(checkpoint)['sha256']=='e1f11a5b0c32b97d34f69143027355d935d991d934817f6062158ae686da36c3'
    for row in cp['currentSources']+cp['protected']+cp['evidence']:assert bind(ROOT/row['path'])==row
    for p in [Path(__file__),TASK/'scripts/experience-shared-noise-display-2026-10-03.py',
              *[ROOT/'data-pipelines/deep-sky'/name for name in ('optical_display_highlights.py','test_optical_display_highlights.py','licenses/khronos-tone-mapping-NOTICE.txt','licenses/khronos-tone-mapping-APACHE-2.0.txt')]]:pin(p)
    source=doc(SOURCE/'result.json');current=doc(CURRENT/'candidate.json')
    reader=doc(ROOT/'output/sdss-m82-slope-preserving-readback-1004-r1/result.json')
    assert reader['status']=='SAVED_FULL_GLOBAL_ASINH_VARIANT_FORMULA_AND_RANGE_READBACK'
    reference=ROOT/'output/sdss-m82-slope-preserving-development-1004-r1/references';receipt=doc(reference/'receipt.json')
    assert receipt['commit']=='b5a2eed5ddf6c2227090449399de9c7affb9e4c9'
    for row in receipt['files']:
        actual=pin(reference/row['sourcePath']);assert (actual['bytes'],actual['sha256'])==(row['bytes'],row['sha256'])
    assert KNEE==.8-.04 and VERSION=='common-display-highlight-shoulder-v1'
    recipe={'version':VERSION,'originalFrozenAstropyRecipe':copy.deepcopy(current['sourceResolvedRecipe']),
        'scope':'One fixed global function on original pre-hard-normalization display RGB, same at all levels.',
        'knee':KNEE,'sourceCodeCommit':receipt['commit'],'codeLicense':'Apache-2.0','materialOffset':False,'desaturation':False,
        'meaning':'Only published rational shoulder adapted; not complete PBR Neutral or physical Rec709, sRGB/astronomical calibration.',
        'finiteInterval':'max(preRGB)<=knee exactly unchanged before output quantization.',
        'sourceNotice':pin(ROOT/'data-pipelines/deep-sky/licenses/khronos-tone-mapping-NOTICE.txt'),
        'sourceLicense':pin(ROOT/'data-pipelines/deep-sky/licenses/khronos-tone-mapping-APACHE-2.0.txt')}
    save(OUT/'recipe.json',recipe);images={};rows=[];candidate_levels={};comparisons=[]
    for row in source['levels']:
        level=row['level'];meta=current['levels'][level];input_path=ROOT/row['savedConsumer']['path'];pin(input_path,row['savedConsumer'])
        with np.load(input_path,allow_pickle=False) as data:
            pre=data['pre_original'];alpha=data['actual_alpha'];known=data['counts']>0
            # The checked source is the OLD frozen preRGB, never the rejected
            # r102 variant. No science correction or producer rerun is needed.
            original=np.asarray(Image.open(CURRENT/meta['file']).convert('RGBA'));old_bound=pin(CURRENT/meta['file'])
            assert (old_bound['bytes'],old_bound['sha256'])==(meta['bytes'],meta['sha256'])
            baseline=pre/np.maximum(1,pre.max(axis=0));old_rgb=(baseline.transpose(1,2,0).astype('f8')*255).astype('u1');old_rgb[~known]=0
            assert np.array_equal(old_rgb,original[:,:,:3]) and np.array_equal(alpha,original[:,:,3])
            mapped=compress_display_highlights(pre);low=pre.max(axis=0)<=KNEE
            assert np.array_equal(mapped[:,low],pre[:,low].astype('f8'))
            rgb=(mapped.transpose(1,2,0)*255).astype('u1');rgb[~known]=0
            assert np.array_equal(rgb[low],old_rgb[low]) and (mapped>=0).all() and (mapped<=1).all()
            path=OUT/meta['file'];Image.fromarray(np.dstack((rgb,alpha))).save(path)
            consumer=OUT/(level.lower()+'-consumer.npz');np.savez_compressed(consumer,pre_rgb=pre,mapped_rgb=mapped,actual_rgb=rgb,actual_alpha=alpha)
            plateau=pre.max(axis=0)>1;diff=rgb.astype('i2')-old_rgb.astype('i2');weak=pre.max(axis=0)<=.1
            new_row={'level':level,'savedImage':bind(path),'savedConsumer':bind(consumer),'inputConsumer':row['savedConsumer'],
                'originalGeometry':copy.deepcopy(meta),'pixels':int(known.size),'available':int(known.sum()),'oldRGBAlphaExact':True,
                'finiteLowIntervalPixels':int(low.sum()),'finiteLowIntervalRgbChanged':int(np.any(diff[low]!=0,axis=1).sum()),
                'weakOriginalMaxAtMostPointOnePixels':int(weak.sum()),'weakChangedPixels':int(np.any(diff[weak]!=0,axis=1).sum()),
                'oldHardNormalizedPixels':int(plateau.sum()),'oldSameSubsetMaximumUnique':int(np.unique(old_rgb.max(axis=2)[plateau]).size),
                'newSameSubsetMaximumUnique':int(np.unique(rgb.max(axis=2)[plateau]).size),'oldAny255':int((old_rgb.max(axis=2)==255).sum()),
                'newAny255':int((rgb.max(axis=2)==255).sum()),'changedRgbPixels':int(np.any(diff!=0,axis=2).sum()),
                'maximumChannelDelta':int(abs(diff).max()),'meanBeforeRGB':old_rgb.mean(axis=(0,1)).tolist(),'meanAfterRGB':rgb.mean(axis=(0,1)).tolist()}
            rows.append(new_row);images[level]=(old_rgb,rgb)
            candidate_levels[level]={k:copy.deepcopy(meta[k]) for k in ('crop','wcsHeader','fieldDegrees')}
            candidate_levels[level].update({'file':path.name,'bytes':new_row['savedImage']['bytes'],'sha256':new_row['savedImage']['sha256']})
            sheet=Image.new('RGB',(1024,544),(16,16,16));draw=ImageDraw.Draw(sheet);sheet.paste(Image.fromarray(old_rgb),(0,32));sheet.paste(Image.fromarray(rgb),(512,32))
            draw.text((5,5),level+' noise-v2 frozen current',fill='white');draw.text((517,5),level+' finite-interval shoulder CANDIDATE',fill='white')
            comparison=OUT/(level.lower()+'-actual-comparison.png');sheet.save(comparison);comparisons.append(bind(comparison))
    stars=[]
    for start in range(0,len(source['catalogStars']),5):
        sheet=Image.new('RGB',(1152,144*5),(16,16,16));draw=ImageDraw.Draw(sheet)
        for at,row in enumerate(source['catalogStars'][start:start+5]):
            new_star={k:copy.deepcopy(row[k]) for k in ('objID','targetXY')};new_star['levels']={}
            for column,(level,record) in enumerate(row['levels'].items()):
                before,after=images[level];x0,y0,x1,y1=record['boundsXYExclusive'];region=np.s_[y0:y1,x0:x1];old,new=before[region],after[region]
                new_star['levels'][level]={'imageCenterXY':record['imageCenterXY'],'boundsXYExclusive':record['boundsXYExclusive'],
                    'oldMaximumChannel':int(old.max()),'newMaximumChannel':int(new.max()),'changedPixels':int(np.any(old!=new,axis=2).sum())}
                for side,(label,img) in enumerate((('current',old),('SHOULDER',new))):
                    xx=column*384+side*192;sheet.paste(Image.fromarray(img).resize((132,132),Image.Resampling.NEAREST),(xx,at*144+12));draw.text((xx+3,at*144),f'{start+at+1} {level} {label}',fill='white')
            stars.append(new_star)
        path=OUT/f'all-catalog-star-stamps-{start//5+1}.png';sheet.save(path);comparisons.append(bind(path))
    assert len(stars)==20
    candidate={'version':'sdss-finite-interval-highlight-display-candidate-v1','objectRef':current['objectRef'],'center':current['center'],'orientation':current['orientation'],
        'sourceDisplayCandidate':pin(CURRENT/'candidate.json'),'sourceConsumers':pin(SOURCE/'result.json'),'sourceConsumerReadback':pin(ROOT/'output/sdss-m82-slope-preserving-readback-1004-r1/result.json'),
        'originalFrozenRecipe':current['sourceResolvedRecipe'],'displayRecipe':bind(OUT/'recipe.json'),'levels':candidate_levels,
        'scope':'Display-only candidate, not source measurement or immutable publication. Current science/source/alpha/WCS/old publication unchanged.',
        'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
    save(OUT/'candidate.json',candidate)
    assert list(pins.values())==[bind(ROOT/row['path']) for row in pins.values()]
    spec=importlib.util.spec_from_file_location('highlight_memory',TASK/'scripts/experience-shared-noise-display-2026-10-03.py');mem=importlib.util.module_from_spec(spec);spec.loader.exec_module(mem)
    result={'scope':__doc__,'checkpoint':bind(checkpoint),'inputs':list(pins.values()),'inputsAfterExact':True,'recipe':bind(OUT/'recipe.json'),
        'candidate':bind(OUT/'candidate.json'),'levels':rows,'catalogStars':stars,'comparisons':comparisons,
        'sourceRequests':0,'originalSourceReads':0,'scienceNoiseVarianceCoaddPsfFilterOrMeansReprocessing':0,'fitCalls':0,
        'elapsedSeconds':time.perf_counter()-started,'cpuSeconds':time.process_time()-cpu,'offlineProcessMemory':mem.memory(),
        'sourceScienceAlphaWcsOrOriginalRecipePublicationChanges':False,'ordinaryAdoption':False,'quality':'UNVERIFIED_FULL_THREE_LOD_CANDIDATE',
        'otherBusinessLogicEdited':False,'independentReview':'MISSING'}
    save(OUT/'result.json',result);print(json.dumps({k:v for k,v in result.items() if k not in ('inputs','levels','catalogStars','comparisons')},ensure_ascii=False),flush=True)

if __name__=='__main__':
    try:main()
    except Exception as e:
        if OUT.exists() and not (OUT/'failed.json').exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e)})
        raise
