"""Inspect actual source supply around the current crop, without reprojecting RGB.

Decode each cached JPEG once through the current bound observation owner.
Use original nominal AVM, original pixels and current source-stencil geometry.
No blank-sky classification, background subtraction, feather or publication.
"""
from pathlib import Path
from dataclasses import asdict
import hashlib
import json
import math
import sys
import time

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
PIPE = ROOT / 'data-pipelines/deep-sky'
SRC = ROOT / 'output/noirlab-prepared-wide-source-1004-r1'
VALID = ROOT / 'output/noirlab-prepared-wide-validation-1004-r1'
QUALITY = ROOT / 'output/noirlab-prepared-wide-quality-1004-r1'
OUT = ROOT / 'output/prepared-native-extent-1004-r1'
sys.path[:0] = [str(PIPE), str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'),
               str(ROOT / 'output/pyavm-metadata-trial-1002-r1/lib')]
import numpy as np
from PIL import Image, ImageDraw
from prepared_rgb_observation import ByteIdentity, PreparedRgbSource, load_prepared_rgb_observation
from sdss_gri_tan import target_tan
from sdss_source_stencil import source_pixel_stencil

CASES = [('noao-m81m82', 'M:82'), ('noao1309a', 'M:51')]

def bind(p):
    raw = p.read_bytes()
    return {'path': p.relative_to(ROOT).as_posix(), 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest()}

def save(name, value):
    raw = json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n'
    with (OUT / name).open('x', encoding='utf-8') as f:
        f.write(raw)

def native_points(source_wcs, center, field, xy, height):
    target = target_tan(center, 2048, field)
    coords = np.asarray(xy, dtype=np.float64)
    ra, dec = target.all_pix2world(coords[:, 0], 2047-coords[:, 1], 0)
    x, y = source_wcs.all_world2pix(ra, dec, 0)
    return np.column_stack((x, height-1-y)), np.column_stack((x,y))

def perimeter():
    v = np.linspace(-.5, 2047.5, 257)
    return np.concatenate((np.column_stack((v, np.full_like(v,-.5))),
                           np.column_stack((np.full_like(v,2047.5),v)),
                           np.column_stack((v[::-1],np.full_like(v,2047.5))),
                           np.column_stack((np.full_like(v,-.5),v[::-1]))))

def bounded_field(source_wcs, center, old_field, shape):
    edge = perimeter()
    def supported(field):
        _top, fits = native_points(source_wcs,center,field,edge,shape[0])
        return bool(source_pixel_stencil(shape,fits[:,0],fits[:,1]).geometry.all())
    assert supported(old_field)
    low,high = old_field,4.
    assert not supported(high)
    # Numeric geometric boundary only, not an adopted display/source budget.
    for _ in range(48):
        mid=(low+high)/2
        if supported(mid): low=mid
        else: high=mid
    top, fits = native_points(source_wcs,center,low,edge,shape[0])
    assert source_pixel_stencil(shape,fits[:,0],fits[:,1]).geometry.all()
    return {'fullSampledPerimeterSupportedFieldDegrees':low,
            'firstUnsupportedFieldDegreesUpperBound':high,
            'sourceTopFirstPerimeter':top.tolist(),
            'qualification':'NOMINAL_AVM_SAMPLED_PERIMETER_GEOMETRY_ONLY',
            'limits':'257 points per side, original TAN/AVM and four-native-neighbor stencil; not scientific mask, absolute astrometry, safe artifact margin or quality acceptance.'}

