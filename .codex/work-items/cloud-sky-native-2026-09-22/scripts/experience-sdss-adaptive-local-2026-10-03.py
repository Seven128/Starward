"""Actual new common adaptive display local path; not complete quality."""
import copy
import hashlib
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
import time
from PIL import Image,ImageDraw
from astropy.visualization import ManualInterval,LuptonAsinhStretch,make_lupton_rgb
from sdss_adaptive_display import adaptive_common_display,RATIO,RADII,VERSION
from sdss_corrected_frame import read_cached_frame
from sdss_frame_noise import read_cached_field_noise
from sdss_frame_quality import read_cached_fpm
from sdss_gri_tan import target_tan,ProjectedBand
from sdss_noise_display import NoiseDisplaySource,_project_field,conditional_variance_upper,REJECT_PROCESSING_BITS
from sdss_noise_aperture import field_aperture_variance,aperture_variance_upper

OUT=ROOT/'output/sdss-adaptive-local-1003-r1';OUT.mkdir()
def bind(p):
    b=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def save(name,value):
    with (OUT/name).open('x',encoding='utf-8') as f:json.dump(value,f,ensure_ascii=False,indent=2);f.write('\n')
cp=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json'
qp=ROOT/'output/sdss-m51-mosaic-quality-diagnosis-1002-r3/result.json'
assert bind(cp)['sha256']=='73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52'
assert bind(qp)['sha256']=='9322203537531e0cba3fbf9addcd3ea6e19fd75fdfeb2dc57637bd2d42bee4d0'
c=json.loads(cp.read_bytes());q=json.loads(qp.read_bytes());target=target_tan(c['center'],c['pixels'],c['fieldDegrees'])
camera_dir=ROOT/'output/sdss-m51-field-quality-1002-r3';camera_receipt=json.loads((camera_dir/'receipt.json').read_bytes())
paths={Path(__file__),cp,qp,camera_dir/'receipt.json',camera_dir/'response.csv'}
paths.update(ROOT/'data-pipelines/deep-sky'/f for f in ('sdss_adaptive_display.py','sdss_noise_aperture.py','sdss_noise_display.py','sdss_source_stencil.py','sdss_frame_noise.py','sdss_corrected_frame.py','sdss_frame_quality.py'))
def array(meta):
    path=cp.parent/meta['file'];assert bind(path)['sha256']==meta['sha256'];paths.add(path)
    return np.load(path,mmap_mode='r',allow_pickle=False)
science=np.stack([array(c['arrays'][b+'-science']) for b in 'gri'])
joint=array(c['arrays']['joint-availability']);fields={};weights={}
for f in c['mosaic']['fields']:
    key=f['fieldKey'];diag=c['mosaic']['diagnostics'][key]
    fields[key]={b:ProjectedBand(array(diag[b+'-science']),array(diag[b+'-footprint']),array(diag[b+'-finite-neighbors']),f['perBand'][b]) for b in 'gri'}
    weights[key]=array(diag['normalized-weight'])
    for b in 'gri':paths.add(Path(f['perBand'][b]['sourceReceipt']['source']['path']))
for f in q['fields']:
    for b in 'gri':paths.add(ROOT/f['bands'][b]['maskSource']['path'])
protected=json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
for row in protected:
    p=ROOT/row['path'];assert bind(p)['sha256']==row['sha256'];paths.add(p)
manifest=ROOT/'output/frozen-zscale-publication-1003-r1/manifest.json'
assert bind(manifest)['sha256']=='8679b44e97e4b51a6893239d49db1b3931ac12b79c9692d91086f5190f9f0368'
recipe=json.loads(manifest.read_bytes())['master']['transfer']['recipe'];paths.add(manifest)
reference_path=ROOT/'output/sdss-m51-shared-transfer-1002/global-zscale-q8/rgb-master.npy'
assert bind(reference_path)['sha256']=='3073421521ca303701a5a5c5090753f6e43a00034d022838080dad66d791d4b6';paths.add(reference_path)
reference=np.load(reference_path,mmap_mode='r',allow_pickle=False)
fixed=[]
for b in 'gri':
    path=ROOT/'output/shared-noise-display-1003-r1/candidate'/f'{b}-display-estimates.npy';paths.add(path)
    fixed.append(np.load(path,mmap_mode='r',allow_pickle=False))
