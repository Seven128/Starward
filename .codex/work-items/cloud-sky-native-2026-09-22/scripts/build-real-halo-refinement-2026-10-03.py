"""Reuse prepared cached sources, refine only perimeter, save complete candidate."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
s=(TASK/'scripts/experience-sdss-real-halo-2026-10-03.py').read_text(encoding='utf-8')
s=s[:s.index('    _,admitted_fields,')]
s=s.replace("out=ROOT/'output/sdss-real-halo-1003-r1'", "out=ROOT/'output/shared-adaptive-real-halo-1003-r1'")
s=s.replace('from sdss_adaptive_display import adaptive_common_display_batched',
 'from sdss_adaptive_display import AdaptiveDisplayCandidate,refine_adaptive_real_halo,save_adaptive_display_candidate')
marker='    before=[bound(path) for path in paths]'
s=s.replace(marker,"""    gold_dir=ROOT/'output/sdss-real-halo-1003-r1';gold_path=gold_dir/'result.json'
    assert bound(gold_path)['sha256']=='ea6ab2bb96e70e2d781f066d1a11d86d869d650edcd8f5275382c5c5c563598d'
    gold=json.loads(gold_path.read_bytes());paths.append(gold_path)
    for row in gold['rows']:
        for item in row['outputs']:
            path=ROOT/item['path'];assert bound(path)==item;paths.append(path)
"""+marker)
s+='''    initial=AdaptiveDisplayCandidate({b:parent_arrays[b] for b in BANDS},parent_arrays['qualified'],parent_arrays['radius'],
      parent_arrays['reached'],parent_arrays['protected'],parent)
    progress=[];started=time.perf_counter();cpu_started=time.process_time();initial_memory=memory()
    def observe(event):
        event=event|{'elapsedSeconds':time.perf_counter()-started,'memory':memory()};progress.append(event)
        with (out/'progress.ndjson').open('a',encoding='utf-8') as stream:stream.write(json.dumps(event)+'\\n')
        print(json.dumps(event),flush=True)
    candidate=refine_adaptive_real_halo(master,initial,sources,batch_size=64,progress=observe)
    kernel=time.perf_counter()-started;cpu=time.process_time()-cpu_started
    entry={'objectRef':c['objectRef'],'center':c['center'],'orientation':c['orientation']}
    saved=save_adaptive_display_candidate(out/'candidate',master,candidate,entry)
    for row in gold['rows']:
        x0,y0,x1,y1=row['boundsXYExclusive'];region=(slice(y0,y1),slice(x0,x1));size=x1-x0
        expected=np.load(gold_dir/f'{row["name"]}-display-window.npy',allow_pickle=False)[:,8:size+8,8:size+8]
        actual=np.stack([candidate.estimates[b][region] for b in BANDS]);np.testing.assert_array_equal(actual,expected)
        for key in ('radius','reached','protected'):
            expected=np.load(gold_dir/f'{row["name"]}-{key}.npy',allow_pickle=False)[8:size+8,8:size+8]
            np.testing.assert_array_equal(getattr(candidate,key)[region],expected)
    after=[bound(path) for path in paths];assert after==before;save(out/'inputs-after.json',after)
    result={'status':'PASSED_ACTUAL_REAL_HALO_PERIMETER_REFINEMENT','candidate':bound(out/'candidate/candidate.json'),
      'parentCandidate':bound(parent_path),'nineActualWindowOutputsExact':True,'interiorExact':True,'inputsUnchanged':True,
      'recipe':candidate.report,'processingSeconds':kernel,'processingCPUSeconds':cpu,
      'wholeElapsedSeconds':time.perf_counter()-whole_started,'wholeCPUSeconds':time.process_time()-whole_cpu,
      'initialMemory':initial_memory,'finalMemory':memory(),'progressSamples':progress,'sourceRequests':0,'wholeMasterFilterRuns':0,
      'originalMeanProducts':old_result['originalMeanProducts'],
      'scope':'Only64896 crop-perimeter targets queried, full cached interior remains exact. Actual outside frame-derived halo, no padding/alpha change or whole-master re-filter.',
      'memoryMeaning':'Current Windows Python including retained sources/master/parent/new output and libraries; no phone/service/cloud capacity claim.',
      'independentReview':'MISSING','qualityAcceptance':'UNVERIFIED','adopted':False}
    save(out/'result.json',result);print(json.dumps({'receipt':bound(out/'result.json'),'kernelSeconds':kernel,'cpuSeconds':cpu,'memory':result['finalMemory'],'counts':{k:result['recipe'][k] for k in ('qualifiedCenters','protectedCenters','changedEstimatePixels','radiusCounts')}}))

if __name__=='__main__':
    try:main()
    except Exception as error:
        out=ROOT/'output/shared-adaptive-real-halo-1003-r1'
        if out.exists():save(out/'failed.json',{'error':str(error),'type':type(error).__name__})
        raise
'''
path=TASK/'scripts/experience-shared-adaptive-real-halo-2026-10-03.py'
with path.open('x',encoding='utf-8',newline='\n') as f:f.write(s)
print(path)
