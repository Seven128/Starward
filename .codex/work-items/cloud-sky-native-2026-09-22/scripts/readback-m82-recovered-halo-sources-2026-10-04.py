"""Direct original-native geometry/cohort/noise and saved real-halo readback.

Verification arithmetic only, no producer projection/filter/candidate rewrite.
Self-review is not independent review, source rights or image quality acceptance.
"""
from pathlib import Path
import importlib.util
import json
import math

ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
GEN=ROOT/'output/sdss-m82-recovered-halo-sources-1004-r1'
OUT=ROOT/'output/sdss-m82-recovered-halo-sources-readback-1004-r1'
def module(name,file):
    spec=importlib.util.spec_from_file_location(name,TASK/'scripts'/file)
    value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value
loader=module('loader','experience-m82-current-adaptive-recovery-2026-10-04.py')
witness=module('witness','readback-m82-recovered-aperture-regions-2026-10-04.py')
np,bind,save=loader.np,loader.bind,loader.save
from sdss_frame_noise import native_noise_samples
from sdss_source_stencil import bilinear_source_samples


def native_views(master,sources,bounds):
    x0,y0,x1,y1=bounds;y,x=np.mgrid[y0:y1,x0:x1];ra,dec=master.target.all_pix2world(x,master.joint_available.shape[0]-1-y,0)
    views={};total=np.zeros(x.shape,float)
    for name,bands in sources.items():
        raw=[];coeff=[];variance=[];valid=[];edges=[];known=np.ones(x.shape,bool);bad=np.zeros(x.shape,bool)
        for band in 'gri':
            source=bands[band];frame=source.frame;sx,sy=frame.wcs.all_world2pix(ra,dec,0)
            pixels,geometry,finite=bilinear_source_samples(frame.data,sx,sy);raw.append(pixels);valid.append(geometry&finite)
            nx,ny=np.full(x.shape,-1,np.int64),np.full(x.shape,-1,np.int64)
            nx[geometry],ny[geometry]=np.floor(sx[geometry]).astype(np.int64),np.floor(sy[geometry]).astype(np.int64)
            xx,yy=np.stack([nx,nx+1,nx,nx+1]),np.stack([ny,ny,ny+1,ny+1])
            fx,fy=np.where(geometry,sx-nx,0),np.where(geometry,sy-ny,0)
            coeff.append(np.stack([(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy]))
            native=native_noise_samples(frame,source.camera,xx,yy);variance.append(native.variance_nmgy_squared)
            flags=source.flags.stencil(sx,sy)
            assert frame.header['PS_ID']==source.flags.receipt['actualPrimaryIdentity']['PS_ID']
            known &= geometry&finite&native.available.all(axis=0)&flags.geometry&((flags.flags&771)==0)
            bad |= flags.geometry&((flags.flags&771)!=0)
            rows,columns=frame.data.shape;distance=np.minimum.reduce([sx,sy,columns-1-sx,rows-1-sy])
            edges.append(np.where(finite,np.maximum(distance,0),0).astype(np.float32))
        common=np.logical_and.reduce(valid);weight=np.where(common,np.minimum.reduce(edges)+1,0).astype(np.float32)
        total+=weight;views[name]={'raw':np.stack(raw),'coeff':np.stack(coeff),'variance':np.stack(variance),
            'weight':weight,'known':known,'bad':bad,'run':bands['g'].frame.receipt['identity']['run']}
    available=total>0;original=np.zeros((3,*x.shape),float)
    for view in views.values():
        w=view['weight'];original+=np.where(w[None]>0,view['raw'],0).astype(float)*w
        np.divide(w,total,out=w,where=available)
    original[:,available]/=total[available];original[:,~available]=np.nan;original=original.astype(np.float32)
    def qualification(weights,values):
        eligible=available.copy();terms=[]
        for name,w in weights.items():
            view=views[name];eligible &= (w<=0)|view['known']
            coefficient=view['coeff']*w[None,None]
            native=np.where(w[None,None]>0,view['variance'],0)
            terms.append((coefficient**2*native).sum(axis=1))
        with np.errstate(invalid='ignore',divide='ignore'):
            marginal=np.sqrt(terms).sum(axis=0)**2
            q=eligible&np.isfinite(marginal).all(axis=0)&(marginal>0).all(axis=0)
            strong=q&(np.abs(values)/np.sqrt(marginal)>=3).any(axis=0)
        return eligible,q,strong
    original_weights={name:v['weight'] for name,v in views.items()}
    _,original_q,_=qualification(original_weights,original)
    dates={};runs={}
    for name,bands in sources.items():
        run=views[name]['run'];runs.setdefault(run,[]).append(name);dates.setdefault(run,[])
        dates[run]+=[source.frame.receipt['asTrans']['row']['MJD'] for source in bands.values()]
    ranges={run:(min(values),max(values)) for run,values in dates.items()}
    assert all(all(isinstance(v,(int,float)) and math.isfinite(v) for v in values) for values in dates.values())
    summaries={}
    for run,names in runs.items():
        w=sum(views[name]['weight'].astype(float) for name in names)
        bad=np.logical_or.reduce([(views[name]['weight']>0)&views[name]['bad'] for name in names])
        known=np.logical_and.reduce([(views[name]['weight']<=0)|views[name]['known'] for name in names])&(w>0)
        numerator=sum(np.where(views[name]['weight'][None]>0,views[name]['raw'],0).astype(float)*views[name]['weight'] for name in names)
        summaries[run]=(w,bad,known,numerator)
    selected={};alternative_total=np.zeros(x.shape,float);numerator=np.zeros((3,*x.shape),float)
    for run,(w,bad,known,raw) in summaries.items():
        others=[v[1] for other,v in summaries.items() if run!=other and (ranges[run][1]<ranges[other][0] or ranges[other][1]<ranges[run][0])]
        other_bad=np.logical_or.reduce(others) if others else np.zeros(x.shape,bool)
        chosen=~original_q&available&(w>0)&~bad&known&other_bad
        selected[run]=chosen;alternative_total+=np.where(chosen,w,0);numerator+=np.where(chosen[None],raw,0)
    supply=alternative_total>0;values=original.copy();values[:,supply]=(numerator[:,supply]/alternative_total[supply]).astype(np.float32)
    effective={}
    for name,v in views.items():
        w=v['weight'].astype(float);alternate=np.divide(w,alternative_total,out=np.zeros_like(w),where=selected[v['run']]&supply)
        effective[name]=np.where(supply,alternate,w)
    eligible,q,strong=qualification(effective,values)
    return values,supply,eligible,q,strong,effective


def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    inputs={};historical=[]
    def pin(path,expected=None):
        actual=bind(path)
        if expected is not None:assert actual==expected
        prior=inputs.setdefault(actual['path'],actual);assert prior==actual;return actual
    path=GEN/'result.json';producer_pin=pin(path);result=json.loads(path.read_bytes())
    assert producer_pin['sha256']=='a33d941280a00732ce1257589bde10fe1641e141ba345a077d219a40bf3cc064'
    for item in result['inputs']:
        if bind(ROOT/item['path'])!=item:
            assert item['path'].endswith('/scripts/experience-m82-recovered-halo-sources-2026-10-04.py')
            old=pin(GEN/'executed-script.py');assert (old['bytes'],old['sha256'])==(item['bytes'],item['sha256'])
            historical.append({'previous':item,'executedArchive':old,'current':pin(ROOT/item['path']),
                'meaning':'Only task witness label renamed to perimeter-source-support; original witnesses were not selected by old missing-aperture mask. Numeric sources unchanged, no rerun.'})
        else:pin(ROOT/item['path'],item)
    for item in result['outputsBeforeResult']:pin(ROOT/item['path'],item)
    pin(Path(__file__));pin(Path(witness.__file__))
    path=loader.DISPLAY/'result.json';pin(path);master,parent,sources=loader.load_saved_inputs(json.loads(path.read_bytes()),pin)
    windows=[];witnesses=[];external_positions=set();native_scalars=0
    for fact in result['windows']:
        path=ROOT/fact['samples']['path'];pin(path,fact['samples'])
        with np.load(path,allow_pickle=False) as archive:maps={key:archive[key] for key in archive.files}
        bounds=fact['supportBoundsXYExclusive'];values,supply,eligible,q,strong,weights=native_views(master,sources,bounds)
        for key,value in (('rawDisplaySamplingGri',values),('alternativeSupply',supply),('sourceEligible',eligible),('sourceQualified',q),('strongSigned',strong)):
            np.testing.assert_array_equal(value,maps[key])
        for name,w in weights.items():
            key=name.replace('/','-')+'-weight'
            if key in maps:np.testing.assert_array_equal(w,maps[key])
            else:assert not w.any()
        x0,y0,x1,y1=bounds;n=master.joint_available.shape[0]
        for y,x in np.argwhere(supply):
            gx,gy=int(x+x0),int(y+y0)
            if not 0<=gx<n or not 0<=gy<n:external_positions.add((gx,gy))
        tx0,ty0,tx1,ty1=fact['targetBoundsXYExclusive'];target=slice(ty0,ty1),slice(tx0,tx1)
        local=slice(ty0-y0,ty1-y0),slice(tx0-x0,tx1-x0)
        full=np.zeros(q.shape,bool);full[1:-1,1:-1]=q[1:-1,1:-1]&q[:-2,1:-1]&q[2:,1:-1]&q[1:-1,:-2]&q[1:-1,2:]
        np.testing.assert_array_equal(full,maps['completeRadius1'])
        old_blocked=parent.qualified[target]&(parent.radius[target]<0)
        assert int(old_blocked.sum())==fact['oldQualifiedNoApertureTargets']
        assert int((old_blocked&full[local]&~strong[local]).sum())==fact['oldBlockedNowCompleteRadius1Weak']
        for at,record in enumerate(fact['witnesses']):
            path=GEN/f'{fact["edge"]}-witness-{at}.npz';pin(path)
            with np.load(path,allow_pickle=False) as archive:selected=archive['selected']
            upper,raw,absolute,repeated=witness.original_aperture_noise(sources,maps,master,bounds,selected)
            np.testing.assert_allclose(upper,record['conditionalNativeUpper'],rtol=np.finfo(float).eps*32,atol=0)
            mean=maps['rawDisplaySamplingGri'][:,selected].astype(float).mean(axis=1)
            bound=(len(sources)+8)*np.finfo(np.float32).eps*absolute+len(sources)*np.finfo(np.float32).smallest_subnormal
            assert (np.abs(raw-mean)<=bound).all()
            witnesses.append({'edge':fact['edge'],'globalXY':record['globalXY'],'actualRole':'outside-supply' if record['role']=='outside-supply' else 'perimeter-source-support',
                'historicTaskLabel':record['role'],'conditionalOriginalNativeUpper':upper.tolist(),'actualRawGri':raw.tolist(),
                'meanResidualGri':np.abs(raw-mean).tolist(),'derivedFloat32BoundGri':bound.tolist(),'nativeRepeats':repeated})
        native_scalars+=int(values.size)
        windows.append({'edge':fact['edge'],'bounds':bounds,'maps':maps})
        print(json.dumps({'edge':fact['edge'],'directNativeRawCohortWeightsQualificationAndStrongExact':True}),flush=True)
    # Compare every actual support overlap, including out-of-crop corners.
    overlaps=[]
    for at,a in enumerate(windows):
        for b in windows[at+1:]:
            ax,ay,ar,ab=a['bounds'];bx,by,br,bb=b['bounds'];left,top,right,bottom=max(ax,bx),max(ay,by),min(ar,br),min(ab,bb)
            if left>=right or top>=bottom:continue
            al=slice(top-ay,bottom-ay),slice(left-ax,right-ax);bl=slice(top-by,bottom-by),slice(left-bx,right-bx)
            for key in a['maps'].keys()&b['maps'].keys():
                va,vb=a['maps'][key],b['maps'][key]
                if key=='completeRadius1':continue # Window endpoints have no declared radius1; compare real support only.
                np.testing.assert_array_equal(va[:,al[0],al[1]] if va.ndim==3 else va[al],vb[:,bl[0],bl[1]] if vb.ndim==3 else vb[bl])
            overlaps.append({'edges':[a['edge'],b['edge']],'boundsXYExclusive':[left,top,right,bottom],'actualSourceOverlapExact':True})
    for item in inputs.values():assert bind(ROOT/item['path'])==item
    report={'scope':__doc__,'producerResult':producer_pin,'inputs':list(inputs.values()),'inputsAfterExact':True,'historicalTaskRoleCorrection':historical,
        'allDirectNativeRawScalarsChecked':native_scalars,'allGeometryCohortWeightsEligibleQualifiedStrongExact':True,
        'actualSourceOverlaps':overlaps,'uniqueOutsideSupplyPositions':len(external_positions),'uniqueOutsideSupplyXY':sorted(external_positions),
        'originalNativeWitnesses':witnesses,'oldQualifiedNoApertureTargets':sum(v['oldQualifiedNoApertureTargets'] for v in result['windows']),
        'oldBlockedNowCompleteRadius1Weak':sum(v['oldBlockedNowCompleteRadius1Weak'] for v in result['windows']),
        'actualQualifiedWeakDependencies':sum(v['actualQualifiedWeakDependencies'] for v in result['windows']),
        'knownInsideSupplyDependencyPositions':sum(v['knownInsideSupplyDependencyPositions'] for v in result['windows']),
        'allSupplyDependencyPositions':sum(v['allSupplyDependencyPositions'] for v in result['windows']),
        'filterCandidateRewriteOrProducerProjectionRuns':0,'sourceRequests':0,'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
    save(OUT/'result.json',report);print(json.dumps({k:v for k,v in report.items() if k not in ('inputs','originalNativeWitnesses','uniqueOutsideSupplyXY','scope','historicalTaskRoleCorrection')}))


if __name__=='__main__':
    try:main()
    except Exception as error:
        if OUT.exists():save(OUT/'failed.json',{'type':type(error).__name__,'error':str(error)})
        raise
