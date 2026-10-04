"""Read completed solar and only repaired pending-return case, without replay."""
from pathlib import Path
import json,hashlib,collections
from PIL import Image
ROOT=Path(__file__).resolve().parents[4];OUT=ROOT/'output/playwright/cloud-sky-solar-pending-readback-1003-r2';OUT.mkdir()
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def bind(p):
 b=p.read_bytes();return dict(path=p.relative_to(ROOT).as_posix(),bytes=len(b),sha256=hashlib.sha256(b).hexdigest())
all_rows={};frames=[];lanes=[];source_pins={}
for revision in [13,14]:
 p=ROOT/f'output/playwright/cloud-sky-live-mixed-1003-r{revision}'
 saved=read(p/('result.json' if revision==13 else 'live-failure.json'));wire=saved['wire']
 if revision==13:assert saved['status']=='LIVE_SOLAR_AND_PENDING_PAGE_SINGLE_OWNER_DEVELOPMENT' and saved['errors']==[] and read(p/'inputs-before.json')==read(p/'inputs-after.json')
 else:assert '29 !== 30' in saved['error']
 for v in read(p/'inputs-before.json'):assert bind(ROOT/v['path'])==v
 for n in ['source-binding-before.json','api-inputs.json']:
  for v in read(p/n)['sourceBindings']:
   assert bind(ROOT/v['path'])=={k:v[k]for k in ('path','bytes','sha256')};source_pins[v['path']]=v
 access=[]
 for line in (p/'caddy.log').read_text(encoding='utf-8').splitlines():
  try:v=json.loads(line)
  except json.JSONDecodeError:continue
  if v.get('logger','').startswith('http.log.access.'):
   assert 'request' not in v and 'resp_headers' not in v and v.get('user_id')in(None,'');access.append(v)
 success=[v for v in wire if v['completed']and not v['aborted']];aborted=[v for v in wire if v['aborted']]
 server=collections.Counter((v['status'],v['size'])for v in access);received=collections.Counter((v['status'],v['encodedBodyBytes'])for v in success)
 assert not(received-server);extra=server-received
 assert all(status==200 and size>0 for status,size in extra)
 assert len(success)<=len(access)<=len(wire) and sum(extra.values())+len(wire)-len(access)==len(aborted)
 assert not any(v['method']=='HEAD'for v in wire)
 warm=[v for v in success if v['phase']=='live-warm-entry'];assert len(warm)==3 and all(v['status']==304 and v['encodedBodyBytes']==0 for v in warm)
 families=[]
 for condition in read(p/'conditions.json')['conditions']:
  name=condition['name'];row=read(p/(name+'.json'));all_rows[name]=row;resource=row['jointOwner']['resources']
  assert row['gpuFailures']==[] and row['jointOwner']['owners']==resource['publicEncodedOwners']==1 and len(resource['cache'])==1
  assert resource['cache'][0]==row['jointOwner']['cache'] and resource['cache'][0]['bytes']<=32*1024*1024
  assert resource['stellarNumericPayloadModel']==resource['stellarTuples']*7*8 and resource['stellarJsObjectBytes']is None
  for q in row['passes']:
   raw=p/(name+'-'+q['label']+'.rgba');png=p/(name+'-'+q['label']+'.png');pixels=raw.read_bytes()
   assert bind(raw)['sha256']==q['rgbaSha256'] and bind(png)['sha256']==q['pngSha256']
   im=Image.open(png).convert('RGBA');assert im.size==(390,844) and im.tobytes()==b''.join(pixels[y*1560:(y+1)*1560]for y in range(843,-1,-1))
   assert q['glError']==0 and q['publication']['stagedSnapshotId']==q['publication']['publishedSnapshotId'] and q['presented']['frameAt']==row['ready']['at']
   frames.extend([bind(raw),bind(png)])
  families.append(dict(name=name,body=row['solarFacts']['body'],loadedHooks=[dict(name=h['name'],images=len(h['ready']),hash=h['hash'])for h in row['ready']['hooks']if h['ready']],
    stellarTuples=resource['stellarTuples'],stellarNumericPayloadModel=resource['stellarNumericPayloadModel'],stellarPublicationJsonBytes=resource['stellarPublicationJsonBytes'],
    sharedCache=row['jointOwner']['cache'],decodedOwnerRgbaModel=resource['ownerRgbaModel'],gpuHandleModel=row['passes'][-1]['gpu']['live'],physicalBytes=None))
 final=read(p/'final-owner.json');clear=final['afterClear']
 assert not any(h['alive']for h in clear['gpu']['handles'])and clear['counters']['nativeRunning']==clear['counters']['decodedPending']==0
 assert final['afterHide']['presented']is None and not any(v['membership']=='CURRENT'for v in final['afterHide']['nativeCurrent'])
 assert len(clear['cache'])==1
 for k in ['entries','leased','bytes','reserved','running','pending','retired']:assert clear['cache'][0][k]==0
 assert all(l['disposed']and not l['loaded']and not l['pending']for l in clear['sao'])
 assert clear['files']==[dict(path='/controlled/sky-public-images-v1/index-v2.json',bytes=26)]
 for k in final['resourcePeaks']:assert max(e[k]for e in final['resourceEvents'])==final['resourcePeaks'][k]
 lanes.append(dict(revision=revision,conditions=families,successfulResponses=len(success),cancelledResponses=len(aborted),accessLogs=len(access),
  encodedReceivedSuccessBytes=sum(v['encodedBodyBytes']for v in success),loggedSize=sum(v['size']for v in access),
  unmatchedCancelledLoggedStatusSizes=[dict(status=status,size=size,count=count)for(status,size),count in sorted(extra.items())],
  cancelledMissingLogs=len(wire)-len(access),cancelledPhysicalReceiptBytes=None,warmStatuses=[304]*3,
  layerModelPeaks=final['resourcePeaks'],gpuHandleModelPeaks=final['before']['gpu']['totalPeak'],physicalTotal=None,
  runnerFinalAggregate='PASSED'if revision==13 else'FAILED_LOG_COUNT_RETAINED',
  origins=[bind(p/n)for n in ['executed-script.mts','final-owner.json','caddy.log','inputs-before.json','reused-build.json']]))

