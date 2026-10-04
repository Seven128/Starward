"""Read back the bounded Cloud Sky phase; no replay of rendering or processing."""
from pathlib import Path
from collections import Counter
import hashlib
import json
import re
import subprocess
import sys
import tomllib

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
ARCHIVE = TASK / 'tmp/prepared-large-source-docs-before-2026-10-04'
DIRS = [
    'output/noirlab-m82-large-source-1004-r1',
    'output/noirlab-m82-large-detail-1004-r1',
    'output/playwright/cloud-sky-noirlab-m82-large-detail-1004-r1',
    'output/playwright/cloud-sky-noirlab-m82-large-detail-1004-r2',
    'output/noirlab-m82-large-detail-readback-1004-r1',
    'output/noirlab-m82-large-detail-readback-1004-r2',
]


def bind(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest()}


def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, capture_output=True,
                          text=True, check=True).stdout.strip()


def links(text):
    return Counter(re.findall(r'\[[^\]\n]+\]\(([^)\n]+)\)', text))


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    old = json.loads((TASK / 'tmp/noirlab-empty-spatial-before-2026-10-04/scope-before.json').read_bytes())
    sources = [bind(ROOT / row['path']) for row in old['currentSources']]
    assert sources == old['currentSources']
    previous = json.loads((TASK / 'evidence/noirlab-prepared-wide-scope-verification-2026-10-04.json').read_bytes())
    direct = [bind(ROOT / row['path']) for row in previous['changedDirectlyArchivedOfflineOwners']]
    assert direct == [row['after'] for row in previous['changedDirectlyArchivedOfflineOwners']]
    protected = json.loads((TASK / 'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
    protected_after = [bind(ROOT / row['path']) for row in protected]
    assert all(a['sha256'] == b['sha256'] for a, b in zip(protected_after, protected))
    photo_pins = {
        'output/noirlab-prepared-wide-source-1004-r1/noao-m81m82.jpg': '85f615d5d56c04e4528716e61320f2c503fdcb2a62af44347e3402aca9a53eda',
        'output/noirlab-prepared-wide-source-1004-r1/noao1309a.jpg': '57111359c5f7eb9e2aa79d794ca8b660686553cb8ca62d9064993077a7b29b97',
        'output/hubble-m82-prepared-source-1004-r1/heic0604a.jpg': 'a552168b5cad1f87fb552bed2637cedbd70fcae98bc5f2c7bcf27af95c9a1286',
        'output/hubble-m51-source-quality-trial-1002-r1/heic0506a.jpg': '7b13a932bcf54653c591d369e8d1c4cbdbeb693ecc468242facb239fde52e4c2',
    }
    photos = [bind(ROOT / path) for path in photo_pins]
    assert all(row['sha256'] == photo_pins[row['path']] for row in photos)
    documents, added_links = [], []
    for row in json.loads((ARCHIVE / 'documents-before.json').read_bytes()):
        archived_path = ARCHIVE / row['path']
        archived = bind(archived_path)
        assert archived['sha256'] == row['sha256'] and archived['bytes'] == row['bytes']
        path = ROOT / row['path']
        after = bind(path)
        assert after != row
        documents.append({'before': row, 'after': after, 'archived': archived})
        for target, count in (links(path.read_text(encoding='utf-8')) - links(archived_path.read_text(encoding='utf-8'))).items():
            added_links.append((path, target, count))
    human = TASK / 'evidence/experience-noirlab-m82-large-detail-2026-10-04.md'
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
    manifest = tomllib.loads(manifest_path.read_text(encoding='utf-8'))
    declared = [entry['path'] for entry in manifest.get('context', [])]
    declared += [entry['context'] for entry in manifest.get('areas', []) if entry.get('context')]
    declared += manifest.get('default_files', [])
    assert declared and all((ROOT / name).is_file() for name in declared)
    owner = ROOT / 'project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md'
    assert owner.relative_to(ROOT).as_posix() in declared
    cli_command = "@(Get-Command ty-context -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source) | ConvertTo-Json -Compress"
    cli = subprocess.run(['pwsh', '-NoLogo', '-NoProfile', '-Command', cli_command],
                         cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
    context_check = {
        'manifest': bind(manifest_path), 'declaredFileEntriesChecked': len(declared),
        'affectedOwnerRegistered': True, 'addedLocalMarkdownLinks': local_links,
        'tyContextCliDiscovery': cli or 'UNAVAILABLE_IN_THIS_COMMAND_PATH',
        'validation': 'Manual TOML parse, declared path existence and added local Markdown link existence only; no CLI installation or product/factual certification. Historical unchanged ordinary links and anchors are not revalidated.'}
    branch, head, staged = git('branch', '--show-current'), git('rev-parse', 'HEAD'), git('diff', '--cached', '--name-only')
    assert branch == 'codex/remote-main-20260908' and head == '72e65cf309d700cb7d40c5b7afd53660fd39fa35' and not staged
    diff_check = subprocess.run(['git', 'diff', '--check', '--', *[row['after']['path'] for row in documents]],
                                cwd=ROOT, capture_output=True, text=True, check=True)
    assert not diff_check.stdout
    goal_chars = len((TASK / 'GOAL-CURRENT.md').read_text(encoding='utf-8'))
    assert goal_chars < 4000
    process_command = "Get-Process -Id 18132,24040 | Select-Object Id,ProcessName,@{Name='StartedUtc';Expression={$_.StartTime.ToUniversalTime().ToString('o')}} | ConvertTo-Json -Compress"
    processes = json.loads(subprocess.run(['pwsh', '-NoLogo', '-NoProfile', '-Command', process_command],
                                         cwd=ROOT, capture_output=True, text=True, check=True).stdout)
    previous_processes = json.loads((TASK / 'evidence/noirlab-prepared-wide-process-readback-2026-10-04.json').read_bytes())
    assert sorted(processes, key=lambda r: r['Id']) == sorted(previous_processes, key=lambda r: r['Id'])
    groups = []
    for rel in DIRS:
        files = [p for p in (ROOT / rel).rglob('*') if p.is_file()]
        groups.append({'directory': rel, 'files': len(files), 'logicalBytes': sum(p.stat().st_size for p in files)})
    names = ['acquire-noirlab-m82-large-2026-10-04.py', 'trial-noirlab-m82-large-detail-2026-10-04.py',
             'experience-noirlab-m82-large-detail-2026-10-04.mts', 'readback-noirlab-m82-large-detail-2026-10-04.py',
             'check-prepared-large-source-scope-2026-10-04.py']
    acquisition_file = ROOT / 'output/noirlab-m82-large-source-1004-r1/result.json'
    acquired = json.loads(acquisition_file.read_bytes())
    assert bind(ROOT / acquired['image']['path']) == acquired['image']
    assert acquired['image']['sha256'] == '71a539df75c8af574e98d3da13c1381e525093dd2e8814d9588f35b73b4e3479'
    assert acquired['dimensions'] == [8315, 4642] and acquired['xmpExactOld4k']
    previous_scope = json.loads((TASK / 'evidence/prepared-native-background-scope-verification-2026-10-04.json').read_bytes())

    result = {
        'status': 'UNCHANGED_BOUNDED_PRODUCTION_AND_PROTECTED_SCOPE', 'branch': branch, 'head': head,
        'stagedFiles': [], 'unchangedPreviouslyBoundSourceCount': len(sources), 'unchangedSeparateOfflineOwners': direct,
        'protected': protected_after, 'unchangedCachedPhotos': photos,
        'newTaskScripts': [bind(TASK / 'scripts' / name) for name in names],
        'owningDocumentChanges': documents, 'newHumanEvidence': bind(human),
        'unchangedRightsReceipt': bind(TASK / 'evidence/prepared-texture-rights-check-2026-10-04.json'),
        'largerSourceAcquisition': bind(acquisition_file), 'largerSourceImage': acquired['image'],
        'contextChecks': context_check, 'scopedGitDiffCheck': 'PASS',
        'scopedGitDiffWarnings': diff_check.stderr,
        'priorScopeCheckerRepair': 'Prior native-background checker treated successful line-ending stderr warnings as failure; this checker retains warnings while checking exit code/whitespace separately. Preserved Scene-R1 double-serialization and Reader-R1 external-path failures are separate task-only evidence.',
        'processes': processes,
        'goalCurrentCharacters': goal_chars, 'retainedOutputGroups': groups,
        'retainedOutputLogicalBytes': sum(row['logicalBytes'] for row in groups),
        'previousNativeBackgroundOutputLogicalBytes': previous_scope['retainedOutputLogicalBytes'],
        'twoPhaseOutputLogicalBytes': previous_scope['retainedOutputLogicalBytes'] + sum(row['logicalBytes'] for row in groups),
        'limits': '491-source inventory, two separate Prepared owners, six protected files, four cached source photos and the separately bound new larger-source photo; not exhaustive all-untracked inventory. Logical output bytes include diagnostics, not physical allocation, production stock, wire/RSS/GPU or 200DAU capacity. No source/registry adoption, independent review or native completion.'}
    out = TASK / 'evidence/prepared-large-source-scope-verification-2026-10-04.json'
    with out.open('x', encoding='utf-8') as stream:
        stream.write(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({key: result[key] for key in ['status', 'unchangedPreviouslyBoundSourceCount',
                                                 'goalCurrentCharacters', 'retainedOutputLogicalBytes', 'processes']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
