"""One mature-paper bright-SAT display-colour trial on actual qualified borders."""
import copy,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22';sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image,ImageDraw
from astropy.visualization import make_lupton_rgb
from image_quality import digest,write_report
from sdss_gri_tan import BANDS,GriMaster,ProjectedBand,target_tan
from sdss_noise_display import _display_estimate_products
VERSION='sdss-qualified-lupton-bright-sat-colour-trial-v1'
o=ROOT/'output/sdss-bright-sat-colour-trial-1003-r1';o.mkdir(exist_ok=False);(o/'executed-script.py').write_bytes(Path(__file__).read_bytes());paths=[Path(__file__),ROOT/'data-pipelines/deep-sky/sdss_noise_display.py',ROOT/'data-pipelines/deep-sky/sdss_gri_tan.py']
def bind(p):
    raw=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':digest(raw)}
def doc(relative,pin):
    p=ROOT/relative;assert bind(p)['sha256']==pin;paths.append(p);return json.loads(p.read_bytes()),p.parent
def arr(m,base):
    p=base/m['file'];assert bind(p)['sha256']==m['sha256'];paths.append(p);return np.load(p,mmap_mode='r',allow_pickle=False)
q,qb=doc('output/sdss-bright-saturation-qualification-1003-r2/result.json','42aee0dd268f017cf3307cf641ee1eb5e676ef035781f4d3335a217348f0d739')
c,cb=doc('output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json','73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52')
r,rb=doc('output/shared-flag-display-recovery-1003-r2/candidate/candidate.json','46d4ac28173962d52d09c575f0559959644292fdd9582e80c5a73962f5ce0d76')
for m in json.loads((qb/'inputs-after.json').read_bytes()):assert bind(ROOT/m['path'])==m;paths.append(ROOT/m['path'])
for m in json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes()):assert bind(ROOT/m['path'])['sha256']==m['sha256'];paths.append(ROOT/m['path'])
joint=arr(c['arrays']['joint-availability'],cb);old={b:arr(r['arrays'][b],rb) for b in BANDS};values={b:v.copy() for b,v in old.items()};mask=np.zeros(joint.shape,dtype=bool)
bands={b:ProjectedBand(arr(c['arrays'][b+'-science'],cb),arr(c['arrays'][b+'-footprint'],cb),arr(c['arrays'][b+'-finite-neighbors'],cb),c['science']['perBand'][b]) for b in BANDS}
report=copy.deepcopy(c);report['display']['transfer']=copy.deepcopy(r['sourceResolvedRecipe']);master=GriMaster(target_tan(c['center'],c['pixels'],c['fieldDegrees']),bands,joint,np.empty((0,0,3),dtype=np.uint8),report)
before=[bind(p) for p in paths];write_report(o/'inputs-before.json',before);recipe=r['sourceResolvedRecipe']
def float_rgb(data):
    return make_lupton_rgb(data['i'].astype(np.float32),data['r'].astype(np.float32),data['g'].astype(np.float32),minimum=0,stretch=recipe['stretch'],Q=recipe['Q'],output_dtype=np.float64)
records=[];tiles=[]
for comp in q['components']:
    if not comp['fullRingQualification']:
        records.append({'sourceBounds':comp['boundsXYExclusive'],'replacedPixels':0,'reason':'Unknown/flagged touching border; keep original; no arbitrary radius expansion.'});continue
    ring=np.asarray(comp['ringPositionsXY'],dtype=int);x,y=ring.T;border_rgb=float_rgb({b:old[b][y,x].reshape(1,-1) for b in BANDS}).reshape(-1,3)
    intensity=border_rgb.sum(axis=1)
    if not (intensity>0).all():
        records.append({'sourceBounds':comp['boundsXYExclusive'],'replacedPixels':0,'reason':'Valid black cannot define colour; keep original, not absent science.'});continue
    # A colour is a projective RGB ratio. Average each actual touching sample's
    # RGB/sum RGB (Eq2 common-intensity scalar cancels), not its brightness.
    colour=(border_rgb/intensity[:,None]).mean(axis=0);assert abs(float(colour.sum())-1)<1e-12
    core=np.asarray(comp['corePositionsXY'],dtype=int);xx,yy=core.T
    core_i=sum(old[b][yy,xx].astype(float) for b in BANDS)/3
    assert (core_i>q['actualLuptonIntensityUpper']).all();mask[yy,xx]=True
    for b,ch in [('i',0),('r',1),('g',2)]:values[b][yy,xx]=(3*core_i*colour[ch]).astype(np.float32)
    after_i=sum(values[b][yy,xx].astype(float) for b in BANDS)/3
    before_rgb=float_rgb({b:old[b][yy,xx].reshape(1,-1) for b in BANDS}).reshape(-1,3)
    after_rgb=float_rgb({b:values[b][yy,xx].reshape(1,-1) for b in BANDS}).reshape(-1,3)
    assert np.array_equal(before_rgb.max(axis=1),after_rgb.max(axis=1))
    assert np.allclose(after_i,core_i,rtol=2*np.finfo(np.float32).eps,atol=0)
    records.append({'sourceBounds':comp['boundsXYExclusive'],'replacedPixels':len(core),'qualifiedTouchingSamples':len(ring),'meanActualNormalizedRgbColour':colour.tolist(),
        'beforeMeanRgbColour':(before_rgb/before_rgb.sum(axis=1)[:,None]).mean(axis=0).tolist(),'maximumRawDisplayIntensityChange':float(np.abs(after_i-core_i).max()),
        'originalFloatRgbMaximumExact':True,'colourMeaning':'Neighbour-normalized display ratio, not recovered photometry, PSF/temporal/physical true colour.'})
