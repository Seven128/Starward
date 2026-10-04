"""Reuse the frozen actual display page build for remaining public combinations."""
from pathlib import Path
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
SCRIPTS = TASK / 'scripts'
OLD = ROOT / 'output/playwright/cloud-sky-prepared-display-m82-page-1004-r1'
OUT = ROOT / 'output/playwright/cloud-sky-prepared-display-combination-1004-r1'
CHECKPOINT = '.codex/work-items/cloud-sky-native-2026-09-22/tmp/prepared-display-combination-current-inputs-2026-10-04.json'


def bind(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest()}


baseline = json.loads((TASK / 'tmp/prepared-display-page-current-inputs-2026-10-04.json').read_bytes())
scope = json.loads((TASK / 'evidence/prepared-display-identity-scope-verification-2026-10-04.json').read_bytes())
allowed = {row['after']['path']: row['after'] for row in scope['archivedChangedOwnersAndDocuments']}
transitions = []
current = []
for row in baseline['currentSources']:
    now = bind(ROOT / row['path'])
    if now != row:
        assert allowed.get(row['path']) == now, row['path']
        transitions.append({'before': row, 'after': now})
    current.append(now)
for row in baseline['protected']:
    assert bind(ROOT / row['path']) == row, row['path']
for row in json.loads((OLD / 'source-bindings-before.json').read_bytes()):
    assert bind(ROOT / row['path']) == row, row['path']
with (ROOT / CHECKPOINT).open('x', encoding='utf-8') as stream:
    stream.write(json.dumps({'currentSources': current, 'protected': baseline['protected'],
        'transitionsAfterOriginalPage': transitions,
        'scope': 'Fresh byte snapshot; bundle inputs unchanged. Not Goal/quality/native acceptance.'}, indent=2) + '\n')

