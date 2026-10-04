"""Read saved shoulder formula/RGBA/finite interval/real consumers without replay.

Independent task arithmetic, not an independent reviewer or final quality
acceptance. No upstream/source/means/fit/runtime/publication is repeated.
"""
from pathlib import Path
import sys,json,hashlib,time
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True;sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from PIL import Image
SOURCE=ROOT/'output/sdss-m82-highlight-shoulder-1004-r1'
CURRENT=ROOT/'output/sdss-m82-noise-v2-increment-1004-r1/candidate'
OUT=ROOT/'output/sdss-m82-highlight-readback-1004-r1'

def bind(p):
    p=Path(p);h=hashlib.sha256()
    with p.open('rb') as f:
        for part in iter(lambda:f.read(1048576),b''):h.update(part)
    return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}

def save(p,v):
    with Path(p).open('x',encoding='utf-8') as f:f.write(json.dumps(v,ensure_ascii=False,indent=2)+'\n')

def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-reader.py').write_bytes(Path(__file__).read_bytes());started=time.perf_counter();pins={}
    def pin(p,expected=None):
        row=bind(p)
        if expected is not None:assert row==expected,row['path']
        assert pins.setdefault(row['path'],row)==row;return row
    def doc(p):pin(p);return json.loads(p.read_bytes())
    report=doc(SOURCE/'result.json');candidate=doc(SOURCE/'candidate.json');recipe=doc(SOURCE/'recipe.json');current=doc(CURRENT/'candidate.json')
    for row in report['inputs']:pin(ROOT/row['path'],row)
    pin(SOURCE/'candidate.json',report['candidate']);pin(SOURCE/'recipe.json',report['recipe'])
    assert recipe['knee']==.76 and not recipe['materialOffset'] and not recipe['desaturation']
    assert recipe['originalFrozenAstropyRecipe']==candidate['originalFrozenRecipe']==current['sourceResolvedRecipe']
    assert candidate['ordinaryAdoption'] is False and report['fitCalls']==0
    reference=ROOT/'output/sdss-m82-slope-preserving-development-1004-r1/references'
    assert (ROOT/recipe['sourceLicense']['path']).read_bytes()==(reference/'LICENSES/Apache-2.0.txt').read_bytes()
    notice=(ROOT/recipe['sourceNotice']['path']).read_text(encoding='utf-8');assert 'Copyright 2024 The Khronos Group, Inc.' in notice and 'Modified' in notice and recipe['sourceCodeCommit'] in notice
    assert 'PBR_Neutral/pbrNeutral.glsl' in (reference/'.reuse/dep5').read_text() and 'Apache-2.0' in (reference/'.reuse/dep5').read_text()
    old_report=doc(ROOT/candidate['sourceConsumers']['path']);old_stars={r['objID']:r for r in old_report['catalogStars']}
    images={};records=[];mutation_changed=0;exact_low=0;scalar=[]
    for row in report['levels']:
        level=row['level'];meta=current['levels'][level];new_meta=candidate['levels'][level]
        for key in ('crop','wcsHeader','fieldDegrees'):assert new_meta[key]==meta[key]
        pin(ROOT/row['savedConsumer']['path'],row['savedConsumer']);pin(ROOT/row['inputConsumer']['path'],row['inputConsumer']);pin(ROOT/row['savedImage']['path'],row['savedImage'])
        with np.load(ROOT/row['inputConsumer']['path'],allow_pickle=False) as source,np.load(ROOT/row['savedConsumer']['path'],allow_pickle=False) as data:
            pre=source['pre_original'];assert np.array_equal(pre,data['pre_rgb']);peak=pre.max(axis=0).astype('f8');low=peak<=.76
            factor=np.ones(peak.shape);high=~low
            # Source specification evaluated directly. No production owner import.
            factor[high]=(1-(1-.76)**2/(peak[high]+1-2*.76))/peak[high]
            expected=pre.astype('f8')*factor;actual=data['mapped_rgb']
            # Rearranging peak+d-k vs peak+1-2k may change float64 by one ULP.
            assert np.allclose(actual,expected,rtol=8*np.finfo('f8').eps,atol=0)
            assert np.array_equal(actual[:,low],pre[:,low].astype('f8')) and (actual>=0).all() and (actual<=1).all()
            known=source['counts']>0;rgb=(actual.transpose(1,2,0)*255).astype('u1');rgb[~known]=0
            old=pre/np.maximum(1,pre.max(axis=0));before=(old.transpose(1,2,0).astype('f8')*255).astype('u1');before[~known]=0
            original=np.asarray(Image.open(CURRENT/meta['file']).convert('RGBA'));saved=np.asarray(Image.open(ROOT/row['savedImage']['path']).convert('RGBA'))
            assert np.array_equal(original[:,:,:3],before) and np.array_equal(rgb,saved[:,:,:3]) and np.array_equal(rgb,data['actual_rgb'])
            for alpha in (data['actual_alpha'],original[:,:,3],saved[:,:,3]):assert np.array_equal(alpha,source['actual_alpha'])
            assert np.array_equal(before[low],rgb[low]);exact_low+=int(low.sum())
            weak=peak<=.1;assert np.array_equal(before[weak],rgb[weak])
            pos=pre.astype('f8')
            for a,b in ((0,1),(0,2),(1,2)):
                left=actual[a]*pos[b];right=actual[b]*pos[a]
                assert (abs(left-right)<=8*np.finfo('f8').eps*np.maximum(abs(left),abs(right))).all()
            plateau=peak>1;unique=int(np.unique(rgb.max(axis=2)[plateau]).size)
            assert unique==row['newSameSubsetMaximumUnique'] and unique>1
            changed=int(np.any(before!=rgb,axis=2).sum());assert changed==row['changedRgbPixels']>0;mutation_changed+=changed
            # Largest real peak is a scalar, so task checks cannot pass merely
            # because payloads are empty or the old recipe remains in effect.
            y,x=np.unravel_index(int(peak.argmax()),peak.shape);p=float(peak[y,x]);mapped=(1-.24*.24/(p+.24-.76))/p if p>.76 else 1
            assert np.allclose(actual[:,y,x],pre[:,y,x].astype('f8')*mapped,rtol=8*np.finfo('f8').eps,atol=0)
            scalar.append({'level':level,'xy':[int(x),int(y)],'actualInputRgb':pre[:,y,x].tolist(),'actualMappedRgb':actual[:,y,x].tolist()})
            # Inversion on high values supplies an additional contract check,
            # not a second transform or science/photometric reconstruction.
            hpeak=actual.max(axis=0)[high];inverted=.76-.24+.24*.24/(1-hpeak)
            assert np.allclose(inverted,peak[high],rtol=64*np.finfo('f8').eps,atol=0)
            records.append({'level':level,'fullRgbAlphaPngExact':True,'sourcePreRgbExact':True,'geometryExact':True,'finiteIntervalExactPixels':int(low.sum()),
                'weakIntervalExactPixels':int(weak.sum()),'oldPlateauSubsetRecoveredMaximumLevels':unique,'oldRecipeMutationChangedPixels':changed,
                'meanBeforeRGB':before.mean(axis=(0,1)).tolist(),'meanAfterRGB':rgb.mean(axis=(0,1)).tolist()});images[level]=(before,rgb)
    stars=[]
    for star in report['catalogStars']:
        assert star['targetXY']==old_stars[star['objID']]['targetXY']
        for level,row in star['levels'].items():
            original_record=old_stars[star['objID']]['levels'][level]
            for key in ('imageCenterXY','boundsXYExclusive'):assert row[key]==original_record[key]
            before,after=images[level];x0,y0,x1,y1=row['boundsXYExclusive'];region=np.s_[y0:y1,x0:x1]
            assert int(before[region].max())==row['oldMaximumChannel'] and int(after[region].max())==row['newMaximumChannel']>0
        stars.append({'objID':star['objID'],'targetXY':star['targetXY'],'peaks':{k:[v['oldMaximumChannel'],v['newMaximumChannel']] for k,v in star['levels'].items()}})
    assert len(stars)==20
    for row in report['comparisons']:pin(ROOT/row['path'],row)
    assert list(pins.values())==[bind(ROOT/r['path']) for r in pins.values()]
    result={'scope':__doc__,'status':'SAVED_FULL_SHOULDER_DISPLAY_BOUNDARY_READBACK','inputs':list(pins.values()),'inputsAfterExact':True,
        'levels':records,'catalogStars':stars,'scalarPeakConsumers':scalar,'finiteIntervalExactPixelsAcrossThreeLevels':exact_low,
        'oldRecipeMutationChangedActualPixels':mutation_changed,'sourceCopyrightLicenseAndModificationNoticeChecked':True,
        'visualObservation':'All3 complete images and all20 saved catalog positions viewed. Weak and finite-low pixels exact; core gradation improved with no prior whole-image dimming. Green strips/grain and full source fidelity/quality remain open.',
        'quality':'UNVERIFIED_COMPLETE_DELIVERY','ordinaryAdoption':False,'independentReview':'MISSING','runtimeAcceptance':False,
        'sourceRequests':0,'fitRepeats':0,'scienceReprocessing':0,'otherBusinessLogicEdited':False,'elapsedSeconds':time.perf_counter()-started}
    save(OUT/'result.json',result);print(json.dumps({k:v for k,v in result.items() if k not in ('inputs','levels','catalogStars','scalarPeakConsumers')},ensure_ascii=False),flush=True)

if __name__=='__main__':
    try:main()
    except Exception as e:
        if OUT.exists() and not (OUT/'failed.json').exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e)})
        raise
