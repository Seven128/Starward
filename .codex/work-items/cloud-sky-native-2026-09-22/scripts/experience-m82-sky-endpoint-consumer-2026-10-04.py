"""Real bounded source qualification after provider-defined retained-SKY endpoint fix.

Only the four diagnosed regions, all their positive contributor field/bands,
and the saved 4668 endpoint native coordinates are evaluated. No image filtering,
radius selection, fit, whole variance/coadd/source projection or publication.
"""
from pathlib import Path
import sys,json,importlib.util,time
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/sdss-psf-tools-1003-r1/python-deps'),str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from scipy.ndimage import map_coordinates
from sdss_corrected_frame import read_cached_frame
from sdss_frame_noise import read_cached_field_noise,native_noise_samples,SKY_RECONSTRUCTION_VERSION
from sdss_frame_quality import PixelFlags
from sdss_gri_tan import ProjectedBand,target_tan
import sdss_noise_display as owner
from sdss_adaptive_display import _display_support

def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);sys.modules[name]=m;spec.loader.exec_module(m);return m
binding=module('endpoint_binding',TASK/'scripts/analyze-m82-fixed-response-shapes-2026-10-04.py');bind,save=binding.bind,binding.save
resources=module('endpoint_memory',TASK/'scripts/experience-shared-noise-display-2026-10-03.py')
AUTH=ROOT/'output/sdss-frame-sky-endpoint-authority-1004-r1'
previous=module('old_endpoint_policy',AUTH/'before-sdss_frame_noise.py')
OUT=ROOT/'output/sdss-m82-sky-endpoint-consumer-1004-r1'

