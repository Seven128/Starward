"""Read existing CSV/execution receipts and recompute bounded field metadata."""
import csv
import hashlib
import io
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
BASE = ROOT / 'output/sdss-m51-field-quality-1002-r3'
PRIOR = ROOT / 'output/sdss-m51-field-quality-1002-r2'
SOURCE = ROOT / 'output/sdss-m51-gri-mosaic-candidate-1002-r2'

def load(path):
    return json.loads(path.read_text('utf-8-sig'))

def bind(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}

def csv_rows(path):
    lines = [line for line in path.read_text('utf-8-sig').splitlines() if line and not line.startswith('#')]
    return list(csv.DictReader(io.StringIO('\n'.join(lines))))

def main():
    analysis_path = ROOT / 'output/sdss-m51-field-quality-analysis-1002-r1/analysis.json'
    analysis = load(analysis_path)
    verified = {item['path']: bind(ROOT / item['path']) for item in analysis['inputs']}
    assert all(verified[item['path']] == item for item in analysis['inputs'])
    actual = csv_rows(BASE / 'response.csv')
    prior = csv_rows(PRIOR / 'response.csv')
    assert len(actual) == len(prior) == 6
    by_id = {item['fieldID']: item for item in actual}
    assert len(by_id) == 6
    for directory, rows in [(BASE, actual), (PRIOR, prior)]:
        receipt, plan, saved = [load(directory / name) for name in ('receipt.json', 'plan.json', 'field-quality.json')]
        raw_bound = bind(directory / 'response.csv')
        assert receipt['status'] == 200 and raw_bound['bytes'] == receipt['bytes'] and raw_bound['sha256'] == receipt['sha256']
        script = bind(directory / 'executed-script.ps1')
        assert script['bytes'] == plan['script']['bytes'] and script['sha256'] == plan['script']['sha256']
        assert saved['rows'] == rows
        assert {item['fieldID'] for item in plan['selectedFields']} == set(by_id)
        assert all(len(item['fieldID']) == 19 and item['fieldID'].isdigit() for item in rows)
    assert all(all(by_id[item['fieldID']][key] == value for key, value in item.items()) for item in prior)
    discovery_path = ROOT / 'output/sdss-corrected-m51-1002/target-field-response.csv'
    discovery = {tuple(item[key] for key in ('rerun', 'run', 'camcol', 'field')): item['fieldID'] for item in csv_rows(discovery_path)}
    candidate = load(SOURCE / 'candidate.json')
    identities = {tuple(str(item['identity'][key]) for key in ('rerun', 'run', 'camcol', 'field')) for item in candidate['mosaic']['fields']}
    assert identities == {tuple(item[key] for key in ('rerun', 'run', 'camcol', 'field')) for item in actual}
    assert all(discovery[tuple(item[key] for key in ('rerun', 'run', 'camcol', 'field'))] == item['fieldID'] for item in actual)
    master_scale = abs(candidate['wcsHeader']['CDELT1']) * 3600
    detail_scale = abs(candidate['levels']['DETAIL']['wcsHeader']['CDELT1']) * 3600
    assert master_scale == detail_scale == analysis['masterTangentPixelScaleArcsecAtCenter'] == analysis['detailTangentPixelScaleArcsecAtCenter']
    details = []
    for item, reported in zip(actual, analysis['fields'], strict=True):
        identity = {key: item[key] for key in ('fieldID', 'rerun', 'run', 'camcol', 'field')}
        assert identity == reported['identity']
        assert int(item['fieldID']) > 2 ** 53
        flags = {key: int(item[key]) for key in ('quality', 'pspStatus', 'photoStatus')}
        flags['score'] = float(item['score'])
        assert flags == reported['metadata']
        measured = {}
        for band in 'gri':
            width = float(item[f'psfWidth_{band}'])
            image, calib = [int(item[f'{kind}Status_{band}']) for kind in ('image', 'calib')]
            image_bits = [bit for bit in range(32) if image & (1 << bit)]
            calib_bits = [bit for bit in range(32) if calib & (1 << bit)]
            assert image == 1 and image_bits == [0] and calib == 24577 and calib_bits == [0, 13, 14]
            band_report = reported['bands'][band]
            assert width == band_report['psfWidthArcsec'] and width / master_scale == band_report['psfWidthInMasterTangentPixelsAtCenter']
            assert band_report['imageStatusSetBits'] == image_bits and band_report['calibStatusSetBits'] == calib_bits
            measured[band] = {'psfWidthArcsec': width, 'psfWidthInMasterTangentPixelsAtCenter': width / master_scale,
                              'imageBits': image_bits, 'calibBits': calib_bits}
        details.append({'identity': identity, 'fieldFlags': flags, 'bands': measured})
    too_long = [item['identity'] for item in details if item['fieldFlags']['photoStatus'] == 3]
    assert {tuple(item[key] for key in ('run', 'camcol', 'field')) for item in too_long} == {('3699', '6', '100'), ('3716', '6', '117')}
    assert all(item['fieldFlags']['score'] == 0 and item['fieldFlags']['quality'] == 1 for item in details if item['identity'] in too_long)
    ranges = {run: {band: {'minimumArcsec': min(item['bands'][band]['psfWidthArcsec'] for item in details if item['identity']['run'] == run),
                          'maximumArcsec': max(item['bands'][band]['psfWidthArcsec'] for item in details if item['identity']['run'] == run)} for band in 'gri'} for run in ('3699', '3716')}
    assert ranges == analysis['psfWidthRangesByRun']
    extra = [analysis_path, discovery_path, TASK / 'evidence/experience-sdss-m51-field-quality-2026-10-02.md']
    for key in ('g-science', 'r-science', 'i-science', 'joint-availability'):
        item = candidate['arrays'][key]
        path = SOURCE / item['file']
        bound = bind(path)
        assert bound['bytes'] == item['bytes'] and bound['sha256'] == item['sha256']
        extra.append(path)
    for path in extra:
        verified[path.relative_to(ROOT).as_posix()] = bind(path)
    for expected in verified.values():
        assert bind(ROOT / expected['path']) == expected
    target = TASK / 'evidence/experience-sdss-field-quality-independent-2026-10-02.json'
    with target.open('x', encoding='utf-8') as out:
        json.dump({'scope': 'Offline actual CSV/executed-script/metadata independent readback; no CAS query/download, science alteration, shader/publication or acceptance claim.',
                   'script': bind(Path(__file__).resolve()), 'inputs': list(verified.values()), 'fields': details,
                   'allNineteenDigitFieldIDsRemainExactStrings': True, 'candidateAndDiscoveryIdentityMatch': True,
                   'minimalVsFullStringColumnsEqual': True, 'executedSnapshotsMatchTheirPlans': True,
                   'masterAndDetailCentralTangentScaleArcsec': master_scale, 'rangesByRun': ranges,
                   'tooLongCatalogFields': too_long, 'existingScienceAndJointBytesUnchanged': True,
                   'interpretationBoundaries': ['PHOTO_STATUS=TOO_LONG pertains to catalogue reduction, not intrinsically bad corrected frames.',
                                              'CLEAR/PSP_OK/calib flags do not certify absent pixel artifacts or exact spatial/mosaic PSF.',
                                              'noise-effective field scalar psfWidth divided by tangent sampling is not measured mosaic resolution.',
                                              'Corrected frames already calibrated and sky-subtracted; metadata cannot authorize second PS1/NMGY/sky application.']}, out, ensure_ascii=False, indent=2)
        out.write('\n')
    print(json.dumps(bind(target)))

if __name__ == '__main__':
    main()
