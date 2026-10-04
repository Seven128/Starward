"""Read saved display-estimate outputs and actual Scene pixels, without reruns."""
from pathlib import Path
import hashlib
import json
import math
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
TRIAL = ROOT / 'output/prepared-source-masked-background-1004-r1'
SCENE = ROOT / 'output/playwright/cloud-sky-prepared-display-background-1004-r1'
QUALITY = ROOT / 'output/noirlab-prepared-wide-quality-1004-r1/noao-m81m82'
PUBLICATION = ROOT / 'output/noirlab-prepared-wide-publication-1004-r1/noao-m81m82'
OUT = ROOT / 'output/prepared-display-background-readback-1004-r1'
sys.path[:0] = [str(ROOT/'output/allwise-w3-atlas-0929/python-deps'), str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image, ImageDraw
from sdss_gri_tan import premultiplied_rgba_box


def bind(p):
    raw = p.read_bytes()
    return {'path': p.relative_to(ROOT).as_posix(), 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest()}


def exact(identity):
    p = (ROOT/identity['path']).resolve()
    raw = p.read_bytes()
    return len(raw) == identity['bytes'] and hashlib.sha256(raw).hexdigest() == identity['sha256']


def save(name, value):
    with (OUT/name).open('x', encoding='utf-8') as f:
        f.write(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False)+'\n')


def source_sample(image, field, view_field):
    # Independent centered-camera simplification already established by the
    # preceding actual Scene reader, generalized only to the three new views.
    y, x = np.mgrid[:844, :390]
    scale = 844/(2*math.tan(view_field*math.pi/720))
    px, py = (x+.5-195)/scale, (422-y-.5)/scale
    denominator = (1-px*px-py*py)*math.tan(math.radians(field)/2)
    u, v = .5+px/denominator, .5-py/denominator
    inside = (u >= 0) & (u <= 1) & (v >= 0) & (v <= 1)
    sx, sy = u*512-.5, v*512-.5
    x0, y0 = np.floor(sx).astype(int), np.floor(sy).astype(int)
    wx, wy = sx-x0, sy-y0
    rgb = image[:, :, :3].astype(np.float64)/255
    sample = np.zeros((844, 390, 3), dtype=np.float64)
    for dx, dy, weight in ((0,0,(1-wx)*(1-wy)),(1,0,wx*(1-wy)),(0,1,(1-wx)*wy),(1,1,wx*wy)):
        sample += rgb[np.clip(y0+dy, 0, 511),np.clip(x0+dx, 0, 511)]*weight[:, :, None]
    return sample, inside


