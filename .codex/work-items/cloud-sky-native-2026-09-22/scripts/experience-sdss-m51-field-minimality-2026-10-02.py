"""Bounded omission counterexamples from previously saved actual M51 masks."""
from pathlib import Path
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from PIL import Image
from astropy.wcs import WCS

OUT = ROOT/'output/sdss-m51-field-geometry-1002'


def binding(path):
    raw = path.read_bytes()
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}


def summarize(mask,target):
    missing_y,missing_x = np.nonzero(~mask)
    result = {'coveredPixels':int(mask.sum()),'missingPixels':int((~mask).sum()),'fullTargetAvailable':bool(mask.all())}
    if missing_y.size:
        x,y = int(missing_x[0]),int(missing_y[0])
        ra,dec = target.all_pix2world(x,mask.shape[0]-1-y,0)
        result['firstMissing'] = {'targetImageXY':[x,y],'raDeg':float(ra),'decDeg':float(dec)}
        result['missingTargetBoundsXYInclusive'] = [int(missing_x.min()),int(missing_y.min()),int(missing_x.max()),int(missing_y.max())]
    return result


def main():
    output = OUT/'bounded-omission-evidence.json'
    if output.exists():
        raise RuntimeError('preserve_existing_omission_generation')
    report = json.loads((OUT/'geometry.json').read_bytes())
    chosen = report['chosenBufferedRFields']
    target = WCS(report['targetWcs'])
    masks = {name:np.load(OUT/(name.replace('/','-')+'-r-available.npy')) for name in chosen}
    guarded = {name:np.load(OUT/(name.replace('/','-')+'-r-buffered.npy')) for name in chosen}
    actual = np.logical_or.reduce(list(masks.values()))
    assert actual.all()
    omitted = []
    for name in chosen:
        present = [value for key,value in masks.items() if key != name]
        present_guard = [value for key,value in guarded.items() if key != name]
        case = {'omittedField':name, 'actualStencil':summarize(np.logical_or.reduce(present),target),
                'bufferedStencil':summarize(np.logical_or.reduce(present_guard),target)}
        omitted.append(case)
        # Each chosen field has an actual required contribution, independent
        # of the selection guard or a source-count assertion.
        assert case['actualStencil']['missingPixels'] > 0
    same_run = np.logical_or.reduce([value for name,value in masks.items() if name.startswith('301/3699/6/')])
    Image.fromarray((same_run.astype(np.uint8)*255)).save(OUT/'same-run-99-100-101-stencil.png')
    ownership = np.zeros((*actual.shape,3),dtype=np.uint8)
    claimed = np.zeros(actual.shape,dtype=bool)
    colors = [(56,123,193),(217,142,26),(55,160,98),(168,93,202),(206,70,68),(42,174,188)]
    ownership_counts = []
    for name,color in zip(chosen,colors):
        contribution = masks[name]&~claimed
        ownership[contribution] = color
        claimed |= masks[name]
        ownership_counts.append({'field':name,'colorRGB':list(color),'firstAvailablePixels':int(contribution.sum())})
    Image.fromarray(ownership).save(OUT/'selected-r-first-available-field-map.png')
    artifact_paths = [OUT/'geometry.json',OUT/'selected-gi-plan.json',OUT/'center-actual-stencil-coverage.png',
                     OUT/'actual-r-union.png',OUT/'same-run-99-100-101-stencil.png',OUT/'selected-r-first-available-field-map.png']
    result = {'scope':'Actual saved r stencil masks, bounded omission counterexamples; black in binary mask means unavailable, not measured black sky; ownership order only diagnostic, not a science mosaic policy',
              'actualSelectedSet':chosen,'selectedActualUnion':summarize(actual,target),'omittingOneSelectedField':omitted,
              'sameRun99_100_101':summarize(same_run,target),'diagnosticFirstAvailableFieldMap':ownership_counts,
              'geometryScript':binding(ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/scripts/experience-sdss-m51-field-geometry-2026-10-02.py'),
              'omissionScript':binding(Path(__file__)), 'artifacts':[binding(path) for path in artifact_paths],
              'maskInputs':[binding(OUT/(name.replace('/','-')+'-r-'+kind+'.npy')) for name in chosen for kind in ('available','buffered')],
              'sourceQuality':'UNKNOWN','fullAsTransAstrometry':'NOT_APPLIED','fullGriCoverage':'UNVERIFIED'}
    output.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'evidence':str(output),'sameRunMissingPixels':result['sameRun99_100_101']['missingPixels'],
                      'omissionMissingPixels':{row['omittedField']:row['actualStencil']['missingPixels'] for row in omitted}}))


if __name__=='__main__':
    main()
