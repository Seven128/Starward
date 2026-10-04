"""Full saved current M82 through one globally consistent display-range trial.

Only level means and RGB are produced. Original science/current estimates,
qualifications, coarse fallback, source epochs, recipe and candidates are pinned.
No source load, noise/PSF fit, coadd/filter, aperture selection or publication.
"""
from pathlib import Path
import sys,json,importlib.util,time,copy
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image,ImageDraw
from astropy.visualization import LuptonAsinhStretch
from sdss_gri_tan import coherent_box_means

def module(name,file):
    spec=importlib.util.spec_from_file_location(name,TASK/'scripts'/file);m=importlib.util.module_from_spec(spec);sys.modules[name]=m;spec.loader.exec_module(m);return m
binding=module('full_range_binding','analyze-m82-fixed-response-shapes-2026-10-04.py');bind,save=binding.bind,binding.save
trial=module('full_range_trial','trial-m82-smooth-range-2026-10-04.py')
resources=module('full_range_memory','experience-shared-noise-display-2026-10-03.py')
OUT=ROOT/'output/sdss-m82-full-smooth-range-1004-r1'

def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    started,cpu=time.perf_counter(),time.process_time();pins={}
    def pin(p,expected=None):
        v=bind(p)
        if expected is not None:assert v==expected
        assert pins.setdefault(v['path'],v)==v;return v
    def doc(p):pin(p);return json.loads(p.read_bytes())
    cp_path=TASK/'evidence/current-execution-state-2026-10-04-r91.json';cp=doc(cp_path)
    assert pins[cp_path.relative_to(ROOT).as_posix()]['sha256']=='383bfc7fd2203fd81f2f45d339174f56f13c0fa56019bb4c4730890ceb854f60'
    for v in cp['currentSources']+cp['protected']+cp['evidence']:assert bind(ROOT/v['path'])==v
    pin(ROOT/'output/sdss-m82-visible-causes-readback-1004-r1/checkpoint-continuity.json')
    for p in (Path(__file__),Path(binding.__file__),Path(trial.__file__),Path(resources.__file__),ROOT/'data-pipelines/deep-sky/sdss_gri_tan.py'):
        pin(p)
    sd=ROOT/'output/sdss-m82-first-science-master-1004-r2/candidate';cd=ROOT/'output/sdss-m82-recovered-complete-1004-r1/candidate'
    science,current=doc(sd/'candidate.json'),doc(cd/'candidate.json');frozen=current['sourceResolvedRecipe']
    assert frozen==science['display']['transfer'] and frozen['stretch']==.2358548697680099 and frozen['Q']==8
    def array(meta,d):
        p=d/meta['file'];v=pin(p);assert (v['bytes'],v['sha256'])==(meta['bytes'],meta['sha256'])
        a=np.load(p,mmap_mode='r',allow_pickle=False);assert list(a.shape)==meta['shape'] and a.dtype.str==meta['dtype'];return a
    estimates={b:array(current['arrays'][b],cd) for b in 'gri'}
    joint=array(science['arrays']['joint-availability'],sd)
    local_dir=ROOT/'output/sdss-m82-smooth-range-trial-1004-r1';local=doc(local_dir/'result.json')
    local_cause=doc(ROOT/'output/sdss-m82-visible-native-display-1004-r2/result.json')
    local_bounds={w['name']:w['boundsXYExclusive'] for w in local_cause['records']}
    catalog=doc(ROOT/'output/sdss-m82-measured-stars-1004-r4/result.json')
    stars=[{'objID':w['objID'],'targetXY':w['targetXY']} for w in catalog['records'] if 'targetSaved' in w]
    assert len(stars)==20
    inputs_before=list(pins.values());save(OUT/'inputs-before.json',inputs_before);levels={};old_images={};new_images={};records=[]
    for lev,meta in current['levels'].items():
        x0,y0,x1,y1=meta['crop']['boundsXYExclusive'];factor=meta['crop']['boxFactor'];region=np.s_[y0:y1,x0:x1]
        means,counts=coherent_box_means({b:estimates[b][region] for b in 'gri'},joint[region],factor);known=counts>0
        v=np.stack([np.where(known,means[b],0).astype('f4') for b in 'irg']);intensity=(v[0]+v[1]+v[2])/3
        with np.errstate(invalid='ignore',divide='ignore'):
            multiplier=np.where(intensity<=0,0,LuptonAsinhStretch(stretch=frozen['stretch'],Q=frozen['Q'])(intensity,clip=False)/intensity)
        pre_rgb=np.maximum(v*multiplier,0)
        floating=trial.smooth_common_range(pre_rgb);rgb=(floating.transpose(1,2,0)*255).astype('u1');rgb[~known]=0
        alpha=np.rint(counts.astype('f8')*255/(factor*factor)).astype('u1')
        original_path=cd/meta['file'];actual=pin(original_path);assert (actual['bytes'],actual['sha256'])==(meta['bytes'],meta['sha256'])
        old=np.asarray(Image.open(original_path).convert('RGBA'));assert np.array_equal(alpha,old[:,:,3])
        file=OUT/('M-82-'+lev.lower()+'.png');Image.fromarray(np.dstack((rgb,alpha))).save(file)
        a_file=OUT/(lev.lower()+'-consumer.npz')
        np.savez_compressed(a_file,g=means['g'].astype('f4'),r=means['r'].astype('f4'),i=means['i'].astype('f4'),counts=counts,
            pre_rgb=pre_rgb,trial_float_rgb=floating,actual_rgb=rgb,actual_alpha=alpha)
        local_checked=[]
        for row in local['records']:
            if row['level']!=lev:continue
            bx0,by0,bx1,by1=local_bounds[row['name']];path=local_dir/(row['name']+'-'+lev+'.npz');pin(path)
            with np.load(path,allow_pickle=False) as z:
                crop=rgb[(by0-y0)//factor:(by1-y0)//factor,(bx0-x0)//factor:(bx1-x0)//factor]
                assert np.array_equal(crop,z['trial_rgb']);local_checked.append(row['name'])
        before_max=pre_rgb.max(axis=0);after_max=rgb.max(axis=2);old_max=old[:,:,:3].max(axis=2)
        normalized=before_max>1;diff=rgb.astype('i2')-old[:,:,:3].astype('i2')
        record={'level':lev,'sourceLevel':copy.deepcopy(meta),'savedImage':bind(file),'savedConsumer':bind(a_file),
            'pixels':known.size,'available':int(known.sum()),'empty':int((~known).sum()),'alphaOriginalExact':True,
            'localPatchConsumersExact':local_checked,'sourceHardNormalizationPixels':int(normalized.sum()),
            'oldAny255':int((old_max==255).sum()),'trialAny255':int((after_max==255).sum()),
            'oldHardNormalizedSubsetMaximumUniqueValues':int(len(np.unique(old_max[normalized]))),
            'trialSameSubsetMaximumUniqueValues':int(len(np.unique(after_max[normalized]))),
            'changedRgbPixels':int(np.any(diff!=0,axis=2).sum()),'maximumChannelDelta':int(abs(diff).max()),
            'meanCurrentRGB':old[:,:,:3].astype('f8').mean(axis=(0,1)).tolist(),'meanTrialRGB':rgb.astype('f8').mean(axis=(0,1)).tolist(),
            'meanQuantity':'Means of existing display estimates in nMgy/native-pixel; not newly measured science/photometry.',
            'sourceResolvedRecipeUnchanged':copy.deepcopy(frozen),'trialRange':'C/(1+max(C)); same global formula at all scales after original frozen asinh; no local parameter or new statistical fit.'}
        records.append(record);old_images[lev]=old[:,:,:3];new_images[lev]=rgb
        levels[lev]={'file':file.name,'bytes':record['savedImage']['bytes'],'sha256':record['savedImage']['sha256'],
            'pixels':512,'fieldDegrees':meta['fieldDegrees'],'crop':copy.deepcopy(meta['crop']),'wcsHeader':copy.deepcopy(meta['wcsHeader']),
            'displayOnly':True,'sourceResolvedRecipe':copy.deepcopy(frozen),'rangeCompressionVersion':'max-channel-smooth-asinh-display-trial-v1'}
        save(OUT/(lev.lower()+'-progress.json'),record)
    comparisons=[]
    for lev in levels:
        sheet=Image.new('RGB',(1024,544),(16,16,16));draw=ImageDraw.Draw(sheet)
        sheet.paste(Image.fromarray(old_images[lev]),(0,32));sheet.paste(Image.fromarray(new_images[lev]),(512,32))
        draw.text((5,5),'M82 '+lev+' current (original frozen)',fill='white');draw.text((517,5),'M82 '+lev+' smooth-range TRIAL',fill='white')
        p=OUT/(lev.lower()+'-actual-comparison.png');sheet.save(p);comparisons.append(bind(p))
    # All currently qualified catalog positions are shown where inside each
    # level. These stamps do not certify every star or absolute registration.
    star_records=[];sheet=Image.new('RGB',(1152,144*len(stars)),(16,16,16));draw=ImageDraw.Draw(sheet)
    for index,star in enumerate(stars):
        row={'objID':star['objID'],'targetXY':star['targetXY'],'levels':{}}
        for at,(lev,meta) in enumerate(current['levels'].items()):
            x0,y0,x1,y1=meta['crop']['boundsXYExclusive'];factor=meta['crop']['boxFactor'];x,y=star['targetXY']
            if not (x0<=x<x1 and y0<=y<y1):continue
            # Centre conversion follows target pixel-cell footprints; no shift
            # of source coordinates or relative-band registration is fitted.
            cx=(x-x0+.5)/factor-.5;cy=(y-y0+.5)/factor-.5;ix,iy=int(round(cx)),int(round(cy))
            bx0,by0,bx1,by1=max(0,ix-5),max(0,iy-5),min(512,ix+6),min(512,iy+6)
            region=np.s_[by0:by1,bx0:bx1];old,new=old_images[lev][region],new_images[lev][region]
            row['levels'][lev]={'imageCenterXY':[cx,cy],'boundsXYExclusive':[bx0,by0,bx1,by1],
                'oldMaximumChannel':int(old.max()),'trialMaximumChannel':int(new.max()),
                'oldRGBPeakAtMaximumSum':old.reshape(-1,3)[old.astype('i4').sum(axis=2).argmax()].tolist(),
                'trialRGBPeakAtMaximumSum':new.reshape(-1,3)[new.astype('i4').sum(axis=2).argmax()].tolist()}
            for col,(label,img) in enumerate((('current',old),('TRIAL',new))):
                x=at*384+col*192;sheet.paste(Image.fromarray(img).resize((132,132),Image.Resampling.NEAREST),(x,index*144+12))
                draw.text((x+3,index*144),f'{index+1} {lev} {label}',fill='white')
        star_records.append(row)
    p=OUT/'all-qualified-catalog-star-stamps.png';sheet.save(p);comparisons.append(bind(p))
    manifest={'version':'max-channel-smooth-asinh-display-trial-v1','objectRef':'M:82','center':science['center'],
        'orientation':science['orientation'],'scienceCandidate':pin(sd/'candidate.json'),'currentCandidate':pin(cd/'candidate.json'),
        'levels':levels,'sourceResolvedRecipe':frozen,'trialReference':trial.REFERENCE,'scope':'Display trial only; no ordinary registry/publication or science correction.',
        'quality':'UNVERIFIED','adopted':False,'independentReview':'MISSING'}
    save(OUT/'candidate.json',manifest)
    inputs_after=[bind(ROOT/v['path']) for v in pins.values()];assert inputs_after==list(pins.values())
    report={'scope':__doc__,'checkpoint':pin(cp_path),'inputsBefore':list(pins.values()),'inputsAfterExact':True,'levels':records,
        'catalogStars':star_records,'comparisons':comparisons,'trialCandidate':bind(OUT/'candidate.json'),
        'elapsedSeconds':time.perf_counter()-started,'cpuSeconds':time.process_time()-cpu,'memory':resources.memory(),
        'originalScientificArrayOrCurrentEstimateOrQualificationChanges':False,'sourceRequests':0,'nativeSourceReads':0,
        'wholeVarianceFitsCoaddFilterOrRadiusSelectionRuns':0,'newStatisticalFitCalls':0,'ordinaryAdoption':False,
        'quality':'UNVERIFIED_COMPLETE_THREE_LOD_DISPLAY_CANDIDATE_ONLY','independentReview':'MISSING','otherBusinessLogicEdited':False}
    save(OUT/'result.json',report);print(json.dumps({k:v for k,v in report.items() if k not in ('inputsBefore','levels','catalogStars')}),flush=True)
if __name__=='__main__':
    try:main()
    except Exception as e:
        if OUT.exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e)})
        raise
