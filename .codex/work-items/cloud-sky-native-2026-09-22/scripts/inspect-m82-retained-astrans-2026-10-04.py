"""Reuse existing declared-assumption astrometry diagnostic on new M82 inputs."""
from pathlib import Path
import importlib.util
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
OUT = ROOT / 'output/sdss-m82-retained-astrans-1004-r1'
spec = importlib.util.spec_from_file_location('existing_math', TASK / 'scripts/experience-sdss-astrans-approximation-audit-2026-10-02.py')
existing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(existing)
np = existing.np
from astropy.io.fits import Header
from astropy.wcs import WCS
from astropy.coordinates import SkyCoord

def main():
    assert not OUT.exists()
    OUT.mkdir()
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    candidate_path = ROOT / 'output/sdss-m82-first-science-master-1004-r2/candidate/candidate.json'
    result_path = ROOT / 'output/sdss-m82-first-science-master-1004-r2/result.json'
    result = json.loads(result_path.read_bytes())
    assert existing.binding(candidate_path) == result['candidate']
    c = json.loads(candidate_path.read_bytes())
    y, x = np.mgrid[0:1488:13j, 0:2047:17j]
    records = []
    for field in c['mosaic']['fields']:
        for band in 'gri':
            receipt = field['perBand'][band]['sourceReceipt']
            row = receipt['asTrans']['row']
            cards = receipt['wcs']['primaryHeaderFitsCards']
            assert hashlib.sha256(cards.encode('ascii')).hexdigest() == receipt['wcs']['primaryHeaderSha256']
            wcs = WCS(Header.fromstring(cards, sep='\n'), naxis=2)
            tan_ra, tan_dec = wcs.all_pix2world(x, y, 0)
            tan = SkyCoord(ra=tan_ra, dec=tan_dec, unit='deg', frame='icrs')
            cases = []
            for offset in (0, .5, 1):
                for color in (0, 1, 2):
                    ra, dec = existing.retained_solution(row, x, y, origin_offset=offset, color=color)
                    separation = tan.separation(SkyCoord(ra=ra, dec=dec, unit='deg', frame='icrs')).arcsec
                    cases.append({'originOffsetSourcePixels': offset, 'assumedColor': color, **existing.stats(separation)})
            records.append({'identity': receipt['identity'], 'originalSource': receipt['source'],
                'primaryHeaderSha256': receipt['wcs']['primaryHeaderSha256'],
                'retainedAsTransHeaderSha256': receipt['asTrans']['headerSha256'],
                'gridNativeColumnsRows': [17, 13], 'cases': cases,
                'meaning': 'g-r colour for g; r-i for r/i. Explicit assumptions only, not measured source colour or validated pixel origin.'})
    maxima = {b: max(case['maxArcsec'] for rec in records if rec['identity']['band'] == b for case in rec['cases']
        if case['originOffsetSourcePixels'] == .5 and case['assumedColor'] == 0) for b in 'gri'}
    report = {'scope': __doc__, 'candidate': existing.binding(candidate_path), 'producer': existing.binding(Path(__file__)),
        'reusedDiagnostic': existing.binding(Path(existing.__file__)), 'results': records,
        'declaredHalfPixelColorZeroMaximaArcsec': maxima, 'nativeToTargetApproxScaleArcsec': .4,
        'comparisonMeaning': 'Two actual source-metadata transformations, not absolute measured astrometry or a full-frame supremum.',
        'originOrColourSelectedFromResidual': False, 'astrometricCorrection': False, 'scienceOrImageEdited': False,
        'sourceRequestsOrReprojection': 0, 'ordinaryAdoption': False, 'scientificQuality': 'UNVERIFIED',
        'independentReview': 'MISSING'}
    (OUT / 'result.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'sourceBands': len(records), 'declaredHalfPixelColourZeroMaximaArcsec': maxima}))

if __name__ == '__main__':
    main()
