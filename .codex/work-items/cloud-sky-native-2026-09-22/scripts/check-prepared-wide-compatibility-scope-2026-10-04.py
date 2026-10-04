"""Check this bounded Cloud Sky phase against the last direct source receipts."""
from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
ARCHIVE = TASK / 'tmp/prepared-wide-compatibility-docs-before-2026-10-04'
DIRS = [
    'output/prepared-wide-tie-proposals-1004-r1',
    'output/prepared-wide-tie-proposals-1004-r2',
    'output/prepared-wide-tie-proposals-1004-r3',
    'output/prepared-wide-compatibility-1004-r1',
    'output/prepared-wide-display-inputs-1004-r1',
    'output/playwright/cloud-sky-prepared-linear-composition-1004-r1',
    'output/playwright/cloud-sky-prepared-linear-composition-1004-r2',
    'output/prepared-wide-compatibility-readback-1004-r1',
    'output/prepared-wide-compatibility-readback-1004-r2',
]

def bind(p):
    raw = p.read_bytes()
    return {'path': p.relative_to(ROOT).as_posix(), 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest()}

def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()

def main():
    old = json.loads((TASK / 'tmp/noirlab-empty-spatial-before-2026-10-04/scope-before.json').read_bytes())
    current = [bind(ROOT / row['path']) for row in old['currentSources']]
    assert current == old['currentSources']
    last = json.loads((TASK / 'evidence/noirlab-prepared-wide-scope-verification-2026-10-04.json').read_bytes())
    direct = [bind(ROOT / row['path']) for row in last['changedDirectlyArchivedOfflineOwners']]
    assert direct == [row['after'] for row in last['changedDirectlyArchivedOfflineOwners']]
    protected = json.loads((TASK / 'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
    protected_after = [bind(ROOT / row['path']) for row in protected]
    assert all(a['sha256'] == b['sha256'] for a,b in zip(protected_after,protected))
    documents = []
    for row in json.loads((ARCHIVE / 'documents-before.json').read_bytes()):
        archived = bind(ARCHIVE / row['path'])
        assert archived['sha256'] == row['sha256'] and archived['bytes'] == row['bytes']
        new = bind(ROOT / row['path'])
        assert new != row
        documents.append({'before': row, 'after': new, 'archived': archived})
    branch,head,staged = git('branch','--show-current'),git('rev-parse','HEAD'),git('diff','--cached','--name-only')
    assert branch == 'codex/remote-main-20260908' and head == '72e65cf309d700cb7d40c5b7afd53660fd39fa35' and staged == ''
    goal_chars = len((TASK / 'GOAL-CURRENT.md').read_text(encoding='utf-8'))
    assert goal_chars < 4000
    process_command = "Get-Process -Id 18132,24040 | Select-Object Id,ProcessName,@{Name='StartedUtc';Expression={$_.StartTime.ToUniversalTime().ToString('o')}} | ConvertTo-Json -Compress"
    processes = json.loads(subprocess.run(['pwsh','-NoLogo','-NoProfile','-Command',process_command],
                                         cwd=ROOT,capture_output=True,text=True,check=True).stdout)
    prior = json.loads((TASK / 'evidence/noirlab-prepared-wide-process-readback-2026-10-04.json').read_bytes())
    assert sorted(processes,key=lambda r:r['Id']) == sorted(prior,key=lambda r:r['Id'])
    groups = []
    for rel in DIRS:
        files = [p for p in (ROOT / rel).rglob('*') if p.is_file()]
        groups.append({'directory': rel, 'files': len(files), 'logicalBytes': sum(p.stat().st_size for p in files)})
    scripts = [TASK / 'scripts' / name for name in [
        'propose-prepared-wide-ties-2026-10-04.py', 'recover-prepared-wide-ties-2026-10-04.py',
        'measure-prepared-wide-compatibility-2026-10-04.py', 'inspect-prepared-wide-display-inputs-2026-10-04.py',
        'experience-prepared-linear-composition-2026-10-04.mts', 'readback-prepared-wide-compatibility-2026-10-04.py',
        'check-prepared-wide-compatibility-scope-2026-10-04.py']]
    result = {'status':'UNCHANGED_BOUNDED_PRODUCTION_AND_PROTECTED_SCOPE','branch':branch,'head':head,'stagedFiles':[],
              'unchangedPreviouslyBoundSourceCount':len(current),'unchangedSeparateOfflineOwners':direct,
              'protected':protected_after,'newTaskScripts':[bind(p) for p in scripts],
              'owningDocumentChanges':documents,'newHumanEvidence':bind(TASK / 'evidence/experience-prepared-wide-compatibility-2026-10-04.md'),
              'processes':processes,'goalCurrentCharacters':goal_chars,'retainedOutputGroups':groups,
              'retainedOutputLogicalBytes':sum(row['logicalBytes'] for row in groups),
              'limits':'491-source inventory and two separately archived Prepared owners plus six protected files; not an exhaustive inventory of all untracked repository files. Output logical bytes include retained failures/diagnostics, not physical allocation, production stock, endpoint traffic/RSS/GPU total or 200DAU capacity. No code/registry adoption, independent review or native completion.'}
    out = TASK / 'evidence/prepared-wide-compatibility-scope-verification-2026-10-04-r2.json'
    raw = json.dumps(result,ensure_ascii=False,indent=2)+'\n'
    with out.open('x',encoding='utf-8') as f:
        f.write(raw)
    print(json.dumps({k:result[k] for k in ['status','branch','head','unchangedPreviouslyBoundSourceCount',
                                          'goalCurrentCharacters','retainedOutputLogicalBytes','processes']}))

if __name__ == '__main__':
    main()
