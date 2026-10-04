"""Byte/log readback of saved r3 responses; preserves final task failure, no HTTP replay."""
import collections,gzip,hashlib,json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[4]
SOURCE=ROOT/'output/business-cold-egress-1003-r3'
OUT=ROOT/'output/business-cold-egress-readback-1003-r1'
OUT.mkdir()
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def read(file): return json.loads(file.read_text(encoding='utf-8-sig'))
def save(name,value): (OUT/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def binding(file):
 raw=file.read_bytes();return dict(path=file.relative_to(ROOT).as_posix(),bytes=len(raw),sha256=sha(raw))
before=read(SOURCE/'inputs-before.json');failed=read(SOURCE/'failure.json');rows=failed['rows']
assert len(rows)==26
assert "'' !== undefined" in failed['error']
task='.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-business-cold-egress-2026-10-03.mts'
for row in before:
 actual=binding(SOURCE/'executed-script.mts') if row['path']==task else binding(ROOT/row['path'])
 assert actual['bytes']==row['bytes'] and actual['sha256']==row['sha256'],row['path']
current=(ROOT/task).read_text(encoding='utf-8')
previous=(SOURCE/'executed-script.mts').read_text(encoding='utf-8')
assert previous.replace('assert.equal(row.user_id,undefined);',"assert([undefined,''].includes(row.user_id));")==current
access=[]
for line in (SOURCE/'caddy.log').read_text(encoding='utf-8').splitlines():
 try: value=json.loads(line)
 except json.JSONDecodeError: continue
 if value.get('logger','').startswith('http.log.access.'): access.append(value)
def assert_privacy(value):
 assert 'request' not in value and 'resp_headers' not in value
 assert value.get('user_id') in (None,'')
for value in access: assert_privacy(value)
for mutation in [{'user_id':'unexpected-identity'},{'request':{}},{'resp_headers':{}}]:
 try: assert_privacy(mutation)
 except AssertionError: pass
 else: raise AssertionError('privacy mutation escaped')
assert len(access)==len(rows)
assert collections.Counter((v['status'],v['size']) for v in access)==collections.Counter((v['status'],v['encodedBodyBytes']) for v in rows)
recorded=[]
payloads={}
for row in rows:
 assert row==read(SOURCE/f"request-progress-{row['id']}.json")
 assert row['encodedBodyBytes']>=0 and row['decodedBodyBytes']>=0
 if row['recordedBody']:
  encoded=(SOURCE/f"response-{row['id']}.encoded").read_bytes();decoded=(SOURCE/f"response-{row['id']}.decoded").read_bytes()
  assert len(encoded)==row['encodedBodyBytes'] and sha(encoded)==row['encodedSha256']
  assert len(decoded)==row['decodedBodyBytes'] and sha(decoded)==row['decodedSha256']
  assert (gzip.decompress(encoded) if row['contentEncoding']=='gzip' else encoded)==decoded
  recorded.extend([binding(SOURCE/f"response-{row['id']}.encoded"),binding(SOURCE/f"response-{row['id']}.decoded")])
  if row['phase']!='cold_png': payloads[row['phase']]=json.loads(decoded)
for row in rows:
 if row['phase']=='warm_conditional': assert row['status']==304 and row['encodedBodyBytes']==row['decodedBodyBytes']==0
assert sum(row['phase']=='warm_conditional' for row in rows)==4
recent=next(row for row in rows if row['phase']=='recent_no_store_conditional')
assert recent['status']==200 and recent['cacheControl']=='no-store' and not recent['hasEtag'] and recent['encodedBodyBytes']>0
assert [row['status'] for row in rows if row['family']=='permission']==[403,404,400,400]
assert rows[-1]['aqControlledTransportCalls']==2
assert next(row for row in rows if row['phase']=='air_warm_fixture_transport')['aqControlledTransportCalls']==2
ctx=payloads['formal_cold_resolve']['data'];assert payloads['formal_cold_read']['data']==ctx
assert payloads['formal_cold_normal']['data']['context']['contextId']==ctx['contextId']
assert len(payloads['formal_cold_normal']['data']['spots'])==1
overview=payloads['formal_cold_overview'];assert overview['data']['spot']['spotId']==ctx['location']['spotId']
assert overview['contextRevision']==ctx['revision'] and overview['validAt']==ctx['selectedAtUtc']
sky=payloads['formal_cold_v3'];assert sky['data']['context']['contextId']==ctx['contextId']
catalog=payloads['formal_cold_catalog'];assert catalog==payloads['identity_same_publication']
assert catalog['data']['catalogHash']==sky['data']['skyScene']['catalog']['catalogHash']
assert catalog['data']['catalogVersion']=='bsc5p-bright-stars.v3'
assert len(catalog['data']['rows'])>1000
assert any(v['kind']=='TEST_FIXTURE' for v in sky['sources'])
terrain=payloads['cold_overlay']['data'];assert terrain['state']=='PARTIAL' and terrain['lightPollution']['state']=='UNAVAILABLE'
manifest=read(ROOT/'workers/miniapp-api/assets/terrain/publication.json')
image=next(v for v in rows if v['phase']=='cold_png');assert image['encodedSha256']==manifest['image']['sha256'] and image['encodedBodyBytes']==manifest['image']['byteSize']
def totals(selected): return dict(requests=len(selected),encodedBodyBytes=sum(v['encodedBodyBytes'] for v in selected),decodedBodyBytes=sum(v['decodedBodyBytes'] for v in selected))
cold=[v for v in rows if v['phase'].startswith('formal_cold_') or v['phase'] in ('cold_overlay','cold_png')]
assert len(cold)==12
groups={name:totals([v for v in rows if v['family']==name]) for name in sorted({v['family'] for v in rows})}
log_total=sum(v['size'] for v in access)
assert log_total==totals(rows)['encodedBodyBytes']
assert log_total!=totals(rows)['decodedBodyBytes'], 'decoded-as-billed regression must differ'
result=dict(status='SAVED_CURRENT_BUSINESS_COLD_HTTP_READBACK_DEVELOPMENT_ONLY',
 sourceTaskStatus='FAILED_FINAL_PRIVACY_FIELD_EXPECTATION',sourceFailurePreserved=True,
 correctedTaskSource='Only absent-or-empty user_id assertion corrected; NOT reexecuted',
 origin=binding(SOURCE/'failure.json'),sourceExecutedScript=binding(SOURCE/'executed-script.mts'),
 readback=binding(pathlib.Path(__file__).resolve()),totals=totals(rows),formalCold=totals(cold),groups=groups,
 rows=rows,recordedResponses=recorded,caddyAccessResponses=len(access),caddyEncodedSizeMatchesRawResponse=True,
 privacyFieldsRemoved=True,emptyUserIdAccepted=True,nonemptyUserIdRejected=True,decodedAsBilledMutationRejected=True,
 currentSourcesExactExceptCorrectedTask=True,catalogRows=len(catalog['data']['rows']),
 deepSkyRows=len(sky['data']['skyScene']['deepSky']['catalog']['entries']),reportHours=len(sky['data']['hourly']),
 dataScope=dict(publishedSpots=1,repository='explicit InMemoryTestRepository',weather='deterministic TEST_FIXTURE',recentWeather='deterministic TEST_FIXTURE',
 airQuality='actual QWeather adapter, owned synthetic transport, no supplier requests; official source labels are adapter output NOT provider evidence',
 astronomy='real BSC5P v3, OpenNGC and current algorithms',terrain='real existing publication PNG; light pollution UNAVAILABLE'),
 gaps=dict(actualWeappAcceptEncoding='UNVERIFIED',zstd='UNMEASURED',providerEntitlementAndCharges='UNVERIFIED',postgresRedisOutbox='NOT_EXERCISED',
 productionPopulation='UNKNOWN',mixedOrdinarySkyLoad='NOT_YET_MEASURED',currentSharedBffLatestSource='UNVERIFIED',
 isolatedServerCpuRss='NOT_MEASURED; API and driver share process',twelveMbps='NOT_THROTTLED',wholeMiniappMonthlyBytes=None,wholeMiniappMonthlyCny=None,
 capacityAccepted=False,independentReview='MISSING'),
 meaning='Source r3 all 26 HTTP operations and semantic checks completed, final privacy assertion failed on empty user_id. Readback validates saved raw/decompressed bodies, source pins and actual log multiset without replay. Payload excludes headers/TLS/TCP/retransmission. Cold units preceded warm probes in some owners; host file cache warm. No DAU distribution or one-user full journey claim; no product code change, deployment, adoption or device acceptance.')
save('result.json',result)
save('inputs-current.json',[binding(ROOT/v['path']) for v in before])
print(json.dumps({'formalCold':result['formalCold'],'totals':result['totals'],'catalogRows':result['catalogRows'],'deepSkyRows':result['deepSkyRows'],'reportHours':result['reportHours'],'result':binding(OUT/'result.json')}))
