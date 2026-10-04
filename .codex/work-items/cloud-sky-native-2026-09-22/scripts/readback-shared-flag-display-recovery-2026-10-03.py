"""Read actual saved recovery products and diagnose the 53 rejected alternatives."""
import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image
from image_quality import digest,write_report
from sdss_corrected_frame import read_cached_frame
from sdss_frame_noise import native_noise_samples,read_cached_field_noise
from sdss_source_stencil import source_pixel_stencil
from sdss_gri_tan import BANDS,target_tan,coherent_box_means,make_rgb_display,ProjectedBand,FixedDisplayTransfer

def bind(p):
    raw=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':digest(raw)}
o=ROOT/'output/shared-flag-display-recovery-1003-r2';out=o/'readback-r2';out.mkdir(exist_ok=False)
c=json.loads((ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json').read_bytes());base=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2'
n=json.loads((ROOT/'output/shared-noise-display-1003-r1/candidate/candidate.json').read_bytes());old=ROOT/'output/shared-noise-display-1003-r1/candidate'
r=json.loads((o/'candidate/candidate.json').read_bytes());p=json.loads((o/'processing-inputs.json').read_bytes())['currentInputSnapshot']
for record in json.loads((o/'inputs-after.json').read_bytes()):assert bind(ROOT/record['path'])==record

def arr(meta,folder):
    f=folder/meta['file'];assert bind(f)['sha256']==meta['sha256'];return np.load(f,allow_pickle=False)
a={b:arr(r['arrays'][b],o/'candidate') for b in BANDS};mask=arr(r['arrays']['alternative-supply'],o/'candidate')
joint=arr(c['arrays']['joint-availability'],base);trial=ROOT/'output/sdss-flag-alternative-1003-r2'
tmask=np.load(trial/'alternative-supply.npy',allow_pickle=False);diff=tmask&~mask;y,x=np.nonzero(diff)
assert len(y)==53;ra,dec=target_tan(c['center'],c['pixels'],c['fieldDegrees']).all_pix2world(x,2047-y,0)
cas=ROOT/'output/sdss-m51-field-quality-1002-r3';receipt=json.loads((cas/'receipt.json').read_bytes());reasons=[]
for f in p['fields']:
    w=arr(c['mosaic']['diagnostics'][f['fieldKey']]['normalized-weight'],base)[y,x]
    if not (w>0).any():continue
    for b,v in f['bands'].items():
        fr=v['frameAdmissionReceipt'];s=fr['source'];i=fr['identity'];path=Path(s['path'])
        frame=read_cached_frame(path,i|{k:s[k] for k in ('bytes','sha256','sourceUrl')},max_uncompressed_bytes=32*1024*1024)
        camera=read_cached_field_noise(cas/'response.csv',receipt,i)
        sx,sy=frame.wcs.all_world2pix(ra,dec,0);stencil=source_pixel_stencil(frame.data.shape,sx,sy)
        xx=np.full(sx.shape,-1,dtype=np.int64);yy=xx.copy();xx[stencil.geometry]=stencil.x0;yy[stencil.geometry]=stencil.y0
        native=native_noise_samples(frame,camera,np.stack([xx,xx+1,xx,xx+1]),np.stack([yy,yy,yy+1,yy+1]))
        bad=(w>0)&~native.available.all(axis=0)
        if bad.any():reasons.append({'fieldKey':f['fieldKey'],'band':b,'positiveRejectedTargets':int(bad.sum()),
            'outsideScienceGeometry':int(((w>0)&~native.native_geometry.all(axis=0)).sum()),
            'outsideSkyInterpolationGeometry':int(((w>0)&~native.sky_geometry.all(axis=0)).sum()),
            'unavailableEvenInsideSkyGeometry':int(((w>0)&native.sky_geometry.all(axis=0)&~native.available.all(axis=0)).sum()),
            'targetCoordinatesXY':np.stack([x[bad],y[bad]],axis=1).tolist()})
levels={};transfer=FixedDisplayTransfer(r['sourceResolvedRecipe']['stretch'],r['sourceResolvedRecipe']['Q'])
for level,m in r['levels'].items():
    x0,y0,x1,y1=m['crop']['boundsXYExclusive'];crop=(slice(y0,y1),slice(x0,x1));factor=m['crop']['boxFactor']
    means,count=coherent_box_means({b:a[b][crop] for b in BANDS},joint[crop],factor);available=count>0
    rgb,_=make_rgb_display({b:ProjectedBand(means[b],available,available,{}) for b in BANDS},available,transfer=transfer)
    alpha=np.rint(count.astype(float)*255/(factor*factor)).astype(np.uint8);expected=np.dstack([rgb,alpha])
    path=o/'candidate'/m['file'];saved=np.asarray(Image.open(path));prior=np.asarray(Image.open(old/n['levels'][level]['file']))
    assert np.array_equal(saved,expected);assert np.array_equal(saved[:,:,3],prior[:,:,3])
    levels[level]={'saved':bind(path),'actualSavedDerivationExact':True,'originalAlphaExact':True,
        'changedRgbPixelsFromOriginal':int(np.any(saved[:,:,:3]!=prior[:,:,:3],axis=2).sum())}
for b in BANDS:
    initial=arr(n['arrays'][b],old);assert np.array_equal(a[b][~mask],initial[~mask],equal_nan=True)
    alternate=np.load(trial/(b+'-display-alternative.npy'),allow_pickle=False);assert np.array_equal(a[b][mask],alternate[mask])
result={'candidate':bind(o/'candidate/candidate.json'),'processingInputs':bind(o/'processing-inputs.json'),
    'alternativePixels':int(mask.sum()),'rejectedFlagOnlyAlternatives':53,'nativeNoiseUnavailableReasons':reasons,
    'levels':levels,'candidateLogicalFileBytes':sum(f.stat().st_size for f in (o/'candidate').iterdir() if f.is_file()),
    'outsideAlternativeOriginalExact':True,'scienceAvailabilityUnchanged':True,'sourceInputsCurrentExact':True,
    'qualificationMeaning':'Unavailable SKY/native-noise is conservative processing qualification, not absent science; reasons can overlap across fields/bands.',
    'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False,'filterRuns':0,'fitRuns':0,'sourceRequests':0}
write_report(out/'result.json',result);(out/'executed-script.py').write_bytes(Path(__file__).read_bytes())
print(json.dumps({k:v for k,v in result.items() if k!='nativeNoiseUnavailableReasons'}));print(json.dumps([{k:v for k,v in row.items() if k!='targetCoordinatesXY'} for row in reasons]))
