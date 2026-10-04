"""Actual saved complete model-increment -> explicit offline display publication.

No original scientific coadd/variance/noise/aperture selection/fit or source
requests. New immutable packaging only; quality/default/runtime remain open.
"""
from pathlib import Path
import sys,json,time,importlib.util
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True;sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
def module(name,p):
 s=importlib.util.spec_from_file_location(name,p);m=importlib.util.module_from_spec(s);sys.modules[name]=m;s.loader.exec_module(m);return m
loader=module('display_publication_observation',TASK/'scripts/experience-m82-current-adaptive-recovery-2026-10-04.py');bind,save,memory=loader.bind,loader.save,loader.memory
from publish_sdss_display import verify_cached_display_generation,publish_verified_display
OUT=ROOT/'output/sdss-m82-display-publication-1004-r2'

def main():
 assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes());started,cpu=time.perf_counter(),time.process_time()
 cp=json.loads((TASK/'evidence/current-execution-state-2026-10-04-r94.json').read_bytes())
 archives={'packages/miniapp-contracts/src/sdss-science-optical-publication.ts':'before-sdss-science-optical-publication.ts',
     'data-pipelines/deep-sky/publish_prepared_optical.py':'before-io-extraction-publish_prepared_optical.py'}
 for v in cp['currentSources']:
  p=ROOT/v['path'] if v['path'] not in archives else ROOT/'output/sdss-m82-display-publication-development-1004-r1'/archives[v['path']]
  actual=bind(p);assert (actual['bytes'],actual['sha256'])==(v['bytes'],v['sha256'])
 for v in cp['protected']+cp['evidence']:assert bind(ROOT/v['path'])==v
 pin=bind(ROOT/'output/sdss-m82-noise-v2-increment-readback-1004-r1/checkpoint-continuity.json')
 code=[ROOT/'data-pipelines/deep-sky'/n for n in ('publish_sdss_display.py','test_publish_sdss_display.py','optical_publication_io.py','publish_prepared_optical.py','pack_sdss_display_publication.mts')]
 code += [ROOT/'packages/miniapp-contracts/src'/n for n in ('sdss-display-optical-publication.ts','sdss-display-optical-publication.test.ts','sdss-science-optical-publication.ts')]
 before=[bind(p) for p in code];save(OUT/'implementation-before.json',before)
 for p in code:(OUT/('executed-'+p.name)).write_bytes(p.read_bytes())
 verify_start=time.perf_counter();verified=verify_cached_display_generation(ROOT/'output/sdss-m82-noise-v2-increment-1004-r1',root=ROOT,
     result_sha256='806e1432da5baa543c50ec7c5cd962276bddc7d6422c5e38b50874261f03d01a')
 verify_seconds=time.perf_counter()-verify_start;print(json.dumps({'actualSavedGenerationVerified':True,'seconds':verify_seconds,'memory':memory()}),flush=True)
 package_start=time.perf_counter();receipt=publish_verified_display(verified,OUT/'publication',root=ROOT,
     publication_id='m82-native-noise-v2-display-1004-r1',legacy_manifest=ROOT/'workers/miniapp-api/assets/deep-sky/sdss-m82/manifest.json')
 assert before==[bind(p) for p in code]
 for v in cp['protected']+cp['evidence']:assert bind(ROOT/v['path'])==v
 result={'scope':__doc__,'previousCheckpoint':bind(TASK/'evidence/current-execution-state-2026-10-04-r94.json'),
     'previousContinuity':pin,'oldSourceArchives':{k:bind(ROOT/'output/sdss-m82-display-publication-development-1004-r1'/v) for k,v in archives.items()},
     'oldProtectedAndEvidenceExact':True,'implementationBeforeAfterExact':True,
     'publication':bind(OUT/'publication/manifest.json'),'writerReceipt':bind(OUT/'publication/writer-receipt.json'),
     'publicationHash':receipt['publicationHash'],'savedGenerationVerificationSeconds':verify_seconds,
     'packagingSeconds':time.perf_counter()-package_start,'elapsedSeconds':time.perf_counter()-started,'cpuSeconds':time.process_time()-cpu,'memory':memory(),
     'newAstronomicalSourceRequestsOrNoiseProjectionApertureFits':0,'originalScienceAndCandidatePreserved':True,
     'ordinaryAdoption':False,'runtimeRegistered':False,'quality':'UNVERIFIED','independentReview':'MISSING','otherBusinessLogicEdited':False}
 save(OUT/'result.json',result);print(json.dumps(result),flush=True)

if __name__=='__main__':
 try:main()
 except Exception as e:
  if OUT.exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e)})
  raise