code = (SCRIPTS / 'experience-prepared-display-m82-page-2026-10-04.mts').read_text(encoding='utf-8')
old_combination = (SCRIPTS / 'experience-prepared-m82-combination-2026-10-04.mts').read_text(encoding='utf-8')
scenario_start = old_combination.index("await zoom(.05,'prepared-combination-detail');")
scenario_end = old_combination.index('\nawait page.evaluate(async()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled;w.lifecycle(w.nativePage', scenario_start)
scenario = old_combination[scenario_start:scenario_end]
daylight = r'''
const rulerActions:any[]=[];
const ruler=async(type:string,detail:any={})=>{const r=await page.evaluate(({type,detail})=>{const a=globalThis.actualSkyPage,n=globalThis.__controlled.logicalNodes().find(n=>n.id==='sky-orientation-time-ruler-scroll');if(!n?.__handlers[type]?.length)throw Error('original ruler listener absent '+type);return {type,detail,dispatched:n.dispatchEvent(a.createEvent({type,detail,touches:type==='touchstart'?[{x:195,y:780}]:[],changedTouches:[{x:195,y:780}]}))};},{type,detail});rulerActions.push(r);return r;};
const daylightRows=await page.evaluate(()=>{const a=globalThis.actualSkyPage,c=a.useAppStore.getState().observationContext,report=a.miniappQueryClient.getQueryCache().getAll().map(q=>q.state.data?.data).find(d=>Array.isArray(d?.hourly)&&d.context?.contextId===c.contextId&&d.context.contextRevision===c.revision);if(!report)throw Error('current report absent');const rows=report.hourly.map((r,index)=>({at:r.at,index,sunAltitudeDeg:r.sunAltitudeDeg,darkness:r.darkness})).filter(r=>Number.isFinite(r.sunAltitudeDeg));const select=(name,eligible,target)=>{const choices=rows.filter(eligible).sort((a,b)=>Math.abs(a.sunAltitudeDeg-target)-Math.abs(b.sunAltitudeDeg-target));if(!choices.length)throw Error('actual '+name+' row absent');return {name,...choices[0]};};return {context:c,rows,cases:[select('day',r=>r.sunAltitudeDeg>5,25),select('twilight',r=>r.sunAltitudeDeg<0&&r.sunAltitudeDeg>-12,-6),select('night',r=>r.sunAltitudeDeg<-18,-40)],step:390*34/750};});
await save('prepared-display-real-daylight-rows.json',daylightRows);
const daylightResults:any[]=[];
for(const row of daylightRows.cases){await ruler('touchstart');await ruler('scroll',{scrollLeft:row.index*daylightRows.step});const preview=await frame('prepared-display-'+row.name);assert.equal(preview.scene.at,row.at);assert.equal(preview.frameResources.geometry.sunAltitudeDeg,row.sunAltitudeDeg);assert(preview.text.includes('跟踪中'));assert.equal(preview.sdssHook.imageVersion,'prepared-display-optical-v1');assert.equal(preview.completedSources.optical?.publicationHash,displayHash);assert.equal(preview.completedSources.optical?.field?.level,'DETAIL');assert.equal(preview.frameResources.calls.solarLight.submitted,1);daylightResults.push({name:row.name,at:row.at,sunAltitudeDeg:row.sunAltitudeDeg,darkness:row.darkness,completedSources:preview.completedSources,frameResources:preview.frameResources,view:preview.canvas['data-sky-presented-view']});await capturePixels('software-prepared-display-'+row.name);await ruler('touchcancel');const restored=await optical('DETAIL');assert.equal(Date.parse(restored.scene.at),startAt);assert.equal(binaries(),beforeTransfers);}
await save('prepared-display-daylight-results.json',daylightResults);await save('prepared-display-public-ruler-actions.json',rulerActions);
'''
needle="await act('播放 1×');await wait(v=>Date.parse(v.scene?.at)>startAt+1200"
assert scenario.count(needle) == 1
scenario = scenario.replace(needle, daylight + '\n' + needle)
needle="phase.push({name:'prepared-committed-source-retired',...sourcePage});"
assert scenario.count(needle) == 1
scenario = scenario.replace(needle, needle + "assert(sourcePage.activeText.includes(publication.processing.geometryExclusion.credit));assert(sourcePage.activeText.includes('显示估计')&&sourcePage.activeText.includes('负值显示截零'));await save('prepared-display-committed-source.json',{text:sourcePage.activeText,navigation:await page.evaluate(()=>globalThis.__controlled.navigationEvents.at(-1))});")
scenario = scenario.replace("quality:'FAILED_RECTANGLE_NOT_ADOPTED'", "quality:'SOFT_DETAIL_GRAIN_AND_COMPLETE_QUALITY_NOT_ADOPTED',realDayTwilightNight:daylightResults")
start = code.index("await zoom(.2,'m82-overview');")
end = code.index('\nawait page.evaluate(async()=>{const api=globalThis.actualSkyPage,w=globalThis.__controlled;w.lifecycle(w.nativePage', start)
code = code[:start] + scenario + code[end:]
code = code.replace('tmp/prepared-display-page-current-inputs-2026-10-04.json', 'tmp/prepared-display-combination-current-inputs-2026-10-04.json')
assert code.count('failOpticalDetail=true') == 1
code = code.replace('failOpticalDetail=true', 'failOpticalDetail=false')
code = code.replace('ACTUAL_TARO_M82_PREPARED_DISPLAY_PAGE_DEVELOPMENT', 'ACTUAL_TARO_PREPARED_DISPLAY_COMBINATIONS_DEVELOPMENT')
target = SCRIPTS / 'experience-prepared-display-combination-2026-10-04.mts'
with target.open('x', encoding='utf-8') as stream:
    stream.write(code)

