"""Preserve two first Browser downloads and exact source/policy receipts.

No image request, publication, source repair or production adoption.
"""
from pathlib import Path
import hashlib
import importlib.util
import json
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
OUT = ROOT / 'output/noirlab-prepared-wide-source-1004-r1'
sys.path[:0] = [str(ROOT / 'data-pipelines/deep-sky'),
               str(ROOT / 'output/pyavm-metadata-trial-1002-r1/lib'),
               str(ROOT / 'output/allwise-w3-atlas-0929/python-deps')]
from PIL import Image
from pyavm import AVM
from prepared_rgb_observation import _parser_xml

spec = importlib.util.spec_from_file_location('bounded_hubble_fetch', TASK / 'scripts/acquire-hubble-m82-prepared-2026-10-04.py')
fetcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fetcher)
fetcher.OUT = OUT

SOURCES = [
    ('noao-m81m82', 'https://noirlab.edu/public/images/noao-m81m82/?lang=en',
     'T.A. Rector (University of Alaska Anchorage) and NOIRLab/NSF/AURA/',
     'KPNO/WIYN 0.9m Mosaic I; published B blue, V cyan, R green, I orange, H-alpha red composite; encoded RGB, not calibrated flux'),
    ('noao1309a', 'https://noirlab.edu/public/images/noao1309a/',
     'K. Rhode, M. Young and WIYN/NOIRLab/NSF/AURA/',
     'WIYN 3.5m ODI May 2013 published composite; filters not declared on image page; encoded RGB, not calibrated flux'),
]

def identity(p):
    b = p.read_bytes()
    return {'path': p.relative_to(ROOT).as_posix(), 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()}

def save(name, value):
    with (OUT / name).open('x', encoding='utf-8') as f:
        json.dump(value, f, ensure_ascii=False, indent=2, allow_nan=False)
        f.write('\n')

