"""Reuse pinned historical execution/readback; no source processing rerun."""
from pathlib import Path
import hashlib
import json
import sys
import time

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
sys.path[:0] = [str(ROOT/'output/allwise-w3-atlas-0929/python-deps'), str(ROOT/'data-pipelines/deep-sky')]
from sdss_noise_display_provenance import bind_saved_adaptive_recovery_chain, canonical_bytes

def bind(p):
    raw = p.read_bytes()
    return {'path':p.relative_to(ROOT).as_posix(), 'bytes':len(raw), 'sha256':hashlib.sha256(raw).hexdigest()}

def save(p, v):
    with p.open('x', encoding='utf-8') as f:
        json.dump(v, f, ensure_ascii=False, allow_nan=False, indent=2)
        f.write('\n')

def main():
    out = ROOT/'output/adaptive-recovery-source-chain-1003-r1'
    out.mkdir(exist_ok=False)
    started = time.perf_counter()
    checkpoint = TASK/'evidence/current-execution-state-2026-10-03-r33.json'
    assert bind(checkpoint)['sha256'] == 'ced82dff147d5516e37fecf386b490f872de0287e4a04ed14d77fcd29f4b9dc8'
    state = json.loads(checkpoint.read_bytes())
    assert state['branch'] == 'codex/remote-main-20260908'
    retained = {v['path']:v for v in state['evidence']}
    dirs = {'adaptive':'shared-adaptive-display-1003-r1', 'halo':'shared-adaptive-real-halo-1003-r1',
            'supply':'shared-flag-display-recovery-1003-r2', 'current':'shared-adaptive-flag-recovery-1003-r2'}
    def retained_file(p):
        actual = bind(p)
        assert actual == retained[actual['path']], actual['path']
        return actual
    documents = {k:retained_file(ROOT/'output'/v/'candidate/candidate.json') for k,v in dirs.items()}
    documents.update({
        'science':bind(ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json'),
        'disclosure':bind(ROOT/'output/frozen-zscale-publication-1003-r1/manifest.json'),
        'qualification':retained_file(ROOT/'output/shared-flag-display-recovery-1003-r2/processing-inputs.json'),
        'readback':retained_file(ROOT/'output/shared-adaptive-flag-recovery-1003-r2/readback/result.json')})
    assert documents['science']['sha256'] == '73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52'
    assert documents['disclosure']['sha256'] == '8679b44e97e4b51a6893239d49db1b3931ac12b79c9692d91086f5190f9f0368'
    executions = {}
    for role, folder in dirs.items():
        directory = ROOT/'output'/folder
        execution = {k:bind(directory/n) for k,n in (
            ('result','result.json'), ('before','inputs-before.json'), ('after','inputs-after.json'), ('producer','executed-script.py'))}
        retained_file(directory/'result.json')
        # Exact producer inputs come from the externally pinned result's
        # preserved execution sidecars, pinned explicitly in this receipt.
        recorded = json.loads((directory/'inputs-before.json').read_bytes())
        archives = {}
        for row in recorded:
            if not row['path'].endswith(('.py', '.ts', '.mts', '.mjs')):continue
            options = [directory/Path(row['path']).name,
                       ROOT/'output/shared-adaptive-display-1003-r1'/Path(row['path']).name,
                       ROOT/'output/shared-adaptive-flag-recovery-1003-r2'/Path(row['path']).name]
            for p in options:
                if p.is_file():
                    actual = bind(p)
                    if (actual['bytes'],actual['sha256']) == (row['bytes'],row['sha256']):
                        archives[row['path']] = actual
                        break
        execution['archives'] = archives
        executions[role] = execution
    evidence = {k:retained_file(ROOT/'output'/p) for k,p in (
        ('nativeModel','sdss-measured-native-psf-1003-r2/result.json'),
        ('localCenter','sdss-imagepsf-centering-1003-r1/result.json'),
        ('modelReadback','sdss-imagepsf-centering-1003-r1/readback/result.json'))}
    pins = {'checkpoint':bind(checkpoint), 'documents':documents, 'executions':executions, 'modelEvidence':evidence}
    save(out/'external-pins.json', pins)
    (out/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    owner = ROOT/'data-pipelines/deep-sky/sdss_noise_display_provenance.py'
    (out/owner.name).write_bytes(owner.read_bytes())
    packet = bind_saved_adaptive_recovery_chain(documents, executions, root=ROOT, model_evidence=evidence)
    save(out/'processing-source-chain.json', packet)
    save(out/'result.json', {'packet':bind(out/'processing-source-chain.json'), 'externalPins':bind(out/'external-pins.json'),
        'canonicalPacketSha256':hashlib.sha256(canonical_bytes(packet)).hexdigest(),
        'inspector':bind(out/owner.name), 'executedScript':bind(out/'executed-script.py'),
        'elapsedSeconds':time.perf_counter()-started, 'checkedDistinctFiles':packet['checkedDistinctFiles'],
        'originalSourcesAndProtectedByteChecks':True, 'historicalCodeResolvedExactly':True,
        'numericReadbackReused':True, 'sourceRequests':0, 'filterRuns':0, 'projectionRuns':0, 'pngDerivationRuns':0,
        'quality':'UNVERIFIED', 'independentReview':'MISSING', 'adopted':False, 'runtimePublication':'UNPUBLISHED'})
    print(json.dumps(json.loads((out/'result.json').read_bytes())))

if __name__ == '__main__':
    try:main()
    except Exception as error:
        directory = ROOT/'output/adaptive-recovery-source-chain-1003-r1'
        if directory.exists():save(directory/'failed.json', {'error':str(error), 'type':type(error).__name__, 'scienceOrCandidateChanges':False})
        raise
