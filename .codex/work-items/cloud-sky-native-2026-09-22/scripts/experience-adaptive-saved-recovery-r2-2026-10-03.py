"""Full existing cached master through explicit shared common-display owner.

No source acquisition, new mosaic/PSF/quality matrix or ordinary publication.
Actual source associations, old science and frozen recipe remain bound.
"""
import copy
import ctypes
from ctypes import wintypes
import importlib.util
import json
import os
from pathlib import Path
import sys
import time

ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image,ImageDraw
from astropy.visualization import ManualInterval,LuptonAsinhStretch,make_lupton_rgb
from sdss_corrected_frame import read_cached_frame
from sdss_frame_noise import read_cached_field_noise
from sdss_frame_quality import read_cached_fpm
from sdss_gri_tan import GriMaster,ProjectedBand,target_tan,BANDS,science_mean_pyramid
from sdss_noise_display import NoiseDisplaySource,_qualified_sources,_project_real_halo_window
from sdss_adaptive_display import AdaptiveDisplayCandidate
from sdss_display_recovery import OtherScanDisplay,rebase_saved_other_scan_display,save_recovery_candidate
from sdss_noise_display_provenance import canonical_bytes
from image_quality import digest
spec=importlib.util.spec_from_file_location('local_pins',TASK/'scripts/experience-sdss-local-overlap-diagnosis-2026-10-02.py')
local=importlib.util.module_from_spec(spec);spec.loader.exec_module(local)
bound,save,save_array=local.bound,local.save,local.save_array


class ProcessMemory(ctypes.Structure):
    _fields_=[('cb',wintypes.DWORD),('PageFaultCount',wintypes.DWORD)]+[(name,ctypes.c_size_t) for name in
        ('PeakWorkingSetSize','WorkingSetSize','QuotaPeakPagedPoolUsage','QuotaPagedPoolUsage',
         'QuotaPeakNonPagedPoolUsage','QuotaNonPagedPoolUsage','PagefileUsage','PeakPagefileUsage','PrivateUsage')]


def memory():
    current=ctypes.windll.kernel32.GetCurrentProcess;current.restype=ctypes.c_void_p
    get=ctypes.windll.psapi.GetProcessMemoryInfo;get.argtypes=[ctypes.c_void_p,ctypes.POINTER(ProcessMemory),wintypes.DWORD]
    value=ProcessMemory();value.cb=ctypes.sizeof(value)
    if not get(current(),ctypes.byref(value),value.cb):raise RuntimeError('process_memory_unavailable')
    return {'workingSetBytes':value.WorkingSetSize,'peakWorkingSetBytes':value.PeakWorkingSetSize,
        'privateCommitBytes':value.PrivateUsage,'peakPagefileBytes':value.PeakPagefileUsage}


def main():
    out=ROOT/'output/shared-adaptive-flag-recovery-1003-r2';assert not out.exists();out.mkdir();whole_started=time.perf_counter();whole_cpu=time.process_time()
    cp=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json'
    pp=ROOT/'output/frozen-zscale-publication-1003-r1/manifest.json'
    qp=ROOT/'output/sdss-m51-mosaic-quality-diagnosis-1002-r3/result.json'
    assert bound(cp)['sha256']=='73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52'
    assert bound(pp)['sha256']=='8679b44e97e4b51a6893239d49db1b3931ac12b79c9692d91086f5190f9f0368'
    c=json.loads(cp.read_bytes());p=json.loads(pp.read_bytes());q=json.loads(qp.read_bytes())
    assert q['candidate']['sha256']==bound(cp)['sha256']
    field_dir=ROOT/'output/sdss-m51-field-quality-1002-r3';receipt=json.loads((field_dir/'receipt.json').read_bytes())
    paths=[Path(__file__),Path(local.__file__),cp,pp,qp,
        *(field_dir/f for f in ('response.csv','receipt.json')),
        *(ROOT/'data-pipelines/deep-sky'/f for f in ('sdss_adaptive_display.py','sdss_noise_aperture.py','sdss_noise_display.py','sdss_frame_noise.py','sdss_frame_quality.py','sdss_corrected_frame.py','sdss_source_stencil.py','sdss_gri_tan.py','sdss_display_recovery.py','sdss_noise_display_provenance.py','test_sdss_saved_recovery.py'))]
    def array(meta):
        path=cp.parent/meta['file'];assert bound(path)['sha256']==meta['sha256'];paths.append(path)
        return np.load(path,mmap_mode='r',allow_pickle=False)
    joint=array(c['arrays']['joint-availability'])
    bands={b:ProjectedBand(array(c['arrays'][b+'-science']),array(c['arrays'][b+'-footprint']),
        array(c['arrays'][b+'-finite-neighbors']),c['science']['perBand'][b]) for b in BANDS}
    fields,weights,sources={}, {}, {}
    for f in c['mosaic']['fields']:
        key=f['fieldKey'];d=c['mosaic']['diagnostics'][key]
        fields[key]={b:ProjectedBand(array(d[b+'-science']),array(d[b+'-footprint']),
            array(d[b+'-finite-neighbors']),f['perBand'][b]) for b in BANDS}
        weights[key]=array(d['normalized-weight']);sources[key]={}
        quality=next(v for v in q['fields'] if v['fieldKey']==key)
        for band in BANDS:
            old=f['perBand'][band]['sourceReceipt'];s=old['source'];paths.append(Path(s['path']))
            frame=read_cached_frame(Path(s['path']),old['identity']|{k:s[k] for k in ('bytes','sha256','sourceUrl')},max_uncompressed_bytes=32*1024*1024)
            assert frame.receipt==old
            camera=read_cached_field_noise(field_dir/'response.csv',receipt,old['identity'])
            mask=quality['bands'][band]['maskSource'];mp=ROOT/mask['path'];paths.append(mp)
            assert bound(mp)['sha256']==mask['sha256']
            i=old['identity'];url=f'https://data.sdss.org/sas/dr17/eboss/photo/redux/{i["rerun"]}/{i["run"]}/objcs/{i["camcol"]}/{mp.name}'
            flags=read_cached_fpm(mp,i|{'bytes':mask['bytes'],'sha256':mask['sha256'],'sourceUrl':url},max_uncompressed_bytes=16*1024*1024)
            assert flags.receipt['source']['sha256']==quality['bands'][band]['association']['sourceSha256']['fpM']
            sources[key][band]=NoiseDisplaySource(frame,camera,flags)
    reference_path=ROOT/'output/sdss-m51-shared-transfer-1002/global-zscale-q8/rgb-master.npy'
    assert bound(reference_path)['sha256']=='3073421521ca303701a5a5c5090753f6e43a00034d022838080dad66d791d4b6';paths.append(reference_path)
    reference=np.load(reference_path,mmap_mode='r',allow_pickle=False)
    report=copy.deepcopy(c);report['display']['transfer']=copy.deepcopy(p['master']['transfer']['recipe'])
    master=GriMaster(target_tan(c['center'],c['pixels'],c['fieldDegrees']),bands,joint,reference,report,fields,weights)
    for row in json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes()):
        path=ROOT/row['path'];assert bound(path)['sha256']==row['sha256'];paths.append(path)
    parent_dir=ROOT/'output/shared-adaptive-real-halo-1003-r1/candidate'
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
       expected_saved_report_sha256=digest(canonical_bytes(saved)),
       expected_provenance_sha256=digest(canonical_bytes(provenance)))
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
        out=ROOT/'output/shared-adaptive-flag-recovery-1003-r2'
        if out.exists():save(out/'failed.json',{'error':str(error),'type':type(error).__name__})
        raise