def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    started,cpu=time.perf_counter(),time.process_time();pins={}
    def pin(p,expected=None):
        v=bind(p)
        if expected is not None:assert v==expected
        assert pins.setdefault(v['path'],v)==v;return v
    def doc(p):pin(p);return json.loads(p.read_bytes())
    cp=doc(TASK/'evidence/current-execution-state-2026-10-04-r91.json');changed=[]
    for v in cp['currentSources']:
        actual=bind(ROOT/v['path'])
        if actual!=v:
            assert v['path'] in ('data-pipelines/deep-sky/sdss_frame_noise.py','data-pipelines/deep-sky/test_sdss_frame_noise.py',TASK.relative_to(ROOT).as_posix()+'/PLAN.md')
            if v['path'].startswith('data-pipelines/'):
                archive=pin(AUTH/('before-'+Path(v['path']).name));assert (archive['bytes'],archive['sha256'])==(v['bytes'],v['sha256'])
            changed.append({'original':v,'current':pin(ROOT/v['path'])})
    for v in cp['protected']+cp['evidence']:assert bind(ROOT/v['path'])==v
    for p in (Path(__file__),Path(binding.__file__),Path(previous.__file__),Path(resources.__file__),ROOT/'data-pipelines/deep-sky/sdss_noise_display.py',ROOT/'data-pipelines/deep-sky/sdss_adaptive_display.py'):
        pin(p)
    for p in AUTH.iterdir():
        if p.is_file():pin(p)
    old_dir=ROOT/'output/sdss-m82-visible-native-display-1004-r2';old=doc(old_dir/'result.json')
    endpoint_dir=ROOT/'output/sdss-m82-visible-causes-readback-1004-r1';endpoint=doc(endpoint_dir/'result.json')
    camera=doc(ROOT/'output/sdss-m82-quality-inputs-1004-r1/camera-receipt.json');csv=ROOT/camera['raw']['path'];pin(csv,camera['raw'])
    masks=doc(ROOT/'output/sdss-m82-fpm-frame-intersection-1004-r1/result-r2.json')
    sd=ROOT/'output/sdss-m82-first-science-master-1004-r2/candidate';science=doc(sd/'candidate.json')
    def array(meta):
        p=sd/meta['file'];v=pin(p);assert (v['bytes'],v['sha256'])==(meta['bytes'],meta['sha256'])
        a=np.load(p,mmap_mode='r',allow_pickle=False);assert list(a.shape)==meta['shape'] and a.dtype.str==meta['dtype'];return a
    target=target_tan(science['center'],science['pixels'],science['fieldDegrees'])
    work=[]
    for row in old['records']:
        pin(ROOT/row['saved']['path'],row['saved'])
        with np.load(ROOT/row['saved']['path'],allow_pickle=False) as z:
            a={k:z[k] for k in ('science-g','science-r','science-i','qualified','joint')}
        x0,y0,x1,y1=row['boundsXYExclusive'];region=np.s_[y0:y1,x0:x1];y,x=np.mgrid[region]
        ra,dec=target.all_pix2world(x,2047-y,0)
        entry={'name':row['name'],'boundsXYExclusive':row['boundsXYExclusive'],'region':region,'ra':ra,'dec':dec,'values':np.stack([a['science-'+b] for b in 'gri']),
            'beforeEligible':a['joint'].copy(),'afterEligible':a['joint'].copy(),'beforeStencils':[],'afterStencils':[],'fields':[]}
        er=next(v for v in endpoint['records'] if v['name']==row['name'])
        if 'saved' in er:
            pin(ROOT/er['saved']['path'],er['saved'])
            with np.load(ROOT/er['saved']['path'],allow_pickle=False) as z:entry['endpoint']={k:z[k] for k in z.files}
            entry['endpointField']=er['fieldBand'].rsplit('-',1)[0]
        work.append(entry)
    frames_read=0;native_endpoint_checks=[]
    for field in science['mosaic']['fields']:
        key=field['fieldKey'];meta=science['mosaic']['diagnostics'][key];weight=array(meta['normalized-weight'])
        active=[w for w in work if np.any(weight[w['region']]>0)]
        if not active:continue
        projected={b:ProjectedBand(array(meta[b+'-science']),array(meta[b+'-footprint']),array(meta[b+'-finite-neighbors']),field['perBand'][b]) for b in 'gri'}
        sources={}
        for b in 'gri':
            receipt=field['perBand'][b]['sourceReceipt'];raw=receipt['source'];identity=receipt['identity'];p=Path(raw['path']);v=pin(p)
            assert (v['bytes'],v['sha256'])==(raw['bytes'],raw['sha256'])
            frame=read_cached_frame(p,identity|{k:raw[k] for k in ('bytes','sha256','sourceUrl')},max_uncompressed_bytes=32*1024*1024)
            assert frame.receipt==receipt;frames_read+=1
            mask=next(v for v in masks['fpMInputs'] if v['identity']==identity);pin(ROOT/mask['flags']['path'],mask['flags']);admission=doc(ROOT/mask['currentAdmission']['path'])
            assert frame.header['PS_ID']==admission['actualPrimaryIdentity']['PS_ID']
            with np.load(ROOT/mask['flags']['path'],allow_pickle=False) as z:flags=z['flags']
            params=read_cached_field_noise(csv,camera,identity)
            sources[b]=owner.NoiseDisplaySource(frame,params,PixelFlags(flags,None,admission))
            if b=='i':
                for w in active:
                    if w.get('endpointField')!=key.replace('/','-'):continue
                    z=w['endpoint'];cols,rows=z['native_cols'],z['native_rows'];new=native_noise_samples(frame,params,cols,rows)
                    oracle=map_coordinates(frame.calibration_sky.allsky,[z['sky_y'],z['sky_x']],order=1,mode='nearest',prefilter=False)
                    np.testing.assert_array_equal(new.sky_counts.astype('f4'),oracle)
                    assert new.available.all() and np.isfinite(new.variance_nmgy_squared).all() and (new.variance_nmgy_squared>0).all()
                    assert np.array_equal(new.sky_geometry,z['sky_geometry']) and np.isnan(z['variance'][~z['sky_geometry']]).all()
                    calib=frame.calibration_sky.calibration[cols].astype('f8');data=frame.data[rows,cols].astype('f8')
                    expected=((data/calib+oracle.astype('f8'))/params.gain_electrons_per_count+params.dark_variance_counts_squared)*calib**2
                    np.testing.assert_array_equal(new.variance_nmgy_squared,expected)
                    packet=OUT/(w['name']+'-actual-endpoints.npz');np.savez_compressed(packet,native_cols=cols,native_rows=rows,sky=oracle,
                        variance=new.variance_nmgy_squared,available=new.available,constant_edge=new.sky_constant_edge,raw_sky_stencil=new.sky_geometry)
                    native_endpoint_checks.append({'name':w['name'],'fieldBand':w['endpointField']+'-i','nativeSamples':cols.size,
                        'oldUnavailableNativeSamples':int((~z['sky_geometry']).sum()),'newAvailableNativeSamples':int(new.available.sum()),
                        'scipyNearestAndOfficialVarianceExact':True,'version':new.sky_reconstruction_version,'saved':bind(packet)})
        for w in active:
            ww=weight[w['region']]
            # Counterfactual before policy is isolated to this Python task and
            # restored before the real production owner is evaluated.
            original=owner.native_noise_samples
            try:
                owner.native_noise_samples=previous.native_noise_samples
                before,bq=owner._project_field(sources,projected,ww,w['region'],w['ra'],w['dec'])
            finally:owner.native_noise_samples=original
            after,aq=owner._project_field(sources,projected,ww,w['region'],w['ra'],w['dec'])
            assert np.array_equal(before['ids'],after['ids']) and np.array_equal(before['weights'],after['weights'])
            both=np.isfinite(before['native_variance']);assert np.array_equal(before['native_variance'][both],after['native_variance'][both])
            w['beforeEligible']&=bq;w['afterEligible']&=aq;w['beforeStencils'].append({'variance':before['variance']});w['afterStencils'].append({'variance':after['variance']})
            w['fields'].append({'fieldKey':key,'activePixels':int((ww>0).sum()),'beforeQualified':int((bq&(ww>0)).sum()),'afterQualified':int((aq&(ww>0)).sum()),
                'nativeIdsWeightsAndPreviousFiniteVarianceExact':True})
        del sources,projected
    records=[]
    for w in work:
        before,bs=_display_support(w['values'],w['beforeEligible'],w['beforeStencils']);after,aps=_display_support(w['values'],w['afterEligible'],w['afterStencils'])
        assert not (before&~after).any();new=after&~before
        expected=next(v['withoutNativeReject'] for v in endpoint['records'] if v['name']==w['name']);assert int(new.sum())==expected
        file=OUT/(w['name']+'-actual-qualified.npz');np.savez_compressed(file,before_eligible=w['beforeEligible'],after_eligible=w['afterEligible'],
            before_qualified=before,after_qualified=after,newly_qualified=new,before_strong=bs,after_strong=aps,
            before_marginal=owner.conditional_variance_upper([s['variance'] for s in w['beforeStencils']]),after_marginal=owner.conditional_variance_upper([s['variance'] for s in w['afterStencils']]))
        records.append({'name':w['name'],'boundsXYExclusive':w['boundsXYExclusive'],'fields':w['fields'],'beforeQualified':int(before.sum()),'afterQualified':int(after.sum()),
            'newlyQualified':int(new.sum()),'previousQualifiedLost':0,'beforeStrong':int(bs.sum()),'afterStrong':int(aps.sum()),
            'stillUnknownOrProcessingRejected':int((~after).sum()),'actualScienceSourceSamplingAndIdsWeightsExact':True,'saved':bind(file)})
    before=list(pins.values());assert [bind(ROOT/v['path']) for v in before]==before
    report={'scope':__doc__,'oldCheckpointSourceChanges':changed,'inputsBefore':before,'inputsAfterExact':True,'nativeEndpointChecks':native_endpoint_checks,
        'records':records,'sourceNoiseVersion':SKY_RECONSTRUCTION_VERSION,'nativeFramesReadForChangedConsumer':frames_read,
        'elapsedSeconds':time.perf_counter()-started,'cpuSeconds':time.process_time()-cpu,'memory':resources.memory(),
        'newlyQualifiedTargetCells':sum(v['newlyQualified'] for v in records),'scienceEstimateOrCandidateChanges':False,
        'wholeVarianceFitsCoaddFilterOrRadiusSelectionRuns':0,'newAstronomicalSourceRequests':0,'ordinaryAdoption':False,
        'quality':'UNVERIFIED_QUALIFICATION_ONLY_NOT_NEW_DISPLAY_CANDIDATE','independentReview':'MISSING','otherBusinessLogicEdited':False}
    save(OUT/'result.json',report);print(json.dumps({k:v for k,v in report.items() if k not in ('inputsBefore','oldCheckpointSourceChanges','records')}),flush=True)
if __name__=='__main__':
    try:main()
    except Exception as e:
        if OUT.exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e)})
        raise
