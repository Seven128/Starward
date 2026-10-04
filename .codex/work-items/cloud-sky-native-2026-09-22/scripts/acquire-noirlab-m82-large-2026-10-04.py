"""Preserve the single official Large JPEG download; inspect headers, not RGB."""
from pathlib import Path
import hashlib
import io
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
OUT = ROOT / 'output/noirlab-m82-large-source-1004-r1'
OLD = ROOT / 'output/noirlab-prepared-wide-source-1004-r1'
DOWNLOAD = Path('C:/Users/777/Downloads/noao-m81m82 (1).jpg')
sys.path[:0] = [str(ROOT / 'data-pipelines/deep-sky'),
               str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'),
               str(ROOT / 'output/pyavm-metadata-trial-1002-r1/lib')]
from PIL import Image, ImageCms
from pyavm import AVM
from prepared_rgb_observation import _parser_xml


def bind(path):
    raw = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest()}


def save(name, value):
    with (OUT / name).open('x', encoding='utf-8') as stream:
        stream.write(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n')


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    OUT.mkdir(exist_ok=False)
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    protected = json.loads((TASK / 'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
    inputs = [Path(__file__), ROOT / 'data-pipelines/deep-sky/prepared_rgb_observation.py',
              OLD / 'noao-m81m82.jpg', OLD / 'noao-m81m82-embedded-xmp.xml',
              OLD / 'noao-m81m82-source-page.html', OLD / 'rights-page.html']
    inputs += [ROOT / row['path'] for row in protected]
    before = [bind(p) for p in inputs]
    save('inputs-before.json', before)
    raw = DOWNLOAD.read_bytes()
    assert 0 < len(raw) <= 16 * 1024 * 1024 and raw[:2] == b'\xff\xd8' and raw[-2:] == b'\xff\xd9'
    image_path = OUT / 'noao-m81m82-large.jpg'
    with image_path.open('xb') as stream:
        stream.write(raw)
    assert DOWNLOAD.read_bytes() == image_path.read_bytes()
    with Image.open(image_path) as image:
        assert image.format == 'JPEG' and image.mode == 'RGB' and image.width * image.height <= 40 * 1024 * 1024
        dimensions = list(image.size)
        orientation = image.getexif().get(274, 1)
        assert orientation == 1
        xmp, icc = image.info.get('xmp'), image.info.get('icc_profile')
        assert isinstance(xmp, bytes) and xmp and isinstance(icc, bytes) and icc
        # No image.load(), convert(), tobytes() or RGB processing in this step.
    (OUT / 'embedded-xmp.xml').write_bytes(xmp)
    (OUT / 'icc-profile.icc').write_bytes(icc)
    parser_xml, empty_spectral = _parser_xml(xmp)
    parser_xml, empty_spatial = _parser_xml(parser_xml, note_name='Spatial.Notes')
    avm = AVM.from_xml(parser_xml)
    old_xmp = (OLD / 'noao-m81m82-embedded-xmp.xml').read_bytes()
    assert avm.ResourceID == 'noao-m81m82'
    assert avm.Credit == 'T.A. Rector (University of Alaska Anchorage) and NOIRLab/NSF/AURA/'
    assert avm.Rights == 'Creative Commons Attribution 4.0 International License'
    assert avm.ReferenceURL == 'https://noirlab.edu/public/images/noao-m81m82/'
    profile = ImageCms.ImageCmsProfile(io.BytesIO(icc))
    result = {
        'status': 'LARGE_JPEG_HEADERS_IDENTIFIED_NO_RGB_DECODE_OR_ADOPTION',
        'resourceId': avm.ResourceID, 'sourceUrl': 'https://storage.noirlab.edu/media/archives/images/large/noao-m81m82.jpg',
        'metadataReferenceUrl': avm.ReferenceURL, 'image': bind(image_path), 'dimensions': dimensions,
        'embeddedXmp': bind(OUT / 'embedded-xmp.xml'), 'xmpExactOld4k': xmp == old_xmp,
        'icc': {**bind(OUT / 'icc-profile.icc'), 'name': ImageCms.getProfileName(profile).strip(),
                'description': ImageCms.getProfileDescription(profile).strip()},
        'credit': avm.Credit, 'rightsLabel': avm.Rights, 'licenseUrl': 'https://creativecommons.org/licenses/by/4.0/',
        'policyUrl': 'https://noirlab.edu/public/copyright/',
        'colourMeaning': 'Published B blue, V cyan, R green, I orange, H-alpha red composite; encoded RGB, not calibrated flux',
        'telescopeWording': {'description': 'KPNO 0.9m-meter with Mosaic camera',
                             'filterTable': 'WIYN 0.9-meter Telescope / Mosaic I',
                             'decision': 'Keep both source-page labels; no evidence to call the old KPNO/WIYN 0.9m wording incorrect or to substitute WIYN 3.5m ODI.'},
        'referenceDimension': avm.Spatial.ReferenceDimension, 'referencePixel': avm.Spatial.ReferencePixel,
        'referenceValue': avm.Spatial.ReferenceValue, 'scale': avm.Spatial.Scale,
        'rotation': avm.Spatial.Rotation, 'orientationExif': orientation,
        'removedEmptySpectralNotesInParserCopy': empty_spectral, 'removedEmptySpatialNotesInParserCopy': empty_spatial,
        'acquisition': {'method': 'Actual Browser Large JPEG downloadMedia once after bounded cache inventory',
                        'downloadFileName': DOWNLOAD.name, 'imageDownloads': 1,
                        'declaredPageMegabytes': 8.8, 'httpStatusAndHeaders': 'UNOBSERVED',
                        'inventory': 'rg --files --no-ignore output for source-id/large/original names, selected source/request identity JSON for the exact large URL, and named Downloads files. Existing named file is the 1163247-byte 4k JPEG with matching sha; no higher-resolution match found in this bounded inventory. Not exhaustive machine inventory.'},
        'fullRgbDecodes': 0, 'rgbReprojections': 0, 'publicationWrites': 0,
        'limits': 'Header/AVM/ICC and byte identity only. Full decode, effective detail, registration/coverage/background/weak structure, processing version, complete publication/Sources/page/native/cost/capacity remain unverified.'}
    assert [bind(p) for p in inputs] == before
    assert all(bind(ROOT / row['path'])['sha256'] == row['sha256'] for row in protected)
    save('inputs-after.json', before)
    save('result.json', result)
    print(json.dumps({key: result[key] for key in ['status', 'image', 'dimensions', 'xmpExactOld4k', 'icc']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