def main():
    protected = json.loads((TASK / 'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
    assert all(identity(ROOT / r['path'])['sha256'] == r['sha256'] for r in protected)
    # R1's script, copied source and parser failure stay intact. Resume copies
    # only the missing Browser file, never requesting the images again.
    assert (OUT / 'executed-acquisition.py').is_file()
    (OUT / 'executed-acquisition-r2.py').write_bytes(Path(__file__).read_bytes())
    owned = [ROOT / 'data-pipelines/deep-sky' / n for n in ['prepared_rgb_observation.py', 'prepared_rgb_tan.py', 'sdss_source_stencil.py', 'sdss_gri_tan.py']]
    owned += [ROOT / 'apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx', Path(__file__)]
    before = [identity(p) for p in owned]
    save('owners-before-r2.json', before)
    rows = []
    for rid, page, credit, colour in SOURCES:
        local = Path('C:/Users/777/Downloads') / (rid + '.jpg')
        raw = local.read_bytes()
        target = OUT / local.name
        if target.exists():
            assert target.read_bytes() == raw
        else:
            with target.open('xb') as f:
                f.write(raw)
        assert local.read_bytes() == target.read_bytes()
        with Image.open(target) as image:
            assert image.format == 'JPEG' and image.mode == 'RGB'
            image.load()
            xmp = image.info.get('xmp')
            assert isinstance(xmp, bytes) and xmp
            dimensions = list(image.size)
        xmp_path = OUT / (rid + '-embedded-xmp.xml')
        if xmp_path.exists():
            assert xmp_path.read_bytes() == xmp
        else:
            with xmp_path.open('xb') as f:
                f.write(xmp)
        normalized, removed = _parser_xml(xmp)
        # Task-only inspection of the exact observed empty optional note.
        # Production admission remains unchanged and still refuses this input.
        ns = '{http://www.communicatingastronomy.org/avm/1.0/}'
        rdf = '{http://www.w3.org/1999/02/22-rdf-syntax-ns#}'
        root = ET.fromstring(normalized)
        notes = list(root.iter(ns + 'Spatial.Notes'))
        assert len(notes) == 1
        note = notes[0]
        assert not note.attrib and len(note) == 1 and note[0].tag == rdf + 'Alt' and len(note[0]) == 1
        li = note[0][0]
        assert li.tag == rdf + 'li' and li.attrib == {'{http://www.w3.org/XML/1998/namespace}lang': 'x-default'} and not list(li)
        assert all(not (e.text or '').strip() and not (e.tail or '').strip() for e in note.iter())
        pattern = br'<avm:Spatial\.Notes>\s*<rdf:Alt>\s*<rdf:li xml:lang="x-default"\s*/>\s*</rdf:Alt>\s*</avm:Spatial\.Notes>'
        normalized, count = re.subn(pattern, b'', normalized)
        assert count == 1
        with (OUT / (rid + '-task-parser-xmp.xml')).open('xb') as f:
            f.write(normalized)
        avm = AVM.from_xml(normalized)
        row = {'resourceId': rid, 'sourcePage': page,
               'imageUrl': 'https://storage.noirlab.edu/media/archives/images/publicationjpg/' + rid + '.jpg',
               'inboundTransfer': 'ONE_BROWSER_PUBLICATION_JPEG_DOWNLOAD; copied from Downloads without another request',
               'browserSavedPath': str(local), 'image': identity(target),
               'embeddedXmp': identity(OUT / (rid + '-embedded-xmp.xml')),
               'decodedDimensions': dimensions, 'pageCredit': credit, 'colourMeaning': colour,
               'metadata': {k: getattr(avm, k) for k in ['ResourceID', 'ReferenceURL', 'Credit', 'Rights']},
               'spatial': {k: getattr(avm.Spatial, k) for k in ['CoordinateFrame', 'Equinox', 'ReferenceDimension', 'ReferencePixel', 'ReferenceValue', 'Scale', 'Rotation', 'CoordsystemProjection', 'CDMatrix', 'FITSheader', 'Notes', 'Quality']},
               'spectral': {k: getattr(avm.Spectral, k) for k in ['Bandpass', 'CentralWavelength', 'Notes']},
               'parserOnlyRemovedEmptySpectralNotes': removed,
               'taskOnlyRemovedEmptySpatialNotes': True,
               'productionAdmission': 'FAILED_CURRENT_PYAVM_EMPTY_SPATIAL_NOTES',
               'adoption': 'NOT_ADOPTED', 'registration': 'UNVERIFIED_PUBLISHER_AVM'}
        rows.append(row)
    save('source-identities-and-avm.json', rows)
    requests = []
    for name, url in [(rid + '-source-page.html', page) for rid, page, _credit, _colour in SOURCES] + [
            ('rights-page.html', 'https://noirlab.edu/public/copyright/')]:
        try:
            requests.append(fetcher.fetch(name, url, 1024 * 1024))
        except Exception:
            requests.append(json.loads((OUT / (name + '.request.json')).read_bytes()))
    save('source-policy-receipts.json', requests)
    save('rights-browser-readback.json', {
        'source': 'ACTUAL_BROWSER_VISIBLE_BODY_TEXT; read before downloads, 2026-10-04',
        'policyUrl': 'https://noirlab.edu/public/copyright/',
        'licenseUrl': 'https://creativecommons.org/licenses/by/4.0/',
        'meaning': 'Public images and captions default to CC BY 4.0 unless specifically noted. Clear visible credit required; no endorsement implied. Logo, code, scientific papers and unrelated text are outside this grant. Identifiable people need separate commercial permission.',
        'specificImagePages': [r['sourcePage'] for r in rows],
        'specificImageExceptionsObserved': False,
        'imageIdentityIsNotDssViewerBackground': True,
        'limitations': 'Admission and actual WCS/coverage/quality not yet established; not product adoption or legal opinion.'})
    after = [identity(p) for p in owned]
    assert before == after
    assert all(identity(ROOT / r['path'])['sha256'] == r['sha256'] for r in protected)
    save('owners-after-r2.json', after)
    print(json.dumps({'sources': rows, 'htmlReceipts': [{'state': r['state'], 'url': r['url']} for r in requests]}, ensure_ascii=False))

if __name__ == '__main__':
    main()
