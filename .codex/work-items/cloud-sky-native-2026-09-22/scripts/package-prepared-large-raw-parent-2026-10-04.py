"""Bridge the already executed real observation to the strict raw v1 writer.

No JPEG RGB decode, source projection, background fit or old artifact rewrite.
Original execution owners, source/admission and cached master/levels are pinned.
"""
from pathlib import Path
from dataclasses import asdict
import json
import shutil
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
PIPE = ROOT / 'data-pipelines/deep-sky'
PREV = ROOT / 'output/noirlab-m82-large-detail-1004-r1'
SRC = ROOT / 'output/noirlab-m82-large-source-1004-r1'
OUT = ROOT / 'output/prepared-large-raw-validation-1004-r2'
PUB = ROOT / 'output/prepared-large-raw-publication-1004-r1'
ARCHIVE = TASK / 'tmp/prepared-display-identity-before-2026-10-04'
sys.path[:0] = [str(PIPE), str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'),
               str(ROOT / 'output/pyavm-metadata-trial-1002-r1/lib')]
from optical_publication_io import bound_file, bound_bytes, pinned_json, decode_bound_npy
from prepared_rgb_observation import ByteIdentity, PreparedRgbSource, NominalAvmGeometry, _parser_xml
from prepared_rgb_tan import PreparedRgbTanMaster, prepared_rgb_tan_products
from publish_prepared_optical import verify_cached_prepared_generation, publish_verified_prepared_generation


def save(path, value):
    with path.open('x', encoding='utf-8') as file:
        json.dump(value, file, ensure_ascii=False, indent=2, allow_nan=False); file.write('\n')