def main():
    OUT.mkdir(exist_ok=False)
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    files=[Path(__file__)]
    files += [PIPE / name for name in ('prepared_rgb_observation.py','sdss_gri_tan.py','sdss_source_stencil.py')]
    for rid,_ in CASES:
        files += [SRC/(rid+'.jpg'),SRC/(rid+'-embedded-xmp.xml'),
                  VALID/rid/'source-admission.json',QUALITY/rid/'master.json',QUALITY/rid/'master-rgba.npy',
                  QUALITY/rid/'overview.png',QUALITY/rid/'medium.png',QUALITY/rid/'detail.png']
    protected=json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
    files += [ROOT / row['path'] for row in protected]
    before=[bind(p) for p in files]
    save('inputs-before.json',before)
    rows=[]
    for rid,ref in CASES:
        started,cpu = time.perf_counter(),time.process_time()
        admission=json.loads((VALID/rid/'source-admission.json').read_bytes())
        meta=json.loads((QUALITY/rid/'master.json').read_bytes())
        facts=dict(admission['source'])
        facts['jpeg'],facts['xmp']=ByteIdentity(**facts['jpeg']),ByteIdentity(**facts['xmp'])
        # Preserve the historical receipt. This investigation does not silently
        # rewrite its old KPNO/WIYN instrument wording or current publication.
        source=PreparedRgbSource(**facts)
        obs=load_prepared_rgb_observation(SRC/(rid+'.jpg'),SRC/(rid+'-embedded-xmp.xml'),source,
                                         max_encoded_bytes=2*1024*1024,max_decoded_pixels=4000*4000)
        assert json.loads(json.dumps(asdict(obs.geometry)))==meta['sourceGeometry']
        assert hashlib.sha256(obs.rgb_bytes).hexdigest()==meta['sourceRgbSha256']
        raw=obs.rgb_top_first
        h,w=raw.shape[:2]
        source_wcs=obs.geometry.new_wcs()
        field=meta['fieldDegrees']
        actual_perimeter,fits_perimeter=native_points(source_wcs,meta['center'],field,perimeter(),h)
        assert source_pixel_stencil((h,w),fits_perimeter[:,0],fits_perimeter[:,1]).geometry.all()
        maximum=bounded_field(source_wcs,meta['center'],field,(h,w))
        # One marker image, resampled only as a diagnostic; original RGB stays
        # immutable and no marker bytes enter the astronomical data pipeline.
        factor=min(1.,1600/w)
        preview=Image.fromarray(raw).resize((round(w*factor),round(h*factor)))
        draw=ImageDraw.Draw(preview)
        draw.line([tuple(p*factor) for p in actual_perimeter],fill=(255,80,80),width=2)
        draw.line([tuple(np.asarray(p)*factor) for p in maximum['sourceTopFirstPerimeter']],fill=(60,220,255),width=2)
        preview_file=OUT/(rid+'-native-current-red-max-geometric-cyan.png')
        preview.save(preview_file)
        corners,_=native_points(source_wcs,meta['center'],field,[[-.5,-.5],[2047.5,-.5],[2047.5,2047.5],[-.5,2047.5]],h)
        samples=[]
        for side in ('north','east','south','west'):
            for fraction in (.25,.5,.75):
                x,y = {'north':(fraction*2048-.5,-.5),'east':(2047.5,fraction*2048-.5),
                       'south':(fraction*2048-.5,2047.5),'west':(-.5,fraction*2048-.5)}[side]
                top,fits=native_points(source_wcs,meta['center'],field,[[x,y]],h)
                nx,ny=map(int,np.rint(top[0]))
                bounds=[max(0,nx-64),max(0,ny-64),min(w,nx+65),min(h,ny+65)]
                x0,y0,x1,y1=bounds
                patch=np.array(raw[y0:y1,x0:x1],copy=True)
                assert patch.size
                label=side+'-'+str(int(fraction*100))
                file=OUT/(rid+'-'+label+'-native-raw.png')
                Image.fromarray(patch).save(file)
                samples.append({'side':side,'edgeFraction':fraction,'targetPixelTopFirst':[x,y],
                                'nativeNominalFitsXY':fits[0].tolist(),'nativeTopFirstXY':top[0].tolist(),
                                'rawNativeBoundsXYExclusive':bounds,'rgbShape':list(patch.shape),
                                'encodedRgbMedian':np.median(patch,axis=(0,1)).tolist(),
                                'encodedRgbP10':np.percentile(patch,10,axis=(0,1)).tolist(),
                                'encodedRgbP90':np.percentile(patch,90,axis=(0,1)).tolist(),
                                'any255Pixels':int((patch==255).any(axis=2).sum()),
                                'rawRgbSha256':hashlib.sha256(patch.tobytes()).hexdigest(),'png':bind(file),
                                'meaning':'Real native neighborhood on both sides of the old crop edge; not a blank-sky/source/artifact classification.'})
        rows.append({'objectRef':ref,'resourceId':rid,'currentFieldDegrees':field,
                     'currentSourceTopFirstCorners':corners.tolist(),'geometricBound':maximum,
                     'sourceRgbIdentity':{'bytes':len(obs.rgb_bytes),'sha256':meta['sourceRgbSha256']},
                     'diagnosticPreview':bind(preview_file),'edgeNativeWindows':samples,
                     'historicalMetadataWording':'M82 historical source receipt includes KPNO/WIYN 0.9m. Current actual page/evidence identifies KPNO 0.9m Mosaic I; no old bytes/publication rewritten.' if ref=='M:82' else None,
                     'wallSeconds':time.perf_counter()-started,'cpuSeconds':time.process_time()-cpu})
        del obs,raw,preview
    after=[bind(p) for p in files]
    assert before==after and all(bind(ROOT/p['path'])['sha256']==p['sha256'] for p in protected)
    save('inputs-after.json',after)
    result={'status':'INSPECTED_CURRENT_CROP_AND_NATIVE_GEOMETRIC_HEADROOM','rows':rows,
            'sourceRequests':0,'sourceRgbDecodes':2,'rgbReprojections':0,'publicationWrites':0,
            'limits':['New native supply around current crop, not old source/master work replay.',
                      'No larger RGB master, scientific mask, background estimate, transparency or registry adoption.',
                      'Sampled perimeter/native windows and illustrative preview do not establish full scientific footprint, absolute registration or safe feather region.',
                      'CPU/wall values are this offline task only; retained files/RGB byte identities are not production or physical endpoint capacity.']}
    save('result.json',result)
    print(json.dumps({'status':result['status'],'bounds':[(r['objectRef'],r['currentFieldDegrees']*60,r['geometricBound']['fullSampledPerimeterSupportedFieldDegrees']*60) for r in rows]}))

if __name__=='__main__':
    main()
