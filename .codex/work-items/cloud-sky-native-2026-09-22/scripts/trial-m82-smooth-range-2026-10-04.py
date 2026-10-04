"""One bounded display trial for the measured hard maxRGB brightness plateau.

Reuses saved frozen Astropy pre-normalization values. C/(1+max(C)) adapts
the global L/(1+L) compression of Reinhard et al. (2002), equation 3, to
the maximum channel, preserving common RGB ratios and bounding all channels.
This is not the paper's complete luminance/exposure/local operator. No new
parameter fit, local adjustment, scientific correction or production adoption.
"""
from pathlib import Path
import sys,json,importlib.util,time
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True;sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from PIL import Image,ImageDraw
spec=importlib.util.spec_from_file_location('range_binding',TASK/'scripts/analyze-m82-fixed-response-shapes-2026-10-04.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);bind,save=m.bind,m.save
SOURCE=ROOT/'output/sdss-m82-visible-causes-readback-1004-r1';OUT=ROOT/'output/sdss-m82-smooth-range-trial-1004-r1'
REFERENCE='https://www-old.cs.utah.edu/docs/techreports/2002/pdf/UUCS-02-001.pdf'

def smooth_common_range(rgb):
    if rgb.ndim!=3 or rgb.shape[0]!=3 or rgb.dtype.kind!='f' or not np.isfinite(rgb).all() or np.any(rgb<0):
        raise ValueError('Display-only finite nonnegative RGB channel-first values required')
    return rgb.astype('f8')/(1+rgb.max(axis=0).astype('f8'))

def regression():
    # The old max-normalization makes same-color bright intensities identical.
    a=np.array([[[1.1,2.2,0.0]],[[.5,1.0,0.0]],[[.25,.5,0.0]]],dtype='f8')
    old=a/np.maximum(1,a.max(axis=0));assert np.array_equal(old[:,0,0],old[:,0,1])
    mapped=smooth_common_range(a);assert mapped[:,0,1].sum()>mapped[:,0,0].sum()
    assert np.array_equal(mapped[:,0,2],np.zeros(3)) and (mapped<1).all() and (mapped>=0).all()
    assert np.allclose(mapped[0,:,0]*a[1,:,0],mapped[1,:,0]*a[0,:,0],rtol=0,atol=np.finfo('f8').eps)
    for wrong in (a+np.nan,-a,a[0],a.astype('i4')):
        try:smooth_common_range(wrong)
        except ValueError:pass
        else:raise AssertionError('Invalid display input accepted')
    return {'failingBeforeHardNormalizationSameColorBrightness':True,'smoothBrightnessOrder':True,'commonColorRatiosZeroBoundsAndInvalidInputs':True}

def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    started=time.perf_counter();checks=regression();pins=[bind(Path(__file__)),bind(Path(m.__file__)),bind(SOURCE/'result.json')]
    result=json.loads((SOURCE/'result.json').read_bytes());records=[];images=[]
    for name in dict.fromkeys(v['name'] for v in result['frozenTransferDiagnostics']):
        entries=[v for v in result['frozenTransferDiagnostics'] if v['name']==name]
        sheet=Image.new('RGB',(768,284*len(entries)),(16,16,16));draw=ImageDraw.Draw(sheet)
        for i,entry in enumerate(entries):
            p=SOURCE/(name+'-'+entry['level']+'-transfer.npz');pins.append(bind(p))
            with np.load(p,allow_pickle=False) as z:v=z['pre_normalization_rgb'];old=z['actual_rgb'];normal=z['normalization_required']
            floating=smooth_common_range(v);rgb=(floating.transpose(1,2,0)*255).astype('u1')
            # Floating zero/chromatic ratios refer to display quantities only;
            # eight-bit quantization may hide arbitrarily small differences.
            assert np.array_equal(np.all(v==0,axis=0),np.all(floating==0,axis=0))
            for j,(label,img) in enumerate((('Current frozen RGB',old),('Smooth common range TRIAL',rgb))):
                sheet.paste(Image.fromarray(img).resize((256,256),Image.Resampling.NEAREST),(256*j,i*284+28))
                draw.text((256*j+4,i*284+3),name+' '+entry['level']+' '+label,fill='white')
            delta=rgb.astype('i2')-old.astype('i2');scale=max(1,int(abs(delta).max()))
            signed=np.zeros((*normal.shape,3),np.uint8);positive=np.maximum(delta,0).max(axis=2);negative=np.maximum(-delta,0).max(axis=2)
            signed[:,:,0]=np.rint(positive*255/scale).astype('u1');signed[:,:,2]=np.rint(negative*255/scale).astype('u1')
            sheet.paste(Image.fromarray(signed).resize((256,256),Image.Resampling.NEAREST),(512,i*284+28))
            draw.text((516,i*284+3),f'Trial-current; red+/blue-; max {scale}',fill='white')
            record={'name':name,'level':entry['level'],'pixels':normal.size,'oldNormalizationPixels':int(normal.sum()),
                'oldAny255':int((old.max(axis=2)==255).sum()),'trialAny255':int((rgb.max(axis=2)==255).sum()),
                'oldMaximumChannelUnique8BitValues':int(len(np.unique(old.max(axis=2)))),'trialMaximumChannelUnique8BitValues':int(len(np.unique(rgb.max(axis=2)))),
                'oldNormalizedSubsetMaximumUnique8BitValues':int(len(np.unique(old.max(axis=2)[normal]))),
                'trialSameSubsetMaximumUnique8BitValues':int(len(np.unique(rgb.max(axis=2)[normal]))),
                'maximumChannelDelta':scale,'meanCurrentRGB':old.astype('f8').mean(axis=(0,1)).tolist(),
                'meanTrialRGB':rgb.astype('f8').mean(axis=(0,1)).tolist()}
            np.savez_compressed(OUT/(name+'-'+entry['level']+'.npz'),input_display_rgb=v,trial_floating_rgb=floating,trial_rgb=rgb,old_rgb=old)
            records.append(record)
        p=OUT/(name+'-actual-trial.png');sheet.save(p);images.append(bind(p))
    assert pins==[bind(ROOT/v['path']) for v in pins]
    report={'scope':__doc__,'reference':REFERENCE,'referenceScope':'Equation 3 global compression concept only. No paper/code/assets copied, no full paper operator or licensing/quality/production adoption claimed.',
        'inputs':pins,'inputsAfterExact':True,'regressions':checks,'records':records,'images':images,'elapsedSeconds':time.perf_counter()-started,
        'scientificOrAvailabilityOrSourceOrRecipeFitChanges':False,'candidateOrPublishedRecipeChanges':False,
        'productionChanges':[],'otherBusinessLogicEdited':False,'quality':'UNVERIFIED_BOUNDED_DISPLAY_TRIAL_ONLY','ordinaryAdoption':False,'independentReview':'MISSING'}
    save(OUT/'result.json',report);print(json.dumps({k:v for k,v in report.items() if k not in ('inputs','records')}),flush=True)
if __name__=='__main__':main()
