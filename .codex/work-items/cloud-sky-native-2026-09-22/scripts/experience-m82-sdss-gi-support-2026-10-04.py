"""Only missing M82 g/i counterparts; actual full per-band/coherent support."""
from pathlib import Path
import argparse
import importlib.util
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
R_GEN = ROOT / 'output/sdss-m82-r-footprint-1004-r1'
OUT = ROOT / 'output/sdss-m82-gi-support-1004-r1'
CHECKPOINT = TASK / 'evidence/current-execution-state-2026-10-04-r76.json'
HELPER = TASK / 'scripts/experience-m82-sdss-r-footprint-2026-10-04.py'
spec = importlib.util.spec_from_file_location('actual_r_acquisition', HELPER)
acq = importlib.util.module_from_spec(spec)
spec.loader.exec_module(acq)
acq.OUT = OUT
bind, save = acq.bind, acq.prior.save


def main():
    assert not OUT.exists()
    (OUT/'sources').mkdir(parents=True)
    (OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    checkpoint = json.loads(CHECKPOINT.read_bytes())
    pins = checkpoint['currentSources'] + checkpoint['protected'] + checkpoint['evidence']
    assert [bind(ROOT/p['path']) for p in pins] == pins
    r_result = json.loads((R_GEN/'result.json').read_bytes())
    fields = [f for f in r_result['fields'] if f['participates']]
    assert len(fields) == 6 and r_result['acquisitionComplete'] and r_result['unionFiniteStencilPixels'] == r_result['targetPixels']
    sources = []
    for field in fields:
        assert bind(ROOT/field['sourceRaw']['path']) == field['sourceRaw']
        assert bind(ROOT/field['support']['path']) == field['support']
        for band in ('g','i'):
            identity = {**field['identity'], 'band': band}
            name = f"frame-{band}-{identity['run']:06d}-{identity['camcol']}-{identity['field']:04d}.fits.bz2"
            assert not list((ROOT/'output').rglob(name)), 'existing_source_requires_receipt_admission'
            sources.append({'identity': identity, 'path': name,
                'sourceUrl': f"https://data.sdss.org/sas/dr17/eboss/photoObj/frames/{identity['rerun']}/{identity['run']}/{identity['camcol']}/{name}",
                'participatingRSource': field['sourceRaw']})
    save(OUT/'acquisition-plan.json', {'objectRef':'M:82','sources':sources,
        'scope':'Only twelve missing g/i counterparts of measured r contributors; no inferred joint coverage/quality',
        'rResult':bind(R_GEN/'result.json'),'helper':bind(HELPER),'automaticRetries':0,
        'socketTimeoutSeconds':25,'wholeChildBudgetSeconds':35,'maximumCompressedBytes':16*1024*1024,
        'maximumDecompressedBytes':32*1024*1024})
    acquired = []
    for index in range(len(sources)):
        process = subprocess.Popen([sys.executable,'-B',str(Path(__file__).resolve()),'--child',str(index)],
                                   stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        try:
            stdout,stderr = process.communicate(timeout=35)
        except subprocess.TimeoutExpired:
            process.kill();stdout,stderr = process.communicate()
            path = OUT/f'request-{index:02d}.json'
            record = json.loads(path.read_bytes()) if path.exists() else sources[index]
            record.update(state='UNAVAILABLE',errorKind='WHOLE_REQUEST_TIME_BUDGET_EXCEEDED')
            save(path,record)
        if stderr:
            (OUT/f'child-{index:02d}-stderr.txt').write_bytes(stderr)
        record = json.loads((OUT/f'request-{index:02d}.json').read_bytes())
        acquired.append(record);save(OUT/'acquisition-progress.json',acquired)
        print(json.dumps({'identity':record['identity'],'state':record['state'],'bytes':record.get('raw',{}).get('bytes')}),flush=True)
    sys.path[:0] = [str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
    import numpy as np
    from sdss_corrected_frame import read_cached_band_set
    from sdss_gri_tan import target_tan,project_frame_window
    pixels = r_result['targetShape'][0]
    target = target_tan(r_result['targetCenter'],pixels,r_result['fieldDegrees'])
    union = {b:np.zeros((pixels,pixels),dtype=bool) for b in ('g','r','i')}
    coherent_union = np.zeros_like(union['r'])
    coherent_counts = np.zeros((pixels,pixels),dtype=np.uint8)
    measured = []
    for field in fields:
        id_ = tuple(field['identity'][k] for k in ('run','rerun','camcol','field'))
        gi = [f for f in acquired if tuple(f['identity'][k] for k in ('run','rerun','camcol','field')) == id_]
        if len(gi)!=2 or any(f['state']!='STRUCTURE_ACCEPTED_SCIENTIFIC_VALIDITY_UNVERIFIED' for f in gi):
            measured.append({'identity':field['identity'],'state':'INCOMPLETE_BANDS_NOT_ZERO_CHANNELS'});continue
        records = [{**field['identity'],**field['sourceRaw'],'sourceUrl':field['readerReceipt']['source']['sourceUrl']}]
        records += [{**f['identity'],**f['raw'],'sourceUrl':f['sourceUrl']} for f in gi]
        frames = read_cached_band_set(ROOT,records,('g','r','i'),max_uncompressed_bytes=32*1024*1024)
        frames_by_band = {f.receipt['identity']['band']:f for f in frames}
        with np.load(ROOT/field['support']['path'],allow_pickle=False) as old:
            support = {key+'_r':np.unpackbits(old[key],bitorder='little',count=pixels*pixels).reshape(pixels,pixels).astype(bool)
                       for key in ('footprint','finite_neighbors')}
        for band in ('g','i'):
            footprint,finite = np.zeros_like(union['r']),np.zeros_like(union['r'])
            for start in range(0,pixels,128):
                stop = min(start+128,pixels)
                projected = project_frame_window(frames_by_band[band],target,pixels,(slice(start,stop),slice(0,pixels)))
                footprint[start:stop],finite[start:stop] = projected.footprint,projected.finite_neighbors
            support['footprint_'+band],support['finite_neighbors_'+band] = footprint,finite
        coherent = np.logical_and.reduce([support['finite_neighbors_'+b] for b in ('g','r','i')])
        for b in union:union[b] |= support['finite_neighbors_'+b]
        coherent_union |= coherent;coherent_counts += coherent.astype(np.uint8)
        path = OUT/f"field-{field['identity']['run']}-{field['identity']['camcol']}-{field['identity']['field']}-support.npz"
        np.savez_compressed(path,**{k:np.packbits(v,bitorder='little') for k,v in {**support,'coherent_gri':coherent}.items()})
        core = slice(pixels//2-32,pixels//2+32)
        measured.append({'identity':{k:field['identity'][k] for k in ('run','rerun','camcol','field')},
            'state':'ACTUAL_GRI_SUPPORT_MEASURED_QUALITY_UNKNOWN','support':bind(path),
            'sourceRecords':records,'readerReceipts':[f.receipt for f in frames],
            'perBandFiniteStencilPixels':{b:int(support['finite_neighbors_'+b].sum()) for b in union},
            'coherentGriPixels':int(coherent.sum()),'central64SquareCoherentGriPixels':int(coherent[core,core].sum()),
            'scientificQuality':'UNKNOWN_FPM_CAS_NOISE_ASTROMETRY_REQUIRED'})
        print(json.dumps({'measuredIdentity':measured[-1]['identity'],'coherentGriPixels':int(coherent.sum())}),flush=True)
        del frames,frames_by_band,support,coherent,footprint,finite,projected
    union_path = OUT/'union-support.npz'
    np.savez_compressed(union_path,**{b:np.packbits(v,bitorder='little') for b,v in union.items()},
                        coherent_gri=np.packbits(coherent_union,bitorder='little'),coherent_count=coherent_counts)
    assert [bind(ROOT/p['path']) for p in pins] == pins
    save(OUT/'result.json',{'scope':'New g/i inputs and actual per-band/coherent field support; no RGB/quality/adoption',
        'checkpoint':bind(CHECKPOINT),'originalBytePinsUnchanged':True,'producer':bind(Path(__file__)),'acquisitionHelper':bind(HELPER),
        'rResult':bind(R_GEN/'result.json'),'targetCenter':r_result['targetCenter'],'targetShape':[pixels,pixels],
        'fieldDegrees':r_result['fieldDegrees'],'targetWcs':dict(target.to_header()),'fields':measured,
        'acquisitionComplete':all(f['state']=='STRUCTURE_ACCEPTED_SCIENTIFIC_VALIDITY_UNVERIFIED' for f in acquired),
        'newCompressedSourceBytes':sum(f.get('raw',{}).get('bytes',0) for f in acquired),
        'targetPixels':pixels*pixels,'perBandFiniteUnionPixels':{b:int(v.sum()) for b,v in union.items()},
        'coherentGriUnionPixels':int(coherent_union.sum()),'maximumCoherentFields':int(coherent_counts.max()),
        'unionSupport':bind(union_path),'missingInputsMeaning':'Unavailable, not zero channels or scientific missing pixels',
        'astrometry':'Native linear TAN; full retained asTrans/DCR not applied','newRgbOrDisplayProcessing':False,
        'ordinaryAdoption':False,'scientificQuality':'UNVERIFIED','independentReview':'MISSING'})
    print(json.dumps({'newCompressedSourceBytes':sum(f.get('raw',{}).get('bytes',0) for f in acquired),
        'perBandFiniteUnionPixels':{b:int(v.sum()) for b,v in union.items()},'coherentGriUnionPixels':int(coherent_union.sum()),
        'originalBytePinsUnchanged':True}),flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser();parser.add_argument('--child',type=int);args=parser.parse_args()
    if args.child is not None:acq.child(args.child)
    else:main()
