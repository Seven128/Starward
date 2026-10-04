"""Measure this saved M82 display generation without repeating old scans."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
HELPER = TASK / 'scripts/inspect-static-file-allocation-2026-10-03.py'
DISPLAY = ROOT / 'output/sdss-m82-shared-adaptive-display-1004-r1'
READBACK = ROOT / 'output/sdss-m82-shared-adaptive-readback-1004-r1'
OUT = ROOT / 'output/sdss-m82-shared-adaptive-allocation-1004-r1'


def main():
    assert not OUT.exists()
    assert (DISPLAY / 'result.json').is_file() and (READBACK / 'result.json').is_file()
    text = HELPER.read_text(encoding='utf-8')
    namespace = {'__file__': str(HELPER)}
    exec(compile(text[:text.index('index_file=SOURCE')], str(HELPER), 'exec'), namespace)
    files = [path for directory in (DISPLAY, READBACK)
             for path in sorted(directory.rglob('*')) if path.is_file()]
    before = [{'path': path.relative_to(ROOT).as_posix(), **namespace['info'](path)} for path in files]
    assert before == [{'path': path.relative_to(ROOT).as_posix(), **namespace['info'](path)} for path in files]
    identities = {value['identity']: value for value in before}
    report = {
        'scope': 'New saved M82 display parent, perimeter candidate and readback only. Existing science, tools, previous generations and this measurement output excluded.',
        'method': 'Existing Windows FileStandardInfo/FileIdInfo, read attributes only; handles closed.',
        'helper': {'path': HELPER.relative_to(ROOT).as_posix(), 'sha256': namespace['sha'](HELPER)},
        'paths': len(before), 'logicalBytes': sum(value['bytes'] for value in before),
        'reportedAllocationByUniqueIdentityBytes': sum(value['reportedAllocationBytes'] for value in identities.values()),
        'distinctFileIdentities': len(identities), 'maximumLinkCount': max(value['links'] for value in before),
        'stableBeforeAfter': True, 'files': before,
        'limits': 'Reported local Windows allocation excludes filesystem metadata/snapshots/shared storage internals; not Linux physical retention, whole-host headroom, client memory or mixed 200DAU capacity.',
        'sourceProcessingOrDeletion': False}
    OUT.mkdir()
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    (OUT / 'result.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: value for key, value in report.items() if key != 'files'}))


if __name__ == '__main__':
    main()
