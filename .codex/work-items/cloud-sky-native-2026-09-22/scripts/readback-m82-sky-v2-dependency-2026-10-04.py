"""Read whole-crop/exterior SKY-v2 dependency geometry via direct coordinate scatter.

Saved source-qualified results only; no source/noise model or aperture selection
rerun. The ledger is scheduling evidence, not a scientific mask or full display.
"""
from pathlib import Path
import sys,json,time,importlib.util
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True;sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from PIL import Image,ImageDraw

def module(name,p):
 s=importlib.util.spec_from_file_location(name,p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
m=module('sky_v2_dependency_reader_bind',TASK/'scripts/analyze-m82-fixed-response-shapes-2026-10-04.py');bind,save=m.bind,m.save
OUT=ROOT/'output/sdss-m82-sky-v2-dependency-readback-1004-r1'

def main():
 assert not OUT.exists();OUT.mkdir();(OUT/'executed-reader.py').write_bytes(Path(__file__).read_bytes());started=time.perf_counter();pins={}
 def pin(p,expected=None):
  v=bind(p)
  if expected is not None:assert v==expected
  assert pins.setdefault(v['path'],v)==v;return v
 def doc(p):pin(p);return json.loads(p.read_bytes())
 def packet(v):
  p=ROOT/v['path'];pin(p,v)
  with np.load(p,allow_pickle=False) as z:return {k:z[k] for k in z.files}
 pin(Path(__file__));pin(Path(m.__file__))
 inside=doc(ROOT/'output/sdss-m82-sky-v2-dependency-1004-r1/result.json');exterior=doc(ROOT/'output/sdss-m82-sky-v2-exterior-1004-r1/result.json')
 a=packet(inside['savedCompact']);maps=packet(inside['savedMaps']);ext=packet(exterior['savedMaps']);n=maps['potential'].shape[0];halo=8
 assert maps['potential'].shape==(n,n) and ext['extended_changed_dependency'].shape==(n+2*halo,n+2*halo)
 ys,xs=np.nonzero(maps['potential']);np.testing.assert_array_equal(ys,a['target_y']);np.testing.assert_array_equal(xs,a['target_x'])
 np.testing.assert_array_equal(maps['changed_dependency'][ys,xs],a['changed_dependency'])
 assert not (a['before_original_q']&~a['after_original_q']).any();assert not (a['before_recovered_q']&~a['after_recovered_q']).any();assert not (a['before_supply']&~a['after_supply']).any()
 finite=np.isfinite(a['before_recovered_marginal']).all(axis=0)&a['before_recovered_q']&a['after_recovered_q']&~(a['before_supply']^a['after_supply'])
 np.testing.assert_array_equal(a['before_recovered_marginal'][:,finite],a['after_recovered_marginal'][:,finite])
 direct=np.zeros((n,n),bool);cy,cx=np.nonzero(ext['extended_changed_dependency']);cy-=halo;cx-=halo;circle=[]
 for dy in range(-halo,halo+1):
  for dx in range(-halo,halo+1):
   if dx*dx+dy*dy>halo*halo:continue
   circle.append((dy,dx));ty,tx=cy+dy,cx+dx;valid=(ty>=0)&(ty<n)&(tx>=0)&(tx<n);direct[ty[valid],tx[valid]]=True
 assert len(circle)==197;np.testing.assert_array_equal(direct,ext['complete_inside_demand'])
 assert not (maps['inside_dependency_demand']&~direct).any();np.testing.assert_array_equal(direct&~maps['inside_dependency_demand'],ext['added_from_real_exterior'])
 for row in exterior['records']:
  if 'saved' not in row:continue
  z=packet(row['saved']);ey,ex=z['target_y'],z['target_x'];assert ((ey<0)|(ey>=n)|(ex<0)|(ex>=n)).all()
  np.testing.assert_array_equal(ext['extended_changed_dependency'][ey+halo,ex+halo],z['changed_dependency'])
 # Current full qualification/strong maps are read as historical old policy,
 # then represented only as a diagnostic new-state map. No old candidate edit.
 path=ROOT/'output/sdss-m82-recovered-complete-1004-r1/candidate/candidate.json';current=doc(path)
 oldmaps={}
 for key in ('qualified','protected'):
  meta=current['arrays'][key];p=path.parent/meta['file'];v=pin(p);assert (v['bytes'],v['sha256'])==(meta['bytes'],meta['sha256'])
  oldmaps[key]=np.load(p,mmap_mode='r',allow_pickle=False)
 np.testing.assert_array_equal(oldmaps['qualified'][ys,xs],a['before_recovered_q']);np.testing.assert_array_equal(oldmaps['protected'][ys,xs],a['before_recovered_strong'])
 newq=oldmaps['qualified'].copy();newq[ys,xs]=a['after_recovered_q'];newstrong=oldmaps['protected'].copy();newstrong[ys,xs]=a['after_recovered_strong']
 derived=OUT/'derived-new-qualification-not-display.npz';np.savez_compressed(derived,qualified=newq,protected=newstrong)
 # Show real whole-image diagnostic scope. This is not a quality image.
 original=path.parent/current['levels']['OVERVIEW']['file'];pin(original);image=np.asarray(Image.open(original).convert('RGB'))
 colors=np.zeros((n,n,3),dtype='u1');colors[~oldmaps['qualified']]=[145,40,40];colors[newq&~oldmaps['qualified']]=[35,210,80];colors[direct&~maps['potential']]=[145,115,35];colors[maps['potential']&~newq]=[150,60,165]
 compressed=colors.reshape(512,4,512,4,3).max(axis=(1,3));sheet=Image.new('RGB',(1024,552),(16,16,16));draw=ImageDraw.Draw(sheet)
 draw.text((8,8),'Retained current RGB: unchanged, not accepted',fill='white');draw.text((520,8),'GREEN new q / GOLD circle demand / PURPLE still unknown',fill='white');draw.text((520,24),'RED old unknown; whole diagnostic domain',fill='white')
 sheet.paste(Image.fromarray(image),(0,40));sheet.paste(Image.fromarray(compressed),(512,40));view=OUT/'actual-whole-dependency-and-current.png';sheet.save(view)
 local=[];bounded=doc(ROOT/'output/sdss-m82-sky-endpoint-apertures-1004-r2/result.json')
 for row in bounded['records']:
  b=packet(row['saved']);x0,y0,x1,y1=row['targetBoundsXYExclusive'];r=np.s_[y0:y1,x0:x1];np.testing.assert_array_equal(newq[r],b['after_qualified'][8:-8,8:-8]);np.testing.assert_array_equal(newstrong[r],b['after_protected'][8:-8,8:-8]);local.append({'name':row['name'],'newRecoveredQualified':int(newq[r].sum()),'boundedActualResultsExact':True})
 inputs=list(pins.values());assert [bind(ROOT/v['path']) for v in inputs]==inputs
 report={'scope':__doc__,'inputsBefore':inputs,'inputsAfterExact':True,'wholePotentialTargets':len(ys),'allChangedCoordinatePoints':len(cy),'directCircleCoordinates':len(circle),'insideDemandDirectScatterExact':int(direct.sum()),'exteriorExtraDemand':int(ext['added_from_real_exterior'].sum()),
  'oldCurrentQualified':int(oldmaps['qualified'].sum()),'diagnosticNewQualified':int(newq.sum()),'oldCurrentProtected':int(oldmaps['protected'].sum()),'diagnosticNewProtected':int(newstrong.sum()),'boundedChangedConsumersExact':local,
  'diagnosticQualification':bind(derived),'actualWholeDiagnosticView':bind(view),'elapsedSeconds':time.perf_counter()-started,'sourceReadsOrNoiseFitsCoaddFilterApertureSelectionRuns':0,'quality':'UNVERIFIED_DIAGNOSTIC_ONLY_NOT_NEW_DISPLAY','ordinaryAdoption':False,'otherBusinessLogicEdited':False,'independentReview':'MISSING'}
 save(OUT/'result.json',report);print(json.dumps({k:v for k,v in report.items() if k!='inputsBefore'}),flush=True)
if __name__=='__main__':
 try:main()
 except Exception as e:
  if OUT.exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e)})
  raise