paths.add(ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/scripts/build-adaptive-local-consumer-2026-10-03.py')
before=[bind(p) for p in sorted(paths)];save('inputs-before.json',before)
(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
(OUT/'aperture-owner-executed.py').write_bytes((ROOT/'data-pipelines/deep-sky/sdss_noise_aperture.py').read_bytes())
patches=[]
for name,x,y in [('arm',1120,1024),('diffuse-arm',1164,1204),('outer-mixed',1968,2000),('flagged-foreground',1440,1424)]:
    region=(slice(y-24,y+25),slice(x-24,x+25));py,px=np.mgrid[y-24:y+25,x-24:x+25]
    ra,dec=target.all_pix2world(px,c['pixels']-1-py,0)
    patches.append({'name':name,'centerXY':[x,y],'region':region,'ra':ra,'dec':dec,'stencils':[],
      'eligible':joint[region].copy(),'reconstruction':np.zeros((3,49,49)),'weightSum':np.zeros((49,49)),'fields':[]})
try:
 for f in c['mosaic']['fields']:
    key=f['fieldKey'];active=[p for p in patches if weights[key][p['region']].any()]
    if not active:continue
    sources={};fq=next(v for v in q['fields'] if v['fieldKey']==key)
    for b in 'gri':
        old=f['perBand'][b]['sourceReceipt'];s=old['source']
        frame=read_cached_frame(Path(s['path']),old['identity']|{k:s[k] for k in ('bytes','sha256','sourceUrl')},max_uncompressed_bytes=32*1024*1024)
        assert frame.receipt==old
        camera=read_cached_field_noise(camera_dir/'response.csv',camera_receipt,old['identity'])
        mask=fq['bands'][b]['maskSource'];mp=ROOT/mask['path'];i=old['identity']
        url=f'https://data.sdss.org/sas/dr17/eboss/photo/redux/{i["rerun"]}/{i["run"]}/objcs/{i["camcol"]}/{mp.name}'
        flags=read_cached_fpm(mp,i|{'bytes':mask['bytes'],'sha256':mask['sha256'],'sourceUrl':url},max_uncompressed_bytes=16*1024*1024)
        assert frame.header.get('PS_ID') is not None and frame.header['PS_ID']==flags.receipt['actualPrimaryIdentity'].get('PS_ID')
        sources[b]=NoiseDisplaySource(frame,camera,flags)
    for p in active:
        w=weights[key][p['region']];stencil,known=_project_field(sources,fields[key],w,p['region'],p['ra'],p['dec'])
        p['stencils'].append(stencil);p['eligible'] &= known;p['fields'].append(key)
        p['reconstruction']+=np.stack([np.where(w>0,fields[key][b].data[p['region']],0) for b in 'gri'])*w[None]
        p['weightSum']+=w
    del sources
 rows=[];sheet=Image.new('RGB',(3*264,4*294),'#181818');draw=ImageDraw.Draw(sheet)
 def rgb(v):return make_lupton_rgb(v[2],v[1],v[0],interval=ManualInterval(vmin=0,vmax=None),stretch_object=LuptonAsinhStretch(stretch=recipe['stretch'],Q=recipe['Q']),output_dtype=np.uint8)
 for at,p in enumerate(patches):
    values=science[:,p['region'][0],p['region'][1]]
    assert np.allclose(p['weightSum'],1,rtol=0,atol=3e-7)
    assert np.allclose(p['reconstruction'],values,rtol=4e-7,atol=2e-8)
    started=time.perf_counter();result=adaptive_common_display(values,p['eligible'],p['stencils']);seconds=time.perf_counter()-started
    original=rgb(values);assert np.array_equal(original,reference[p['region']])
    filtered=rgb(result.estimates);old_fixed=rgb(np.stack([a[p['region']] for a in fixed]))
    center=(slice(8,41),slice(8,41))
    assert np.array_equal(result.estimates[:,~p['eligible']],values[:,~p['eligible']])
    assert np.array_equal(result.estimates[:,result.protected],values[:,result.protected])
    assert np.array_equal(result.estimates[:,:8],values[:,:8])
    saved=[]
    for name,array in [('original-measurements',values),('display-estimates',result.estimates),('eligible',p['eligible']),('radius',result.radius),('reached',result.reached),('protected',result.protected)]:
        path=OUT/f'{p["name"]}-{name}.npy';np.save(path,array,allow_pickle=False);saved.append(bind(path))
    for column,(name,image) in enumerate([('original',original),('old-fixed',old_fixed),('adaptive',filtered)]):
        path=OUT/f'{p["name"]}-{name}.png';Image.fromarray(image).save(path);saved.append(bind(path))
        draw.text((column*264+3,at*294+3),f'{p["name"]} / {name}',fill='white')
        sheet.paste(Image.fromarray(image[center]).resize((264,264),Image.Resampling.NEAREST),(column*264,at*294+24))
    changed=np.any(result.estimates!=values,axis=0)[center]
    levels,counts=np.unique(result.radius[center],return_counts=True)
    rows.append({'name':p['name'],'centerXY':p['centerXY'],'supportSize':49,'outputSize':33,'fields':p['fields'],
      'qualifiedCenters':int(p['eligible'][center].sum()),'protectedCenters':int(result.protected[center].sum()),
      'changedEstimateCenters':int(changed.sum()),'changedRgbCenters':int(np.any(filtered[center]!=original[center],axis=2).sum()),
      'radiusCounts':dict(zip(map(str,levels.tolist()),counts.tolist())),'commonRatioReached':int(result.reached[center].sum()),
      'unknownOrFlaggedExact':True,'protectedWholeColourExact':True,'outerHaloExact':True,'kernelSeconds':seconds,'outputs':saved,
      'originalMeanRGB':original[center].mean(axis=(0,1)).tolist(),'adaptiveMeanRGB':filtered[center].mean(axis=(0,1)).tolist()})
 sheet.save(OUT/'actual-local-comparison.png')
 (OUT/'adaptive-owner-executed.py').write_bytes((ROOT/'data-pipelines/deep-sky/sdss_adaptive_display.py').read_bytes())
 after=[bind(p) for p in sorted(paths)];assert before==after;save('inputs-after.json',after)
 save('result.json',{'status':'PASSED_BOUNDED_ADAPTIVE_DISPLAY_CONSUMER','version':VERSION,'radii':RADII,'absoluteConditionalRatio':RATIO,
  'rows':rows,'inputsExact':True,'recipe':recipe,'comparison':bind(OUT/'actual-local-comparison.png'),
  'scope':'Four declared49x49 actual source supports,33x33 outputs. Same masks/weights across gri; original coadd only. Fixed prior estimates for comparison only. New sign-neutral conditional ratio gates and protected-structure exclusion differ from original ADAPTSMOOTH. Not calibrated confidence, photometry, full quality, full frame/cost or ordinary publication. Exact science/recipe/old publications/default retained.',
  'sourceRequests':0,'oldFilterRuns':0,'displayFits':0,'adopted':False,'independentReview':'MISSING'})
 print(json.dumps({'result':bind(OUT/'result.json'),'rows':[{k:r[k] for k in ('name','changedEstimateCenters','changedRgbCenters','radiusCounts','kernelSeconds')} for r in rows]}))
except Exception as error:
 save('failed.json',{'error':str(error),'type':type(error).__name__});raise
