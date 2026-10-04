"""Reuse saved byte/frame readback, then check actual numeric dome and readiness."""
from pathlib import Path
import math
base=Path(__file__).resolve().parent
source=(base/'readback-live-combination-2026-10-03.py').read_text(encoding='utf-8')
prefix=source[:source.index('refinement=rows[')]
prefix=prefix.replace("SOURCE=ROOT/'output/playwright/cloud-sky-live-mixed-1003-r4'","SOURCE=ROOT/'output/playwright/cloud-sky-live-mixed-1003-r5'",1)
prefix=prefix.replace("OUT=ROOT/'output/playwright/cloud-sky-live-combination-readback-1003-r2'","OUT=ROOT/'output/playwright/cloud-sky-live-dome-readiness-readback-1003-r1'",1)
prefix=prefix.replace("result['status']=='LIVE_CURRENT_API_COMBINATION_DEVELOPMENT'","result['status']=='LIVE_NUMERIC_DOME_AND_SETTLED_READINESS_DEVELOPMENT'",1)
assert "r4'" not in prefix
exec(compile(prefix,str(base/'readback-live-combination-2026-10-03.py')+'::common_saved_byte_frame_path','exec'))
dome=rows['live-corrected-full-sphere'];returned=rows['live-settled-landscape-return']
actual=dome['passes'][-1]['actualPaintCamera']['fov'];expected=720/math.pi*math.atan(844/(390*.92))
assert abs(actual-expected)<1e-10 and actual>200
assert dome['condition']['requestedCamera']['progress']==1
assert dome['actualFacts']['readiness']==returned['actualFacts']['readiness']==1
assert returned['passes'][-1]['actualPaintCamera']['fov']==45
old=read(ROOT/'output/playwright/cloud-sky-current-scene-1003-r5/full-sphere.json');assert old['passes'][-1]['actualPaintCamera']['fov']==45
final=read(SOURCE/'final-owner.json');clear=final['afterClear']
assert not any(v['alive']for v in clear['gpu']['handles']) and clear['counters']['nativeRunning']==clear['counters']['decodedPending']==0
assert final['afterHide']['presented']is None and not any(v['membership']=='CURRENT'for v in final['afterHide']['nativeCurrent'])
for v in clear['cache']:
 for k in ['leased','running','pending','reserved','bytes','entries','retired']:assert not v.get(k)
summary=dict(status='NUMERIC_DOME_AND_LOADED_READINESS_DEVELOPMENT_READBACK',sourcePinsCurrentExact=len(pins),
 actualDomeFov=actual,expectedDomeFov=expected,oldNamedDomeActualFov=45,loadedPanoramaReadiness=[dome['actualFacts']['readiness'],returned['actualFacts']['readiness']],
 frames=frames,successfulHttpResponses=len(success),abortedHttpResponses=len(wire)-len(success),
 encodedSuccessfulBodyBytes=sum(v['encodedBodyBytes']for v in success),decodedSuccessfulBodyBytes=sum(v['decodedBodyBytes']for v in success),
 resources=dict(peaks=final['resourcePeaks'],logicalOwnerRetirement=True,physicalTotal='UNKNOWN'),
 scope='Two affected task conditions only; numeric value from existing camera owner, actual current loaded readiness awaited. Current software GL and HTTP, not native/physical/final quality. A45degree above-horizon view may have no panorama-alpha intersection and opacity0; readiness1 does not promise visible terrain without geometry. Complete material fade-and-return at intersecting horizon views still needs actual evidence.',
 priorFailedInputRetained=True,productionSourceChanged=False,otherBusinessLogicChanged=False,capacityAccepted=False,independentReview='MISSING',
 origins=[bind(SOURCE/name)for name in ['result.json','executed-script.mts','wire-requests.json','caddy.log','final-owner.json']],
 next='Read actual response-cache memory/disk pressure owner after larger live journey3x200; bounded intersecting-view landscape fade/return and live cancellation/late delivery remain. No old ninecondition/full cold matrix or guessed cache restructuring.')
(OUT/'result.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'result':bind(OUT/'result.json'),'actualDomeFov':actual,'frames':len(frames)//2,'encodedBytes':summary['encodedSuccessfulBodyBytes'],'readiness':[1,1]}))
