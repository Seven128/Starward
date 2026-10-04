"""Verify every actual saved saturated core against its original touching colours."""
from pathlib import Path
import sys,json
ROOT=Path(__file__).resolve().parents[4];sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from astropy.visualization import make_lupton_rgb
from image_quality import digest,write_report
trial=ROOT/'output/sdss-bright-sat-colour-trial-1003-r1';parent=ROOT/'output/shared-flag-display-recovery-1003-r2/candidate';r=json.loads((parent/'candidate.json').read_bytes());q=json.loads((ROOT/'output/sdss-bright-saturation-qualification-1003-r2/result.json').read_bytes());recipe=r['sourceResolvedRecipe'];old={b:np.load(parent/r['arrays'][b]['file'],mmap_mode='r',allow_pickle=False) for b in ('g','r','i')};saved={b:np.load(trial/(b+'-display-estimates.npy'),mmap_mode='r',allow_pickle=False) for b in ('g','r','i')};checked=0
for comp in q['components']:
    if not comp['fullRingQualification']:continue
    x,y=np.asarray(comp['ringPositionsXY']).T;rgb=make_lupton_rgb(old['i'][y,x],old['r'][y,x],old['g'][y,x],minimum=0,stretch=recipe['stretch'],Q=recipe['Q'],output_dtype=np.float64).reshape(-1,3)
    colour=(rgb/rgb.sum(axis=1)[:,None]).mean(axis=0);xx,yy=np.asarray(comp['corePositionsXY']).T;intensity=sum(old[b][yy,xx].astype(float) for b in ('g','r','i'))/3
    for b,k in [('i',0),('r',1),('g',2)]:assert np.array_equal(saved[b][yy,xx],(3*intensity*colour[k]).astype(np.float32))
    checked+=len(xx)
assert checked==58
records=[]
for name in ['g-display-estimates.npy','r-display-estimates.npy','i-display-estimates.npy','bright-sat-colour-supply.npy']:
    p=trial/name;raw=p.read_bytes();records.append({'path':p.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':digest(raw)})
out=trial/'readback/output-receipt.json';assert not out.exists();write_report(out,{'scope':'Current saved estimates exactly match original actual touching-source colour rule for all58 cores, not solely shared intensity/PNG self-consistency.','checkedCoreSamples':checked,'actualParentColourFormulaExact':True,'files':records,'independentReview':'MISSING','adopted':False});print({'checkedCores':checked,'receipt':out.relative_to(ROOT).as_posix()})
(trial/'readback/core-verifier-executed.py').write_bytes(Path(__file__).read_bytes())
write_report(trial/'readback/core-verifier-task-failed.json',{'exitCode':1,'stage':'initial task array shape adapter before any write','error':'Astropy1D inputs yield1xNx3 RGB; unflattened output could not broadcast to58 core samples. Fixed task reshape only; no source/product writes from failed attempt.'})
