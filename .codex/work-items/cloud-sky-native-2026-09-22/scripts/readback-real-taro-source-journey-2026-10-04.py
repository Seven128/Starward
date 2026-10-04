"""Saved Sources JSX/Back/Scene and alpha file-owner readback, no replay."""
from pathlib import Path
import json, hashlib, re
from PIL import Image
ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT/'output/sky-real-taro-source-readback-1004-r1'
OUT.mkdir(exist_ok=False)
read = lambda p: json.loads(p.read_text(encoding='utf-8-sig'))
def bind(p):
    b=p.read_bytes()
    return dict(path=p.relative_to(ROOT).as_posix(), bytes=len(b), sha256=hashlib.sha256(b).hexdigest())
try:
    results=[]
    old_sources={'apps/wechat-miniapp/src/services/sky-landscape-client.ts':'sky-landscape-client-before.ts',
                 'apps/wechat-miniapp/src/services/sky-public-image-runtime.ts':'sky-public-image-runtime-before.ts'}
    for number in [3,5]:
        lane=ROOT/f'output/playwright/cloud-sky-real-taro-source-1004-r{number}'
        before,after=[read(lane/f'source-bindings-{s}.json') for s in ['before','after']]
        assert before==after and len(before)==401
        assert any(r['path']=='apps/wechat-miniapp/src/sky/sources/index.tsx' for r in before)
        for r in before:
            p=ROOT/r['path']
            if number==3 and r['path'] in old_sources:
                b=(ROOT/'output/playwright/cloud-sky-landscape-alpha-file-1004-r1'/old_sources[r['path']]).read_bytes()
                assert len(b)==r['bytes'] and hashlib.sha256(b).hexdigest()==r['sha256']
            else: assert bind(p)==r, r['path']
        backend_before,backend_after=[read(lane/f'backend-source-bindings-{s}.json') for s in ['before','after']]
        assert backend_before==backend_after and len(backend_before)==162
        for r in backend_before: assert bind(ROOT/r['path'])==r, r['path']
        assets=read(lane/'public-asset-read-bindings.json')
        for r in assets['unique']: assert bind(ROOT/r['path'])==r, r['path']
        baseline=read(lane/'current-baseline-before.json')
        assert baseline==read(lane/'current-baseline-after.json')
        assert len(baseline['protected'])==6
        for r in baseline['protected']: assert bind(ROOT/r['path'])==r
        phases=read(lane/'phases.json');by={p['name']:p for p in phases}
        cold=by['complete-jsx-cold-painted'];source=by['actual-source-jsx-shown-sky-hidden']
        returned=by['actual-source-back-sky-painted-selection-restored'];final=by['unloaded-cleared']
        assert source['stack']==['sky/detail/index','sky/sources/index'] and source['activeRoute']=='sky/sources/index'
        assert all(s in source['activeText'] for s in ['Alderamin','BSC5P Bright Star Catalog','HEASARC','IAU','Wikidata','CC0 1.0'])
        assert source['gpu']=={} and source['owners'][0]['leased']==0 and source['owners'][0]['bytes']>0
        assert source['canvas']['data-sky-scene-state']=='UNAVAILABLE'
        assert returned['stack']==['sky/detail/index'] and returned['activeRoute']=='sky/detail/index'
        assert cold['scene']['supplement']==returned['scene']['supplement']==943
        assert cold['scene']['hash']==returned['scene']['hash'] and cold['scene']['identity']!=returned['scene']['identity']
        assert json.loads(cold['canvas']['data-sky-presented-view'])==json.loads(returned['canvas']['data-sky-presented-view'])
        assert returned['selection'][0]['text']=='Alderamin' and returned['modal']['data-object-reference']=='HR:8162'
        navigation=read(lane/'actual-navigation.json')
        assert navigation['sourceRootRemoved'] and navigation['sameCurrentSkyInstance']
        assert navigation['navigation']==[dict(url='/sky/sources/index?reference=HR%3A8162',action='navigateTo'),dict(action='navigateBack',route='sky/sources/index')]
        assert [(r['route'],r['name']) for r in navigation['lifecycle']]==[
            ('sky/detail/index','onHide'),('sky/sources/index','onLoad'),('sky/sources/index','onReady'),('sky/sources/index','onShow'),
            ('sky/sources/index','onHide'),('sky/sources/index','onUnload'),('sky/detail/index','onShow')]
        assert read(lane/'source-open-action.json')['dispatched'] and read(lane/'source-back-action.json')['dispatched']
        for name in ['software-cold','software-return']:
            facts=read(lane/f'{name}-pixels.json');raw=(lane/f'{name}.rgba').read_bytes()
            assert len(raw)==facts['bytes']==1316640 and hashlib.sha256(raw).hexdigest()==facts['sha256']
            image=Image.open(lane/f'{name}.png').convert('RGBA')
            assert image.size==(390,844) and image.transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes()==raw
        assert (lane/'software-cold.rgba').read_bytes()==(lane/'software-return.rgba').read_bytes()
        assert final['logicalNodes']==0 and final['gpu']=={} and final['queries']==[] and final['pendingNativeRequests']==0
        for k in ['entries','leased','bytes','reserved','running','pending','retired']: assert final['owners'][0][k]==0,k
        assert len(final['files'])==1 and final['files'][0]['bytes']==26
        requests=read(lane/'requests.json');warm=[r for r in requests if r['phase']=='actual-source-public-back']
        coarse=[r for r in requests if r['route'].endswith('/panorama-1024.alpha-rle.json')]
        assert all(r['receivedBytes']==19943 and r['status']==200 for r in coarse)
        assert len(coarse)==(2 if number==3 else 1)
        assert not any(r['binary'] and not r['route'].endswith('.alpha-rle.json') for r in warm), 'no warm picture/SAO asset transfer'
        assert read(lane/'browser-errors.json')==[]
        results.append(dict(lane=number,frontendSources=len(before),backendProjectGraphSources=len(backend_before),publicReadEvents=len(assets['reads']),publicReadFiles=len(assets['unique']),
            requests=len(requests),receivedBodyBytes=sum(r['receivedBytes'] for r in requests),warmBodyBytes=sum(r['receivedBytes'] for r in warm),
            coarseAlphaRequests=len(coarse),encodedCold=cold['owners'][0],encodedReturn=returned['owners'][0],final=final['owners'][0],
            sceneCalls=final['sceneCalls'],rgbaHash=read(lane/'software-return-pixels.json')['sha256']))
    assert results[0]['warmBodyBytes']-results[1]['warmBodyBytes']==19943
    result=dict(status='SAVED_ACTUAL_SOURCE_PAGE_BACK_AND_ALPHA_FILE_OWNER_READBACK',results=results,protectedExact=6,
        scope='Saved root self-review. Backend project import closure is a pinning graph, not a trace of every invoked branch or external dependency. Controlled native stack/geometry/MapFS and actual Taro logical JSX/Query/page lifecycle with software GPU only; no native WXML/CSS/device/full-family physical/capacity/independent claim. r3 archived pre-fix two Sky source bytes used; additional test route checks postdate r5 execution and do not alter executed product sources.')
    (OUT/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(result=bind(OUT/'result.json'),results=results)))
except Exception as e:
    (OUT/'failed.json').write_text(json.dumps(dict(error=str(e)),ensure_ascii=False,indent=2)+'\n',encoding='utf-8');raise