reader = (SCRIPTS / 'readback-prepared-m82-combination-2026-10-04.py').read_text(encoding='utf-8')
reader = reader.replace('cloud-sky-prepared-m82-combination-1004-r2', 'cloud-sky-prepared-display-combination-1004-r1')
reader = reader.replace('hubble-m82-prepared-combination-readback-1004-r2', 'prepared-display-combination-readback-1004-r1')
needle="assert not pin['ordinaryRegistry']"
assert reader.count(needle) == 1
reader = reader.replace(needle, needle + "\n    assert publication['imageVersion'] == 'prepared-display-optical-v1'\n    assert publication['parent']['publication']['imageVersion'] == 'prepared-optical-v1'")
needle="assert publication['source']['credit'] in phases['prepared-committed-source-retired']['activeText']"
reader = reader.replace(needle, needle + "\n    assert publication['processing']['geometryExclusion']['credit'] in phases['prepared-committed-source-retired']['activeText']\n    assert '显示估计' in phases['prepared-committed-source-retired']['activeText'] and '负值显示截零' in phases['prepared-committed-source-retired']['activeText']")
needle="captures = []"
reader = reader.replace(needle, "daylight = read(LANE / 'prepared-display-daylight-results.json')\n    assert [row['name'] for row in daylight] == ['day', 'twilight', 'night']\n    assert daylight[0]['sunAltitudeDeg'] > 5 and -12 < daylight[1]['sunAltitudeDeg'] < 0 and daylight[2]['sunAltitudeDeg'] < -18\n    for row in daylight:\n        phase = phases['prepared-display-' + row['name']]\n        assert phase['scene']['at'] == row['at'] and phase['frameResources']['geometry']['sunAltitudeDeg'] == row['sunAltitudeDeg']\n        assert phase['completedSources']['optical']['publicationHash'] == pin['hash']\n        assert phase['completedSources']['optical']['field']['level'] == 'DETAIL'\n        assert phase['frameResources']['calls']['solarLight']['submitted'] == 1\n    " + needle)
reader = reader.replace("'quality': 'Prepared rectangular boundary remains FAILED; ordinary registry empty'", "'quality': 'Soft detail/grain, complete weak structure/edge/seam/registration unadopted; ordinary registry empty'")
reader = reader.replace("'allW3TilesReadyAndSubmitted': 12", "'actualDayTwilightNight': daylight, 'allW3TilesReadyAndSubmitted': 12")
reader = reader.replace('SAVED_ACTUAL_PREPARED_COMBINATIONS_DEVELOPMENT_READBACK', 'SAVED_ACTUAL_PREPARED_DISPLAY_COMBINATIONS_DEVELOPMENT_READBACK')
reader = reader.replace("['resourceSummary', 'capturesGlPngGl']", "['resourceSummary', 'capturesGlPngGl', 'actualDayTwilightNight']")
reader_target = SCRIPTS / 'readback-prepared-display-combination-2026-10-04.py'
with reader_target.open('x', encoding='utf-8') as stream:
    stream.write(reader)
OUT.mkdir(exist_ok=False)
copied = []
for name in ['page-bundle.js', 'source-bindings-before.json', 'metafile.json', 'observed-boundaries.json', 'executed-build.mts']:
    before = bind(OLD / name)
    shutil.copyfile(OLD / name, OUT / name)
    after = bind(OUT / name)
    assert (before['bytes'], before['sha256']) == (after['bytes'], after['sha256'])
    copied.append({'before': before, 'after': after})
with (OUT / 'reused-current-build.json').open('x', encoding='utf-8') as stream:
    stream.write(json.dumps({'scope': 'Every current frontend bundle input unchanged; five files copied exactly, no frontend rebuild or image processing. Fresh broad scope snapshot includes later explicit type-test repair.', 'files': copied}, indent=2) + '\n')
print(json.dumps({'script': bind(target), 'reader': bind(reader_target), 'reusedBuildFiles': len(copied),
                  'boundCurrentSources': len(current), 'postOriginalPageTransitions': transitions}, ensure_ascii=False))
