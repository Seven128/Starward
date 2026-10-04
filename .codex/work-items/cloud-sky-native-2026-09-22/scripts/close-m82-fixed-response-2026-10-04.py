"""M82 recorded fixed-response allocation and r88-r89 continuity; no processing."""
from pathlib import Path
import importlib.util,json,sys
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
GEN=ROOT/'output/sdss-m82-fixed-display-response-1004-r1'
FAILED=ROOT/'output/sdss-m82-fixed-display-response-readback-1004-r1'
READER=ROOT/'output/sdss-m82-fixed-display-response-readback-1004-r2'
SHAPES=ROOT/'output/sdss-m82-fixed-response-shapes-1004-r1'
spec=importlib.util.spec_from_file_location('fixed_shape_binding',TASK/'scripts/analyze-m82-fixed-response-shapes-2026-10-04.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);bind,save=m.bind,m.save

def allocation():
    output=READER/'allocation-and-observation.json';assert not output.exists()
    result=json.loads((GEN/'result.json').read_bytes());reader=json.loads((READER/'result.json').read_bytes());shapes=json.loads((SHAPES/'result.json').read_bytes())
    assert result['actualLocations']==reader['actualLocations']==shapes['actualLocations']==146
    assert len(result['images'])==13 and len(shapes['images'])==15
    old=json.loads((TASK/'evidence/current-execution-state-2026-10-04-r88.json').read_bytes())
    for item in old['currentSources']+old['protected']+old['evidence']:assert bind(ROOT/item['path'])==item
    (READER/'executed-close.py').write_bytes(Path(__file__).read_bytes())
    helper=TASK/'scripts/inspect-static-file-allocation-2026-10-03.py';text=helper.read_text(encoding='utf-8');ns={'__file__':str(helper)}
    exec(compile(text[:text.index('index_file=SOURCE')],str(helper),'exec'),ns)
    files=[p for d in (GEN,FAILED,READER,SHAPES) for p in sorted(d.rglob('*')) if p.is_file()]
    before=[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files]
    assert before==[{'path':p.relative_to(ROOT).as_posix(),**ns['info'](p)} for p in files]
    unique={v['identity']:v for v in before}
    report={'scope':__doc__,'actualAll13ProducerAnd15CommonScalePagesViewed':True,
        'observations':'Actual extended galaxy/neighbor/stripe/grain structures persist. Strong raw cores keep the same mathematical response; recorded weak apertures change local wings and real source values, especially at edges. Common signed unit/delta scale removes false roundoff amplification. Finite model unknown remains magenta in diagnostic plots, not new sky missing. No empirical PSF adequacy or quality acceptance.',
        'failedReaderRetained':'First reader incorrectly used normalized f32 field coefficients for original science raw numerator; 119 of 5043 scalars differed by up to 1.4901161e-8. r2 uses original unnormalized geometric numerator/divide for science, normalized coefficients for RUN recovery. Only reader corrected, original failed source/output/log retained; no tolerance or candidate change.',
        'generationSeconds':result['elapsedSeconds'],'generationCPUSeconds':result['cpuSeconds'],'generationMemory':result['memory'],
        'maximumRetainedEffectiveStencilArrayBytes':result['maximumRetainedEffectiveStencilArrayBytes'],
        'readerSeconds':reader['elapsedSeconds'],'readerProcessPeak':'UNMEASURED','savedShapeAnalysisSeconds':shapes['elapsedSeconds'],'shapeProcessPeak':'UNMEASURED',
        'savedShapeTotals':shapes['totals'],'files':before,'paths':len(before),'logicalBytes':sum(v['bytes'] for v in before),
        'reportedAllocationByUniqueIdentityBytes':sum(v['reportedAllocationBytes'] for v in unique.values()),'distinctFileIdentities':len(unique),
        'maximumLinkCount':max(v['links'] for v in before),'stableBeforeAfter':True,
        'limits':'Only the four new task output directories including both failed/current reader archives and executed closer before measurement. Excludes measurement/docs/logs/checkpoint/old data/candidates/dependencies/filesystem internals/snapshots/Linux physical retention/headroom/mixed200DAU capacity. Offline process peak not client/server or total chain; single-window stencil bytes are not process peak.',
        'oldSourcesExact':len(old['currentSources']),'oldEvidenceExact':len(old['evidence']),'protectedExact':len(old['protected']),
        'sourceRequestsOrWholeProcessingOrDeletion':False,'productionChanges':[],'otherBusinessLogicEdited':False,
        'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
    save(output,report);print(json.dumps({k:v for k,v in report.items() if k!='files'}),flush=True)

def continuity():
    output=READER/'checkpoint-continuity.json';assert not output.exists()
    old_path=TASK/'evidence/current-execution-state-2026-10-04-r88.json';new_path=TASK/'evidence/current-execution-state-2026-10-04-r89.json'
    assert bind(old_path)['sha256']=='68afe1ead612232384837e880e51abac808dcd70579f98b906ff254eb89c306f'
    old,new=json.loads(old_path.read_bytes()),json.loads(new_path.read_bytes())
    for item in new['currentSources']+new['protected']+new['evidence']:assert bind(ROOT/item['path'])==item
    previous={v['path']:v for v in old['currentSources']};current={v['path']:v for v in new['currentSources']};assert previous.keys()<=current.keys()
    allowed={'data-pipelines/deep-sky/README.md','project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md',
        *(TASK.relative_to(ROOT).as_posix()+'/'+v for v in ('PLAN.md','CONTINUE-CLOUD-SKY.md','scripts/capture-current-execution-2026-10-03.ps1'))}
    changes={path for path,item in previous.items() if current[path]!=item};assert changes==allowed,(changes,allowed)
    for item in old['protected']+old['evidence']:assert bind(ROOT/item['path'])==item
    assert old['protected']==new['protected'] and old['processes']==new['processes']
    for key in ('workspace','branch','head'):assert old[key]==new[key]
    assert new['worktree']['stagedEntries']==0
    report={'scope':__doc__,'previousCheckpoint':bind(old_path),'currentCheckpoint':bind(new_path),'oldSourceChanges':sorted(changes),
        'newSources':sorted(current.keys()-previous.keys()),'productionChanges':[],'otherBusinessLogicEdited':False,
        'oldEvidenceExact':len(old['evidence']),'protectedExact':len(new['protected']),'currentSources':len(current),'currentEvidence':len(new['evidence']),
        'processStartTimesExact':True,'staging':0,'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
    save(output,report);print(json.dumps(report),flush=True)

if __name__=='__main__':
    if sys.argv[1:]==['continuity']:continuity()
    else:assert not sys.argv[1:];allocation()
