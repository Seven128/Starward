"""Persist affected checks and initial typed failures; no Goal certification."""
from pathlib import Path
import json
import os
import subprocess

ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / 'output/prepared-progressive-checks-1005-r1'


def main():
    OUT.mkdir(exist_ok=False)
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    initial = {'status': 'INITIAL_TYPED_FAILURES_PRESERVED',
        'source': 'Exact compiler diagnostic text captured by tools before the two local type repairs.',
        'diagnostics': [
            {'owner': 'packages/miniapp-contracts', 'error': 'src/test-fixtures/prepared-progressive-optical-publication.ts(24,7): TS2322: masterCrop.boxFactor 2 | 4 | 1 is not assignable to 4 | 1.',
             'repair': 'The new fixture explicitly declares its actual OVERVIEW crop and factor4; production admission was not weakened.'},
            {'owner': 'workers/miniapp-api', 'error': 'src/sdss-optical-imagery.ts(192,5): TS2322: pixelSize 512 | 1024 is not assignable to SdssOpticalImageResult pixelSize 512.',
             'repair': 'Shared readTargetOpticalImageFile keeps a generic literal pixel size from the admitted descriptor; SDSS source/business code was not changed.'}],
        'notRuntimeOrImageQualityFailures': True}
    (OUT / 'initial-type-errors.json').write_text(json.dumps(initial, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    environment = dict(os.environ, TSX_TSCONFIG_PATH=str(ROOT / 'workers/miniapp-api/tsconfig.json'))
    commands = [
        ('contracts-regressions', ROOT, ['node', 'tools/run-node.cjs', '--import', 'tsx', '--test',
            'packages/miniapp-contracts/src/prepared-optical-publication.test.ts',
            'packages/miniapp-contracts/src/prepared-display-optical-publication.test.ts',
            'packages/miniapp-contracts/src/prepared-progressive-optical-publication.test.ts']),
        ('sky-providers-static-regressions', ROOT, ['node', 'tools/run-node.cjs', '--import', 'tsx', '--test',
            'workers/miniapp-api/src/prepared-optical-imagery.test.ts',
            'workers/miniapp-api/src/prepared-optical-static-export.test.ts',
            'workers/miniapp-api/src/prepared-optical-information.test.ts']),
        ('contracts-types', ROOT / 'packages/miniapp-contracts', ['node', 'node_modules/typescript/lib/tsc.js', '--noEmit', '-p', 'tsconfig.json']),
        ('worker-types', ROOT / 'workers/miniapp-api', ['node', 'node_modules/typescript/lib/tsc.js', '--noEmit', '-p', 'tsconfig.json']),
        ('app-types', ROOT / 'apps/wechat-miniapp', ['node', 'node_modules/typescript/lib/tsc.js', '--noEmit', '-p', 'tsconfig.json']),
        ('sdk-current', ROOT, ['node', 'tools/miniapp/generate-miniapp-sdk.mjs', '--check']),
    ]
    # Independent checks run concurrently; each retains its own exact result.
    from concurrent.futures import ThreadPoolExecutor
    def check(row):
        name, cwd, args = row
        p = subprocess.run(args, cwd=cwd, env=environment, capture_output=True, timeout=60)
        (OUT / (name + '.stdout.txt')).write_bytes(p.stdout)
        (OUT / (name + '.stderr.txt')).write_bytes(p.stderr)
        result = {'name': name, 'cwd': cwd.relative_to(ROOT).as_posix() or '.', 'command': args, 'exitCode': p.returncode}
        print(json.dumps(result), flush=True)
        return result
    with ThreadPoolExecutor(max_workers=len(commands)) as executor:
        checks = list(executor.map(check, commands))
    result = {'status': 'AFFECTED_DEVELOPMENT_CHECKS_PASSED' if all(r['exitCode'] == 0 for r in checks) else 'AFFECTED_DEVELOPMENT_CHECKS_FAILED',
        'checks': checks, 'initialTypedFailuresPreserved': True, 'independentReview': 'MISSING',
        'limits': 'Current contract/provider/static-owner/type/SDK development checks only. Actual page/readback are separate evidence; native quality, physical resources, static network exit, whole scope and final Goal remain unverified.'}
    (OUT / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    assert all(row['exitCode'] == 0 for row in checks), result


if __name__ == '__main__':
    main()
