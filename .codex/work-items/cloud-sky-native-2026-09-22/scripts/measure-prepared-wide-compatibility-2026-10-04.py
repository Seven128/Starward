"""Measure visually checked pairs, held-out geometry and encoded colour.

No coordinate or colour transform is applied to any source or publication.
"""
from pathlib import Path
import hashlib
import importlib.util
import json
import math
import sys

ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
SRC=ROOT/'output/prepared-wide-tie-proposals-1004-r3'
OUT=ROOT/'output/prepared-wide-compatibility-1004-r1'
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np

helper_path=TASK/'scripts/experience-hubble-m51-registration-trial-2026-10-02.py'
spec=importlib.util.spec_from_file_location('existing_relative_similarity',helper_path)
helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
ACCEPTED={'M:51':('foreground-1','foreground-2','foreground-3','foreground-5'),
          'M:82':('visible-spike-southeast','visible-blue-west')}
SCALE_ARCSEC=.2275555555555556*3600/2048

def bound(p):
 b=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def save(name,value):
 raw=json.dumps(value,ensure_ascii=False,indent=2,allow_nan=False)+'\n'
 with (OUT/name).open('x',encoding='utf-8') as f:f.write(raw)
def hull_area(points):
 points=sorted(tuple(p) for p in points)
 def cross(o,a,b):return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
 lo,hi=[],[]
 for p in points:
  while len(lo)>=2 and cross(lo[-2],lo[-1],p)<=0:lo.pop()
  lo.append(p)
 for p in reversed(points):
  while len(hi)>=2 and cross(hi[-2],hi[-1],p)<=0:hi.pop()
  hi.append(p)
 poly=np.array(lo[:-1]+hi[:-1])
 return float(abs(np.sum(poly[:,0]*np.roll(poly[:,1],-1)-poly[:,1]*np.roll(poly[:,0],-1)))/2) if len(poly)>=3 else 0.

