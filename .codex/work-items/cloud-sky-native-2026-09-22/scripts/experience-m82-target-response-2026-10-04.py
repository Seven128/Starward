"""M82 actual saved material and geometry: native unit PSF to science coadd.

All20 retained qualified catalog detections and all114 provisional central
triplets, plus declared centre/overlap/coverage geometry controls. No new
detector, variance, fit, source query, coadd/filter, image correction or adoption.
"""
from pathlib import Path
import importlib.util, json, os, sys, time
ROOT=Path(__file__).resolve().parents[4]; TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/sdss-psf-tools-1003-r1/python-deps'),str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image, ImageDraw
from sdss_source_stencil import source_pixel_stencil
from sdss_frame_quality import read_cached_psfield

def module(name,file):
    spec=importlib.util.spec_from_file_location(name,TASK/'scripts'/file)
    m=importlib.util.module_from_spec(spec);sys.modules[name]=m;spec.loader.exec_module(m);return m
loader=module('m82_saved','experience-m82-current-adaptive-recovery-2026-10-04.py')
shared=module('native_unit','sdss-native-unit-response-2026-10-04.py')
bind,save=loader.bind,loader.save
OUT=ROOT/'output/sdss-m82-target-response-1004-r1'
BANDS='gri'

def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    started,cpu=time.perf_counter(),time.process_time();pins={}
    def pin(path,expected=None):
        actual=bind(path)
        if expected is not None:assert actual==expected,(path,actual,expected)
        assert pins.setdefault(actual['path'],actual)==actual
        return actual
    cp_path=TASK/'evidence/current-execution-state-2026-10-04-r87.json';pin(cp_path)
    cp=json.loads(cp_path.read_bytes())
    for item in cp['currentSources']+cp['protected']+cp['evidence']:assert bind(ROOT/item['path'])==item
    pin(ROOT/'output/sdss-m82-central-native-readback-1004-r2/checkpoint-continuity.json')
    for path in (Path(__file__),Path(shared.__file__),Path(loader.__file__),Path(loader.previous.__file__)):
        pin(path)
    for name in ('sdss_gri_tan.py','sdss_source_stencil.py','sdss_corrected_frame.py','sdss_frame_quality.py'):
        pin(ROOT/'data-pipelines/deep-sky'/name)
    result_path=ROOT/'output/sdss-m82-shared-adaptive-display-1004-r1/result.json';pin(result_path)
    master,_,sources=loader.load_saved_inputs(json.loads(result_path.read_bytes()),pin)
    current_path=ROOT/'output/sdss-m82-recovered-complete-1004-r1/candidate/candidate.json';pin(current_path)
    current=json.loads(current_path.read_bytes());display={}
    for key,meta in current['arrays'].items():
        path=current_path.parent/meta['file'];actual=pin(path)
        assert (actual['bytes'],actual['sha256'])==(meta['bytes'],meta['sha256'])
        display[key]=np.load(path,mmap_mode='r',allow_pickle=False)
    for meta in current['levels'].values():
        path=current_path.parent/meta['file'];assert pin(path)['sha256']==meta['sha256']
    catalog_path=ROOT/'output/sdss-m82-measured-stars-1004-r4/result.json';pin(catalog_path)
    central_path=ROOT/'output/sdss-m82-central-native-1004-r2/result.json';pin(central_path)
    catalog,central=json.loads(catalog_path.read_bytes()),json.loads(central_path.read_bytes())
    points=[{'kind':'QUALIFIED_CATALOG_DETECTION_NOT_ABSOLUTE_TRUTH','id':r['objID'],'targetXY':r['targetXY'],'sourceField':r['fieldKey']} for r in catalog['records'] if not r['imageQualification']]
    assert len(points)==20
    points += [{'kind':'PROVISIONAL_CENTRAL_IMAGE_CANDIDATE_NOT_CERTIFIED_STAR','id':r['bands']['r']['candidateId'],
        'targetXY':r['bands']['r']['targetXY'],'sourceField':r['fieldKey']} for r in central['triplets']]
    assert len(central['triplets'])==114
    n=master.joint_available.shape[0]
    points.append({'kind':'DECLARED_GEOMETRY_NOT_DETECTED_SOURCE','id':'object-centre','targetXY':[(n-1)/2]*2})
    # Positive-to-zero field boundaries are real saved contributor transitions.
    # One nearest-centre witness per field, without claiming a detected star.
    yy,xx=np.mgrid[:n,:n];distance=(xx-(n-1)/2)**2+(yy-(n-1)/2)**2
    count=np.zeros((n,n),np.uint8)
    for key,w in master.mosaic_weights.items():
        positive=w>0;count+=positive
        edge=np.zeros((n,n),bool)
        edge[:,1:] |= positive[:,1:] & ~positive[:,:-1]
        edge[:,:-1] |= positive[:,:-1] & ~positive[:,1:]
        edge[1:,:] |= positive[1:,:] & ~positive[:-1,:]
        edge[:-1,:] |= positive[:-1,:] & ~positive[1:,:]
        if edge.any():
            index=int(np.argmin(np.where(edge,distance,np.inf)));y,x=divmod(index,n)
            points.append({'kind':'DECLARED_GEOMETRY_NOT_DETECTED_SOURCE','id':'field-coverage-transition-'+key,'targetXY':[x,y],'sourceField':key})
    maximal=count==count.max();index=int(np.argmin(np.where(maximal,distance,np.inf)));y,x=divmod(index,n)
    points.append({'kind':'DECLARED_GEOMETRY_NOT_DETECTED_SOURCE','id':'maximal-common-field-overlap','targetXY':[x,y]})
    for x,y in ((0,0),(n-1,0),(0,n-1),(n-1,n-1)):
        points.append({'kind':'DECLARED_GEOMETRY_NOT_DETECTED_SOURCE','id':f'target-corner-{x}-{y}','targetXY':[x,y]})
    del xx,yy,distance,count,maximal
    quality_path=ROOT/'output/sdss-m82-quality-inputs-1004-r1/result.json';pin(quality_path)
    quality=json.loads(quality_path.read_bytes());psfields={}
    for key,group in sources.items():
        ident={k:v for k,v in group['g'].frame.receipt['identity'].items() if k!='band'}
        meta=next(v for v in quality['sourceRecords'] if v['filename'].startswith('psField') and v['identity']==ident)
        path=ROOT/meta['raw']['path'];pin(path,meta['raw'])
        psfields[key]=read_cached_psfield(path,ident|{'sourceUrl':meta['url'],'bytes':meta['bytes'],'sha256':meta['sha256']},max_uncompressed_bytes=16*1024*1024)
    before=list(pins.values());save(OUT/'inputs-before.json',before);save(OUT/'locations.json',points)
    records=[];images=[]
    for index,point in enumerate(points):
        cx,cy=point['targetXY'];ix,iy=int(round(cx)),int(round(cy))
        x0,y0,x1,y1=max(0,ix-20),max(0,iy-20),min(n,ix+21),min(n,iy+21)
        yy,xx=np.mgrid[y0:y1,x0:x1];crop=np.s_[y0:y1,x0:x1]
        ra,dec=master.target.all_pix2world(xx,n-1-yy,0);anchor=master.target.all_pix2world(cx,n-1-cy,0)
        arrays={'target_x':xx,'target_y':yy,'science_available':np.asarray(master.joint_available[crop])}
        for b in BANDS:
            arrays['original_science_'+b]=np.asarray(master.bands[b].data[crop]);arrays['current_display_'+b]=np.asarray(display[b][crop])
        for name in ('qualified','radius','reached','protected','affected'):
            arrays['current_'+name]=np.asarray(display[name][crop])
        summed={b:np.zeros(xx.shape,float) for b in BANDS}
        known={b:np.asarray(master.joint_available[crop]).copy() for b in BANDS}
        contributors=[];raw=[];weight_sum=np.zeros(xx.shape,float)
        for key,group in sources.items():
            w=np.asarray(master.mosaic_weights[key][crop]);weight_sum+=w
            coordinates={};edges=[];joint=[]
            for b,source in group.items():
                sx,sy=source.frame.wcs.all_world2pix(ra,dec,0);shape=source.frame.data.shape
                stencil=source_pixel_stencil(shape,sx,sy);actual=master.mosaic_fields[key][b]
                assert np.array_equal(stencil.geometry,np.asarray(actual.footprint[crop]))
                available=np.asarray(actual.footprint[crop])&np.asarray(actual.finite_neighbors[crop]);joint.append(available)
                edge=np.minimum.reduce([sx,sy,shape[1]-1-sx,shape[0]-1-sy])
                edges.append(np.where(available,np.maximum(edge,0),0).astype(np.float32));coordinates[b]=(sx,sy)
            rw=np.where(np.logical_and.reduce(joint),np.minimum.reduce(edges)+1,0).astype(np.float32);raw.append((key,rw))
            if not (w>0).any():continue
            prefix=key.replace('/','-');arrays[prefix+'-weight']=w
            contributor={'fieldKey':key,'run':group['g'].frame.receipt['identity']['run'],'bands':{}}
            for b,source in group.items():
                sx,sy=coordinates[b];value=shared.native_unit_response(psfields[key],b,source.frame.wcs,source.frame.data.shape,anchor,sx,sy)
                p=prefix+'-'+b;arrays[p+'-response']=value.response;arrays[p+'-support']=value.support;arrays[p+'-sx']=sx;arrays[p+'-sy']=sy
                if value.kernel is not None:
                    arrays[p+'-kernel']=value.kernel;arrays[p+'-native-model']=value.native_model;arrays[p+'-native-bounds']=np.asarray(value.native_bounds)
                bad=(w>0)&~value.support;known[b]&=~bad;use=(w>0)&value.support
                summed[b][use]+=value.response[use].astype(float)*w[use]
                contributor['bands'][b]={'anchorNativeXY':list(value.anchor_xy),'anchorInsideNative':value.anchor_inside,
                    'nativeShapeRowsColumns':list(source.frame.data.shape),'hasModel':value.kernel is not None,'modelUnsupportedPositiveWeightPixels':int(bad.sum()),
                    'finiteKernelSum':float(value.kernel.sum()) if value.kernel is not None else None}
            contributors.append(contributor)
        denom=sum(v.astype(float) for _,v in raw);available=master.joint_available[crop]
        for key,rw in raw:
            expected=np.zeros(xx.shape,np.float32);expected[available]=(rw[available]/denom[available]).astype(np.float32)
            assert np.array_equal(expected,master.mosaic_weights[key][crop])
        assert np.allclose(weight_sum[available],1,rtol=0,atol=9e-8)
        summaries={}
        for b in BANDS:
            response=np.where(known[b],summed[b],np.nan).astype(np.float32)
            arrays['coadd-'+b]=response;arrays['known-'+b]=known[b]
            summaries[b]={'knownPixels':int(known[b].sum()),'unknownPixels':int((~known[b]).sum()),
                'patchSum':float(np.nansum(response)),'peak':float(np.nanmax(response)) if known[b].any() else None,'negativePixels':int((response<0).sum())}
        path=OUT/f'response-{index:03}.npz';np.savez_compressed(path,**arrays)
        records.append({'index':index,'material':point,'anchorTargetXY':[cx,cy],'anchorIcrs':list(map(float,anchor)),
            'targetBoundsXYExclusive':[x0,y0,x1,y1],'contributors':contributors,'distinctRuns':sorted({v['run'] for v in contributors}),'summary':summaries,'saved':bind(path)})
        if index%12==0:
            panel=Image.new('RGB',(738,120*min(12,len(points)-index)),'#181818');draw=ImageDraw.Draw(panel)
        row=index%12;draw.text((2,row*120),f'{index} {point["id"]}: science r / current r / unit g-r-i',fill='white')
        for col,a in enumerate([arrays['original_science_r'],arrays['current_display_r']]+[arrays['coadd-'+b] for b in BANDS]):
            finite=a[np.isfinite(a)];lo,hi=np.percentile(finite,[2,99.5]) if len(finite) else (0,1)
            gray=np.nan_to_num(np.clip((a-lo)/max(hi-lo,1e-15),0,1),nan=0)
            panel.paste(Image.fromarray(np.rint(gray*255).astype(np.uint8)).resize((98,98),Image.Resampling.NEAREST),(col*146,row*120+20))
        if index%12==11 or index==len(points)-1:
            path=OUT/f'actual-science-current-unit-response-{index//12+1}.png';panel.save(path);images.append(bind(path))
    after=[bind(ROOT/v['path']) for v in before];assert after==before;save(OUT/'inputs-after.json',after)
    for item in cp['currentSources']+cp['protected']+cp['evidence']:assert bind(ROOT/item['path'])==item
    report={'version':'sdss-m82-native-to-science-unit-response-diagnostic-v1','scope':__doc__,'checkpoint':pin(cp_path),
        'records':records,'images':images,'actualLocations':len(records),'qualifiedCatalogPositions':20,'provisionalCentralPositions':114,
        'geometricControls':len(points)-134,'elapsedSeconds':time.perf_counter()-started,'cpuSeconds':time.process_time()-cpu,'memory':loader.previous.resources.memory() if hasattr(loader.previous,'resources') else loader.memory(),
        'normalizedActualWeightsExact':True,'oldSourcesExact':len(cp['currentSources']),'oldEvidenceExact':len(cp['evidence']),'protectedExact':len(cp['protected']),
        'sourceRequests':0,'catalogQueries':0,'detectionsVarianceFitsReplays':0,'wholeFilterCoaddRuns':0,'scienceOrDisplayCorrections':False,'productionChanges':[],
        'meaning':'One common sky anchor; spatial signed PSF normalized only for relative unit native model; actual integer native sampling/all-four-neighbor f32 science bilinear/common-gri geometric weights. Finite model domain and missing positive contributors remain unknown; no zero fill.',
        'limits':['Science operator only, not conditional display response yet or nonlinear adaptive global PSF.','Native kernel signed relative model and target patch sum not calibrated flux or flux-conserving interpolation.','Primary WCS and upstream PSF are not independent astrometric truth; physical duplicate exposures/noise/systematic uncertainties remain.','Geometric controls are declared positions, not observed stars;114 provisional blends/bounds/extended residuals and3 nonpositive profiles retain prior status.','Figures normalize each panel separately, not flux/quality comparisons; current background/stripes/weak structure and complete3LOD quality remain failed/unverified.'],
        'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    save(OUT/'result.json',report)
    print(json.dumps({k:report[k] for k in ('actualLocations','geometricControls','elapsedSeconds','cpuSeconds','memory')}|{'result':bind(OUT/'result.json')}),flush=True)

if __name__=='__main__':
    try:main()
    except Exception as e:
        if OUT.exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e),'scienceOrDisplayChanges':False})
        raise
