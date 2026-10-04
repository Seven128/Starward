"""Task-only Gaussian colour trial; original encoded max channel stays exact.

This is a display experiment, not PSF matching, denoised science or a v3 recipe.
Use only complete-joint patches plus a real source halo, no interpolation of gaps.
"""
from pathlib import Path
import hashlib
import json
import sys
ROOT=Path(__file__).resolve().parents[4]
sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from PIL import Image,ImageDraw
import astropy
from astropy.convolution import Gaussian2DKernel,convolve
from astropy.visualization import ManualInterval,LuptonAsinhStretch,make_lupton_rgb
OUT=ROOT/'output/science-chroma-trial-1003-r1';assert not OUT.exists();OUT.mkdir()
SOURCE=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2'
PUBLICATION=ROOT/'output/frozen-zscale-publication-1003-r1/manifest.json'
REFERENCE=ROOT/'output/sdss-m51-shared-transfer-1002/global-zscale-q8/rgb-master.npy'
def bind(path):
    data=Path(path).read_bytes()
    return {'path':Path(path).relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
def save(name,value):
    with (OUT/name).open('x',encoding='utf-8') as stream:json.dump(value,stream,ensure_ascii=False,indent=2,allow_nan=False);stream.write('\n')
assert bind(SOURCE/'candidate.json')['sha256']=='73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52'
assert bind(PUBLICATION)['sha256']=='8679b44e97e4b51a6893239d49db1b3931ac12b79c9692d91086f5190f9f0368'
assert bind(REFERENCE)['sha256']=='3073421521ca303701a5a5c5090753f6e43a00034d022838080dad66d791d4b6'
c=json.loads((SOURCE/'candidate.json').read_bytes());p=json.loads(PUBLICATION.read_bytes());recipe=p['master']['transfer']['recipe']
science={b:np.load(SOURCE/(b+'-science.npy'),mmap_mode='r',allow_pickle=False) for b in 'gri'}
for b in 'gri':assert bind(SOURCE/(b+'-science.npy'))['sha256']==c['arrays'][b+'-science']['sha256']
joint=np.load(SOURCE/'joint-availability.npy',mmap_mode='r',allow_pickle=False)
original=np.load(REFERENCE,mmap_mode='r',allow_pickle=False)
kernel=Gaussian2DKernel(1,x_size=9,y_size=9)
assert kernel.array.shape==(9,9) and abs(kernel.array.sum()-1)<1e-15
paths=[Path(__file__),SOURCE/'candidate.json',PUBLICATION,REFERENCE,SOURCE/'joint-availability.npy',
       *(SOURCE/(b+'-science.npy') for b in 'gri'),Path(sys.modules['astropy.convolution.convolve'].__file__),
       ROOT/'output/science-colour-width-1003-r1/result.json']
protected=json.loads((ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
for row in protected:assert bind(ROOT/row['path'])['sha256']==row['sha256'];paths.append(ROOT/row['path'])
before=[bind(path) for path in paths];save('inputs-before.json',before)
(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
def rgb(bands):
    with np.errstate(invalid='ignore',divide='ignore'):
        return make_lupton_rgb(bands['i'],bands['r'],bands['g'],interval=ManualInterval(vmin=0,vmax=None),
            stretch_object=LuptonAsinhStretch(stretch=recipe['stretch'],Q=recipe['Q']),output_dtype=np.uint8)
def filter_colours(bands,old,halo):
    # Entire supplied halo must exist. No missing/partial-data treatment here.
    assert all(np.isfinite(v).all() for v in bands.values())
    blurred={b:convolve(v.astype(np.float64),kernel,boundary='extend',normalize_kernel=True,
        nan_treatment='fill',preserve_nan=True) for b,v in bands.items()}
    smooth=rgb(blurred)
    if halo:smooth=smooth[halo:-halo,halo:-halo]
    peak=old.max(axis=2);colour_peak=smooth.max(axis=2)
    adjusted=np.zeros_like(old)
    valid=colour_peak>0
    adjusted[valid]=np.rint(smooth[valid].astype(np.float64)*peak[valid,None]/colour_peak[valid,None]).astype(np.uint8)
    fallback=~valid & (peak>0)
    adjusted[fallback]=old[fallback]
    assert np.array_equal(adjusted.max(axis=2),peak)
    assert not adjusted[peak==0].any()
    return adjusted,int(fallback.sum())
def chroma_scatter(image):
    red_green=image[:,:,0].astype(np.float64)-image[:,:,1]
    blue_green=image[:,:,2].astype(np.float64)-image[:,:,1]
    return {'redMinusGreenStd':float(red_green.std()),'blueMinusGreenStd':float(blue_green.std()),
            'meanRGB':image.mean(axis=(0,1)).tolist(),
            'meaning':'Encoded display differences; not calibrated colour/noise variance.'}
records=[]
for name,bounds in [('detail',[768,768,1280,1280]),('outer',[1936,1968,2000,2032]),
                    ('foreground-2',[1219,1364,1284,1429])]:
    x0,y0,x1,y1=bounds;halo=4
    assert joint[y0-halo:y1+halo,x0-halo:x1+halo].all()
    bands={b:science[b][y0-halo:y1+halo,x0-halo:x1+halo] for b in 'gri'}
    old=np.array(original[y0:y1,x0:x1],copy=True)
    # Actual original reference must be reproducible with the frozen map.
    assert np.array_equal(old,rgb({b:v[halo:-halo,halo:-halo] for b,v in bands.items()}))
    trial,fallback=filter_colours(bands,old,halo)
    Image.fromarray(old).save(OUT/(name+'-original.png'));Image.fromarray(trial).save(OUT/(name+'-chroma.png'))
    delta=np.abs(trial.astype(np.int16)-old)
    records.append({'name':name,'masterBoundsXYExclusive':bounds,'haloPixels':halo,
        'original':bind(OUT/(name+'-original.png')),'trial':bind(OUT/(name+'-chroma.png')),
        'originalEncodedChroma':chroma_scatter(old),'trialEncodedChroma':chroma_scatter(trial),
        'changedPixels':int(np.any(delta>0,axis=2).sum()),'maxChannelDifference':int(delta.max()),
        'maxChannelImageByteExact':True,'fallbackPixels':fallback})
    if name=='detail':
        sheet=Image.new('RGB',(1024,540),'#101010');sheet.paste(Image.fromarray(old),(0,28));sheet.paste(Image.fromarray(trial),(512,28))
        draw=ImageDraw.Draw(sheet);draw.text((4,7),'Original frozen map, 1:1',fill='white');draw.text((516,7),'Gaussian colours, original max channel, 1:1',fill='white');sheet.save(OUT/'detail-comparison.png')
constant={b:np.full((33,33),v,dtype=np.float32) for b,v in zip('gri',(.1,.2,.3))}
old=rgb(constant);stable,_=filter_colours(constant,old,0);assert np.array_equal(old,stable)
step={b:np.zeros((33,33),dtype=np.float32) for b in 'gri'}
step['i'][:,:16]=.2;step['g'][:,16:]=.2
old=rgb(step);mixed,_=filter_colours(step,old,0)
assert np.array_equal(mixed.max(axis=2),old.max(axis=2))
assert np.any(mixed[:,15,2]>old[:,15,2]) and np.any(mixed[:,16,0]>old[:,16,0])
controls={'constantColourByteExact':True,'sharpRedBlueBoundary':{
    'originalRowRGB':old[16,12:20].tolist(),'trialRowRGB':mixed[16,12:20].tolist(),
    'meaning':'Real tradeoff control: colour crosses a sharp boundary despite exact max-channel brightness. This is not photometric preservation or colour-resolution acceptance.'}}
save('controls.json',controls)
after=[bind(path) for path in paths];assert before==after;save('inputs-after.json',after)
save('result.json',{'scope':'One bounded display-chroma experiment on real complete-joint patches. No source/coadd edits, new acquisition or full reprocessing, no sky/gain/PSF fit, no new publication/registry/production use. Partial-source and full-runtime delivery not implemented.',
    'astropyVersion':astropy.__version__,'kernel':{'type':'Astropy Gaussian2DKernel','stddevTargetPixels':1,'shape':[9,9],
        'array':kernel.array.tolist(),'selection':'Single diagnostic smoothing scale ~0.4 arcsec, below previously observed few-pixel stellar residual moments; not an inferred matched PSF or adopted science/noise prescription.'},
    'recipe':recipe,'preserved':'Original encoded max(R,G,B) bytes and black pixel set only, not perceptual/physical luminance, photometry or true colour.',
    'records':records,'controls':controls,'inputsExact':True,'independentReview':'MISSING','adopted':False})
print(json.dumps(bind(OUT/'result.json')))
