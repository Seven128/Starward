"""Reuse existing cached source preparation and pinned supply, no old rerun."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
s=(TASK/'scripts/experience-shared-adaptive-real-halo-2026-10-03.py').read_text(encoding='utf-8')
s=s[:s.index("    old_output=ROOT/")]
s=s.replace("out=ROOT/'output/shared-adaptive-real-halo-1003-r1'", "out=ROOT/'output/shared-adaptive-flag-recovery-1003-r1'")
s=s.replace('from sdss_adaptive_display import AdaptiveDisplayCandidate,refine_adaptive_real_halo,save_adaptive_display_candidate',
 '''from sdss_adaptive_display import AdaptiveDisplayCandidate
from sdss_display_recovery import OtherScanDisplay,rebase_saved_other_scan_display,save_recovery_candidate
from sdss_noise_display_provenance import canonical_bytes''')
s=s.replace("'sdss_source_stencil.py','sdss_gri_tan.py'", "'sdss_source_stencil.py','sdss_gri_tan.py','sdss_display_recovery.py','sdss_noise_display_provenance.py','test_sdss_saved_recovery.py'")
s+='''    parent_dir=ROOT/'output/shared-adaptive-real-halo-1003-r1/candidate'
    saved_dir=ROOT/'output/shared-flag-display-recovery-1003-r2/candidate'
    def pinned(path,sha):
        assert bound(path)['sha256']==sha;paths.append(path);return json.loads(path.read_bytes())
    parent=pinned(parent_dir/'candidate.json','110462fb0d487009b03f221a013f1387f7ab27812ed9c7394bece1aab05bc1ee')
    saved=pinned(saved_dir/'candidate.json','46d4ac28173962d52d09c575f0559959644292fdd9582e80c5a73962f5ce0d76')
    provenance_path=saved_dir.parent/'processing-inputs.json'
    provenance=pinned(provenance_path,'45984cfa707fe7dd8056665ff71c447671f228aca980943e862cf9be0aac40f4')
    guard=pinned(saved_dir.parent/'guard-closeout/result.json','c8c9b7d5694599c90706ff533db89dd6f1df68fddcdbb9a8599fc7e115d98ef7')
    assert len(guard['actual18ProcessingIdentitiesKnownAndExact'])==18 and guard['actualFrozenRecipeExact']
    def saved_arrays(doc,directory):
        values={}
        for key,meta in doc['arrays'].items():
            path=directory/meta['file'];assert bound(path)['sha256']==meta['sha256'];paths.append(path)
            values[key]=np.load(path,mmap_mode='r',allow_pickle=False)
        for meta in doc['levels'].values():
            path=directory/meta['file'];assert bound(path)['sha256']==meta['sha256'];paths.append(path)
        return values
    parent_arrays=saved_arrays(parent,parent_dir);saved_arrays_value=saved_arrays(saved,saved_dir)
    initial=AdaptiveDisplayCandidate({b:parent_arrays[b] for b in BANDS},parent_arrays['qualified'],parent_arrays['radius'],
      parent_arrays['reached'],parent_arrays['protected'],parent)
    alternative=OtherScanDisplay({b:saved_arrays_value[b] for b in BANDS},saved_arrays_value['alternative-supply'],saved)
    before=[bound(path) for path in paths];save(out/'inputs-before.json',before)
    (out/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    for name in ('sdss_display_recovery.py','sdss_adaptive_display.py','sdss_noise_display_provenance.py'):
        (out/name).write_bytes((ROOT/'data-pipelines/deep-sky'/name).read_bytes())
    print(json.dumps({'stage':'qualified saved source objects loaded','initialMemory':memory()}),flush=True)
    started=time.perf_counter();cpu=time.process_time()
    recovered=rebase_saved_other_scan_display(master,initial,sources,alternative,provenance,
       expected_saved_report_sha256=local.digest(canonical_bytes(saved)),
       expected_provenance_sha256=local.digest(canonical_bytes(provenance)))
    processing_seconds=time.perf_counter()-started;processing_cpu=time.process_time()-cpu
    assert int(recovered.alternative_supply.sum())==13323
    assert recovered.report['savedSupplyKeptCurrentQualifiedPixels']==0
    assert recovered.report['savedFlagOnlyRejectedByNativeQualification']==53
    for b in BANDS:
        np.testing.assert_array_equal(recovered.estimates[b][recovered.alternative_supply],alternative.estimates[b][recovered.alternative_supply])
        np.testing.assert_array_equal(recovered.estimates[b][~recovered.alternative_supply],initial.estimates[b][~recovered.alternative_supply])
    entry={k:c[k] for k in ('objectRef','center','orientation')}
    candidate=save_recovery_candidate(out/'candidate',master,recovered,entry)
    levels={}
    for level,meta in candidate['levels'].items():
        path=out/'candidate'/meta['file'];prior=parent_dir/parent['levels'][level]['file']
        rgba=np.asarray(Image.open(path));old=np.asarray(Image.open(prior));np.testing.assert_array_equal(rgba[:,:,3],old[:,:,3])
        levels[level]={'current':bound(path),'parent':bound(prior),'alphaExact':True,
          'changedRgbFromParent':int(np.any(rgba[:,:,:3]!=old[:,:,:3],axis=2).sum()),'processingVersion':meta['processingVersion']}
    after=[bound(path) for path in paths];assert after==before;save(out/'inputs-after.json',after)
    result={'status':'PASSED_ACTUAL_SAVED_ALTERNATIVES_ON_CURRENT_ADAPTIVE_PARENT',
      'candidate':bound(out/'candidate/candidate.json'),'parentCandidate':bound(parent_dir/'candidate.json'),
      'savedSupplyCandidate':bound(saved_dir/'candidate.json'),'savedQualificationExecution':bound(provenance_path),
      'sourceInputsExact':True,'sourceAndProtectedPinsExact':True,'alternativePixels':13323,
      'savedNativeRejectedStillOriginal':53,'outsideAdmittedCurrentParentExact':True,'admittedSavedSupplyExact':True,
      'currentBaselineDiagnosticsBound':True,'levels':levels,'processingSeconds':processing_seconds,
      'processingCPUSeconds':processing_cpu,'wholeElapsedSeconds':time.perf_counter()-whole_started,
      'wholeCPUSeconds':time.process_time()-whole_cpu,'finalMemory':memory(),
      'filterRuns':0,'supplyProjectionRuns':0,'sourceRequests':0,'statisticalFitCalls':0,
      'scope':'Pinned old actual source/native/camera/flags/epochs/projected/weight inputs exact. Reuse saved13323 supply only; latest valid parent retained elsewhere, original science/coverage and fixed transfer kept. Historical execution code not relabelled.',
      'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    save(out/'result.json',result);print(json.dumps(result),flush=True)

if __name__=='__main__':
    try:main()
    except Exception as error:
        out=ROOT/'output/shared-adaptive-flag-recovery-1003-r1'
        if out.exists():save(out/'failed.json',{'error':str(error),'type':type(error).__name__})
        raise
'''
# digest already comes from image_quality in the imported pin helper.
s=s.replace('local.digest(canonical_bytes(', 'digest(canonical_bytes(')
s=s.replace('from sdss_noise_display_provenance import canonical_bytes', 'from sdss_noise_display_provenance import canonical_bytes\nfrom image_quality import digest')
p=TASK/'scripts/experience-adaptive-saved-recovery-2026-10-03.py'
with p.open('x',encoding='utf-8',newline='\n') as f:f.write(s)
print(p)
