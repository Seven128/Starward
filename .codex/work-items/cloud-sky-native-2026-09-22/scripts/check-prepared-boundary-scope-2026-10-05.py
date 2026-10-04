"""Fresh scope verification for task-only actual boundary work."""
from collections import Counter
from pathlib import Path
import hashlib
import json
import re
import subprocess
import tomllib

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
ARCHIVE = TASK / 'tmp/prepared-boundary-before-2026-10-04'


def read(path):
    return json.loads(path.read_bytes())


def bind(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def same(row, path=None):
    actual = bind(path or ROOT / row['path'])
    assert actual['sha256'] == row['sha256'], row['path']
    if 'bytes' in row:
        assert actual['bytes'] == row['bytes'], row['path']
    return actual


def command(*args):
    return subprocess.run(args, cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()


def links(text):
    return Counter(re.findall(r'\[[^\]\n]+\]\(([^)\n]+)\)', text))


def main():
    before = read(ARCHIVE / 'scope-before.json')
    sources = [same(row) for row in before['sources']]
    protected = [same(row) for row in before['protected']]
    assert len(sources) == 523
    assert [{'path': row['path'], 'sha256': row['sha256']} for row in protected] == read(TASK / 'tmp/resume-preserved-hashes-2026-10-01.json')
    previous = read(TASK / 'evidence/prepared-sampling-scope-verification-2026-10-04.json')
    immutable = {}
    for key, rows in previous['unchangedOriginalMaterial'].items():
        immutable[key] = [same(row) for row in rows] if isinstance(rows, list) else same(rows)
    published = []
    for group in previous['unchangedPublishedOutputs']:
        manifest = same(group['manifest'])
        assert read(ROOT / manifest['path'])['publicationHash'] == group['hash']
        published.append({'manifest': manifest, 'hash': group['hash'], 'binaryPins': [same(row) for row in group['binaryPins']]})
    documents = []
    new_links = []
    after_pins = {row['path']: row for row in read(ARCHIVE / 'documents-after.json')}
    for row in before['documents']:
        saved = same(row, ARCHIVE / row['path'])
        path = ROOT / row['path']
        after = same(after_pins[row['path']])
        assert after['sha256'] != row['sha256']
        documents.append({'before': row, 'archive': saved, 'after': after})
        new_links.extend((path, target) for target in links(path.read_text(encoding='utf-8')) - links((ARCHIVE / row['path']).read_text(encoding='utf-8')))
    human = TASK / 'evidence/experience-prepared-boundary-applicability-2026-10-05.md'
    new_links.extend((human, target) for target in links(human.read_text(encoding='utf-8')))
    checked_links = []
    for path, target in new_links:
        if '://' in target or target.startswith('#'):
            continue
        resolved = (path.parent / target.split('#', 1)[0]).resolve()
        assert resolved.is_file(), (path, target)
        checked_links.append({'owner': path.relative_to(ROOT).as_posix(), 'target': target, 'exists': True})
    manifest = tomllib.loads((ROOT / 'project_context/context.toml').read_text(encoding='utf-8'))
    declared = [row['path'] for row in manifest.get('context', [])] + [row['context'] for row in manifest.get('areas', []) if row.get('context')] + manifest.get('default_files', [])
    assert len(declared) == 47 and all((ROOT / path).is_file() for path in declared)
    assert (TASK / 'PLAN.md').read_text(encoding='utf-8').count('**当前唯一下一依赖') == 1
    assert len((TASK / 'GOAL-CURRENT.md').read_text(encoding='utf-8')) <= 4000
    names = [
        'generate-prepared-boundary-pairs-2026-10-04.py',
        'experience-prepared-boundary-pairs-2026-10-04.mts',
        'trial-prepared-hubble-medium-sampling-2026-10-04.py',
        'generate-prepared-boundary-medium-2026-10-04.py',
        'experience-prepared-boundary-medium-2026-10-04.mts',
        'measure-prepared-boundary-geometry-2026-10-04.mts',
        'readback-prepared-boundary-pairs-2026-10-04.py',
        'update-prepared-boundary-docs-2026-10-05.py',
        'check-prepared-boundary-scope-2026-10-05.py',
    ]
    scripts = [bind(TASK / 'scripts' / name) for name in names]
    for row in scripts + [bind(human)]:
        assert all(line == line.rstrip(' \t') for line in (ROOT / row['path']).read_text(encoding='utf-8').splitlines()), row['path']
    assert not command('git', 'diff', '--check', '--', *[row['after']['path'] for row in documents], *[row['path'] for row in scripts], human.relative_to(ROOT).as_posix())
    assert command('git', 'branch', '--show-current') == 'codex/remote-main-20260908'
    assert command('git', 'rev-parse', 'HEAD') == '72e65cf309d700cb7d40c5b7afd53660fd39fa35'
    assert not command('git', 'diff', '--cached', '--name-only')
    processes = json.loads(command('pwsh', '-NoProfile', '-Command', "@(Get-Process -Id 24040,18132 | ForEach-Object { @{id=$_.Id;startUtc=$_.StartTime.ToUniversalTime().ToString('o')} }) | ConvertTo-Json -Compress"))
    wanted = {24040: '2026-09-30T18:03:53.4146084Z', 18132: '2026-09-30T18:18:41.4359228Z'}
    assert len(processes) == 2 and all(wanted.get(row['id']) == row['startUtc'] for row in processes)
    readback = read(ROOT / 'output/prepared-boundary-readback-1004-r1/result.json')
    assert readback['strictRecovery']['status'] == 'FAILED_STRICT_PIXEL_RESTORATION'
    assert readback['strictRecovery']['cause'] == 'UNKNOWN'
    assert readback['strictRecovery']['changedRgbChannels'] == 2
    assert readback['strictRecovery']['oldEpochFinalLogicalRetirement'].startswith('MISSING')
    for value in readback['higherParentFinalResources'].values():
        assert value == 0 or value == [], value
    paths = [row['path'] for row in readback['currentOutputGroups']] + ['output/prepared-boundary-readback-1004-r1']
    outputs = []
    for path in paths:
        files = [item for item in (ROOT / path).rglob('*') if item.is_file()]
        outputs.append({'path': path, 'files': len(files), 'logicalBytes': sum(item.stat().st_size for item in files)})
    report = {
        'status': 'UNCHANGED_PRODUCTION_PROTECTED_PUBLISHED_AND_PROCESS_SCOPE',
        'head': command('git', 'rev-parse', 'HEAD'), 'branch': command('git', 'branch', '--show-current'),
        'stagedFiles': 0, 'unchangedSources': sources, 'protected': protected,
        'unchangedOriginalMaterial': immutable, 'unchangedPublishedOutputs': published,
        'updatedDocuments': documents, 'newTaskScripts': scripts, 'newHumanEvidence': bind(human),
        'newLocalLinksChecked': checked_links, 'declaredContextPathsChecked': len(declared),
        'processesUnchanged': processes, 'currentOutputs': outputs,
        'currentOutputLogicalBytes': sum(row['logicalBytes'] for row in outputs),
        'readback': bind(ROOT / 'output/prepared-boundary-readback-1004-r1/result.json'),
        'knownStrictFailurePreserved': readback['strictRecovery'],
        'newEpochRetirementOnly': True, 'noProductionChangesThisPhase': True,
        'ordinaryRegistryAdopted': False, 'goalAcceptance': 'UNVERIFIED_AND_ACTIVE',
        'limits': 'Bounded hash/owner checks for this task-only boundary slice, not a complete uncommitted-worktree inventory, physical capacity, independent review, native or final Goal acceptance.',
    }
    output = TASK / 'evidence/prepared-boundary-scope-verification-2026-10-05.json'
    with output.open('x', encoding='utf-8', newline='\n') as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
        handle.write('\n')
    print(json.dumps({'status': report['status'], 'unchangedSourcePins': len(sources), 'protected': len(protected), 'updatedOwners': len(documents), 'newTaskScripts': len(scripts), 'contextPaths': len(declared), 'outputLogicalBytes': report['currentOutputLogicalBytes']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
