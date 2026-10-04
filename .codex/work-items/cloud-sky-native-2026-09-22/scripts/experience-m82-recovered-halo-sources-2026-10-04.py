"""Four real original source windows: external supply and complete target support.

No filtering, candidate rewrite, whole coadd, source request or adoption.
"""
from pathlib import Path
import importlib.util
import json
import time

ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
OUT=ROOT/'output/sdss-m82-recovered-halo-sources-1004-r1'
GEN=ROOT/'output/sdss-m82-current-adaptive-recovery-1004-r1'
ARCHIVE=ROOT/'output/sdss-m82-recovered-aperture-interior-1004-r1'
def module(name,file):
    spec=importlib.util.spec_from_file_location(name,TASK/'scripts'/file)
    value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value
loader=module('loader','experience-m82-current-adaptive-recovery-2026-10-04.py')
reference=module('reference','inspect-m82-recovered-native-apertures-2026-10-04.py')
np,bind,save=loader.np,loader.bind,loader.save
from sdss_display_recovery import OtherScanDisplay,project_current_recovery_halo_region,_supply_dependency
from sdss_adaptive_display import _display_support
from sdss_noise_aperture import aperture_variance_upper
from PIL import Image,ImageDraw


def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    inputs={}
    def pin(path,expected=None):
        actual=bind(path)
        if expected is not None:assert actual==expected
        prior=inputs.setdefault(actual['path'],actual);assert prior==actual;return actual
    cp_path=TASK/'evidence/current-execution-state-2026-10-04-r83.json';pin(cp_path);cp=json.loads(cp_path.read_bytes())
    changes=[];allowed={'data-pipelines/deep-sky/sdss_display_recovery.py','data-pipelines/deep-sky/sdss_noise_display.py',
        'data-pipelines/deep-sky/test_sdss_display_recovery.py'}
    for item in cp['currentSources']:
        actual=bind(ROOT/item['path'])
        if actual!=item:
            assert item['path'] in allowed
            if item['path'].endswith('/test_sdss_display_recovery.py'):
                original=(ROOT/item['path']).read_bytes().replace(b'_project_scan_samples',b'_project_scan_region')
                archive=OUT/'previous-test_sdss_display_recovery.py';archive.write_bytes(original)
            else:archive=ARCHIVE/('executed-'+Path(item['path']).name)
            previous=pin(archive);assert (previous['sha256'],previous['bytes'])==(item['sha256'],item['bytes'])
            changes.append({'previous':item,'current':pin(ROOT/item['path']),'previousByteExactArchive':previous})
    assert {v['previous']['path'] for v in changes}==allowed
    for item in cp['protected']+cp['evidence']:assert bind(ROOT/item['path'])==item
    print(json.dumps({'checkpointContinuity':True,'sources':len(cp['currentSources']),'evidence':len(cp['evidence']),'protected':len(cp['protected'])}),flush=True)
    pin(Path(__file__));pin(Path(reference.__file__));pin(ROOT/'data-pipelines/deep-sky/test_sdss_recovered_halo.py')
    for name in ('sdss_display_recovery.py','sdss_noise_display.py','sdss_adaptive_display.py','sdss_noise_aperture.py',
                 'sdss_frame_noise.py','sdss_frame_quality.py','sdss_corrected_frame.py','sdss_source_stencil.py','sdss_gri_tan.py'):
        path=ROOT/'data-pipelines/deep-sky'/name;pin(path);(OUT/('executed-'+name)).write_bytes(path.read_bytes())
    path=loader.DISPLAY/'result.json';pin(path);master,parent,sources=loader.load_saved_inputs(json.loads(path.read_bytes()),pin)
    path=GEN/'result.json';pin(path);result=json.loads(path.read_bytes());candidate_path=ROOT/result['candidate']['path']
    pin(candidate_path,result['candidate']);candidate=json.loads(candidate_path.read_bytes())
    def array(meta):
        path=candidate_path.parent/meta['file'];p=pin(path);assert (p['sha256'],p['bytes'])==(meta['sha256'],meta['bytes'])
        return np.load(path,mmap_mode='r',allow_pickle=False)
    recovery=OtherScanDisplay({b:array(candidate['arrays'][b]) for b in 'gri'},array(candidate['arrays']['alternative-supply']),candidate)
    # Pin the completed interior as the actual next candidate parent; unchanged.
    path=ARCHIVE/'result.json';pin(path);interior=json.loads(path.read_bytes());pin(ROOT/interior['candidate']['path'],interior['candidate'])
    n=master.joint_available.shape[0];h=8
    definitions=[('top',(slice(-h,2*h),slice(-h,n+h)),(slice(0,h),slice(0,n))),
        ('bottom',(slice(n-2*h,n+h),slice(-h,n+h)),(slice(n-h,n),slice(0,n))),
        ('left',(slice(0,n),slice(-h,2*h)),(slice(h,n-h),slice(0,h))),
        ('right',(slice(0,n),slice(n-2*h,n+h)),(slice(h,n-h),slice(n-h,n)))]
    facts=[];started,cpu=time.perf_counter(),time.process_time()
    sheet=Image.new('RGB',(768,1120),'#181818');draw=ImageDraw.Draw(sheet)
    for at,(name,region,target) in enumerate(definitions):
        t=time.perf_counter();samples=project_current_recovery_halo_region(master,parent,recovery,sources,region)
        q,strong=_display_support(samples.values,samples.eligible,list(samples.stencils.values()));full=reference.full_cross(q)
        local=tuple(slice(v.start-r.start,v.stop-r.start) for v,r in zip(target,region))
        overlap=tuple(slice(max(0,v.start)-v.start,min(n,v.stop)-v.start) for v in region)
        outside=np.ones(q.shape,bool);outside[overlap]=False
        target_mask=np.zeros(q.shape,bool);target_mask[local]=True
        original_inside=samples.alternative_supply.copy();original_inside[outside]=False
        external=samples.alternative_supply&outside
        inside_influence=_supply_dependency(original_inside,h);external_influence=_supply_dependency(external,h)
        influence=inside_influence|external_influence
        old_blocked=parent.qualified[target]&(parent.radius[target]<0)
        complete_old=old_blocked&full[local]&~strong[local]
        witnesses=[];possibilities=[('outside-supply',np.argwhere(external)),
            ('perimeter-source-support',np.argwhere(target_mask&full&~strong))]
        for role,positions in possibilities:
            if not len(positions):continue
            for cy,cx in positions[np.linspace(0,len(positions)-1,min(3,len(positions)),dtype=int)]:
                cy,cx=int(cy),int(cx);selected=np.zeros(q.shape,bool);selected[cy,cx]=True
                if 0<cy<q.shape[0]-1 and 0<cx<q.shape[1]-1 and full[cy,cx]:
                    selected[cy-1,cx]=not strong[cy-1,cx];selected[cy+1,cx]=not strong[cy+1,cx]
                    selected[cy,cx-1]=not strong[cy,cx-1];selected[cy,cx+1]=not strong[cy,cx+1]
                actual=aperture_variance_upper(list(samples.stencils.values()),selected)
                dense,records=reference.dense_native_variance(samples.stencils,selected)
                np.testing.assert_allclose(actual,dense,rtol=np.finfo(float).eps*32,atol=0)
                record={'role':role,'globalXY':[cx+region[1].start,cy+region[0].start],'selected':int(selected.sum()),
                    'conditionalNativeUpper':actual.tolist(),'denseNativeUpper':dense.tolist(),
                    'rawMeanGri':samples.values[:,selected].astype(float).mean(axis=1).tolist(),'native':records}
                index=len(witnesses);np.savez_compressed(OUT/f'{name}-witness-{index}.npz',selected=selected,
                    **{field.replace('/','-')+'-'+key:v[:,:,selected] for field,s in samples.stencils.items() for key,v in s.items()
                       if key in ('ids','weights','native_variance')})
                witnesses.append(record)
        np.savez_compressed(OUT/f'{name}-samples.npz',rawDisplaySamplingGri=samples.values,sourceEligible=samples.eligible,
            sourceQualified=q,strongSigned=strong,alternativeSupply=samples.alternative_supply,completeRadius1=full,
            **{field.replace('/','-')+'-weight':w for field,w in samples.normalized_weights.items()})
        save(OUT/f'{name}-sampling.json',samples.report)
        fact={'edge':name,'supportBoundsXYExclusive':samples.report['supportBoundsXYExclusive'],
            'targetBoundsXYExclusive':[target[1].start,target[0].start,target[1].stop,target[0].stop],
            'targetPixels':int(target_mask.sum()),'outsideSupplyPixels':int(external.sum()),
            'knownInsideSupplyDependencyPositions':int((inside_influence&target_mask).sum()),
            'externalSupplyDependencyPositions':int((external_influence&target_mask).sum()),
            'allSupplyDependencyPositions':int((influence&target_mask).sum()),
            'actualQualifiedWeakDependencies':int((influence[local]&q[local]&~strong[local]&~parent.protected[target]).sum()),
            'oldQualifiedNoApertureTargets':int(old_blocked.sum()),'oldBlockedNowCompleteRadius1Weak':int(complete_old.sum()),
            'witnesses':witnesses,'seconds':time.perf_counter()-t,'memory':loader.memory(),
            'samplingReport':pin(OUT/f'{name}-sampling.json'),'samples':pin(OUT/f'{name}-samples.npz')}
        facts.append(fact);print(json.dumps({k:v for k,v in fact.items() if k!='witnesses'}),flush=True)
        for column,mask in enumerate((samples.alternative_supply,q,full)):
            pixels=np.full((*q.shape,3),28,np.uint8);pixels[mask]=[55,195,95];pixels[strong]=[65,115,220]
            draw.text((column*256+4,at*280+4),name+' / '+('actual supply','native qualification','complete radius1')[column],fill='white')
            sheet.paste(Image.fromarray(pixels).resize((256,256),Image.Resampling.NEAREST),(column*256,at*280+24))
        del samples,q,strong,full
    sheet.save(OUT/'actual-source-halo-roles.png')
    assert sum(v['targetPixels'] for v in facts)==n*n-(n-16)**2
    assert sum(v['knownInsideSupplyDependencyPositions'] for v in facts)==1202
    assert sum(v['oldQualifiedNoApertureTargets'] for v in facts)==752
    before=list(inputs.values());after=[bind(ROOT/v['path']) for v in before];assert before==after
    for item in cp['protected']+cp['evidence']:assert bind(ROOT/item['path'])==item
    outputs=[bind(path) for path in OUT.rglob('*') if path.is_file()]
    save(OUT/'result.json',{'scope':__doc__,'checkpoint':pin(cp_path),'previousSourcesExplicitlyChanged':changes,'inputs':before,
        'inputsAfterExact':True,'oldProtectedAndEvidenceExact':True,'windows':facts,'outputsBeforeResult':outputs,
        'seconds':time.perf_counter()-started,'cpuSeconds':time.process_time()-cpu,'processMemory':loader.memory(),
        'regionProjections':4,'filterOrCandidateRewriteOrWholeCoaddRuns':0,'sourceRequests':0,
        'ordinaryAdoption':False,'quality':'UNVERIFIED','independentReview':'MISSING'})
    print(json.dumps({'result':bind(OUT/'result.json')}),flush=True)


if __name__=='__main__':
    try:main()
    except Exception as error:
        if OUT.exists():save(OUT/'failed.json',{'type':type(error).__name__,'error':str(error)})
        raise
