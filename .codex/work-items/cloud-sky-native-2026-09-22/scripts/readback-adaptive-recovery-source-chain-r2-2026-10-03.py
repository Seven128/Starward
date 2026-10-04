"""Standalone packet/role/code readback, no producer or numeric processing."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT/'output/adaptive-recovery-source-chain-1003-r1'
dest = OUT/'readback-r2'
dest.mkdir(exist_ok=False)
checked = {}
def file(v):
    p = (ROOT/v['path']).resolve()
    assert p.is_relative_to(ROOT.resolve())
    if p not in checked:
        h = hashlib.sha256()
        with p.open('rb') as f:
            for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
        checked[p] = {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}
    assert checked[p] == v, v['path']
    return checked[p]
def load(v):
    file(v)
    return json.loads((ROOT/v['path']).read_bytes())
def canonical(v):return json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode('utf-8')
result = json.loads((OUT/'result.json').read_bytes())
assert result['packet']['sha256'] == 'ec04c42ff5fa7942479095efe7c5eb78c26b1858db1ef64fc2381cb74bc1292c'
packet = load(result['packet']);pins = load(result['externalPins'])
assert hashlib.sha256(canonical(packet)).hexdigest() == result['canonicalPacketSha256']
assert packet['documents'] == pins['documents']
docs = {k:load(v) for k,v in packet['documents'].items()}
assert docs['current']['version'] == 'sdss-adaptive-other-scan-flag-display-recovery-candidate-v2'
assert packet['processingRoles'] == {k:docs[k]['version'] for k in ('adaptive','halo','supply','current')}
assert packet['source'] == docs['disclosure']['source']
assert packet['inputSnapshotRole']['processingVersion'] == 'sdss-common-noise-display-candidate-v1'
for role,history in packet['historicalExecutions'].items():
    original = pins['executions'][role]
    assert {k:history[k] for k in original} == original
    old = load(history['before']);assert old == load(history['after'])
    execution = load(history['result']);assert execution['candidate'] == packet['documents'][role]
    producer = file(history['producer'])
    resolved = history['resolvedHistoricalInputs'];assert [v['original'] for v in resolved] == old
    for row in resolved:
        actual = file(row['verifiedBytesAt'])
        assert (actual['bytes'],actual['sha256']) == (row['original']['bytes'],row['original']['sha256'])
    assert any(v['sha256'] == producer['sha256'] for v in old)
for role,products in packet['products'].items():
    for kind,values in products.items():
        for name,v in values.items():
            file(v)
            m = docs[role][kind][name]
            assert (m['bytes'],m['sha256']) == (v['bytes'],v['sha256'])
for v in packet['modelEvidence'].values():file(v)
numeric = docs['readback']
assert numeric['candidate'] == packet['documents']['current']
assert [v['original'] for v in packet['numericReadbackInputsResolved']] == numeric['inputs']
for row in packet['numericReadbackInputsResolved']:
    actual = file(row['verifiedBytesAt']);old = row['original']
    assert (actual['bytes'],actual['sha256']) == (old['bytes'],old['sha256'])
    assert not (row['verifiedBytesAt']['path'] != old['path'] and not old['path'].endswith(('.py','.ts','.mts','.mjs')))
qualification = docs['qualification']
assert hashlib.sha256(canonical(qualification)).hexdigest() == docs['current']['savedExecutionCanonicalSha256']
assert hashlib.sha256(canonical(docs['supply'])).hexdigest() == docs['current']['savedSupplyReportCanonicalSha256']
assert qualification['currentInputSnapshot']['master']['targetIdentity']['objectRef'] == packet['objectRef']
assert all(packet[k] == 0 for k in ('sourceRequests','filterRuns','projectionRuns','statisticalFitCalls','pngDerivationRuns'))
assert packet['adopted'] is False and packet['runtimePublication'] == 'UNPUBLISHED'
assert packet['quality'] == 'UNVERIFIED' and packet['independentReview'] == 'MISSING'
file(result['inspector']);file(result['executedScript'])
outcome = {'packet':result['packet'],'exactSourceCreditAndLicense':True,'fourHistoricalExecutionsExact':True,
    'historicalCodeBytesResolvedWithoutRelabelling':True,'currentInspectorSeparate':True,
    'savedNumericReadbackReused':True,'inputSnapshotRoleNotAlgorithmVersion':True,
    'checkedDistinctFiles':len(checked),'processingOrNumericReexecutions':0,'sourceRequests':0,
    'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False,'runtimePublication':'UNPUBLISHED',
    'scope':'Independent root byte/JSON readback only; no producer helper imports, source/image processing or independent reviewer quality acceptance.'}
with (dest/'result.json').open('x',encoding='utf-8') as f:json.dump(outcome,f,indent=2);f.write('\n')
print(json.dumps(outcome))
