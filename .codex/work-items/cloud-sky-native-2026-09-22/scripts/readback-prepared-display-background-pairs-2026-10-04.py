"""Read matched policy/pan Scene pairs; no rendering, fitting or source decode."""
from pathlib import Path
import hashlib
import json
import math
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
SCENE = ROOT/'output/playwright/cloud-sky-prepared-display-background-pairs-1004-r1'
TRIAL = ROOT/'output/prepared-source-masked-background-1004-r1'
PUBLICATION = ROOT/'output/noirlab-prepared-wide-publication-1004-r1/noao-m81m82'
OUT = ROOT/'output/prepared-display-background-pairs-readback-1004-r1'
sys.path[:0] = [str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from PIL import Image, ImageDraw


def bind(p):
    raw = p.read_bytes()
    return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}


def save(name,value):
    with (OUT/name).open('x',encoding='utf-8') as f:
        f.write(json.dumps(value,ensure_ascii=False,indent=2,allow_nan=False)+'\n')


def check(identity):
    raw = (ROOT/identity['path']).resolve().read_bytes()
    return len(raw) == identity['bytes'] and hashlib.sha256(raw).hexdigest() == identity['sha256']


def sample(image, field, view_field, north_offset):
    # Independent TAN plane dotted with the current stereographic ray, for
    # the identity observation and fixed RA/zero-roll north pan used here.
    y,x = np.mgrid[:844,:390]
    scale = 844/(2*math.tan(view_field*math.pi/720))
    px,py = (x+.5-195)/scale,(422-y-.5)/scale
    r2 = px*px+py*py
    delta = math.radians(north_offset)
    denominator = (1-r2)*math.cos(delta)-2*py*math.sin(delta)
    north = (1-r2)*math.sin(delta)+2*py*math.cos(delta)
    half = math.tan(math.radians(field)/2)
    u,v = .5+px/(half*denominator),.5-north/(2*half*denominator)
    inside = (denominator>0)&(u>=0)&(u<=1)&(v>=0)&(v<=1)
    sx,sy = u*512-.5,v*512-.5
    x0,y0 = np.floor(sx).astype(int),np.floor(sy).astype(int)
    wx,wy = sx-x0,sy-y0
    rgb = image[:,:,:3].astype(np.float64)/255
    result = np.zeros((844,390,3),dtype=np.float64)
    for dx,dy,weight in ((0,0,(1-wx)*(1-wy)),(1,0,wx*(1-wy)),(0,1,(1-wx)*wy),(1,1,wx*wy)):
        result += rgb[np.clip(y0+dy,0,511),np.clip(x0+dx,0,511)]*weight[:,:,None]
    return result,inside


def rgba(path):
    return np.frombuffer(path.read_bytes(),dtype=np.uint8).reshape(844,390,4)[::-1]


