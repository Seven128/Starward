"""Read saved failed epoch; no renderer, HTTP, or new acceptance claims."""
from pathlib import Path
from PIL import Image
import json, hashlib, sys, numpy as np

root = Path(__file__).resolve().parents[4]
lane, out = (root / p for p in sys.argv[1:])
out.mkdir(exist_ok=False)
def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def bind(p):
    raw = p.read_bytes()
    return {'path': p.relative_to(root).as_posix(), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
def matrix(b): return np.array([b[k] for k in ['right', 'up', 'forward']], dtype=np.float64).T
def view(p): return json.loads(p['canvas']['data-sky-presented-view'])['basis']
def equal(a, b):
    delta = float(np.max(abs(a-b)))
    assert delta <= 128*np.finfo(np.float64).eps, delta
    return delta
try:
    failure = read(lane/'failed.json'); phases = {p['name']:p for p in failure['phase']}
    assert 'bounded rotation arithmetic only; no pixel tolerance' in failure['error']
    assert failure['phase'][-1]['name'] == 'combined-source-return-latest-confirm'
    assert not failure['errors'] and not (lane/'current-baseline-after.json').exists() and not (lane/'result.json').exists()
    frontend=read(lane/'source-bindings-before.json'); backend=read(lane/'backend-source-bindings-before.json'); base=read(lane/'current-baseline-before.json')
    for row in frontend+backend+base['currentSources']+base['protected']:
        assert bind(root/row['path']) == row, row['path']
    assert len(frontend)==506 and len(backend)==162 and len(base['currentSources'])==325 and len(base['protected'])==6
    receipt=read(lane/'combined-source-return-latest-confirm-atomic-confirm.json')
    history=read(lane/'failed-orientation.json')['raw']
    at=receipt['raw']['at']; rejected=receipt['raw']
    accepted=next(r for r in reversed(history) if r['at']<=at and r['frame'] is not None)
    following=next(r for r in history if r['at']>at and r['frame'] is not None and r['input']==rejected['input'])
    assert rejected['frame'] is None and accepted['at']==at
    assert receipt['before']['alignment']['mode']=='editing' and receipt['after']['alignment']['mode']=='aligned'
    assert receipt['before']['pose']['sampledAt']==receipt['after']['pose']['sampledAt']==at
    assert all(receipt['before']['pose'][field]==receipt['after']['pose'][field]==accepted['input'][key] for field,key in [('alphaDeg','alpha'),('betaDeg','beta'),('gammaDeg','gamma')])
    frozen=matrix(view(phases['combined-source-return-reanchor-freeze']))
    atomic=equal(matrix(receipt['after']['alignment']['view']),frozen)
    expected=frozen@matrix(accepted['frame']['basis']).T@matrix(following['frame']['basis'])
    followed=equal(matrix(view(phases['combined-source-return-latest-confirm'])),expected)
    samples=read(lane/'failed-resources.json'); summary=read(lane/'failed-resource-summary.json')
    copies=[r for r in samples if r['reason']=='texture-copy-allocation']
    assert copies and all(r['gpuTextureUploadModelBytes']>0 for r in copies)
    for k,v in summary['maxima'].items():
        row=summary['peakSamples'][k]; assert row.get(k,(row.get('encoded') or {}).get(k))==v
    captures={}
    for path in lane.glob('*-pixels.json'):
        name=path.name.removesuffix('-pixels.json'); raw=(lane/(name+'.rgba')).read_bytes()
        assert raw==(lane/(name+'-after.rgba')).read_bytes()==Image.open(lane/(name+'.png')).convert('RGBA').transpose(Image.Transpose.FLIP_TOP_BOTTOM).tobytes()
        assert len(raw)==read(path)['bytes']==390*844*4 and hashlib.sha256(raw).hexdigest()==read(path)['sha256']
        captures[name]=raw
    d=abs(np.frombuffer(captures['software-follow-source-before'],dtype=np.uint8).astype(np.int16)-np.frombuffer(captures['software-follow-source-back'],dtype=np.uint8).astype(np.int16)).reshape(-1,4)
    retired=phases['combined-follow-source-retired']
    assert retired['resources']['activeDecodedImageHandles']==retired['resources']['gpuTextureUploadModelBytes']==retired['resources']['gpuBufferUploadModelBytes']==0
    assert retired['pendingNativeRequests']==0 and all(o['leased']==o['running']==o['pending']==o['reserved']==0 for o in retired['owners'])
    result={'status':'FAILED_EPOCH_INPUT_QUALIFICATION_DIAGNOSED_NOT_REPAIRED_RETROACTIVELY','sourceBeforeCurrentExact':{'frontend':506,'backend':162,'baseline':325,'protected':6},'missingAfterAndFinal':True,'rejectedRaw':rejected,'precedingAcceptedRaw':accepted,'nextAcceptedRaw':following,'atomicConfirmationFrozenArithmeticError':atomic,'laterFollowExpectedArithmeticError':followed,'meaning':'New emitted angles had the same millisecond as a prior valid sample and were rejected by the original monotonic tracker. Original confirmation used that prior valid sample; the later accepted new pose moved under the committed old reference. Not an escaped confirmation defect or a full journey pass. Current task guard requires an actually accepted strictly later sample before synchronous original confirmation.','glPngGlCaptures':len(captures),'sourceBackPixels':{'status':'PASS_THIS_EPOCH_ONLY' if not np.any(d) else 'FAILED_RETAINED','changedPixels':int(np.count_nonzero(np.any(d,axis=1))),'changedChannels':int(np.count_nonzero(d)),'maxChannelDelta':int(d.max()),'alphaChanges':int(np.count_nonzero(d[:,3]))},'retainedCopyObservations':len(copies),'resourceObservations':summary['observations'],'separateLogicalMaxima':summary['maxima'],'scope':'Root saved-byte/arithmetic self-review, not independent review. Partial same-epoch softwareGL path through source return; later image/body/time/final combination unexecuted. Source-before checks do not create after bindings. Bounded copy history is not total event count; logical maxima are not physical totals, native memory or capacity.'}
    (out/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (out/'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    print(json.dumps({k:v for k,v in result.items() if k not in ['rejectedRaw','precedingAcceptedRaw','nextAcceptedRaw']},ensure_ascii=False))
except Exception as e:
    (out/'failed.json').write_text(json.dumps({'error':str(e),'type':type(e).__name__},ensure_ascii=False)+'\n',encoding='utf-8')
    (out/'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    raise