expected={'MERCURY':'mercuryTexture','MARS':'marsTexture','JUPITER':'jupiterBands','SATURN':'saturnBands','URANUS':'uranusBands','NEPTUNE':'neptuneBands'}
for body,hook in expected.items():
 row=all_rows['solar-'+body.lower()];h=next(h for h in row['ready']['hooks']if h['name']==hook);assert len(h['ready'])==1
 image=h['ready'][0];last=row['passes'][-1]
 assert image['sha256']==h['wanted'][0]['sha256'] and image['status']=='decoded'
 assert any(d['method']=='planet'and any(t.get('source',{}).get('objectId')==image['objectId']for t in d.get('textures',[])if t.get('source'))for d in last['gpu']['draws'])
 geometry=row['solarFacts']['bodyGeometry'];assert geometry['body']==body
 assert any(v['method']=='planet'and v.get('result')is True for v in last['gpu']['methods'])
venus=all_rows['solar-venus'];assert not any(h['ready']for h in venus['ready']['hooks'])
assert any(v['method']=='planet'and v.get('result')is True for v in venus['passes'][-1]['gpu']['methods'])
# Venus has the adopted analytic appearance. A stale sampler binding is not evidence it samples another body's image.
moon=all_rows['solar-moon-warm-return'];h=next(h for h in moon['ready']['hooks']if h['name']=='moonTexture');assert len(h['ready'])==1
assert h['ready'][0]['objectId']!=all_rows['solar-moon-pending-hide']['newDecodes'][0]['objectId']
assert not any(v['type']=='image'for v in moon['transfers'])
failed=read(ROOT/'output/playwright/cloud-sky-live-mixed-1003-r13/pending-return-missing-image.json');assert failed['positiveImageExpectation']is False
corrected=all_rows['solar-moon-pending-return-corrected'];h=next(h for h in corrected['ready']['hooks']if h['name']=='moonTexture');assert len(h['ready'])==1 and len(corrected['passes'])==5
assert any(q['label']=='pending-hide-return-before-ready'for q in corrected['passes'])
assert any(d['method']=='moon'and any(t.get('source',{}).get('objectId')==h['ready'][0]['objectId']for t in d.get('textures',[])if t.get('source'))for d in corrected['passes'][-1]['gpu']['draws'])
for name in ['solar-moon-pending-hide','solar-moon-pending-return-corrected']:
 pending=all_rows[name]['solarFacts']['pending'];assert pending['beforeHeld']['leases']>0 and pending['afterHide']['leases']==1 and pending['afterLate']['leases']==0
 assert pending['acceptedBeforeLate']==pending['acceptedAfterLate']
 assert all(l['disposed']and not l['loaded']and not l['pending']for l in pending['retired'])
 held=pending['held'];tile=next(t for t in read(ROOT/'workers/miniapp-api/assets/sao-v2/index.json')['tiles']if t['sha256']in held['path'])
 raw=bind(ROOT/f"workers/miniapp-api/assets/sao-v2/{tile['id']}.json")
 assert raw['sha256']==tile['sha256'] and raw['bytes']==tile['bytes']==held['bytes']
 assert not any(e['image']and e['current']for owner in pending['afterLate']['owners']for e in owner['entries'])
held=corrected['solarFacts']['pending']['held'];tile=next(t for t in read(ROOT/'workers/miniapp-api/assets/sao-v2/index.json')['tiles']if t['sha256']in held['path']);assert tile['bytes']==held['bytes']
summary=dict(status='SOLAR_REAL_TEXTURE_AND_PENDING_PAGE_SAVED_DEVELOPMENT_READBACK',currentSourcePinsExact=len(source_pins),frames=frames,lanes=lanes,
 actualTextureBodies=list(expected)+['MOON'],venus='ADOPTED_ANALYTIC_APPEARANCE_NO_IMAGE_CLAIM',pendingReadLease=[1,0],latePagePublishRejected=True,
 firstPendingReturnMoonImage='FAILED_TASK_READINESS_RETAINED',correctedOnlyOneCase=True,productionSourceChanged=False,otherBusinessLogicChanged=False,
 scope='Actual current server astronomy row/body values and file/hash/source publication consumers; config algorithmVersion test-astronomy and fixture spot/weather/repository remain. Full API/extracted page Hook/lifecycle/software Scene with controlled native UTF8 delivery and React/Taro/MapFS/clock/GL. One held completed native read, not simulated new scientific data. Actual solar texture GPU draws positive; no native/WXML/gesture/public-time/physical/quality/old-binary rollback/200DAU capacity/independent review claim. r14 log count failed: all successes match, four unmatched logged cancelled responses and one cancelled request without corresponding log; physical receipt unknown. No matrix/HTTP/export/rebuild replay.',independentReview='MISSING')
(OUT/'result.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'result':bind(OUT/'result.json'),'frames':len(frames)//2,'currentSourcePins':len(source_pins),'textureBodies':summary['actualTextureBodies'],'pendingLease':[1,0]}))
