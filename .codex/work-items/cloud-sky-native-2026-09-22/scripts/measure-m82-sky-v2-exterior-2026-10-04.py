"""Actual eight-pixel exterior of M82 SKY-v2 dependency, no padding.

Existing real-source-window owner verifies scientific/coefficient overlap. Only
outside finite SKY edge candidates receive before/after noise/RUN recovery; no
whole image variance/filter/fit/aperture selection or altered published science.
"""
from pathlib import Path
import sys,json,time,importlib.util
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True

def module(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);sys.modules[name]=m;s.loader.exec_module(m);return m
loader=module('sky_v2_exterior_loader',TASK/'scripts/experience-m82-current-adaptive-recovery-2026-10-04.py');np,bind,save,memory=loader.np,loader.bind,loader.save,loader.memory
import sdss_noise_display as noise
import sdss_display_recovery as recovery
from sdss_source_stencil import source_pixel_stencil
from sdss_adaptive_display import RATIO
from sdss_frame_noise import SKY_RECONSTRUCTION_VERSION
previous=module('sky_v2_exterior_before',ROOT/'output/sdss-frame-sky-endpoint-authority-1004-r1/before-sdss_frame_noise.py')
OUT=ROOT/'output/sdss-m82-sky-v2-exterior-1004-r1'

