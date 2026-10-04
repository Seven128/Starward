"""Saved response arithmetic via row-first SciPy spline and explicit stencil.

No producer, ImagePSF, detector, fitter, shared sampler or source frame imports.
This is a separate arithmetic path, not an independent reviewer.
"""
from pathlib import Path
import hashlib,json,sys,time
ROOT=Path(__file__).resolve().parents[4]
sys.path[:0]=[str(ROOT/'output/sdss-psf-tools-1003-r1/python-deps'),str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from scipy.interpolate import RectBivariateSpline
OUT=ROOT/'output/target-psf-response-1003-r3'
def bind(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for v in iter(lambda:f.read(1024*1024),b''):h.update(v)
    return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}
def main():
    start=time.perf_counter();r=json.loads((OUT/'result.json').read_bytes())
    assert bind(OUT/'result.json')['sha256']==('0482140d8fe021cbcfb3dcb6b0a918959de37aefe241e34caeccac326e94c885' if 'same-run' in OUT.name else 'bd5e6755e8552866298757dab8eb91ec2bbb9eacefeb7217c78def661a056041')
    before=json.loads((OUT/'inputs-before.json').read_bytes());assert before==json.loads((OUT/'inputs-after.json').read_bytes())
    for v in before:assert bind(ROOT/v['path'])==v
    manifest=json.loads((ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json').read_bytes())
    shapes={f['fieldKey']:f['perBand']['g']['sourceReceipt']['scientificSamples']['shapeRowsColumns'] for f in manifest['mosaic']['fields']}
    reuse=[]
    max_native=max_response=max_wrong_axis=0.;core_unknown=core_total=0;unknown=0;signed=0;native_missing=0;run_counts={};fields_counts={};records=[]
    for row in r['records']:
        assert bind(ROOT/row['saved']['path'])==row['saved']
        with np.load(ROOT/row['saved']['path'],allow_pickle=False) as z:a={k:z[k] for k in z.files}
        core=(a['target_x']-row['anchorTargetXY'][0])**2+(a['target_y']-row['anchorTargetXY'][1])**2<=12**2
        runs=len(row['distinctRuns']);run_counts[str(runs)]=run_counts.get(str(runs),0)+1
        nf=len(row['contributors']);fields_counts[str(nf)]=fields_counts.get(str(nf),0)+1
        sums={b:np.zeros(core.shape,float) for b in ('g','r','i')};known={b:np.ones(core.shape,bool) for b in sums}
        for c in row['contributors']:
            prefix=c['fieldKey'].replace('/','-');w=a[prefix+'-weight']
            for b,v in c['bands'].items():
                key=prefix+'-'+b;sx=a[key+'-sx'];sy=a[key+'-sy'];got=a[key+'-response'];support=a[key+'-support']
                expected=np.full(sx.shape,np.nan,np.float32);ok=np.zeros(sx.shape,bool)
                rows,columns=shapes[c['fieldKey']]
                xi=np.floor(sx).astype(int);yi=np.floor(sy).astype(int)
                dx=sx-xi;dy=sy-yi
                coefficients=np.stack([(1-dx)*(1-dy),dx*(1-dy),(1-dx)*dy,dx*dy])*w
                ids=np.stack([yi*columns+xi,yi*columns+xi+1,(yi+1)*columns+xi,(yi+1)*columns+xi+1])
                active=(coefficients>0)&core[None]
                sample_ids=ids[active];unique=np.unique(sample_ids)
                reuse.append({'location':row['index'],'fieldKey':c['fieldKey'],'band':b,'radius12NeighborOccurrences':len(sample_ids),'radius12UniqueWithinFieldNativeSamples':len(unique),'reusedNeighborOccurrences':len(sample_ids)-len(unique),'identityScope':'Within one admitted field/band only; no cross-field independence or physical duplicate-origin claim.'})
                if v['anchorInsideNative']:
                    kernel=a[key+'-kernel'];model=a[key+'-native-model'];ax,ay,bx,by=a[key+'-native-bounds'];py,px=np.mgrid[ay:by,ax:bx]
                    u=px-v['anchorNativeXY'][0]+25;vv=py-v['anchorNativeXY'][1]+25
                    good=(u>=0)&(u<=50)&(vv>=0)&(vv<=50)
                    spline=RectBivariateSpline(np.arange(51),np.arange(51),kernel/kernel.sum(),kx=3,ky=3,s=0)
                    rebuilt=np.full(u.shape,np.nan);rebuilt[good]=spline.ev(vv[good],u[good])
                    assert np.array_equal(np.isfinite(model),good)
                    error=float(np.max(np.abs(rebuilt[good]-model[good])));max_native=max(max_native,error)
                    assert error<=8*np.finfo(float).eps*float(np.max(np.abs(kernel/kernel.sum())))
                    wrong=RectBivariateSpline(np.arange(51),np.arange(51),kernel.T/kernel.sum(),kx=3,ky=3,s=0)
                    max_wrong_axis=max(max_wrong_axis,float(np.max(np.abs(wrong.ev(vv[good],u[good])-rebuilt[good]))))
                    x=sx-ax;y=sy-ay;geo=np.isfinite(x)&np.isfinite(y)&(x>=0)&(y>=0)&(x<model.shape[1]-1)&(y<model.shape[0]-1)
                    xi=np.floor(x[geo]).astype(int);yi=np.floor(y[geo]).astype(int)
                    n=np.stack([rebuilt[yi,xi],rebuilt[yi,xi+1],rebuilt[yi+1,xi],rebuilt[yi+1,xi+1]])
                    fin=np.isfinite(n).all(axis=0);ok[geo]=fin;dx=x[geo][fin]-xi[fin];dy=y[geo][fin]-yi[fin];n=n[:,fin]
                    expected[ok]=(n[0]*(1-dx)*(1-dy)+n[1]*dx*(1-dy)+n[2]*(1-dx)*dy+n[3]*dx*dy).astype(np.float32)
                else:native_missing+=int((w>0).sum())
                assert np.array_equal(ok,support);assert np.array_equal(np.isfinite(expected),np.isfinite(got))
                delta=float(np.max(np.abs(expected[ok].astype(float)-got[ok]))) if ok.any() else 0
                # float64 separable spline traversal may change the final
                # float32 rounding by one ULP; retain measured differences.
                assert np.allclose(expected[ok],got[ok],rtol=2*np.finfo(np.float32).eps,atol=1e-15);max_response=max(max_response,delta)
                known[b]&=~((w>0)&~ok);use=(w>0)&ok;sums[b][use]+=got[use].astype(float)*w[use]
        record={'index':row['index'],'runs':runs,'fields':nf,'coreUnknown':{}}
        for b in sums:
            expected=np.where(known[b],sums[b],np.nan).astype(np.float32)
            assert np.array_equal(known[b],a['known-'+b]);assert np.array_equal(expected,a['coadd-'+b],equal_nan=True)
            core_unknown+=int((core&~known[b]).sum());core_total+=int(core.sum());unknown+=int((~known[b]).sum());signed+=int((expected<0).sum())
            record['coreUnknown'][b]=int((core&~known[b]).sum())
        records.append(record)
    # A bounded omission mutation: converting unavailable positive-weight
    # contributors to zero would admit real saved unknown pixels incorrectly.
    assert unknown>0 and max_wrong_axis>1e-5
    result={'nativeReuse':reuse,'records':records,'actualLocations':len(records),'sourceInputsExact':len(before),'distinctRunCounts':run_counts,'positiveFieldCounts':fields_counts,
        'allFourFiniteStencilReadback':True,'coaddArithmeticExact':True,'maximumNativeSplineDifference':max_native,'maximumSampleFloat32Difference':max_response,
        'wrongAxisModelDifference':max_wrong_axis,'positiveWeightAnchorOutsidePixels':native_missing,'unknownResponsePixels':unknown,'radius12UnknownBandPixels':core_unknown,
        'radius12TotalBandPixels':core_total,'signedNegativeModelPixels':signed,'unknownToZeroMutationIncorrectlyAdmitsPixels':unknown,
        'elapsedSeconds':time.perf_counter()-start,'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False,
        'material':'One declared real saved same-run overlap geometry location, no claimed detected source.' if 'same-run' in OUT.name else 'All87 saved real DETAIL image candidates, not certified stars.',
        'scope':'Saved mathematical model/science-coadd response arithmetic only. Radius12 is prior diagnostic support, not quality threshold. No adaptive-display PSF, stellar classification or photometric claim.'}
    folder=OUT/'readback-r2';folder.mkdir(exist_ok=False);(folder/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    with (folder/'result.json').open('x',encoding='utf-8') as f:json.dump(result,f,indent=2,allow_nan=False);f.write('\n')
    print(json.dumps({k:v for k,v in result.items() if k not in ('records','nativeReuse')}|{'totalReusedNeighborOccurrences':sum(v['reusedNeighborOccurrences'] for v in reuse)}),flush=True)
if __name__=='__main__':
    main()
    OUT=ROOT/'output/target-psf-same-run-control-1003-r1'
    main()
