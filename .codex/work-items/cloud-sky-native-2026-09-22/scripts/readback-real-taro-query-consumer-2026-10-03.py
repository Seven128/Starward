"""Read saved actual React/Taro/Query output; do not replay transport or matrices."""
from pathlib import Path
import json, hashlib, re, sys
ROOT = Path(__file__).resolve().parents[4]
LANE = ROOT/'output/sky-real-taro-query-1003-r7'
OUT = ROOT/'output/sky-real-taro-query-readback-1003-r2'
OUT.mkdir(exist_ok=False)
read = lambda p: json.loads(p.read_text(encoding='utf-8-sig'))
def bind(p):
    b = p.read_bytes()
    return dict(path=p.relative_to(ROOT).as_posix(), bytes=len(b), sha256=hashlib.sha256(b).hexdigest())
try:
    before, after = [read(LANE/f'source-bindings-{phase}.json') for phase in ['before', 'after']]
    assert before == after
    for v in before: assert bind(ROOT/v['path']) == v, v['path']
    cp = read(ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/evidence/current-execution-state-2026-10-03-r50.json')
    for v in cp['currentSources']+cp['protected']: assert bind(ROOT/v['path']) == v, v['path']
    paths = {v['path'] for v in before}
    for p in ['apps/wechat-miniapp/src/features/sky/use-sky-stellar-supplement.ts',
              'apps/wechat-miniapp/src/hooks/use-resource-query.ts',
              'apps/wechat-miniapp/src/services/query-client.ts',
              'apps/wechat-miniapp/src/services/api-client.ts',
              'apps/wechat-miniapp/src/services/sao-catalog-client.ts',
              'apps/wechat-miniapp/src/services/sky-public-image-runtime.ts']:
        assert p in paths, p
    assert not any(p.startswith(('node_modules/react/', 'node_modules/@tanstack/')) for p in paths)
    packages = {
        'react': ('apps/wechat-miniapp/node_modules/react/package.json', '18.3.1'),
        'reactQuery': ('apps/wechat-miniapp/node_modules/@tanstack/react-query/package.json', '5.90.21'),
        'queryCore': ('apps/wechat-miniapp/node_modules/@tanstack/query-core/package.json', '5.90.20'),
        'taroRenderer': ('apps/wechat-miniapp/node_modules/@tarojs/react/package.json', '4.2.1'),
        'reactReconciler': ('apps/wechat-miniapp/node_modules/react-reconciler/package.json', '0.29.0'),
    }
    for p, version in packages.values(): assert read(ROOT/p)['version'] == version
    r = read(LANE/'result.json')
    assert r['status'] == 'REAL_TARO_REACT_QUERY_PROVIDER_SAO_CONSUMER_DEVELOPMENT'
    assert r['sourceBindings'] == len(before)
    assert r['versions'] == {k: version for k, (_, version) in packages.items()}
    inputs = read(LANE/'scientific-inputs.json')
    assert bind(ROOT/inputs['index']['path']) == inputs['index']
    index = read(ROOT/inputs['index']['path'])
    assert inputs['catalogRows'] == 8404
    assert inputs['geometry']['catalogHash'] == index['baseAssetSha256']
    assert inputs['geometry']['catalogVersion'] == index['baseCatalogVersion']
    assert inputs['geometry']['at'] == inputs['at']
    assert inputs['geometry']['observer'] == inputs['observer']
    tiles = {t['id']: t for t in index['tiles']}
    trace = read(LANE/'trace.json'); assert r['trace'] == trace
    rows = {v['name']: v for v in trace}
    cold, partial = rows['cold-ready'], rows['returned-one-tile-failed']
    ids = cold['loaders'][-1]['last']['tiles']; assert len(ids) == len(set(ids)) == 7
    source_tiles = []
    for ident in ids:
        t = tiles[ident]; p = ROOT/'workers/miniapp-api/assets/sao-v2'/t['file']; v = bind(p)
        assert v['sha256'] == t['sha256'] and v['bytes'] == t['bytes']
        assert len(read(p)['rows']) == t['rowCount']; source_tiles.append(v)
    assert cold['points'] == sum(tiles[i]['rowCount'] for i in ids) == r['coldPoints'] == 324
    requests = read(LANE/'requests.json'); failed = [v for v in requests if v['status'] != 200]
    assert len(failed) == 1 and failed[0]['status'] == 503 and not failed[0]['aborted']
    failed_tile = failed[0]['url'].split('/')[-1]
    assert partial['points'] == cold['points']-tiles[failed_tile]['rowCount'] == r['partialPoints'] == 279
    assert partial['failed'] and not partial['loading'] and partial['points'] > 0
    assert cold['hash'] == partial['hash'] == r['samePublicationHash']
    assert cold['publicationIdentity'] != partial['publicationIdentity']
    assert r['queryIdentities'] == [cold['publicationIdentity'], partial['publicationIdentity']]
    for row in trace:
        text = json.loads(row['logicalText'])
        for key in ['active', 'points', 'loading', 'failed', 'hash']: assert text[key] == row[key], (row['name'], key)
    cleared = rows['actual-clear-hidden']
    assert not cleared['queryPresent'] and cleared['cache'][0]['entries'] == cleared['cache'][0]['bytes'] == 0
    assert cleared['cache'][0]['epoch'] == 1
    recovered = rows['explicit-retry-ready']
    assert recovered['points'] == cold['points'] and not recovered['failed'] and not recovered['loading']
    assert recovered['publicationIdentity'] != partial['publicationIdentity']
    assert rows['held-read-hidden']['cache'][0]['leased'] == rows['actual-clear-held-incomplete']['cache'][0]['leased'] == 1
    assert rows['actual-clear-held-incomplete']['cache'][0]['retired'] == 7
    assert not rows['actual-clear-held-incomplete']['queryPresent']
    assert rows['late-read-retired']['cache'][0]['leased'] == 0
    assert rows['late-read-retired']['points'] == 0 and not rows['late-read-retired']['active']
    assert all(v['disposed'] for v in rows['explicit-cleanup-retry-complete']['loaders'])
    for row in [rows['explicit-cleanup-retry-complete']['cache'][0], r['final']]:
        for key in ['entries', 'leased', 'bytes', 'reserved', 'running', 'pending', 'retired']: assert row[key] == 0
    assert r['final']['failures'] == 1  # Preserve observed counter; do not call it zero.
    assert r['logicalContainerAfterUnmount'] == 0
    native_reads = read(LANE/'native-reads.json')
    for v in native_reads:
        match = re.fullmatch(r'stage-catalog_([a-f0-9]{64})_([a-f0-9]{64})_[a-z0-9_]+-[1-9]\d*', v['file'])
        assert match and match[2] == v['sha256']
        assert any(t['sha256'] == v['sha256'] and t['bytes'] == v['bytes'] for t in tiles.values())
    assert len(native_reads) == trace[-1]['nativeReads'] and len(native_reads) >= 21
    assert [row['nativeReads'] for row in trace] == sorted(row['nativeReads'] for row in trace)
    files = list((LANE/'owned-files').rglob('*')); files = [p for p in files if p.is_file()]
    assert len(files) == 1 and files[0].name == 'index-v2.json'
    assert read(files[0]) == {'version': 2, 'entries': []} and files[0].stat().st_size == 26
    process = read(LANE/'process-completion.json')
    assert process['status'] == 'TASK_PROCESS_STOPPED_AFTER_SAVED_ASSERTIONS' and process['matchedTaskOnly']
    output = dict(status='ACTUAL_TARO_REACT_QUERY_SAVED_DEVELOPMENT_READBACK',
        sourceBindings=before, checkpointSourcesExact=len(cp['currentSources']), protectedExact=len(cp['protected']),
        installedPackages={k: bind(ROOT/p) for k, (p, _) in packages.items()}, scientificTiles=source_tiles,
        points=[cold['points'], partial['points'], recovered['points']], publicationIdentities=[cold['publicationIdentity'], partial['publicationIdentity'], recovered['publicationIdentity']],
        compressedCatalogBytes=sum(tiles[i]['bytes'] for i in ids), controlledRequestCount=len(requests),
        controlledResponseBytes=sum(v['bytes'] for v in requests), nativeReadCount=len(native_reads), finalInventory=bind(files[0]),
        observedFailureCounter=r['final']['failures'], taskProcessExit=process,
        origins=[bind(LANE/n) for n in ['result.json','trace.json','commits.json','requests.json','native-reads.json','scientific-inputs.json','source-bindings-before.json','source-bindings-after.json','metafile.json','consumer.mjs','executed-script.mts','process-completion.json']],
        scope='Root saved byte/JSON readback is self-review, not independent. Actual installed renderer/React/Query/full Hook; controlled native callbacks/storage/transport and isolated Node files. Logical Taro text is not WXML/Canvas/physical rendering. Controlled response bytes are not HTTP encoded bytes or capacity. Task did not exit naturally; only verified task process stopped after persisted assertions. No runtime process-quiescence, full page, native UI, total physical-memory, quality or capacity claim.')
    (OUT/'result.json').write_text(json.dumps(output, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(dict(result=bind(OUT/'result.json'), sourceBindings=len(before), protectedExact=6, points=output['points'], controlledResponseBytes=output['controlledResponseBytes'])))
except Exception as e:
    (OUT/'failed.json').write_text(json.dumps(dict(error=str(e)), ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    raise
