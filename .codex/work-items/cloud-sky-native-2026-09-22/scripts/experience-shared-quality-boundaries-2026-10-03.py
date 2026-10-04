"""Read-only current shared QA on cached publications; no source processing."""
from pathlib import Path
import hashlib
import json
import sys
ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / 'data-pipelines/deep-sky'))
import numpy
from PIL import Image
import image_quality as quality

OUT = (ROOT / sys.argv[1]).resolve()
assert OUT.parent == ROOT / 'output' and OUT.name.startswith('shared-quality-boundaries-')
OUT.mkdir()
catalog_path = ROOT / 'packages/astronomy-core/data/opengc-messier-deep-sky.v1.json'
prepared = ROOT / 'output/prepared-optical-publication-1003-r4/publication/manifest.json'
assert hashlib.sha256(prepared.read_bytes()).hexdigest() == '23faa1521ae39a6a7d92f36c87ebf691a75b6bd7b91a3654e9b24f63f4d793f1'
manifests = [ROOT / 'workers/miniapp-api/assets/deep-sky/manifest.json', *sorted((ROOT / 'workers/miniapp-api/assets/deep-sky').glob('sdss-*/manifest.json')), prepared]
protection = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json'
protected = json.loads(protection.read_bytes())
def bind(p):
    raw = p.read_bytes()
    return {'path': str(p), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
paths = [Path(__file__), catalog_path, protection, Path(quality.__file__), Path(sys.executable), Path(numpy.__file__), Path(Image.__file__), *manifests]
for path in manifests:
    manifest = json.loads(path.read_bytes())
    for entry in manifest.get('entries', [manifest]):
        paths += [path.parent / asset['file'] for asset in entry['levels'].values()]
paths += [ROOT / p['path'] for p in protected]
before = [bind(p) for p in dict.fromkeys(paths)]
for row in protected: assert bind(ROOT / row['path'])['sha256'] == row['sha256']
(OUT / 'inputs-before.json').write_text(json.dumps(before, indent=2) + '\n')
(OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
(OUT / 'executed-quality-owner.py').write_bytes(Path(quality.__file__).read_bytes())
catalog = json.loads(catalog_path.read_bytes())['rows']
reports = [quality.publication_report(p, catalog) for p in manifests]
quality.write_report(OUT / 'quality-reports.json', {'version': quality.QUALITY_VERSION, 'publications': reports})
exceptions = []
for publication in reports:
    for image in publication['reports']:
        boundary = image['displayDiagnostics']['supportBoundary']
        exceptions.append({'publicationId': publication['manifest']['publicationId'], 'objectRef': image['objectRef'], 'level': image['level'],
                           'asset': image['asset'], 'coverage': image['coverage'], 'review': image['review'],
                           'internalBoundaryPixels': boundary['internalBoundaryPixels'], 'internalBoundaryContributionPercentiles': boundary['internalBoundaryContributionPercentiles'],
                           'rasterCropSupportedPixels': boundary['rasterCropSupportedPixels'], 'rasterCropContributionPercentiles': boundary['rasterCropContributionPercentiles'],
                           'supportedLuminancePercentiles': image['regions']['full']['supportedLuminancePercentiles']})
after = [bind(p) for p in dict.fromkeys(paths)]
assert before == after
(OUT / 'inputs-after.json').write_text(json.dumps(after, indent=2) + '\n')
result = {'status': 'CURRENT_SHARED_QA_BOUNDARIES_MEASURED_NOT_ADOPTED', 'inputsBeforeAfterExact': True, 'exceptions': exceptions,
          'report': bind(OUT / 'quality-reports.json'), 'meaning': 'New common support-boundary and supported-pixel diagnostics only. All science/absolute registration/quality unknowns persist. No JPEG/FITS decode of originals, projection/master/LOD rewrite, network, rendering recipe, default adoption, source reconstruction, independent review or native/capacity certification.'}
quality.write_report(OUT / 'result.json', result)
print(json.dumps({'output': str(OUT), 'result': bind(OUT / 'result.json'), 'publications': len(reports), 'qualityAcceptance': 'UNVERIFIED'}))
