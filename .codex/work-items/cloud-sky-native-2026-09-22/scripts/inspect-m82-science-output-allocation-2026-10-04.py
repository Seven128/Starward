"""Reuse existing Windows file-info reader on this new offline generation."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
HELPER = TASK / 'scripts/inspect-static-file-allocation-2026-10-03.py'
OUT = ROOT / 'output/sdss-m82-first-science-allocation-1004-r1'

def main():
    assert not OUT.exists()
    # Reuse only the established definitions/setup preceding its actual-export
    # entrypoint. Never run the old export scan, writer, or generation again.
    text = HELPER.read_text(encoding='utf-8')
    ns = {'__file__': str(HELPER)}
    exec(compile(text[:text.index('index_file=SOURCE')], str(HELPER), 'exec'), ns)
    roots = [ROOT / ('output/' + name) for name in ('sdss-m82-first-science-master-1004-r1',
        'sdss-m82-first-science-master-1004-r2', 'sdss-m82-first-science-readback-1004-r1',
        'sdss-m82-first-science-readback-1004-r2', 'sdss-m82-first-science-readback-1004-r3',
        'sdss-m82-retained-astrans-1004-r1')]
    files = [p for directory in roots for p in sorted(directory.rglob('*')) if p.is_file()]
    before = [{'path': p.relative_to(ROOT).as_posix(), **ns['info'](p)} for p in files]
    assert before == [{'path': p.relative_to(ROOT).as_posix(), **ns['info'](p)} for p in files]
    identities = {p['identity']: p for p in before}
    report = {'scope': 'New M82 offline generation only; local Windows reported allocation excludes filesystem metadata/snapshots/shared-storage internals, not Linux physical retention/headroom or whole-host capacity.',
        'method': 'Existing GetFileInformationByHandleEx FileStandardInfo/FileIdInfo, read attributes only; all handles closed.',
        'helper': {'path': HELPER.relative_to(ROOT).as_posix(), 'sha256': ns['sha'](HELPER)},
        'paths': len(before), 'logicalBytes': sum(p['bytes'] for p in before),
        'reportedAllocationByUniqueIdentityBytes': sum(p['reportedAllocationBytes'] for p in identities.values()),
        'distinctFileIdentities': len(identities), 'maximumLinkCount': max(p['links'] for p in before),
        'stableBeforeAfter': True, 'files': before, 'sourceProcessingOrDeletion': False}
    OUT.mkdir()
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    (OUT / 'result.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in report.items() if k != 'files'}))

if __name__ == '__main__':
    main()
