"""Read real saved anomaly arrays; locate bounded native SKY-domain failure and RGB normalization.

No source fits, masks, coadd, display recipe changes or candidate production.
Literal scalar native interpolation/flag union is separate from producer helpers.
"""
from pathlib import Path
import sys,json,importlib.util,time,math
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from sdss_corrected_frame import read_cached_frame
from sdss_frame_noise import read_cached_field_noise,native_noise_samples
from astropy.visualization import LuptonAsinhStretch
spec=importlib.util.spec_from_file_location('cause_binding',TASK/'scripts/analyze-m82-fixed-response-shapes-2026-10-04.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);bind,save=m.bind,m.save
SOURCE=ROOT/'output/sdss-m82-visible-native-display-1004-r2';OUT=ROOT/'output/sdss-m82-visible-causes-readback-1004-r1'

def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    started=time.perf_counter();pins={}
    def pin(p,expected=None):
        v=bind(p)
        if expected is not None:assert v==expected
        assert pins.setdefault(v['path'],v)==v;return v
    def doc(p):pin(p);return json.loads(p.read_bytes())
    producer=doc(SOURCE/'result.json')
    for v in producer['inputsBefore']:assert bind(ROOT/v['path'])==v
    pin(Path(__file__));pin(Path(m.__file__))
    for n in ('sdss_corrected_frame.py','sdss_frame_noise.py','sdss_source_stencil.py'):
        pin(ROOT/'data-pipelines/deep-sky'/n)
    pin(ROOT/'output/allwise-w3-atlas-0929/python-deps/astropy/visualization/lupton_rgb.py')
    camera=doc(ROOT/'output/sdss-m82-quality-inputs-1004-r1/camera-receipt.json')
    camera_csv=ROOT/camera['raw']['path'];pin(camera_csv,camera['raw'])
    scalar_count=0;records=[];saturation=[]
    for w in producer['records']:
        pin(ROOT/w['saved']['path'],w['saved'])
        with np.load(ROOT/w['saved']['path'],allow_pickle=False) as z:a={k:z[k] for k in z.files}
        union=np.zeros(a['qualified'].shape,bool)
        for f in w['fields']:
            pfx=f['fieldKey'].replace('/','-')+'-'+f['band'];x,y=a[pfx+'-sx'],a[pfx+'-sy']
            native,flags=a[pfx+'-native-data'],a[pfx+'-native-flags'];nx0,ny0,nx1,ny1=f['nativeBoundsXYExclusive']
            footprint=a[pfx+'-footprint'];samples=a[pfx+'-sample'];mappedflags=a[pfx+'-sample-flags']
            for iy,ix in zip(*np.where(footprint)):
                sx,sy=float(x[iy,ix]),float(y[iy,ix]);bx,by=math.floor(sx),math.floor(sy);dx,dy=sx-bx,sy-by
                xx,yy=bx-nx0,by-ny0
                v00,v10,v01,v11=map(float,(native[yy,xx],native[yy,xx+1],native[yy+1,xx],native[yy+1,xx+1]))
                expected=np.float32(v00*(1-dx)*(1-dy)+v10*dx*(1-dy)+v01*(1-dx)*dy+v11*dx*dy)
                assert expected==samples[iy,ix] or np.isnan(expected) and np.isnan(samples[iy,ix])
                assert int(flags[yy,xx])|int(flags[yy,xx+1])|int(flags[yy+1,xx])|int(flags[yy+1,xx+1])==int(mappedflags[iy,ix])
                scalar_count+=1
            on=a[f['fieldKey'].replace('/','-')+'-weight']>0
            reject=on&(~footprint|((mappedflags&771)!=0));assert np.array_equal(reject,a[pfx+'-reject']);union|=reject
        missing=~a['qualified']&~union
        record={'name':w['name'],'withoutNativeReject':int(missing.sum()),'nativeScalarInterpolationAndFlagUnionExact':True}
        if missing.any():
            f=next(f for f in w['fields'] if f['band']=='i' and '/4264/' in f['fieldKey']);pfx=f['fieldKey'].replace('/','-')+'-i'
            receipt=f['nativeReceipt'];raw=receipt['source'];identity=receipt['identity'];v=pin(Path(raw['path']))
            assert (v['sha256'],v['bytes'])==(raw['sha256'],raw['bytes'])
            frame=read_cached_frame(Path(raw['path']),identity|{k:raw[k] for k in ('bytes','sha256','sourceUrl')},max_uncompressed_bytes=32*1024*1024)
            params=read_cached_field_noise(camera_csv,camera,identity)
            bx=np.floor(a[pfx+'-sx'][missing]).astype(int);by=np.floor(a[pfx+'-sy'][missing]).astype(int)
            cols=np.stack((bx,bx+1,bx,bx+1));rows=np.stack((by,by,by+1,by+1))
            noise=native_noise_samples(frame,params,cols,rows)
            meta=frame.calibration_sky;sx=meta.xinterp[cols];sy=meta.yinterp[rows]
            explicit=(sx>=0)&(sy>=0)&(sx<meta.allsky.shape[1]-1)&(sy<meta.allsky.shape[0]-1)
            assert np.array_equal(explicit,noise.sky_geometry)
            assert (~noise.sky_geometry.all(axis=0)).all()
            packet={'target_yx':np.column_stack(np.where(missing)),'native_cols':cols,'native_rows':rows,
                'sky_x':sx,'sky_y':sy,'sky_geometry':noise.sky_geometry,'sky_available':noise.available,
                'sky_counts':noise.sky_counts,'variance':noise.variance_nmgy_squared,'calibration':noise.calibration_nmgy_per_count,
                'native_data':frame.data[rows,cols]}
            file=OUT/(w['name']+'-sky-boundary.npz');np.savez_compressed(file,**packet)
            record.update({'fieldBand':pfx,'unqualifiedAllHaveMissingSkyStencil':True,'targetCells':len(bx),
                'actualNativeSamples':cols.size,'uniqueNativePixels':len(set(zip(cols.flat,rows.flat))),
                'allSkyShapeRowsColumns':list(meta.allsky.shape),'nativeColumnsMinMax':[int(cols.min()),int(cols.max())],
                'skyXMinMax':[float(sx.min()),float(sx.max())],'skyYMinMax':[float(sy.min()),float(sy.max())],
                'missingSkyNativeSamples':int((~explicit).sum()),'finiteScientificSamples':int(np.isfinite(packet['native_data']).sum()),
                'cameraGain':params.gain_electrons_per_count,'cameraDarkVariance':params.dark_variance_counts_squared,
                'saved':bind(file),'meaning':'Finite corrected science exists; incomplete retained SKY interpolation stencil leaves conditional noise unknown. This is not zero science or evidence permitting sky extrapolation/replacement.'})
            del frame
        records.append(record)
        for level,l in w['levels'].items():
            factor={'OVERVIEW':4,'MEDIUM':2,'DETAIL':1}[level];n=128//factor
            # This reproduces only diagnostic means already consumed by the
            # local renderer; no source or whole-image processing occurs.
            v=np.stack([a['current-'+b].reshape(n,factor,n,factor).sum(axis=(1,3),dtype='f8').astype('f8')/(factor*factor) for b in 'irg']).astype('f4')
            intensity=(v[0]+v[1]+v[2])/3
            stretch=LuptonAsinhStretch(stretch=.2358548697680099,Q=8)
            with np.errstate(divide='ignore',invalid='ignore'):
                mult=np.where(intensity<=0,0,stretch(intensity,clip=False)/intensity)
            before=np.maximum(v*mult,0);largest=before.max(axis=0);normalized=largest>1
            rgb=a['current-'+level+'-rgb'];entry={'name':w['name'],'level':level,'pixels':n*n,
                'maxChannelBeforeNormalizationMinMax':[float(largest.min()),float(largest.max())],
                'positiveIntensity':int((intensity>0).sum()),'maxChannelNormalizationPixels':int(normalized.sum()),
                'red255Pixels':int((rgb[:,:,0]==255).sum()),'any255Pixels':int((rgb.max(axis=2)==255).sum()),
                'meaning':'Astropy rescales all three channels by maxRGB when >1. In this branch frozen brightness is determined by channel ratios, not the original common intensity. No new stretch or sky model fitted.'}
            np.savez_compressed(OUT/(w['name']+'-'+level+'-transfer.npz'),intensity=intensity,pre_normalization_rgb=before,
                max_channel=largest,normalization_required=normalized,actual_rgb=rgb)
            saturation.append(entry)
    before=list(pins.values());assert [bind(ROOT/v['path']) for v in before]==before
    report={'scope':__doc__,'producerResult':pin(SOURCE/'result.json'),'inputsBefore':before,'inputsAfterExact':True,
        'nativeScalarPoints':scalar_count,'records':records,'frozenTransferDiagnostics':saturation,'elapsedSeconds':time.perf_counter()-started,
        'localSkyNativeSamples':sum(v.get('actualNativeSamples',0) for v in records),'newSourceRequests':0,
        'wholeVarianceOrFitsOrProjectionOrCoaddOrFilterRuns':0,'displayRecipeChanges':False,'candidateChanges':False,
        'otherBusinessLogicEdited':False,'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
    save(OUT/'result.json',report);print(json.dumps({k:v for k,v in report.items() if k not in ('inputsBefore','frozenTransferDiagnostics')}),flush=True)
if __name__=='__main__':main()
