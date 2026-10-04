"""Saved actual M82 responses: distinguish aperture/cohort changes from f32 rounding.

Only reads saved responses. Common signed scales are diagnostic colors, not sky
RGB or the frozen publication recipe. Does not fit, resample or process sources.
"""
from pathlib import Path
import hashlib,json,sys,time
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from PIL import Image,ImageDraw
SOURCE=ROOT/'output/sdss-m82-fixed-display-response-1004-r1'
OUT=ROOT/'output/sdss-m82-fixed-response-shapes-1004-r1'

def bind(path):
    digest=hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda:stream.read(1024*1024),b''):digest.update(block)
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':path.stat().st_size,'sha256':digest.hexdigest()}

def save(path,value):
    with path.open('x',encoding='utf-8',newline='\n') as stream:json.dump(value,stream,ensure_ascii=False,indent=2)

def signed_panel(values,known,targets,bounds,scale):
    x0,y0,x1,y1=bounds;pixels=np.zeros((y1-y0,x1-x0,3),np.uint8)
    y,x=targets.T;y=y-y0;x=x-x0
    relative=np.clip(np.nan_to_num(values/scale,nan=0),-1,1)
    positive=np.maximum(relative,0);negative=np.maximum(-relative,0)
    # Same linear zero-centered color map, including signed negative values.
    rgb=np.stack((positive*255,positive*190+negative*120,negative*255),axis=1)
    rgb=np.rint(rgb).astype(np.uint8);rgb[~known]=(255,0,255)
    pixels[y,x]=rgb
    return Image.fromarray(pixels).resize((108,108),Image.Resampling.NEAREST)