def main():
    OUT.mkdir(exist_ok=False)
    shutil.copyfile(__file__, OUT / 'executed-script.py')
    generation, generation_pin = pinned_json(PREV / 'result.json',
        'd7b2174713c232a6bc7fdcda385f8344de30b79e7fb2ed62ba5de13d00894973', root=ROOT)
    old = generation['sourceAdmission']
    admission, admission_pin = pinned_json(ROOT / old['path'], old['sha256'], root=ROOT)
    assert admission_pin == old
    meta, meta_pin = pinned_json(PREV / 'master.json',
        'f070091721fec5c85456680344a02fb59f8c70d796977cd2e4e750c301b7079e', root=ROOT)
    old_before = json.loads((PREV / 'inputs-before.json').read_bytes())
    assert old_before == json.loads((PREV / 'inputs-after.json').read_bytes())
    # Newly extracted owners do not overwrite the historical execution pins.
    for row in old_before:
        actual = ROOT / row['path']
        try:
            bound_file(actual, root=ROOT, expected=row)
        except RuntimeError:
            saved = ARCHIVE / row['path']
            bound_file(saved, root=ROOT, expected=row)
            dest = OUT / 'executed-owners' / row['path']; dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(saved, dest)
    source_rows = [r for r in old_before if r['path'].startswith(SRC.relative_to(ROOT).as_posix() + '/')]
    current = [Path(__file__), PREV / 'result.json', PREV / 'source-admission.json', PREV / 'master.json',
               PREV / 'inputs-before.json', PREV / 'inputs-after.json']
    current += [PIPE / name for name in ('prepared_optical_levels.py', 'publish_prepared_optical.py', 'optical_publication_io.py')]
    def inventory():
        return {'files': [*old_before, *[bound_file(p, root=ROOT) for p in current]],
                'source': source_rows, 'historicalNominal': [], 'allPublishedAssets': []}
    before = inventory(); save(OUT / 'inputs-before.json', before)
    raw_xmp, _ = bound_bytes(SRC / 'embedded-xmp.xml', root=ROOT, expected=admission['source']['xmp'], max_bytes=1024 * 1024)
    normalized, spectral = _parser_xml(raw_xmp)
    normalized, spatial = _parser_xml(normalized, note_name='Spatial.Notes')
    assert spectral == admission['removedEmptySpectralNotes'] and spatial == admission['removedEmptySpatialNotes']
    (OUT / 'parser-normalized-xmp.xml').write_bytes(normalized)
    parser_pin = bound_file(OUT / 'parser-normalized-xmp.xml', root=ROOT)
    assert parser_pin['sha256'] == meta['sourceParserXmpSha256']
    assert admission['source'] == meta['source'] and admission['geometry'] == meta['sourceGeometry']
    typed = {'status': 'PASSED_BOUND_CACHED_OBSERVATION_REUSE', 'requests': 0,
        'source': admission['source'], 'geometry': admission['geometry'],
        'decodedRgb': {'bytes': admission['sourceRgbBytes'], 'sha256': admission['sourceRgbSha256'], 'shape': [4642, 8315, 3]},
        'normalization': {'parserXml': parser_pin, 'removedEmptySpectralNotes': spectral, 'removedEmptySpatialNotes': spatial},
        'scientificAvailability': 'UNKNOWN', 'sourceDecodesInThisRun': 0,
        'scope': 'Identity from pinned actual completed observation; only XML normalization and cached master/tiers readback here.'}
    save(OUT / 'source-admission.json', typed)
    facts = dict(meta['source']); facts['jpeg'] = ByteIdentity(**facts['jpeg']); facts['xmp'] = ByteIdentity(**facts['xmp'])
    geometry = dict(meta['sourceGeometry'])
    for key in ('reference_dimension', 'reference_pixel', 'reference_value', 'scale', 'decoded_shape_width_height', 'crpix', 'cdelt'):
        geometry[key] = tuple(geometry[key])
    raw, _ = bound_bytes(ROOT / generation['originalRgbMaster']['path'], root=ROOT,
        expected=generation['originalRgbMaster'], max_bytes=2048 ** 2 * 4 + 16384)
    array = decode_bound_npy(raw, shape=(2048, 2048, 4), dtype='u1')
    master = PreparedRgbTanMaster(meta['objectRef'], meta['center']['raDeg'], meta['center']['decDeg'], 2048,
        meta['fieldDegrees'], array.tobytes(), PreparedRgbSource(**facts), NominalAvmGeometry(**geometry),
        meta['sourceRgbSha256'], meta['sourceRawXmpSha256'], meta['sourceParserXmpSha256'],
        tuple(meta['sourceLibraryVersions'].items()), meta['geometricSupportPixels'], meta['supportedBlackPixels'], meta['sampling']['chunkRows'])
    assert json.loads(json.dumps(master.metadata())) == meta
    (OUT / 'master-rgba.npy').write_bytes(raw)
    levels = {}
    for product, previous in zip(prepared_rgb_tan_products(master), generation['products'], strict=True):
        encoded, _ = bound_bytes(ROOT / previous['rawPng']['path'], root=ROOT, expected=previous['rawPng'], max_bytes=2 * 1024 * 1024)
        assert encoded == product.png_bytes and json.loads(json.dumps(product.metadata())) == previous['originalProductMetadata']
        path = OUT / (product.level.lower() + '.png'); path.write_bytes(encoded)
        levels[product.level] = {'file': bound_file(path, root=ROOT), 'metadata': product.metadata()}
    after = inventory(); assert before == after; save(OUT / 'inputs-after.json', after)
    save(OUT / 'result.json', {'status': 'PASSED_BOUNDED_CACHED_MASTER_VALIDATION', 'requests': 0,
        'source': meta['source'], 'sourceAdmission': bound_file(OUT / 'source-admission.json', root=ROOT),
        'master': bound_file(OUT / 'master-rgba.npy', root=ROOT) | {'rawArraySha256': meta['rgba']['sha256']},
        'masterMetadata': meta, 'levels': levels, 'sourceDecodes': 0, 'masterReprojections': 0,
        'cachedObservation': {'admission': admission_pin, 'generation': generation_pin,
            'before': bound_file(PREV / 'inputs-before.json', root=ROOT), 'after': bound_file(PREV / 'inputs-after.json', root=ROOT)},
        'scope': 'Real original observation reused; raw v1 means unchanged encoded RGB. This does not publish the processed display pixels.'})
    pin = lambda name: bound_file(OUT / name, root=ROOT)['sha256']
    verified = verify_cached_prepared_generation(OUT, root=ROOT, result_sha256=pin('result.json'),
        before_sha256=pin('inputs-before.json'), after_sha256=pin('inputs-after.json'))
    published = publish_verified_prepared_generation(verified, PUB, root=ROOT,
        publication_id='noirlab-noao-m81m82-large-M-82.v20261004-raw-candidate')
    print(json.dumps({'status': published['status'], 'hash': published['publicationHash'],
        'sourceRgbDecodes': 0, 'reprojections': 0, 'qualityAdopted': False}))


if __name__ == '__main__':
    main()
