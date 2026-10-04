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
from PIL import Image
from sdss_corrected_frame import read_cached_frame
from sdss_frame_noise import read_cached_field_noise
from sdss_frame_quality import read_cached_fpm
from sdss_gri_tan import GriMaster,ProjectedBand,target_tan,BANDS,science_mean_pyramid
from sdss_noise_display import NoiseDisplaySource
from sdss_adaptive_display import render_adaptive_display_candidate,save_adaptive_display_candidate
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
    out=ROOT/'output/shared-adaptive-display-1003-r1';assert not out.exists();out.mkdir();whole_started=time.perf_counter();whole_cpu=time.process_time()
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
        *(ROOT/'data-pipelines/deep-sky'/f for f in ('sdss_adaptive_display.py','sdss_noise_aperture.py','sdss_noise_display.py','sdss_frame_noise.py','sdss_frame_quality.py','sdss_corrected_frame.py','sdss_source_stencil.py','sdss_gri_tan.py'))]
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
    old_output=ROOT/'output/shared-noise-display-1003-r1'
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
    before=[bound(path) for path in paths];save(out/'inputs-before.json',before)
    (out/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    for path in ('sdss_adaptive_display.py','sdss_noise_aperture.py','sdss_noise_display.py','sdss_gri_tan.py'):(out/path).write_bytes((ROOT/'data-pipelines/deep-sky'/path).read_bytes())
    progress=[];started=time.perf_counter();cpu_started=time.process_time();initial_memory=memory()
    def observe(event):
        event=event|{'elapsedSeconds':time.perf_counter()-started,'memory':memory()};progress.append(event)
        with (out/'progress.ndjson').open('a',encoding='utf-8') as stream:stream.write(json.dumps(event)+'\n')
        if True:print(json.dumps(event),flush=True)
    candidate=render_adaptive_display_candidate(master,sources,chunk_rows=32,batch_size=64,progress=observe)
    processing_seconds=time.perf_counter()-started;processing_cpu=time.process_time()-cpu_started
    entry={'objectRef':c['objectRef'],'center':c['center'],'orientation':c['orientation']}
    publication=save_adaptive_display_candidate(out/'candidate',master,candidate,entry)
    old_levels=old_result['originalMeanProducts']
    for row in local_result['rows']:
        x,y=row['centerXY'];region=(slice(y-16,y+17),slice(x-16,x+17))
        gold=np.load(local_output/f'{row["name"]}-display-estimates.npy',allow_pickle=False)[:,8:41,8:41]
        actual=np.stack([candidate.estimates[b][region] for b in BANDS])
        np.testing.assert_array_equal(actual,gold)
        for key in ('radius','reached','protected'):
            gold=np.load(local_output/f'{row["name"]}-{key}.npy',allow_pickle=False)[8:41,8:41]
            np.testing.assert_array_equal(getattr(candidate,key)[region],gold)
    # Old raw arrays / availability / recipe and every protected file stay exact.
    after=[bound(path) for path in paths];assert after==before;save(out/'inputs-after.json',after)
    result={'scope':__doc__,'candidate':bound(out/'candidate/candidate.json'),'recipe':candidate.report,
        'originalMeanProducts':old_levels,'actualFourLocalBatchOutputsExact':True,
        'processingSeconds':processing_seconds,'processingCPUSeconds':processing_cpu,'wholeElapsedSeconds':time.perf_counter()-whole_started,'wholeCPUSeconds':time.process_time()-whole_cpu,'elapsedWithSerializationSeconds':time.perf_counter()-started,
        'initialMemory':initial_memory,'finalMemory':memory(),'progressSamples':progress,
        'scienceRequests':0,'fullQualityMatrixRuns':0,'inputsUnchanged':True,
        'memoryMeaning':'Actual Windows Python process including retained FITS sources, caller mmap/source arrays, output and library allocations; not phone/WEAPP/service or production capacity.',
        'independentReview':'MISSING','qualityAcceptance':'UNVERIFIED','adopted':False}
    save(out/'result.json',result);print(json.dumps({'result':bound(out/'result.json'),'processingSeconds':processing_seconds,'memory':result['finalMemory'],'changedEstimates':candidate.report['changedEstimatePixels'],'radiusCounts':candidate.report['radiusCounts']}),flush=True)


if __name__=='__main__':
    try:main()
    except Exception as error:
        out=ROOT/'output/shared-adaptive-display-1003-r1'
        if out.exists():save(out/'failed.json',{'error':str(error),'type':type(error).__name__})
        raise
