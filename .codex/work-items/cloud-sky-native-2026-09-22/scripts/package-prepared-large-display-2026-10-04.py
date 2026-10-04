"""Real standard publication of the saved M82 display estimate; no source redo."""
from pathlib import Path
import json
import sys
ROOT = Path(__file__).resolve().parents[4]
PIPE = ROOT / 'data-pipelines/deep-sky'
sys.path[:0] = [str(PIPE), str(ROOT / 'output/sdss-psf-tools-1003-r1/python-deps'),
               str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'), str(ROOT / 'output/pyavm-metadata-trial-1002-r1/lib')]
from optical_publication_io import bound_file
from publish_prepared_optical import verify_cached_prepared_generation
from publish_prepared_display import verify_cached_prepared_display, publish_verified_prepared_display

RAW = ROOT / 'output/prepared-large-raw-validation-1004-r2'
PREV = ROOT / 'output/noirlab-m82-large-detail-1004-r1'
OUT = ROOT / 'output/prepared-large-display-validation-1004-r1'
PUB = ROOT / 'output/prepared-large-display-publication-1004-r1'


def main():
    OUT.mkdir(exist_ok=False)
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    pin = lambda path: bound_file(path, root=ROOT)['sha256']
    try:
        raw = verify_cached_prepared_generation(RAW, root=ROOT, result_sha256=pin(RAW / 'result.json'),
            before_sha256=pin(RAW / 'inputs-before.json'), after_sha256=pin(RAW / 'inputs-after.json'))
        verified = verify_cached_prepared_display(PREV, root=ROOT,
            result_sha256='d7b2174713c232a6bc7fdcda385f8344de30b79e7fb2ed62ba5de13d00894973', raw=raw,
            parent_manifest=ROOT / 'output/prepared-large-raw-publication-1004-r1/manifest.json',
            parent_manifest_sha256=pin(ROOT / 'output/prepared-large-raw-publication-1004-r1/manifest.json'),
            guard_manifest=ROOT / 'output/hubble-m82-prepared-publication-1004-r2/manifest.json',
            guard_manifest_sha256='3823d73fbc836710141e4052c9950de148a7bebb608b943ffb601111e383a7ca')
        report = OUT / 'result.json'
        report.write_text(json.dumps(verified.report, ensure_ascii=False, allow_nan=False, indent=2) + '\n', encoding='utf-8')
        receipt = publish_verified_prepared_display(verified, PUB, root=ROOT,
            publication_id='noirlab-noao-m81m82-large-M-82.v20261004-display-candidate',
            verification_receipt=report, verification_sha256=pin(report))
        print(json.dumps({'status': receipt['status'], 'imageVersion': receipt['imageVersion'],
            'publicationHash': receipt['publicationHash'], 'parentHash': verified.report['parentHash'],
            'pngBytes': sum(len(p.png_bytes) for p in verified.products),
            'sourceRgbDecodes': 0, 'reprojections': 0, 'backgroundFits': 0, 'qualityAdopted': False}))
    except Exception as error:
        (OUT / 'failed.json').write_text(json.dumps({'status': 'DISPLAY_VALIDATION_OR_PUBLICATION_FAILED',
            'error': repr(error)}, indent=2) + '\n', encoding='utf-8')
        raise


if __name__ == '__main__':
    main()
