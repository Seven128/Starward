"""One real cached two-grid profile through the standard exclusive publisher."""
from pathlib import Path
import hashlib
import json
import sys
import time

ROOT = Path(__file__).resolve().parents[4]
PIPE = ROOT / 'data-pipelines/deep-sky'
sys.path[:0] = [str(PIPE), str(ROOT / 'output/pyavm-metadata-trial-1002-r1/lib'), str(ROOT / 'output/allwise-w3-atlas-0929/python-deps')]
from optical_publication_io import bound_file
from publish_prepared_progressive import verify_cached_prepared_progressive, publish_verified_prepared_progressive

OUT = ROOT / 'output/prepared-progressive-version-1005-r1'


def record(path):
    return bound_file(ROOT / path, root=ROOT)


def save(name, value):
    with (OUT / name).open('x', encoding='utf-8', newline='\n') as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2, allow_nan=False)
        handle.write('\n')


def main():
    OUT.mkdir(exist_ok=False)
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    parent = 'output/hubble-m82-prepared-publication-1004-r2/manifest.json'
    fine = 'output/prepared-hubble-fine-sampling-1004-r1'
    medium = 'output/prepared-hubble-medium-sampling-1004-r1'
    owner_names = ['publish_prepared_progressive.py', 'publish_prepared_optical.py', 'prepared_optical_levels.py',
                   'prepared_rgb_tan.py', 'prepared_rgb_observation.py', 'optical_publication_io.py']
    owners = [record('data-pipelines/deep-sky/' + name) for name in owner_names]
    before = owners + [record(parent)]
    save('current-inputs-before.json', before)
    start = time.perf_counter()
    try:
        kwargs = dict(root=ROOT, parent=record(parent),
            parent_hash='c9b0592eb6409636739d58ed147266d7f0f1bf37bc4c91eeb0d99d78fccd667c',
            wide_metadata=record('output/hubble-m82-prepared-coverage-1004-r1/master.json'),
            wide_npy=record('output/hubble-m82-prepared-coverage-1004-r1/master-rgba.npy'),
            fine_result=record(fine + '/result.json'), fine_before=record(fine + '/inputs-before.json'), fine_after=record(fine + '/inputs-after.json'),
            medium_result=record(medium + '/result.json'), medium_before=record(medium + '/inputs-before.json'), medium_after=record(medium + '/inputs-after.json'),
            publication_id='hubble-m82-prepared-progressive-v2-1005-r1')
        # Useful escaped-identity regression: the frozen real parent cannot be
        # claimed by a caller's new hash even before decoding any cached pixels.
        wrong = dict(kwargs, parent_hash='0' * 64)
        try:
            verify_cached_prepared_progressive(**wrong)
            raise AssertionError('foreign parent hash accepted')
        except RuntimeError as error:
            assert str(error) == 'prepared_progressive_parent_identity_invalid'
            save('rejected-foreign-parent.json', {'error': str(error), 'newSourceDecodesOrProjections': 0})
        verified = verify_cached_prepared_progressive(**kwargs)
        receipt = publish_verified_prepared_progressive(verified, ROOT / 'output/prepared-progressive-grids-1005-r1',
            ROOT / 'output/prepared-progressive-publication-1005-r1', root=ROOT)
        after = [bound_file(ROOT / row['path'], root=ROOT, expected=row) for row in before]
        assert before == after
        save('current-inputs-after.json', after)
        manifest_path = ROOT / 'output/prepared-progressive-publication-1005-r1/manifest.json'
        manifest = json.loads(manifest_path.read_bytes())
        pngs = [record('output/prepared-progressive-publication-1005-r1/' + asset['file']) for asset in manifest['levels'].values()]
        save('result.json', {'status': 'REAL_CACHED_TWO_GRID_PROFILE_STANDARD_WRITER_PACKAGED',
            'manifest': bound_file(manifest_path, root=ROOT), 'publicationHash': manifest['publicationHash'],
            'imageVersion': manifest['imageVersion'], 'parentHash': manifest['parent']['publicationHash'],
            'levelPixels': {key: row['pixels'] for key, row in manifest['levels'].items()},
            'levelSamplingGrid': {key: row['samplingGrid'] for key, row in manifest['levels'].items()},
            'pngs': pngs, 'pngBodyBytes': sum(row['bytes'] for row in pngs),
            'writerReceipt': receipt, 'elapsedSeconds': time.perf_counter() - start,
            'sourceRgbDecodesPixelProjectionsBackgroundFits': 0, 'whole4096MotherCreated': False,
            'ordinaryRegistryAdopted': False, 'independentReview': 'MISSING', 'qualityNativeCapacity': 'UNVERIFIED_OR_FAILED',
            'next': 'PLAN top owns the remaining real static/HTTP and actual-page consumers; this writer receipt alone does not prove them.'})
        print(json.dumps({'status': 'REAL_CACHED_TWO_GRID_PROFILE_STANDARD_WRITER_PACKAGED',
            'publicationHash': manifest['publicationHash'], 'pngBodyBytes': sum(row['bytes'] for row in pngs),
            'elapsedSeconds': time.perf_counter() - start}))
    except Exception as error:
        save('failed.json', {'status': 'REAL_PROGRESSIVE_PUBLICATION_FAILED', 'error': repr(error)})
        raise


if __name__ == '__main__':
    main()
