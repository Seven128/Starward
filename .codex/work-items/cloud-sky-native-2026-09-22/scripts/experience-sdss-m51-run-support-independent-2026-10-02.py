"""Independent cached bit-membership/geometry check; no owner call/reprojection."""
from pathlib import Path
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np

FIELDS = ('301/3699/6/99', '301/3699/6/100', '301/3699/6/101',
          '301/3716/6/116', '301/3716/6/117', '301/3716/6/118')
SOURCE = ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2'
GEOMETRY = ROOT/'output/sdss-m51-field-geometry-1002'
INDEPENDENT = ROOT/'output/sdss-m51-mosaic-source-independent-1002-r3'
OUTPUT = ROOT/'output/sdss-m51-run-support-independent-1002-r1'
assert not OUTPUT.exists(), 'retain all prior output generations'

def binding(path):
    raw = path.read_bytes()
    return {'path':path.relative_to(ROOT).as_posix(), 'bytes':len(raw),
            'sha256':hashlib.sha256(raw).hexdigest()}

inputs = []
def admitted(path, declaration=None):
    actual = binding(path)
    if declaration:
        assert (actual['bytes'],actual['sha256']) == (declaration['bytes'],declaration['sha256'])
    inputs.append(actual)
    return path

run_report_path = admitted(ROOT/'output/sdss-m51-run-support-1002-r1/result.json')
assert inputs[-1]['sha256'] == '1fae7c2a8a8aca2b1f8c553c720a8eace1f86497b839af6d7805f672dbafe8a7'
run_report = json.loads(run_report_path.read_text())
candidate = json.loads(admitted(SOURCE/'candidate.json').read_text())
assert inputs[-1]['sha256'] == '73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52'
source_review = json.loads(admitted(INDEPENDENT/'review.json').read_text())
geometry = json.loads(admitted(GEOMETRY/'geometry.json').read_text())
assert candidate['wcsHeader'] == source_review['targetWcs'] == geometry['targetWcs']
assert candidate['pixels'] == source_review['targetPixels'] == geometry['targetPixels'] == 2048
assert tuple(candidate['mosaic']['diagnostics']) == FIELDS
for band in 'gri':
    identities = [x['identity'] for x in candidate['science']['perBand'][band]['sourceReceipts']]
    assert tuple(f"{x['rerun']}/{x['run']}/{x['camcol']}/{x['field']}" for x in identities) == FIELDS
    assert all(x['band'] == band for x in identities)

# Independent source reviewer saved full-pixel field bits using these six fields.
memberships = {}
for band in 'gri':
    declaration = source_review['fieldMembershipArrays'][band]
    array = np.load(admitted(ROOT/declaration['path'],declaration),mmap_mode='r',allow_pickle=False)
    assert array.shape == (2048,2048) and array.dtype == np.uint8
    memberships[band] = array
coherent_bits = memberships['g'] & memberships['r'] & memberships['i']
fields = []
for index,key in enumerate(FIELDS):
    descriptors = candidate['mosaic']['diagnostics'][key]
    mask = (coherent_bits & (1 << index)) != 0
    for band in 'gri':
        footprint = np.load(admitted(SOURCE/descriptors[f'{band}-footprint']['file'],descriptors[f'{band}-footprint']),mmap_mode='r',allow_pickle=False)
        finite = np.load(admitted(SOURCE/descriptors[f'{band}-finite-neighbors']['file'],descriptors[f'{band}-finite-neighbors']),mmap_mode='r',allow_pickle=False)
        expected = (memberships[band] & (1 << index)) != 0
        assert np.array_equal(footprint & finite,expected)
    prior_r = np.load(admitted(GEOMETRY/(key.replace('/','-')+'-r-available.npy')),mmap_mode='r',allow_pickle=False)
    assert np.array_equal(prior_r,(memberships['r'] & (1 << index)) != 0)
    weight = np.load(admitted(SOURCE/descriptors['normalized-weight']['file'],descriptors['normalized-weight']),mmap_mode='r',allow_pickle=False)
    assert np.array_equal(weight > 0,mask)
    fields.append({'fieldKey':key,'coherentPixels':int(np.count_nonzero(mask)),
        'independentEachBandMatchesSavedFootprintAndFinite':True,
        'priorRealRGeometryMatchesIndependentMembership':True,
        'positiveNormalizedWeightMatchesCoherentSupport':True})
assert [{'fieldKey':x['fieldKey'],'coherentPixels':x['coherentPixels']}for x in fields] == run_report['fields']

# Decode run bit ranges once, then explicit center crops independent of owner script.
runs = {'3699':(coherent_bits & 0b000111) != 0,
        '3716':(coherent_bits & 0b111000) != 0}
assert np.all(runs['3699'] | runs['3716'])
bounds = {'OVERVIEW':(0,0,2048,2048),'MEDIUM':(512,512,1536,1536),'DETAIL':(768,768,1280,1280)}
regions = {}
for level,(x0,y0,x1,y1) in bounds.items():
    assert candidate['levels'][level]['masterCrop']['boundsXYExclusive'] == [x0,y0,x1,y1]
    total = (x1-x0)*(y1-y0)
    regions[level] = {'masterBoundsXYExclusive':[x0,y0,x1,y1],'masterPixels':total,
        'runs':{run:{'coherentPixels':int(np.count_nonzero(mask[y0:y1,x0:x1])),
                    'unavailablePixels':int(total-np.count_nonzero(mask[y0:y1,x0:x1])),
                    'complete':bool(np.all(mask[y0:y1,x0:x1]))}for run,mask in runs.items()}}
assert regions == run_report['regions']
admitted(Path(__file__).resolve())
preserved = json.loads((ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json').read_text())
assert all(binding(ROOT/item['path'])['sha256'] == item['sha256']for item in preserved)
assert all(binding(ROOT/item['path']) == item for item in inputs)
OUTPUT.mkdir()
result = {'inputs':inputs,'fields':fields,'regions':regions,'entireCombinedCoherentUnionPixels':4194304,
    'method':'Independent cached g/r/i field bits AND, then per-run bit selection and explicit center crops; all saved per-field masks, prior actual r geometry and positive normalized weights compared full-pixel.',
    'preservedSixUnchanged':True,'inputsUnchanged':True,
    'scope':'Coverage facts only. No owner/script invocation, raw frame reread, reprojection, science/weight/RGB change, source acquisition, runtime or quality adoption. No spatial PSF/absolute astrometry/seeing claim.'}
(OUTPUT/'review.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'binding':binding(OUTPUT/'review.json'),'regions':regions}))
