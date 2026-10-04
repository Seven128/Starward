"""Compare this phase with its immediate bound-source snapshot, not an old Goal."""
from pathlib import Path
import difflib
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
BEFORE = TASK / 'tmp/noirlab-empty-spatial-before-2026-10-04'
EXPECTED = {'data-pipelines/deep-sky/prepared_rgb_observation.py',
            'data-pipelines/deep-sky/test_prepared_rgb_observation.py'}

def bind(p):
    b = p.read_bytes()
    return {'path': p.relative_to(ROOT).as_posix(), 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()}

def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()

def main():
    old = json.loads((BEFORE / 'scope-before.json').read_bytes())
    after = [bind(ROOT / row['path']) for row in old['currentSources']]
    changed = [{'path': a['path'], 'before': b, 'after': a} for b,a in zip(old['currentSources'], after) if b != a]
    assert changed == [], 'Unexpected changes in the 491 existing bindings'
    direct_changed = []
    for p in sorted(EXPECTED):
        archived, current = bind(BEFORE / Path(p).name), bind(ROOT / p)
        assert archived['sha256'] != current['sha256']
        direct_changed.append({'path': p, 'immediateBeforeArchive': archived, 'after': current})
    protected = json.loads((TASK / 'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
    protected_after = [bind(ROOT / row['path']) for row in protected]
    assert protected_after == old['protected']
    assert all(a['sha256'] == b['sha256'] for a,b in zip(protected_after, protected))
    branch, head, staged = git('branch','--show-current'), git('rev-parse','HEAD'), git('diff','--cached','--name-only')
    assert branch == 'codex/remote-main-20260908' and head == '72e65cf309d700cb7d40c5b7afd53660fd39fa35' and staged == ''
    diff = ''.join(''.join(difflib.unified_diff((BEFORE / Path(p).name).read_text(encoding='utf-8').splitlines(keepends=True),
         (ROOT / p).read_text(encoding='utf-8').splitlines(keepends=True), fromfile='before/' + p, tofile='after/' + p)) for p in sorted(EXPECTED))
    with (TASK / 'evidence/noirlab-prepared-wide-net-code-change-2026-10-04.diff').open('x', encoding='utf-8', newline='\n') as f:
        f.write(diff)
    task_files = [TASK / 'scripts' / (name + '-2026-10-04.' + ext) for name,ext in [
        ('acquire-noirlab-prepared-wide','py'), ('experience-noirlab-prepared-wide','py'),
        ('package-noirlab-prepared-wide','py'), ('experience-noirlab-wide-scene','mts'),
        ('readback-noirlab-wide-quality','py'), ('check-noirlab-wide-scope','py')]]
    documents = [TASK / n for n in ['PLAN.md','CONTINUE-CLOUD-SKY.md','OPTICAL-DATA-RESEARCH.md',
        'evidence/experience-noirlab-prepared-wide-2026-10-04.md','evidence/prepared-imagery-source-coverage-cost-2026-10-04.md']]
    documents += [ROOT / 'project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md', ROOT / 'project_context/external-capabilities.md']
    goal_chars = len((TASK / 'GOAL-CURRENT.md').read_text(encoding='utf-8'))
    assert goal_chars < 4000
    result = {'state': 'PASSED_BOUNDED_PHASE_SCOPE', 'branch': branch, 'head': head, 'stagedFiles': [],
        'currentPreviouslyBoundSourceCount': len(after), 'unchangedCurrentBindings': len(after)-len(changed),
        'changedCurrentBindings': changed, 'changedDirectlyArchivedOfflineOwners': direct_changed,
        'scopeReaderR1Failure': 'Old 491 inventory excluded both edited offline owners. Corrected separate direct-archive comparison; R1 retained.',
        'protectedBeforeAfterExact': protected_after,
        'taskFiles': [bind(p) for p in task_files], 'changedOwningDocuments': [bind(p) for p in documents],
        'goalCurrentCharacters': goal_chars,
        'limits': 'Bounded 491-source pre-phase inventory plus six protected items and listed new task/docs. Not an exhaustive attestation of every untracked repository path, native runtime, independent review or completion.'}
    with (TASK / 'evidence/noirlab-prepared-wide-scope-verification-2026-10-04.json').open('x', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(json.dumps({k:result[k] for k in ['state','branch','head','currentPreviouslyBoundSourceCount','unchangedCurrentBindings','goalCurrentCharacters']}))

if __name__ == '__main__':
    main()
