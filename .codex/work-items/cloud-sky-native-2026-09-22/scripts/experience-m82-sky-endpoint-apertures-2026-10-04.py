"""Two real changed M82 SKY-boundary regions through raw RUN/cohort/aperture owners.

A versioned bounded increment only: original science and all old candidates stay
untouched. Real eight-pixel halos, before-policy counterfactual, known bad other
RUN supply, native-ID covariance and existing common signed aperture policy.
"""
from pathlib import Path
import sys,json,time,importlib.util
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image,ImageDraw
import sdss_noise_display as noise
import sdss_display_recovery as recovery
from sdss_adaptive_display import _display_support,adaptive_common_display_batched
from sdss_gri_tan import ProjectedBand,target_tan
from sdss_corrected_frame import read_cached_frame
from sdss_frame_noise import read_cached_field_noise,SKY_RECONSTRUCTION_VERSION
from sdss_frame_quality import PixelFlags

def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);sys.modules[name]=m;spec.loader.exec_module(m);return m
binding=module('endpoint_aperture_binding',TASK/'scripts/analyze-m82-fixed-response-shapes-2026-10-04.py');bind,save=binding.bind,binding.save
resources=module('endpoint_aperture_memory',TASK/'scripts/experience-shared-noise-display-2026-10-03.py')
previous=module('endpoint_aperture_before',ROOT/'output/sdss-frame-sky-endpoint-authority-1004-r1/before-sdss_frame_noise.py')
OUT=ROOT/'output/sdss-m82-sky-endpoint-apertures-1004-r2'

