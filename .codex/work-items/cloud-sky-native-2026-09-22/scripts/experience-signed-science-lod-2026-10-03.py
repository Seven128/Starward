"""Compare signed-science averaging before a fixed display transfer with RGB box.

Cached source/crop/transfer only; no sky fit, mask, source acquisition or adoption.
"""
from pathlib import Path
import hashlib
import json
import sys
ROOT=Path(__file__).resolve().parents[4]
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image,ImageDraw
from astropy.visualization import ManualInterval,LuptonAsinhStretch,make_lupton_rgb
import sdss_gri_tan as owner
SOURCE=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2'
PREVIOUS=ROOT/'output/sdss-m51-global-transfer-1002'
OUT=ROOT/'output/signed-science-lod-1003-r1'
def bind(p):
    h=hashlib.sha256()
    with p.open('rb') as stream:
        while block:=stream.read(1024*1024):h.update(block)
    return {'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':h.hexdigest()}
def save_array(p,array):
    with p.open('xb') as stream:np.save(stream,array,allow_pickle=False)
    return {**bind(p),'shape':list(array.shape),'dtype':array.dtype.str}
def composited(rgb,background):
    rgba=owner.encoded_contribution_rgba(rgb,np.ones(rgb.shape[:2],dtype=np.bool_))
    alpha=rgba[:,:,3:4].astype(np.float64)/255
    return np.rint(rgba[:,:,:3]*alpha+np.array(background)*(1-alpha)).astype(np.uint8)
def corner_stats(rgb):
    corners=np.concatenate([rgb[:64,:64].reshape(-1,3),rgb[:64,-64:].reshape(-1,3),
        rgb[-64:,:64].reshape(-1,3),rgb[-64:,-64:].reshape(-1,3)])
    return {'pixelRegion':'four 64px corners, diagnostic regions, not qualified empty sky',
        'meanChannels':corners.mean(axis=0).tolist(),'maxChannelMedian':float(np.median(corners.max(axis=1))),
        'allBlackPixels':int((corners.max(axis=1)==0).sum())}
candidate_path=SOURCE/'candidate.json';previous_path=PREVIOUS/'result.json'
assert bind(candidate_path)['sha256']=='73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52'
assert bind(previous_path)['sha256']=='3878ac009819d182c5399cc4f8dca8ece460b9aa15c068d4b46bbcb015e0c068'
candidate=json.loads(candidate_path.read_bytes());previous=json.loads(previous_path.read_bytes())
variant=previous['variants']['docs-05-q10']
assert (variant['stretch'],variant['Q'])==(.5,10) and variant['scienceCorrection'].startswith('NONE')
names=['joint-availability']+[f'{band}-science' for band in owner.BANDS]
paths=[Path(__file__),Path(owner.__file__),candidate_path,previous_path]
paths += [SOURCE/candidate['arrays'][name]['file'] for name in names]
paths += [ROOT/variant['rgbMaster']['path']]+[ROOT/meta['actualFile']['path'] for meta in variant['levels'].values()]
protection=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'
protected=json.loads(protection.read_bytes());paths += [protection]+[ROOT/row['path'] for row in protected]
before=[bind(p) for p in paths]
for row in protected:assert bind(ROOT/row['path'])['sha256']==row['sha256']
arrays={}
for name in names:
    meta=candidate['arrays'][name];p=SOURCE/meta['file'];bound=bind(p)
    assert (bound['bytes'],bound['sha256'])==(meta['bytes'],meta['sha256'])
    arrays[name]=np.load(p,mmap_mode='r',allow_pickle=False)
    assert list(arrays[name].shape)==meta['shape'] and arrays[name].dtype.str==meta['dtype']
