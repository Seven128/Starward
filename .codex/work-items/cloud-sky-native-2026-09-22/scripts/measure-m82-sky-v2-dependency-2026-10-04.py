"""Whole saved M82 noise-v2 geometry/qualification/supply/dependency ledger.

Scan target geometry only, evaluate native noise and raw RUN recovery only at
finite retained-SKY edge candidates. No whole variance image, science coadd,
filter, detector/native fits, aperture choice, new source fetch or publication.
Exterior eight-pixel source halo is explicitly separate, not guessed from crop.
"""
from pathlib import Path
import sys,json,time,importlib.util
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True

def module(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);sys.modules[name]=m;s.loader.exec_module(m);return m
loader=module('sky_v2_ledger_loader',TASK/'scripts/experience-m82-current-adaptive-recovery-2026-10-04.py');np,bind,save,memory=loader.np,loader.bind,loader.save,loader.memory
import sdss_noise_display as noise
import sdss_display_recovery as recovery
from sdss_source_stencil import source_pixel_stencil
from sdss_adaptive_display import RATIO
from sdss_frame_noise import SKY_RECONSTRUCTION_VERSION
previous=module('sky_v2_ledger_old',ROOT/'output/sdss-frame-sky-endpoint-authority-1004-r1/before-sdss_frame_noise.py')
OUT=ROOT/'output/sdss-m82-sky-v2-dependency-1004-r1'

