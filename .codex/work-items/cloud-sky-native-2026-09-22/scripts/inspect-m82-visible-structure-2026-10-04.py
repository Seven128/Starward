"""Locate visible M82 structure against saved source weights and display eligibility.

Read saved arrays only; map reductions are diagnostics, not a new sky product.
No variance, detection, fits, aperture selection, source projection or coadd.
"""
from pathlib import Path
import sys,json,importlib.util,time
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from PIL import Image,ImageDraw
spec=importlib.util.spec_from_file_location('visible_binding',TASK/'scripts/analyze-m82-fixed-response-shapes-2026-10-04.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);bind,save=m.bind,m.save
OUT=ROOT/'output/sdss-m82-visible-structure-1004-r1'

def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    started=time.perf_counter();pins={}
    def pin(p,expected=None):
        v=bind(p)
        if expected is not None:assert v==expected
        assert pins.setdefault(v['path'],v)==v;return v
    def doc(p):pin(p);return json.loads(p.read_bytes())
    cp=doc(TASK/'evidence/current-execution-state-2026-10-04-r90.json')
    assert pins[next(iter(pins))]['sha256']=='102bb86ded481e2bc0fbb8f3296e3a2db4cf477a0056089ae05a09454433f4c8'
    for v in cp['currentSources']+cp['protected']+cp['evidence']:assert bind(ROOT/v['path'])==v
    pin(ROOT/'output/sdss-m82-target-profile-readback-1004-r1/checkpoint-continuity.json')
    pin(Path(__file__));pin(Path(m.__file__))
    science_dir=ROOT/'output/sdss-m82-first-science-master-1004-r2/candidate'
    current_dir=ROOT/'output/sdss-m82-recovered-complete-1004-r1/candidate'
    science=doc(science_dir/'candidate.json');current=doc(current_dir/'candidate.json')
    def array(meta,d):
        p=d/meta['file'];v=pin(p);assert (v['sha256'],v['bytes'])==(meta['sha256'],meta['bytes'])
        a=np.load(p,mmap_mode='r',allow_pickle=False);assert list(a.shape)==meta['shape'] and a.dtype.str==meta['dtype'];return a
    def box(a):return a.reshape(512,4,512,4).mean(axis=(1,3),dtype=np.float64)
    maps={k:array(current['arrays'][k],current_dir) for k in ('qualified','protected','radius','affected')}
    fields={k:array(v['normalized-weight'],science_dir) for k,v in science['mosaic']['diagnostics'].items()}
    panels=[];packet={}
    for name in ('overview','medium','detail'):
        p=current_dir/f'M-82-{name}.png';pin(p);panels.append((f'Actual current {name}',Image.open(p).convert('RGB')))
    colors={-1:(255,0,255),0:(255,255,255),1:(255,200,0),2:(0,200,0),4:(0,100,255),8:(0,0,40)}
    # Fraction of the actual master cells in each overview cell; no boolean
    # threshold hides a narrow line. Unknown fraction is encoded in red.
    for k in ('qualified','protected','affected'):
        reduced=box(maps[k]);packet[k+'Fraction']=reduced
        rgb=np.zeros((512,512,3),np.uint8)
        if k=='qualified':rgb[:,:,0]=np.rint((1-reduced)*255).astype('u1')
        else:rgb[:,:,1]=np.rint(reduced*255).astype('u1')
        panels.append((k+' fraction per OV cell (no threshold)',Image.fromarray(rgb)))
    rgb=np.zeros((512,512,3),np.float64)
    for r,c in colors.items():
        f=box(maps['radius']==r);packet['radius'+str(r)+'Fraction']=f;rgb+=f[:,:,None]*np.array(c)
    panels.append(('Radius fractions: -1 pink;0 white;1 yellow;2 green;4 blue;8 dark',Image.fromarray(np.rint(rgb).astype('u1'))))
    for k,a in fields.items():
        f=box(a);packet[k.replace('/','-')+'Weight']=f
        panels.append((k+' saved normalized weight (gray 0..1)',Image.fromarray(np.rint(f*255).astype('u1')).convert('RGB')))
    sheet=Image.new('RGB',(1536,552*((len(panels)+2)//3)),(20,20,20));draw=ImageDraw.Draw(sheet)
    for i,(title,img) in enumerate(panels):
        x=(i%3)*512;y=(i//3)*552;sheet.paste(img,(x,y+40));draw.text((x+5,y+4),title,fill='white')
    sheet.save(OUT/'actual-rgb-source-maps.png');np.savez_compressed(OUT/'overview-map-fractions.npz',**packet)
    before=list(pins.values());assert [bind(ROOT/v['path']) for v in before]==before
    report={'scope':__doc__,'inputsBefore':before,'inputsAfterExact':True,'image':bind(OUT/'actual-rgb-source-maps.png'),
        'saved':bind(OUT/'overview-map-fractions.npz'),'elapsedSeconds':time.perf_counter()-started,
        'fractionMeaning':'Actual arithmetic area means of already saved masks/weights, no per-cell threshold or scientific pixel change.',
        'sourceRequests':0,'sourceProjectionOrVarianceOrFitsOrCoaddOrFilterRuns':0,'candidateChanges':False,
        'otherBusinessLogicEdited':False,'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
    save(OUT/'result.json',report);print(json.dumps({k:v for k,v in report.items() if k!='inputsBefore'}),flush=True)
if __name__=='__main__':main()
