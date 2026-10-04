"""Saved-data readback of sample density, new native stencils and page pixels.

No source RGB decode, grid reprojection, old matrix rerun or quality certificate.
This root readback is not independent review.
"""
from pathlib import Path
import hashlib,json,math,sys
ROOT=Path(__file__).resolve().parents[4]
sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from PIL import Image
OUT=ROOT/'output/prepared-hubble-sampling-readback-1004-r2'
FINE=ROOT/'output/prepared-hubble-fine-sampling-1004-r1'
R1=ROOT/'output/playwright/cloud-sky-prepared-hubble-sampling-1004-r1'
R2=ROOT/'output/playwright/cloud-sky-prepared-hubble-sampling-1004-r2'
def read(p):return json.loads(p.read_bytes())
def bind(p):
 b=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def ray(ra,dec):
 a,d=math.radians(ra),math.radians(dec)
 return np.array([math.cos(d)*math.cos(a),math.cos(d)*math.sin(a),math.sin(d)])
def basis(ra,dec):
 a,d=math.radians(ra),math.radians(dec)
 return ray(ra,dec),np.array([-math.sin(a),math.cos(a),0.]),np.array([-math.sin(d)*math.cos(a),-math.sin(d)*math.sin(a),math.cos(d)])
def main():
 OUT.mkdir(exist_ok=False);(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
 sampling=read(ROOT/'output/prepared-sampling-applicability-1004-r1/result.json')
 for r in sampling['inputsBefore']:assert bind(ROOT/r['path'])==r,r['path']
 view=sampling['view'];pitch=4*math.atan(1/(844/(2*math.tan(math.radians(view['verticalFovDeg'])/4))))*180/math.pi*3600/2
 assert abs(pitch-sampling['screenCenterArcsecPerPixel'][0])<1e-10
 assert 1.87<sampling['currentFineScreenPixelsPerOutputPixel']<1.88
 fine=read(FINE/'result.json');meta=read(FINE/'fine.json')
 for r in read(FINE/'inputs-before.json'):assert bind(ROOT/r['path'])==r,r['path']
 assert read(FINE/'inputs-before.json')==read(FINE/'inputs-after.json')
 for name in ['rgba','png','metadata']:assert bind(ROOT/fine[name]['path'])==fine[name]
 a=np.load(FINE/'fine-rgba.npy',allow_pickle=False);assert a.shape==(1024,1024,4) and a.dtype==np.uint8
 with Image.open(FINE/'fine.png') as im:assert im.size==(1024,1024);assert im.convert('RGBA').tobytes()==a.tobytes()
 assert int((a[:,:,3]==255).sum())==meta['geometricSupportPixels']==1024**2
 assert hashlib.sha256(a.tobytes()).hexdigest()==meta['rgba']['sha256']
 c,e,n=basis(meta['center']['raDeg'],meta['center']['decDeg'])
 g=meta['sourceGeometry'];sc,se,sn=basis(*g['reference_value']);theta=math.radians(g['rotation'])
 errors=[];checked=0
 for witness in read(FINE/'bounded-native-sampling-witnesses.json'):
  x,y=witness['targetTopXY'];values=[]
  for q in witness['quadrature']:
   sx,sy=q['sourceFitsXY0'];fx,fy=sx-math.floor(sx),sy-math.floor(sy)
   rgb=np.array(q['encodedRgb'],dtype=np.float64)
   values.append(((1-fx)*(1-fy)*rgb[0]+fx*(1-fy)*rgb[1]+(1-fx)*fy*rgb[2]+fx*fy*rgb[3]).astype(np.float32).astype(np.float64))
   xi=math.radians(meta['cdeltDeg'][0]*(x+q['dx']+1-meta['crpixFitsOneBased']))
   eta=math.radians(meta['cdeltDeg'][1]*(1023-y-q['dy']+1-meta['crpixFitsOneBased']))
   v=c+xi*e+eta*n;den=float(sc@v)
   u=float(se@v)/den;w=float(sn@v)/den
   px=g['crpix'][0]-1+(math.cos(theta)*u+math.sin(theta)*w)/math.radians(g['cdelt'][0])
   py=g['crpix'][1]-1+(-math.sin(theta)*u+math.cos(theta)*w)/math.radians(g['cdelt'][1])
   errors.append(max(abs(px-sx),abs(py-sy)))
  expected=np.rint(np.mean(values,axis=0)).astype(np.uint8)
  assert np.array_equal(expected,a[y,x,:3]);assert a[y,x].tolist()==witness['actualRgba'];checked+=1
 arithmetic_bound=64*np.finfo(float).eps/min(abs(math.radians(v)) for v in g['cdelt'])
 assert max(errors)<arithmetic_bound
 captures=[];summaries=[]
 for lane in [R1,R2]:
  result=read(lane/'result.json');assert 'DEVELOPMENT' in result['status']
  for name in ['source-bindings','backend-source-bindings']:
   before=read(lane/(name+'-before.json'));assert before==read(lane/(name+'-after.json'))
   for row in before:assert bind(ROOT/row['path'])==row,row['path']
  for row in read(lane/'public-asset-read-bindings.json')['unique']:assert bind(ROOT/row['path'])==row,row['path']
  assert read(lane/'browser-errors.json')==[]
  rows=read(lane/'phases.json');phases={row['name']:row for row in rows}
  control=phases['prepared-fine-before-layers'];new=phases['prepared-task-fine-1024'];restored=phases['prepared-original-fine-restored']
  for row in [new,restored]:
   assert row['scene']['at']==control['scene']['at'];assert row['canvas']['data-sky-presented-view']==control['canvas']['data-sky-presented-view']
  assert new['completedSources']['optical'] is None
  assert restored['completedSources']['optical']['publicationHash']==fine['oldPublicationHash']
  assert any(i['width']==1024 and i['height']==1024 and i['sha256']==fine['png']['sha256'] for i in new['frameResources']['sourceImages'])
  for stem in ['software-cold','software-prepared-fine','software-prepared-fine-1024','software-prepared-fine-restored']:
   b=(lane/(stem+'.rgba')).read_bytes();after=(lane/(stem+'-after.rgba')).read_bytes();assert b==after
   with Image.open(lane/(stem+'.png')) as im:actual=np.array(im.convert('RGBA'));assert actual.shape==(844,390,4)
   assert actual.tobytes()==np.frombuffer(b,np.uint8).reshape(844,390,4)[::-1].tobytes()
   captures.append({'lane':lane.name,'capture':stem,'rgba':bind(lane/(stem+'.rgba')),'png':bind(lane/(stem+'.png')),'glPngGlExact':True})
  assert (lane/'software-prepared-fine.rgba').read_bytes()==(lane/'software-prepared-fine-restored.rgba').read_bytes()
  final=phases['unloaded-cleared'];assert final['resources']['gpuTextureUploadModelBytes']==final['resources']['gpuBufferUploadModelBytes']==final['resources']['activeDecodedImageHandles']==0
  for owner in final['owners']:
   for key in ['entries','leased','bytes','reserved','running','pending','retired']:assert owner[key]==0
  sampling_new=[r for r in read(lane/'native-image-owner-events.json') if r['sha256']==fine['png']['sha256']]
  assert len(sampling_new)==1 and sampling_new[0]['retired']
  requests=read(lane/'requests.json');prepared=[r for r in requests if r['binary'] and fine['oldPublicationHash'] in r['route'] and r['status']==200]
  assert len(prepared)==3 and len({r['route'] for r in prepared})==3
  summaries.append({'lane':lane.name,'frontInputs':len(read(lane/'source-bindings-before.json')),'backInputs':len(read(lane/'backend-source-bindings-before.json')),
   'requests':len(requests),'httpResponseBodyBytes':sum(r['receivedBytes'] for r in requests),'actualPreparedPngResponseBodyBytes':sum(r['receivedBytes'] for r in prepared),
   'actualFamilies':sorted({i['family'] for r in read(lane/'frame-resources.json') for i in r['sourceImages']}),
   'resources':read(lane/'resource-summary.json'),'finalResources':final['resources'],'comparison':read(lane/'sampling-comparison.json')})
 qualifications=read(R2/'sampling-actual-qualifications.json');assert len(qualifications)>0
 assert any(r['completed'] and r['finePhoto']=='positive' for r in qualifications)
 # The only change between the two task observers is qualification execution;
 # the complete saved actual output remains exactly equal.
 for stem in ['software-prepared-fine','software-prepared-fine-1024','software-prepared-fine-restored']:
  assert (R1/(stem+'.rgba')).read_bytes()==(R2/(stem+'.rgba')).read_bytes()
 dirs=[ROOT/'output/prepared-sampling-applicability-1004-r1',FINE,R1,R2,OUT]
 inventory=[{'path':d.relative_to(ROOT).as_posix(),'files':len(list(d.rglob('*.*'))),'logicalBytes':sum(p.stat().st_size for p in d.rglob('*') if p.is_file())} for d in dirs[:-1]]
 report={'status':'SAVED_REAL_SOURCE_SAMPLING_AND_ACTUAL_PAGE_READBACK','nativePixelWitnessesChecked':checked,'independentTanCoordinateMaxPixelError':max(errors),
  'coordinateArithmeticBoundPixels':arithmetic_bound,'fullFinePngNpyExact':True,'oldSourceGridWorkRepeated':False,
  'sampling':sampling,'captures':captures,'runtimeSummaries':summaries,'r1R2FullPixelsExactlyEqual':True,
  'r2OriginalGpuQualificationExecuted':True,'finalSourceCompletionUnknownForPrototype':True,'ordinaryRegistryAdopted':False,
  'currentOutputGroups':inventory,'currentOutputLogicalBytesExcludingReaderReceipt':sum(r['logicalBytes'] for r in inventory),
  'limits':['Root saved-data self-readback, not independent review or full quality/native/phone/capacity acceptance.',
   'R1 skipped GPU qualification; only r2 supplies full original qualification/copy resource observation. Final new publication identity remains deliberately UNKNOWN.',
   'Extra 1024 task bitmap coexists with all three original 512 bitmaps; neither logical model maxima nor HTTP response bytes are physical memory or wire traffic.',
   'Higher real sampling visibly improves this close-up. It does not fix overview photo boundary, cross-source blend/registration, complete weak structures, day/twilight or publication.']}
 with (OUT/'result.json').open('x',encoding='utf-8') as f:json.dump(report,f,ensure_ascii=False,indent=2,allow_nan=False);f.write('\n')
 print(json.dumps({'status':report['status'],'nativeWitnesses':checked,'coordinateError':max(errors),'glPngGlCaptures':len(captures),'runtimeSummaries':[{'lane':r['lane'],'requests':r['requests'],'rasterResources':r['comparison']['newFine'],'observationMaxima':r['resources']['maxima']} for r in summaries]},ensure_ascii=False))
if __name__=='__main__':main()
