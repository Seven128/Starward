"""Adapt saved numeric readback to perimeter refinement, no filter execution."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
s=(TASK/'scripts/readback-shared-adaptive-display-2026-10-03.py').read_text(encoding='utf-8')
s=s.replace("SOURCE=ROOT/'output/shared-adaptive-display-1003-r1'", "SOURCE=ROOT/'output/shared-adaptive-real-halo-1003-r1'")
s=s.replace("    assert (radius[:8]==-1).all() and (radius[-8:]==-1).all() and (radius[:,:8]==-1).all() and (radius[:,-8:]==-1).all()",
 "    assert candidate['interiorExact'] and candidate['wholeMasterFilterRuns']==0 and candidate['sourceWindowHaloPixels']==8")
s=s.replace("old_candidate_path=ROOT/'output/shared-noise-display-1003-r1/candidate/candidate.json'", "old_candidate_path=ROOT/'output/shared-adaptive-display-1003-r1/candidate/candidate.json'")
s=s.replace("(('original',old),('fixed',fixed),('adaptive',actual))", "(('original',old),('outer-fallback',fixed),('real-halo',actual))")
s=s.replace("'changedRgbPixels':int(np.any(actual[:,:,:3]!=old[:,:,:3],axis=2).sum()),", "'changedRgbPixels':int(np.any(actual[:,:,:3]!=old[:,:,:3],axis=2).sum()),'changedRgbFromParent':int(np.any(actual[:,:,:3]!=fixed[:,:,:3],axis=2).sum()),")
marker="    delta=np.abs(current_rgb.astype(np.int16)-reference.astype(np.int16)).max(axis=2)"
s=s.replace(marker,"""    edge_refinement=np.zeros(joint.shape,bool);edge_refinement[:8]=True;edge_refinement[-8:]=True;edge_refinement[:,:8]=True;edge_refinement[:,-8:]=True
    parent_changed=np.zeros(joint.shape,bool)
    for key in ('g','r','i','qualified','radius','reached','protected'):
        old_value=load(old_candidate['arrays'][key],old_candidate_path.parent)
        value=display[key] if key in 'gri' else maps[key]
        np.testing.assert_array_equal(value[~edge_refinement],old_value[~edge_refinement])
        if key in 'gri':parent_changed|=~((value==old_value)|(np.isnan(value)&np.isnan(old_value)))
    assert not parent_changed[~edge_refinement].any()
"""+marker)
s=s.replace("'adaptiveFilterRuns':0", "'interiorEstimatesAndDiagnosticsExact':True,'edgeChangedEstimatesFromParent':int(parent_changed.sum()),'edgeTargets':int(edge_refinement.sum()),'adaptiveFilterRuns':0")
path=TASK/'scripts/readback-shared-adaptive-real-halo-2026-10-03.py'
with path.open('x',encoding='utf-8',newline='\n') as f:f.write(s)
print(path)
