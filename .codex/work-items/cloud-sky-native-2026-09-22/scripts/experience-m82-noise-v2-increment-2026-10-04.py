"""Actual complete necessary retained-SKY-v2 shared model increment and three LOD.

Reuse original science/native inputs and old complete display. Only measured
90746 targets receive new common apertures; source/real halo/typed lineage stay
explicit. No full old variance/coadd/filter/fit replay, source fetch or adoption.
"""
from pathlib import Path
import sys,json,time,os,importlib.util
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True

def module(name,p):
 s=importlib.util.spec_from_file_location(name,p);m=importlib.util.module_from_spec(s);sys.modules[name]=m;s.loader.exec_module(m);return m
loader=module('noise_v2_increment_loader',TASK/'scripts/experience-m82-current-adaptive-recovery-2026-10-04.py');np,bind,save,memory=loader.np,loader.bind,loader.save,loader.memory
from sdss_display_recovery import RecoveredApertureCandidate
from sdss_noise_model_increment import NoiseModelDependencyPlan,plan_identity,refresh_retained_sky_model,save_source_noise_increment
from sdss_noise_display_provenance import canonical_bytes
from image_quality import digest
from sdss_frame_noise import SKY_RECONSTRUCTION_VERSION
OUT=ROOT/'output/sdss-m82-noise-v2-increment-1004-r1'

