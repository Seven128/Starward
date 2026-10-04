"""Actual recorded M82 recovery/cohort/aperture response before nonlinear RGB.

Existing source owner supplies bounded raw/native coefficient windows. Saved
science responses are reused, with only necessary outside-crop model samples
added. No threshold/radius selection, detection/fit/whole-coadd/filter replay.
"""
from pathlib import Path
import importlib.util,json,sys,time
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/sdss-psf-tools-1003-r1/python-deps'),str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image,ImageDraw
from sdss_display_recovery import OtherScanDisplay,project_current_recovery_halo_region
from sdss_adaptive_display import _display_support
from sdss_frame_quality import read_cached_psfield

def module(name,file):
    spec=importlib.util.spec_from_file_location(name,TASK/'scripts'/file)
    m=importlib.util.module_from_spec(spec);sys.modules[name]=m;spec.loader.exec_module(m);return m
loader=module('fixed_m82_loader','experience-m82-current-adaptive-recovery-2026-10-04.py')
native=module('fixed_native_unit','sdss-native-unit-response-2026-10-04.py')
fixed=module('fixed_recorded_display','sdss-fixed-recorded-display-response-2026-10-04.py')
bind,save=loader.bind,loader.save
PRIOR=ROOT/'output/sdss-m82-target-response-1004-r1';OUT=ROOT/'output/sdss-m82-fixed-display-response-1004-r1'

class FrozenKernel:
    def __init__(self,kernel):self.kernel=kernel
    def reconstruct(self,*args):return self.kernel