def main():
    OUT.mkdir(exist_ok=False)
    (OUT/'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    original_bindings = json.loads((SCENE/'inputs-before.json').read_bytes())
    assert original_bindings == json.loads((SCENE/'inputs-after.json').read_bytes()) and all(check(r) for r in original_bindings)
    parsed = json.loads((SCENE/'parsed-inputs.json').read_bytes())
    assert parsed == json.loads((SCENE/'parsed-inputs-after.json').read_bytes()) and all(check(r) for r in parsed)
    scene = json.loads((SCENE/'result.json').read_bytes())
    trial = json.loads((TRIAL/'result.json').read_bytes())
    publication = json.loads((PUBLICATION/'manifest.json').read_bytes())
    assert scene['status'] == 'EXECUTED_SINGLE_SOURCE_DISPLAY_ESTIMATE_SCENE' and len(scene['rows']) == 3
    products = {}
    for product in trial['products']:
        assert check(product['png'])
        with Image.open(ROOT/product['png']['path']) as im:
            proto = np.array(im.convert('RGBA'))
        descriptor = publication['levels'][product['level']]
        old_path = PUBLICATION/descriptor['file']
        assert bind(old_path)['sha256'] == descriptor['sha256']
        with Image.open(old_path) as im:
            old = np.array(im.convert('RGBA'))
        assert (old[:,:,3] == 255).all() and np.array_equal(old[:,:,3],proto[:,:,3])
        products[product['level']] = (proto,old)
    comparisons = []
    for row in scene['rows']:
        c = row['condition']; name,level,parent = c['name'],c['level'],c['coarser']
        actual,baseline,old_actual = [rgba(SCENE/(name+suffix+'.rgba')) for suffix in ('','-baseline','-original')]
        assert hashlib.sha256((SCENE/(name+'.rgba')).read_bytes()).hexdigest() == row['rgba']['sha256']
        assert hashlib.sha256((SCENE/(name+'-baseline.rgba')).read_bytes()).hexdigest() == row['baseline']['sha256']
        for suffix,pixels in (('',actual),('-baseline',baseline),('-original',old_actual)):
            with Image.open(SCENE/(name+suffix+'.png')) as image:
                assert np.array_equal(np.array(image.convert('RGBA')),pixels)
        assert row['completion'] is None and row['substitutions'] == (2 if parent else 1)
        assert row['textureObjects']['created'] == row['textureObjects']['deleted'] and row['liveTextureObjects'] == 0
        fine,fine_inside = sample(products[level][0],publication['levels'][level]['fieldDegrees'],c['viewFieldDegrees'],c['cameraNorthOffsetDegrees'])
        old_fine,_ = sample(products[level][1],publication['levels'][level]['fieldDegrees'],c['viewFieldDegrees'],c['cameraNorthOffsetDegrees'])
        source = np.zeros_like(fine); old_source = np.zeros_like(fine)
        source[fine_inside] = fine[fine_inside]; old_source[fine_inside] = old_fine[fine_inside]
        parent_selected = np.zeros_like(fine_inside)
        seam = np.zeros_like(fine_inside)
        if parent:
            coarse,coarse_inside = sample(products[parent][0],publication['levels'][parent]['fieldDegrees'],c['viewFieldDegrees'],c['cameraNorthOffsetDegrees'])
            old_coarse,_ = sample(products[parent][1],publication['levels'][parent]['fieldDegrees'],c['viewFieldDegrees'],c['cameraNorthOffsetDegrees'])
            parent_selected = ~fine_inside&coarse_inside
            assert fine_inside.any() and parent_selected.any()
            source[parent_selected] = coarse[parent_selected]; old_source[parent_selected] = old_coarse[parent_selected]
            # Four pixels just inside a real fine boundary, restricted to true
            # parent support. This is not a blank-sky or confidence selection.
            padded = np.pad(fine_inside,4)
            interior = fine_inside.copy()
            for dy,dx in ((-4,0),(4,0),(0,-4),(0,4)):
                interior &= padded[4+dy:848+dy,4+dx:394+dx]
            seam = fine_inside&~interior&coarse_inside
            mismatch = np.abs(fine[seam]-coarse[seam])*255
            assert seam.any()
            seam_metrics = {'pixels':int(seam.sum()),'samePixelFineCoarseMedianAbsRgbBytes':np.median(mismatch,axis=0).tolist(),
                            'samePixelFineCoarseP90MaxRgbBytes':float(np.percentile(np.max(mismatch,axis=1),90)),
                            'limits':'Actual LOD sampling differences, including stars/structure; not an instrumental seam classification.'}
        else:
            seam_metrics = {'pixels':0,'limits':'No parent in OVERVIEW; no internal fine/coarse seam claim.'}
        available = fine_inside|parent_selected
        assert available.any()
        bg = baseline[:,:,:3].astype(np.float64)/255
        predicted = np.rint(np.clip((source+bg*(1-np.max(source,axis=2)[:,:,None]))*255,0,255)).astype(np.uint8)
        predicted_old = np.rint(np.clip((old_source+bg*(1-np.max(old_source,axis=2)[:,:,None]))*255,0,255)).astype(np.uint8)
        difference = np.abs(actual[:,:,:3].astype(np.int16)-predicted.astype(np.int16))[available]
        old_difference = np.abs(old_actual[:,:,:3].astype(np.int16)-predicted_old.astype(np.int16))[available]
        wrong_old_raster = np.abs(actual[:,:,:3].astype(np.int16)-predicted_old.astype(np.int16))[available]
        assert difference.mean() < wrong_old_raster.mean()
        outside = ~available
        if outside.any():
            assert np.array_equal(actual[outside],baseline[outside])
        changed = int((actual[:,:,:3] != old_actual[:,:,:3]).any(axis=2).sum())
        assert changed == row['changedFromReference'] and changed > 1000
        sheet = Image.new('RGB',(800,892),(18,18,18))
        draw = ImageDraw.Draw(sheet)
        draw.text((10,5),level+' '+str(parent)+' ORIGINAL CURRENT POLICY/PAN',fill='white')
        draw.text((410,5),'SAME SOURCE-MASKED DISPLAY ESTIMATE',fill='white')
        sheet.paste(Image.fromarray(old_actual[:,:,:3]),(10,26));sheet.paste(Image.fromarray(actual[:,:,:3]),(410,26))
        draw.text((10,874),'No feather. Same geometry alpha. Prototype final source UNKNOWN. Not full Hook/page/native or publication.',fill='white')
        p = OUT/(name+'-matched-original-vs-estimate.png');sheet.save(p)
        comparisons.append({'condition':c,'scenePngRgbaExact':True,'matchedOriginalPngRgbaExact':True,
                            'fineGeometricPixels':int(fine_inside.sum()),'coarseSelectedGeometricPixels':int(parent_selected.sum()),
                            'outsidePixels':int(outside.sum()),'outsideComparison':'EXACT' if outside.any() else 'NOT_APPLICABLE_NO_OUTSIDE_PIXELS',
                            'actualPrototypeVsAnalyticMeanAbsBytes':float(difference.mean()),
                            'actualPrototypeVsAnalyticP99MaxChannelBytes':float(np.percentile(np.max(difference,axis=1),99)),
                            'actualPrototypeVsAnalyticMaxChannelBytes':int(difference.max()),
                            'matchedOriginalVsAnalyticMeanAbsBytes':float(old_difference.mean()),
                            'wrongOldRasterCounterfactualMeanAbsBytes':float(wrong_old_raster.mean()),
                            'changedFromOriginalPixels':changed,'fineCoarseBoundary':seam_metrics,'contact':bind(p)})
    assert all(check(r) for r in original_bindings+parsed)
    result = {'status':'MATCHED_CURRENT_POLICY_PAN_AND_REAL_ADJACENT_LAYERS_READ_BACK','comparisons':comparisons,
              'sourceRequests':0,'sceneReruns':0,'backgroundFits':0,'originalJpegDecodes':0,'publicationWrites':0,
              'limits':'Three distinct new night policy/pan pairs, not the earlier isolated matrix repeated. Matching original controls still use real original publication. Derived prototypes are unsupported display transforms and have deliberately UNKNOWN final source receipts. Two-slot adjacent layers/current scene/nominal models only; actual Hook/page/outermost retention, complete source publication, weak-content/quality, independent review, native/phones, full resource/cost/capacity and final acceptance remain unverified.'}
    save('result.json',result)
    print(json.dumps({'status':result['status'],'rows':[{k:r[k] for k in ('condition','fineGeometricPixels','coarseSelectedGeometricPixels','outsidePixels','actualPrototypeVsAnalyticP99MaxChannelBytes','actualPrototypeVsAnalyticMaxChannelBytes','fineCoarseBoundary')} for r in comparisons]}))


if __name__ == '__main__':
    main()