def main():
 assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes());pins={}
 save(OUT/'execution.json',{'pid':os.getpid(),'scope':__doc__,'astronomicalSourceRequests':0,'wholeMasterFilterCoaddVarianceFitsRuns':0})
 def pin(p,expected=None):
  v=bind(p)
  if expected is not None:assert v==expected
  assert pins.setdefault(v['path'],v)==v;return v
 def doc(p):pin(p);return json.loads(p.read_bytes())
 def packet(v):
  p=ROOT/v['path'];pin(p,v)
  with np.load(p,allow_pickle=False) as z:return {k:z[k] for k in z.files}
 cp=doc(TASK/'evidence/current-execution-state-2026-10-04-r93.json')
 for v in cp['currentSources']+cp['protected']+cp['evidence']:assert bind(ROOT/v['path'])==v
 pin(ROOT/'output/sdss-m82-sky-v2-dependency-readback-1004-r1/checkpoint-continuity.json')
 for p in (Path(__file__),Path(loader.__file__),Path(loader.previous.__file__)):
  pin(p)
 for n in ('sdss_noise_model_increment.py','test_sdss_noise_model_increment.py','sdss_frame_noise.py','sdss_noise_display.py','sdss_display_recovery.py','sdss_adaptive_display.py','sdss_noise_aperture.py','sdss_source_stencil.py','sdss_gri_tan.py','sdss_corrected_frame.py','sdss_frame_quality.py','sdss_noise_display_provenance.py'):
  p=ROOT/'data-pipelines/deep-sky'/n;pin(p);(OUT/('executed-'+n)).write_bytes(p.read_bytes())
 insidepath=ROOT/'output/sdss-m82-sky-v2-dependency-1004-r1/result.json';inside=doc(insidepath)
 exteriorpath=ROOT/'output/sdss-m82-sky-v2-exterior-1004-r1/result.json';exterior=doc(exteriorpath)
 readerpath=ROOT/'output/sdss-m82-sky-v2-dependency-readback-1004-r1/result.json';reader=doc(readerpath)
 compact=packet(inside['savedCompact']);ext=packet(exterior['savedMaps']);newmaps=packet(reader['diagnosticQualification'])
 display=doc(ROOT/'output/sdss-m82-shared-adaptive-display-1004-r1/result.json');master,oldparent,sources=loader.load_saved_inputs(display,pin)
 currentpath=ROOT/'output/sdss-m82-recovered-complete-1004-r1/candidate/candidate.json';current=doc(currentpath)
 def array(meta):
  p=currentpath.parent/meta['file'];v=pin(p);assert (v['bytes'],v['sha256'])==(meta['bytes'],meta['sha256'])
  a=np.load(p,mmap_mode='r',allow_pickle=False);assert list(a.shape)==meta['shape'] and a.dtype.str==meta['dtype'];return a
 baseline=RecoveredApertureCandidate({b:array(current['arrays'][b]) for b in 'gri'},*(array(current['arrays'][k]) for k in ('qualified','radius','reached','protected','affected')),current)
 originalq=oldparent.qualified.copy();originalq[compact['target_y'],compact['target_x']]=compact['after_original_q']
 oldcode=pin(ROOT/'output/sdss-frame-sky-endpoint-authority-1004-r1/before-sdss_frame_noise.py')
 newcode=pin(ROOT/'data-pipelines/deep-sky/sdss_frame_noise.py')
 plan=NoiseModelDependencyPlan(ext['extended_changed_dependency'],ext['complete_inside_demand'],originalq,newmaps['qualified'],newmaps['protected'],{
  'previousModel':'sdss-retained-sky-complete-grid-stencil-v1','currentModel':SKY_RECONSTRUCTION_VERSION,
  'parentReportCanonicalSha256':digest(canonical_bytes(current)),
  'previousModelImplementationSha256':oldcode['sha256'],'currentModelImplementationSha256':newcode['sha256'],
  'wholeCropEvidenceSha256':pin(insidepath)['sha256'],'exteriorEvidenceSha256':pin(exteriorpath)['sha256'],'readbackEvidenceSha256':pin(readerpath)['sha256']})
 plan_sha=digest(canonical_bytes(plan_identity(plan)));save(OUT/'bound-dependency-plan.json',plan_identity(plan)|{'canonicalSha256':plan_sha})
 assert plan.requested.sum()==90746 and plan.recovered_qualified.sum()==4138282 and plan.recovered_protected.sum()==1025765
 save(OUT/'inputs-before.json',list(pins.values()));started,cpu=time.perf_counter(),time.process_time();rows=[]
 def progress(v):
  row={'completedRows':v['completedRows'],'targetBoundsXYExclusive':v['region']['targetBoundsXYExclusive'],'requested':v['region']['requestedTargets'],
   'rawSupply':v['region']['requestedRawSupply'],'radii':v['region']['requestedRadiusCounts'],'realExterior':v['region']['realExteriorUsed'],'seconds':time.perf_counter()-started,'memory':memory()}
  rows.append(row);save(OUT/'progress.json',rows);print(json.dumps(row),flush=True)
 candidate=refresh_retained_sky_model(master,baseline,sources,plan,expected_plan_sha256=plan_sha,progress=progress)
 elapsed,cpu_elapsed=time.perf_counter()-started,time.process_time()-cpu
 # Full shared actual consumption must realize both previously measured paths,
 # including conservative local scheduling outside the minimal global demand.
 bounded=doc(ROOT/'output/sdss-m82-sky-endpoint-apertures-1004-r2/result.json');checks=[]
 for row in bounded['records']:
  z=packet(row['saved']);x0,y0,x1,y1=row['targetBoundsXYExclusive'];region=np.s_[y0:y1,x0:x1];selected=z['requested'][8:-8,8:-8]
  for at,b in enumerate('gri'):np.testing.assert_array_equal(candidate.estimates[b][region][selected],z['after_estimates'][at,8:-8,8:-8][selected])
  np.testing.assert_array_equal(candidate.radius[region][selected],z['after_radius'][8:-8,8:-8][selected]);np.testing.assert_array_equal(candidate.reached[region][selected],z['after_reached'][8:-8,8:-8][selected])
  checks.append({'name':row['name'],'requested':int(selected.sum()),'actualEstimatesRadiusReachedExact':True})
 entry={k:master.report[k] for k in ('objectRef','center','orientation')};save_source_noise_increment(OUT/'candidate',master,candidate,entry)
 before=list(pins.values());assert [bind(ROOT/v['path']) for v in before]==before
 for v in cp['currentSources']+cp['protected']+cp['evidence']:assert bind(ROOT/v['path'])==v
 report={'scope':__doc__,'checkpoint':pin(TASK/'evidence/current-execution-state-2026-10-04-r93.json'),'inputsBefore':before,'inputsAfterExact':True,
  'previousScientificAndCandidateAndProtectedInputsExact':True,'scienceCandidate':display['scienceCandidate'],'previousCompleteCandidate':pin(currentpath),
  'candidate':bind(OUT/'candidate/candidate.json'),'sourceNoiseVersion':SKY_RECONSTRUCTION_VERSION,'boundPlanCanonicalSha256':plan_sha,
  'requestedTargets':candidate.report['requestedTargets'],'regions':len(candidate.report['regions']),'changedEstimatePixels':candidate.report['changedEstimatePixels'],
  'qualifiedCenters':candidate.report['qualifiedCenters'],'protectedCenters':candidate.report['protectedCenters'],'radiusCounts':candidate.report['radiusCounts'],
  'actualBoundedConsumers':checks,'incrementSeconds':elapsed,'incrementCpuSeconds':cpu_elapsed,'memory':memory(),
  'nativeFramesReadFromExistingCache':18,'wholeVarianceFitsScienceCoaddFilterRuns':0,'oldApertureMatricesOrPSFFitsOrDetectorsReplayed':False,
  'necessaryIncrementalCommonApertureSelection':True,'newAstronomicalSourceRequests':0,'otherBusinessLogicEdited':False,'ordinaryAdoption':False,
  'quality':'UNVERIFIED_NEW_COMPLETE_SHARED_DISPLAY_CANDIDATE','independentReview':'MISSING'}
 save(OUT/'result.json',report);print(json.dumps({k:v for k,v in report.items() if k!='inputsBefore'}),flush=True)
if __name__=='__main__':
 try:main()
 except Exception as e:
  if OUT.exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e)})
  raise