def main():
    OUT.mkdir(exist_ok=False)
    (OUT/'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    files = [Path(__file__), TRIAL/'result.json', SCENE/'result.json', PUBLICATION/'manifest.json',
             QUALITY/'master-rgba.npy', TRIAL/'prototype-display-master.npy',
             TRIAL/'encoded-display-background.npy', TRIAL/'background-estimation-mask.npy']
    protected = json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
    files += [ROOT/r['path'] for r in protected]
    for folder in (TRIAL, SCENE):
        a = json.loads((folder/'inputs-before.json').read_bytes())
        assert a == json.loads((folder/'inputs-after.json').read_bytes()) and all(exact(r) for r in a)
        files += [folder/'inputs-before.json',folder/'inputs-after.json']
    source_bindings = json.loads((SCENE/'parsed-inputs.json').read_bytes())
    assert source_bindings == json.loads((SCENE/'parsed-inputs-after.json').read_bytes())
    assert all(exact(r) for r in source_bindings)
    before = [bind(p) for p in files]
    save('inputs-before.json', before)
    trial = json.loads((TRIAL/'result.json').read_bytes())
    scene = json.loads((SCENE/'result.json').read_bytes())
    publication = json.loads((PUBLICATION/'manifest.json').read_bytes())
    assert scene['status'] == 'EXECUTED_SINGLE_SOURCE_DISPLAY_ESTIMATE_SCENE' and len(scene['rows']) == 9
    master = np.load(QUALITY/'master-rgba.npy', allow_pickle=False)
    display = np.load(TRIAL/'prototype-display-master.npy', allow_pickle=False)
    background = np.load(TRIAL/'encoded-display-background.npy', allow_pickle=False)
    mask = np.load(TRIAL/'background-estimation-mask.npy', allow_pickle=False)
    assert master.shape == display.shape == (2048,2048,4) and background.shape == (2048,2048,3)
    assert master.dtype == display.dtype == np.uint8 and mask.shape == (2048,2048) and mask.dtype == bool
    assert np.array_equal(master[:, :, 3], display[:, :, 3]) and int(mask.sum()) == trial['maskPixels']
    # Independent byte-index LUT for the original source, direct scalar branch
    # for the saved floating background. No background fit or model invocation.
    lut = np.array([i/255/12.92 if i/255 <= .04045 else ((i/255+.055)/1.055)**2.4 for i in range(256)])
    b = background/255
    b_linear = np.empty_like(b)
    lo = b <= .04045
    b_linear[lo] = b[lo]/12.92
    b_linear[~lo] = ((b[~lo]+.055)/1.055)**2.4
    remaining = lut[master[:, :, :3]]-b_linear
    assert (remaining < 0).sum(axis=(0,1)).tolist() == trial['clippedNegativeLinearChannels']
    remaining = np.maximum(remaining,0)
    lo = remaining <= .0031308
    output = np.empty_like(remaining)
    output[lo] = remaining[lo]*12.92
    output[~lo] = 1.055*remaining[~lo]**(1/2.4)-.055
    expected = np.rint(np.clip(output*255,0,255)).astype(np.uint8)
    assert np.array_equal(display[:, :, :3], expected)
    del background,b,b_linear,remaining,output,expected,lo
    product_rows = []
    for product in trial['products']:
        x0,y0,x1,y1 = product['boundsXYExclusive']
        expected = premultiplied_rgba_box(display[y0:y1,x0:x1],product['boxFactor'])
        original = premultiplied_rgba_box(master[y0:y1,x0:x1],product['boxFactor'])
        assert exact(product['png'])
        with Image.open(ROOT/product['png']['path']) as image:
            rgba = np.array(image.convert('RGBA'))
        assert np.array_equal(rgba,expected) and np.array_equal(rgba[:, :, 3],original[:, :, 3])
        product_rows.append({'level': product['level'], 'pngExact': True, 'sameDerivedMasterTierExact': True,
                             'geometricAlphaExact': True, 'originalHashRetained': True})
    del display,master
    comparisons = []
    contact_images = {}
    for level in ('OVERVIEW','MEDIUM','DETAIL'):
        contact_images[level] = Image.new('RGB',(3*390+20,844+46),(18,18,18))
    for row in scene['rows']:
        name, level = row['condition']['name'], row['condition']['level']
        raw = (SCENE/(name+'.rgba')).read_bytes()
        bg = (SCENE/(name+'-baseline.rgba')).read_bytes()
        assert len(raw) == row['rgba']['bytes'] and hashlib.sha256(raw).hexdigest() == row['rgba']['sha256']
        assert len(bg) == row['baseline']['bytes'] and hashlib.sha256(bg).hexdigest() == row['baseline']['sha256']
        png = SCENE/(name+'.png')
        assert bind(png)['sha256'] == row['png']['sha256']
        actual = np.frombuffer(raw,dtype=np.uint8).reshape(844,390,4)[::-1]
        baseline = np.frombuffer(bg,dtype=np.uint8).reshape(844,390,4)[::-1]
        with Image.open(png) as image:
            assert np.array_equal(np.array(image.convert('RGBA')),actual)
        assert row['completion'] is None and row['substitutions'] == 1
        assert row['textureObjects']['created'] == row['textureObjects']['deleted'] and row['liveTextureObjects'] == 0
        product = next(p for p in trial['products'] if p['level'] == level)
        with Image.open(ROOT/product['png']['path']) as image:
            raster = np.array(image.convert('RGBA'))
        original_file = PUBLICATION/publication['levels'][level]['file']
        with Image.open(original_file) as image:
            original = np.array(image.convert('RGBA'))
        field = publication['levels'][level]['fieldDegrees']
        source,inside = source_sample(raster,field,row['condition']['viewFieldDegrees'])
        previous_source,_ = source_sample(original,field,row['condition']['viewFieldDegrees'])
        outside = ~inside
        assert np.array_equal(actual[outside],baseline[outside])
        background_rgb = baseline[:, :, :3].astype(np.float64)/255
        prediction = source + background_rgb*(1-np.max(source,axis=2)[:, :, None])
        old_prediction = previous_source + background_rgb*(1-np.max(previous_source,axis=2)[:, :, None])
        predicted = np.rint(np.clip(prediction*255,0,255)).astype(np.uint8)
        predicted_old = np.rint(np.clip(old_prediction*255,0,255)).astype(np.uint8)
        difference = np.abs(actual[:, :, :3].astype(np.int16)-predicted.astype(np.int16))[inside]
        counterfactual = np.abs(actual[:, :, :3].astype(np.int16)-predicted_old.astype(np.int16))[inside]
        assert float(difference.mean()) < float(counterfactual.mean()), 'old-raster counterfactual must be worse'
        ys,xs = np.where(inside)
        x0,y0,x1,y1 = int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)
        edge = np.zeros(inside.shape,dtype=bool)
        edge[y0:y0+4,x0:x1] = True; edge[y1-4:y1,x0:x1] = True
        edge[y0:y1,x0:x0+4] = True; edge[y0:y1,x1-4:x1] = True
        delta = actual[:, :, :3].astype(np.int16)-baseline[:, :, :3].astype(np.int16)
        comparison = {'name':name,'level':level,'scenePngRgbaExact':True,'outsideGeometricCropExact':True,
                      'modeledCropBoundsXYExclusive':[x0,y0,x1,y1],
                      'insidePixels':int(inside.sum()),
                      'edgeMedianAbsDeltaRgb':np.median(np.abs(delta[edge]),axis=0).tolist(),
                      'edgeP90MaxAbsDeltaChannel':float(np.percentile(np.max(np.abs(delta[edge]),axis=1),90)),
                      'analyticStockBlendMeanAbsBytes':float(difference.mean()),
                      'analyticStockBlendP99MaxChannelBytes':float(np.percentile(np.max(difference,axis=1),99)),
                      'analyticStockBlendMaxChannelBytes':int(difference.max()),
                      'oldRasterCounterfactualMeanAbsBytes':float(counterfactual.mean()),
                      'finalVisibleSourceCredit':'UNKNOWN_BY_EXPLICIT_PROTOTYPE_SCOPE'}
        comparisons.append(comparison)
        image = contact_images[level]
        at = {'night':0,'twilight':1,'day':2}[row['condition']['phase']]
        ImageDraw.Draw(image).text((10+at*390,6),level+' '+row['condition']['phase']+' display estimate',fill='white')
        image.paste(Image.fromarray(actual[:, :, :3]),(10+at*390,26))
    contacts = []
    for level,image in contact_images.items():
        ImageDraw.Draw(image).text((10,872),'Current software Scene. Derived display raster only; final source UNKNOWN. Original geometry alpha, no feather; not adoption/native.',fill='white')
        p = OUT/(level.lower()+'-night-twilight-day-scene-contact.png')
        image.save(p);contacts.append(bind(p))
    assert before == [bind(p) for p in files]
    save('inputs-after.json',[bind(p) for p in files])
    result = {'status':'SAVED_DISPLAY_MASTER_TIERS_AND_SCENE_READ_BACK','fullDerivedRgbFormulaExact':True,
              'fullOriginalGeometryAlphaExact':True,'products':product_rows,'comparisons':comparisons,'sceneContacts':contacts,
              'meshesWithNonzeroSamples':{m['channel']:int((np.asarray(m['remainingMeshPixelCounts'])>0).sum()) for m in trial['meshes']},
              'sceneReruns':0,'originalJpegDecodes':0,'backgroundFits':0,'rgbReprojections':0,'publicationWrites':0,
              'limits':'Byte/model/root readback is development only. Faint-content classification, independently reviewed background suitability, high-resolution supply, full Prepared display publication/source facts, WEAPP/phones, physical resource peak, mixed 200DAU cost/capacity and final quality remain unverified.'}
    save('result.json',result)
    print(json.dumps({'status':result['status'],'comparisons':comparisons,'meshesWithNonzeroSamples':result['meshesWithNonzeroSamples']}))


if __name__ == '__main__':
    main()