def main():
 assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes());started,cpu=time.perf_counter(),time.process_time();pins={}
 def pin(p,expected=None):
  v=bind(p)
  if expected is not None:assert v==expected
  assert pins.setdefault(v['path'],v)==v;return v
 def doc(p):pin(p);return json.loads(p.read_bytes())
 for p in (Path(__file__),Path(loader.__file__),Path(loader.previous.__file__),Path(previous.__file__)):
  pin(p)
 for n in ('sdss_frame_noise.py','sdss_noise_display.py','sdss_display_recovery.py','sdss_source_stencil.py','sdss_adaptive_display.py','sdss_noise_aperture.py','sdss_gri_tan.py','sdss_corrected_frame.py','sdss_frame_quality.py'):
  pin(ROOT/'data-pipelines/deep-sky'/n)
 pin(ROOT/'output/sdss-m82-sky-endpoint-apertures-readback-1004-r1/checkpoint-continuity.json')
 result=doc(ROOT/'output/sdss-m82-shared-adaptive-display-1004-r1/result.json');master,parent,sources=loader.load_saved_inputs(result,pin)
 recipe,fields,weights=noise._qualified_sources(master,sources);n=master.joint_available.shape[0]
 rawpath=ROOT/'output/sdss-m82-current-adaptive-recovery-1004-r1/candidate/candidate.json';raw=doc(rawpath)
 currentpath=ROOT/'output/sdss-m82-recovered-complete-1004-r1/candidate/candidate.json';current=doc(currentpath)
 def array(meta,directory):
  p=directory/meta['file'];v=pin(p);assert (v['bytes'],v['sha256'])==(meta['bytes'],meta['sha256'])
  a=np.load(p,mmap_mode='r',allow_pickle=False);assert list(a.shape)==meta['shape'] and a.dtype.str==meta['dtype'];return a
 rawsupply=array(raw['arrays']['alternative-supply'],rawpath.parent);rawvalues={b:array(raw['arrays'][b],rawpath.parent) for b in 'gri'}
 oldcurrentq=array(current['arrays']['qualified'],currentpath.parent);oldcurrentstrong=array(current['arrays']['protected'],currentpath.parent)
 potential=np.zeros((n,n),bool);perband={};axis=[];progress=[]
 active=[name for name in fields if (weights[name]>0).any()]
 for name in active:
  for b in 'gri':
   frame=sources[name][b].frame;m=frame.calibration_sky
   bx=np.isfinite(m.xinterp)&((m.xinterp<0)|(m.xinterp>=m.allsky.shape[1]-1))
   by=np.isfinite(m.yinterp)&((m.yinterp<0)|(m.yinterp>=m.allsky.shape[0]-1))
   axis.append({'fieldBand':name+'/'+b,'skyGridShape':list(m.allsky.shape),'finiteEdgeNativeColumns':np.flatnonzero(bx).tolist(),'finiteEdgeNativeRows':np.flatnonzero(by).tolist()})
   perband[name+'/'+b]=np.zeros((n,n),bool)
 for start in range(0,n,128):
  end=min(start+128,n);yy,xx=np.mgrid[start:end,0:n];ra,dec=master.target.all_pix2world(xx,n-1-yy,0)
  for name in active:
   active_pixels=weights[name][start:end]>0
   if not active_pixels.any():continue
   ys,xs=np.nonzero(active_pixels);wr,wd=ra[ys,xs],dec[ys,xs]
   for b in 'gri':
    frame=sources[name][b].frame;m=frame.calibration_sky;sx,sy=frame.wcs.all_world2pix(wr,wd,0);stencil=source_pixel_stencil(frame.data.shape,sx,sy)
    bx=np.isfinite(m.xinterp)&((m.xinterp<0)|(m.xinterp>=m.allsky.shape[1]-1));by=np.isfinite(m.yinterp)&((m.yinterp<0)|(m.yinterp>=m.allsky.shape[0]-1))
    x,y=stencil.x0,stencil.y0;touch=bx[x]|bx[x+1]|by[y]|by[y+1]
    pos=np.flatnonzero(stencil.geometry)[touch];perband[name+'/'+b][ys[pos]+start,xs[pos]]=True;potential[ys[pos]+start,xs[pos]]=True
  progress.append({'rows':end,'potentialTargets':int(potential[:end].sum()),'seconds':time.perf_counter()-started,'memory':memory()});save(OUT/'progress.json',progress)
  if end%512==0:print(json.dumps(progress[-1]),flush=True)
 ys,xs=np.nonzero(potential);region=(ys,xs);ra,dec=master.target.all_pix2world(xs,n-1-ys,0);available=master.joint_available[region];values=np.stack([master.bands[b].data[region] for b in 'gri'])
 assert len(ys)>0
 def support(v,q,stencils):
  marginal=noise.conditional_variance_upper([s['variance'] for s in stencils]);usable=q&np.isfinite(marginal).all(axis=0)&(marginal>0).all(axis=0)
  with np.errstate(invalid='ignore',divide='ignore'):strong=usable&(np.abs(v)/np.sqrt(marginal)>=RATIO).any(axis=0)
  return usable,strong,marginal
 groups,dates=recovery._scan_groups(fields,sources);assert {str(k):list(v) for k,v in dates.items()}==raw['scanMjdRanges']
 versions=[]
 for old in (True,False):
  actual=noise.native_noise_samples
  try:
   if old:noise.native_noise_samples=previous.native_noise_samples
   eligible=available.copy();stencils={}
   for name in active:
    s,q=noise._project_field(sources[name],fields[name],weights[name][region],region,ra,dec);eligible&=q;stencils[name]=s
   usable,strong,marginal=support(values,eligible,list(stencils.values()))
   observations,_=recovery._project_scan_samples(sources,fields,weights,groups,region,ra,dec,lambda:None)
   total,numerator,flagonly,chosen=recovery._select_scan_supply(usable,available,observations,dates)
   supply=total>0;rawv=values.copy();rawv[:,supply]=(numerator[:,supply]/total[supply]).astype('f4')
   effq,effweights,effstencils=recovery._effective_recovery_samples(sources,fields,weights,region,ra,dec,rawv,available,total,chosen,lambda:None)
   recoveredq,recoveredstrong,recoveredvar=support(rawv,effq,list(effstencils.values()))
  finally:noise.native_noise_samples=actual
  versions.append({'qualified':usable,'strong':strong,'marginal':marginal,'supply':supply,'raw':rawv,'recoveredQ':recoveredq,'recoveredStrong':recoveredstrong,'recoveredVar':recoveredvar,'chosen':chosen,'stencils':stencils,'effective':effstencils})
 before,after=versions
 np.testing.assert_array_equal(before['qualified'],parent.qualified[region]);np.testing.assert_array_equal(before['strong'],parent.protected[region])
 np.testing.assert_array_equal(before['supply'],rawsupply[region]);np.testing.assert_array_equal(before['recoveredQ'],oldcurrentq[region]);np.testing.assert_array_equal(before['recoveredStrong'],oldcurrentstrong[region])
 for at,b in enumerate('gri'):np.testing.assert_array_equal(before['raw'][at,before['supply']],rawvalues[b][region][before['supply']])
 previousfinite=0
 for name in active:
  a,z=before['stencils'][name],after['stencils'][name];np.testing.assert_array_equal(a['ids'],z['ids']);np.testing.assert_array_equal(a['weights'],z['weights'])
  known=np.isfinite(a['native_variance']);np.testing.assert_array_equal(a['native_variance'][known],z['native_variance'][known]);previousfinite+=int(known.sum())
 assert not (before['qualified']&~after['qualified']).any();assert not (before['recoveredQ']&~after['recoveredQ']).any()
 changed=(before['recoveredQ']!=after['recoveredQ'])|(before['recoveredStrong']!=after['recoveredStrong'])|(before['supply']!=after['supply'])
 changed|=~((before['raw']==after['raw'])|(np.isnan(before['raw'])&np.isnan(after['raw']))).all(axis=0)
 samevar=(before['recoveredVar']==after['recoveredVar'])|(np.isnan(before['recoveredVar'])&np.isnan(after['recoveredVar']))
 changed|=(before['recoveredQ']|after['recoveredQ'])&~samevar.all(axis=0)
 for run in groups:changed|=before['chosen'][run]!=after['chosen'][run]
 changedmap=np.zeros((n,n),bool);changedmap[region]=changed;demand=recovery._supply_dependency(changedmap,8)
 packet=OUT/'actual-compact-qualification-and-supply.npz'
 np.savez_compressed(packet,target_y=ys,target_x=xs,science_gri=values,before_original_q=before['qualified'],after_original_q=after['qualified'],before_original_strong=before['strong'],after_original_strong=after['strong'],
  before_supply=before['supply'],after_supply=after['supply'],before_raw=before['raw'],after_raw=after['raw'],before_recovered_q=before['recoveredQ'],after_recovered_q=after['recoveredQ'],before_recovered_strong=before['recoveredStrong'],after_recovered_strong=after['recoveredStrong'],
  before_recovered_marginal=before['recoveredVar'],after_recovered_marginal=after['recoveredVar'],changed_dependency=changed)
 maps=OUT/'actual-whole-crop-dependency-maps.npz';np.savez_compressed(maps,potential=potential,changed_dependency=changedmap,inside_dependency_demand=demand,**{k.replace('/','-'):v for k,v in perband.items()})
 blocks=[]
 for start in range(0,n,64):
  selected=demand[start:min(start+64,n)];count=int(selected.sum())
  if count:
   by,bx=np.nonzero(selected);blocks.append({'targetBoundsXYExclusive':[int(bx.min()),start,int(bx.max()+1),min(start+64,n)],'dependencyTargets':count})
 pieces=[]
 for name in active:
  for b in 'gri':pieces.append({'fieldBand':name+'/'+b,'potentialTargets':int(perband[name+'/'+b].sum())})
 facts={'potentialTargets':len(ys),'newlyOriginalQualified':int((after['qualified']&~before['qualified']).sum()),'newlyRecoveredQualified':int((after['recoveredQ']&~before['recoveredQ']).sum()),
  'beforeSupplyAtPotential':int(before['supply'].sum()),'afterSupplyAtPotential':int(after['supply'].sum()),'newSupplyTargets':int((after['supply']&~before['supply']).sum()),'lostSupplyTargets':int((before['supply']&~after['supply']).sum()),
  'changedDependencies':int(changed.sum()),'insideDependencyDemand':int(demand.sum()),'innerDependencyDemand':int(demand[8:-8,8:-8].sum()),'insidePerimeterDependencyDemand':int(demand.sum()-demand[8:-8,8:-8].sum()),
  'previousFiniteNativeVarianceSamplesExact':previousfinite,'blocks':len(blocks),'exteriorSourceHalo':'UNMEASURED_REAL_NATIVE_REQUIRED_NOT_PADDED'}
 inputs=list(pins.values());assert [bind(ROOT/v['path']) for v in inputs]==inputs
 report={'scope':__doc__,'sourceNoiseVersion':SKY_RECONSTRUCTION_VERSION,'inputsBefore':inputs,'inputsAfterExact':True,'axisMetadata':axis,'perFieldBandPotential':pieces,'facts':facts,'blocks':blocks,'savedCompact':bind(packet),'savedMaps':bind(maps),
  'allOutsidePotentialUnchangedByOwnerGeometryAndExactInteriorArithmetic':True,'oldCandidateCompactQualificationsRawSupplyAndStrongExact':True,
  'nativeFramesReadFromExistingCache':18,'fullScienceCoaddOrVarianceOrFitsFilterApertureSelectionRuns':0,'newAstronomicalSourceRequests':0,'ordinaryAdoption':False,'otherBusinessLogicEdited':False,
  'elapsedSeconds':time.perf_counter()-started,'cpuSeconds':time.process_time()-cpu,'memory':memory(),'quality':'UNVERIFIED_DEPENDENCY_LEDGER_NOT_NEW_FULL_DISPLAY','independentReview':'MISSING'}
 save(OUT/'result.json',report);print(json.dumps({k:v for k,v in report.items() if k not in ('inputsBefore','axisMetadata','perFieldBandPotential','blocks')}),flush=True)
if __name__=='__main__':
 try:main()
 except Exception as e:
  if OUT.exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e)})
  raise
