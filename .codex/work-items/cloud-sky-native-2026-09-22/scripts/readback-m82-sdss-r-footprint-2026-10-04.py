"""Direct original FITS/WCS four-address readback of actual full r support."""
from pathlib import Path
import bz2
import hashlib
import io
import json
import math
import sys

ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / 'output/sdss-m82-r-footprint-readback-1004-r1'
GEN = ROOT / 'output/sdss-m82-r-footprint-1004-r1'
sys.path.insert(0, str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from astropy.io import fits
from astropy.wcs import WCS


def bind(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        while block := stream.read(1048576):
            h.update(block)
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': h.hexdigest()}


def masks(path, pixels):
    with np.load(path, allow_pickle=False) as saved:
        return [np.unpackbits(saved[key], bitorder='little', count=pixels*pixels).reshape(pixels, pixels).astype(bool)
                for key in ('footprint', 'finite_neighbors')]


def main():
    assert not OUT.exists()
    OUT.mkdir()
    (OUT / 'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    result = json.loads((GEN / 'result.json').read_bytes())
    pixels = result['targetShape'][0]
    target = WCS(naxis=2)
    target.wcs.ctype = ['RA---TAN', 'DEC--TAN']
    target.wcs.radesys = 'ICRS'
    target.wcs.crval = [result['targetCenter']['raDeg'], result['targetCenter']['decDeg']]
    target.wcs.crpix = [(pixels+1)/2, (pixels+1)/2]
    step = math.degrees(2*math.tan(math.radians(result['fieldDegrees'])/2)/pixels)
    target.wcs.cdelt = [-step, step]
    union_f = np.zeros((pixels, pixels), dtype=bool)
    union_a = np.zeros_like(union_f)
    counts = np.zeros((pixels, pixels), dtype=np.uint8)
    checked = []
    # Do not call the producer's reader/reprojection/bilinear helpers. Original
    # raw HDU arrays and native header define the independent address check.
    for record in result['fields']:
        assert record['state'] == 'R_GEOMETRY_MEASURED_QUALITY_UNKNOWN'
        raw_path = ROOT / record['sourceRaw']['path']
        assert bind(raw_path) == record['sourceRaw']
        original = bz2.decompress(raw_path.read_bytes())
        with fits.open(io.BytesIO(original), memmap=False) as hdus:
            data = np.array(hdus[0].data)
            source = WCS(hdus[0].header)
            identity = record['identity']
            assert int(hdus[3].data[0]['RUN']) == identity['run']
            assert int(hdus[3].data[0]['CAMCOL']) == identity['camcol']
            assert int(hdus[3].data[0]['FIELD']) == identity['field']
        assert bind(ROOT / record['support']['path']) == record['support']
        expected_f, expected_a = masks(ROOT / record['support']['path'], pixels)
        rows, columns = data.shape
        for start in range(0, pixels, 128):
            end = min(start+128, pixels)
            yy, xx = np.mgrid[start:end, 0:pixels]
            ra, dec = target.all_pix2world(xx+1, pixels-yy, 1)
            # FITS origin1 is explicitly reversed here, then derive the four
            # original-array addresses, independent of shared source stencil.
            fx, fy = source.all_world2pix(ra, dec, 1)
            sx, sy = fx-1, fy-1
            geometric = np.isfinite(sx) & np.isfinite(sy) & (sx>=0) & (sy>=0) & (sx<columns-1) & (sy<rows-1)
            ix = np.floor(np.where(geometric, sx, 0)).astype(np.int64)
            iy = np.floor(np.where(geometric, sy, 0)).astype(np.int64)
            available = (geometric & np.isfinite(data[iy, ix]) & np.isfinite(data[iy, ix+1]) &
                         np.isfinite(data[iy+1, ix]) & np.isfinite(data[iy+1, ix+1]))
            assert np.array_equal(geometric, expected_f[start:end])
            assert np.array_equal(available, expected_a[start:end])
        assert int(expected_f.sum()) == record['footprintPixels']
        assert int(expected_a.sum()) == record['finiteStencilPixels']
        core = slice(pixels//2-32, pixels//2+32)
        assert int(expected_a[core,core].sum()) == record['central64SquareFinitePixels']
        union_f |= expected_f
        union_a |= expected_a
        counts += expected_a.astype(np.uint8)
        checked.append({'identity': identity, 'targetPositionsChecked': pixels*pixels,
                        'finiteStencilPixels': int(expected_a.sum()), 'coreFinitePixels': int(expected_a[core,core].sum())})
        print(json.dumps(checked[-1]), flush=True)
    assert bind(ROOT / result['unionSupport']['path']) == result['unionSupport']
    saved_f, saved_a = masks(ROOT / result['unionSupport']['path'], pixels)
    assert np.array_equal(saved_f, union_f) and np.array_equal(saved_a, union_a)
    with np.load(ROOT / result['unionSupport']['path'], allow_pickle=False) as saved:
        assert np.array_equal(saved['contributor_count'], counts)
    assert int(union_f.sum()) == result['unionFootprintPixels']
    assert int(union_a.sum()) == result['unionFiniteStencilPixels']
    report = {'scope': 'Root full raw-r four-address/WCS/support readback; self-review not independent quality or absolute astrometry',
        'producerResult': bind(GEN/'result.json'), 'reader': bind(Path(__file__)), 'fields': checked,
        'targetPositionsChecked': sum(f['targetPositionsChecked'] for f in checked),
        'allMasksAndContributorCountsExact': True, 'unionFiniteStencilPixels': int(union_a.sum()),
        'targetPixels': pixels*pixels, 'newDownloadsOrSourceEdits': 0,
        'ordinaryAdoption': False, 'griScientificQuality': 'UNVERIFIED', 'independentReview': 'MISSING'}
    (OUT/'result.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'fullAddressReadbackPassed': True, 'targetPositionsChecked': report['targetPositionsChecked'],
                      'unionFiniteStencilPixels': int(union_a.sum())}))


if __name__ == '__main__':
    main()
