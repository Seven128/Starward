"""New actual multi-scale aperture-noise qualification, not another filter run."""
import copy
import hashlib
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from sdss_corrected_frame import read_cached_frame
from sdss_frame_noise import read_cached_field_noise
from sdss_frame_quality import read_cached_fpm
from sdss_gri_tan import target_tan,ProjectedBand
from sdss_noise_display import NoiseDisplaySource,_project_field,conditional_variance_upper,REJECT_PROCESSING_BITS
from sdss_noise_aperture import field_aperture_variance,aperture_variance_upper

OUT=ROOT/'output/sdss-aperture-noise-1003-r1';OUT.mkdir()
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
paths.update(ROOT/'data-pipelines/deep-sky'/f for f in ('sdss_noise_aperture.py','sdss_noise_display.py','sdss_source_stencil.py','sdss_frame_noise.py','sdss_corrected_frame.py','sdss_frame_quality.py'))
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
before=[bind(p) for p in sorted(paths)];save('inputs-before.json',before)
(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
(OUT/'aperture-owner-executed.py').write_bytes((ROOT/'data-pipelines/deep-sky/sdss_noise_aperture.py').read_bytes())
patches=[]
for name,x,y in [('arm',1120,1024),('diffuse-arm',1164,1204),('outer-mixed',1968,2000)]:
    region=(slice(y-8,y+9),slice(x-8,x+9));py,px=np.mgrid[y-8:y+9,x-8:x+9]
    ra,dec=target.all_pix2world(px,c['pixels']-1-py,0)
    patches.append({'name':name,'centerXY':[x,y],'region':region,'ra':ra,'dec':dec,'stencils':[],
      'eligible':joint[region].copy(),'reconstruction':np.zeros((3,17,17)),'weightSum':np.zeros((17,17)),'fields':[]})
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
 rows=[];dy,dx=np.mgrid[-8:9,-8:9]
 for p in patches:
    assert np.allclose(p['weightSum'],1,rtol=0,atol=3e-7)
    assert np.allclose(p['reconstruction'],science[:,p['region'][0],p['region'][1]],rtol=4e-7,atol=2e-8)
    apertures=[]
    for radius in (0,1,2,4,8):
        selected=dx**2+dy**2<=radius**2;count=int(selected.sum());eligible=bool(p['eligible'][selected].all())
        mean=science[:,p['region'][0],p['region'][1]][:,selected].astype(float).mean(axis=1)
        row={'radius':radius,'count':count,'allActualSourceSupportQualified':eligible,'signedMeanGRI':mean.tolist()}
        if eligible:
            upper=aperture_variance_upper(p['stencils'],selected)
            wrong=conditional_variance_upper([s['variance'][:,selected].sum(axis=1)/count**2 for s in p['stencils']])
            assert np.isfinite(upper).all() and (upper>0).all() and (upper>=wrong-1e-15).all()
            row.update({'conditionalVarianceUpperGRI':upper.tolist(),'wrongIndependentTargetUpperGRI':wrong.tolist(),
              'varianceRatioOverWrongIndependentTargetsGRI':(upper/wrong).tolist(),
              'signedMeanOverConditionalSigmaGRI':(mean/np.sqrt(upper)).tolist()})
        else:row['noiseMeaning']='UNKNOWN_OR_FLAGGED_SUPPORT_NOT_A_ZERO_VARIANCE_OR_MISSING_SCIENCE'
        apertures.append(row)
    # Save actual linear ingredients for arithmetic consumers; no display/filter.
    stencil_files=[]
    for index,s in enumerate(p['stencils']):
        path=OUT/f'{p["name"]}-field-{index}.npz';np.savez(path,**s);stencil_files.append(bind(path))
    rows.append({'name':p['name'],'centerXY':p['centerXY'],'fields':p['fields'],'apertures':apertures,'stencils':stencil_files})
 after=[bind(p) for p in sorted(paths)];assert before==after;save('inputs-after.json',after)
 save('result.json',{'status':'PASSED_ACTUAL_LINEAR_APERTURE_VARIANCE_QUALIFICATION','rows':rows,'inputsExact':True,
  'scope':'Three declared actual science regions and five uniform circular aperture supports only. Native repeated IDs combined before squaring, then Cauchy conditional field upper. Native diagonal model omits sky/systematic/processing uncertainty. Not median variance, filtered-estimate noise, calibrated SNR/detection, PSF/registration or complete quality. No scientific/image arrays or candidate/recipe/publication/default changed.',
  'filterRuns':0,'sourceRequests':0,'displayFits':0,'adopted':False,'independentReview':'MISSING'})
 print(json.dumps({'result':bind(OUT/'result.json'),'rows':rows}))
except Exception as error:
 save('failed.json',{'error':str(error),'type':type(error).__name__});raise