def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    started,cpu=time.perf_counter(),time.process_time();pins={}
    def pin(path,expected=None):
        actual=bind(path)
        if expected is not None:assert actual==expected,(path,actual,expected)
        assert pins.setdefault(actual['path'],actual)==actual;return actual
    cp_path=TASK/'evidence/current-execution-state-2026-10-04-r88.json';pin(cp_path)
    cp=json.loads(cp_path.read_bytes())
    for item in cp['currentSources']+cp['protected']+cp['evidence']:assert bind(ROOT/item['path'])==item
    pin(ROOT/'output/sdss-m82-target-response-readback-1004-r1/checkpoint-continuity.json')
    for path in (Path(__file__),Path(loader.__file__),Path(loader.previous.__file__),Path(native.__file__),Path(fixed.__file__)):
        pin(path)
    for name in ('sdss_display_recovery.py','sdss_adaptive_display.py','sdss_noise_display.py','sdss_gri_tan.py','sdss_frame_noise.py','sdss_source_stencil.py','sdss_frame_quality.py','sdss_corrected_frame.py'):
        pin(ROOT/'data-pipelines/deep-sky'/name)
    path=loader.DISPLAY/'result.json';pin(path);master,parent,sources=loader.load_saved_inputs(json.loads(path.read_bytes()),pin)
    def candidate(path):
        pin(path);d=json.loads(path.read_bytes());a={}
        for key,meta in d['arrays'].items():
            p=path.parent/meta['file'];actual=pin(p);assert (actual['bytes'],actual['sha256'])==(meta['bytes'],meta['sha256'])
            a[key]=np.load(p,mmap_mode='r',allow_pickle=False);assert list(a[key].shape)==meta['shape']
        for meta in d['levels'].values():assert pin(path.parent/meta['file'])['sha256']==meta['sha256']
        return d,a
    full,arrays=candidate(ROOT/'output/sdss-m82-recovered-complete-1004-r1/candidate/candidate.json')
    rec,rarrays=candidate(ROOT/'output/sdss-m82-current-adaptive-recovery-1004-r1/candidate/candidate.json')
    recovery=OtherScanDisplay({b:rarrays[b] for b in 'gri'},rarrays['alternative-supply'],rec)
    prior_path=PRIOR/'result.json';pin(prior_path);prior=json.loads(prior_path.read_bytes())
    assert len(prior['records'])==146
    for row in prior['records']:pin(ROOT/row['saved']['path'],row['saved'])
    quality_path=ROOT/'output/sdss-m82-quality-inputs-1004-r1/result.json';pin(quality_path)
    quality=json.loads(quality_path.read_bytes());psfields={}
    for key,group in sources.items():
        ident={k:v for k,v in group['g'].frame.receipt['identity'].items() if k!='band'}
        m=next(v for v in quality['sourceRecords'] if v['filename'].startswith('psField') and v['identity']==ident)
        p=ROOT/m['raw']['path'];pin(p,m['raw']);psfields[key]=read_cached_psfield(p,ident|{'sourceUrl':m['url'],'bytes':m['bytes'],'sha256':m['sha256']},max_uncompressed_bytes=16*1024*1024)
    before=list(pins.values());save(OUT/'inputs-before.json',before)
    # A real centre/overlap/edge path first, followed by all remaining actual
    # material. Each completed stage is retained with a unique journal.
    order=[134,141,142]+[i for i in range(146) if i not in (134,141,142)]
    records=[];n=master.joint_available.shape[0];extra_count=0
    for ordinal,index in enumerate(order):
        row=prior['records'][index];cx,cy=row['anchorTargetXY'];ix,iy=int(round(cx)),int(round(cy))
        tx0,ty0,tx1,ty1=max(0,ix-12),max(0,iy-12),min(n,ix+13),min(n,iy+13)
        x0,y0,x1,y1=tx0-8,ty0-8,tx1+8,ty1+8;region=np.s_[y0:y1,x0:x1]
        sample_started=time.perf_counter()
        samples=project_current_recovery_halo_region(master,parent,recovery,sources,region)
        sample_seconds=time.perf_counter()-sample_started
        q,strong=_display_support(samples.values,samples.eligible,list(samples.stencils.values()))
        inside=np.s_[max(0,y0):min(n,y1),max(0,x0):min(n,x1)]
        overlap=np.s_[max(0,y0)-y0:min(n,y1)-y0,max(0,x0)-x0:min(n,x1)-x0]
        np.testing.assert_array_equal(q[overlap],arrays['qualified'][inside]);np.testing.assert_array_equal(strong[overlap],arrays['protected'][inside])
        yy,xx=np.mgrid[y0:y1,x0:x1];ra,dec=master.target.all_pix2world(xx,n-1-yy,0);anchor=row['anchorIcrs']
        with np.load(ROOT/row['saved']['path'],allow_pickle=False) as z:old={k:z[k] for k in z.files}
        ox0,oy0,ox1,oy1=row['targetBoundsXYExclusive'];old_region=np.s_[max(y0,oy0):min(y1,oy1),max(x0,ox0):min(x1,ox1)]
        local=np.s_[old_region[0].start-y0:old_region[0].stop-y0,old_region[1].start-x0:old_region[1].stop-x0]
        old_local=np.s_[old_region[0].start-oy0:old_region[0].stop-oy0,old_region[1].start-ox0:old_region[1].stop-ox0]
        old_mask=np.zeros(xx.shape,bool);old_mask[local]=True
        packet={'source_target_x':xx,'source_target_y':yy,'actual_raw_sampling':samples.values,'source_eligible':samples.eligible,
            'source_qualified':q,'source_strong':strong,'alternative_supply':samples.alternative_supply}
        numerator=np.zeros((3,*xx.shape),float);raw_known=np.ones(numerator.shape,bool);total_weight=np.zeros(xx.shape,float)
        model_fields=[]
        for key,w in samples.normalized_weights.items():
            p=key.replace('/','-');total_weight+=w;packet[p+'-effective-weight']=w
            packet[p+'-native-ids']=samples.stencils[key]['ids'];packet[p+'-native-coefficients']=samples.stencils[key]['weights']
            meta={'fieldKey':key,'bands':{}}
            for b_at,b in enumerate('gri'):
                prefix=p+'-'+b;response=np.full(xx.shape,np.nan,np.float32);support=np.zeros(xx.shape,bool)
                if prefix+'-response' in old:
                    response[local]=old[prefix+'-response'][old_local];support[local]=old[prefix+'-support'][old_local]
                else:assert not (w[old_mask]>0).any()
                extra=(~old_mask)&(w>0)
                new_model=None
                if extra.any():
                    source=sources[key][b];sx,sy=source.frame.wcs.all_world2pix(ra[extra],dec[extra],0)
                    kernel_source=FrozenKernel(old[prefix+'-kernel']) if prefix+'-kernel' in old else psfields[key]
                    new_model=native.native_unit_response(kernel_source,b,source.frame.wcs,source.frame.data.shape,anchor,sx,sy)
                    response[extra]=new_model.response;support[extra]=new_model.support;extra_count+=int(extra.sum())
                    packet[prefix+'-extra-target-mask']=extra;packet[prefix+'-extra-sx']=sx;packet[prefix+'-extra-sy']=sy
                    if new_model.kernel is not None:
                        packet[prefix+'-extra-kernel']=new_model.kernel;packet[prefix+'-extra-native-model']=new_model.native_model
                        packet[prefix+'-extra-native-bounds']=np.asarray(new_model.native_bounds)
                packet[prefix+'-sampled-model']=response;packet[prefix+'-model-support']=support
                positive=w>0;raw_known[b_at]&=~(positive&~support);use=positive&support
                numerator[b_at,use]+=response[use].astype(float)*w[use]
                meta['bands'][b]={'insideSavedResponseReused':True,'newOutsidePositiveSamples':int(extra.sum()),
                    'extraHasModel':new_model is not None and new_model.kernel is not None,
                    'extraAnchorNativeXY':list(new_model.anchor_xy) if new_model is not None else None}
            model_fields.append(meta)
        raw_known &= (total_weight>0)[None];raw_model=np.where(raw_known,numerator,np.nan)
        packet['raw_unit_model']=raw_model;packet['raw_unit_known']=raw_known
        # Away from recovered supply, this is the saved linear science model,
        # apart from its final f32 coadd rounding, checked by exact cast.
        nonsupply=~samples.alternative_supply[local]
        for at,b in enumerate('gri'):
            current_model=raw_model[at][local];science_model=old['coadd-'+b][old_local]
            np.testing.assert_array_equal(current_model.astype(np.float32)[nonsupply],science_model[nonsupply])
        gy,gx=np.mgrid[ty0:ty1,tx0:tx1];core=(gx-cx)**2+(gy-cy)**2<=12**2
        ys,xs=gy[core]-y0,gx[core]-x0;targets=np.stack([ys,xs],axis=1)
        target_radii=np.asarray(arrays['radius'][gy[core],gx[core]])
        projection=fixed.fixed_recorded_response(samples.values,raw_model,raw_known,q,strong,targets,target_radii)
        actual=np.stack([arrays[b][gy[core],gx[core]] for b in 'gri'])
        np.testing.assert_array_equal(projection.actual_estimates,actual)
        for name in ('qualified','protected','radius','reached','affected'):
            packet['current_'+name]=np.asarray(arrays[name][gy[core],gx[core]])
        packet.update(targets_yx=targets,target_global_yx=np.stack([gy[core],gx[core]],axis=1),
            fixed_actual_estimates=projection.actual_estimates,fixed_unit_response=projection.response,fixed_unit_known=projection.known,
            selected_offsets=projection.offsets,selected_sample_ids=projection.selected_sample_ids)
        packet['target_science']=np.stack([master.bands[b].data[gy[core],gx[core]] for b in 'gri'])
        packet['target_saved_science_unit']=np.stack([old['coadd-'+b][gy[core]-oy0,gx[core]-ox0] for b in 'gri'])
        path=OUT/f'fixed-response-{index:03}.npz';np.savez_compressed(path,**packet)
        sampling_path=OUT/f'sampling-{index:03}.json';save(sampling_path,samples.report)
        radii,counts=np.unique(target_radii,return_counts=True)
        previous=packet['target_saved_science_unit'].astype(float);joint=np.isfinite(previous)&projection.known
        delta=np.zeros_like(previous);delta[joint]=projection.response[joint]-previous[joint]
        record={'index':index,'material':row['material'],'anchorTargetXY':[cx,cy],'anchorIcrs':row['anchorIcrs'],
            'supportBoundsXYExclusive':[x0,y0,x1,y1],'targetBoundsXYExclusive':[tx0,ty0,tx1,ty1],
            'coreTargets':len(targets),'savedRadiiCounts':dict(zip(map(str,radii.tolist()),counts.tolist())),
            'currentRawOrApertureReadbackExact':True,'sourceMapsExact':True,'sampling':bind(sampling_path),'arrays':bind(path),'modelFields':model_fields,
            'rawAlternativeSourcePixels':int(samples.alternative_supply.sum()),'unknownUnitBandTargets':int((~projection.known).sum()),
            'knownScienceAndFixedBandTargets':int(joint.sum()),'nonzeroScienceToFixedBandDifferences':int(np.count_nonzero(delta)),
            'maximumScienceToFixedDifference':float(np.max(np.abs(delta))),'newOutsidePositiveBandSamples':sum(v['bands'][b]['newOutsidePositiveSamples'] for v in model_fields for b in 'gri'),
            'sourceWindowSeconds':sample_seconds,'retainedEffectiveStencilArrayBytes':samples.report['retainedEffectiveStencilArrayBytes']}
        records.append(record);save(OUT/f'progress-{ordinal:03}.json',{'completed':ordinal+1,'record':record,'secondsSinceStart':time.perf_counter()-started,'memory':loader.memory()})
        if ordinal<3 or ordinal%16==15:print(json.dumps({'completed':ordinal+1,'index':index,'currentReadbackExact':True,'unknownBandTargets':record['unknownUnitBandTargets'],'sourceWindowSeconds':sample_seconds,'secondsSinceStart':time.perf_counter()-started}),flush=True)
        del samples,packet,old,projection,raw_model,numerator,raw_known
    records.sort(key=lambda r:r['index']);images=[]
    for start in range(0,len(records),12):
        panel=Image.new('RGB',(738,120*min(12,len(records)-start)),'#181818');draw=ImageDraw.Draw(panel)
        for row_at,record in enumerate(records[start:start+12]):
            with np.load(ROOT/record['arrays']['path'],allow_pickle=False) as z:a={k:z[k] for k in ('target_global_yx','target_science','fixed_actual_estimates','target_saved_science_unit','fixed_unit_response')}
            x0,y0,x1,y1=record['targetBoundsXYExclusive'];y,x=a['target_global_yx'].T;y=y-y0;x=x-x0
            draw.text((2,row_at*120),f'{record["index"]} {record["material"]["id"]}: actual sci/current | sci unit/fixed unit/delta r',fill='white')
            values=[a['target_science'][1],a['fixed_actual_estimates'][1],a['target_saved_science_unit'][1],a['fixed_unit_response'][1],a['fixed_unit_response'][1]-a['target_saved_science_unit'][1]]
            for col,values_at in enumerate(values):
                plane=np.full((y1-y0,x1-x0),np.nan);plane[y,x]=values_at
                finite=plane[np.isfinite(plane)];lo,hi=np.percentile(finite,[2,99.5]) if len(finite) else (0,1)
                gray=np.nan_to_num(np.clip((plane-lo)/max(hi-lo,1e-15),0,1),nan=0)
                panel.paste(Image.fromarray(np.rint(gray*255).astype(np.uint8)).resize((98,98),Image.Resampling.NEAREST),(col*146,row_at*120+20))
        path=OUT/f'actual-and-fixed-responses-{start//12+1}.png';panel.save(path);images.append(bind(path))
    after=[bind(ROOT/v['path']) for v in before];assert before==after;save(OUT/'inputs-after.json',after)
    for item in cp['currentSources']+cp['protected']+cp['evidence']:assert bind(ROOT/item['path'])==item
    report={'version':'sdss-m82-fixed-recorded-display-unit-response-v1','scope':__doc__,'checkpoint':pin(cp_path),'priorScienceResponses':pin(prior_path),
        'records':records,'images':images,'actualLocations':len(records),'coreTargets':sum(v['coreTargets'] for v in records),
        'unknownUnitBandTargets':sum(v['unknownUnitBandTargets'] for v in records),'boundedNativeCoefficientWindows':len(records),
        'newOutsidePositiveBandModelSamples':extra_count,'insideSavedScienceResponsesReused':True,'actualCurrentEstimatesAndSourceMapsExact':True,
        'elapsedSeconds':time.perf_counter()-started,'cpuSeconds':time.process_time()-cpu,'memory':loader.memory(),
        'maximumRetainedEffectiveStencilArrayBytes':max(v['retainedEffectiveStencilArrayBytes'] for v in records),
        'sourceRequests':0,'catalogQueries':0,'detectorOrFitOrWholeVarianceReplays':0,'thresholdOrRadiusSelectionRuns':0,'wholeFilterCoaddRuns':0,
        'productionChanges':[],'scienceOrDisplayCorrections':False,'oldSourcesExact':len(cp['currentSources']),'oldEvidenceExact':len(cp['evidence']),'protectedExact':len(cp['protected']),
        'meaning':'Recorded real source cohort/weights, qualification, strong exclusion and actual radius branches. f32 native sampled model with f64 effective coefficient and aperture response before nonlinear RGB; final f32 stage/threshold/variance/masks are not perturbed. Conditional mathematical unit response, not derivative through quantization or changing branches.',
        'limits':['Not nonlinear adaptive/global effective PSF or matching kernel. Actual current values read back separately with original f32 raw/mean operations.','Finite model/domain unknown remains unknown; existing source/native/cohort maps are not changed to fit a model.','Models share upstream PSF/WCS and candidate positions; not independent empirical truth or certified stellar profiles.','Current background/stripe/weak-structure/coverage/full3LOD quality and original failure/phone/publication/rights/capacity/review obligations remain open.','Each figure panel independently stretched, not flux/contrast/quality comparison.'],
        'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    save(OUT/'result.json',report);print(json.dumps({k:report[k] for k in ('actualLocations','coreTargets','unknownUnitBandTargets','elapsedSeconds','cpuSeconds','memory')}|{'result':bind(OUT/'result.json')}),flush=True)

if __name__=='__main__':
    try:main()
    except Exception as e:
        if OUT.exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e),'sourceOrOutputCorrections':False})
        raise
