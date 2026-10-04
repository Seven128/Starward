"""Reuse the actual page harness for the new admitted two-grid publication.

No Scene pixel substitution or qualification suppression. Only explicit caller
kind/ref/hash, current input pins and source-meaning assertions are changed.
"""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
SCRIPTS = TASK / 'scripts'


def bind(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def write(path, text):
    with path.open('x', encoding='utf-8', newline='\n') as handle:
        handle.write(text)


def main():
    archive = TASK / 'tmp/prepared-progressive-version-before-2026-10-05'
    before = json.loads((archive / 'scope-before.json').read_bytes())
    changed = {
        'packages/miniapp-contracts/src/prepared-optical-common.ts',
        'packages/miniapp-contracts/src/prepared-rendered-optical-publication.ts',
        'packages/miniapp-contracts/src/index.ts', 'packages/miniapp-contracts/src/index-types.ts',
        'workers/miniapp-api/src/target-optical-image-file.ts',
        'apps/wechat-miniapp/src/features/sky/use-sky-target-optical.ts',
        'apps/wechat-miniapp/src/features/sky/sky-tan-optical-registration.ts',
        'apps/wechat-miniapp/src/features/sky/sky-target-optical-identity.ts',
        'apps/wechat-miniapp/src/features/sky/sky-sdss-optical-frame.ts',
        'apps/wechat-miniapp/src/features/sky/sky-target-optical-visibility.ts',
        'apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx',
    }
    transitions = []
    current = []
    for row in before['sources']:
        actual = bind(ROOT / row['path'])
        if actual != row:
            assert row['path'] in changed, row['path']
            transitions.append({'before': row, 'after': actual})
        current.append(actual)
    covered = {row['path'] for row in before['sources']}
    # Earlier parsed-file inventories are explicitly bounded, not a complete
    # worktree inventory. Two current owners have separate pre-edit byte archives.
    for path in sorted(changed - covered):
        saved = (archive / path).read_bytes()
        prior = {'path': path, 'bytes': len(saved), 'sha256': hashlib.sha256(saved).hexdigest()}
        actual = bind(ROOT / path)
        assert actual != prior, path
        transitions.append({'before': prior, 'after': actual, 'beforeOwner': 'separate pre-edit byte archive'})
        current.append(actual)
    assert {row['before']['path'] for row in transitions} == changed
    for row in before['protected']:
        assert bind(ROOT / row['path']) == row
    extras = ['packages/miniapp-contracts/src/prepared-progressive-optical-publication.ts',
        'packages/miniapp-contracts/src/prepared-progressive-optical-publication.test.ts',
        'packages/miniapp-contracts/src/test-fixtures/prepared-progressive-optical-publication.ts',
        'data-pipelines/deep-sky/publish_prepared_progressive.py']
    current += [bind(ROOT / path) for path in extras]
    checkpoint = '.codex/work-items/cloud-sky-native-2026-09-22/tmp/prepared-progressive-current-inputs-2026-10-05.json'
    write(ROOT / checkpoint, json.dumps({'currentSources': current, 'protected': before['protected'], 'authorisedSkyTransitions': transitions}, ensure_ascii=False, indent=2) + '\n')
    publication_path = 'output/prepared-progressive-publication-1005-r1/manifest.json'
    publication = json.loads((ROOT / publication_path).read_bytes())
    old_hash = '97bd0d5b1ebb48e47cb147d273838f79566ea9f72f2bbfa446c2e73fd3736b9c'
    old_cp = '.codex/work-items/cloud-sky-native-2026-09-22/tmp/prepared-display-page-current-inputs-2026-10-04.json'
    build = (SCRIPTS / 'build-prepared-display-m82-page-2026-10-04.mts').read_text(encoding='utf-8')
    assert build.count("kind:'prepared-display-optical-v1'") == 1
    build = build.replace("kind:'prepared-display-optical-v1'", "kind:'prepared-optical-v2'").replace(old_hash, publication['publicationHash']).replace(old_cp, checkpoint)
    write(SCRIPTS / 'build-prepared-progressive-page-2026-10-05.mts', build)
    code = (SCRIPTS / 'experience-prepared-display-m82-page-2026-10-04.mts').read_text(encoding='utf-8')
    code = code.replace(old_cp, checkpoint).replace('output/prepared-large-display-publication-1004-r1/manifest.json', publication_path)
    code = code.replace(old_hash, publication['publicationHash'])
    code = code.replace('239f0f154f0b37bb69cf92628419563db776aec9da07a04e6968291e66567986', bind(ROOT / publication_path)['sha256'])
    old = "assert(source.activeText.includes(publication.processing.geometryExclusion.credit));assert(source.activeText.includes('显示估计'));assert(source.activeText.includes('负值显示截零'));"
    assert code.count(old) == 1
    code = code.replace(old, "assert(source.activeText.includes(publication.source.licenseUrl));assert(source.activeText.includes(publication.processing.modification));assert(source.activeText.includes('科学有效性未知'));")
    needle = "const binaries=()=>requests.filter("
    assert code.count(needle) == 1
    code = code.replace(needle, "for(const level of ['MEDIUM','DETAIL']){const asset=publication.levels[level];assert.equal(asset.pixels,1024);assert(detail.frameResources.sourceImages.some(i=>i.sha256===asset.sha256&&i.width===1024&&i.height===1024),'real decoded publication image absent '+level);}await save('actual-progressive-detail.json',{hash:displayHash,view:JSON.parse(detail.canvas['data-sky-presented-view']),at:detail.scene.at,completedSource:detail.completedSources.optical,frameResources:detail.frameResources,resources:detail.resources});\n" + needle)
    code = code.replace('ACTUAL_TARO_M82_PREPARED_DISPLAY_PAGE_DEVELOPMENT', 'ACTUAL_TARO_PREPARED_PROGRESSIVE_PUBLICATION_PAGE_DEVELOPMENT')
    assert 'samplingEnabled' not in code and 'boundaryCoarseMode' not in code
    write(SCRIPTS / 'experience-prepared-progressive-page-2026-10-05.mts', code)
    print(json.dumps({'currentPins': len(current), 'authorisedSkyChangedSources': len(transitions),
        'build': bind(SCRIPTS / 'build-prepared-progressive-page-2026-10-05.mts'),
        'runtime': bind(SCRIPTS / 'experience-prepared-progressive-page-2026-10-05.mts')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
