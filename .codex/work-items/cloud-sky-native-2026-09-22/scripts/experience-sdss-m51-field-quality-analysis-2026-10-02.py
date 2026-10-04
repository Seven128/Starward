"""Bounded field metadata interpretation; no download, image repair or admission."""
from __future__ import annotations
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
BANDS = ('g', 'r', 'i')


def bound(path):
    path = path.resolve()
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest()}


def load_response(directory):
    receipt = json.loads((directory / 'receipt.json').read_text(encoding='utf-8-sig'))
    raw = (directory / 'response.csv').read_bytes()
    assert receipt['status'] == 200
    assert receipt['bytes'] == len(raw) and receipt['sha256'] == hashlib.sha256(raw).hexdigest()
    rows = list(csv.DictReader(io.StringIO('\n'.join(
        line for line in raw.decode('utf-8-sig').splitlines() if line and not line.startswith('#')))))
    parsed = json.loads((directory / 'field-quality.json').read_text(encoding='utf-8-sig'))
    assert rows == parsed['rows'], 'reported rows must equal actual response strings, without unsafe fieldID number conversion'
    plan = json.loads((directory / 'plan.json').read_text(encoding='utf-8-sig'))
    assert bound(directory / 'executed-script.ps1')['sha256'] == plan['script']['sha256']
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    output = args.output.resolve()
    assert output.is_relative_to((ROOT / 'output').resolve()) and not output.exists()
    base = ROOT / 'output/sdss-m51-field-quality-1002-r3'
    prior = ROOT / 'output/sdss-m51-field-quality-1002-r2'
    full_rows, minimal_rows = load_response(base), load_response(prior)
    assert len(full_rows) == len(minimal_rows) == 6
    by_id = {row['fieldID']: row for row in full_rows}
    assert len(by_id) == 6
    for row in minimal_rows:
        assert all(by_id[row['fieldID']][key] == value for key, value in row.items())
    candidate_path = ROOT / 'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json'
    assert bound(candidate_path)['sha256'] == '73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52'
    candidate = json.loads(candidate_path.read_bytes())
    identities = {tuple(str(field['identity'][key]) for key in ('rerun', 'run', 'camcol', 'field'))
                  for field in candidate['mosaic']['fields']}
    assert identities == {tuple(row[key] for key in ('rerun', 'run', 'camcol', 'field')) for row in full_rows}
    pixel_scale = abs(candidate['wcsHeader']['CDELT1']) * 3600
    details = []
    for row in full_rows:
        fields = {key: row[key] for key in ('fieldID', 'rerun', 'run', 'camcol', 'field')}
        flags = {key: int(row[key]) for key in ('quality', 'pspStatus', 'photoStatus')}
        flags['score'] = float(row['score'])
        per_band = {}
        for band in BANDS:
            width = float(row[f'psfWidth_{band}'])
            image, calib = int(row[f'imageStatus_{band}']), int(row[f'calibStatus_{band}'])
            assert width > 0 and image == 1 and calib == 24577
            per_band[band] = {'psfWidthArcsec': width, 'psfWidthInMasterTangentPixelsAtCenter': width / pixel_scale,
                              'imageStatus': image, 'imageStatusSetBits': [0], 'imageStatusMeaning': ['CLEAR'],
                              'calibStatus': calib, 'calibStatusSetBits': [0, 13, 14],
                              'calibStatusMeaning': ['PHOTOMETRIC', 'PS1_PCOMP_MODEL', 'PS1_LOW_RMS']}
        assert flags['pspStatus'] == 0 and flags['photoStatus'] in (0, 3)
        assert (flags['score'] == 0) == (flags['photoStatus'] == 3)
        details.append({'identity': fields, 'metadata': flags, 'bands': per_band,
                        'catalogReduction': 'TOO_LONG' if flags['photoStatus'] == 3 else 'OK',
                        'meaning': 'Actual field-level metadata; not a spatial PSF, frame-level artifact mask or target quality acceptance'})
    ranges = {run: {band: {'minimumArcsec': min(float(row[f'psfWidth_{band}']) for row in full_rows if row['run'] == run),
                           'maximumArcsec': max(float(row[f'psfWidth_{band}']) for row in full_rows if row['run'] == run)}
                   for band in BANDS} for run in sorted({row['run'] for row in full_rows})}
    paths = [Path(__file__), candidate_path,
             *[directory / name for directory in (base, prior) for name in ('plan.json', 'receipt.json', 'response.csv', 'field-quality.json', 'executed-script.ps1')]]
    report = {'scope': 'Six actual already acquired mosaic fields; field-level metadata analysis only',
              'inputs': [bound(path) for path in paths], 'fieldIDsPreservedAsStrings': True,
              'fullMetadataMatchesPriorMinimalRows': True, 'fields': details, 'psfWidthRangesByRun': ranges,
              'masterTangentPixelScaleArcsecAtCenter': pixel_scale,
              'detailTangentPixelScaleArcsecAtCenter': abs(candidate['levels']['DETAIL']['wcsHeader']['CDELT1']) * 3600,
              'documents': {'quality': 'https://www.sdss4.org/dr17/algorithms/image_quality/',
                            'psfDefinition': 'https://www.sdss4.org/dr17/imaging/other_info/',
                            'bitDefinitions': 'https://www.sdss4.org/dr17/algorithms/bitmasks/',
                            'resolve': 'https://www.sdss4.org/dr17/algorithms/resolve/',
                            'frameVsCatalogCalibration': 'https://www.sdss4.org/dr17/imaging/images/'},
              'planCorrection': 'r3 acquisition inherited the earlier minimal-query missingFlags description; actual full CSV contains all these per-band flags. This analysis reads/qualifies the actual response and preserves the original r3 plan.',
              'decisions': ['Retain both center corrected frames; score zero follows PHOTO_STATUS=TOO_LONG and is not by itself an intrinsic bad-frame decision.',
                            'The actual g/r/i IMAGE_STATUS=CLEAR and PSP_STATUS=OK do not establish absent pixel artifacts, correct PSF or saturation-free science.',
                            'Field CALIB_STATUS describes catalog-associated metadata; do not apply PS1 hypercalibration or NMGY again to these corrected-frame samples.',
                            'Do not change common mosaic weights or perform deconvolution/PSF matching from one scalar FWHM.',
                            'Use source PSF/sampling constraints when evaluating apparent sharpness; a display stretch/upscale cannot restore missing astronomical frequencies.'],
              'scientificValidity': 'UNKNOWN', 'pixelArtifactMask': 'NOT_SUPPLIED',
              'spatialPsf': 'NOT_SUPPLIED', 'qualityAcceptance': 'UNVERIFIED'}
    output.mkdir(parents=True)
    (output / 'analysis.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps({'report': bound(output / 'analysis.json'), 'fields': len(details), 'pixelScale': pixel_scale,
                      'psfWidthRangesByRun': ranges, 'qualityAcceptance': 'UNVERIFIED'}))


if __name__ == '__main__':
    main()