def main():
 OUT.mkdir(exist_ok=False);(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
 data=json.loads((SRC/'result.json').read_bytes())
 rows=data['proposals']
 inputs=[Path(__file__),helper_path,SRC/'result.json',SRC/'inputs-before.json',SRC/'inputs-after.json']
 for p in rows:
  inputs += [ROOT/p['contact']['path']]
  for v in p['pair']:inputs.append(ROOT/v.get('rawRgbRoi',v.get('rawRgbaRoi'))['path'])
 protected=json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes());inputs += [ROOT/r['path'] for r in protected]
 before=[bound(p) for p in inputs];save('inputs-before.json',before)
 assert json.loads((SRC/'inputs-before.json').read_bytes())==json.loads((SRC/'inputs-after.json').read_bytes())
 qualifications=[]
 for p in rows:
  name=p['hint']['id'];ref=p['objectRef']
  if name in ACCEPTED[ref]:
   if ref=='M:82':assert all(v['centroidCoreAnnulusGeometryComplete'] for v in p['pair'])
   qualifications.append({'objectRef':ref,'id':name,'qualification':'ROOT_ACTUAL_RAW_CONTACT_VIEWED: isolated HST foreground spike/compact source with matching NOIRLab counterpart and surrounding pattern; diagnostic only, not independent review.',
                          'limitations':'Encoded clipping and unlike PSF/filters/epochs remain; not physical astrometry or radiometry.'})
 by_ref=[]
 colour_rows=[]
 for ref,names in ACCEPTED.items():
  pairs=[next(p for p in rows if p['objectRef']==ref and p['hint']['id']==name) for name in names]
  variants=[]
  for radius in ('4','8','12'):
   a=np.array([p['pair'][0]['centroidTargetColumnTopRow'][radius] for p in pairs])
   b=np.array([p['pair'][1]['centroidTargetColumnTopRow'][radius] for p in pairs])
   d=b-a;translation=np.mean(d,axis=0);residual=d-translation
   null_norm=np.linalg.norm(d,axis=1)
   trans_cv=[];similarity_cv=[]
   for i,name in enumerate(names):
    keep=np.arange(len(a))!=i
    pred=a[i]+np.mean(d[keep],axis=0)
    trans_cv.append({'heldOut':name,'residualTargetPixels':(b[i]-pred).tolist(),'normArcsec':float(np.linalg.norm(b[i]-pred)*SCALE_ARCSEC)})
    if len(a)>=4:
     fit=helper.similarity(a[keep],b[keep]);ca,sa,tx,ty=fit['coefficientsRealImagAndTranslation']
     pred=np.array([ca*a[i,0]-sa*a[i,1]+tx,sa*a[i,0]+ca*a[i,1]+ty])
     similarity_cv.append({'heldOut':name,'residualTargetPixels':(b[i]-pred).tolist(),'normArcsec':float(np.linalg.norm(b[i]-pred)*SCALE_ARCSEC)})
   fit=helper.similarity(a,b) if len(a)>=4 else None
   variants.append({'apertureRadiusMasterPixels':int(radius),'hstPoints':a.tolist(),'noirlabPoints':b.tolist(),
    'individualNoirlabMinusHstTargetPixels':d.tolist(),'noCorrectionNormArcsec':(null_norm*SCALE_ARCSEC).tolist(),
    'translationNoirlabMinusHstTargetPixels':translation.tolist(),'translationTrainingRmsArcsec':float(np.sqrt(np.mean(np.sum(residual**2,axis=1)))*SCALE_ARCSEC),
    'translationLeaveOneOut':trans_cv,'similarity':fit,'similarityLeaveOneOut':similarity_cv,
    'hullAreaMasterPixelsSquared':hull_area(a),
    'limits':None if fit else 'Two independent points do not validate rotation/scale; no similarity fit claimed.'})
  # Source-specific centroids on original saved RGB, with encoded annuli and
  # per-channel colour preserved. Annuli are not declared blank sky or flux.
  for p in pairs:
   sources=[]
   for item in p['pair']:
    rec=item.get('rawRgbRoi',item.get('rawRgbaRoi'));array=np.load(ROOT/rec['path'],allow_pickle=False)
    assert bound(ROOT/rec['path'])==rec
    rgb=array[:,:,:3].astype(np.float64)
    x0,y0,_,_=item['rawRoiBoundsXYExclusive'];cx,cy=item['centroidTargetColumnTopRow']['8'];yy,xx=np.mgrid[:129,:129];rr=(xx-(cx-x0))**2+(yy-(cy-y0))**2
    core=rr<=8**2;wing=(rr>=8**2)&(rr<=16**2);ann=(rr>=20**2)&(rr<=28**2)
    if array.shape[2]==4:assert (array[:,:,3][core|wing|ann]==255).all()
    ann_rgb=np.median(rgb[ann],axis=0);wing_rgb=np.mean(rgb[wing],axis=0)
    sources.append({'name':item['name'],'encodedCoreMeanRgb':np.mean(rgb[core],axis=0).tolist(),
     'encodedWingMeanRgb':wing_rgb.tolist(),'encodedAnnulusMedianRgb':ann_rgb.tolist(),
     'encodedWingMaxNormalizedChroma':(wing_rgb/np.max(wing_rgb)).tolist(),
     'encodedCoreAny255Pixels':int(np.any(rgb[core]==255,axis=1).sum()),'encodedCorePixels':int(core.sum()),
     'physicalSaturation':'UNKNOWN','annulusMeaning':'Actual encoded surrounding pattern; not blank sky or scientific background.'})
   colour_rows.append({'objectRef':ref,'id':p['hint']['id'],'sources':sources,
     'noirlabToHstEncodedWingMeanRatios':(np.array(sources[1]['encodedWingMeanRgb'])/sources[0]['encodedWingMeanRgb']).tolist(),
     'meaning':'Descriptive point/wing colour only; different PSF/filter/stretch/clipping, not calibrated colour transfer.'})
  by_ref.append({'objectRef':ref,'actualIsolatedPairs':len(pairs),'variants':variants})
 after=[bound(p) for p in inputs];assert before==after and all(bound(ROOT/r['path'])['sha256']==r['sha256'] for r in protected)
 save('inputs-after.json',after)
 result={'status':'MEASURED_RELATIVE_COMPATIBILITY_NO_SOURCE_TRANSFORM','scope':__doc__,'rootQualifications':qualifications,
  'geometricDiagnostics':by_ref,'encodedColourDiagnostics':colour_rows,'requests':0,'sourceTransforms':0,
  'rejections':[{'objectRef':'M:82','id':'visible-blue-north','reason':'Actual HST contact resolves two nearby sources; NOIRLab blends them. Not an isolated control point; excluded from all fits.'},
                {'objectRef':'M:82','id':'visible-faint-east','reason':'Outside HST geometric observation. No black/star measurement or fit allowed.'}],
  'limits':['No absolute independent astrometry, proper-motion correction, image-wide validation or source update.',
            'M51 controls span only a small part of the shared image; M82 has only two isolated points.',
            'Aperture sensitivity/clipped encoded cores/PSF differences bound interpretation; fitting does not prove quality.',
            'No global RGB conversion or single fused observation is established; genuine filter/structure differences retained.']}
 save('result.json',result)
 print(json.dumps({'status':result['status'],'targets':[{'ref':v['objectRef'],'pairs':v['actualIsolatedPairs'],'nullArcsec':v['variants'][1]['noCorrectionNormArcsec'],
  'translationCvArcsec':[q['normArcsec'] for q in v['variants'][1]['translationLeaveOneOut']],
  'similarityCvArcsec':[q['normArcsec'] for q in v['variants'][1]['similarityLeaveOneOut']]} for v in by_ref]}))

if __name__=='__main__':main()
