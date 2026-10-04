"""Bind current guard policy to saved real parents, preserve executed code roles.

Schedule demand is derived from saved supply and maximum dependency radius;
it supplies neither source qualification nor a new science/coverage mask.
No filtering, region projection, coadd, download or source processing rerun.
"""
from pathlib import Path
import importlib.util
import json

ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
GEN=ROOT/'output/sdss-m82-recovered-aperture-regions-1004-r1'
READBACK=ROOT/'output/sdss-m82-recovered-aperture-regions-readback-1004-r1'
OUT=ROOT/'output/sdss-m82-recovered-aperture-regions-guard-close-1004-r2'
spec=importlib.util.spec_from_file_location('loader',TASK/'scripts/experience-m82-current-adaptive-recovery-2026-10-04.py')
loader=importlib.util.module_from_spec(spec);spec.loader.exec_module(loader)
np,bind,save=loader.np,loader.bind,loader.save
from sdss_display_recovery import OtherScanDisplay,_admit_current_recovery_parent
from sdss_adaptive_display import RADII


def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    inputs={};historical=[]
    def pin(path,expected=None):
        actual=bind(path)
        if expected is not None:assert actual==expected
        prior=inputs.setdefault(actual['path'],actual);assert prior==actual
        return actual
    path=GEN/'result.json';pin(path);producer=json.loads(path.read_bytes())
    old_test=next(v for v in producer['inputs'] if v['path']=='data-pipelines/deep-sky/test_sdss_recovered_apertures.py')
    path=ROOT/old_test['path'];pin(path)
    text=path.read_text(encoding='utf-8');start=text.index('    def test_parent_policy_and_processing_role_are_bound_before_projection');end=text.index('    def test_no_synthetic_crop_halo',start)
    reconstructed=text[:start]+text[end:]
    archive=OUT/'recovered-previous-test_sdss_recovered_apertures.py';archive.write_bytes(reconstructed.encode('utf-8'))
    assert (bind(archive)['bytes'],bind(archive)['sha256'])==(old_test['bytes'],old_test['sha256'])
    for item in producer['inputs']:
        actual=bind(ROOT/item['path'])
        if actual!=item:
            if item['path']=='data-pipelines/deep-sky/sdss_display_recovery.py':
                saved=GEN/'executed-sdss_display_recovery.py'
            else:
                assert item['path']==old_test['path'];saved=archive
            previous=pin(saved);assert (previous['bytes'],previous['sha256'])==(item['bytes'],item['sha256'])
            historical.append({'previousInput':item,'byteExactArchive':previous,'currentSource':pin(ROOT/item['path']),
                'meaning':'Guard-only source close after real region run, or exact old test bytes reconstructed from bounded added policy test. Does not relabel saved execution.'})
        else:pin(ROOT/item['path'],item)
    for item in producer['outputsBeforeResult']:pin(ROOT/item['path'],item)
    path=READBACK/'result.json';pin(path);reader=json.loads(path.read_bytes())
    assert reader['changedEstimates']==7759 and reader['changedRGB']==7710
    pin(Path(__file__));pin(Path(loader.__file__))
    for name in ('sdss_display_recovery.py','sdss_adaptive_display.py'):
        path=ROOT/'data-pipelines/deep-sky'/name;pin(path);(OUT/('current-'+name)).write_bytes(path.read_bytes())
    path=loader.DISPLAY/'result.json';pin(path)
    master,parent,sources=loader.load_saved_inputs(json.loads(path.read_bytes()),pin)
    path=loader.OUT/'result.json';pin(path);current=json.loads(path.read_bytes())
    candidate_path=ROOT/current['candidate']['path'];pin(candidate_path,current['candidate']);candidate=json.loads(candidate_path.read_bytes())
    def array(meta):
        path=candidate_path.parent/meta['file'];actual=pin(path)
        assert (actual['bytes'],actual['sha256'])==(meta['bytes'],meta['sha256'])
        return np.load(path,mmap_mode='r',allow_pickle=False)
    recovery=OtherScanDisplay({b:array(candidate['arrays'][b]) for b in 'gri'},array(candidate['arrays']['alternative-supply']),candidate)
    _admit_current_recovery_parent(master,parent,recovery)
    halo=RADII[-1];n=recovery.alternative_supply.shape[0];influence=np.zeros((n,n),bool)
    for dy in range(-halo,halo+1):
        for dx in range(-halo,halo+1):
            if dy*dy+dx*dx>halo*halo:continue
            ys=slice(max(0,-dy),min(n,n-dy));xs=slice(max(0,-dx),min(n,n-dx))
            influence[ys,xs] |= recovery.alternative_supply[slice(ys.start+dy,ys.stop+dy),slice(xs.start+dx,xs.stop+dx)]
    exterior=influence.copy();exterior[halo:-halo,halo:-halo]=False
    demand=influence&~parent.protected&master.joint_available
    demand[:halo]=False;demand[-halo:]=False;demand[:,:halo]=False;demand[:,-halo:]=False
    blocks=[]
    for start in range(halo,n-halo,64):
        end=min(n-halo,start+64);ys,xs=np.where(demand[start:end])
        if not len(xs):continue
        left,right=int(xs.min()),int(xs.max()+1)
        blocks.append({'targetBoundsXYExclusive':[left,start,right,end],
            'realInsideCropSupportBoundsXYExclusive':[left-halo,start-halo,right+halo,end+halo],
            'dependencyDemandTargets':int(len(xs))})
    assert sum(row['dependencyDemandTargets'] for row in blocks)==int(demand.sum())
    schedule={'kind':'DERIVED_DEPENDENCY_DEMAND_NOT_SOURCE_QUALIFICATION','supplyPixels':int(recovery.alternative_supply.sum()),
        'maxRadius':halo,'insideDependencyDemandTargets':int(demand.sum()),
        'originalQualifiedDemand':int((demand&parent.qualified).sum()),
        'originalUnqualifiedDemandRequiresRealNativeAdmission':int((demand&~parent.qualified).sum()),
        'originalProtectedDemandExcluded':int((influence&parent.protected&master.joint_available)[halo:-halo,halo:-halo].sum()),
        'exteriorInfluenceTargetsUnqualifiedByThisSchedule':int(exterior.sum()),'existingChunkRows':64,'nonemptyBlocks':len(blocks),
        'blocks':blocks,'meaning':'Actual needed interior source windows before native admission. Exterior remains a separate real-halo responsibility; no q|supply or guessed coverage.'}
    save(OUT/'dependency-demand.json',schedule)
    for item in inputs.values():assert bind(ROOT/item['path'])==item
    report={'scope':__doc__,'inputs':list(inputs.values()),'inputsAfterExact':True,'historicalSourceRoles':historical,
        'producerResult':pin(GEN/'result.json'),'numericReadback':pin(READBACK/'result.json'),
        'currentGuardAcceptsActualScientificAdaptiveAndRecoveryParents':True,
        'currentGuardMeaning':'Baseline processing version and unadopted/unverified parent policy now additionally bound; current real inputs pass. Numeric filter/sampling kernels unchanged after saved regional run.',
        'dependencyDemand':pin(OUT/'dependency-demand.json'),'wholeFilterCoaddProjectionOrSourceRuns':0,
        'ordinaryAdoption':False,'independentReview':'MISSING','quality':'UNVERIFIED'}
    save(OUT/'result.json',report);print(json.dumps({'result':bind(OUT/'result.json'),'schedule':{k:v for k,v in schedule.items() if k!='blocks'}}))


if __name__=='__main__':
    try:main()
    except Exception as error:
        if OUT.exists():save(OUT/'failed.json',{'type':type(error).__name__,'error':str(error)})
        raise