def main():
 assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes());started,cpu=time.perf_counter(),time.process_time();pins={}
 def pin(p,expected=None):
  v=bind(p)
  if expected is not None:assert v==expected
  assert pins.setdefault(v['path'],v)==v;return v
 def doc(p):pin(p);return json.loads(p.read_bytes())
 for p in (Path(__file__),Path(loader.__file__),Path(loader.previous.__file__),Path(previous.__file__)):
  pin(p)
 for name in ('sdss_noise_display.py','sdss_display_recovery.py','sdss_gri_tan.py','sdss_source_stencil.py','sdss_frame_noise.py','sdss_corrected_frame.py','sdss_frame_quality.py'):
  pin(ROOT/'data-pipelines/deep-sky'/name)
 ledger=doc(ROOT/'output/sdss-m82-sky-v2-dependency-1004-r1/result.json');pin(ROOT/ledger['savedMaps']['path'],ledger['savedMaps'])
 with np.load(ROOT/ledger['savedMaps']['path'],allow_pickle=False) as z:inside_changed=z['changed_dependency'];inside_demand=z['inside_dependency_demand']
 result=doc(ROOT/'output/sdss-m82-shared-adaptive-display-1004-r1/result.json');master,parent,sources=loader.load_saved_inputs(result,pin);recipe,fields,weights=noise._qualified_sources(master,sources)
 groups,dates=recovery._scan_groups(fields,sources);n=master.joint_available.shape[0];halo=8
 extended=np.zeros((n+2*halo,n+2*halo),bool);extended[halo:-halo,halo:-halo]=inside_changed;records=[];exterior_potential=0;exterior_changed=0;known_added=0;supply_added=0;source_pixels=0
 windows=[('top',(slice(-halo,halo),slice(-halo,n+halo))),('bottom',(slice(n-halo,n+halo),slice(-halo,n+halo))),('left',(slice(halo,n-halo),slice(-halo,halo))),('right',(slice(halo,n-halo),slice(n-halo,n+halo)))]
 def support(v,q,stencils):
  marginal=noise.conditional_variance_upper([s['variance'] for s in stencils]);usable=q&np.isfinite(marginal).all(axis=0)&(marginal>0).all(axis=0)
  with np.errstate(invalid='ignore',divide='ignore'):strong=usable&(np.abs(v)/np.sqrt(marginal)>=RATIO).any(axis=0)
  return usable,strong,marginal
 for name,region in windows:
  # This is a real bounded scientific source projection only outside the saved
  # crop, with every cached overlap checked. No new published science/coadd.
  window=noise._project_real_source_window(master,sources,fields,weights,region,lambda:None)
  yy,xx=np.mgrid[region];outside=(yy<0)|(yy>=n)|(xx<0)|(xx>=n);source_pixels+=int((outside&window.available).sum())
  ra,dec=master.target.all_pix2world(xx,n-1-yy,0);potential=np.zeros(window.available.shape,bool)
  for field,w in window.normalized_weights.items():
   active=outside&(w>0)
   if not active.any():continue
   ys,xs=np.nonzero(active)
   for b in 'gri':
    f=sources[field][b].frame;m=f.calibration_sky;sx,sy=f.wcs.all_world2pix(ra[ys,xs],dec[ys,xs],0);stencil=source_pixel_stencil(f.data.shape,sx,sy)
    bx=np.isfinite(m.xinterp)&((m.xinterp<0)|(m.xinterp>=m.allsky.shape[1]-1));by=np.isfinite(m.yinterp)&((m.yinterp<0)|(m.yinterp>=m.allsky.shape[0]-1))
    x,y=stencil.x0,stencil.y0;touch=bx[x]|bx[x+1]|by[y]|by[y+1];positions=np.flatnonzero(stencil.geometry)[touch];potential[ys[positions],xs[positions]]=True
  ys,xs=np.nonzero(potential);select=(ys,xs);count=len(ys);exterior_potential+=count
  record={'window':name,'sourceBoundsXYExclusive':[region[1].start,region[0].start,region[1].stop,region[0].stop],'realOutsideAvailable':int((outside&window.available).sum()),'potentialOutsideTargets':count,'cachedScienceAvailabilityWeightsOverlapExact':window.report['cachedOverlapExact']}
  if count:
   available=window.available[select];values=window.values[:,ys,xs];versions=[]
   for old in (True,False):
    actual=noise.native_noise_samples
    try:
     if old:noise.native_noise_samples=previous.native_noise_samples
     eligible=available.copy();stencils={}
     for field,w in window.normalized_weights.items():
      if not w[select].any():continue
      s,q=noise._project_field(sources[field],window.fields[field],w[select],select,ra[select],dec[select]);eligible&=q;stencils[field]=s
     q,strong,var=support(values,eligible,list(stencils.values()))
     observations,_=recovery._project_scan_samples(sources,window.fields,window.normalized_weights,groups,select,ra[select],dec[select],lambda:None)
     total,numerator,flagonly,chosen=recovery._select_scan_supply(q,available,observations,dates)
     supply=total>0;rawv=values.copy();rawv[:,supply]=(numerator[:,supply]/total[supply]).astype('f4')
     effq,effw,effst=recovery._effective_recovery_samples(sources,window.fields,window.normalized_weights,select,ra[select],dec[select],rawv,available,total,chosen,lambda:None)
     recoveredq,recoveredstrong,recoveredvar=support(rawv,effq,list(effst.values()))
    finally:noise.native_noise_samples=actual
    versions.append({'q':q,'strong':strong,'supply':supply,'raw':rawv,'recoveredQ':recoveredq,'recoveredStrong':recoveredstrong,'recoveredVar':recoveredvar,'chosen':chosen,'stencils':stencils})
   before,after=versions
   for field in before['stencils']:
    a,z=before['stencils'][field],after['stencils'][field];np.testing.assert_array_equal(a['ids'],z['ids']);np.testing.assert_array_equal(a['weights'],z['weights']);known=np.isfinite(a['native_variance']);np.testing.assert_array_equal(a['native_variance'][known],z['native_variance'][known])
   assert not (before['recoveredQ']&~after['recoveredQ']).any()
   changed=(before['recoveredQ']!=after['recoveredQ'])|(before['recoveredStrong']!=after['recoveredStrong'])|(before['supply']!=after['supply'])
   changed|=~((before['raw']==after['raw'])|(np.isnan(before['raw'])&np.isnan(after['raw']))).all(axis=0)
   same=(before['recoveredVar']==after['recoveredVar'])|(np.isnan(before['recoveredVar'])&np.isnan(after['recoveredVar']))
   changed|=(before['recoveredQ']|after['recoveredQ'])&~same.all(axis=0)
   for run in groups:changed|=before['chosen'][run]!=after['chosen'][run]
   globaly,globalx=yy[select],xx[select];extended[globaly+halo,globalx+halo]|=changed
   packet=OUT/(name+'-actual-exterior-qualification.npz');np.savez_compressed(packet,target_y=globaly,target_x=globalx,science_gri=values,before_q=before['q'],after_q=after['q'],before_supply=before['supply'],after_supply=after['supply'],before_raw=before['raw'],after_raw=after['raw'],before_recovered_q=before['recoveredQ'],after_recovered_q=after['recoveredQ'],before_recovered_strong=before['recoveredStrong'],after_recovered_strong=after['recoveredStrong'],before_recovered_marginal=before['recoveredVar'],after_recovered_marginal=after['recoveredVar'],changed_dependency=changed)
   record.update({'newOriginalQualified':int((after['q']&~before['q']).sum()),'newRecoveredQualified':int((after['recoveredQ']&~before['recoveredQ']).sum()),'supplyAdded':int((after['supply']&~before['supply']).sum()),'changedDependency':int(changed.sum()),'saved':bind(packet)})
   exterior_changed+=int(changed.sum());known_added+=record['newRecoveredQualified'];supply_added+=record['supplyAdded']
  records.append(record);print(json.dumps(record),flush=True)
  del window
 demand_extended=recovery._supply_dependency(extended,halo);demand=demand_extended[halo:-halo,halo:-halo];added=demand&~inside_demand
 assert not (inside_demand&~demand).any();assert not added[halo:-halo,halo:-halo].any()
 packet=OUT/'actual-complete-dependency-maps.npz';np.savez_compressed(packet,extended_changed_dependency=extended,complete_inside_demand=demand,added_from_real_exterior=added)
 blocks=[]
 for start in range(0,n,64):
  selected=demand[start:min(start+64,n)];count=int(selected.sum())
  if count:
   y,x=np.nonzero(selected);blocks.append({'targetBoundsXYExclusive':[int(x.min()),start,int(x.max()+1),min(start+64,n)],'dependencyTargets':count})
 inputs=list(pins.values());assert [bind(ROOT/v['path']) for v in inputs]==inputs
 report={'scope':__doc__,'sourceNoiseVersion':SKY_RECONSTRUCTION_VERSION,'inputsBefore':inputs,'inputsAfterExact':True,'records':records,'exteriorAvailableActualSourceTargets':source_pixels,'exteriorPotentialTargets':exterior_potential,'exteriorChangedDependencies':exterior_changed,'exteriorNewRecoveredQualified':known_added,'exteriorNewSupply':supply_added,
  'insideDemand':int(demand.sum()),'innerDemand':int(demand[halo:-halo,halo:-halo].sum()),'perimeterDemand':int(demand.sum()-demand[halo:-halo,halo:-halo].sum()),'addedInsideDemandFromRealExterior':int(added.sum()),'blocks':blocks,'savedMaps':bind(packet),
  'nativeFramesReadFromExistingCache':18,'wholeScienceVarianceFitsFilterApertureSelectionRuns':0,'newAstronomicalSourceRequests':0,'oldScientificOrCandidateOrRegistryChanges':False,'ordinaryAdoption':False,'otherBusinessLogicEdited':False,
  'elapsedSeconds':time.perf_counter()-started,'cpuSeconds':time.process_time()-cpu,'memory':memory(),'quality':'UNVERIFIED_ACTUAL_COMPLETE_DEPENDENCY_LEDGER_NOT_NEW_DISPLAY','independentReview':'MISSING'}
 save(OUT/'result.json',report);print(json.dumps({k:v for k,v in report.items() if k not in ('inputsBefore','records','blocks')}),flush=True)
if __name__=='__main__':
 try:main()
 except Exception as e:
  if OUT.exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e)})
  raise