# Verify unchanged outside bright selected cores, including low-brightness SAT
# trails and the two unqualified bright cores, all availability and source data.
for b in BANDS:assert np.array_equal(values[b][~mask],old[b][~mask],equal_nan=True)
old_levels=_display_estimate_products(master,old,c,512,r['version']);new_levels=_display_estimate_products(master,values,c,512,VERSION);levels={}
for level,(raw,meta) in new_levels.items():
    baseline_path=rb/r['levels'][level]['file'];assert old_levels[level][0]==baseline_path.read_bytes();paths.append(baseline_path)
    im=np.asarray(Image.open(__import__('io').BytesIO(raw)));prior=np.asarray(Image.open(baseline_path));assert np.array_equal(im[:,:,3],prior[:,:,3])
    path=o/(level.lower()+'-trial.png');path.write_bytes(raw);levels[level]={'actual':bind(path),'originalAlphaExact':True,'baselineBytesExact':True,'changedRgbPixels':int(np.any(im[:,:,:3]!=prior[:,:,:3],axis=2).sum()),'metadata':meta}
for b in BANDS:np.save(o/(b+'-display-estimates.npy'),values[b],allow_pickle=False)
np.save(o/'bright-sat-colour-supply.npy',mask,allow_pickle=False)
for comp in q['components']:
    x0,y0,x1,y1=comp['boundsXYExclusive'];cx=(x0+x1)//2;cy=(y0+y1)//2;x0=max(0,min(1984,cx-32));y0=max(0,min(1984,cy-32));crop=(slice(y0,y0+64),slice(x0,x0+64));imgs=[]
    for v in (old,values):
        rgb=float_rgb({b:v[b][crop] for b in BANDS});rgb=(rgb*255).astype(np.uint8);imgs.append(Image.fromarray(rgb).resize((256,256),Image.Resampling.NEAREST))
    tiles.append((imgs,(x0,y0),int(mask[crop].sum())))
sheet=Image.new('RGB',(512,len(tiles)*284),(20,20,20));draw=ImageDraw.Draw(sheet)
for at,(imgs,origin,count) in enumerate(tiles):
    draw.text((4,at*284+4),f'{origin} actual old / qualified neighbour colour, {count} pixels',fill='white')
    for col,img in enumerate(imgs):sheet.paste(img,(col*256,at*284+24))
sheet.save(o/'actual-sat-colour-pairs.png')
after=[bind(ROOT/m['path']) for m in before];write_report(o/'inputs-after.json',after);assert before==after
result={'scope':__doc__,'processingVersion':VERSION,'qualification':bind(qb/'result.json'),'parentDisplay':bind(rb/'candidate.json'),'recipeUnchanged':True,
    'selectedPixels':int(mask.sum()),'components':records,'levels':levels,'actualComparison':bind(o/'actual-sat-colour-pairs.png'),
    'unchangedOutsideSelected':True,'lowBrightnessTrailsAndUnqualifiedOriginalKept':True,'originalScienceAndAvailabilityKept':True,'protectedAndInputsExact':True,
    'fitRuns':0,'filterRuns':0,'sourceRequests':0,'quality':'UNVERIFIED','adopted':False,'independentReview':'MISSING'}
write_report(o/'result.json',result);print(json.dumps({k:v for k,v in result.items() if k not in ('scope','levels')}));print(json.dumps({k:{x:v[x] for x in ('actual','changedRgbPixels','originalAlphaExact')} for k,v in levels.items()}))
