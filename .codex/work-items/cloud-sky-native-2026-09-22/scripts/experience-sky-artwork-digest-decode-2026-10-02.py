"""Full local decode of a bounded valid JPEG payload substitution; no network."""
from pathlib import Path
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'))
import PIL
from PIL import Image
import numpy as np

source, changed = map(Path, sys.argv[1:3])
def decode(path):
    raw = path.read_bytes()
    with Image.open(path) as image:
        image.load()
        rgba = np.array(image.convert('RGBA'))
        return raw, rgba, {'file': path.relative_to(ROOT).as_posix(),
            'encodedBytes': len(raw), 'encodedSha256': hashlib.sha256(raw).hexdigest(),
            'size': list(image.size), 'format': image.format,
            'rgbaSha256': hashlib.sha256(rgba.tobytes()).hexdigest()}

original_bytes, original_pixels, original = decode(source)
mutated_bytes, mutated_pixels, mutated = decode(changed)
assert original_pixels.shape == mutated_pixels.shape
difference = np.abs(original_pixels.astype(np.int16) - mutated_pixels.astype(np.int16))
print(json.dumps({'decoder': 'Pillow', 'version': PIL.__version__, 'original': original,
    'changed': mutated, 'sameDimensions': original['size'] == mutated['size'],
    'sameEncodedLength': len(original_bytes) == len(mutated_bytes),
    'changedPixels': int(np.count_nonzero(np.any(difference != 0, axis=2))),
    'maxChannelDifference': int(difference.max()),
    'boundary': 'Actual desktop full image decode only; not WeChat native decode/quality/science.'}))
