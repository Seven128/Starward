"""Bind saved actual full candidate to processing inputs; no rerender or acquisition."""
import copy
import argparse
import importlib.util
import json
from pathlib import Path
import sys
import time

ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from sdss_corrected_frame import read_cached_frame
from sdss_frame_noise import read_cached_field_noise
from sdss_frame_quality import read_cached_fpm
from sdss_gri_tan import GriMaster,ProjectedBand,target_tan,BANDS
from sdss_noise_display import NoiseDisplaySource
from sdss_noise_display_provenance import build_noise_display_provenance,bind_saved_noise_display,canonical_bytes
from image_quality import digest
spec=importlib.util.spec_from_file_location('existing_pins',TASK/'scripts/experience-sdss-local-overlap-diagnosis-2026-10-02.py')
local=importlib.util.module_from_spec(spec);spec.loader.exec_module(local)
bound,save=local.bound,local.save


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',default='noise-display-provenance-1003-r1');args=parser.parse_args()
    assert Path(args.output).name==args.output and args.output.startswith('noise-display-provenance-1003-r')
    out=ROOT/'output'/args.output;out.mkdir(exist_ok=False);started=time.perf_counter()
    old=ROOT/'output/shared-noise-display-1003-r1';rp=old/'result.json'
    assert bound(rp)['sha256']=='6428c50750f6f592e378abe30c3f9c01bb9c49cc689b6965957a2a8e9c2ee76e'
    result=json.loads(rp.read_bytes());assert result['inputsUnchanged'] and not result['adopted']
    before=json.loads((old/'inputs-before.json').read_bytes());after=json.loads((old/'inputs-after.json').read_bytes())
    assert before==after
    # New reconstruction is explicitly linked to the original real execution,
    # with its actual unchanged source/code inputs, not inferred from intent.
    actual=[bound(ROOT/p['path']) for p in before];assert actual==before
    recorded={v['path']:v for v in before}
    for name in ('sdss_noise_display.py','sdss_gri_tan.py'):
        assert bound(old/name)['sha256']==recorded['data-pipelines/deep-sky/'+name]['sha256']
    assert bound(old/'executed-script.py')['sha256']==recorded[str(TASK.relative_to(ROOT)/'scripts/experience-shared-noise-display-2026-10-03.py').replace('\\','/')]['sha256']
    cp=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json'
    pp=ROOT/'output/frozen-zscale-publication-1003-r1/manifest.json'
    qp=ROOT/'output/sdss-m51-mosaic-quality-diagnosis-1002-r3/result.json'
    c=json.loads(cp.read_bytes());p=json.loads(pp.read_bytes());q=json.loads(qp.read_bytes())
    assert q['candidate']['sha256']==bound(cp)['sha256']
    def array(meta):
        path=cp.parent/meta['file'];assert bound(path)['sha256']==meta['sha256'];return np.load(path,mmap_mode='r',allow_pickle=False)
    joint=array(c['arrays']['joint-availability'])
    bands={b:ProjectedBand(array(c['arrays'][b+'-science']),array(c['arrays'][b+'-footprint']),
        array(c['arrays'][b+'-finite-neighbors']),c['science']['perBand'][b]) for b in BANDS}
    fields={};weights={};sources={}
    cas=ROOT/'output/sdss-m51-field-quality-1002-r3';receipt=json.loads((cas/'receipt.json').read_bytes())
    for f in c['mosaic']['fields']:
        key=f['fieldKey'];d=c['mosaic']['diagnostics'][key]
        fields[key]={b:ProjectedBand(array(d[b+'-science']),array(d[b+'-footprint']),array(d[b+'-finite-neighbors']),f['perBand'][b]) for b in BANDS}
        weights[key]=array(d['normalized-weight']);sources[key]={};quality=next(v for v in q['fields'] if v['fieldKey']==key)
        for band in BANDS:
            old_receipt=f['perBand'][band]['sourceReceipt'];s=old_receipt['source'];i=old_receipt['identity']
            frame=read_cached_frame(Path(s['path']),i|{k:s[k] for k in ('bytes','sha256','sourceUrl')},max_uncompressed_bytes=32*1024*1024)
            assert frame.receipt==old_receipt
            camera=read_cached_field_noise(cas/'response.csv',receipt,i)
            mask=quality['bands'][band]['maskSource'];mp=ROOT/mask['path']
            url=f'https://data.sdss.org/sas/dr17/eboss/photo/redux/{i["rerun"]}/{i["run"]}/objcs/{i["camcol"]}/{mp.name}'
            flags=read_cached_fpm(mp,i|{'bytes':mask['bytes'],'sha256':mask['sha256'],'sourceUrl':url},max_uncompressed_bytes=16*1024*1024)
            assert flags.receipt['source']['sha256']==quality['bands'][band]['association']['sourceSha256']['fpM']
            sources[key][band]=NoiseDisplaySource(frame,camera,flags)
    report=copy.deepcopy(c);report['display']['transfer']=copy.deepcopy(p['master']['transfer']['recipe'])
    rgb=np.load(ROOT/'output/sdss-m51-shared-transfer-1002/global-zscale-q8/rgb-master.npy',mmap_mode='r',allow_pickle=False)
    master=GriMaster(target_tan(c['center'],c['pixels'],c['fieldDegrees']),bands,joint,rgb,report,fields,weights)
    new_paths=[Path(__file__),ROOT/'data-pipelines/deep-sky/sdss_noise_display_provenance.py',
        ROOT/'data-pipelines/deep-sky/test_sdss_noise_display_provenance.py']
    new_before=[bound(path) for path in new_paths]
    snapshot=build_noise_display_provenance(master,sources);snapshot_pin=digest(canonical_bytes(snapshot))
    save(out/'processing-provenance.json',snapshot)
    packet=bind_saved_noise_display(old/'candidate',master,sources,snapshot,root=ROOT,
        candidate_sha256='0dc8f1d5a6a82e1cfa50709832123a3e3982b76e3b73b4bc3d228f600fcd65c5',provenance_sha256=snapshot_pin)
    packet['processingProvenanceFile']=bound(out/'processing-provenance.json')
    packet['historicalExecution']={'result':bound(rp),'inputBefore':bound(old/'inputs-before.json'),
        'inputAfter':bound(old/'inputs-after.json'),'executedScript':bound(old/'executed-script.py'),
        'executedOwners':[bound(old/name) for name in ('sdss_noise_display.py','sdss_gri_tan.py')],
        'currentRecordedInputsExact':True,'scope':'Provenance reconstructed from original unchanged admitted input/code set recorded by pinned actual full execution. No filter rerun or retrospective quality approval.'}
    packet['sourceDisclosureReference']=bound(pp)
    save(out/'source-chain.json',packet)
    assert [bound(ROOT/p['path']) for p in before]==before
    assert [bound(path) for path in new_paths]==new_before
    save(out/'new-inputs-before.json',new_before);save(out/'new-inputs-after.json',new_before)
    (out/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    (out/'sdss_noise_display_provenance.py').write_bytes(new_paths[1].read_bytes())
    totals={'fields':len(snapshot['fields']),'bands':sum(len(v['bands']) for v in snapshot['fields']),
        'cameraPresent':sum(b['camera'] is not None for f in snapshot['fields'] for b in f['bands'].values()),
        'calibrationSkyPresent':sum(b['calibrationSky'] is not None for f in snapshot['fields'] for b in f['bands'].values()),
        'flagsPresent':sum(b['flags'] is not None for f in snapshot['fields'] for b in f['bands'].values())}
    outcome={'processingProvenance':bound(out/'processing-provenance.json'),'canonicalSha256':snapshot_pin,
        'sourceChain':bound(out/'source-chain.json'),'originalCandidate':result['candidate'],'sources':totals,
        'oldInputsAndProtectedExact':True,'newInputsExact':True,'threeLevelsDerivedExact':True,
        'elapsedSeconds':time.perf_counter()-started,'sourceRequests':0,'filterRuns':0,'fullQualityMatrices':0,
        'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    save(out/'result.json',outcome);print(json.dumps(outcome))


if __name__=='__main__':main()
