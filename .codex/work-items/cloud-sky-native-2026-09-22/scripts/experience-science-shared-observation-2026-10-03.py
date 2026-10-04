"""Bounded actual native overlap identity and calibrated-noise compatibility.

Do not recreate full overlap/quality/PSF matrices, fit sky, write a new coadd or
declare estimates from repeated fields to be independent observations.
"""
from dataclasses import asdict
import argparse
import importlib.util
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from sdss_corrected_frame import read_cached_frame
from sdss_frame_noise import read_cached_field_noise,native_noise_samples
from sdss_gri_tan import target_tan
from sdss_source_stencil import source_pixel_stencil
spec=importlib.util.spec_from_file_location('old_local',TASK/'scripts/experience-sdss-local-overlap-diagnosis-2026-10-02.py')
local=importlib.util.module_from_spec(spec);spec.loader.exec_module(local)
bound,save,save_array,stats=local.bound,local.save,local.save_array,local.stats


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',default='science-shared-observation-1003-r2');args=parser.parse_args()
    assert Path(args.output).name==args.output and args.output.startswith('science-shared-observation-1003-r')
    out=ROOT/'output'/args.output;assert not out.exists();out.mkdir()
    candidate_path=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json'
    assert bound(candidate_path)['sha256']=='73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52'
    c=json.loads(candidate_path.read_bytes());fields={f['fieldKey']:f for f in c['mosaic']['fields']}
    field_dir=ROOT/'output/sdss-m51-field-quality-1002-r3';receipt=json.loads((field_dir/'receipt.json').read_bytes())
    pairs=[('301/3699/6/99','301/3699/6/100'),('301/3716/6/117','301/3716/6/118')]
    paths=[Path(__file__),Path(local.__file__),candidate_path,
        *(ROOT/'data-pipelines/deep-sky'/f for f in ('sdss_corrected_frame.py','sdss_frame_noise.py','sdss_source_stencil.py','sdss_gri_tan.py')),
        *(field_dir/f for f in ('receipt.json','response.csv'))]
    for key in set(key for p in pairs for key in p):
        for band in 'gri':paths.append(Path(fields[key]['perBand'][band]['sourceReceipt']['source']['path']))
    for row in json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes()):
        path=ROOT/row['path'];assert bound(path)['sha256']==row['sha256'];paths.append(path)
    before=[bound(p) for p in paths];save(out/'inputs-before.json',before)
    (out/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    target=target_tan(c['center'],c['pixels'],c['fieldDegrees'])
    records=[]
    for key_a,key_b in pairs:
        for band in 'gri':
            frames=[];cameras=[]
            for key in (key_a,key_b):
                old=fields[key]['perBand'][band]['sourceReceipt'];source=old['source']
                frame=read_cached_frame(Path(source['path']),old['identity'] | {k:source[k] for k in ('bytes','sha256','sourceUrl')},max_uncompressed_bytes=32*1024*1024)
                assert frame.receipt==old;frames.append(frame)
                cameras.append(read_cached_field_noise(field_dir/'response.csv',receipt,old['identity']))
            a,b=frames
            assert a.receipt['identity']['field']+1==b.receipt['identity']['field']
            assert all(a.receipt['identity'][k]==b.receipt['identity'][k] for k in ('run','rerun','camcol','band'))
            patches=[]
            for x in (96,640,1280,1920):
                ny,nx=np.mgrid[1390:1406,x:x+16];my=ny-1361
                na,nb=(native_noise_samples(f,p,nx,y) for f,p,y in ((a,cameras[0],ny),(b,cameras[1],my)))
                assert na.available.all() and nb.available.all()
                da=a.data[ny,nx].astype(np.float64);db=b.data[my,nx].astype(np.float64)
                counts_a=da/na.calibration_nmgy_per_count+na.sky_counts
                counts_b=db/nb.calibration_nmgy_per_count+nb.sky_counts
                va=na.variance_nmgy_squared/na.calibration_nmgy_per_count**2
                vb=nb.variance_nmgy_squared/nb.calibration_nmgy_per_count**2
                # Documented same detector samples; these corrected values need
                # not be equal because field reduction/calibration differ.
                ra,dec=a.wcs.all_pix2world(nx,ny,0);bx,by=b.wcs.all_world2pix(ra,dec,0)
                arrays={'nativeColumns':save_array(out/f'{key_a.split("/")[1]}-{band}-{x}-columns.npy',nx),
                    'rowsA':save_array(out/f'{key_a.split("/")[1]}-{band}-{x}-rows.npy',ny),
                    'countsA':save_array(out/f'{key_a.split("/")[1]}-{band}-{x}-counts-a.npy',counts_a),
                    'countsB':save_array(out/f'{key_a.split("/")[1]}-{band}-{x}-counts-b.npy',counts_b)}
                patches.append({'boundsNativeAExclusive':[x,1390,x+16,1406],
                    'mappedRowsBOffset':-1361,'samples':256,'countsA':stats(counts_a),'countsB':stats(counts_b),
                    'countsDifferenceBMinusA':stats(counts_b-counts_a),
                    'countsBitExact':bool(np.array_equal(counts_a,counts_b)),
                    'countsPearson':float(np.corrcoef(counts_a.ravel(),counts_b.ravel())[0,1]),
                    'calibrationRatioBOverA':stats(nb.calibration_nmgy_per_count/na.calibration_nmgy_per_count),
                    'skyDifferenceBMinusA':stats(nb.sky_counts-na.sky_counts),
                    'countsVarianceRatioBOverA':stats(vb/va),
                    'countsVarianceBitExact':bool(np.array_equal(va,vb)),
                    'linearWcsMappedColumnResidual':stats(bx-nx),
                    'linearWcsMappedRowResidual':stats(by-my),
                    'arrays':arrays})
            # Existing real target demand: measure global CCD-index overlap,
            # not a source registration fit or another full target projection.
            if key_a=='301/3699/6/99':
                py,px=np.mgrid[1984:2017,1952:1985]
            else:py,px=np.mgrid[0:33,352:385]
            ra,dec=target.all_pix2world(px,c['pixels']-1-py,0)
            sx_a,sy_a=a.wcs.all_world2pix(ra,dec,0);sx_b,sy_b=b.wcs.all_world2pix(ra,dec,0)
            joint=source_pixel_stencil(a.data.shape,sx_a,sy_a).geometry.reshape(px.shape)&source_pixel_stencil(b.data.shape,sx_b,sy_b).geometry.reshape(px.shape)
            assert joint.any()
            xa,ya=np.floor(sx_a).astype(int),np.floor(sy_a).astype(int)
            xb,yb=np.floor(sx_b).astype(int),np.floor(sy_b).astype(int)
            xa,ya,xb,yb=(v[joint] for v in (xa,ya,xb,yb))
            stencil_a={(int(y)+a.receipt['identity']['field']*1361,int(x)) for x,y in zip(np.concatenate([xa,xa+1,xa,xa+1]).ravel(),np.concatenate([ya,ya,ya+1,ya+1]).ravel())}
            stencil_b={(int(y)+b.receipt['identity']['field']*1361,int(x)) for x,y in zip(np.concatenate([xb,xb+1,xb,xb+1]).ravel(),np.concatenate([yb,yb,yb+1,yb+1]).ravel())}
            records.append({'a':key_a,'b':key_b,'band':band,'oldReceiptExact':True,
                'cameraA':asdict(cameras[0]),'cameraB':asdict(cameras[1]),'patches':patches,
                'targetDemand':{'boundsXYExclusive':[int(px.min()),int(py.min()),int(px.max()+1),int(py.max()+1)],
                    'globalCcdIndexDefinition':'(run, camcol, band, column, row + field*1361); same rerun, relative row origin only',
                    'aNativeIndexCount':len(stencil_a),'bNativeIndexCount':len(stencil_b),
                    'sharedNativeIndexCount':len(stencil_a&stencil_b),
                    'jointCompleteSourceGeometryPixels':int(joint.sum()),
                    'columnCoordinateDifferenceBMinusA':stats(sx_b-sx_a),
                    'globalRowCoordinateDifferenceBMinusA':stats(sy_b+1361-sy_a)},
                'meaning':'Official same-scan CCD overlap identity under relative row convention; calibrated reductions/statistical estimates not exact raw-pixel or full covariance equality. Native patches may have processing flags; no quality selection or adopted filtering.'})
            print(key_a,key_b,band,'shared',records[-1]['targetDemand']['sharedNativeIndexCount'],
                  'count medians',[round(p['countsDifferenceBMinusA']['median'],8) for p in patches],flush=True)
            del frames,a,b
    # Source identities must distinguish physically separate runs and bands.
    assert (3699,6,'r',100*1361,500)!=(3716,6,'r',100*1361,500)
    assert (3699,6,'g',100*1361,500)!=(3699,6,'r',100*1361,500)
    after=[bound(p) for p in paths];assert after==before;save(out/'inputs-after.json',after)
    report={'scope':__doc__,'sourceUrls':{'geometry':'https://www.sdss4.org/dr17/imaging/imaging_basics/',
        'resolve':'https://www.sdss4.org/dr17/algorithms/resolve/',
        'duplicateObservation':'https://voyages.sdss.org/help/skyserver-navigate/fields/'},
        'records':records,'sourceRequests':0,'fullMatrixRuns':0,'inputsUnchanged':True,
        'identityControls':{'differentRunsDistinct':True,'differentBandsDistinct':True},
        'independentReview':'MISSING','coaddCovarianceAcceptance':'UNVERIFIED','adopted':False}
    save(out/'result.json',report);print(json.dumps(bound(out/'result.json')))


if __name__=='__main__':main()
