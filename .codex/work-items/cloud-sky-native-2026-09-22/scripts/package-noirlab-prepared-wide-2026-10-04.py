"""Admit both real wide sources with the fixed owner; validate cached masters.

No parser override, new master projection, runtime registration or deployment.
"""
from pathlib import Path
from dataclasses import asdict
import hashlib
import json
import shutil
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
PIPE = ROOT / 'data-pipelines/deep-sky'
SRC = ROOT / 'output/noirlab-prepared-wide-source-1004-r1'
OLD = ROOT / 'output/noirlab-prepared-wide-quality-1004-r1'
OUT = ROOT / 'output/noirlab-prepared-wide-validation-1004-r1'
PUB = ROOT / 'output/noirlab-prepared-wide-publication-1004-r1'
sys.path[:0] = [str(PIPE), str(ROOT / 'output/pyavm-metadata-trial-1002-r1/lib'),
               str(ROOT / 'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from prepared_rgb_observation import ByteIdentity, PreparedRgbSource, load_prepared_rgb_observation
from prepared_rgb_tan import PreparedRgbTanMaster, prepared_rgb_tan_products
from publish_prepared_optical import verify_cached_prepared_generation, publish_verified_prepared_generation

def bind(p):
    b = p.read_bytes()
    return {'path': p.relative_to(ROOT).as_posix(), 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()}

def save(p, value):
    with p.open('x', encoding='utf-8') as f:
        json.dump(value, f, ensure_ascii=False, indent=2, allow_nan=False)
        f.write('\n')

def plain(value):
    return json.loads(json.dumps(value, allow_nan=False))

def main():
    OUT.mkdir(exist_ok=False)
    PUB.mkdir(exist_ok=False)
    protected = json.loads((TASK / 'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
    cases = json.loads((OLD / 'result.json').read_bytes())['cases']
    results = []
    for case in cases:
        rid = case['source']['resource_id']
        prev, val, pub = OLD / rid, OUT / rid, PUB / rid
        val.mkdir()
        shutil.copyfile(__file__, val / 'executed-script.py')
        source_paths = [SRC / (rid + '.jpg'), SRC / (rid + '-embedded-xmp.xml'),
                        SRC / (rid + '-source-page.html'), SRC / 'rights-page.html']
        files = [Path(__file__), OLD / 'result.json', prev / 'master.json', prev / 'master-rgba.npy']
        files += [prev / (level + '.png') for level in ('overview', 'medium', 'detail')]
        files += [PIPE / name for name in ('prepared_rgb_observation.py', 'prepared_rgb_tan.py', 'sdss_source_stencil.py', 'sdss_gri_tan.py', 'publish_prepared_optical.py', 'optical_publication_io.py')]
        files += [ROOT / r['path'] for r in protected]
        if rid == 'noao1309a':
            source_paths.append(SRC / 'noao1309-release.html')
        def inventory():
            return {'files': [bind(p) for p in files], 'source': [bind(p) for p in source_paths],
                    'historicalNominal': [], 'allPublishedAssets': []}
        before = inventory()
        save(val / 'inputs-before.json', before)
        meta = json.loads((prev / 'master.json').read_bytes())
        facts = dict(case['source'])
        facts['jpeg'], facts['xmp'] = ByteIdentity(**facts['jpeg']), ByteIdentity(**facts['xmp'])
        source = PreparedRgbSource(**facts)
        obs = load_prepared_rgb_observation(source_paths[0], source_paths[1], source,
            max_encoded_bytes=2 * 1024 * 1024, max_decoded_pixels=4000 * 4000)
        assert obs.removed_empty_spectral_notes and obs.removed_empty_spatial_notes
        assert plain(asdict(obs.geometry)) == meta['sourceGeometry']
        assert hashlib.sha256(obs.rgb_bytes).hexdigest() == meta['sourceRgbSha256']
        assert hashlib.sha256(obs.parser_xmp).hexdigest() == meta['sourceParserXmpSha256']
        (val / 'parser-normalized-xmp.xml').write_bytes(obs.parser_xmp)
        admission = {'status': 'PASSED_BOUNDED_OFFLINE_SOURCE_ADMISSION', 'requests': 0,
            'source': asdict(source), 'geometry': asdict(obs.geometry),
            'decodedRgb': {'bytes': len(obs.rgb_bytes), 'sha256': meta['sourceRgbSha256'],
                           'shape': [obs.rgb_top_first.shape[0], obs.rgb_top_first.shape[1], 3]},
            'normalization': {'parserXml': bind(val / 'parser-normalized-xmp.xml'),
                              'removedEmptySpectralNotes': obs.removed_empty_spectral_notes,
                              'removedEmptySpatialNotes': obs.removed_empty_spatial_notes},
            'spectralBandpass': obs.spectral_bandpass, 'libraries': dict(obs.library_versions),
            'scientificAvailability': 'UNKNOWN', 'rightsApproval': 'NOT_IMPLIED_BY_ADAPTER'}
        save(val / 'source-admission.json', admission)
        array = np.load(prev / 'master-rgba.npy', mmap_mode='r', allow_pickle=False)
        assert array.shape == (2048, 2048, 4) and array.dtype == np.uint8
        master = PreparedRgbTanMaster(meta['objectRef'], meta['center']['raDeg'], meta['center']['decDeg'],
            2048, meta['fieldDegrees'], array.tobytes(), source, obs.geometry,
            meta['sourceRgbSha256'], meta['sourceRawXmpSha256'], meta['sourceParserXmpSha256'],
            tuple(meta['sourceLibraryVersions'].items()), meta['geometricSupportPixels'],
            meta['supportedBlackPixels'], meta['sampling']['chunkRows'])
        assert plain(master.metadata()) == meta
        shutil.copyfile(prev / 'master-rgba.npy', val / 'master-rgba.npy')
        levels = {}
        for product in prepared_rgb_tan_products(master):
            name = product.level.lower() + '.png'
            assert (prev / name).read_bytes() == product.png_bytes
            shutil.copyfile(prev / name, val / name)
            levels[product.level] = {'file': bind(val / name), 'metadata': product.metadata()}
        after = inventory()
        assert after == before
        save(val / 'inputs-after.json', after)
        save(val / 'result.json', {'status': 'PASSED_BOUNDED_CACHED_MASTER_VALIDATION', 'requests': 0,
            'source': asdict(source), 'sourceAdmission': bind(val / 'source-admission.json'),
            'master': bind(val / 'master-rgba.npy') | {'rawArraySha256': meta['rgba']['sha256']},
            'masterMetadata': meta, 'levels': levels, 'sourceDecodes': 1, 'masterReprojections': 0,
            'scope': 'Actual fixed-owner source admission and saved master/products readback. Old task-only parser trial remains historical; no quality, astrometry, rights or target acceptance.'})
        verified = verify_cached_prepared_generation(val, root=ROOT,
            result_sha256=bind(val / 'result.json')['sha256'],
            before_sha256=bind(val / 'inputs-before.json')['sha256'],
            after_sha256=bind(val / 'inputs-after.json')['sha256'])
        receipt = publish_verified_prepared_generation(verified, pub, root=ROOT,
            publication_id='noirlab-' + rid + '-' + case['objectRef'].replace(':', '-') + '.v20261004-candidate')
        results.append({'status': receipt['status'], 'objectRef': case['objectRef'],
            'publicationHash': receipt['publicationHash'], 'manifest': bind(pub / 'manifest.json'),
            'sourceAdmission': bind(val / 'source-admission.json'), 'qualityAdopted': False})
    assert all(bind(ROOT/r['path'])['sha256'] == r['sha256'] for r in protected)
    save(OUT / 'result.json', results)
    print(json.dumps(results))

if __name__ == '__main__':
    main()
