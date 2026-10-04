"""Read saved outputs and byte scope; no image processing or runtime replay."""
from collections import Counter
from pathlib import Path
import difflib
import hashlib
import json
import re
import subprocess
import sys
import tomllib

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
ARCHIVE = TASK / 'tmp/prepared-display-identity-before-2026-10-04'
PUBLISHED_OWNERS = TASK / 'tmp/prepared-display-published-owners-2026-10-04'
NEW_SOURCES = [
    'packages/miniapp-contracts/src/prepared-optical-common.ts',
    'packages/miniapp-contracts/src/prepared-display-optical-publication.ts',
    'packages/miniapp-contracts/src/prepared-rendered-optical-publication.ts',
    'packages/miniapp-contracts/src/prepared-display-optical-publication.test.ts',
    'packages/miniapp-contracts/src/test-fixtures/prepared-optical-publication.ts',
    'packages/miniapp-contracts/src/test-fixtures/prepared-display-optical-publication.ts',
    'data-pipelines/deep-sky/prepared_optical_levels.py',
    'data-pipelines/deep-sky/pack_prepared_rendered_optical_publication.mts',
    'data-pipelines/deep-sky/publish_prepared_display.py',
    'data-pipelines/deep-sky/test_publish_prepared_display.py',
    'workers/miniapp-api/src/test-fixtures/prepared-display-optical-publication.ts',
    'workers/miniapp-api/src/prepared-display-optical-imagery.test.ts',
]
TASK_SCRIPTS = [
    'package-prepared-large-raw-parent-2026-10-04.py',
    'package-prepared-large-display-2026-10-04.py',
    'generate-prepared-display-page-2026-10-04.py',
    'build-prepared-display-m82-page-2026-10-04.mts',
    'experience-prepared-display-m82-page-2026-10-04.mts',
    'readback-prepared-display-m82-page-2026-10-04.py',
    'check-prepared-display-version-2026-10-04.mts',
    'check-prepared-display-identity-scope-2026-10-04.py',
]
OUTPUTS = [
    'output/prepared-large-raw-validation-1004-r1',
    'output/prepared-large-raw-validation-1004-r2',
    'output/prepared-large-raw-publication-1004-r1',
    'output/prepared-large-display-validation-1004-r1',
    'output/prepared-large-display-publication-1004-r1',
    'output/playwright/cloud-sky-prepared-display-m82-page-1004-r1',
    'output/prepared-display-m82-page-readback-1004-r1',
    'output/prepared-display-version-readback-1004-r1',
]


def read(path):
    return json.loads(path.read_bytes())


def bind(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest()}


def same(row, path=None):
    actual = bind(path or ROOT / row['path'])
    assert actual['sha256'] == row['sha256'], row['path']
    if 'bytes' in row:
        assert actual['bytes'] == row['bytes'], row['path']
    return actual


def command(*args):
    return subprocess.run(args, cwd=ROOT, capture_output=True, text=True, check=True)


