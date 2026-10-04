"""Self-readback/bindings of the explicit software-GPU prototype generation."""
from pathlib import Path
import hashlib
import json
import sys

ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from PIL import Image

def bind(path):
    raw=path.read_bytes()
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}

def verify(item):
    actual=bind(Path(item['path']) if Path(item['path']).is_absolute() else ROOT/item['path'])
    assert actual['sha256']==item['sha256']
    if 'bytes' in item:assert actual['bytes']==item['bytes']
    return actual

def main():
    folder=ROOT/'output/playwright/cloud-sky-sdss-level-composition-1002-r3'
    report=json.loads((folder/'result.json').read_bytes())
    items={}
    for item in [report['script'],*report['sourceHashes'],*report['inputs'],*report['artifacts']]:
        items[item['path']]=verify(item)
    assert (folder/'executed-script.mts').read_bytes()==(ROOT/report['script']['path']).read_bytes()
    source=[]
    for name in ('sky-gpu-renderer.ts','sky-artwork-level-composition.ts','sky-gpu-textures.ts'):
        actual=bind(ROOT/'apps/wechat-miniapp/src/features/sky'/name)
        assert actual['sha256']==bind(folder/'source-snapshots'/name)['sha256']
        source.append(actual)
    tests=[bind(ROOT/'apps/wechat-miniapp/src/features/sky'/name) for name in ('sky-gpu-textures.test.ts','sky-artwork-level-composition.test.ts','sky-artwork-texture-window.test.ts')]
    pixels={}
    rows=[]
    for row in report['rows']:
        rgba=np.frombuffer((folder/(row['name']+'.rgba')).read_bytes(),dtype=np.uint8).reshape(844,390,4)
        png=np.asarray(Image.open(folder/(row['name']+'.png')).convert('RGBA'))
        assert np.array_equal(png,rgba[::-1])
        pixels[row['name']]=rgba
        assert row['drawError'] is None and row['glError']==0 and row['releasedTextures']==0 and row['releasedLogicalBytes']==0 and row['sceneSourceCredit'] is None
        rows.append({'name':row['name'],'pngEqualsActualRgba':True,'groupPasses':row['groupPasses'],'peakLogicalBytes':row['peakLogicalBytes']})
    assert np.array_equal(pixels['night-fine-upload-failure'],pixels['night-coarse-only'])
    assert np.array_equal(pixels['night-invalid-fine-registration'],pixels['night-coarse-only'])
    assert np.array_equal(pixels['night-recovered-fresh-image'],pixels['night-real-pair'])
    assert np.array_equal(pixels['night-low-budget-pair'],pixels['night-real-pair'])
    warm=next(row for row in report['rows'] if row['name']=='night-real-pair')
    assert warm['warmChangedPixels']==0 and warm['coldRgbaSha256']==warm['rgbaSha256'] and len(warm['uploads'])==3
    same=next(row for row in report['rows'] if row['name']=='night-shared-bitmap')
    assert len(same['uploads'])==1 and same['uploads'][0]['id']=='OVERVIEW'
    prior=ROOT/'output/playwright/cloud-sky-sdss-level-composition-1002-r2'
    previous=json.loads((prior/'result.json').read_bytes())
    assert previous['productionBundleSha256']==report['productionBundleSha256']
    assert all((prior/(row['name']+'.rgba')).read_bytes()==(folder/(row['name']+'.rgba')).read_bytes() for row in report['rows'])
    before=ROOT/'output/playwright/cloud-sky-sdss-level-pressure-before-1002-r1'
    after=ROOT/'output/playwright/cloud-sky-sdss-level-pressure-after-1002-r1'
    b=json.loads((before/'result.json').read_bytes());a=json.loads((after/'result.json').read_bytes())
    assert b['rows'][0]['drawError']=='Error: sky_gpu_artwork_levels_draw_failed'
    assert a['rows'][0]['drawError'] is None and a['rows'][0]['groupDraws'][0]['submitted']
    assert b['rows'][0]['rgbaSha256']!=a['rows'][0]['rgbaSha256']
    assert np.array_equal(np.frombuffer((after/'night-low-budget-pair.rgba').read_bytes(),dtype=np.uint8).reshape(844,390,4),pixels['night-real-pair'])
    preserved=json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
    unchanged=[verify(item) for item in preserved]
    frozen=json.loads((ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2/binding.json').read_bytes())
    old_assets=[verify(item) for item in frozen['oldAssetsAfter']]
    old_single=[verify(item) for item in frozen['oldCandidateAfter']]
    owner_snapshot_before=[bind(before/'source-snapshots'/name) for name in ('sky-gpu-renderer.ts','sky-artwork-level-composition.ts','sky-gpu-textures.ts')]
    result={'script':bind(Path(__file__)),'actualResult':bind(folder/'result.json'),'currentSources':source,'currentTests':tests,'checkedBindings':list(items.values()),'selfReadbackRows':rows,'typeOnlyRepairRuntimeBundleAndAllFramesSameAsR2':True,'realPressureBefore':bind(before/'result.json'),'realPressureAfter':bind(after/'result.json'),'pressureBeforeOwnerSnapshots':owner_snapshot_before,'coarseFallbackBlackAvailabilityMutationAndRecovery':report['comparisons'],'warmReusesActualWindowsNoUpload':True,'old201AssetsUnchanged':old_assets,'oldSingleFieldUnchanged':old_single,'sixPreservedUnrelatedUnchanged':unchanged,'scope':'self-readback, not independent review; explicit opt-in only; no publication/adoption/source credit/native performance/quality acceptance'}
    path=TASK/'evidence/experience-sdss-level-composition-readback-2026-10-02.json'
    with path.open('x',encoding='utf-8') as file:json.dump(result,file,indent=2)
    print(json.dumps({'review':bind(path),'source':source,'oldAssets':len(old_assets),'scope':result['scope']}))

if __name__=='__main__':main()
