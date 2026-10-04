"""Real perimeter aperture increment on the saved complete M82 interior."""
from pathlib import Path
import importlib.util
import json
import time

ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
GEN=ROOT/'output/sdss-m82-current-adaptive-recovery-1004-r1'
INTERIOR=ROOT/'output/sdss-m82-recovered-aperture-interior-1004-r1'
HALO=ROOT/'output/sdss-m82-recovered-halo-sources-1004-r1'
OUT=ROOT/'output/sdss-m82-recovered-complete-1004-r1'
spec=importlib.util.spec_from_file_location('loader',TASK/'scripts/experience-m82-current-adaptive-recovery-2026-10-04.py')
loader=importlib.util.module_from_spec(spec);spec.loader.exec_module(loader)
np,bind,save=loader.np,loader.bind,loader.save
from sdss_display_recovery import OtherScanDisplay,RecoveredApertureCandidate,refine_current_recovery_real_halo,save_recovered_aperture_candidate


def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    inputs={}
    def pin(path,expected=None):
        actual=bind(path)
        if expected is not None:assert actual==expected
        prior=inputs.setdefault(actual['path'],actual);assert prior==actual;return actual
    cp_path=TASK/'evidence/current-execution-state-2026-10-04-r84.json';pin(cp_path);cp=json.loads(cp_path.read_bytes())
    allowed={'data-pipelines/deep-sky/'+v for v in ('sdss_display_recovery.py','sdss_noise_display.py','sdss_adaptive_display.py')};changes=[]
    for item in cp['currentSources']:
        actual=bind(ROOT/item['path'])
        if actual!=item:
            assert item['path'] in allowed
            old=pin(HALO/('executed-'+Path(item['path']).name));assert (old['sha256'],old['bytes'])==(item['sha256'],item['bytes'])
            changes.append({'previous':item,'current':pin(ROOT/item['path']),'previousByteExactArchive':old})
    assert {v['previous']['path'] for v in changes}==allowed
    for item in cp['protected']+cp['evidence']:assert bind(ROOT/item['path'])==item
    print(json.dumps({'checkpointContinuity':True,'sources':len(cp['currentSources']),'protected':len(cp['protected']),'evidence':len(cp['evidence'])}),flush=True)
    pin(Path(__file__));pin(Path(loader.__file__));pin(ROOT/'data-pipelines/deep-sky/test_sdss_recovered_complete.py')
    for name in ('sdss_display_recovery.py','sdss_adaptive_display.py','sdss_noise_display.py','sdss_noise_aperture.py',
                 'sdss_frame_noise.py','sdss_gri_tan.py','sdss_source_stencil.py','sdss_frame_quality.py','sdss_corrected_frame.py'):
        path=ROOT/'data-pipelines/deep-sky'/name;pin(path);(OUT/('executed-'+name)).write_bytes(path.read_bytes())
    path=loader.DISPLAY/'result.json';pin(path);display=json.loads(path.read_bytes());master,parent,sources=loader.load_saved_inputs(display,pin)
    path=GEN/'result.json';pin(path);recovery_result=json.loads(path.read_bytes())
    def document(meta):
        path=ROOT/meta['path'];pin(path,meta);return json.loads(path.read_bytes()),path.parent
    recovery_report,recovery_dir=document(recovery_result['candidate'])
    path=INTERIOR/'result.json';pin(path);interior_result=json.loads(path.read_bytes())
    interior_report,interior_dir=document(interior_result['candidate'])
    def array(meta,directory):
        path=directory/meta['file'];p=pin(path);assert (p['sha256'],p['bytes'])==(meta['sha256'],meta['bytes'])
        v=np.load(path,mmap_mode='r',allow_pickle=False);assert list(v.shape)==meta['shape'] and v.dtype.str==meta['dtype'];return v
    recovery=OtherScanDisplay({b:array(recovery_report['arrays'][b],recovery_dir) for b in 'gri'},
        array(recovery_report['arrays']['alternative-supply'],recovery_dir),recovery_report)
    maps={k:array(interior_report['arrays'][k],interior_dir) for k in ('qualified','radius','reached','protected','affected')}
    interior=RecoveredApertureCandidate({b:array(interior_report['arrays'][b],interior_dir) for b in 'gri'},
        maps['qualified'],maps['radius'],maps['reached'],maps['protected'],maps['affected'],interior_report)
    path=HALO/'result.json';pin(path);halo_result=json.loads(path.read_bytes())
    for edge in halo_result['windows']:pin(ROOT/edge['samplingReport']['path'],edge['samplingReport'])
    before=list(inputs.values());save(OUT/'inputs-before.json',before);progress_rows=[];started,cpu=time.perf_counter(),time.process_time()
    def progress(edge):
        previous=next(v for v in halo_result['windows'] if v['edge']==edge['edge'])
        expected=json.loads((ROOT/previous['samplingReport']['path']).read_bytes())
        assert edge['sampling']==expected
        assert edge['dependencyPositions']==previous['allSupplyDependencyPositions']
        assert edge['affectedTargets']==previous['actualQualifiedWeakDependencies']
        row={key:edge[key] for key in ('edge','targetBoundsXYExclusive','dependencyPositions','affectedTargets','changedFromInteriorEstimatePixels')}
        row.update(secondsSinceStart=time.perf_counter()-started,memory=loader.memory());progress_rows.append(row)
        save(OUT/'progress.json',progress_rows);print(json.dumps(row),flush=True)
    full=refine_current_recovery_real_halo(master,parent,recovery,interior,sources,batch_size=64,progress=progress)
    seconds,cpu_seconds=time.perf_counter()-started,time.process_time()-cpu
    assert full.report['edgeAffectedTargets']==1199 and full.report['exteriorDependencyPositions']==1262
    assert full.report['outsideCropUniqueSupplyPixels']==120 and full.report['changedFromInteriorEstimatePixels']>0
    entry={k:master.report[k] for k in ('objectRef','center','orientation')}
    save_recovered_aperture_candidate(OUT/'candidate',master,full,entry)
    after=[bind(ROOT/item['path']) for item in before];assert before==after;save(OUT/'inputs-after.json',after)
    for item in cp['protected']+cp['evidence']:assert bind(ROOT/item['path'])==item
    outputs=[bind(path) for path in OUT.rglob('*') if path.is_file()]
    report={'scope':__doc__,'checkpoint':pin(cp_path),'previousSourcesExplicitlyChanged':changes,
        'scienceCandidate':display['scienceCandidate'],'adaptiveCandidate':display['candidate'],'recoveryCandidate':recovery_result['candidate'],
        'interiorCandidate':interior_result['candidate'],'candidate':bind(OUT/'candidate/candidate.json'),'inputsBeforeAfterExact':True,
        'oldProtectedAndEvidenceExact':True,'actualSourceSamplingExactlyMatchesR84':True,'perimeterSeconds':seconds,'perimeterCpuSeconds':cpu_seconds,
        'processMemory':loader.memory(),'edgeAffectedTargets':full.report['edgeAffectedTargets'],'changedFromInteriorEstimatePixels':full.report['changedFromInteriorEstimatePixels'],
        'affectedTargets':full.report['affectedTargets'],'changedFromRecoveryEstimatePixels':full.report['changedEstimatePixels'],
        'outputsBeforeResult':outputs,'newLogicalBytesBeforeResult':sum(v['bytes'] for v in outputs),'sourceRequests':0,
        'wholeOrInteriorFilterCoaddFitRuns':0,'ordinaryAdoption':False,'quality':'UNVERIFIED','independentReview':'MISSING'}
    save(OUT/'result.json',report);print(json.dumps({'result':bind(OUT/'result.json'),'perimeterSeconds':seconds,
        'changedFromInterior':full.report['changedFromInteriorEstimatePixels'],'changedFromRecovery':full.report['changedEstimatePixels']}),flush=True)


if __name__=='__main__':
    try:main()
    except Exception as error:
        if OUT.exists():save(OUT/'failed.json',{'type':type(error).__name__,'error':str(error)})
        raise
