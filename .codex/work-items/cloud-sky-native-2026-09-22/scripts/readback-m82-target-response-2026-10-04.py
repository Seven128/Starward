"""Original psField/WCS and saved actual coadd response arithmetic.

No producer/shared-helper/ImagePSF/science-sampler imports. Row-first spline
and explicit four-neighbour sampling; this is self verification, not review.
"""
from pathlib import Path
import hashlib, json, math, sys, time
ROOT=Path(__file__).resolve().parents[4]; TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.path[:0]=[str(ROOT/'output/sdss-psf-tools-1003-r1/python-deps'),str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from astropy.io import fits
from astropy.wcs import WCS
from scipy.interpolate import RectBivariateSpline
from PIL import Image
GEN=ROOT/'output/sdss-m82-target-response-1004-r1';OUT=ROOT/'output/sdss-m82-target-response-readback-1004-r1'

def bind(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for v in iter(lambda:f.read(1048576),b''):h.update(v)
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':path.stat().st_size,'sha256':h.hexdigest()}

def save(path,value):
    with path.open('x',encoding='utf-8') as f:json.dump(value,f,indent=2,allow_nan=False);f.write('\n')

def main():
    started=time.perf_counter();assert not OUT.exists();OUT.mkdir();(OUT/'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    result_path=GEN/'result.json'
    assert bind(result_path)['sha256']=='cf86aedf8017e7868c09a0b1c393395dba9b09fccf0b188b3bffec12900e37bb'
    result=json.loads(result_path.read_bytes());before=json.loads((GEN/'inputs-before.json').read_bytes())
    assert before==json.loads((GEN/'inputs-after.json').read_bytes())
    for item in before:assert bind(ROOT/item['path'])==item
    science_path=ROOT/'output/sdss-m82-first-science-master-1004-r2/candidate/candidate.json';science=json.loads(science_path.read_bytes())
    current_path=ROOT/'output/sdss-m82-recovered-complete-1004-r1/candidate/candidate.json';current=json.loads(current_path.read_bytes())
    def array(meta,base):return np.load(base/meta['file'],mmap_mode='r',allow_pickle=False)
    science_arrays={b:array(science['arrays'][b+'-science'],science_path.parent) for b in 'gri'}
    available=array(science['arrays']['joint-availability'],science_path.parent)
    current_arrays={k:array(v,current_path.parent) for k,v in current['arrays'].items()}
    weights={key:array(v['normalized-weight'],science_path.parent) for key,v in science['mosaic']['diagnostics'].items()}
    fields={f['fieldKey']:f for f in science['mosaic']['fields']}
    field_arrays={key:{b:{suffix:array(science['mosaic']['diagnostics'][key][b+'-'+suffix],science_path.parent) for suffix in ('footprint','finite-neighbors')} for b in 'gri'} for key in fields}
    quality=json.loads((ROOT/'output/sdss-m82-quality-inputs-1004-r1/result.json').read_bytes())
    originals={};psfs={}
    for key,field in fields.items():
        ident={k:v for k,v in field['perBand']['g']['sourceReceipt']['identity'].items() if k!='band'}
        meta=next(v for v in quality['sourceRecords'] if v['filename'].startswith('psField') and v['identity']==ident)
        path=ROOT/meta['raw']['path'];assert bind(path)==meta['raw']
        with fits.open(path,memmap=False) as h:
            psfs[key]={b:[{name:np.array(t[name],copy=True) for name in ('nrow_b','ncol_b','c','rrows')} for t in h['ugriz'.index(b)+1].data] for b in 'gri'}
        originals[key]={}
        for b in 'gri':
            receipt=field['perBand'][b]['sourceReceipt'];path=Path(receipt['source']['path']);assert bind(path)['sha256']==receipt['source']['sha256']
            with fits.open(path,memmap=False) as h:originals[key][b]=(WCS(h[0].header),tuple(h[0].shape))
    n=science['pixels'];target=WCS(naxis=2);target.wcs.ctype=['RA---TAN','DEC--TAN'];target.wcs.cunit=['deg','deg'];target.wcs.radesys='ICRS'
    target.wcs.crval=[science['center']['raDeg'],science['center']['decDeg']];target.wcs.crpix=[(n+1)/2]*2
    step=math.degrees(2*math.tan(math.radians(science['fieldDegrees'])/2)/n);target.wcs.cdelt=[-step,step]
    catalog=json.loads((ROOT/'output/sdss-m82-measured-stars-1004-r4/result.json').read_bytes())
    central=json.loads((ROOT/'output/sdss-m82-central-native-1004-r2/result.json').read_bytes())
    points=[(r['objID'],r['targetXY']) for r in catalog['records'] if 'targetSaved' in r]
    points += [(r['bands']['r']['candidateId'],r['bands']['r']['targetXY']) for r in central['triplets']]
    assert len(points)==134
    assert points==[(r['material']['id'],r['anchorTargetXY']) for r in result['records'][:134]]
    # All declared geometry controls are reconstructed from current weight maps.
    yy,xx=np.mgrid[:n,:n];distance=(xx-(n-1)/2)**2+(yy-(n-1)/2)**2
    controls=[('object-centre',[(n-1)/2]*2)];counts=np.zeros((n,n),np.uint8)
    for key,w in weights.items():
        positive=w>0;counts+=positive;edge=np.zeros((n,n),bool)
        h=positive[:,1:]!=positive[:,:-1];edge[:,1:]|=h&positive[:,1:];edge[:,:-1]|=h&positive[:,:-1]
        v=positive[1:,:]!=positive[:-1,:];edge[1:,:]|=v&positive[1:,:];edge[:-1,:]|=v&positive[:-1,:]
        if edge.any():
            candidates=np.flatnonzero(edge);i=int(candidates[np.argmin(distance.ravel()[candidates])]);y,x=divmod(i,n)
            controls.append(('field-coverage-transition-'+key,[x,y]))
    candidates=np.flatnonzero(counts==counts.max());i=int(candidates[np.argmin(distance.ravel()[candidates])]);y,x=divmod(i,n)
    controls.append(('maximal-common-field-overlap',[x,y]));controls += [(f'target-corner-{x}-{y}',[x,y]) for x,y in ((0,0),(n-1,0),(0,n-1),(n-1,n-1))]
    assert controls==[(r['material']['id'],r['anchorTargetXY']) for r in result['records'][134:]]
    del xx,yy,distance,counts
    max_native=max_wrong_axis=0.;unknown=signed=outside_anchor_pixels=core_unknown=0;reuse=[];rows=[];run_counts={};field_counts={}
    for row in result['records']:
        assert bind(ROOT/row['saved']['path'])==row['saved']
        with np.load(ROOT/row['saved']['path'],allow_pickle=False) as z:a={k:z[k] for k in z.files}
        x0,y0,x1,y1=row['targetBoundsXYExclusive'];crop=np.s_[y0:y1,x0:x1];yy,xx=np.mgrid[y0:y1,x0:x1]
        np.testing.assert_array_equal(a['target_x'],xx);np.testing.assert_array_equal(a['target_y'],yy)
        np.testing.assert_array_equal(a['science_available'],available[crop])
        for b in 'gri':
            np.testing.assert_array_equal(a['original_science_'+b],science_arrays[b][crop])
            np.testing.assert_array_equal(a['current_display_'+b],current_arrays[b][crop])
        for k in ('qualified','radius','reached','protected','affected'):np.testing.assert_array_equal(a['current_'+k],current_arrays[k][crop])
        cx,cy=row['anchorTargetXY'];anchor=target.all_pix2world(cx,n-1-cy,0);np.testing.assert_array_equal(anchor,row['anchorIcrs'])
        ra,dec=target.all_pix2world(xx,n-1-yy,0);core=(xx-cx)**2+(yy-cy)**2<=12**2
        expected_contributors=[];raw=[]
        for key in fields:
            if (weights[key][crop]>0).any():expected_contributors.append(key)
            edges=[];joint=[]
            for b in 'gri':
                wcs,shape=originals[key][b];sx,sy=wcs.all_world2pix(ra,dec,0)
                geometry=np.isfinite(sx)&np.isfinite(sy)&(sx>=0)&(sy>=0)&(sx<shape[1]-1)&(sy<shape[0]-1)
                np.testing.assert_array_equal(geometry,field_arrays[key][b]['footprint'][crop])
                actual=geometry&field_arrays[key][b]['finite-neighbors'][crop];joint.append(actual)
                edge=np.minimum.reduce([sx,sy,shape[1]-1-sx,shape[0]-1-sy])
                edges.append(np.where(actual,np.maximum(edge,0),0).astype(np.float32))
            raw.append((key,np.where(np.logical_and.reduce(joint),np.minimum.reduce(edges)+1,0).astype(np.float32)))
        denominator=sum(v.astype(float) for _,v in raw)
        for key,rw in raw:
            normalized=np.zeros(xx.shape,np.float32);valid=available[crop]
            normalized[valid]=(rw[valid]/denominator[valid]).astype(np.float32)
            np.testing.assert_array_equal(normalized,weights[key][crop])
        assert expected_contributors==[c['fieldKey'] for c in row['contributors']]
        sums={b:np.zeros(xx.shape,float) for b in 'gri'};known={b:available[crop].copy() for b in 'gri'}
        for contributor in row['contributors']:
            key=contributor['fieldKey'];prefix=key.replace('/','-');w=a[prefix+'-weight'];np.testing.assert_array_equal(w,weights[key][crop])
            for b,meta in contributor['bands'].items():
                p=prefix+'-'+b;wcs,shape=originals[key][b];sx,sy=wcs.all_world2pix(ra,dec,0)
                np.testing.assert_array_equal(sx,a[p+'-sx']);np.testing.assert_array_equal(sy,a[p+'-sy'])
                nx,ny=map(float,wcs.all_world2pix(*anchor,0));np.testing.assert_array_equal([nx,ny],meta['anchorNativeXY'])
                inside=bool(np.isfinite([nx,ny]).all() and 0<=nx<shape[1] and 0<=ny<shape[0]);assert inside==meta['anchorInsideNative']
                expected=np.full(xx.shape,np.nan,np.float32);ok=np.zeros(xx.shape,bool)
                if meta['hasModel']:
                    kernel=np.zeros((51,51),float)
                    for t in psfs[key][b]:
                        weight=0.
                        for i in range(int(t['nrow_b'])):
                            for j in range(int(t['ncol_b'])):weight+=float(t['c'][i,j])*((ny+.5)*.001)**i*((nx+.5)*.001)**j
                        kernel+=weight*np.asarray(t['rrows'],float).reshape(51,51)
                    np.testing.assert_array_equal(kernel,a[p+'-kernel']);assert float(kernel.sum())==meta['finiteKernelSum']
                    normalized=kernel/kernel.sum();ax,ay,bx,by=map(int,a[p+'-native-bounds']);py,px=np.mgrid[ay:by,ax:bx]
                    geometry=np.isfinite(sx)&np.isfinite(sy)&(sx>=0)&(sy>=0)&(sx<shape[1]-1)&(sy<shape[0]-1)
                    assert [ax,ay,bx,by]==[int(np.floor(sx[geometry]).min()),int(np.floor(sy[geometry]).min()),int(np.floor(sx[geometry]).max())+2,int(np.floor(sy[geometry]).max())+2]
                    u,v=px-nx+25,py-ny+25;finite=(u>=0)&(u<=50)&(v>=0)&(v<=50)
                    spline=RectBivariateSpline(np.arange(51),np.arange(51),normalized,kx=3,ky=3,s=0)
                    rebuilt=np.full(u.shape,np.nan);rebuilt[finite]=spline.ev(v[finite],u[finite])
                    model=a[p+'-native-model'];np.testing.assert_array_equal(np.isfinite(model),finite)
                    if finite.any():
                        delta=float(np.max(np.abs(rebuilt[finite]-model[finite])));bound=16*np.finfo(float).eps*float(np.max(np.abs(normalized)))
                        assert delta<=bound,(row['index'],key,b,delta,bound);max_native=max(max_native,delta)
                        wrong=RectBivariateSpline(np.arange(51),np.arange(51),normalized.T,kx=3,ky=3,s=0)
                        max_wrong_axis=max(max_wrong_axis,float(np.max(np.abs(wrong.ev(v[finite],u[finite])-rebuilt[finite]))))
                    # Independent interpolation of the verified saved native
                    # model makes f32 sampling/coadd readback byte-exact; no
                    # scientific/pixel tolerance hides spline traversal roundoff.
                    x,y=sx-ax,sy-ay;geo=np.isfinite(x)&np.isfinite(y)&(x>=0)&(y>=0)&(x<model.shape[1]-1)&(y<model.shape[0]-1)
                    xi,yi=np.floor(x[geo]).astype(int),np.floor(y[geo]).astype(int)
                    four=np.stack([model[yi,xi],model[yi,xi+1],model[yi+1,xi],model[yi+1,xi+1]])
                    valid=np.isfinite(four).all(axis=0);ok[geo]=valid;dx,dy=x[geo][valid]-xi[valid],y[geo][valid]-yi[valid];f=four[:,valid]
                    expected[ok]=(f[0]*(1-dx)*(1-dy)+f[1]*dx*(1-dy)+f[2]*(1-dx)*dy+f[3]*dx*dy).astype(np.float32)
                else:
                    assert not inside or not (np.isfinite(sx)&np.isfinite(sy)&(sx>=0)&(sy>=0)&(sx<shape[1]-1)&(sy<shape[0]-1)).any()
                    outside_anchor_pixels+=int((w>0).sum())
                np.testing.assert_array_equal(expected,a[p+'-response']);np.testing.assert_array_equal(ok,a[p+'-support'])
                assert int(((w>0)&~ok).sum())==meta['modelUnsupportedPositiveWeightPixels']
                known[b]&=~((w>0)&~ok);use=(w>0)&ok;sums[b][use]+=expected[use].astype(float)*w[use]
                geo=np.isfinite(sx)&np.isfinite(sy)&(sx>=0)&(sy>=0)&(sx<shape[1]-1)&(sy<shape[0]-1)&core&(w>0)
                xi,yi=np.floor(sx[geo]).astype(int),np.floor(sy[geo]).astype(int);dx,dy=sx[geo]-xi,sy[geo]-yi
                coef=np.stack([(1-dx)*(1-dy),dx*(1-dy),(1-dx)*dy,dx*dy])*w[geo]
                ids=np.stack([yi*shape[1]+xi,yi*shape[1]+xi+1,(yi+1)*shape[1]+xi,(yi+1)*shape[1]+xi+1])[coef>0]
                reuse.append({'index':row['index'],'fieldKey':key,'band':b,'nativeNeighborOccurrences':len(ids),'uniqueWithinFieldBandNativeIds':len(np.unique(ids)),'scope':'Radius12 diagnostic; within-field only, no cross-field independence/physical duplicate exposure assertion.'})
        band_unknown={}
        for b in 'gri':
            expected=np.where(known[b],sums[b],np.nan).astype(np.float32)
            np.testing.assert_array_equal(a['known-'+b],known[b]);np.testing.assert_array_equal(a['coadd-'+b],expected)
            unknown+=int((~known[b]).sum());signed+=int((expected<0).sum());core_unknown+=int((core&~known[b]).sum())
            summary=row['summary'][b];assert summary['knownPixels']==int(known[b].sum()) and summary['unknownPixels']==int((~known[b]).sum())
            assert summary['patchSum']==float(np.nansum(expected)) and summary['negativePixels']==int((expected<0).sum())
            band_unknown[b]=int((core&~known[b]).sum())
        nf,nr=len(row['contributors']),len(row['distinctRuns']);field_counts[str(nf)]=field_counts.get(str(nf),0)+1;run_counts[str(nr)]=run_counts.get(str(nr),0)+1
        rows.append({'index':row['index'],'id':row['material']['id'],'fields':nf,'runs':nr,'coreUnknown':band_unknown})
    for image in result['images']:
        path=ROOT/image['path'];assert bind(path)==image
        with Image.open(path) as im:im.load();assert im.mode=='RGB'
    assert unknown>0 and signed>0 and max_wrong_axis>1e-5
    for item in before:assert bind(ROOT/item['path'])==item
    report={'scope':__doc__,'producerResult':bind(result_path),'actualLocations':len(rows),'catalogPositions':20,'provisionalCentralPositions':114,'declaredGeometryControls':len(controls),
        'records':rows,'nativeReuse':reuse,'distinctRunCounts':run_counts,'positiveFieldCounts':field_counts,
        'sourceInputsExact':len(before),'actualSourceWcsCoordinatesExact':True,'originalPsFieldBasisAndOrdersExact':True,'normalizedActualScienceWeightsExact':True,
        'allFourFiniteNativeSamplingExact':True,'scienceCurrentMapsExact':True,'coaddArithmeticExact':True,
        'maximumNativeRowFirstSplineDifference':max_native,'wrongAxisModelDifference':max_wrong_axis,'unknownResponseBandPixels':unknown,
        'radius12UnknownResponseBandPixels':core_unknown,'signedNegativeModelPixels':signed,'positiveWeightAnchorUnsupportedPixels':outside_anchor_pixels,
        'unknownToZeroMutationIncorrectlyAdmitsBandPixels':unknown,'reusedNeighborOccurrences':sum(v['nativeNeighborOccurrences']-v['uniqueWithinFieldBandNativeIds'] for v in reuse),
        'elapsedSeconds':time.perf_counter()-started,'processPeak':'UNMEASURED','detectionsVarianceFitsOrFilterCoaddReplays':0,'sourceRequests':0,
        'meaning':'Saved mathematical unit native-to-science response only. Not photometric flux/star classification/PSF matching/conditional display sensitivity/adaptive nonlinear global PSF; quality remains unverified. No output alterations.','quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    save(OUT/'result.json',report);print(json.dumps({k:v for k,v in report.items() if k not in ('records','nativeReuse')}),flush=True)

if __name__=='__main__':
    try:main()
    except Exception as e:
        if OUT.exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e),'sourceOrOutputChanges':False})
        raise