def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    started=time.perf_counter();source=json.loads((SOURCE/'result.json').read_bytes())
    pins=[bind(Path(__file__)),bind(SOURCE/'result.json'),bind(ROOT/'output/sdss-m82-fixed-display-response-readback-1004-r2/result.json')]
    reader=json.loads((ROOT/pins[-1]['path']).read_bytes());assert reader['actualLocations']==146
    rows=[];figures=[];panels=[]
    for record in source['records']:
        path=ROOT/record['arrays']['path'];assert bind(path)==record['arrays'];pins.append(record['arrays'])
        with np.load(path,allow_pickle=False) as z:
            target=z['targets_yx'];y,x=target.T;r=z['current_radius'];supply=z['alternative_supply'][y,x]
            raw=z['raw_unit_model'][:,y,x];raw_known=z['raw_unit_known'][:,y,x]
            fixed=z['fixed_unit_response'];known=z['fixed_unit_known'];old=z['target_saved_science_unit']
            sci=z['target_science'];actual=z['fixed_actual_estimates'];global_targets=z['target_global_yx']
        raw_branch=r<=0;aperture=r>0
        np.testing.assert_array_equal(fixed[:,raw_branch],raw[:,raw_branch])
        np.testing.assert_array_equal(known[:,raw_branch],raw_known[:,raw_branch])
        both=known&raw_known;aperture_delta=np.where(both,fixed-raw,0)
        changed=both&(fixed!=raw);assert not changed[:,raw_branch].any()
        compare=known&np.isfinite(old);cast=fixed.astype(np.float32)
        saved_change=compare&(cast!=old)
        nonsupply_raw=compare&(raw_branch&~supply)[None]
        assert not (saved_change&nonsupply_raw).any()
        rounding=compare&(fixed!=old.astype(float))&~saved_change
        groups={}
        for label,mask in (('rawNoAlternative',raw_branch&~supply),('rawAlternative',raw_branch&supply),
                ('apertureNoAlternativeCentre',aperture&~supply),('apertureAlternativeCentre',aperture&supply)):
            groups[label]={'targetOccurrences':int(mask.sum()),'jointKnownBandTargets':int(compare[:,mask].sum()),
                'savedF32ToFixedF32ChangedBandTargets':int(saved_change[:,mask].sum()),
                'f64VersusF32OnlyBandTargets':int(rounding[:,mask].sum()),
                'fixedVersusSameCohortRawF64ChangedBandTargets':int(changed[:,mask].sum()),
                'unknownFixedBandTargets':int((~known[:,mask]).sum())}
        row={'index':record['index'],'material':record['material'],'coreTargets':len(r),'groups':groups,
            'sameCohortRawF64ToFixedF64ChangedBandTargets':int(changed.sum()),
            'sameCohortMaximumApertureResponseDifference':float(np.max(np.abs(aperture_delta))),
            'savedScienceF32ToFixedF32ChangedBandTargets':int(saved_change.sum()),
            'f64VersusF32OnlyBandTargets':int(rounding.sum()),'unknownFixedBandTargets':int((~known).sum()),
            'limits':'Group alternative labels classify only the target centre. Apertures can contain alternative-source neighbors. No independence/PSF adequacy/flux acceptance implied.'}
        # One common actual-data scale and one common unit scale per row; delta
        # explicitly shares the unit scale, so roundoff is not auto-amplified.
        science_scale=float(np.max(np.abs(np.concatenate((sci[1],actual[1])))))
        unit_values=np.concatenate((old[1][np.isfinite(old[1])],fixed[1][known[1]]))
        unit_scale=float(np.max(np.abs(unit_values))) if len(unit_values) else 0
        row['commonActualRScaleNmgy']=science_scale;row['commonUnitRScaleRelative']=unit_scale
        if len(panels)==0:sheet=Image.new('RGB',(800,144*min(10,146-len(rows))),'#181818');draw=ImageDraw.Draw(sheet)
        at=len(panels)*144
        draw.text((2,at),f'{record["index"]} {record["material"]["id"]}  SCI/current nMgy +/-{science_scale:.5g}; unit/delta +/-{unit_scale:.5g}',fill='white')
        draw.text((2,at+13),'actual science | actual current | science unit | fixed unit | fixed-science (same unit scale)',fill='white')
        values=(sci[1],actual[1],old[1],fixed[1],fixed[1]-old[1])
        validity=(np.isfinite(sci[1]),np.isfinite(actual[1]),np.isfinite(old[1]),known[1],compare[1])
        for col,(v,k) in enumerate(zip(values,validity)):
            scale=science_scale if col<2 else unit_scale
            sheet.paste(signed_panel(v,k,global_targets,record['targetBoundsXYExclusive'],scale if scale>0 else 1),(col*155,at+29))
        rows.append(row);panels.append(record['index'])
        if len(panels)==10 or len(rows)==146:
            file=OUT/f'common-signed-scales-{len(figures)+1}.png';sheet.save(file);figures.append(bind(file));panels=[]
    assert pins==[bind(ROOT/v['path']) for v in pins];save(OUT/'inputs-before-and-after.json',pins)
    totals={name:sum(v[name] for v in rows) for name in ('coreTargets','sameCohortRawF64ToFixedF64ChangedBandTargets',
        'savedScienceF32ToFixedF32ChangedBandTargets','f64VersusF32OnlyBandTargets','unknownFixedBandTargets')}
    grouped={label:{key:sum(v['groups'][label][key] for v in rows) for key in rows[0]['groups'][label]} for label in rows[0]['groups']}
    report={'scope':__doc__,'actualLocations':len(rows),'totals':totals,'groups':grouped,'records':rows,'images':figures,
        'rawBranchF64Exact':True,'rawNoAlternativeF32ScienceExact':True,'elapsedSeconds':time.perf_counter()-started,
        'scienceUnitDeltaRoundingSeparated':True,'imageColors':'Diagnostic signed linear orange positive/blue negative/black untargeted or exact zero/magenta unknown; separate actual nMgy and relative-unit common scales per row; delta shares unit scale. Not published sky RGB.',
        'processPeak':'UNMEASURED','sourceRequestsOrReprojectionOrVarianceOrFitOrFilterCoaddOrCorrections':False,
        'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
    save(OUT/'result.json',report);print(json.dumps({k:report[k] for k in ('actualLocations','totals','groups','elapsedSeconds')}),flush=True)

if __name__=='__main__':main()
