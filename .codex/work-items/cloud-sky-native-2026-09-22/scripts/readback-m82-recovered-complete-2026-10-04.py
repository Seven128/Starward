"""Saved complete candidate: exact interior, new raw apertures/native stop, LOD.

No producer projection, filter, coadd, fit or source acquisition. Self-review.
"""
from pathlib import Path
import importlib.util
import json

ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
GEN=ROOT/'output/sdss-m82-recovered-complete-1004-r1'
HALO=ROOT/'output/sdss-m82-recovered-halo-sources-1004-r1'
OUT=ROOT/'output/sdss-m82-recovered-complete-readback-1004-r1'
def module(name,file):
    spec=importlib.util.spec_from_file_location(name,TASK/'scripts'/file)
    value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value
loader=module('loader','experience-m82-current-adaptive-recovery-2026-10-04.py')
witness=module('witness','readback-m82-recovered-aperture-regions-2026-10-04.py')
np,bind,save=loader.np,loader.bind,loader.save
from PIL import Image,ImageDraw
from astropy.visualization import make_lupton_rgb,ManualInterval,LuptonAsinhStretch


def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    inputs={}
    def pin(path,expected=None):
        actual=bind(path)
        if expected is not None:assert actual==expected
        prior=inputs.setdefault(actual['path'],actual);assert prior==actual;return actual
    path=GEN/'result.json';producer_pin=pin(path);result=json.loads(path.read_bytes())
    assert producer_pin['sha256']=='8c056213a9abc4552eb664302181ccaf3467b7222dbd6331ceb014338dc18ea5'
    before=json.loads((GEN/'inputs-before.json').read_bytes());after=json.loads((GEN/'inputs-after.json').read_bytes());assert before==after
    for item in before+result['outputsBeforeResult']:pin(ROOT/item['path'],item)
    pin(Path(__file__));pin(Path(witness.__file__))
    path=loader.DISPLAY/'result.json';pin(path);master,parent,sources=loader.load_saved_inputs(json.loads(path.read_bytes()),pin)
    def document(meta):
        path=ROOT/meta['path'];pin(path,meta);return json.loads(path.read_bytes()),path.parent
    current,current_dir=document(result['candidate']);old,old_dir=document(result['interiorCandidate'])
    recovery,recovery_dir=document(result['recoveryCandidate'])
    def array(meta,directory):
        path=directory/meta['file'];p=pin(path);assert (p['sha256'],p['bytes'])==(meta['sha256'],meta['bytes'])
        value=np.load(path,mmap_mode='r',allow_pickle=False);assert list(value.shape)==meta['shape'] and value.dtype.str==meta['dtype'];return value
    estimates={b:array(current['arrays'][b],current_dir) for b in 'gri'}
    baseline={b:array(old['arrays'][b],old_dir) for b in 'gri'}
    raw_recovery={b:array(recovery['arrays'][b],recovery_dir) for b in 'gri'}
    maps={key:array(current['arrays'][key],current_dir) for key in ('qualified','radius','reached','protected','affected')}
    old_maps={key:array(old['arrays'][key],old_dir) for key in maps}
    internal=slice(8,-8),slice(8,-8);perimeter=np.ones(master.joint_available.shape,bool);perimeter[internal]=False
    for b in 'gri':
        np.testing.assert_array_equal(estimates[b][internal],baseline[b][internal])
        np.testing.assert_array_equal(estimates[b][~maps['affected']],raw_recovery[b][~maps['affected']])
        np.testing.assert_array_equal(estimates[b][parent.protected],baseline[b][parent.protected])
    for key in maps:np.testing.assert_array_equal(maps[key][internal],old_maps[key][internal])
    assert current['parentInteriorEstimateCOrderSha256']==old['displayEstimatesCOrderSha256']
    assert current['parentInteriorDiagnosticCOrderSha256']==old['diagnosticCOrderSha256']
    assert current['parentInteriorAffectedCOrderSha256']==old['affectedCOrderSha256']
    circles={}
    for r in (1,2,4,8):
        dy,dx=np.mgrid[-r:r+1,-r:r+1];circle=dx*dx+dy*dy<=r*r;circles[r]=dy[circle],dx[circle]
    checked=0;fallback=0;gates=[];facts=[];visited=np.zeros(perimeter.shape,bool)
    for edge in current['edgeRegions']:
        name=edge['edge'];path=HALO/f'{name}-sampling.json';pin(path);assert json.loads(path.read_bytes())==edge['sampling']
        path=HALO/f'{name}-samples.npz';pin(path)
        with np.load(path,allow_pickle=False) as archive:sampling={key:archive[key] for key in archive.files}
        x0,y0,x1,y1=edge['sampling']['supportBoundsXYExclusive'];tx0,ty0,tx1,ty1=edge['targetBoundsXYExclusive']
        target=slice(ty0,ty1),slice(tx0,tx1);local=slice(ty0-y0,ty1-y0),slice(tx0-x0,tx1-x0)
        assert not visited[target].any();visited[target]=True
        raw=sampling['rawDisplaySamplingGri'];q=sampling['sourceQualified'];strong=sampling['strongSigned']
        np.testing.assert_array_equal(maps['qualified'][target],q[local]);np.testing.assert_array_equal(maps['protected'][target],strong[local])
        affected=maps['affected'][target];radii=maps['radius'][target]
        assert int(affected.sum())==edge['affectedTargets'];expected=np.stack([baseline[b][target] for b in 'gri'])
        for cy,cx in np.argwhere(affected):
            y,x=cy+ty0-y0,cx+tx0-x0;r=int(radii[cy,cx])
            if r>0:
                dy,dx=circles[r];ys,xs=y+dy,x+dx;assert q[ys,xs].all()
                selected=~strong[ys,xs];assert selected.any() and not strong[y,x]
                expected[:,cy,cx]=raw[:,ys[selected],xs[selected]].astype(float).mean(axis=1).astype(np.float32);checked+=1
            else:assert r==-1;expected[:,cy,cx]=raw[:,y,x];fallback+=1
        actual=np.stack([estimates[b][target] for b in 'gri']);np.testing.assert_array_equal(actual,expected)
        changed=int(np.any(actual!=np.stack([baseline[b][target] for b in 'gri']),axis=0).sum())
        assert changed==edge['changedFromInteriorEstimatePixels']
        viable=np.argwhere(affected&(radii>0))
        if len(viable):
            for cy,cx in viable[np.linspace(0,len(viable)-1,min(4,len(viable)),dtype=int)]:
                y,x=int(cy+ty0-y0),int(cx+tx0-x0);chosen_r=-1;reached=False;mean=raw[:,y,x];checks=[]
                for r in (1,2,4,8):
                    dy,dx=circles[r];ys,xs=y+dy,x+dx
                    if not q[ys,xs].all():break
                    selected=np.zeros(q.shape,bool);selected[ys,xs]=~strong[ys,xs]
                    upper,direct,absolute,repeats=witness.original_aperture_noise(sources,sampling,master,[x0,y0,x1,y1],selected)
                    original_mean=raw[:,selected].astype(float).mean(axis=1)
                    bound=(len(sources)+8)*np.finfo(np.float32).eps*absolute+len(sources)*np.finfo(np.float32).smallest_subnormal
                    assert (np.abs(direct-original_mean)<=bound).all()
                    if not np.isfinite(upper).all() or (upper<=0).any():break
                    chosen_r=r;mean=original_mean.astype(np.float32);reached=bool((np.abs(original_mean)/np.sqrt(upper)>=3).all())
                    checks.append({'radius':r,'selected':int(selected.sum()),'conditionalNativeUpper':upper.tolist(),
                        'directOriginalRawMeanGri':direct.tolist(),'savedRawMeanGri':original_mean.tolist(),
                        'residualGri':np.abs(direct-original_mean).tolist(),'derivedFloat32BoundGri':bound.tolist(),
                        'commonConditionalRatioReached':reached,'nativeRepeats':repeats})
                    if reached:break
                assert chosen_r==radii[cy,cx] and reached==maps['reached'][target][cy,cx]
                np.testing.assert_array_equal(mean,actual[:,cy,cx]);gates.append({'edge':name,
                    'globalXY':[int(cx+tx0),int(cy+ty0)],'radius':chosen_r,'reached':reached,'checks':checks})
        facts.append({'edge':name,'affected':int(affected.sum()),'changedFromInteriorEstimates':changed,'actualRawMeansExact':True})
    np.testing.assert_array_equal(visited,perimeter)
    assert checked+fallback==1199 and sum(v['changedFromInteriorEstimates'] for v in facts)==1021
    recipe=current['sourceResolvedRecipe'];assert recipe==old['sourceResolvedRecipe']==recovery['sourceResolvedRecipe']
    def rgb(values):
        return make_lupton_rgb(values['i'],values['r'],values['g'],interval=ManualInterval(vmin=0,vmax=None),
            stretch_object=LuptonAsinhStretch(stretch=recipe['stretch'],Q=recipe['Q']),output_dtype=np.uint8)
    sheet=Image.new('RGB',(1024,1608),'#181818');draw=ImageDraw.Draw(sheet);levels=[]
    for at,(level,meta) in enumerate(current['levels'].items()):
        x0,y0,x1,y1=meta['crop']['boundsXYExclusive'];factor=meta['crop']['boxFactor'];region=slice(y0,y1),slice(x0,x1)
        count=master.joint_available[region].reshape(512,factor,512,factor).sum(axis=(1,3));means={}
        for b in 'gri':
            total=np.where(master.joint_available[region],estimates[b][region],0).astype(float).reshape(512,factor,512,factor).sum(axis=(1,3))
            means[b]=np.divide(total,count,out=np.zeros_like(total),where=count>0).astype(np.float32)
        alpha=np.rint(count.astype(float)*255/factor**2).astype(np.uint8)
        path=current_dir/meta['file'];pin(path);actual=np.array(Image.open(path));np.testing.assert_array_equal(actual,np.dstack([rgb(means),alpha]))
        old_meta=old['levels'][level];path=old_dir/old_meta['file'];pin(path);previous=np.array(Image.open(path))
        np.testing.assert_array_equal(actual[:,:,3],previous[:,:,3])
        for key in ('pixels','fieldDegrees','wcsHeader'):assert meta[key]==old_meta[key]
        for column,(label,pixels) in enumerate((('saved interior',previous),('actual complete real-halo',actual))):
            draw.text((column*512+4,at*536+4),level+' / '+label,fill='white');sheet.paste(Image.fromarray(pixels[:,:,:3]),(column*512,at*536+24))
        levels.append({'level':level,'numericRGBOriginalAlphaWcsExact':True,'changedRgbFromInteriorPixels':int(np.any(actual[:,:,:3]!=previous[:,:,:3],axis=2).sum()),
            'png':pin(current_dir/meta['file'])})
    sheet.save(OUT/'actual-full-lod-pairs.png')
    for item in inputs.values():assert bind(ROOT/item['path'])==item
    report={'scope':__doc__,'producerResult':producer_pin,'inputs':list(inputs.values()),'inputsAfterExact':True,
        'completeInternalEstimatesAndDiagnosticsExact':True,'actualEdgeCommonMeansChecked':checked,'actualEdgeRawFallback':fallback,
        'affectedPerimeterTargets':1199,'changedFromInteriorEstimatePixels':1021,'edges':facts,'originalNativeConditionalStopWitnesses':gates,
        'levels':levels,'everyPerimeterTargetVisitedOnce':True,'unaffectedCurrentAndOriginalStrongExact':True,
        'producerProjectionFilterCoaddFitRuns':0,'sourceRequests':0,'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
    save(OUT/'result.json',report);print(json.dumps({k:v for k,v in report.items() if k not in ('inputs','originalNativeConditionalStopWitnesses','scope')}),flush=True)


if __name__=='__main__':
    try:main()
    except Exception as error:
        if OUT.exists():save(OUT/'failed.json',{'type':type(error).__name__,'error':str(error)})
        raise
