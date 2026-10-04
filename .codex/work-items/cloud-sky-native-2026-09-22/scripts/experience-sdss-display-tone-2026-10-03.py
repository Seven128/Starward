"""One published display-transfer hypothesis on saved estimates, no new filter.

Standard sRGB-shaped OETF is a diagnostic monotone tone alternative only:
Lupton amplitudes are not established physical linear sRGB. No double encoding,
source gamma assumption, sky/gain/PSF correction or ordinary adoption claimed.
"""
import importlib.util
import argparse
import io
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image,ImageDraw
from astropy.visualization import ManualInterval,LuptonAsinhStretch,make_lupton_rgb
from sdss_gri_tan import BANDS,LEVELS,coherent_box_means
spec=importlib.util.spec_from_file_location('prior_binding',TASK/'scripts/experience-sdss-local-overlap-diagnosis-2026-10-02.py')
local=importlib.util.module_from_spec(spec);spec.loader.exec_module(local)
bound,save=local.bound,local.save


def oetf(values):
    return np.where(values<=.0031308,12.92*values,1.055*values**(1/2.4)-.055)


def rgb(values,recipe):
    # Match the current shared display boundary's float32 input sanitation.
    values={b:values[b].astype(np.float32) for b in BANDS}
    return make_lupton_rgb(values['i'],values['r'],values['g'],interval=ManualInterval(vmin=0,vmax=None),
        stretch_object=LuptonAsinhStretch(stretch=recipe['stretch'],Q=recipe['Q']),output_dtype=np.float64)


