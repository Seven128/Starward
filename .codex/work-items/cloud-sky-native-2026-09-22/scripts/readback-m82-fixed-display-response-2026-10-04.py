"""Read fixed recorded display response from original native data and saved cuts.

No producer/recovery/fixed-aperture/ImagePSF/sampler imports. Original native
variance helper is a separate FITS arithmetic path. No aperture re-selection.
"""
from pathlib import Path
import hashlib,importlib.util,json,math,sys,time
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/sdss-psf-tools-1003-r1/python-deps'),str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from astropy.io import fits
from astropy.wcs import WCS
from scipy.interpolate import RectBivariateSpline
from PIL import Image
spec=importlib.util.spec_from_file_location('original_variance_readback',TASK/'scripts/readback-m82-central-native-2026-10-04.py')
original=importlib.util.module_from_spec(spec);spec.loader.exec_module(original)
GEN=ROOT/'output/sdss-m82-fixed-display-response-1004-r1';OUT=ROOT/'output/sdss-m82-fixed-display-response-readback-1004-r2'

def bind(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda:f.read(1048576),b''):h.update(b)
    return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}

def save(p,v):
    with p.open('x',encoding='utf-8') as f:json.dump(v,f,indent=2,allow_nan=False);f.write('\n')

def main():
    started=time.perf_counter();assert not OUT.exists();OUT.mkdir();(OUT/'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    result_path=GEN/'result.json';assert bind(result_path)['sha256']=='8ed550a755c070628f77565e0bc61192e08742e17da167ecd066dd1a9c94c27f'
    result=json.loads(result_path.read_bytes());before=json.loads((GEN/'inputs-before.json').read_bytes())
    assert before==json.loads((GEN/'inputs-after.json').read_bytes())
    for item in before:assert bind(ROOT/item['path'])==item
    science_path=ROOT/'output/sdss-m82-first-science-master-1004-r2/candidate/candidate.json';science=json.loads(science_path.read_bytes())
    full_path=ROOT/'output/sdss-m82-recovered-complete-1004-r1/candidate/candidate.json';full=json.loads(full_path.read_bytes())
    rec_path=ROOT/'output/sdss-m82-current-adaptive-recovery-1004-r1/candidate/candidate.json';recovery=json.loads(rec_path.read_bytes())
    parent_path=ROOT/'output/sdss-m82-shared-adaptive-display-1004-r1/candidate/candidate.json';parent=json.loads(parent_path.read_bytes())
    def arrays(d,path):return {k:np.load(path.parent/v['file'],mmap_mode='r',allow_pickle=False) for k,v in d['arrays'].items()}
    science_arrays=arrays(science,science_path);current=arrays(full,full_path);rec_arrays=arrays(recovery,rec_path);parent_arrays=arrays(parent,parent_path)
    prior=json.loads((ROOT/'output/sdss-m82-target-response-1004-r1/result.json').read_bytes());assert len(prior['records'])==len(result['records'])==146
    masks=json.loads((ROOT/'output/sdss-m82-fpm-frame-intersection-1004-r1/result-r2.json').read_bytes())
    camera=json.loads((ROOT/'output/sdss-m82-quality-inputs-1004-r1/camera-noise-parameters.json').read_bytes())['parameters']
    quality=json.loads((ROOT/'output/sdss-m82-quality-inputs-1004-r1/result.json').read_bytes());frames={};psfs={};dates={}
    for field in science['mosaic']['fields']:
        key=field['fieldKey'];frames[key]={};ident={k:v for k,v in field['perBand']['g']['sourceReceipt']['identity'].items() if k!='band'}
        m=next(v for v in quality['sourceRecords'] if v['filename'].startswith('psField') and v['identity']==ident)
        with fits.open(ROOT/m['raw']['path'],memmap=False) as h:
            psfs[key]={b:[{name:np.array(t[name],copy=True) for name in ('nrow_b','ncol_b','c','rrows')} for t in h['ugriz'.index(b)+1].data] for b in 'gri'}
        for b in 'gri':
            receipt=field['perBand'][b]['sourceReceipt'];p=Path(receipt['source']['path']);assert bind(p)['sha256']==receipt['source']['sha256']
            with fits.open(p,memmap=False) as h:
                frame={'data':np.array(h[0].data),'calib':np.array(h[1].data),'sky':np.array(h[2].data['ALLSKY'][0]),
                    'sx':np.array(h[2].data['XINTERP'][0]),'sy':np.array(h[2].data['YINTERP'][0]),'wcs':WCS(h[0].header),'run':ident['run']}
            mask=next(v for v in masks['fpMInputs'] if v['identity']==receipt['identity'])
            with np.load(ROOT/mask['flags']['path'],allow_pickle=False) as z:frame['flags']=np.array(z['flags'])
            frame['noise']=next(v for v in camera if list(v['identity'])==[ident['run'],ident['rerun'],ident['camcol'],ident['field'],b])
            dates.setdefault(ident['run'],[]).append(receipt['asTrans']['row']['MJD']);frames[key][b]=frame
    dates={run:(min(v),max(v)) for run,v in dates.items()};assert {str(k):list(v) for k,v in dates.items()}==recovery['scanMjdRanges']
    n=science['pixels'];target=WCS(naxis=2);target.wcs.ctype=['RA---TAN','DEC--TAN'];target.wcs.cunit=['deg','deg'];target.wcs.radesys='ICRS'
    target.wcs.crval=[science['center']['raDeg'],science['center']['decDeg']];target.wcs.crpix=[(n+1)/2]*2
    step=math.degrees(2*math.tan(math.radians(science['fieldDegrees'])/2)/n);target.wcs.cdelt=[-step,step]
    facts=[];all_targets=unknown=changed=wrong_exclusion=extra_models=0;max_extra=0.;radii_counts={};source_supply=0
    for row in result['records']:
        assert bind(ROOT/row['arrays']['path'])==row['arrays'] and bind(ROOT/row['sampling']['path'])==row['sampling']
        with np.load(ROOT/row['arrays']['path'],allow_pickle=False) as z:a={k:z[k] for k in z.files}
        sampling=json.loads((ROOT/row['sampling']['path']).read_bytes());old_row=prior['records'][row['index']]
        with np.load(ROOT/old_row['saved']['path'],allow_pickle=False) as z:old={k:z[k] for k in z.files}
        x0,y0,x1,y1=row['supportBoundsXYExclusive'];yy,xx=np.mgrid[y0:y1,x0:x1]
        np.testing.assert_array_equal(xx,a['source_target_x']);np.testing.assert_array_equal(yy,a['source_target_y'])
        ra,dec=target.all_pix2world(xx,n-1-yy,0);shape=xx.shape
        field_samples={};raw_weights={};coords={};field_noise={};field_usable={};field_bad={}
        for key,group in frames.items():
            band_samples=[];joint=[];edge=[];info=[];bad=np.zeros(shape,bool)
            for b,frame in group.items():
                sx,sy=frame['wcs'].all_world2pix(ra,dec,0);rows,columns=frame['data'].shape
                geo=np.isfinite(sx)&np.isfinite(sy)&(sx>=0)&(sy>=0)&(sx<columns-1)&(sy<rows-1)
                nx=np.full(shape,-1,np.int64);ny=nx.copy();nx[geo]=np.floor(sx[geo]).astype(int);ny[geo]=np.floor(sy[geo]).astype(int)
                fx,fy=np.where(geo,sx-nx,0),np.where(geo,sy-ny,0)
                coefficients=np.stack([(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy])
                ids=np.stack([ny*columns+nx,ny*columns+nx+1,(ny+1)*columns+nx,(ny+1)*columns+nx+1])
                neighbors=np.stack([frame['data'][ny[geo],nx[geo]],frame['data'][ny[geo],nx[geo]+1],frame['data'][ny[geo]+1,nx[geo]],frame['data'][ny[geo]+1,nx[geo]+1]])
                finite=np.isfinite(neighbors).all(axis=0);available=geo.copy();available[geo]=finite
                values=np.full(shape,np.nan,np.float32);c=coefficients[:,geo][:,finite]
                vx,vy=fx[geo][finite],fy[geo][finite];f=neighbors[:,finite].astype(float)
                values[available]=(f[0]*(1-vx)*(1-vy)+f[1]*vx*(1-vy)+f[2]*(1-vx)*vy+f[3]*vx*vy).astype(np.float32)
                flags=np.zeros(shape,np.uint32)
                flags[geo]=frame['flags'][ny[geo],nx[geo]]|frame['flags'][ny[geo],nx[geo]+1]|frame['flags'][ny[geo]+1,nx[geo]]|frame['flags'][ny[geo]+1,nx[geo]+1]
                variance=np.full((4,*shape),np.nan);known=np.zeros(shape,bool)
                nx4=np.stack([nx[geo],nx[geo]+1,nx[geo],nx[geo]+1]);ny4=np.stack([ny[geo],ny[geo],ny[geo]+1,ny[geo]+1])
                v,k=original.original_variance(frame,nx4,ny4,frame['noise']);variance[:,geo]=v;known[geo]=k.all(axis=0)
                distance=np.minimum.reduce([sx,sy,columns-1-sx,rows-1-sy]);edge.append(np.where(available,np.maximum(distance,0),0).astype(np.float32));joint.append(available)
                band_samples.append(values);info.append((geo,available,coefficients,ids,variance,known,flags));coords[key,b]=(sx,sy)
            common=np.logical_and.reduce(joint);rw=np.where(common,np.minimum.reduce(edge)+1,0).astype(np.float32)
            raw_weights[key]=rw;field_samples[key]=np.stack(band_samples);field_noise[key]=info
        denominator=sum(v.astype(float) for v in raw_weights.values());available=denominator>0
        weights={key:np.divide(w,denominator,out=np.zeros(shape),where=available).astype(np.float32) for key,w in raw_weights.items()}
        numerator=np.zeros((3,*shape));original_eligible=available.copy();original_variances=[];observations={run:{'weight':np.zeros(shape),'known':np.ones(shape,bool),'bad':np.zeros(shape,bool),'numerator':np.zeros((3,*shape))} for run in dates}
        for key,w in weights.items():
            usable=np.ones(shape,bool);bad=np.zeros(shape,bool);variance=[]
            for geo,finite,c,ids,v,known,flags in field_noise[key]:
                usable&=(w==0)|(geo&finite&known&((flags&771)==0));bad|=(w>0)&geo&((flags&771)!=0)
                wc=c*w[None].astype(float)
                variance.append((wc**2*np.where((w>0)[None],v,0)).sum(axis=0))
            original_eligible&=usable;original_variances.append(np.stack(variance))
            contribution=np.where((w>0)[None],field_samples[key],0).astype(float)*w
            numerator+=contribution;run=frames[key]['g']['run'];o=observations[run];o['weight']+=w;o['known']&=usable;o['bad']|=bad;o['numerator']+=contribution
        # The original scientific source window accumulates unnormalised
        # geometric field weights, then divides once. The recorded f32
        # normalised coefficients describe its ideal sampling/noise operator
        # but substituting their weighted dot changes actual f32 rounding.
        # Recovery RUN numerators above do use the recorded normalised weights.
        science_numerator=np.zeros_like(numerator)
        for key,rw in raw_weights.items():
            science_numerator+=np.where((rw>0)[None],field_samples[key],0).astype(float)*rw
        raw_original=np.full_like(numerator,np.nan,dtype=np.float32)
        raw_original[:,available]=(science_numerator[:,available]/denominator[available]).astype(np.float32)
        marginal=np.sum(np.sqrt(np.stack(original_variances)),axis=0)**2
        q0=original_eligible&np.isfinite(marginal).all(axis=0)&(marginal>0).all(axis=0)
        chosen={};total=np.zeros(shape);alternate=np.zeros_like(numerator)
        for run,o in observations.items():
            other_bad=np.zeros(shape,bool)
            for other,z in observations.items():
                if other!=run and (dates[run][1]<dates[other][0] or dates[other][1]<dates[run][0]):other_bad|=z['bad']
            take=(~q0)&available&(o['weight']>0)&~o['bad']&other_bad&o['known']
            chosen[run]=take;total+=np.where(take,o['weight'],0);alternate+=np.where(take[None],o['numerator'],0)
        supply=total>0;raw=raw_original.copy();raw[:,supply]=(alternate[:,supply]/total[supply]).astype(np.float32)
        np.testing.assert_array_equal(supply,a['alternative_supply']);np.testing.assert_array_equal(raw,a['actual_raw_sampling'])
        source_supply+=int(supply.sum());effective={};eligible=available.copy();variances=[]
        for key,w in weights.items():
            run=frames[key]['g']['run'];ew=np.where(supply,np.divide(w,total,out=np.zeros(shape),where=chosen[run]&supply),w.astype(float))
            if not w.any():continue
            effective[key]=ew;p=key.replace('/','-');np.testing.assert_array_equal(ew,a[p+'-effective-weight']);vs=[]
            for at,(geo,finite,c,ids,v,known,flags) in enumerate(field_noise[key]):
                eligible&=(ew==0)|(geo&finite&known&((flags&771)==0))
                np.testing.assert_array_equal(ids,a[p+'-native-ids'][at]);coeff=np.where((ew>0)[None],c*ew[None],0)
                np.testing.assert_array_equal(coeff,a[p+'-native-coefficients'][at]);vs.append((coeff**2*np.where((ew>0)[None],v,0)).sum(axis=0))
            variances.append(np.stack(vs))
        marginal=np.sum(np.sqrt(np.stack(variances)),axis=0)**2;q=eligible&np.isfinite(marginal).all(axis=0)&(marginal>0).all(axis=0)
        with np.errstate(invalid='ignore',divide='ignore'):strong=q&(np.abs(raw)/np.sqrt(marginal)>=3).any(axis=0)
        np.testing.assert_array_equal(eligible,a['source_eligible']);np.testing.assert_array_equal(q,a['source_qualified']);np.testing.assert_array_equal(strong,a['source_strong'])
        inside=(xx>=0)&(xx<n)&(yy>=0)&(yy<n)
        np.testing.assert_array_equal(q[inside],current['qualified'][yy[inside],xx[inside]])
        np.testing.assert_array_equal(strong[inside],current['protected'][yy[inside],xx[inside]])
        np.testing.assert_array_equal(q0[inside],parent_arrays['qualified'][yy[inside],xx[inside]])
        np.testing.assert_array_equal(supply[inside],rec_arrays['alternative-supply'][yy[inside],xx[inside]])
        model_sum=np.zeros_like(numerator);model_known=(sum(effective.values())>0)[None].repeat(3,axis=0)
        ox0,oy0,ox1,oy1=old_row['targetBoundsXYExclusive'];old_mask=(xx>=ox0)&(xx<ox1)&(yy>=oy0)&(yy<oy1)
        for key,ew in effective.items():
            p=key.replace('/','-')
            for at,b in enumerate('gri'):
                prefix=p+'-'+b;model=np.full(shape,np.nan,np.float32);support=np.zeros(shape,bool)
                if prefix+'-response' in old:
                    model[old_mask]=old[prefix+'-response'][yy[old_mask]-oy0,xx[old_mask]-ox0];support[old_mask]=old[prefix+'-support'][yy[old_mask]-oy0,xx[old_mask]-ox0]
                extra=~old_mask&(ew>0)
                if extra.any():
                    np.testing.assert_array_equal(extra,a[prefix+'-extra-target-mask']);sx,sy=coords[key,b];np.testing.assert_array_equal(sx[extra],a[prefix+'-extra-sx']);np.testing.assert_array_equal(sy[extra],a[prefix+'-extra-sy'])
                    if prefix+'-extra-kernel' in a:
                        nx,ny=map(float,frames[key][b]['wcs'].all_world2pix(*row['anchorIcrs'],0));kernel=np.zeros((51,51))
                        for t in psfs[key][b]:
                            value=0.
                            for i in range(int(t['nrow_b'])):
                                for j in range(int(t['ncol_b'])):value+=float(t['c'][i,j])*((ny+.5)*.001)**i*((nx+.5)*.001)**j
                            kernel+=value*np.asarray(t['rrows'],float).reshape(51,51)
                        np.testing.assert_array_equal(kernel,a[prefix+'-extra-kernel']);normalized=kernel/kernel.sum()
                        ax,ay,bx,by=map(int,a[prefix+'-extra-native-bounds']);py,px=np.mgrid[ay:by,ax:bx];u,v=px-nx+25,py-ny+25;finite=(u>=0)&(u<=50)&(v>=0)&(v<=50)
                        spline=RectBivariateSpline(np.arange(51),np.arange(51),normalized,kx=3,ky=3,s=0);native=a[prefix+'-extra-native-model']
                        np.testing.assert_array_equal(np.isfinite(native),finite)
                        if finite.any():
                            delta=float(np.max(np.abs(native[finite]-spline.ev(v[finite],u[finite]))));assert delta<=16*np.finfo(float).eps*float(np.max(np.abs(normalized)));max_extra=max(max_extra,delta)
                        x,y=sx[extra]-ax,sy[extra]-ay;geo=np.isfinite(x)&np.isfinite(y)&(x>=0)&(y>=0)&(x<native.shape[1]-1)&(y<native.shape[0]-1)
                        xi,yi=np.floor(x[geo]).astype(int),np.floor(y[geo]).astype(int);four=np.stack([native[yi,xi],native[yi,xi+1],native[yi+1,xi],native[yi+1,xi+1]])
                        fin=np.isfinite(four).all(axis=0);ok=np.zeros(x.shape,bool);ok[geo]=fin;dx,dy=x[geo][fin]-xi[fin],y[geo][fin]-yi[fin];f=four[:,fin]
                        response=np.full(x.shape,np.nan,np.float32);response[ok]=(f[0]*(1-dx)*(1-dy)+f[1]*dx*(1-dy)+f[2]*(1-dx)*dy+f[3]*dx*dy).astype(np.float32)
                        model[extra]=response;support[extra]=ok;extra_models+=1
                np.testing.assert_array_equal(model,a[prefix+'-sampled-model']);np.testing.assert_array_equal(support,a[prefix+'-model-support'])
                model_known[at]&=~((ew>0)&~support);use=(ew>0)&support;model_sum[at,use]+=model[use].astype(float)*ew[use]
        unit=np.where(model_known,model_sum,np.nan);np.testing.assert_array_equal(unit,a['raw_unit_model']);np.testing.assert_array_equal(model_known,a['raw_unit_known'])
        offsets=[0];selected=[];actual=[];response=[];known=[];wrong=0
        for (y,x),radius in zip(a['targets_yx'],a['current_radius'],strict=True):
            y,x,radius=int(y),int(x),int(radius);distance=(np.arange(shape[0])[:,None]-y)**2+(np.arange(shape[1])[None,:]-x)**2
            circle=distance<=radius**2 if radius>0 else distance==0
            if radius>0:assert q[circle].all() and not strong[y,x];take=circle&~strong
            else:assert (radius==0)==bool(strong[y,x]);take=circle
            flat=np.flatnonzero(take);selected.extend(flat.tolist());offsets.append(len(selected));actual.append(raw[:,take].astype(float).mean(axis=1).astype(np.float32))
            k=model_known[:,take].all(axis=1);v=np.full(3,np.nan);v[k]=unit[:,take][k].mean(axis=1);response.append(v);known.append(k)
            if radius>0 and (circle&strong).any() and np.isfinite(unit[:,circle]).all():
                wrong+=int(np.any(unit[:,circle].mean(axis=1)!=v))
        actual=np.stack(actual,axis=1);response=np.stack(response,axis=1);known=np.stack(known,axis=1)
        np.testing.assert_array_equal(offsets,a['selected_offsets']);np.testing.assert_array_equal(selected,a['selected_sample_ids'])
        np.testing.assert_array_equal(actual,a['fixed_actual_estimates']);np.testing.assert_array_equal(response,a['fixed_unit_response']);np.testing.assert_array_equal(known,a['fixed_unit_known'])
        gy,gx=a['target_global_yx'].T
        for at,b in enumerate('gri'):np.testing.assert_array_equal(actual[at],current[b][gy,gx])
        unknown+=int((~known).sum());all_targets+=actual.shape[1];wrong_exclusion+=wrong
        for radius,count in zip(*np.unique(a['current_radius'],return_counts=True)):radii_counts[str(radius)]=radii_counts.get(str(radius),0)+int(count)
        finite=np.isfinite(a['target_saved_science_unit'])&known
        changed+=int(np.count_nonzero(response[finite]!=a['target_saved_science_unit'][finite]))
        facts.append({'index':row['index'],'currentCoreTargets':actual.shape[1],'unknownBandTargets':int((~known).sum()),'sourceSupplyPixels':int(supply.sum()),'wrongStrongExclusionTargets':wrong,'currentReadbackExact':True,'originalNativeCohortAndCoefficientsExact':True})
    for m in result['images']:
        p=ROOT/m['path'];assert bind(p)==m
        with Image.open(p) as im:im.load();assert im.mode=='RGB'
    for item in before:assert bind(ROOT/item['path'])==item
    assert all_targets==result['coreTargets'] and unknown==result['unknownUnitBandTargets'] and wrong_exclusion>0 and changed>0
    report={'scope':__doc__,'producerResult':bind(result_path),'records':facts,'actualLocations':len(facts),'currentCoreTargets':all_targets,'sourceInputPinsExact':len(before),
        'originalNativeFlagsVarianceCohortAndCoefficientsExact':True,'currentRawAndSourceMapsExact':True,'recordedRadiiAndSelectedStrongExclusionExact':True,'actualCurrentMeansExact':True,
        'insideScienceModelReuseExact':True,'extraOriginalKernelNativeSplineAndSamplerExact':True,'newOutsideModelsChecked':extra_models,'maximumExtraNativeSplineDifference':max_extra,
        'fixedUnitResponseExact':True,'unknownUnitBandTargets':unknown,'knownScienceToFixedBandDifferences':changed,'wrongIncludingStrongNeighbourTargets':wrong_exclusion,'radiusCounts':radii_counts,
        'overlappingWindowSourceSupplyOccurrences':source_supply,'elapsedSeconds':time.perf_counter()-started,'processPeak':'UNMEASURED',
        'sourceRequests':0,'thresholdOrRadiusSelectionOrWholeCoaddFilterRuns':0,'scienceOrDisplayCorrections':False,'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False,
        'meaning':'All actual saved local branch/cohort/sample selections and model arithmetic; f64 mathematical response with f32 sampled native model, before nonlinear RGB. Not finite-amplitude perturbation, quantization derivative/changing branches/global PSF or independent review.'}
    save(OUT/'result.json',report);print(json.dumps({k:v for k,v in report.items() if k!='records'}),flush=True)

if __name__=='__main__':
    try:main()
    except Exception as e:
        if OUT.exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e),'sourceOrOutputChanges':False})
        raise
