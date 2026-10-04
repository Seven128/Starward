"""Read saved OV/MED results against actual FITS scalars, without sampler replay."""
from pathlib import Path
import hashlib
import json
import sys
import warnings

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from astropy.io import fits

TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
ACQ = ROOT / 'output/allwise-w3-m82-overview-medium-inputs-1004-r1'
SCIENCE = ROOT / 'output/allwise-w3-m82-overview-medium-science-1004-r1'
OUT = ROOT / 'output/allwise-w3-m82-overview-medium-readback-1004-r1'


def bind(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size, 'sha256': digest.hexdigest()}


def verify(records):
    assert [bind(ROOT / item['path']) for item in records] == records


def main():
    OUT.mkdir(exist_ok=False)
    acquisition = json.loads((ACQ / 'acquisition.json').read_bytes())
    report = json.loads((SCIENCE / 'result.json').read_bytes())
    for directory in (ACQ, SCIENCE):
        binding = json.loads((directory / 'binding.json').read_bytes())
        verify(binding['inputs'])
        verify(binding['outputs'])
    assert acquisition['inputBindingsBefore'] == acquisition['inputBindingsAfter']
    assert report['inputsBefore'] == report['inputsAfter']
    assert report['checkpointBindingsBefore'] == report['checkpointBindingsAfter']
    verify(report['checkpointBindingsAfter'])
    assert acquisition['automaticRetries'] == 0 and acquisition['attemptedRequests'] == 9
    assert acquisition['fullTwoLevelInputChecked'] and acquisition['checkedSourceCount'] == 9
    plan = json.loads((ACQ / 'two-level-plan.json').read_bytes())
    sources = {item['path']: item for item in acquisition['sourceFiles']}
    assert len(sources) == 9
    raw_arrays = {}
    native_summary = []
    for canonical, item in sources.items():
        assert item['state'] == 'CHECKED' and item['httpStatus'] == 200
        assert item['actualFinalUrl'] == item['url'] == plan['source'] + '/' + canonical
        assert item['rawTransferCompleted'] is True and item['receipt']['completeArrayReceived'] is True
        assert item['bytes'] == 1051456 and item['receipt']['missingEndPaddingBytes'] == 2624
        raw = ROOT / item['raw']['path']
        assert bind(raw) == item['raw']
        with warnings.catch_warnings(record=True):
            warnings.simplefilter('always')
            with fits.open(raw, memmap=False) as hdus:
                primary = hdus[0]
                assert primary.header['BITPIX'] == -32 and primary.data.shape == (512, 512)
                assert primary.header.get('BUNIT') is None
                assert raw.stat().st_size >= primary.fileinfo()['datLoc'] + primary.data.nbytes
                data = np.array(primary.data, copy=True)
        raw_arrays[canonical] = data
        assert int((~np.isfinite(data)).sum()) == item['nonfinite']
        native_summary.append({'canonicalPath': canonical, 'nonfiniteScalars': item['nonfinite'],
                               'BUNIT': None, 'completeScientificArray': True, 'missingEndPaddingBytes': 2624})
    summaries = []
    for profile, metadata, observed in zip(plan['profiles'], report['levels'], report['lookupObservations'], strict=True):
        level = profile['level']
        assert metadata['level'] == observed['level'] == level
        assert observed['world']['sha256'] == metadata['worldSha256'] == profile['worldSha256']
        assert observed['lookup']['sha256'] == metadata['lookupSha256'] == profile['lookupSha256']
        n = profile['pixels']
        world = np.fromfile(ROOT / observed['world']['path'], dtype='<f8').reshape(n, n, 2)
        assert np.all(np.isfinite(world))
        lookup = np.fromfile(ROOT / observed['lookup']['path'], dtype='<u4').reshape(n, n, 3)
        assert np.all(lookup[:, :, 1:] < 512)
        expected = np.empty((n, n), dtype=np.float32)
        used = []
        for pixel in np.unique(lookup[:, :, 0]):
            canonical = f"Norder{profile['sourceOrder']}/Dir{int(pixel) // 10000 * 10000}/Npix{pixel}.fits"
            assert canonical in profile['tiles']
            take = lookup[:, :, 0] == pixel
            # Direct native FITS scalar addressing: original shared sampler is
            # neither imported nor invoked in this readback process.
            expected[take] = raw_arrays[canonical][lookup[:, :, 2][take], lookup[:, :, 1][take]]
            used.append(canonical)
        assert sorted(used) == sorted(profile['tiles'])
        science = np.load(ROOT / metadata['science']['path'], allow_pickle=False)
        available = np.load(ROOT / metadata['availability']['path'], allow_pickle=False)
        assert science.dtype == np.float32 and available.dtype == np.bool_
        assert np.array_equal(science, expected, equal_nan=True)
        assert np.array_equal(available, np.isfinite(expected))
        assert int(available.sum()) == metadata['finitePixels']
        assert int((~available).sum()) == metadata['nonfinitePixels']
        assert int((available & (science == 0)).sum()) == metadata['finiteZeroPixels']
        assert int((available & (science < 0)).sum()) == metadata['finiteNegativePixels']
        assert sorted(item['path'] for item in metadata['source']['tiles']) == sorted(used)
        summaries.append({'level': level, 'selectedScalars': n * n, 'finitePixels': metadata['finitePixels'],
                          'nonfinitePixels': metadata['nonfinitePixels'], 'finiteZeroPixels': metadata['finiteZeroPixels'],
                          'finiteNegativePixels': metadata['finiteNegativePixels'],
                          'sourceTileCount': len(used), 'allSavedValuesAndAvailabilityMatchActualSourceScalars': True})
    verify(report['checkpointBindingsAfter'])
    result = {'scope': 'Root saved-input/scalar readback, not independent review or quality acceptance',
        'producer': bind(SCIENCE / 'result.json'), 'acquisition': bind(ACQ / 'acquisition.json'),
        'script': bind(Path(__file__)), 'levels': summaries, 'nativeSources': native_summary,
        'allInputsAndHistoricalCheckpointExact': True, 'DETAILReprocessed': False,
        'displayOrPublicationProduced': False, 'independentReview': 'MISSING',
        'limits': ['BUNIT/physical units unknown; missing trailing FITS padding preserved separately from complete arrays.',
                   'Old 17 finite dark-core points and 19 DETAIL nonfinite samples unchanged; no quality repair/adoption.',
                   'Source PSF, absolute registration, full background/seams/weak structure and complete rights/publication remain open.']}
    (OUT / 'result.json').write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps({'pass': True, 'levels': summaries, 'existingBytesExact': True}))


if __name__ == '__main__':
    main()
