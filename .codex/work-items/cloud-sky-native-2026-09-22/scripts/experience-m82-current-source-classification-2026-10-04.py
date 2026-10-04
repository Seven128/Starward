"""Current M82 source/noise/recovery classification from saved actual inputs.

Reuse native processing flags and current-version original marginal, validating
their exact relation to current effective maps and saved alternative supply.
No native read/projection, variance model, fit, filtering, source change or tone.
"""
from pathlib import Path
import sys,json,hashlib,time,importlib.util
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True;sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from PIL import Image,ImageDraw
NATIVE=ROOT/'output/sdss-m82-visible-native-display-1004-r2'
CURRENT=ROOT/'output/sdss-m82-current-source-colour-1004-r1'
ORIGINAL=ROOT/'output/sdss-m82-sky-endpoint-consumer-1004-r1'
RECOVERED=ROOT/'output/sdss-m82-sky-endpoint-apertures-1004-r2'
OUT=ROOT/'output/sdss-m82-current-source-classification-1004-r1'
BITS={'INTERP':0,'SATUR':1,'GHOST':8,'CR':9}

def bind(p):
 p=Path(p);h=hashlib.sha256()
 with p.open('rb') as f:
  for chunk in iter(lambda:f.read(1048576),b''):h.update(chunk)
 return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}
def save(p,v):
 with Path(p).open('x',encoding='utf-8') as f:f.write(json.dumps(v,ensure_ascii=False,indent=2)+'\n')

