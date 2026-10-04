"""Bind the one changed retention input and a narrow public warm-zoom path."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
SCRIPTS = TASK / 'scripts'


def bind(path):
    data = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def write(path, text):
    with path.open('x', encoding='utf-8', newline='\n') as handle:
        handle.write(text)


def main():
    old_checkpoint = '.codex/work-items/cloud-sky-native-2026-09-22/tmp/prepared-progressive-current-inputs-2026-10-05.json'
    checkpoint = '.codex/work-items/cloud-sky-native-2026-09-22/tmp/prepared-progressive-retention-inputs-2026-10-05.json'
    old = json.loads((ROOT / old_checkpoint).read_bytes())
    changed = []
    current = []
    for row in old['currentSources']:
        actual = bind(ROOT / row['path'])
        if actual != row:
            assert row['path'] == 'apps/wechat-miniapp/src/features/sky/use-sky-target-optical.ts', row['path']
            changed.append({'before': row, 'after': actual})
        current.append(actual)
    assert len(changed) == 1
    for row in old['protected']:
        assert bind(ROOT / row['path']) == row
    write(ROOT / checkpoint, json.dumps({'currentSources': current, 'protected': old['protected'],
        'previousCheckpoint': bind(ROOT / old_checkpoint), 'retentionCorrection': changed,
        'scope': 'Only the optical Hook retention target changed since the frozen R1 page checkpoint. No previous receipt is rewritten.'}, ensure_ascii=False, indent=2) + '\n')
    build = (SCRIPTS / 'build-prepared-progressive-page-2026-10-05.mts').read_text(encoding='utf-8').replace(old_checkpoint, checkpoint)
    assert build.count('};return value;}') == 1
    build = build.replace('};return value;}', '};w.opticalHookStates?.push({phase:w.phase,performanceAt:performance.now(),...w.sdssHook});return value;}')
    needle = "   const s=raw.replace('export function registerSkyNativeImageLifetime(','function originalRegisterSkyNativeImageLifetime(')+"
    assert build.count(needle) == 1
    build = build.replace(needle, "   const observedRaw=raw.replace('    deps.changed({images,retainedImages,failed,loading});','    deps.changed({images,retainedImages,failed,loading});\\n    globalThis.__recordArtworkRetention?.({budget,wanted:wanted.map(a=>({id:a.id,sha256:a.sha256,width:a.width,height:a.height})),entries:[...entries].map(([sha,e])=>({sha,ids:[...e.ids],state:e.state,loaded:!!e.loaded,file:!!e.file,width:e.asset.width,height:e.asset.height}))});');\n" + needle.replace('s=raw.replace', 's=observedRaw.replace'))
    write(SCRIPTS / 'build-prepared-progressive-retention-2026-10-05.mts', build)
    code = (SCRIPTS / 'experience-prepared-progressive-page-2026-10-05.mts').read_text(encoding='utf-8').replace(old_checkpoint, checkpoint)
    code = code.replace('failOpticalDetail=true', 'failOpticalDetail=false')
    needle = ' w.resourceSamples=[];w.nativeImageOwners=[];w.frameResources=[];'
    assert code.count(needle) == 1
    code = code.replace(needle, needle + "\n w.opticalHookStates=[];w.artworkRetention=[];globalThis.__recordArtworkRetention=row=>w.artworkRetention.push({phase:w.phase,performanceAt:performance.now(),...row});")
    start = code.index("await zoom(.2,'m82-overview');")
    end = code.index('await page.evaluate(async()=>{const api=globalThis.actualSkyPage', start)
    scenario = '''await zoom(.2,'retention-first-overview');const overview=await optical('OVERVIEW');phase.push({name:'retention-overview-ready',...overview});
await zoom(.1,'retention-first-medium');const medium=await optical('MEDIUM');phase.push({name:'retention-medium-ready',...medium});
await zoom(.05,'retention-first-detail');const detail=await optical('DETAIL');phase.push({name:'retention-detail-ready',...detail});await capturePixels('software-retention-detail-before');
const binaries=()=>requests.filter(r=>r.binary&&r.route.startsWith('/v2/sky/prepared-optical/'+displayHash+'/')&&r.status===200).length;
assert.equal(binaries(),3);const initialTransfers=binaries();
const preparedHashes=new Set(Object.values(publication.levels).map(a=>a.sha256));
const activePrepared=v=>v.resources.decodedSourceIdentities.filter(i=>preparedHashes.has(i.sha256));
const readyBefore=activePrepared(detail);assert.deepEqual(new Set(readyBefore.map(i=>i.sha256)),new Set([publication.levels.MEDIUM.sha256,publication.levels.DETAIL.sha256]));
assert.equal(readyBefore.reduce((n,i)=>n+i.width*i.height*4,0),8*1024*1024);
await zoom(.2,'retention-warm-overview');const coarse=await optical('OVERVIEW');phase.push({name:'retention-warm-overview-ready',...coarse});await capturePixels('software-retention-overview');
assert.equal(binaries(),initialTransfers);assert.equal(coarse.scene.at,detail.scene.at);
const coarseImages=activePrepared(coarse);assert.equal(coarseImages.length,1);assert.equal(coarseImages[0].sha256,publication.levels.OVERVIEW.sha256);
assert.equal(coarseImages[0].width*coarseImages[0].height*4,1024*1024);
await zoom(.05,'retention-warm-detail');const restored=await optical('DETAIL');phase.push({name:'retention-warm-detail-ready',...restored});await capturePixels('software-retention-detail-after');
assert.equal(binaries(),initialTransfers);assert.equal(restored.scene.at,detail.scene.at);assert.deepEqual(JSON.parse(restored.canvas['data-sky-presented-view']),JSON.parse(detail.canvas['data-sky-presented-view']));
const readyAfter=activePrepared(restored);assert.deepEqual(new Set(readyAfter.map(i=>i.sha256)),new Set([publication.levels.MEDIUM.sha256,publication.levels.DETAIL.sha256]));
const diagnostics=await page.evaluate(()=>({retention:globalThis.__controlled.artworkRetention,opticalHookStates:globalThis.__controlled.opticalHookStates}));
const opticalRetention=diagnostics.retention.filter(r=>r.wanted.some(a=>a.id.startsWith('prepared:M:82:')));assert(opticalRetention.length>0);assert(opticalRetention.every(r=>r.budget===2*512*512*4));
await save('retention-diagnostics.json',{...diagnostics,activeBefore:readyBefore,activeOverview:coarseImages,activeAfter:readyAfter,initialTransfers,finalTransfers:binaries(),actualAt:detail.scene.at,actualView:JSON.parse(detail.canvas['data-sky-presented-view'])});
await save('public-canvas-touch-actions.json',gestures);await save('public-search-actions.json',publicSearch);
await navBack();returned=await wait(v=>v.activeRoute==='pages/map/index'&&v.pendingNativeRequests===0&&v.mapButtons.some(n=>n.props['data-control']==='spot-cloud-stargazing-action'&&!n.props.disabled));phase.push({name:'retention-return-map',...returned});assert.equal(returned.selectedSpotId,entry.selectedSpotId);assert.equal(returned.resources.activeDecodedImageHandles,0);assert.equal(returned.resources.gpuTextureUploadModelBytes,0);
await save('m82-scope-result.json',{hash:displayHash,successfulPreparedBinaryTransfers:binaries(),injectedDetailFailures:0,retentionTargetBytes:2*512*512*4,wantedDetailBytes:8*1024*1024,wantedOverviewBytes:1024*1024,warmZoomNoNewPngBody:true,ordinaryAdoption:false,wholeNativePage:'UNVERIFIED',quality:'UNVERIFIED_NOT_ADOPTED',scope:'Only the measured retention correction and public warm zoom; no replay of outage, Source Back, hide/show or layer matrix.'});

'''
    code = code[:start] + scenario + code[end:]
    code = code.replace('ACTUAL_TARO_PREPARED_PROGRESSIVE_PUBLICATION_PAGE_DEVELOPMENT', 'ACTUAL_TARO_PREPARED_PROGRESSIVE_RETENTION_CORRECTION')
    write(SCRIPTS / 'experience-prepared-progressive-retention-2026-10-05.mts', code)
    print(json.dumps({'currentPins': len(current), 'changed': changed, 'checkpoint': bind(ROOT / checkpoint),
        'build': bind(SCRIPTS / 'build-prepared-progressive-retention-2026-10-05.mts'),
        'runtime': bind(SCRIPTS / 'experience-prepared-progressive-retention-2026-10-05.mts')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
