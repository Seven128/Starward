"""Finish only the unwritten tail of the retained partial document recorder."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
name = 'experience-measured-native-psf-support-2026-10-03.md'

def bind(p):
    data = p.read_bytes()
    return {'path': p.relative_to(ROOT).as_posix(), 'bytes': len(data),
            'sha256': hashlib.sha256(data).hexdigest()}

def edit(p, old, new):
    s = p.read_text(encoding='utf-8')
    assert old in s, (str(p), old[:60])
    p.write_text(s.replace(old, new, 1), encoding='utf-8', newline='\n')

original = TASK / 'scripts/record-measured-psf-continuity-2026-10-03.py'
tail = original.read_text(encoding='utf-8').split("edit(ROOT/'data-pipelines/deep-sky/README.md'", 1)[1]
tail = "edit(ROOT/'data-pipelines/deep-sky/README.md'" + tail
old = 'The relative kernel is not a calibrated flux image, FWHM, measured-star validation or a PSF correction.'
actual = 'Other contributing fields and measured-star/spatial accuracy remain separate\nquality obligations; a complete input container is not image-quality adoption.'
tail = tail.replace(old, actual.replace('\n', '\\n'))
# Retain the initial recorder and its exact partial failure rather than replay it.
failure = ROOT / 'output/sdss-imagepsf-centering-1003-r1/readback/document-update-failed.json'
if not failure.exists():
    with failure.open('x', encoding='utf-8') as f:
        json.dump({'recorder': bind(original), 'failedStage': 'README text match',
                   'alreadyWritten': ['visual-self-review', 'evidence', 'PLAN', 'CONTINUE', 'external-capabilities'],
                   'scienceOrCandidateChanges': False, 'repair': bind(Path(__file__))}, f, indent=2)
        f.write('\n')
exec(compile(tail, str(original) + ':unwritten-tail', 'exec'))
