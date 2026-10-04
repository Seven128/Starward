"""Read saved native windows and check their nominal geometry without JPEG decode.

Contact sheets preserve raw samples at 1:1. An explicitly labelled fixed 8x
encoded-RGB diagnostic is separate from all source/master/publication pixels.
Neither view classifies a window as blank sky or distinguishes real faint
structure from an instrument/processing artifact.
"""
from pathlib import Path
import hashlib
import json
import math
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
INPUT = ROOT / 'output/prepared-native-extent-1004-r1'
QUALITY = ROOT / 'output/noirlab-prepared-wide-quality-1004-r1'
OUT = ROOT / 'output/prepared-native-extent-readback-1004-r1'
sys.path[:0] = [str(ROOT / 'data-pipelines/deep-sky'),
               str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'),
               str(ROOT / 'output/pyavm-metadata-trial-1002-r1/lib')]
import numpy as np
from PIL import Image, ImageDraw
from prepared_rgb_observation import NominalAvmGeometry
from sdss_gri_tan import target_tan
from sdss_source_stencil import source_pixel_stencil


def bind(p):
    raw = p.read_bytes()
    return {'path': p.relative_to(ROOT).as_posix(), 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest()}


def save(name, value):
    with (OUT / name).open('x', encoding='utf-8') as f:
        f.write(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n')


def basis(ra_degrees, dec_degrees):
    a, d = math.radians(ra_degrees), math.radians(dec_degrees)
    center = np.array([math.cos(d)*math.cos(a), math.cos(d)*math.sin(a), math.sin(d)])
    east = np.array([-math.sin(a), math.cos(a), 0.])
    north = np.array([-math.sin(d)*math.cos(a), -math.sin(d)*math.sin(a), math.cos(d)])
    return center, east, north


def independent_native_xy(center, field, geometry, target_xy):
    # Two TAN projections expressed directly as Cartesian basis dot products.
    # This does not reuse the task's world-coordinate or source-pixel mapper.
    c, e, n = basis(center['raDeg'], center['decDeg'])
    xy = np.asarray(target_xy, dtype=np.float64)
    step = 2 * math.tan(math.radians(field)/2) / 2048
    rays = c - (xy[:, 0:1]-1023.5)*step*e - (xy[:, 1:2]-1023.5)*step*n
    sc, se, sn = basis(*geometry['reference_value'])
    divisor = rays @ sc
    assert (divisor > 0).all()
    tangent = np.column_stack((rays @ se, rays @ sn)) / divisor[:, None] * (180/math.pi)
    sx, sy = geometry['cdelt']
    rotation = math.radians(geometry['rotation'])
    cd = np.array([[sx*math.cos(rotation), -sy*math.sin(rotation)],
                   [sx*math.sin(rotation), sy*math.cos(rotation)]])
    return np.linalg.solve(cd, tangent.T).T + np.asarray(geometry['crpix']) - 1


def perimeter():
    values = np.linspace(-.5, 2047.5, 257)
    return np.concatenate((np.column_stack((values, np.full_like(values, -.5))),
                           np.column_stack((np.full_like(values, 2047.5), values)),
                           np.column_stack((values[::-1], np.full_like(values, 2047.5))),
                           np.column_stack((np.full_like(values, -.5), values[::-1]))))


def current_owner_xy(center, field, geometry, points):
    wcs = NominalAvmGeometry(**geometry).new_wcs()
    target = target_tan(center, 2048, field)
    ra, dec = target.all_pix2world(points[:, 0], 2047-points[:, 1], 0)
    x, y = wcs.all_world2pix(ra, dec, 0)
    return np.column_stack((x, y))


def main():
    OUT.mkdir(exist_ok=False)
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    facts = json.loads((INPUT / 'result.json').read_bytes())
    old_inputs = json.loads((INPUT / 'inputs-before.json').read_bytes())
    assert old_inputs == json.loads((INPUT / 'inputs-after.json').read_bytes())
    assert old_inputs == [bind(ROOT / row['path']) for row in old_inputs]
    rows = []
    for row in facts['rows']:
        rid = row['resourceId']
        meta = json.loads((QUALITY / rid / 'master.json').read_bytes())
        geom = meta['sourceGeometry']
        width, height = geom['decoded_shape_width_height']
        sheets = [Image.new('RGB', (3*149+20, 4*161+44), (20, 20, 20)) for _ in range(2)]
        draws = [ImageDraw.Draw(im) for im in sheets]
        for d, name in zip(draws, ['RAW 1:1', 'DIAGNOSTIC 8x ENCODED RGB - NOT SOURCE']):
            d.text((8, 6), rid + ' ' + name, fill=(240, 240, 240))
        windows = []
        max_difference = 0.
        for i, window in enumerate(row['edgeNativeWindows']):
            p = ROOT / window['png']['path']
            assert bind(p) == window['png']
            with Image.open(p) as image:
                assert image.mode == 'RGB'
                raw = np.array(image)
            assert list(raw.shape) == window['rgbShape']
            assert hashlib.sha256(raw.tobytes()).hexdigest() == window['rawRgbSha256']
            assert np.median(raw, axis=(0, 1)).tolist() == window['encodedRgbMedian']
            expected = independent_native_xy(meta['center'], meta['fieldDegrees'], geom,
                                             [window['targetPixelTopFirst']])[0]
            difference = float(np.max(np.abs(expected-np.asarray(window['nativeNominalFitsXY']))))
            max_difference = max(max_difference, difference)
            # Numeric nominal-projection agreement only, not absolute astrometry.
            assert difference < 1e-7
            top_first = [expected[0], height-1-expected[1]]
            assert np.max(np.abs(np.asarray(top_first)-window['nativeTopFirstXY'])) < 1e-7
            x, y = map(int, np.rint(top_first))
            bounds = [max(0, x-64), max(0, y-64), min(width, x+65), min(height, y+65)]
            assert bounds == window['rawNativeBoundsXYExclusive']
            assert raw.shape == (bounds[3]-bounds[1], bounds[2]-bounds[0], 3)
            sheet_x, sheet_y = (i % 3)*149+10, (i // 3)*161+32
            label = window['side'] + ' ' + str(round(window['edgeFraction']*100)) + '%'
            for d in draws:
                d.text((sheet_x, sheet_y), label, fill=(240, 240, 240))
            sheets[0].paste(Image.fromarray(raw), (sheet_x, sheet_y+18))
            diagnostic = np.minimum(raw.astype(np.uint16)*8, 255).astype(np.uint8)
            sheets[1].paste(Image.fromarray(diagnostic), (sheet_x, sheet_y+18))
            windows.append({'png': bind(p), 'rawRgbSha256': window['rawRgbSha256'],
                            'nativeCoordinateDifferencePixels': difference, 'boundsExact': True})
        contacts = []
        for im, name in zip(sheets, ['raw', 'diagnostic-encoded-8x']):
            p = OUT / (rid+'-'+name+'-native-edge-contact.png')
            im.save(p)
            contacts.append(bind(p))
        points = perimeter()
        bound = row['geometricBound']['fullSampledPerimeterSupportedFieldDegrees']
        actual = current_owner_xy(meta['center'], bound, geom, points)
        assert source_pixel_stencil((height, width), actual[:, 0], actual[:, 1]).geometry.all()
        counter_field = bound*1.000001
        counter = current_owner_xy(meta['center'], counter_field, geom, points)
        bad = ~source_pixel_stencil((height, width), counter[:, 0], counter[:, 1]).geometry
        assert bad.any()
        limiting = []
        for index in np.flatnonzero(bad):
            x, y = counter[index]
            limiting.append({'targetXY': points[index].tolist(), 'nativeFitsXY': [float(x), float(y)],
                             'outside': [axis for axis, test in [('native-x-low',x < 0),
                                        ('native-x-high',x >= width-1), ('native-y-low',y < 0),
                                        ('native-y-high',y >= height-1)] if test]})
        rows.append({'objectRef': row['objectRef'], 'windowCount': len(windows), 'windows': windows,
                     'maxIndependentCoordinateDifferencePixels': max_difference,
                     'savedGeometricFieldDegrees': bound, 'savedSampledPerimeterSupported': True,
                     'counterfactualFieldDegrees': counter_field,
                     'counterfactualUnsupportedPoints': limiting, 'contacts': contacts,
                     'limits': 'Nominal sampled perimeter only; no safe artifact margin, science/background class, full-field validity or absolute astrometry.'})
    assert old_inputs == [bind(ROOT / row['path']) for row in old_inputs]
    save('result.json', {'status': 'SAVED_NATIVE_WINDOWS_AND_NOMINAL_GEOMETRY_READ_BACK', 'rows': rows,
                        'originalJpegDecodes': 0, 'rgbReprojections': 0, 'publicationWrites': 0,
                        'inputIdentitiesUnchanged': True,
                        'diagnosticGain': '8x encoded byte values, clipped, in separate labelled contacts only; not physically linear or a proposed rendering recipe.'})
    print(json.dumps({'status': 'SAVED_NATIVE_WINDOWS_AND_NOMINAL_GEOMETRY_READ_BACK',
                      'rows': [{k:r[k] for k in ('objectRef', 'windowCount',
                                'maxIndependentCoordinateDifferencePixels', 'counterfactualUnsupportedPoints')} for r in rows]}))


if __name__ == '__main__':
    main()
