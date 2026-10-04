"""Read actual saved boundary results; preserve strict and quality failures."""
from pathlib import Path
import hashlib,json,math,sys
ROOT=Path(__file__).resolve().parents[4]
PIPE=ROOT/'data-pipelines/deep-sky';sys.path[:0]=[str(PIPE),str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from PIL import Image
from optical_publication_io import bound_bytes,decode_bound_npy
PAIRS=ROOT/'output/playwright/cloud-sky-prepared-boundary-pairs-1004-r1'
HIGH=ROOT/'output/playwright/cloud-sky-prepared-boundary-medium-1004-r1'
GEOM=ROOT/'output/prepared-boundary-geometry-1004-r1'
MED=ROOT/'output/prepared-hubble-medium-sampling-1004-r1'
OUT=ROOT/'output/prepared-boundary-readback-1004-r1'
def read(p):return json.loads(p.read_bytes())
def bind(p):
 b=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def pin(row):assert bind(ROOT/row['path'])==row,row['path']
def raster(p):
 with Image.open(p) as image:return np.array(image.convert('RGBA'))
def full_alpha(a,uv):
 h,w=a.shape[:2];x,y=uv[0]*w-.5,uv[1]*h-.5;ix,iy=math.floor(x),math.floor(y)
 return 0<=ix<w-1 and 0<=iy<h-1 and bool((a[iy:iy+2,ix:ix+2,3]==255).all())
def main():
 OUT.mkdir(exist_ok=False);(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
 pubpath=ROOT/'output/hubble-m82-prepared-publication-1004-r2/manifest.json';pub=read(pubpath)
 motherpath=ROOT/'output/hubble-m82-prepared-coverage-1004-r1/master-rgba.npy'
 raw,motherpin=bound_bytes(motherpath,root=ROOT,max_bytes=17*1024*1024,expected=pub['master']['rgbaNpy'])
 mother=decode_bound_npy(raw,shape=(2048,2048,4),dtype='uint8')
 m=read(MED/'result.json');meta=read(MED/'medium.json');medium=raster(MED/'medium.png')
 for name in ['png','npy','metadata']:pin(m[name])
 for row in read(MED/'inputs-before.json'):pin(row)
 assert read(MED/'inputs-before.json')==read(MED/'inputs-after.json')
 assert medium.shape==(1024,1024,4) and np.array_equal(medium,mother[512:1536,512:1536])
 assert np.array_equal(np.load(MED/'medium-rgba.npy',allow_pickle=False),medium)
 assert meta['geometricSupportPixels']==int((medium[:,:,3]==255).sum())
 assert set(np.unique(medium[:,:,3])).issubset({0,255}) and not np.any(medium[:,:,:3][medium[:,:,3]==0])
 assert hashlib.sha256(medium.tobytes()).hexdigest()==meta['rgbaPayloadSha256']
 failed=read(PAIRS/'failed.json');assert 'AssertionError' in failed['error'] and not (PAIRS/'result.json').exists()
 phases1={r['name']:r for r in failed['phase']};phases2={r['name']:r for r in read(HIGH/'phases.json')}
 high=read(HIGH/'boundary-comparisons.json');geometry=read(GEOM/'result.json')
 assert high['at']==geometry['at'];assert high['view']==geometry['view']
 assert high['oldStrictRestoration']=='FAILED_KEEP_ORIGINAL_TWO_RGB_CHANNELS_DELTA1'
 assert high['sourceCompletion'] is None
 assert any(q['completed'] and q['finePhoto']==q['coarsePhoto']=='positive' for q in high['actualQualifications'])
 for row in geometry['inputsBefore']:pin(row)
 mask=np.frombuffer((GEOM/'nominal-domain.mask').read_bytes(),np.uint8).reshape(844,390)
 assert {k:int((mask==v).sum()) for k,v in [('neither',0),('coarseOnly',1),('fineOnly',2),('both',3)]}==geometry['counts']
 captures=[];images={}
 names=['hubble-coarse','noirlab-raw-coarse','noirlab-display-coarse','hubble-coarse-restored']
 for lane,stem,name in [(PAIRS,'software-boundary-'+n,n) for n in names]+[(HIGH,'software-boundary-higher-medium','higher-medium')]:
  b=(lane/(stem+'.rgba')).read_bytes();after=(lane/(stem+'-after.rgba')).read_bytes();assert b==after
  png=raster(lane/(stem+'.png'));assert png.shape==(844,390,4)
  assert png.tobytes()==np.frombuffer(b,np.uint8).reshape(844,390,4)[::-1].tobytes()
  images[name]=png
  paint=read(lane/(stem+'-paint.json'));assert paint['view']==read(HIGH/'software-boundary-higher-medium-paint.json')['view']
  assert paint['frameAt']==high['at'];captures.append({'name':name,'rgba':bind(lane/(stem+'.rgba')),'png':bind(lane/(stem+'.png')),'glPngGlExact':True})
 a=images['hubble-coarse'];b=images['hubble-coarse-restored'];delta=np.abs(a.astype(np.int16)-b.astype(np.int16))
 changed=np.argwhere(delta[:,:,:3].max(axis=2)>0);channels=int((delta[:,:,:3]>0).sum());maximum=int(delta.max())
 assert channels==2 and len(changed)==2 and maximum==1
 failed_recovery={'status':'FAILED_STRICT_PIXEL_RESTORATION','changedRgbChannels':channels,'changedPixels':len(changed),'maxDelta':maximum,
  'changedTopFirstXY':[[int(x),int(y)] for y,x in changed],'cause':'UNKNOWN','originalFailure':bind(PAIRS/'failed.json'),
  'oldEpochFinalLogicalRetirement':'MISSING_AFTER_FAILURE; later cleanup does not fill it'}
 pairpins=read(PAIRS/'boundary-coarse-pins.json')
 coarse_rasters={'hubble-coarse':raster(pubpath.parent/pub['levels']['MEDIUM']['file']),'higher-medium':medium}
 for mode,name in [('raw','noirlab-raw-coarse'),('display','noirlab-display-coarse')]:
  data=pairpins[mode];pin(data['manifest']);pin(data['pin']);coarse_rasters[name]=raster(ROOT/data['pin']['path'])
 border=[]
 for name,coarse in coarse_rasters.items():
  pairs=[p for p in geometry['adjacentBoundaryPairs'] if full_alpha(coarse,p['fineUvOnCoarse']) and full_alpha(coarse,p['coarseUv'])]
  assert len(pairs)>100
  jumps=[]
  for p in pairs:
   fx,fy=p['fineXY'];cx,cy=p['coarseXY'];jumps.append(np.abs(images[name][fy,fx,:3].astype(np.int16)-images[name][cy,cx,:3].astype(np.int16)))
  values=np.array(jumps);border.append({'case':name,'validGeometricAlphaBoundaryPairs':len(pairs),
    'medianMaxRgbJump':float(np.median(values.max(axis=1))),'p90MaxRgbJump':float(np.percentile(values.max(axis=1),90)),
    'maximumRgbJump':int(values.max()),'perChannelMedian':np.median(values,axis=0).tolist(),
    'meaning':'Descriptive adjacent output contrast at current-epoch nominal boundary, contains true stars/structure and sample-density differences. No quality threshold, PSF or instrument-seam classification.'})
 for r in phases1.values():
  if r['name'].startswith('boundary-'):
   assert r['completedSources']['optical'] is None
   assert json.loads(r['canvas']['data-sky-presented-view'])=={**high['view']}
 # Higher-parent epoch completes real retirement, not the failed earlier epoch.
 for name in ['source-bindings','backend-source-bindings']:
  rows=read(HIGH/(name+'-before.json'));assert rows==read(HIGH/(name+'-after.json'))
  for row in rows:pin(row)
 for row in read(HIGH/'public-asset-read-bindings.json')['unique']:pin(row)
 assert read(HIGH/'browser-errors.json')==[]
 final=phases2['unloaded-cleared'];assert final['resources']['gpuTextureUploadModelBytes']==final['resources']['gpuBufferUploadModelBytes']==final['resources']['activeDecodedImageHandles']==0
 for owner in final['owners']:
  for k in ['entries','leased','bytes','reserved','running','pending','retired']:assert owner[k]==0
 events=read(HIGH/'native-image-owner-events.json')
 for data in read(HIGH/'boundary-task-decodes.json'):
  rows=[r for r in events if r['sha256']==data['pin']['sha256']];assert len(rows)==1 and rows[0]['retired']
 requests=read(HIGH/'requests.json');summary=read(HIGH/'resource-summary.json');samples=read(HIGH/'resource-samples.json')
 stage=[r for r in samples if r['phase']=='boundary-higher-medium'];assert stage
 stage_max=max(r['gpuTextureUploadModelBytes'] for r in stage)
 dirs=[PAIRS,MED,HIGH,GEOM];inventory=[{'path':p.relative_to(ROOT).as_posix(),'files':len([f for f in p.rglob('*') if f.is_file()]),'logicalBytes':sum(f.stat().st_size for f in p.rglob('*') if f.is_file())} for p in dirs]
 report={'status':'SAVED_ACTUAL_BOUNDARY_DIAGNOSTICS_WITH_KNOWN_STRICT_AND_QUALITY_FAILURES','captures':captures,
  'exactMother1024CropAndAlphaPreserved':True,'newSourceRgbDecodesProjectionsFits':0,'geometricBoundary':geometry['counts'],
  'boundaryAdjacentContrast':border,'strictRecovery':failed_recovery,'actualHigherParentQualifications':high['actualQualifications'],
  'higherParentCurrentFrame':high['resources'],'higherParentStageSavedTextureModelMax':stage_max,'higherParentWholeJourneyResourceSummary':summary,
  'higherParentFinalResources':final['resources'],'requests':len(requests),'responseBodyBytes':sum(r['receivedBytes'] for r in requests),
  'currentOutputGroups':inventory,'logicalBytesExcludingReader':sum(r['logicalBytes'] for r in inventory),
  'scope':'Old failed four-frame matrix is preserved and read only. One new cached-mother higher-parent condition; new epoch final retirement only. Current observation geometry, not an observation/teardown retrofilled into failed epoch.',
  'quality':'Cross-source direct parent replacement visibly discontinuous. Higher same-source parent improves resolution transition, but full source boundary/weak structure/registration/day-twilight and ordinary publication remain UNVERIFIED/FAILED.',
  'ordinaryRegistryAdopted':False,'independentReview':'MISSING','nativeAndCapacity':'UNVERIFIED'}
 with (OUT/'result.json').open('x',encoding='utf-8') as f:json.dump(report,f,ensure_ascii=False,indent=2,allow_nan=False);f.write('\n')
 print(json.dumps({'status':report['status'],'captures':len(captures),'strictRecovery':failed_recovery,'border':border,'stageTextureModelMax':stage_max,'currentTexture':high['resources']['gpuTextureUploadModelBytes'],'nativeRgbaEquivalent':high['resources']['sourceRgbaEquivalentBytes'],'outputLogicalBytes':report['logicalBytesExcludingReader']},ensure_ascii=False))
if __name__=='__main__':main()
