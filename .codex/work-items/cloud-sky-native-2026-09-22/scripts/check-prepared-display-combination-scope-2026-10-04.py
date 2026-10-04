"""Scope/link/readback verification only; no replay of page or image work."""
from collections import Counter
from pathlib import Path
import hashlib
import json
import re
import subprocess
import sys
import tomllib

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
ARCHIVE = TASK / 'tmp/prepared-display-combination-docs-before-2026-10-04'
SCRIPTS = [
    'generate-prepared-display-combination-2026-10-04.py',
    'experience-prepared-display-combination-2026-10-04.mts',
    'readback-prepared-display-combination-2026-10-04.py',
    'generate-prepared-display-late-decode-2026-10-04.py',
    'experience-prepared-display-late-decode-2026-10-04.mts',
    'readback-prepared-display-late-decode-2026-10-04.py',
    'check-prepared-display-combination-scope-2026-10-04.py',
]
OUTPUTS = [
    'output/playwright/cloud-sky-prepared-display-combination-1004-r1',
    'output/prepared-display-combination-readback-1004-r1',
    'output/playwright/cloud-sky-prepared-display-late-decode-1004-r1',
    'output/prepared-display-late-decode-readback-1004-r1',
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
    previous = read(TASK / 'evidence/prepared-display-identity-scope-verification-2026-10-04.json')
    baseline = read(TASK / 'tmp/prepared-display-combination-current-inputs-2026-10-04.json')
    sources = [same(row) for row in baseline['currentSources']]
    protected = [same(row) for row in baseline['protected']]
    original_protected = read(TASK / 'tmp/resume-preserved-hashes-2026-10-01.json')
    assert [{'path': row['path'], 'sha256': row['sha256']} for row in protected] == original_protected
    prior_sources = [same(row['after']) for row in previous['archivedChangedOwnersAndDocuments']
                     if not row['after']['path'].endswith('.md')]
    prior_new = [same(row) for row in previous['newSourcesAndTests']]
    offline = [same(row) for row in previous['unchangedSeparateOfflineOwners']]
    photos = [same(row) for row in previous['unchangedCachedPhotos']]
    large = same(previous['largerSourceImage'])
    materials = [same(row) for row in previous['unchangedLargeTrialMaterials']]
    rights = same(previous['unchangedRightsReceipt'])
    old_publications = [same(row) for row in previous['unchangedOldPublications']]
    new_publications = []
    for row in previous['publishedOutputs']:
        manifest = same(row['manifest'])
        assert read(ROOT / manifest['path'])['publicationHash'] == row['hash']
        binaries = [same(pin) for pin in row['binaryPins']]
        new_publications.append({'manifest': manifest, 'hash': row['hash'], 'binaries': binaries})
    same(previous['newHumanEvidence'])
    same(previous['netPhaseDiff'])
    for row in previous['newTaskScripts']:
        same(row)
    documents, new_links = [], []
    for row in read(ARCHIVE / 'documents-before.json'):
        saved = same(row, ARCHIVE / row['path'])
        path = ROOT / row['path']
        after = bind(path)
        assert after != row, row['path']
        documents.append({'before': row, 'archived': saved, 'after': after})
        new_links.extend((path, target, count) for target, count in
            (links(path.read_text(encoding='utf-8')) - links((ARCHIVE / row['path']).read_text(encoding='utf-8'))).items())
    human = TASK / 'evidence/experience-prepared-display-combinations-2026-10-04.md'
    new_links.extend((human, target, count) for target, count in links(human.read_text(encoding='utf-8')).items())
    local_links = []
    for owner, target, count in new_links:
        if '://' in target or target.startswith('#'):
            continue
        resolved = (owner.parent / target.split('#', 1)[0]).resolve()
        assert resolved.is_file(), (owner, target)
        local_links.append({'owner': owner.relative_to(ROOT).as_posix(), 'target': target,
                            'occurrences': count, 'exists': True})
    manifest_path = ROOT / 'project_context/context.toml'
    context = tomllib.loads(manifest_path.read_text(encoding='utf-8'))
    declared = [row['path'] for row in context.get('context', [])]
    declared += [row['context'] for row in context.get('areas', []) if row.get('context')]
    declared += context.get('default_files', [])
    assert len(declared) == 47 and all((ROOT / rel).is_file() for rel in declared)
    assert 'project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md' in declared
    assert (TASK / 'PLAN.md').read_text(encoding='utf-8').count('**当前唯一下一依赖') == 1
    diff_check = command('git', 'diff', '--check', '--', *[row['after']['path'] for row in documents],
                         *[str((TASK / 'scripts' / name).relative_to(ROOT)) for name in SCRIPTS],
                         str(human.relative_to(ROOT)))
    assert not diff_check.stdout
    for name in SCRIPTS:
        text = (TASK / 'scripts' / name).read_text(encoding='utf-8')
        assert all(line == line.rstrip(' \t') for line in text.splitlines()), name
    branch = command('git', 'branch', '--show-current').stdout.strip()
    head = command('git', 'rev-parse', 'HEAD').stdout.strip()
    staged = command('git', 'diff', '--cached', '--name-only').stdout.strip()
    assert branch == previous['branch'] and head == previous['head'] and not staged
    processes = json.loads(command('pwsh', '-NoLogo', '-NoProfile', '-Command',
        "Get-Process -Id 18132,24040 | Select-Object Id,ProcessName,@{Name='StartedUtc';Expression={$_.StartTime.ToUniversalTime().ToString('o')}} | ConvertTo-Json -Compress").stdout)
    assert sorted(processes, key=lambda row: row['Id']) == sorted(previous['processes'], key=lambda row: row['Id'])
    goal_chars = len((TASK / 'GOAL-CURRENT.md').read_text(encoding='utf-8'))
    assert goal_chars == previous['goalCurrentCharacters'] == 3503
    groups = []
    for rel in OUTPUTS:
        files = [p for p in (ROOT / rel).rglob('*') if p.is_file()]
        groups.append({'directory': rel, 'files': len(files), 'logicalBytes': sum(p.stat().st_size for p in files)})
    total = sum(row['logicalBytes'] for row in groups)
    assert total == 96607991
    combination = read(ROOT / 'output/prepared-display-combination-readback-1004-r1/result.json')
    late = read(ROOT / 'output/prepared-display-late-decode-readback-1004-r1/result.json')
    assert combination['frontendInputs'] == late['frontendInputs'] == 510
    assert combination['backendInputs'] == late['backendInputs'] == 167
    assert all(row['status'] == 'PASSED' for row in combination['pixelComparisons'])
    assert late['coldFineWarmFinePixels']['status'] == 'PASSED'
    assert combination['successfulPreparedBytes'] == late['successfulPreparedBytes'] == 1208058
    assert len(combination['capturesGlPngGl']) == 16 and len(late['capturesGlPngGl']) == 4
    result = {
        'status': 'UNCHANGED_BOUNDED_SKY_PRODUCTION_AND_PROTECTED_SCOPE', 'branch': branch, 'head': head,
        'stagedFiles': [], 'unchangedCurrentBoundSources': len(sources),
        'unchangedPriorModifiedSources': prior_sources, 'unchangedPriorNewSources': prior_new,
        'unchangedSeparateOfflineOwners': offline, 'protected': protected,
        'unchangedCachedPhotos': photos, 'largerSourceImage': large, 'unchangedLargeTrialMaterials': materials,
        'unchangedRightsReceipt': rights, 'unchangedOldPublications': old_publications,
        'unchangedRawAndDisplayPublication': new_publications,
        'newTaskScripts': [bind(TASK / 'scripts' / name) for name in SCRIPTS],
        'changedOwningDocuments': documents, 'newHumanEvidence': bind(human),
        'freshScopeSnapshot': bind(TASK / 'tmp/prepared-display-combination-current-inputs-2026-10-04.json'),
        'preservedTaskDocumentR1Failure': bind(ARCHIVE / 'doc-update-r1-failed.json'),
        'contextChecks': {'manifest': bind(manifest_path), 'declaredFileEntriesChecked': len(declared),
                          'affectedOwnerRegistered': True, 'singleAuthoritativeNextDependency': True,
                          'addedLocalMarkdownLinks': local_links,
                          'cliAvailabilityPreviouslyCheckedThisTurn': previous['contextChecks']['tyContextCliDiscovery'],
                          'limits': 'Manual TOML, declared files and new local link existence only; CLI not reinstalled/reprobed, old links and anchors not certified.'},
        'scopedGitDiffCheck': 'PASS', 'scopedGitDiffWarnings': diff_check.stderr,
        'processes': processes, 'goalCurrentCharacters': goal_chars,
        'ordinaryRegistry': 'EMPTY', 'sourceRgbDecodes': 0, 'reprojections': 0, 'backgroundFits': 0,
        'frontendRebuilds': 0, 'productionChangesInThisCombinationPhase': 0,
        'developmentResults': {'combination': bind(ROOT / 'output/prepared-display-combination-readback-1004-r1/result.json'),
                               'lateDecode': bind(ROOT / 'output/prepared-display-late-decode-readback-1004-r1/result.json'),
                               'glPngGlCaptures': 20, 'fiveRestorationPixelCases': 'PASSED',
                               'sourceQuality': 'UNADOPTED', 'independentReview': 'MISSING'},
        'retainedOutputGroups': groups, 'retainedOutputLogicalBytes': total,
        'fourPhaseOutputLogicalBytes': previous['threePhaseOutputLogicalBytes'] + total,
        'limits': '512-source fresh snapshot, explicit prior source archives/new paths, six protected files and bound images/publications; not every untracked file or whole Goal disk. Logical diagnostics include bundle copies and GL, not production inventory, physical allocation/peak, wire traffic or 200DAU capacity. Controlled actual page development/readback is not WEAPP/WXML/phone/native/independent review or full Goal completion. Known failures remain.'}
    out = TASK / 'evidence/prepared-display-combination-scope-verification-2026-10-04.json'
    with out.open('x', encoding='utf-8') as stream:
        stream.write(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'status': result['status'], 'unchangedBoundSources': len(sources),
                      'protected': len(protected), 'changedDocuments': len(documents),
                      'newScripts': len(SCRIPTS), 'outputLogicalBytes': total,
                      'contextDeclared': len(declared), 'goalCharacters': goal_chars,
                      'productionChanges': 0}, ensure_ascii=False))


if __name__ == '__main__':
    main()
