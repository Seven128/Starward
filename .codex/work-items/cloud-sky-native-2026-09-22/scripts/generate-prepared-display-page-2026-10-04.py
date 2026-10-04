"""Reuse the established actual-page path for this new processed identity only."""
from pathlib import Path
import hashlib
import json
ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
SCRIPTS = TASK / 'scripts'
checkpoint = '.codex/work-items/cloud-sky-native-2026-09-22/tmp/prepared-display-page-current-inputs-2026-10-04.json'
previous = json.loads((TASK / 'tmp/noirlab-empty-spatial-before-2026-10-04/scope-before.json').read_bytes())
archived = json.loads((TASK / 'tmp/prepared-display-identity-before-2026-10-04/scope-before.json').read_bytes())
allowed = {row['path'] for row in archived['archived']}
def bind(rel):
    raw = (ROOT / rel).read_bytes()
    return {'path': rel, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
for row in previous['currentSources']:
    if row['path'] not in allowed:
        assert bind(row['path']) == row, row['path']
for row in archived['protected']:
    assert bind(row['path'])['sha256'] == row['sha256'], row['path']
paths = {row['path'] for row in previous['currentSources']}
paths |= {row['path'] for row in archived['archived'] if not row['path'].endswith('.md')}
paths |= {'packages/miniapp-contracts/src/' + name for name in
    ('prepared-optical-common.ts', 'prepared-display-optical-publication.ts', 'prepared-rendered-optical-publication.ts',
     'prepared-display-optical-publication.test.ts', 'test-fixtures/prepared-optical-publication.ts',
     'test-fixtures/prepared-display-optical-publication.ts')}
paths |= {'data-pipelines/deep-sky/' + name for name in
    ('prepared_rgb_observation.py', 'test_prepared_rgb_observation.py', 'prepared_optical_levels.py',
     'publish_prepared_display.py', 'test_publish_prepared_display.py', 'pack_prepared_rendered_optical_publication.mts')}
paths |= {'workers/miniapp-api/src/' + name for name in
    ('prepared-display-optical-imagery.test.ts', 'test-fixtures/prepared-display-optical-publication.ts')}
with (ROOT / checkpoint).open('x', encoding='utf-8') as file:
    json.dump({'currentSources': [bind(p) for p in sorted(paths)], 'protected': [bind(row['path']) for row in archived['protected']],
        'scope': 'Current actual source pins for this display page run; not an adopted source, Goal checkpoint or acceptance.'}, file, indent=2); file.write('\n')

old_checkpoint = '.codex/work-items/cloud-sky-native-2026-09-22/tmp/prepared-page-current-inputs-2026-10-04.json'
old_hash = 'c9b0592eb6409636739d58ed147266d7f0f1bf37bc4c91eeb0d99d78fccd667c'
publication_path = 'output/prepared-large-display-publication-1004-r1/manifest.json'
publication = json.loads((ROOT / publication_path).read_bytes())
assert publication['imageVersion'] == 'prepared-display-optical-v1'
new_hash = publication['publicationHash']
new_manifest_pin = bind(publication_path)['sha256']
for name in ('build', 'experience'):
    source = (SCRIPTS / (name + '-prepared-m82-page-2026-10-04.mts')).read_text(encoding='utf-8')
    source = source.replace(old_checkpoint, checkpoint).replace(old_hash, new_hash)
    if name == 'build':
        assert source.count("kind:'prepared-optical-v1'") == 1
        source = source.replace("kind:'prepared-optical-v1'", "kind:'prepared-display-optical-v1'")
    else:
        source = source.replace('output/hubble-m82-prepared-publication-1004-r2/manifest.json', publication_path)
        source = source.replace('3823d73fbc836710141e4052c9950de148a7bebb608b943ffb601111e383a7ca', new_manifest_pin)
        source = source.replace("await save('m82-actual-source-page.json'", "assert(source.activeText.includes(publication.processing.geometryExclusion.credit));assert(source.activeText.includes('显示估计'));assert(source.activeText.includes('负值显示截零'));await save('m82-actual-source-page.json'")
        source = source.replace('ACTUAL_TARO_M82_PREPARED_PAGE_DEVELOPMENT', 'ACTUAL_TARO_M82_PREPARED_DISPLAY_PAGE_DEVELOPMENT')
    with (SCRIPTS / (name + '-prepared-display-m82-page-2026-10-04.mts')).open('x', encoding='utf-8') as file:
        file.write(source)
reader = (SCRIPTS / 'readback-prepared-m82-page-2026-10-04.py').read_text(encoding='utf-8')
reader = reader.replace('cloud-sky-prepared-m82-page-1004-r2', 'cloud-sky-prepared-display-m82-page-1004-r1')
reader = reader.replace('hubble-m82-prepared-page-readback-1004-r2', 'prepared-display-m82-page-readback-1004-r1')
reader = reader.replace("assert publication['publicationHash'] == pin['hash'] and not pin['ordinaryRegistry']", "assert publication['publicationHash'] == pin['hash'] and not pin['ordinaryRegistry']\n    assert publication['imageVersion'] == 'prepared-display-optical-v1' and publication['parent']['publication']['imageVersion'] == 'prepared-optical-v1'")
reader = reader.replace("'quality': 'Overview rectangular boundary remains FAILED; real fine structure inspected; NOT_ADOPTED'", "'quality': 'Prior softer detail/grain and complete weak-structure/edge/seam/registration remain unadopted; this run verifies real processed identity/SourceBack, not new quality acceptance'")
reader = reader.replace("source = read(LANE / 'm82-actual-source-page.json')", "source = read(LANE / 'm82-actual-source-page.json')\n    assert publication['processing']['geometryExclusion']['credit'] in source['text']\n    assert '显示估计' in source['text'] and '负值显示截零' in source['text']")
with (SCRIPTS / 'readback-prepared-display-m82-page-2026-10-04.py').open('x', encoding='utf-8') as file:
    file.write(reader)
print(json.dumps({'boundSources': len(paths), 'explicitImageVersion': publication['imageVersion'],
    'explicitHash': new_hash, 'ordinaryRegistry': False}))
