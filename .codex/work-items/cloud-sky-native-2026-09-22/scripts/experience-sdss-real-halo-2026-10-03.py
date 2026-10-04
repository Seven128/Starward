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
from sdss_adaptive_display import adaptive_common_display_batched
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
    out=ROOT/'output/sdss-real-halo-1003-r1';assert not out.exists();out.mkdir();whole_started=time.perf_counter();whole_cpu=time.process_time()
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
    parent_dir=ROOT/'output/shared-adaptive-display-1003-r1/candidate'
    parent_path=parent_dir/'candidate.json'
    assert bound(parent_path)['sha256']=='7a4e8f6dd8dbcbcf29520c378323e0e112c811e1904c44b87ddf7bd4e8e43bb7'
    parent=json.loads(parent_path.read_bytes());paths.append(parent_path)
    parent_arrays={}
    for key,meta in parent['arrays'].items():
        path=parent_dir/meta['file'];assert bound(path)['sha256']==meta['sha256'];paths.append(path)
        parent_arrays[key]=np.load(path,mmap_mode='r',allow_pickle=False)
    before=[bound(path) for path in paths];save(out/'inputs-before.json',before)
    (out/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    for path in ('sdss_adaptive_display.py','sdss_noise_aperture.py','sdss_noise_display.py','sdss_gri_tan.py'):(out/path).write_bytes((ROOT/'data-pipelines/deep-sky'/path).read_bytes())
    _,admitted_fields,admitted_weights=_qualified_sources(master,sources)
    definitions=[('observed-top',24,0,128),('top-left',0,0,33),('top-right',2015,0,33),
      ('bottom-left',0,2015,33),('bottom-right',2015,2015,33),('top-mid',1008,0,33),
      ('bottom-mid',1008,2015,33),('left-mid',0,1008,33),('right-mid',2015,1008,33)]
    recipe=report['display']['transfer'];rows=[];sheet=Image.new('RGB',(3*256,len(definitions)*282),'#181818');draw=ImageDraw.Draw(sheet)
    def rgb(v):
        return make_lupton_rgb(v[2],v[1],v[0],interval=ManualInterval(vmin=0,vmax=None),
          stretch_object=LuptonAsinhStretch(stretch=recipe['stretch'],Q=recipe['Q']),output_dtype=np.uint8)
    for at,(name,x,y,size) in enumerate(definitions):
        region=(slice(y-8,y+size+8),slice(x-8,x+size+8));started=time.perf_counter()
        values,eligible,stencils,facts=_project_real_halo_window(master,sources,admitted_fields,admitted_weights,region,lambda:None)
        result=adaptive_common_display_batched(values,eligible,stencils);seconds=time.perf_counter()-started
        core=(slice(8,size+8),slice(8,size+8));old=np.stack([parent_arrays[b][y:y+size,x:x+size] for b in BANDS])
        original=np.stack([master.bands[b].data[y:y+size,x:x+size] for b in BANDS]);new=result.estimates[:,core[0],core[1]]
        yy,xx=np.mgrid[y:y+size,x:x+size];internal=(yy>=8)&(yy<2040)&(xx>=8)&(xx<2040)
        np.testing.assert_array_equal(new[:,internal],old[:,internal])
        for key in ('radius','reached','protected'):
            np.testing.assert_array_equal(getattr(result,key)[core][internal],parent_arrays[key][y:y+size,x:x+size][internal])
        saved=[]
        for key,value in [('source-window',values),('eligible',eligible),('display-window',result.estimates),('radius',result.radius),('reached',result.reached),('protected',result.protected)]:
            path=out/f'{name}-{key}.npy';np.save(path,value,allow_pickle=False);saved.append(bound(path))
        for index,stencil in enumerate(stencils):
            path=out/f'{name}-field-{index}.npz';np.savez_compressed(path,**stencil);saved.append(bound(path))
        images=[rgb(original),rgb(old),rgb(new)]
        for column,(label,image) in enumerate(zip(('original','outer-fallback','real-halo'),images)):
            path=out/f'{name}-{label}.png';Image.fromarray(image).save(path);saved.append(bound(path))
            draw.text((column*256+4,at*282+3),f'{name} / {label}',fill='white')
            sheet.paste(Image.fromarray(image).resize((256,256),Image.Resampling.NEAREST),(column*256,at*282+24))
        rows.append({'name':name,'boundsXYExclusive':[x,y,x+size,y+size],'supportSize':size+16,'facts':facts,
          'edgeCenters':int((~internal).sum()),'changedEdgeEstimateCenters':int(np.any(new!=old,axis=0)[~internal].sum()),
          'changedEdgeRgbCenters':int(np.any(images[2]!=images[1],axis=2)[~internal].sum()),
          'internalEstimatesAndDiagnosticsExact':True,'projectionAndKernelSeconds':seconds,'outputs':saved})
        del stencils,result,values
    sheet.save(out/'actual-edge-comparison.png')
    after=[bound(path) for path in paths];assert after==before;save(out/'inputs-after.json',after)
    result={'status':'PASSED_ACTUAL_REAL_HALO_EDGE_CONSUMER','rows':rows,'comparison':bound(out/'actual-edge-comparison.png'),
      'inputsExact':True,'recipe':recipe,'sourceRequests':0,'oldFilterRuns':0,'wholeMasterFilterRuns':0,'displayFits':0,
      'scope':'Nine declared actual border/corner supports. Original WCS and physical CCD-distance weights; cached science/projected/weights overlap exact. Outside samples real, not mirrored/copied/zero padded. No alpha/publication changes.',
      'qualityAcceptance':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    save(out/'result.json',result);print(json.dumps({'receipt':bound(out/'result.json'),'rows':[{k:row[k] for k in ('name','edgeCenters','changedEdgeEstimateCenters','changedEdgeRgbCenters','projectionAndKernelSeconds')} for row in rows]}))

if __name__=='__main__':
    try:main()
    except Exception as error:
        out=ROOT/'output/sdss-real-halo-1003-r1'
        if out.exists():save(out/'failed.json',{'error':str(error),'type':type(error).__name__})
        raise
