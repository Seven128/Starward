"""Add measured HTTP units without summing incompatible scene/egress representations."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[4]
OUT=ROOT/'output/business-cold-unit-ledger-1003-r2';OUT.mkdir()
def read(relative): return json.loads((ROOT/relative).read_text(encoding='utf-8-sig'))
def bind(relative):
 raw=(ROOT/relative).read_bytes();return dict(path=relative,bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest())
current_path='output/business-cold-egress-readback-1003-r1/result.json'
scene_path='output/playwright/cloud-sky-current-scene-1003-r5/result.json'
model_path='output/whole-miniapp-cost-inputs-1003-r3/result.json'
current=read(current_path);scene=read(scene_path);model=read(model_path)
assert bind(current_path)['sha256']=='9df3bd0aabca56ac7e177a30c85fe05fdd7cd3835ed58bbb260008e33aa777ba'
assert bind(scene_path)['sha256']=='1ab3dd10fd06e354fbb248e502d126f69936eb0f530eece67aa7defc19bd2b0e'
assert model['total']['capacityPassed'] is False
rows=current['rows']
phases=['formal_cold_resolve','formal_cold_read','formal_cold_v3','formal_cold_catalog']
entry=[row for row in rows if row['phase'] in phases];assert len(entry)==4
assert not any('/v2/sky/catalogs/' in v.get('route','') for row in scene['rows'] for v in row['transfers'])
units=[]
for row in rows:
 units.append(dict(family=row['family'],phase=row['phase'],status=row['status'],requestBodyBytes=row['requestBodyBytes'],
                   responseEncodedBodyBytes=row['encodedBodyBytes'],responseDecodedBodyBytes=row['decodedBodyBytes'],
                   representation=row['contentEncoding'],requestsPerDau=None,enabledPopulation=None,
                   supplierCharges=None,observation='saved isolated Caddy HTTP, explicit fixture business state'))
result=dict(schemaVersion='starward-partial-business-egress-units-v1',status='PARTIAL_MEASURED_UNITS_NOT_MIXED_OR_CAPACITY',
 inputs=[bind(current_path),bind(scene_path),bind(model_path)],units=units,
 measuredEntry=dict(phases=phases,requests=len(entry),encodedResponseBodyBytes=sum(v['encodedBodyBytes'] for v in entry),
                    decodedResponseBodyBytes=sum(v['decodedBodyBytes'] for v in entry),
                    meaning='Context resolve/read and current formal v3 report/catalog only; no figures/Scene resources/package/auth/time/Back/render or first-usable claim.'),
 formalTwelveUnitSubtotal=current['formalCold'],
 oldScene=dict(preloaded=['Sky report','BSC publication attached','constellation manifest','selected position responses'],
               qualifiedCallbackRepresentationBytes=model['qualifiedJourneyBodyBytes'],
               sourceEvidence='Current scene task prepares current/figures/at/positions before browser execution; successful transfers are representation bytes, not Caddy encoded egress.'),
 combination=dict(encodedJointJourneyBytes=None,reason='Different context/time/report epoch, preloaded inputs and representation layers; do not add gzip HTTP bytes to saved callback bytes or infer one user journey.'),
 gaps=['actual WEAPP Accept-Encoding / zstd','live report + catalog + constellation bootstrap into actual page/Scene',
       'live source positions and source Back/time/hide requests','representative ordinary authenticated population/usage',
       'provider licensed population/real calls/cache pressure/restarts','isolated server CPU/RSS and mixed DB/Redis/outbox/media',
       'public 12Mbps contention and first usable/native frame/physical resources','remote mount/receipt/Sky backup/rollback and full disk roles'],
 wholeMiniapp=dict(targetDau=200,concurrentUsers=None,monthlyEgressBytes=None,monthlyOperatingCny=None,incrementalSkyCny=None,
                  productionFreeDiskBytes=None,capacityAccepted=False),independentReview='MISSING',
 next='Use isolated actual HTTP entry and current assets in the actual page/Scene mixed harness; bootstrap constellation/position inputs, classify cold/warm/failure/optional demand and actual encoded outputs. No repeat R5 matrix or old static cohort, and no DAU-as-concurrency assumption.')
(OUT/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'entry':result['measuredEntry'],'result':bind('output/business-cold-unit-ledger-1003-r2/result.json')}))