joint=arrays['joint-availability'];assert joint.dtype==np.bool_ and joint.shape==(2048,2048) and joint.all()
master_meta=variant['rgbMaster'];rgb_master_path=ROOT/master_meta['path']
assert bind(rgb_master_path)['sha256']==master_meta['sha256']
rgb_master=np.load(rgb_master_path,mmap_mode='r',allow_pickle=False)
assert rgb_master.shape==(2048,2048,3) and rgb_master.dtype==np.uint8
OUT.mkdir();(OUT/'inputs-before.json').write_text(json.dumps(before,indent=2)+'\n')
(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
records=[]
for level,meta in variant['levels'].items():
    old_path=ROOT/meta['actualFile']['path'];assert bind(old_path)['sha256']==meta['sha256']
    old=np.array(Image.open(old_path).convert('RGBA'))
    x0,y0,x1,y1=meta['masterCrop']['boundsXYExclusive'];factor=meta['masterCrop']['boxFactor']
    assert (x1-x0,y1-y0)==(512*factor,512*factor)
    assert np.array_equal(old,owner.premultiplied_box(rgb_master[y0:y1,x0:x1],joint[y0:y1,x0:x1],factor))
    coarse={};band_records={}
    for band in owner.BANDS:
        original=arrays[f'{band}-science'][y0:y1,x0:x1]
        assert np.isfinite(original).all()
        signed=original.reshape(512,factor,512,factor).mean(axis=(1,3),dtype=np.float64)
        error=float(signed.sum(dtype=np.float64)*factor*factor-original.sum(dtype=np.float64))
        assert abs(error)<1e-7
        coarse[band]=signed.astype(np.float32)
        band_records[band]={'signedMeanArray':save_array(OUT/f'{level.lower()}-{band}-signed-mean.npy',signed),
            'sourceNegativeSamples':int((original<0).sum()),'coarseNegativeSamples':int((signed<0).sum()),
            'sumConservationErrorBeforeDisplay':error,
            'quantity':'mean source nanomaggies/native-pixel across target samples, not flux summed per coarse output pixel or new calibration'}
    rgb=make_lupton_rgb(coarse['i'],coarse['r'],coarse['g'],interval=ManualInterval(vmin=0,vmax=None),
        stretch_object=LuptonAsinhStretch(stretch=.5,Q=10),output_dtype=np.uint8)
    rgba=np.dstack([rgb,old[:,:,3]]);assert (rgba[:,:,3]==255).all()
    if factor==1:assert np.array_equal(rgba,old)
    Image.fromarray(rgba).save(OUT/f'{level.lower()}-signed-first.png')
    panels=Image.new('RGB',(1024,1088));draw=ImageDraw.Draw(panels)
    for row,background in enumerate(([0,0,0],[3,7,16])):
        y=32+row*544
        draw.text((4,y-25),f'{level} cached RGB box; background={background}',fill='white')
        draw.text((516,y-25),f'{level} signed science box then SAME .5/Q10',fill='white')
        panels.paste(Image.fromarray(composited(old[:,:,:3],background)),(0,y))
        panels.paste(Image.fromarray(composited(rgb,background)),(512,y))
    panels.save(OUT/f'{level.lower()}-comparison.png')
    delta=np.abs(rgb.astype(np.int16)-old[:,:,:3].astype(np.int16))
    records.append({'level':level,'crop':meta['masterCrop'],'fieldDegrees':meta['fieldDegrees'],'wcsHeader':meta['wcsHeader'],
        'bands':band_records,'alphaUnchanged':True,'statisticalFitCalls':0,'skyCorrections':0,
        'rgbChangedPixels':int(delta.max(axis=2).astype(bool).sum()),'rgbMaxDelta':int(delta.max()),
        'oldCorners':corner_stats(old[:,:,:3]),'newCorners':corner_stats(rgb),
        'png':bind(OUT/f'{level.lower()}-signed-first.png'),'comparison':bind(OUT/f'{level.lower()}-comparison.png')})
assert before==[bind(p) for p in paths]
(OUT/'inputs-after.json').write_text(json.dumps(before,indent=2)+'\n')
result={'status':'SIGNED_SCIENCE_LOD_ORDER_COMPARISON_NOT_ADOPTED','inputsBeforeAfterExact':True,
    'networkRequests':0,'sourceReprojectionCalls':0,'records':records,
    'fixedDisplayRecipe':{'source':variant['selection'],'stretch':.5,'Q':10,'intervalMinimum':0,'rgbBands':['i','r','g'],
        'statistics':'NONE; frozen common recipe across all levels, no per-level fit'},
    'meaning':'One cached coherent signed science master with unchanged center/crops/fields. Scientific means precede fixed nonlinear RGB/clipping instead of averaging clipped encoded master. Alpha only unchanged complete availability; comparison uses existing encoded-display contribution helper, not linear radiance or native Scene. Noise, color, weak extent, PSF and publication/consumer/quality acceptance remain separate; original source/RGB/LOD/publications not rewritten.'}
(OUT/'result.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'result':bind(OUT/'result.json'),'levels':[{key:r[key] for key in ('level','rgbChangedPixels','rgbMaxDelta','oldCorners','newCorners')} for r in records]}))