def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    started,cpu=time.perf_counter(),time.process_time();pins={}
    def pin(p,expected=None):
        v=bind(p)
        if expected is not None:assert v==expected
        assert pins.setdefault(v['path'],v)==v;return v
    def doc(p):pin(p);return json.loads(p.read_bytes())
    for p in (Path(__file__),Path(previous.__file__),Path(binding.__file__),Path(resources.__file__)):
        pin(p)
    for n in ('sdss_frame_noise.py','sdss_noise_display.py','sdss_display_recovery.py','sdss_noise_aperture.py','sdss_adaptive_display.py','sdss_source_stencil.py','sdss_gri_tan.py','sdss_corrected_frame.py','sdss_frame_quality.py'):
        pin(ROOT/'data-pipelines/deep-sky'/n)
    endpoint=doc(ROOT/'output/sdss-m82-sky-endpoint-consumer-1004-r1/result.json')
    sciencepath=ROOT/'output/sdss-m82-first-science-master-1004-r2/candidate/candidate.json';science=doc(sciencepath)
    currentpath=ROOT/'output/sdss-m82-recovered-complete-1004-r1/candidate/candidate.json';current=doc(currentpath)
    def array(meta,directory):
        p=directory/meta['file'];v=pin(p);assert (v['bytes'],v['sha256'])==(meta['bytes'],meta['sha256'])
        a=np.load(p,mmap_mode='r',allow_pickle=False);assert list(a.shape)==meta['shape'] and a.dtype.str==meta['dtype'];return a
    sci={b:array(science['arrays'][b+'-science'],sciencepath.parent) for b in 'gri'}
    joint=array(science['arrays']['joint-availability'],sciencepath.parent)
    saved={b:array(current['arrays'][b],currentpath.parent) for b in 'gri'}
    savedmaps={k:array(current['arrays'][k],currentpath.parent) for k in ('qualified','protected','radius','reached')}
    # Supply belongs to the earlier raw recovery, not the final aperture parent.
    rawpath=ROOT/'output/sdss-m82-current-adaptive-recovery-1004-r1/candidate/candidate.json';raw=doc(rawpath)
    oldsupply=array(raw['arrays']['alternative-supply'],rawpath.parent)
    masks=doc(ROOT/'output/sdss-m82-fpm-frame-intersection-1004-r1/result-r2.json')
    camera=doc(ROOT/'output/sdss-m82-quality-inputs-1004-r1/camera-receipt.json');csv=ROOT/camera['raw']['path'];pin(csv,camera['raw'])
    target=target_tan(science['center'],science['pixels'],science['fieldDegrees'])
    regions=[]
    for row in endpoint['records']:
        if not row['newlyQualified']:continue
        x0,y0,x1,y1=row['boundsXYExclusive'];region=(slice(y0-8,y1+8),slice(x0-8,x1+8));local=(slice(8,-8),slice(8,-8))
        y,x=np.mgrid[region];ra,dec=target.all_pix2world(x,2047-y,0)
        p=ROOT/row['saved']['path'];pin(p,row['saved'])
        with np.load(p,allow_pickle=False) as z:expected={k:z[k] for k in ('before_qualified','after_qualified','before_strong','after_strong')}
        regions.append({'name':row['name'],'region':region,'local':local,'ra':ra,'dec':dec,'innerBounds':row['boundsXYExclusive'],'expected':expected})
    fields={};weights={};sources={};frames=0
    for field in science['mosaic']['fields']:
        key=field['fieldKey'];meta=science['mosaic']['diagnostics'][key];w=array(meta['normalized-weight'],sciencepath.parent)
        if not any((w[r['region']]>0).any() for r in regions):continue
        weights[key]=w;fields[key]={b:ProjectedBand(array(meta[b+'-science'],sciencepath.parent),array(meta[b+'-footprint'],sciencepath.parent),array(meta[b+'-finite-neighbors'],sciencepath.parent),field['perBand'][b]) for b in 'gri'}
        sources[key]={}
        for b in 'gri':
            receipt=field['perBand'][b]['sourceReceipt'];original=receipt['source'];identity=receipt['identity'];p=Path(original['path']);v=pin(p)
            assert (v['bytes'],v['sha256'])==(original['bytes'],original['sha256'])
            frame=read_cached_frame(p,identity|{k:original[k] for k in ('bytes','sha256','sourceUrl')},max_uncompressed_bytes=32*1024*1024)
            assert frame.receipt==receipt;frames+=1
            mask=next(v for v in masks['fpMInputs'] if v['identity']==identity);pin(ROOT/mask['flags']['path'],mask['flags']);admission=doc(ROOT/mask['currentAdmission']['path'])
            with np.load(ROOT/mask['flags']['path'],allow_pickle=False) as z:flags=z['flags']
            sources[key][b]=noise.NoiseDisplaySource(frame,read_cached_field_noise(csv,camera,identity),PixelFlags(flags,None,admission))
    groups,dates=recovery._scan_groups(fields,sources);records=[]
    for r in regions:
        region,local=r['region'],r['local'];original=np.stack([sci[b][region] for b in 'gri']);available=joint[region];versions=[]
        for old in (True,False):
            actual=noise.native_noise_samples
            try:
                if old:noise.native_noise_samples=previous.native_noise_samples
                eligible=available.copy();stencils=[]
                for name in fields:
                    s,q=noise._project_field(sources[name],fields[name],weights[name][region],region,r['ra'],r['dec']);eligible&=q;stencils.append(s)
                q,strong=_display_support(original,eligible,stencils)
                prefix='before' if old else 'after'
                np.testing.assert_array_equal(q[local],r['expected'][prefix+'_qualified']);np.testing.assert_array_equal(strong[local],r['expected'][prefix+'_strong'])
                observations,_=recovery._project_scan_samples(sources,fields,weights,groups,region,r['ra'],r['dec'],lambda:None)
                total,numerator,flagonly,chosen=recovery._select_scan_supply(q,available,observations,dates)
                supply=total>0;values=original.copy();values[:,supply]=(numerator[:,supply]/total[supply]).astype('f4')
                effq,effw,effstencils=recovery._effective_recovery_samples(sources,fields,weights,region,r['ra'],r['dec'],values,available,total,chosen,lambda:None)
                usable,protected=_display_support(values,effq,list(effstencils.values()))
            finally:noise.native_noise_samples=actual
            versions.append({'values':values,'eligible':effq,'stencils':effstencils,'weights':effw,'qualified':usable,'protected':protected,'originalQualified':q,'supply':supply,'flagonly':flagonly,'chosen':chosen})
        before,after=versions
        np.testing.assert_array_equal(before['supply'][local],oldsupply[region][local])
        np.testing.assert_array_equal(before['qualified'][local],savedmaps['qualified'][region][local]);np.testing.assert_array_equal(before['protected'][local],savedmaps['protected'][region][local])
        changed=before['qualified']!=after['qualified'];changed|=before['protected']!=after['protected'];changed|=before['supply']!=after['supply']
        changed|=np.any(before['values']!=after['values'],axis=0)
        # Changed conditional variance (including finite/unknown) is itself an
        # aperture dependency. Compare after aggregation, no fictitious new mask.
        for name in before['stencils']:
            a=before['stencils'][name];z=after['stencils'][name]
            same=(a['variance']==z['variance'])|(np.isnan(a['variance'])&np.isnan(z['variance']))
            changed|=~same.all(axis=0)
        requested=recovery._supply_dependency(changed,8);requested[:8]=False;requested[-8:]=False;requested[:,:8]=False;requested[:,-8:]=False
        outcomes=[]
        for v in versions:
            a=adaptive_common_display_batched(v['values'],v['eligible'],list(v['stencils'].values()),targets=requested,batch_size=64)
            # Strong and genuinely unknown centres never become new means.
            keep=v['protected']|~v['qualified'];np.testing.assert_array_equal(a.estimates[:,keep],v['values'][:,keep])
            outcomes.append(a)
        ba,aa=outcomes;selected=requested[local]
        for at,b in enumerate('gri'):
            np.testing.assert_array_equal(ba.estimates[at][local][selected],saved[b][region][local][selected])
        np.testing.assert_array_equal(ba.radius[local][selected],savedmaps['radius'][region][local][selected])
        np.testing.assert_array_equal(ba.reached[local][selected],savedmaps['reached'][region][local][selected])
        packet=OUT/(r['name']+'-actual-aperture-increment.npz')
        np.savez_compressed(packet,science_gri=original,before_raw=before['values'],after_raw=after['values'],before_supply=before['supply'],after_supply=after['supply'],
            before_qualified=before['qualified'],after_qualified=after['qualified'],before_protected=before['protected'],after_protected=after['protected'],
            changed_dependency=changed,requested=requested,before_estimates=ba.estimates,after_estimates=aa.estimates,before_radius=ba.radius,after_radius=aa.radius,before_reached=ba.reached,after_reached=aa.reached)
        counts=lambda a:{str(k):int(n) for k,n in zip(*np.unique(a[local][selected],return_counts=True))}
        records.append({'name':r['name'],'targetBoundsXYExclusive':r['innerBounds'],'supportBoundsXYExclusive':[region[1].start,region[0].start,region[1].stop,region[0].stop],
            'requestedTargets':int(selected.sum()),'newlyOriginalQualified':int((after['originalQualified']&~before['originalQualified'])[local].sum()),
            'beforeSupply':int(before['supply'][local].sum()),'afterSupply':int(after['supply'][local].sum()),'supplyChanged':int((before['supply']!=after['supply'])[local].sum()),
            'beforeRecoveredQualified':int(before['qualified'][local].sum()),'afterRecoveredQualified':int(after['qualified'][local].sum()),
            'beforeRadiusCounts':counts(ba.radius),'afterRadiusCounts':counts(aa.radius),'changedEstimateTargets':int((np.any(ba.estimates!=aa.estimates,axis=0)[local]&selected).sum()),
            'afterUnknownOrFlagRejected':int((~after['qualified'])[local].sum()),'oldCandidateRawSupplyQualificationsAndRequestedAperturesExact':True,
            'strongAndUnknownRawPreserved':True,'saved':bind(packet)})
        print(json.dumps(records[-1]),flush=True)
        del versions,before,after,outcomes,ba,aa
    inputs=list(pins.values());assert [bind(ROOT/v['path']) for v in inputs]==inputs
    report={'scope':__doc__,'inputsBefore':inputs,'inputsAfterExact':True,'sourceNoiseVersion':SKY_RECONSTRUCTION_VERSION,'scanMjdRanges':{str(k):list(v) for k,v in dates.items()},
        'records':records,'nativeFramesRead':frames,'elapsedSeconds':time.perf_counter()-started,'cpuSeconds':time.process_time()-cpu,'memory':resources.memory(),
        'oldScientificOrCandidateOrRegistryChanges':False,'wholeVarianceFitsCoaddFilterOrRadiusSelectionRuns':0,'boundedChangedConsumerApertureSelection':True,'astronomicalSourceRequests':0,
        'quality':'UNVERIFIED_BOUNDED_INCREMENT_ONLY_NOT_COMPLETE_DISPLAY_CANDIDATE','independentReview':'MISSING','otherBusinessLogicEdited':False,'ordinaryAdoption':False}
    save(OUT/'result.json',report);print(json.dumps({k:v for k,v in report.items() if k not in ('inputsBefore','records')}),flush=True)
if __name__=='__main__':
    try:main()
    except Exception as e:
        if OUT.exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e)})
        raise