def main():
 assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes());start,cpu=time.perf_counter(),time.process_time();pins={}
 def pin(p,expected=None):
  v=bind(p)
  if expected is not None:assert v==expected
  assert pins.setdefault(v['path'],v)==v;return v
 def doc(p):pin(p);return json.loads(p.read_bytes())
 cp=TASK/'evidence/current-execution-state-2026-10-04-r105.json'
 assert bind(cp)['sha256']=='4dcf1a750f28ea0ddd6eeb38d9c29ddfaa293649fc7d68dc05af455314bfd540'
 state=doc(cp)
 for r in state['currentSources']+state['protected']+state['evidence']:assert bind(ROOT/r['path'])==r
 for p in (Path(__file__),ROOT/'data-pipelines/deep-sky/sdss_noise_display.py',ROOT/'data-pipelines/deep-sky/sdss_adaptive_display.py',ROOT/'data-pipelines/deep-sky/sdss_frame_quality.py'):pin(p)
 current=doc(CURRENT/'result.json');original=doc(ORIGINAL/'result.json');recovered=doc(RECOVERED/'result.json')
 assert original['sourceNoiseVersion']==recovered['sourceNoiseVersion']=='sdss-retained-sky-idl-bilinear-constant-edge-v2'
 rows=[];images=[]
 for record in current['records']:
  name=record['name'];meta=doc(NATIVE/(name+'-native-stage.json'));pin(NATIVE/(name+'-native-stage.npz'))
  pin(ROOT/record['saved']['path'],record['saved']);original_record=next(r for r in original['records'] if r['name']==name)
  pin(ROOT/original_record['saved']['path'],original_record['saved'])
  assert meta['boundsXYExclusive']==record['boundsXYExclusive']==original_record['boundsXYExclusive']
  with np.load(NATIVE/(name+'-native-stage.npz'),allow_pickle=False) as native,np.load(ROOT/record['saved']['path'],allow_pickle=False) as c,np.load(ROOT/original_record['saved']['path'],allow_pickle=False) as o:
   q=c['current_qualified'];p=c['current_protected'];radius=c['current_radius'];reached=c['current_reached'];sci=c['science_gri'];est=c['current_v2_gri'];green=c['current_green_dominant']
   oq=o['after_qualified'];op=o['after_strong'];marginal=o['after_marginal'];shape=q.shape
   assert np.isfinite(marginal).all() and (marginal>0).all()
   planes={key:np.zeros(shape,bool) for key in BITS};field_rows=[];geometry_reject=np.zeros(shape,bool);flagged=np.zeros(shape,bool)
   for f in meta['fields']:
    key=f['fieldKey'].replace('/','-');band=f['band'];on=native[key+'-weight']>0;sf=native[key+'-'+band+'-sample-flags'];bad=native[key+'-'+band+'-reject']
    bits=np.zeros(shape,bool)
    counts={}
    for label,bit in BITS.items():
     a=on&((sf&(1<<bit))!=0);planes[label]|=a;bits|=a;counts[label]=int(a.sum())
     assert counts[label]==f['rejectPlanes']['S_MASK_'+label]
    geometry_reject|=bad&~bits;flagged|=bad
    field_rows.append({'field':f['fieldKey'],'band':band,'active':int(on.sum()),'reject':int(bad.sum()),'planes':counts})
   assert not geometry_reject.any(),name
   assert np.array_equal(~oq,flagged),name
   with np.errstate(invalid='ignore',divide='ignore'):ratio=abs(sci.astype('f8'))/np.sqrt(marginal)
   assert np.array_equal(oq&(ratio>=3.).any(axis=0),op)
   rr=next((r for r in recovered['records'] if r['name']==name),None)
   if rr is not None:
    pin(ROOT/rr['saved']['path'],rr['saved'])
    with np.load(ROOT/rr['saved']['path'],allow_pickle=False) as r:
     local=np.s_[8:-8,8:-8];supply=r['after_supply'][local];raw=r['after_raw'][:,local[0],local[1]]
     assert np.array_equal(q,r['after_qualified'][local]) and np.array_equal(p,r['after_protected'][local])
     assert np.array_equal(sci,r['science_gri'][:,local[0],local[1]])
   else:
    supply=np.zeros(shape,bool);raw=sci.copy();assert np.array_equal(q,oq) and np.array_equal(p,op)
   assert not (supply&oq).any() and np.array_equal(q,oq|supply)
   assert np.array_equal(raw[:,~supply],sci[:,~supply])
   assert np.array_equal(q&~supply,oq) and np.array_equal(p&~supply,op)
   unknown=~q;knownbad_unrecovered=flagged&~supply
   assert np.array_equal(unknown,knownbad_unrecovered)
   assert np.array_equal(est[:,unknown],sci[:,unknown]),name
   assert np.array_equal(est[:,p],raw[:,p]),name
   masks={'known_bad_original':flagged,'qualified_alternative_supply':supply,'known_bad_without_qualified_alternative':knownbad_unrecovered,
    'original_qualified_strong':op,'effective_strong':p,'current_green_dominant':green,
    'qualified_weak_radius8_unreached':q&~p&(radius==8)&~reached}
   categories={label:{'pixels':int(mask.sum()),'greenDominant':int((mask&green).sum()),'currentSourceEqualsScience':int((mask&np.all(est==sci,axis=0)).sum()),
    'sourceProcessingPlanes':{plane:int((mask&a).sum()) for plane,a in planes.items()}} for label,mask in masks.items()}
   strongByBand={b:int((oq&(ratio[at]>=3.)).sum()) for at,b in enumerate('gri')}
   green_original_strong=green&op
   strongGreenByBand={b:int((green_original_strong&(ratio[at]>=3.)).sum()) for at,b in enumerate('gri')}
   packet=OUT/(name+'-current-classification.npz');np.savez_compressed(packet,science_gri=sci,current_gri=est,current_q=q,current_protected=p,
    original_q=oq,original_protected=op,original_marginal_gri=marginal,original_ratio_gri=ratio,original_flagged=flagged,supply=supply,recovered_raw_gri=raw,
    **{'plane_'+k:v for k,v in planes.items()},**{'class_'+k:v for k,v in masks.items()})
   sheet=Image.new('RGB',(1024,572),(16,16,16));draw=ImageDraw.Draw(sheet)
   panels=[('original INTERP',planes['INTERP']),('original SATUR',planes['SATUR']),('actual alt RUN supply',supply),('known bad: no alt supply',knownbad_unrecovered),
    ('current strong',p),('r-dominant AND strong',green&p),('weak radius8 unmet',masks['qualified_weak_radius8_unreached']),('unrecovered bad AND r-dominant',knownbad_unrecovered&green)]
   for k,(label,a) in enumerate(panels):
    im=np.zeros((*shape,3),'u1');im[a]=(220,220,220);left=(k%4)*256;top=(k//4)*286
    sheet.paste(Image.fromarray(im).resize((256,256),Image.Resampling.NEAREST),(left,top+30));draw.text((left+3,top+3),label,fill='white')
   image=OUT/(name+'-actual-classification.png');sheet.save(image);images.append(bind(image))
   rows.append({'name':name,'bounds':record['boundsXYExclusive'],'fields':field_rows,'categories':categories,'originalStrongByBand':strongByBand,
    'originalStrongGreenTriggerByBand':strongGreenByBand,'marginalInterpretation':'Current-v2 original-source conditional native-ID marginal only. Matches current raw/protected only outside actual alternative supply; never used on supplied points or interpreted as sky-model uncertainty/detection probability.',
    'unknownExactlyProcessingFlaggedWithoutSupply':True,'savedEffectiveQualificationMatchesCurrentMaps':True,'strongAndUnknownPreserveRaw':True,'saved':bind(packet)})
 spec=importlib.util.spec_from_file_location('classification_memory',TASK/'scripts/experience-shared-noise-display-2026-10-03.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
 result={'scope':__doc__,'inputs':list(pins.values()),'inputsAfterExact':all(bind(ROOT/r['path'])==r for r in pins.values()),'records':rows,'images':images,
  'sourceNoiseVersion':original['sourceNoiseVersion'],'elapsedSeconds':time.perf_counter()-start,'cpuSeconds':time.process_time()-cpu,'offlineProcessMemory':m.memory(),
  'nativeSourceReadsOrRequests':0,'oldProjectionCoaddVariancePsfNoiseRecoveryToneTrials':0,'sourceOrCandidateChanged':False,'productionChanges':False,'otherBusinessLogicEdited':False,
  'quality':'UNVERIFIED_WITH_ACTUAL_KNOWN_BAD_UNRECOVERED_SAMPLES','ordinaryAdoption':False,'independentReview':'MISSING'}
 assert result['inputsAfterExact'];save(OUT/'result.json',result)
 print(json.dumps({k:v for k,v in result.items() if k not in ('inputs','records','images')},ensure_ascii=False),flush=True)
if __name__=='__main__':main()
