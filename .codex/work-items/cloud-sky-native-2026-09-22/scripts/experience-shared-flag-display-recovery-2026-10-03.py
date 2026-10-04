"""Actual shared recovery on the saved full master, no noise-filter rerun."""
import argparse
import copy
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
from sdss_noise_display import NoiseDisplayCandidate,NoiseDisplaySource,noise_display_pyramid
from sdss_noise_display_provenance import build_noise_display_provenance
from sdss_display_recovery import recover_other_scan_display,save_recovery_candidate
from image_quality import digest,write_report


def bound(path):
    raw=path.read_bytes();return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':digest(raw)}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',default='shared-flag-display-recovery-1003-r2');args=parser.parse_args()
    assert Path(args.output).name==args.output and args.output.startswith('shared-flag-display-recovery-1003-r')
    out=ROOT/'output'/args.output;out.mkdir(exist_ok=False);(out/'executed-script.py').write_bytes(Path(__file__).read_bytes());started=time.perf_counter();paths=[Path(__file__)]
    for name in ('sdss_corrected_frame.py','sdss_frame_noise.py','sdss_frame_quality.py','sdss_source_stencil.py',
        'sdss_gri_tan.py','sdss_noise_display.py','sdss_noise_display_provenance.py','sdss_display_recovery.py'):
        paths.append(ROOT/'data-pipelines/deep-sky'/name)
    def doc(relative,pin):
        f=ROOT/relative;assert bound(f)['sha256']==pin;paths.append(f);return json.loads(f.read_bytes()),f
    c,cp=doc('output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json','73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52')
    p,pp=doc('output/frozen-zscale-publication-1003-r1/manifest.json','8679b44e97e4b51a6893239d49db1b3931ac12b79c9692d91086f5190f9f0368')
    q,_=doc('output/sdss-m51-mosaic-quality-diagnosis-1002-r3/result.json','9322203537531e0cba3fbf9addcd3ea6e19fd75fdfeb2dc57637bd2d42bee4d0')
    n,npth=doc('output/shared-noise-display-1003-r1/candidate/candidate.json','0dc8f1d5a6a82e1cfa50709832123a3e3982b76e3b73b4bc3d228f600fcd65c5')
    _,parentp=doc('output/noise-display-provenance-1003-r2/processing-provenance.json','685021971466e559024d6bd70c5a810603851ab626a54fd5429b99a60473c597')
    def array(meta,base=cp.parent):
        f=base/meta['file'];assert bound(f)['sha256']==meta['sha256'];paths.append(f);return np.load(f,mmap_mode='r',allow_pickle=False)
    joint=array(c['arrays']['joint-availability'])
    bands={b:ProjectedBand(array(c['arrays'][b+'-science']),array(c['arrays'][b+'-footprint']),array(c['arrays'][b+'-finite-neighbors']),c['science']['perBand'][b]) for b in BANDS}
    fields={};weights={};sources={};cas=ROOT/'output/sdss-m51-field-quality-1002-r3'
    receipt=json.loads((cas/'receipt.json').read_bytes());paths.extend([cas/'receipt.json',cas/'response.csv'])
    assert bound(cas/'response.csv')['sha256']==receipt['sha256']
    for f in c['mosaic']['fields']:
        key=f['fieldKey'];d=c['mosaic']['diagnostics'][key]
        fields[key]={b:ProjectedBand(array(d[b+'-science']),array(d[b+'-footprint']),array(d[b+'-finite-neighbors']),f['perBand'][b]) for b in BANDS}
        weights[key]=array(d['normalized-weight']);sources[key]={};quality=next(v for v in q['fields'] if v['fieldKey']==key)
        for b in BANDS:
            old=f['perBand'][b]['sourceReceipt'];s=old['source'];i=old['identity'];path=Path(s['path']);paths.append(path)
            frame=read_cached_frame(path,i|{k:s[k] for k in ('bytes','sha256','sourceUrl')},max_uncompressed_bytes=32*1024*1024)
            assert frame.receipt==old;camera=read_cached_field_noise(cas/'response.csv',receipt,i)
            mask=quality['bands'][b]['maskSource'];mp=ROOT/mask['path'];paths.append(mp)
            url=f'https://data.sdss.org/sas/dr17/eboss/photo/redux/{i["rerun"]}/{i["run"]}/objcs/{i["camcol"]}/{mp.name}'
            flags=read_cached_fpm(mp,i|{'bytes':mask['bytes'],'sha256':mask['sha256'],'sourceUrl':url},max_uncompressed_bytes=16*1024*1024)
            assert flags.receipt['source']['sha256']==quality['bands'][b]['association']['sourceSha256']['fpM']
            sources[key][b]=NoiseDisplaySource(frame,camera,flags)
    report=copy.deepcopy(c);report['display']['transfer']=copy.deepcopy(p['master']['transfer']['recipe'])
    rgb_path=ROOT/'output/sdss-m51-shared-transfer-1002/global-zscale-q8/rgb-master.npy';paths.append(rgb_path)
    assert bound(rgb_path)['sha256']=='3073421521ca303701a5a5c5090753f6e43a00034d022838080dad66d791d4b6'
    master=GriMaster(target_tan(c['center'],c['pixels'],c['fieldDegrees']),bands,joint,np.load(rgb_path,mmap_mode='r',allow_pickle=False),report,fields,weights)
    initial=NoiseDisplayCandidate({b:array(n['arrays'][b],npth.parent) for b in BANDS},array(n['arrays']['processable'],npth.parent),n)
    old_levels=noise_display_pyramid(master,initial,c,output_pixels=512)
    for level,(payload,_) in old_levels.items():
        path=npth.parent/n['levels'][level]['file'];paths.append(path);assert path.read_bytes()==payload
    trial=ROOT/'output/sdss-flag-alternative-1003-r2';paths.extend([trial/'executed-script.py',trial/'inputs-before.json',trial/'inputs-after.json',trial/'failed.json'])
    trial_before=json.loads((trial/'inputs-before.json').read_bytes());assert trial_before==json.loads((trial/'inputs-after.json').read_bytes())
    for r in trial_before:
        actual=trial/'executed-script.py' if r['path'].endswith('scripts/experience-sdss-flag-alternative-2026-10-03.py') else ROOT/r['path']
        assert bound(actual)['sha256']==r['sha256']
    assert (trial/'result.json').stat().st_size==0
    for row in json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes()):
        f=ROOT/row['path'];assert bound(f)['sha256']==row['sha256'];paths.append(f)
    before=[bound(f) for f in paths];write_report(out/'inputs-before.json',before)
    recovered=recover_other_scan_display(master,initial,sources,chunk_rows=64)
    mask=np.load(trial/'alternative-supply.npy',allow_pickle=False)
    comparison={'trialPixels':int(mask.sum()),'sharedPixels':int(recovered.alternative_supply.sum()),
        'sharedOnly':int((recovered.alternative_supply&~mask).sum()),'trialOnly':int((mask&~recovered.alternative_supply).sum()),
        'flagOnlyNativeMatchesTrial':recovered.report['flagOnlyAlternativeSupplyCOrderSha256']==digest(mask.tobytes()),
        'flagOnlyRejectedByNativeQualification':recovered.report['flagOnlyRejectedByNativeQualification']}
    write_report(out/'qualification-comparison.json',comparison)
    assert comparison['flagOnlyNativeMatchesTrial'] and comparison['sharedOnly']==0
    assert comparison['trialOnly']==comparison['flagOnlyRejectedByNativeQualification']
    for b in BANDS:
        prior=np.load(trial/(b+'-display-alternative.npy'),allow_pickle=False)
        assert np.array_equal(recovered.estimates[b][recovered.alternative_supply],prior[recovered.alternative_supply])
        assert np.array_equal(recovered.estimates[b][~recovered.alternative_supply],initial.estimates[b][~recovered.alternative_supply],equal_nan=True)
    candidate=save_recovery_candidate(out/'candidate',master,recovered,c,output_pixels=512)
    levels={}
    for level,m in candidate['levels'].items():
        path=out/'candidate'/m['file'];prior=trial/(level.lower()+'-alternative.png')
        paths.append(prior);levels[level]={'shared':bound(path),'trial':bound(prior),'bytesExact':path.read_bytes()==prior.read_bytes()}
    snapshot={'kind':'CURRENT_RECOVERY_EXECUTION_WITH_PINNED_OLD_NOISE_PARENT','originalNoiseProcessingProvenance':bound(parentp),
        'currentInputSnapshot':build_noise_display_provenance(master,sources),'recoveryImplementation':bound(ROOT/'data-pipelines/deep-sky/sdss_display_recovery.py'),
        'recoveryReport':recovered.report,'meaning':'New execution performs qualified other-scan recovery only; historical full noise filter/code/output remain separate and were not rerun. Offline development, not rights/quality or runtime publication.'}
    write_report(out/'processing-inputs.json',snapshot)
    # Trial result serialization failed; saved outputs are now independently
    # matched to the shared owner, not retroactively marked as a successful run.
    readback={'scope':'Saved failed-serialization trial readback through current qualified native-source shared producer; no unchanged trial rerender.',
        'trialFailure':bound(trial/'failed.json'),'executedScript':bound(trial/'executed-script.py'),'comparison':comparison,'admittedArrayValuesExact':True,'outsideAdmittedOriginalKept':True,'levels':levels}
    (trial/'readback').mkdir(exist_ok=False);write_report(trial/'readback/result.json',readback)
    after=[bound(ROOT/r['path']) for r in before];write_report(out/'inputs-after.json',after);assert before==after
    for name in ('sdss_display_recovery.py','sdss_noise_display.py'):(out/name).write_bytes((ROOT/'data-pipelines/deep-sky'/name).read_bytes())
    (out/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    result={'candidate':bound(out/'candidate/candidate.json'),'processingInputs':bound(out/'processing-inputs.json'),
        'trialReadback':bound(trial/'readback/result.json'),'levels':levels,'baselineLevelsExact':True,'qualificationComparison':comparison,'admittedTrialArrayValuesExact':True,
        'sourceAndProtectedUnchanged':True,'alternativePixels':recovered.report['alternativePixels'],
        'scanContributionPixels':recovered.report['scanContributionPixels'],'maximumSingleFieldStencilArrayBytes':recovered.report['maximumSingleFieldStencilArrayBytes'],
        'elapsedSeconds':time.perf_counter()-started,'filterRuns':0,'fitRuns':0,'sourceRequests':0,'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    write_report(out/'result.json',result);print(json.dumps(result))


if __name__=='__main__':main()
