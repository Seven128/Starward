"""Publish a bounded non-private evidence packet, preserving original results."""
from pathlib import Path
from collections import Counter
import hashlib
import json
import shutil
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
OUT = TASK / 'evidence/consultation-2026-10-05'
PAGE = ROOT / 'output/playwright/cloud-sky-prepared-progressive-retention-1005-r2'
sys.path.insert(0, str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from PIL import Image


def read(path):
    return json.loads(path.read_bytes())


def bind(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def write(path, value):
    with path.open('x', encoding='utf-8', newline='\n') as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2, allow_nan=False)
        handle.write('\n')


def main():
    assert not OUT.exists()
    runtime = read(PAGE / 'result.json')
    assert runtime['status'] == 'ACTUAL_TARO_PREPARED_PROGRESSIVE_RETENTION_CORRECTION'
    baseline = read(PAGE / 'current-baseline-before.json')
    assert baseline == read(PAGE / 'current-baseline-after.json')
    for row in baseline['currentSources'] + baseline['protected']:
        assert bind(ROOT / row['path']) == row, row['path']
    for stem in ['source-bindings', 'backend-source-bindings']:
        assert read(PAGE / (stem + '-before.json')) == read(PAGE / (stem + '-after.json'))
    pixels = {}
    captures = []
    for name in ['software-retention-detail-before', 'software-retention-overview', 'software-retention-detail-after']:
        raw = (PAGE / (name + '.rgba')).read_bytes()
        meta = read(PAGE / (name + '-pixels.json'))
        assert raw == (PAGE / (name + '-after.rgba')).read_bytes()
        rgba = np.frombuffer(raw, np.uint8).reshape(meta['height'], meta['width'], 4)[::-1]
        with Image.open(PAGE / (name + '.png')) as image:
            assert np.array_equal(np.array(image.convert('RGBA')), rgba)
        pixels[name] = rgba
        captures.append({'name': name, 'png': bind(PAGE / (name + '.png')), 'rgba': bind(PAGE / (name + '.rgba')), 'fullGlPngGlExact': True})
    assert np.array_equal(pixels['software-retention-detail-before'], pixels['software-retention-detail-after'])
    phases = read(PAGE / 'phases.json')
    before = next(p for p in phases if p['name'] == 'retention-detail-ready')
    after = next(p for p in phases if p['name'] == 'retention-warm-detail-ready')
    view_before = json.loads(before['canvas']['data-sky-presented-view'])
    view_after = json.loads(after['canvas']['data-sky-presented-view'])
    fov_before, fov_after = view_before.pop('verticalFovDeg'), view_after.pop('verticalFovDeg')
    assert view_before == view_after and abs(fov_before-fov_after) <= sys.float_info.epsilon
    final = phases[-1]
    assert final['name'] == 'unloaded-cleared'
    assert all(v == 0 for v in final['gpu'].values())
    for key in ['activeDecodedImageHandles', 'sourceRgbaEquivalentBytes', 'gpuTextureUploadModelBytes', 'gpuBufferUploadModelBytes']:
        assert final['resources'][key] == 0
    for owner in final['owners']:
        for key in ['entries','leased','bytes','reserved','running','pending','retired']:
            assert owner[key] == 0
    pub = read(ROOT / 'output/prepared-progressive-publication-1005-r1/manifest.json')
    requests = read(PAGE / 'requests.json')
    binary = [r for r in requests if r.get('binary') and r['route'].startswith('/v2/sky/prepared-optical/'+pub['publicationHash']+'/') and r.get('status') == 200]
    assert len(binary) == 3
    for asset in pub['levels'].values():
        rows = [r for r in binary if r['route'] == asset['downloadUrl']]
        assert len(rows) == 1 and rows[0]['sha256'] == asset['sha256'] and rows[0]['receivedBytes'] == asset['bytes']
    diagnostic = read(PAGE / 'retention-diagnostics.json')
    active_bytes = {key: sum(4*r['width']*r['height'] for r in diagnostic[key]) for key in ['activeBefore','activeOverview','activeAfter']}
    assert active_bytes == {'activeBefore':8388608,'activeOverview':1048576,'activeAfter':8388608}
    retention = [r for r in diagnostic['retention'] if any(a['id'].startswith('prepared:M:82:') for a in r['wanted'])]
    assert retention and all(r['budget'] == 2097152 for r in retention)
    hook_counts = Counter((r['phase'], r['renderedLevel']) for r in diagnostic['opticalHookStates'] if str(r['phase']).startswith('retention-warm'))
    warm_frames = [{'phase':r['phase'], 'fov':r['fov'], 'preparedLevels':[i.get('level') for i in r['sourceImages'] if i['family']=='prepared-optical']}
        for r in read(PAGE/'frame-resources.json') if str(r['phase']).startswith('retention-warm')]
    warm_sources = [{'phase':r['phase'], 'optical':r.get('optical')}
        for r in read(PAGE/'completed-source-receipts.json') if str(r['phase']).startswith('retention-warm')]
    failure = ROOT / 'output/playwright/cloud-sky-prepared-progressive-retention-1005-r1/failed.json'
    old_failure = ROOT / 'output/playwright/cloud-sky-prepared-boundary-pairs-1004-r1/failed.json'
    assert bind(old_failure)['sha256'] == '65a039503d6b2b6fa5bcabcb94ba811f33931f58f5864859a4d4a77626343f5f'
    summary = {'status':'SAVED_RETENTION_CORRECTION_PIXELS_AND_RESOURCE_READBACK',
        'sourceScope': {'currentSources':len(baseline['currentSources']), 'protected':len(baseline['protected']),
            'frontend':len(read(PAGE/'source-bindings-before.json')), 'backend':len(read(PAGE/'backend-source-bindings-before.json'))},
        'captures':captures,'strictWarmPixelDifference':0,'sameTimeAndProjection':True,
        'actualAt':before['scene']['at'],'fovBefore':fov_before,'fovAfter':fov_after,
        'preparedActiveRgbaEquivalentBytes':active_bytes,'retentionTargetBytes':2097152,
        'warmHookStates':[{'phase':p,'renderedLevel':level,'observations':n} for (p,level),n in hook_counts.items()],
        'warmTransitionFrames':warm_frames,'warmCompletedSources':warm_sources,
        'warmContinuity':'OPEN: one warm overview Scene receives no Prepared image, with two overview and one detail completed optical source null. Stable pixel restoration does not establish uninterrupted refinement; duration/full causality unverified.',
        'actualReadyResources':before['resources'], 'wholeJourneyResourceSummary':read(PAGE/'resource-summary.json'),
        'requests':len(requests),'receivedBodyBytes':sum(r.get('receivedBytes',0) for r in requests),
        'successfulPreparedPngRequests':binary,'preparedPngBytesOnlyOnce':sum(r['receivedBytes'] for r in binary),
        'finalActiveAndRetiredZero':True,'originalTaskFloatFailure':bind(failure),
        'originalTaskFloatFailureMeaning':'R1 completed three pixel captures, but compared FOV final floating digits exactly. R2 compares the unchanged projection exactly, bounds only FOV rounding by Number.EPSILON and additionally requires complete GL bytes equal. R1 final logical retirement remains missing; no production fix/rebuild for this task assertion.',
        'oldBoundaryFailurePreserved':bind(old_failure),
        'limits':'Controlled native ports/software WebGL actual page; not native WEAPP/WXML, physical peak, complete quality/coverage, static network exit, capacity or independent review. Retention pressure is not a current working-set cap.'}
    OUT.mkdir()
    write(OUT/'retention-readback.json',summary)
    mappings = {
        'progressive-manifest.json':'output/prepared-progressive-publication-1005-r1/manifest.json',
        'progressive-publication-result.json':'output/prepared-progressive-version-1005-r1/result.json',
        'progressive-page-readback.json':'output/prepared-progressive-readback-1005-r1/result.json',
        'progressive-static-check.json':'output/prepared-progressive-static-check-1005-r1/result.json',
        'development-checks.json':'output/prepared-progressive-checks-1005-r1/result.json',
        'source-page.json':'output/playwright/cloud-sky-prepared-progressive-page-1005-r1/m82-actual-source-page.json',
        'm82-overview.png':'output/playwright/cloud-sky-prepared-progressive-page-1005-r1/software-m82-overview.png',
        'm82-detail.png':'output/playwright/cloud-sky-prepared-progressive-page-1005-r1/software-m82-detail.png',
        'boundary-hubble-512.png':'output/playwright/cloud-sky-prepared-boundary-pairs-1004-r1/software-boundary-hubble-coarse.png',
        'boundary-hubble-1024.png':'output/playwright/cloud-sky-prepared-boundary-medium-1004-r1/software-boundary-higher-medium.png',
        'boundary-noirlab-raw.png':'output/playwright/cloud-sky-prepared-boundary-pairs-1004-r1/software-boundary-noirlab-raw-coarse.png',
        'boundary-noirlab-display.png':'output/playwright/cloud-sky-prepared-boundary-pairs-1004-r1/software-boundary-noirlab-display-coarse.png',
        'boundary-readback.json':'output/prepared-boundary-readback-1004-r1/result.json',
        'noirlab-display-manifest.json':'output/prepared-large-display-publication-1004-r1/manifest.json',
    }
    copies=[]
    for name, origin in mappings.items():
        source=ROOT/origin
        shutil.copyfile(source,OUT/name)
        assert source.read_bytes() == (OUT/name).read_bytes()
        copies.append({'source':bind(source),'copy':bind(OUT/name)})
    write(OUT/'copy-manifest.json',{'copiedWithoutModification':copies,'sourceRecordsMayReferToIgnoredLocalFiles':True,
        'scope':'Selected shareable actual output, not complete local raw dataset, hidden native test suite or full evidence archive.'})
    noir=read(OUT/'noirlab-display-manifest.json')
    credits={'hubble':pub['source']['credit'],'noirlab':noir['source']['credit']}
    write(OUT/'credits.json',credits)
    print(json.dumps({'packet':OUT.relative_to(ROOT).as_posix(),'filesCopied':len(copies),'strictPixelDifference':0,
        'activePreparedBytes':active_bytes,'requests':len(requests),'bodyBytes':summary['receivedBodyBytes'],
        'maxima':summary['wholeJourneyResourceSummary']['maxima'],'credits':credits},ensure_ascii=False))


if __name__ == '__main__':
    main()
