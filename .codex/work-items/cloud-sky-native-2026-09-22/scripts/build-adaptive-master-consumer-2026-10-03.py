"""Reuse existing cached whole-master preparation for the new display owner."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
s=(TASK/'scripts/experience-shared-noise-display-2026-10-03.py').read_text(encoding='utf-8')
s=s.replace('from sdss_noise_display import NoiseDisplaySource,render_noise_display_candidate,save_noise_display_candidate',
 'from sdss_noise_display import NoiseDisplaySource\nfrom sdss_adaptive_display import render_adaptive_display_candidate,save_adaptive_display_candidate')
s=s.replace("out=ROOT/'output/shared-noise-display-1003-r1'", "out=ROOT/'output/shared-adaptive-display-1003-r1'")
s=s.replace("out.mkdir()", "out.mkdir();whole_started=time.perf_counter();whole_cpu=time.process_time()",1)
s=s.replace("'sdss_noise_display.py','sdss_frame_noise.py'", "'sdss_adaptive_display.py','sdss_noise_aperture.py','sdss_noise_display.py','sdss_frame_noise.py'",1)
s=s.replace("before=[bound(path) for path in paths]", """old_output=ROOT/'output/shared-noise-display-1003-r1'
    old_result_path=old_output/'result.json';old_result=json.loads(old_result_path.read_bytes());paths.append(old_result_path)
    for item in old_result['originalMeanProducts'].values():
        path=ROOT/item['path'];assert bound(path)==item;paths.append(path)
    local_output=ROOT/'output/sdss-adaptive-batch-1003-r2'
    local_report_path=local_output/'result.json'
    assert bound(local_report_path)['sha256']=='4627aa06fd37bf047516a83efd122c189ef8e46ce2dfd84345d15917057d6966'
    local_result=json.loads(local_report_path.read_bytes());paths.append(local_report_path)
    for row in local_result['rows']:
        for item in row['outputs']:
            path=ROOT/item['path'];assert bound(path)==item;paths.append(path)
    before=[bound(path) for path in paths]""")
s=s.replace("for path in ('sdss_noise_display.py','sdss_gri_tan.py'):","for path in ('sdss_adaptive_display.py','sdss_noise_aperture.py','sdss_noise_display.py','sdss_gri_tan.py'):")
s=s.replace('started=time.perf_counter();initial_memory=memory()', 'started=time.perf_counter();cpu_started=time.process_time();initial_memory=memory()')
s=s.replace("if event['completedRows']%256==2 or event['completedRows']==c['pixels']-2:print", "if True:print")
s=s.replace('candidate=render_noise_display_candidate(master,sources,chunk_rows=32,progress=observe)', 'candidate=render_adaptive_display_candidate(master,sources,chunk_rows=32,batch_size=64,progress=observe)')
s=s.replace('processing_seconds=time.perf_counter()-started', 'processing_seconds=time.perf_counter()-started;processing_cpu=time.process_time()-cpu_started')
s=s.replace('publication=save_noise_display_candidate', 'publication=save_adaptive_display_candidate')
start=s.index('    # Reuse original');end=s.index('    # Old raw arrays')
s=s[:start]+"""    old_levels=old_result['originalMeanProducts']
    for row in local_result['rows']:
        x,y=row['centerXY'];region=(slice(y-16,y+17),slice(x-16,x+17))
        gold=np.load(local_output/f'{row["name"]}-display-estimates.npy',allow_pickle=False)[:,8:41,8:41]
        actual=np.stack([candidate.estimates[b][region] for b in BANDS])
        np.testing.assert_array_equal(actual,gold)
        for key in ('radius','reached','protected'):
            gold=np.load(local_output/f'{row["name"]}-{key}.npy',allow_pickle=False)[8:41,8:41]
            np.testing.assert_array_equal(getattr(candidate,key)[region],gold)
"""+s[end:]
s=s.replace("'actualMixedGoldenEstimatesExact':True", "'actualFourLocalBatchOutputsExact':True")
s=s.replace("'processingSeconds':processing_seconds,", "'processingSeconds':processing_seconds,'processingCPUSeconds':processing_cpu,'wholeElapsedSeconds':time.perf_counter()-whole_started,'wholeCPUSeconds':time.process_time()-whole_cpu,",1)
s=s.replace("'processable':candidate.report['processablePixels']", "'changedEstimates':candidate.report['changedEstimatePixels'],'radiusCounts':candidate.report['radiusCounts']")
s=s.replace("if __name__=='__main__':main()", """if __name__=='__main__':
    try:main()
    except Exception as error:
        out=ROOT/'output/shared-adaptive-display-1003-r1'
        if out.exists():save(out/'failed.json',{'error':str(error),'type':type(error).__name__})
        raise""")
path=TASK/'scripts/experience-shared-adaptive-display-2026-10-03.py'
with path.open('x',encoding='utf-8',newline='\n') as f:f.write(s)
print(path)
