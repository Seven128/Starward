"""Read cached ICCs and real crop margins; no source/geometry/display edits."""
from pathlib import Path
import hashlib
import io
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
OUT = ROOT / 'output/prepared-wide-display-inputs-1004-r1'
sys.path[:0] = [str(ROOT / 'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from PIL import Image, ImageCms

CASES = [
    ('m51-noirlab', 'output/noirlab-prepared-wide-source-1004-r1/noao1309a.jpg',
     'output/noirlab-prepared-wide-quality-1004-r1/noao1309a/overview.png'),
    ('m82-noirlab', 'output/noirlab-prepared-wide-source-1004-r1/noao-m81m82.jpg',
     'output/noirlab-prepared-wide-quality-1004-r1/noao-m81m82/overview.png'),
    ('m51-hubble', 'output/hubble-m51-source-quality-trial-1002-r1/heic0506a.jpg', None),
    ('m82-hubble', 'output/hubble-m82-prepared-source-1004-r1/heic0604a.jpg', None),
]
REGIONS = {
    'm51-noirlab': [('north-companion-halo-to-crop-edge', (150, 0, 276, 85)),
                    ('south-outer-arm-pattern', (180, 360, 350, 480))],
    'm82-noirlab': [('north-visible-wind-pattern', (210, 130, 350, 240)),
                    ('south-visible-wind-pattern', (206, 298, 346, 407))],
}

def bind(p):
    raw = p.read_bytes()
    return {'path': p.relative_to(ROOT).as_posix(), 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest()}

def save(name, value):
    raw = json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n'
    with (OUT / name).open('x', encoding='utf-8') as f:
        f.write(raw)

def main():
    OUT.mkdir(exist_ok=False)
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    inputs = [Path(__file__), TASK / 'evidence/experience-prepared-srgb-exposure-2026-10-03.md']
    inputs += [ROOT / value for _, jpeg, overview in CASES for value in (jpeg, overview) if value]
    protected = json.loads((TASK / 'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
    inputs += [ROOT / row['path'] for row in protected]
    before = [bind(p) for p in inputs]
    save('inputs-before.json', before)
    rows = []
    for name, jpeg, overview in CASES:
        # Image.open reads the container/ICC. Never decode original JPEG RGB.
        with Image.open(ROOT / jpeg) as image:
            assert image.format == 'JPEG' and image.mode == 'RGB'
            icc = image.info.get('icc_profile')
            profile = ImageCms.ImageCmsProfile(io.BytesIO(icc)) if icc else None
            description = ImageCms.getProfileDescription(profile).strip() if profile else None
            profile_name = ImageCms.getProfileName(profile).strip() if profile else None
        row = {'id': name, 'jpeg': bind(ROOT / jpeg), 'icc': None,
               'encodedColourSpace': 'UNKNOWN', 'scientificRadiometry': 'UNKNOWN'}
        if icc:
            file = OUT / (name + '.icc')
            file.write_bytes(icc)
            row['icc'] = {**bind(file), 'name': profile_name, 'description': description}
            assert profile_name == 'IEC 61966-2.1 Default RGB colour space - sRGB'
            row['encodedColourSpace'] = 'ICC_DECLARED_sRGB'
        if overview:
            with Image.open(ROOT / overview) as image:
                rgba = np.array(image.convert('RGBA'))
            assert rgba.shape == (512, 512, 4) and (rgba[:, :, 3] == 255).all()
            rgb = rgba[:, :, :3]
            edges = {'north': rgb[:4], 'south': rgb[-4:],
                     'west': rgb[:, :4], 'east': rgb[:, -4:]}
            row['actualCropMargins'] = {
                side: {'pixels': int(np.prod(values.shape[:2])),
                       'encodedRgbMedian': np.median(values, axis=(0, 1)).tolist(),
                       'encodedRgb90thPercentile': np.percentile(values, 90, axis=(0, 1)).tolist(),
                       'allBlackPixels': int((values == 0).all(axis=2).sum()),
                       'meaning': 'Real encoded image margin with stars/possible faint structure; not blank sky.'}
                for side, values in edges.items()}
            regions = []
            for label, bounds in REGIONS[name]:
                x0, y0, x1, y1 = bounds
                crop = rgba[y0:y1, x0:x1]
                file = OUT / (name + '-' + label + '-raw.png')
                Image.fromarray(crop).save(file)
                regions.append({'label': label, 'overviewBoundsXYExclusive': bounds,
                                'png': bind(file), 'rawRgbaSha256': hashlib.sha256(crop.tobytes()).hexdigest(),
                                'meaning': 'Proposed visually recognizable display-pattern anchor; not a science mask or flux/structure classification.'})
            row['unchangedEncodedPatternAnchors'] = regions
        rows.append(row)
    after = [bind(p) for p in inputs]
    assert before == after
    assert all(bind(ROOT / p['path'])['sha256'] == p['sha256'] for p in protected)
    save('inputs-after.json', after)
    result = {'status': 'READ_CACHED_ICC_AND_ACTUAL_MARGINS_NO_SOURCE_CHANGE', 'rows': rows,
              'originalJpegRgbDecodes': 0, 'sourceRequests': 0, 'reprojections': 0,
              'limits': ['ICC establishes only the encoded display space for the specific source, not astronomical flux or cross-filter color compatibility.',
                         'Cached products already interpolate/box-filter encoded RGB. A composition-only trial cannot claim to repair their resampling.',
                         'M82 Hubble has no embedded ICC; no sRGB provenance inferred for it.',
                         'Image boundary diagnostics and root visual anchors do not authorize crop/feather/background subtraction or certify weak scientific structure.']}
    save('result.json', result)
    print(json.dumps({'status': result['status'], 'icc': [(r['id'], r['encodedColourSpace']) for r in rows]}))

if __name__ == '__main__':
    main()
