"""Saved Wiener trial via NumPy FFT and explicit real-neighborhood products.

No Photutils, producer, detector, fitter, scipy convolution/filter imports.
Independent arithmetic path, not an independent reviewer.
"""
from pathlib import Path
import json,hashlib,sys,time
ROOT=Path(__file__).resolve().parents[4]
sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from PIL import Image
OUT=ROOT/'output/mature-psf-matching-1003-r1'
def bind(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for v in iter(lambda:f.read(1024*1024),b''):h.update(v)
    return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}
def main():
    start=time.perf_counter();report=json.loads((OUT/'result.json').read_bytes());assert bind(OUT/'result.json')['sha256']=='111bf76315875abba36467c34627a2ff50d3a1e79e1f59757dd27c0277f1d5b3'
    before=json.loads((OUT/'inputs-before.json').read_bytes());assert before==json.loads((OUT/'inputs-after.json').read_bytes())
    for v in before:assert bind(ROOT/v['path'])==v
    d=json.loads((ROOT/'output/shared-adaptive-flag-recovery-1003-r2/candidate/candidate.json').read_bytes())['levels']['DETAIL']
    current=np.asarray(Image.open(ROOT/'output/shared-adaptive-flag-recovery-1003-r2/candidate'/d['file']).convert('RGBA'))
    records=[];max_fft=max_real=0.;asymmetric_difference=0.;constant_error=0.
    for row in report['records']:
        assert bind(ROOT/row['saved']['path'])==row['saved']
        with np.load(ROOT/row['saved']['path'],allow_pickle=False) as z:a={k:z[k] for k in z.files}
        target=a['target_psf'];psfs=a['source_psfs'];kernels=a['kernels']
        # Separate implementation of the documented scalar Wiener equation.
        target_fft=np.fft.fft2(target)
        for src,k in zip(psfs,kernels):
            otf=np.fft.fft2(src);power=np.abs(otf)**2;ratio=target_fft*np.conj(otf)/(power+1e-4*power.max())
            expected=np.fft.fftshift(np.fft.ifft2(ratio)).real;expected/=expected.sum()
            delta=float(np.abs(expected-k).max());assert delta<2e-15;max_fft=max(max_fft,delta)
        windows=np.lib.stride_tricks.sliding_window_view(a['halo'],(31,31),axis=(1,2))
        convolution=np.einsum('bijkl,bkl->bij',windows,kernels[:,::-1,::-1],optimize=False)
        admitted=np.lib.stride_tricks.sliding_window_view(a['halo_eligible'],(31,31)).all(axis=(-1,-2))
        assert np.array_equal(admitted,a['admitted']);expected=a['original'].copy();expected[:,admitted]=convolution[:,admitted].astype(np.float32)
        # Direct dot vs scipy reduction ordering can differ before rounding.
        assert np.array_equal(expected,a['matched']);max_real=max(max_real,float(np.abs(convolution[:,admitted]-a['matched'][:,admitted]).max()))
        assert np.array_equal(a['matched'][:,~admitted],a['original'][:,~admitted])
        wrong=np.einsum('bijkl,bkl->bij',windows,kernels.transpose(0,2,1)[:,::-1,::-1],optimize=False)
        asymmetric_difference=max(asymmetric_difference,float(np.abs(wrong[:,admitted]-convolution[:,admitted]).max()))
        # Numeric negative/zero constants only; actual sampled cuts have no
        # negative source data. These are not astronomical generated inputs.
        for value in (-2.,0.):
            negative=np.einsum('bijkl,bkl->bij',np.full((3,1,1,31,31),value),kernels[:,::-1,::-1],optimize=False)
            constant_error=max(constant_error,float(np.abs(negative-value).max()))
        assert constant_error<1e-13
        x0,y0,x1,y1=row['boundsXYExclusive'];bx,by,_,_=d['crop']['boundsXYExclusive']
        saved_current=current[y0-by:y1-by,x0-bx:x1-bx]
        assert np.array_equal(saved_current[:,:,:3],a['rgb_current']);assert np.array_equal(saved_current[:,:,3],a['alpha']*255)
        yy,xx=np.mgrid[-30:31,-30:31];core=xx*xx+yy*yy<=12**2
        # Omitting the qualifier admits actual refused support. Its output
        # would visibly change original-held samples, not simply count them.
        refused_change=int(np.any(convolution.astype(np.float32)!=a['original'],axis=0)[~admitted].sum())
        assert refused_change==int((~admitted).sum())
        records.append({'location':row['sourceLocation'],'anchorAdmitted':bool(admitted[30,30]),'radius12Admitted':int((core&admitted).sum()),
            'radius12Total':int(core.sum()),'unsupportedPixelsKeptExact':int((~admitted).sum()),'qualificationOmissionWouldChangeHeldPixels':refused_change,
            'savedCurrentDetailRgbAndAlphaExact':True,'actualNegativeSamples':int((a['halo']<0).sum())})
    assert asymmetric_difference>1e-3
    output={'records':records,'inputPinsExact':len(before),'maximumIndependentFFTKernelDifference':max_fft,'maximumDirectConvolutionToFloat32Difference':max_real,
        'wrongAxisKernelChangesActualScience':asymmetric_difference,'negativeAndZeroNumericConstantError':constant_error,
        'elapsedSeconds':time.perf_counter()-start,'arithmetic':'PASS','quality':'UNVERIFIED','independentReview':'MISSING','adopted':False,
        'limits':'Only two local constant-model trials. Complete image quality not established; partial spatial admission does not establish one common PSF for the entire cut.'}
    folder=OUT/'readback';folder.mkdir(exist_ok=False);(folder/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    with (folder/'result.json').open('x',encoding='utf-8') as f:json.dump(output,f,indent=2,allow_nan=False);f.write('\n')
    print(json.dumps(output),flush=True)
if __name__=='__main__':main()