def stats(image):
    return {'meanRGB':image.mean(axis=(0,1)).tolist(),'nonblackPixels':int(np.any(image!=0,axis=2).sum()),
        'redMinusGreenStd':float((image[:,:,0].astype(float)-image[:,:,1]).std()),
        'blueMinusGreenStd':float((image[:,:,2].astype(float)-image[:,:,1]).std())}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',default='sdss-display-tone-1003-r1');args=parser.parse_args()
    assert Path(args.output).name==args.output and args.output.startswith('sdss-display-tone-1003-r')
    out=ROOT/'output'/args.output;out.mkdir(exist_ok=False)
    cp=ROOT/'output/shared-noise-display-1003-r1/candidate/candidate.json'
    mp=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json'
    wp=ROOT/'output/science-colour-width-1003-r1/result.json'
    assert bound(cp)['sha256']=='0dc8f1d5a6a82e1cfa50709832123a3e3982b76e3b73b4bc3d228f600fcd65c5'
    assert bound(mp)['sha256']=='73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52'
    assert bound(wp)['sha256']=='e9d2d90ba2ba8b0d6e6fab0f6c72f52301fcfed142396ce7b9ef674906dcf665'
    c=json.loads(cp.read_bytes());m=json.loads(mp.read_bytes());w=json.loads(wp.read_bytes());recipe=c['sourceResolvedRecipe']
    paths=[Path(__file__),Path(local.__file__),cp,mp,wp,ROOT/'data-pipelines/deep-sky/sdss_gri_tan.py',
        ROOT/'output/allwise-w3-atlas-0929/python-deps/astropy/visualization/lupton_rgb.py',
        ROOT/'output/sdss-display-flow-1003-r1/FITS2JPEG3.jpg',ROOT/'output/sdss-display-flow-1003-r1/receipt.json']
    def load(meta,base):
        p=base/meta['file'];assert bound(p)['sha256']==meta['sha256'];paths.append(p);return np.load(p,mmap_mode='r',allow_pickle=False)
    estimates={b:load(c['arrays'][b],cp.parent) for b in BANDS}
    joint=load(m['arrays']['joint-availability'],mp.parent)
    for p in json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes()):
        path=ROOT/p['path'];assert bound(path)['sha256']==p['sha256'];paths.append(path)
    # Bind originals before all new calculations, not to an invented source.
    for level in LEVELS:
        paths.append(cp.parent/c['levels'][level]['file'])
        paths.append(ROOT/'workers/miniapp-api/assets/deep-sky/sdss-m51'/('M-51-'+level.lower()+'.jpg'))
    for point in w['compactPeakRecords']:paths.append(ROOT/point['science']['path'])
    before=[bound(path) for path in paths];save(out/'inputs-before.json',before)
    sheet=Image.new('RGB',(1536,3*538),(18,18,18));draw=ImageDraw.Draw(sheet);levels={}
    for at,level in enumerate(LEVELS):
        meta=c['levels'][level];x0,y0,x1,y1=meta['crop']['boundsXYExclusive'];factor=meta['crop']['boxFactor']
        crop=(slice(y0,y1),slice(x0,x1));means,counts=coherent_box_means({b:estimates[b][crop] for b in BANDS},joint[crop],factor)
        floating=rgb(means,recipe);baseline=(floating*255).astype(np.uint8)
        original=np.asarray(Image.open(cp.parent/meta['file']))
        assert np.array_equal(baseline,original[:,:,:3]),'float dtype baseline must match actual original PNG'
        toned=(oetf(floating)*255).astype(np.uint8)
        alpha=np.rint(counts.astype(float)*255/(factor*factor)).astype(np.uint8)
        assert np.array_equal(alpha,original[:,:,3])
        payload=np.dstack([toned,alpha]);path=out/(level.lower()+'-tone.png');Image.fromarray(payload).save(path)
        legacy=np.asarray(Image.open(ROOT/'workers/miniapp-api/assets/deep-sky/sdss-m51'/('M-51-'+level.lower()+'.jpg')))
        draw.text((4,at*538+4),level+': current candidate / one OETF tone diagnostic / original official JPEG',fill='white')
        for col,im in enumerate((baseline,toned,legacy)):sheet.paste(Image.fromarray(im),(col*512,at*538+24))
        levels[level]={'tone':bound(path),'original':bound(cp.parent/meta['file']),'baselineExact':True,'alphaExact':True,
            'originalStats':stats(baseline),'toneStats':stats(toned),'officialStats':stats(legacy),
            'changedRgbPixels':int(np.any(toned!=baseline,axis=2).sum())}
    sheet.save(out/'three-level-tone-and-official-comparison.png')
    # A previously qualified outer diagnostic site only; never a full sky fit.
    crop=(slice(1984,2017),slice(1952,1985));outer={b:estimates[b][crop] for b in BANDS}
    old_float=rgb(outer,recipe);outer_result={'boundsXYExclusive':[1952,1984,1985,2017],
        'original':stats((old_float*255).astype(np.uint8)),'tone':stats((oetf(old_float)*255).astype(np.uint8)),
        'meaning':'Current coadd display estimates at one established diagnostic site; not whole sky/noise or calibrated physical background.'}
    # Published saturation recipe acts only on true saturated pixels above
    # the transfer's common intensity upper boundary, not code255 by itself.
    intensity_upper=recipe['stretch']/recipe['Q']*np.sinh(np.arcsinh(.1*recipe['Q'])/.1)
    peak_records=[]
    for point in w['compactPeakRecords']:
        path=ROOT/point['science']['path'];assert bound(path)['sha256']==point['science']['sha256']
        values=np.load(path,allow_pickle=False);intensity=values.astype(float).mean(axis=0)
        peak_records.append({'id':point['id'],'meanIntensityMaximum':float(intensity.max()),
            'aboveCommonTransferUpper':int((intensity>intensity_upper).sum()),'coreFlags':point['coreFlags']})
    controls=[]
    for value in (0.,.0001,.02,-.02):
        actual=rgb({b:np.full((8,8),value) for b in BANDS},recipe)
        controls.append({'signedConstant':value,'baselineRgb':(actual[0,0]*255).astype(np.uint8).tolist(),
            'toneRgb':(oetf(actual[0,0])*255).astype(np.uint8).tolist()})
    # No spatial operator: strong adjacent red/blue remains unmixed. This says
    # nothing about accurate colours of weak objects or physically linear light.
    edge={b:np.zeros((8,8)) for b in BANDS};edge['i'][:,:4]=.2;edge['g'][:,4:]=.2
    actual=rgb(edge,recipe);toned=oetf(actual)
    assert not toned[:,:4,1:].any() and not toned[:,4:,:2].any()
    axis=np.linspace(0,1,65536);mapped=oetf(axis)
    assert mapped[0]==0 and np.isclose(mapped[-1],1) and (np.diff(mapped)>=0).all()
    after=[bound(path) for path in paths];assert after==before
    save(out/'inputs-after.json',after);(out/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    result={'scope':__doc__,'recipe':recipe,'curve':{'kind':'standard-sRGB-shaped OETF diagnostic only','parameters':'fixed published piecewise transfer, no sweep',
        'notEstablished':'Lupton amplitudes are not established physical linear sRGB; no missing-gamma correction certified.'},
        'levels':levels,'outer':outer_result,'saturationUpperInputIntensity':float(intensity_upper),'compactPeaks':peak_records,
        'controls':controls,'strongEdgeUnmixed':True,'curveMonotone':True,'blackExact':True,'inputBindingsExact':True,
        'filterRuns':0,'statisticalFitCalls':0,'scienceRequests':0,
        'diagramReceipt':bound(ROOT/'output/sdss-display-flow-1003-r1/receipt.json'),
        'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    save(out/'result.json',result);print(json.dumps({'result':bound(out/'result.json'),'outer':outer_result,
        'upper':result['saturationUpperInputIntensity'],'peaks':[{k:v for k,v in r.items() if k!='coreFlags'} for r in peak_records],'controls':controls}))


if __name__=='__main__':main()