def links(text):
    return Counter(re.findall(r'\[[^\]\n]+\]\(([^)\n]+)\)', text))


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    start = read(ARCHIVE / 'scope-before.json')
    allowed = {row['path']: row for row in start['archived']}
    old = read(TASK / 'tmp/noirlab-empty-spatial-before-2026-10-04/scope-before.json')
    unchanged, changed_bound = [], []
    for row in old['currentSources']:
        now = bind(ROOT / row['path'])
        if now == row:
            unchanged.append(now)
        else:
            assert row['path'] in allowed, row['path']
            assert row == allowed[row['path']], row['path']
            changed_bound.append({'before': row, 'after': now})

    changed, archived_unchanged, added_links, net_diff = [], [], [], []
    for row in start['archived']:
        saved = same(row, ARCHIVE / row['path'])
        path = ROOT / row['path']
        now = bind(path)
        if now == row:
            archived_unchanged.append(now)
            continue
        changed.append({'before': row, 'archived': saved, 'after': now})
        before_text = (ARCHIVE / row['path']).read_text(encoding='utf-8')
        after_text = path.read_text(encoding='utf-8')
        net_diff.extend(difflib.unified_diff(before_text.splitlines(True), after_text.splitlines(True),
                                            fromfile='archived/' + row['path'], tofile=row['path']))
        if path.suffix == '.md':
            added_links.extend((path, target, count) for target, count in
                               (links(after_text) - links(before_text)).items())
    for rel in NEW_SOURCES:
        path = ROOT / rel
        assert path.is_file()
        text = path.read_text(encoding='utf-8')
        assert all(line == line.rstrip(' \t') for line in text.splitlines()), rel
        net_diff.extend(difflib.unified_diff([], text.splitlines(True), fromfile='/dev/null', tofile=rel))

    previous = read(TASK / 'evidence/prepared-large-source-scope-verification-2026-10-04.json')
    offline = [same(row) for row in previous['unchangedSeparateOfflineOwners']]
    protected = [same(row) for row in start['protected']]
    old_protected = read(TASK / 'tmp/resume-preserved-hashes-2026-10-01.json')
    assert [{k: row[k] for k in ['path', 'sha256']} for row in protected] == old_protected
    photos = [same(row) for row in previous['unchangedCachedPhotos']]
    large = same(previous['largerSourceImage'])
    rights = same(previous['unchangedRightsReceipt'])
    trial = read(ROOT / 'output/noirlab-m82-large-detail-1004-r1/result.json')
    materials = [same(trial[key]) for key in ['sourceAdmission', 'originalRgbMaster',
                  'prototypeDisplayMaster', 'displayBackground', 'estimationMask']]
    version = read(ROOT / 'output/prepared-display-version-readback-1004-r1/result.json')
    old_publications = []
    for row in version['unchangedRawV1']:
        file = same(row)
        manifest = read(ROOT / row['path'])
        assert manifest['publicationHash'] == row['publicationHash']
        old_publications.append({**file, 'publicationHash': row['publicationHash']})
    published = []
    executed = read(PUBLISHED_OWNERS / 'pins.json')
    union = {}
    for kind, expected_hash in [('raw', '3a33ced542d92bedb2225157d5d21de32d048aa992900a038c0940b8dc2e05af'),
                               ('display', '97bd0d5b1ebb48e47cb147d273838f79566ea9f72f2bbfa446c2e73fd3736b9c')]:
        directory = ROOT / f'output/prepared-large-{kind}-publication-1004-r1'
        manifest = read(directory / 'manifest.json')
        assert manifest['publicationHash'] == expected_hash
        binaries = [same(row, directory / row['file']) for row in manifest['levels'].values()]
        receipt = read(directory / 'writer-receipt.json')
        assert receipt['implementationBefore'] == receipt['implementationAfter']
        for row in receipt['implementationBefore']:
            assert row['path'] not in union or union[row['path']] == row
            union[row['path']] = row
        published.append({'manifest': bind(directory / 'manifest.json'), 'hash': expected_hash,
                          'binaryPins': binaries, 'binaryBytes': sum(row['bytes'] for row in binaries)})
    assert {row['path']: row for row in executed} == union
    executed_copies = [same(row, PUBLISHED_OWNERS / row['path']) for row in executed]
    # Later type-only compilation repairs do not replace publisher execution bytes.
    executed_now_differences = [{'executed': row, 'now': bind(ROOT / row['path'])}
                               for row in executed if bind(ROOT / row['path']) != row]
    assert [row['executed']['path'] for row in executed_now_differences] == [
        'packages/miniapp-contracts/src/prepared-optical-publication.ts']

    operations = Path('packages/miniapp-contracts/api/miniapp.operations.json')
    before_operations = (ARCHIVE / operations).read_text(encoding='utf-8')
    after_operations = (ROOT / operations).read_text(encoding='utf-8')
    assert after_operations == before_operations.replace('"responseType": "PreparedOpticalManifest"',
                                                        '"responseType": "PreparedRenderedOpticalManifest"')
    generated = Path('packages/miniapp-contracts/src/generated/miniapp-api.generated.ts')
    assert (ROOT / generated).read_text(encoding='utf-8') == (ARCHIVE / generated).read_text(
        encoding='utf-8').replace('PreparedOpticalManifest', 'PreparedRenderedOpticalManifest')
    service = ROOT / 'workers/miniapp-api/src/prepared-optical-imagery.ts'
    assert 'constructor(descriptors: readonly PreparedRenderedOpticalPublicationDescriptor[] = [])' in service.read_text(encoding='utf-8')
    human = TASK / 'evidence/experience-prepared-display-identity-2026-10-04.md'
    added_links.extend((human, target, count) for target, count in links(human.read_text(encoding='utf-8')).items())
    local_links = []
    for owner, target, count in added_links:
        if '://' in target or target.startswith('#'):
            continue
        path = (owner.parent / target.split('#', 1)[0]).resolve()
        assert path.is_file(), (owner, target)
        local_links.append({'owner': owner.relative_to(ROOT).as_posix(), 'target': target,
                            'occurrences': count, 'exists': True})
    manifest_path = ROOT / 'project_context/context.toml'
    context = tomllib.loads(manifest_path.read_text(encoding='utf-8'))
    declared = [entry['path'] for entry in context.get('context', [])]
    declared += [entry['context'] for entry in context.get('areas', []) if entry.get('context')]
    declared += context.get('default_files', [])
    assert all((ROOT / name).is_file() for name in declared)
    assert 'project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md' in declared
    cli = command('pwsh', '-NoLogo', '-NoProfile', '-Command',
                  '@(Get-Command ty-context -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source) | ConvertTo-Json -Compress').stdout.strip()
    branch = command('git', 'branch', '--show-current').stdout.strip()
    head = command('git', 'rev-parse', 'HEAD').stdout.strip()
    staged = command('git', 'diff', '--cached', '--name-only').stdout.strip()
    assert branch == 'codex/remote-main-20260908' and head == '72e65cf309d700cb7d40c5b7afd53660fd39fa35'
    assert not staged
    diff_check = command('git', 'diff', '--check', '--', *allowed, *NEW_SOURCES)
    assert not diff_check.stdout
    processes = json.loads(command('pwsh', '-NoLogo', '-NoProfile', '-Command',
        "Get-Process -Id 18132,24040 | Select-Object Id,ProcessName,@{Name='StartedUtc';Expression={$_.StartTime.ToUniversalTime().ToString('o')}} | ConvertTo-Json -Compress").stdout)
    previous_processes = read(TASK / 'evidence/noirlab-prepared-wide-process-readback-2026-10-04.json')
    assert sorted(processes, key=lambda row: row['Id']) == sorted(previous_processes, key=lambda row: row['Id'])
    goal_chars = len((TASK / 'GOAL-CURRENT.md').read_text(encoding='utf-8'))
    assert goal_chars == 3503 and goal_chars < 4000
    groups = []
    for rel in OUTPUTS:
        files = [p for p in (ROOT / rel).rglob('*') if p.is_file()]
        groups.append({'directory': rel, 'files': len(files), 'logicalBytes': sum(p.stat().st_size for p in files)})
    total = sum(row['logicalBytes'] for row in groups)
    assert total == 70583970
    net = TASK / 'evidence/prepared-display-identity-net-change-2026-10-04.diff'
    with net.open('x', encoding='utf-8', newline='\n') as stream:
        stream.writelines(net_diff)
    result = {
        'status': 'PASSED_BOUNDED_SKY_SOURCE_AND_PROTECTED_SCOPE', 'branch': branch, 'head': head,
        'stagedFiles': [], 'priorBoundSourceCount': len(old['currentSources']),
        'unchangedPreviouslyBoundSourceCount': len(unchanged), 'allowedChangedPriorBindings': changed_bound,
        'archivedChangedOwnersAndDocuments': changed, 'archivedUnchanged': archived_unchanged,
        'newSourcesAndTests': [bind(ROOT / rel) for rel in NEW_SOURCES],
        'unchangedSeparateOfflineOwners': offline, 'protected': protected,
        'unchangedCachedPhotos': photos, 'largerSourceImage': large, 'unchangedRightsReceipt': rights,
        'unchangedLargeTrialMaterials': materials, 'unchangedOldPublications': old_publications,
        'publishedOutputs': published, 'publisherExecutionArchive': executed_copies,
        'postPublicationTypeRepair': executed_now_differences, 'apiOnlyPreparedResponseChanged': True,
        'generatedSdkOnlyPreparedTypeChanged': True, 'ordinaryRegistry': 'EMPTY',
        'newTaskScripts': [bind(TASK / 'scripts' / name) for name in TASK_SCRIPTS],
        'newHumanEvidence': bind(human), 'netPhaseDiff': bind(net),
        'contextChecks': {'manifest': bind(manifest_path), 'declaredFileEntriesChecked': len(declared),
                          'affectedOwnerRegistered': True, 'addedLocalMarkdownLinks': local_links,
                          'tyContextCliDiscovery': cli or 'UNAVAILABLE_IN_THIS_COMMAND_PATH',
                          'limits': 'TOML/declared paths/added local links only; not old links, anchors or product facts.'},
        'scopedGitDiffCheck': 'PASS', 'scopedGitDiffWarnings': diff_check.stderr,
        'processes': processes, 'goalCurrentCharacters': goal_chars,
        'retainedOutputGroups': groups, 'retainedOutputLogicalBytes': total,
        'threePhaseOutputLogicalBytes': previous['twoPhaseOutputLogicalBytes'] + total,
        'preservedFailures': [bind(ROOT / 'output/prepared-large-raw-validation-1004-r1/failed.json'),
                             bind(TASK / 'tmp/prepared-display-page-generator-r1-failed.json')],
        'limits': '491 prior source pins, explicit archives/new files, two separate owners, six protected files and bound source/publication materials; not exhaustive every untracked repository file. All source changes are Prepared Sky dependencies. Logical diagnostics/archive bytes are not physical peak, production inventory, wire traffic or capacity. Quality/independent review/native/Android/iOS/full journey remain unverified; Goal not complete.'}
    destination = TASK / 'evidence/prepared-display-identity-scope-verification-2026-10-04.json'
    with destination.open('x', encoding='utf-8') as stream:
        stream.write(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'status': result['status'], 'priorBound': len(old['currentSources']),
                      'unchangedPrior': len(unchanged), 'changedPrior': len(changed_bound),
                      'changedArchived': len(changed), 'newSources': len(NEW_SOURCES),
                      'protected': len(protected), 'contextDeclared': len(declared),
                      'newLogicalOutputBytes': total, 'goalCharacters': goal_chars}, ensure_ascii=False))


if __name__ == '__main__':
    main()
