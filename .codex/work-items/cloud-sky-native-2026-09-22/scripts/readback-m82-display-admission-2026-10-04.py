"""Current fixed NPY guard admits actual saved display and Prepared master bytes.

Only saved-array/level verification; no FITS/source/noise/coadd/selection/fit,
Prepared reprojection/pyramid, repack, HTTP/default or target-runtime acceptance.
"""
from pathlib import Path
import sys,json,time,importlib.util
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True;sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
s=importlib.util.spec_from_file_location('display_admission_reader_bind',TASK/'scripts/analyze-m82-fixed-response-shapes-2026-10-04.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m);bind,save=m.bind,m.save
from publish_sdss_display import verify_cached_display_generation
from optical_publication_io import bound_bytes,decode_bound_npy
from image_quality import digest
OUT=ROOT/'output/sdss-m82-display-admission-readback-1004-r2'

def main():
 assert not OUT.exists();OUT.mkdir();(OUT/'executed-reader.py').write_bytes(Path(__file__).read_bytes());started=time.perf_counter()
 code=[ROOT/'data-pipelines/deep-sky'/v for v in ('publish_sdss_display.py','optical_publication_io.py','publish_prepared_optical.py','test_optical_publication_io.py')]
 before=[bind(p) for p in code]
 for p in code:(OUT/('executed-'+p.name)).write_bytes(p.read_bytes())
 verified=verify_cached_display_generation(ROOT/'output/sdss-m82-noise-v2-increment-1004-r1',root=ROOT,
     result_sha256='806e1432da5baa543c50ec7c5cd962276bddc7d6422c5e38b50874261f03d01a')
 producer=json.loads((ROOT/'output/sdss-m82-display-publication-1004-r2/result.json').read_bytes());publication=ROOT/producer['publication']['path']
 assert bind(publication)==producer['publication'];manifest=json.loads(publication.read_bytes());levels=[]
 for level,(raw,meta) in verified.products:
  file=publication.parent/manifest['levels'][level]['file'];current=bind(file);expected=manifest['levels'][level]
  assert (current['bytes'],current['sha256'])==(expected['bytes'],expected['sha256']) and file.read_bytes()==raw
  levels.append({'level':level,'currentAdmissionOriginalSavedPublishedPngExact':True,'published':current})
 # The same fixed-header decoder used by Prepared now consumes its already
 # stored actual master. No source JPEG/AVM decode or pyramid is repeated.
 prepared_path=ROOT/'output/prepared-rgb-tan-cached-validation-1003-r1/result.json';prepared=json.loads(prepared_path.read_bytes());record=prepared['master'];path=ROOT/record['path']
 raw,identity=bound_bytes(path,root=ROOT,expected=record,max_bytes=2048**2*4+16384)
 rgba=decode_bound_npy(raw,shape=(2048,2048,4),dtype='u1');expected=prepared['masterMetadata']['rgba']
 assert rgba.nbytes==expected['bytes'] and digest(rgba.tobytes())==expected['sha256']
 assert before==[bind(p) for p in code]
 result={'scope':__doc__,'implementationBeforeAfterExact':before,'latestFixedHeaderAdmissionOfActualGeneration':True,
     'levels':levels,'actualPreparedSavedMaster':identity,'actualPreparedDecodedPayloadExact':expected,
     'preparedHeaderDomainShape':[2048,2048,4],'preparedSourceAdapterOrPublicationNotRerun':True,
     'avmNotLoadedByDisplayPath':'pyavm' not in sys.modules,'sourceGenerationRequestsNoiseApertureOrFits':0,
     'previousActualPackaging':bind(ROOT/'output/sdss-m82-display-publication-1004-r2/result.json'),
     'latestAdmissionGuardDiffersFromArchivedR2ButSameCompleteSavedPngOutput':True,
     'elapsedSeconds':time.perf_counter()-started,'peakMemory':'UNMEASURED','ordinaryAdoption':False,'runtimeRegistered':False,
     'quality':'UNVERIFIED','independentReview':'MISSING','otherBusinessLogicEdited':False}
 save(OUT/'result.json',result);print(json.dumps({k:v for k,v in result.items() if k!='implementationBeforeAfterExact'}),flush=True)

if __name__=='__main__':
 try:main()
 except Exception as e:
  if OUT.exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e)})
  raise
