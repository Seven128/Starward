"""Check named edit archives, protected files and the existing bounded source inventory."""
from pathlib import Path
import difflib
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'

def read(path):
    return json.loads(Path(path).read_bytes())

def bind(path):
    path = Path(path)
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': path.stat().st_size,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True, encoding='utf-8').strip()

names = ['spot-sky-page.tsx', 'sky-sdss-optical-frame.test.ts', 'sky-deep-auxiliary-page.test.ts',
         'sky-canvas-time.test.ts', 'use-sky-sdss-optical.test.ts']
allowed = {'apps/wechat-miniapp/src/features/sky/' + name for name in names}
baseline_path = TASK / 'tmp/imagery-research-reconciliation-2026-10-04/before.json'
baseline = read(baseline_path)
unchanged = 0
changes = []
for row in baseline['nonMarkdownSources']:
    path = ROOT / row['path']
    current = bind(path)
    if current['sha256'] == row['sha256']:
        unchanged += 1
    else:
        assert current['path'] in allowed, current['path']
        changes.append({'before': row, 'after': current})
protected = []
for row in read(TASK / 'tmp/resume-preserved-hashes-2026-10-01.json'):
    current = bind(ROOT / row['path'])
    assert current['sha256'] == row['sha256'], current['path']
    protected.append(current)
edits = []
diffs = []
for name in names:
    before = TASK / 'tmp/prepared-page-before-2026-10-04' / name
    after = ROOT / 'apps/wechat-miniapp/src/features/sky' / name
    assert before.read_bytes() != after.read_bytes(), name
    edits.append({'before': bind(before), 'after': bind(after)})
    diffs.extend(difflib.unified_diff(before.read_bytes().decode().splitlines(True),
                                     after.read_bytes().decode().splitlines(True),
                                     fromfile=before.relative_to(ROOT).as_posix(),
                                     tofile=after.relative_to(ROOT).as_posix()))
prior = read(TASK / 'evidence/hubble-m82-prepared-scope-verification-2026-10-04.json')
for row in prior['separatelyArchivedCloudSkyEdits']:
    assert bind(ROOT / row['after']['path']) == row['after']
branch = git('branch', '--show-current')
head = git('rev-parse', 'HEAD')
staged = git('diff', '--cached', '--name-only')
assert branch == 'codex/remote-main-20260908'
assert head == '72e65cf309d700cb7d40c5b7afd53660fd39fa35'
assert not staged
goal = (TASK / 'GOAL-CURRENT.md').read_bytes().decode('utf-8')
assert len(goal) <= 4000, len(goal)
documents = ['PLAN.md', 'CONTINUE-CLOUD-SKY.md', 'OPTICAL-DATA-RESEARCH.md',
             'evidence/prepared-imagery-source-coverage-cost-2026-10-04.md',
             'evidence/experience-prepared-m82-page-combination-2026-10-04.md']
result = {'status': 'CHECKED_BOUND_SOURCE_SCOPE', 'branch': branch, 'head': head,
          'baseline': bind(baseline_path), 'unchangedBoundNonMarkdownSources': unchanged,
          'changedBoundNonMarkdownSources': changes, 'immediateCloudSkyEdits': edits,
          'protected': protected, 'priorContractFilesUnchangedThisPageStep': prior['separatelyArchivedCloudSkyEdits'],
          'staged': staged, 'goalCurrentCharacters': len(goal),
          'documents': [bind(TASK / p) for p in documents] + [bind(ROOT / 'project_context/areas/main/screen-contracts/wechat-miniapp/spot-and-sky.md')],
          'scope': 'Named page plus four Sky tests and owning documents; task scripts/output/evidence. The old bound inventory is not every untracked repository file; no full-repository attestation. Six Settings/outbox exact. No commit/push/deploy/publish or external business edits.'}
with (TASK / 'evidence/prepared-page-net-code-change-2026-10-04.diff').open('x', encoding='utf-8', newline='') as stream:
    stream.write(''.join(diffs))
with (TASK / 'evidence/prepared-page-scope-verification-2026-10-04.json').open('x', encoding='utf-8') as stream:
    stream.write(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': result['status'], 'unchangedBoundSources': unchanged,
                  'changedBoundSources': [r['after']['path'] for r in changes],
                  'immediateCloudSkyEdits': len(edits), 'protectedExact': len(protected),
                  'staged': staged, 'goalCurrentCharacters': len(goal)}, ensure_ascii=True))
