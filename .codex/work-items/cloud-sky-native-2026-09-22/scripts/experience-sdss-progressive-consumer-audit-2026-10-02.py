"""Task-only read/hash binding for an offline consumer audit, no runtime trial."""
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
FILES = [
    'apps/wechat-miniapp/src/features/sky/sky-scene-render.ts',
    'apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts',
    'apps/wechat-miniapp/src/features/sky/sky-render-surface.ts',
    'apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx',
    'apps/wechat-miniapp/src/features/sky/use-sky-sdss-optical.ts',
    'apps/wechat-miniapp/src/features/sky/sky-sdss-optical-selection.ts',
    'apps/wechat-miniapp/src/features/sky/use-sky-wide-field-w3.ts',
    'apps/wechat-miniapp/src/features/sky/use-sky-artwork.ts',
    'apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts',
    'apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts',
    'apps/wechat-miniapp/src/features/sky/deep-sky-image-request.ts',
    'apps/wechat-miniapp/src/features/sky/sky-zoom.ts',
    'apps/wechat-miniapp/src/features/sky/sky-galactic-band.ts',
    'apps/wechat-miniapp/src/services/api-client.ts',
    'packages/miniapp-contracts/src/sdss-optical-publication.ts',
    'packages/miniapp-contracts/src/deep-sky-image-publication.ts',
    'packages/miniapp-contracts/src/sky-image-display-support.ts',
    'workers/miniapp-api/src/deep-sky-imagery.ts',
    'data-pipelines/deep-sky/allwise_finite_tan.py',
    'data-pipelines/deep-sky/sdss_gri_tan.py',
    '.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-sdss-mosaic-composition-2026-10-02.mts',
    'output/playwright/cloud-sky-sdss-mosaic-candidate-1002-r2/result.json',
    'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json',
    'output/sdss-m51-gri-mosaic-candidate-1002-r2/overlap-diagnostics.json',
]

def digest(path):
    content = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(content),
            'sha256': hashlib.sha256(content).hexdigest()}

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()

def main():
    sources = [digest(ROOT / path) for path in FILES]
    preserved = json.loads((TASK / 'tmp/resume-preserved-hashes-2026-10-01.json').read_text('utf-8-sig'))
    preserved_checks = []
    for expected in preserved:
        actual = digest(ROOT / expected['path'])
        actual['unchanged'] = actual['sha256'] == expected['sha256']
        assert actual['unchanged'], expected['path']
        preserved_checks.append(actual)
    pairs = json.loads((ROOT / FILES[-1]).read_text('utf-8'))['fieldPairs']
    cross = [item for item in pairs if item['fieldA'].split('/')[1] != item['fieldB'].split('/')[1]]
    outside = []
    for pair in cross:
        bands = {band: pair['perBandNanomaggiesPerPixelDifference'][band]['outsideEnlargedCatalogEllipse'] for band in 'gri'}
        assert pair['outsideCatalogPixels'] == 0
        assert all(stats['samples'] == 0 and all(value is None for key, value in stats.items() if key != 'samples') for stats in bands.values())
        outside.append({'fieldA': pair['fieldA'], 'fieldB': pair['fieldB'], 'outsideCatalogPixels': 0, 'statistics': bands})
    assert len(pairs) == 9 and len(cross) == 5
    target = TASK / 'evidence/experience-sdss-progressive-consumer-audit-2026-10-02.json'
    target.write_text(json.dumps({
        'scope': 'Current-source offline read/hash consumer audit; no new rendering, runtime transition exercise, production edit or parameter matrix.',
        'branch': git('branch', '--show-current'), 'head': git('rev-parse', 'HEAD'),
        'script': digest(Path(__file__).resolve()), 'sources': sources,
        'preservedFiles': preserved_checks,
        'overlapPairReadback': {'allIntersectingPairs': len(pairs), 'crossRunPairs': len(cross), 'crossRunOutsideStatistics': outside},
        'runtimeClaims': {'currentV1OpaqueCoarseFineReplacement': 'SOURCE_CONTRACT_ONLY',
                          'candidateForcedAdditiveAndSignalOver': 'EXISTING_GPU_EVIDENCE_AND_SOURCE_ANALYSIS',
                          'livePageWideSelectedOverlap': 'UNVERIFIED; stable eligibility domains disjoint',
                          'nativeAcceptance': 'UNVERIFIED'},
    }, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    print(json.dumps(digest(target), ensure_ascii=False))

if __name__ == '__main__':
    main()
