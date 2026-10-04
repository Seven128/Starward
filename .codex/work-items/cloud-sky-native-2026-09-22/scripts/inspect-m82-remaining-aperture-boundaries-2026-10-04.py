"""Saved radius/qualification attribution, not a new source or science mask."""
from pathlib import Path
import importlib.util
import json

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
GEN = ROOT / 'output/sdss-m82-current-adaptive-recovery-1004-r1'
QUAL = ROOT / 'output/sdss-m82-boundary-other-scan-qualification-1004-r1'
OUT = ROOT / 'output/sdss-m82-remaining-aperture-boundaries-1004-r1'
spec = importlib.util.spec_from_file_location('reader', TASK / 'scripts/readback-m82-current-adaptive-recovery-2026-10-04.py')
reader = importlib.util.module_from_spec(spec); spec.loader.exec_module(reader)
np, bind = reader.np, reader.bind
from PIL import Image, ImageDraw


def main():
    assert not OUT.exists()
    OUT.mkdir(); (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    result_path = GEN / 'result.json'; result = json.loads(result_path.read_bytes()); inputs = [bind(result_path), bind(Path(__file__))]
    parent_path = ROOT / result['parentCandidate']['path']; current_path = ROOT / result['candidate']['path']
    assert bind(parent_path) == result['parentCandidate'] and bind(current_path) == result['candidate']
    parent, current = json.loads(parent_path.read_bytes()), json.loads(current_path.read_bytes())
    inputs.extend([bind(parent_path), bind(current_path)])
    def array(meta, directory):
        path = directory / meta['file']; actual = bind(path)
        assert (actual['sha256'], actual['bytes']) == (meta['sha256'], meta['bytes'])
        value = np.load(path, mmap_mode='r', allow_pickle=False); inputs.append(actual)
        return value
    q = array(parent['arrays']['qualified'], parent_path.parent)
    radius = array(parent['arrays']['radius'], parent_path.parent)
    supply = array(current['arrays']['alternative-supply'], current_path.parent)
    qualified_without_aperture = q & (radius < 0)
    # Radius1's actual circle contains the centre and four axial neighbours.
    # Only inside the saved real-halo perimeter can all five be read here;
    # exterior source support is not guessed or padded.
    blocked = np.zeros(q.shape, bool)
    blocked[1:-1, 1:-1] = ~(q[1:-1, 1:-1] & q[:-2, 1:-1] & q[2:, 1:-1] & q[1:-1, :-2] & q[1:-1, 2:])
    interior = np.zeros(q.shape, bool); interior[8:-8, 8:-8] = True
    unresolved = qualified_without_aperture & interior & ~blocked
    assert not unresolved.any(), 'Unexpected radius1 failure; investigate actual conditional variance instead of attributing to flags.'
    categories = np.zeros(q.shape, np.uint8)
    categories[radius == 0] = 1
    categories[~q] = 2
    categories[qualified_without_aperture] = 3
    categories[supply] = 4
    palette = np.array([[28, 28, 28], [65, 115, 220], [220, 60, 60], [235, 185, 45], [160, 70, 220]], np.uint8)
    qualification_path = QUAL / 'result.json'; qualification = json.loads(qualification_path.read_bytes()); inputs.append(bind(qualification_path))
    estimates = {b: array(current['arrays'][b], current_path.parent) for b in 'gri'}
    from astropy.visualization import make_lupton_rgb, ManualInterval, LuptonAsinhStretch
    recipe = current['sourceResolvedRecipe']
    rgb = make_lupton_rgb(estimates['i'], estimates['r'], estimates['g'], interval=ManualInterval(vmin=0, vmax=None),
        stretch_object=LuptonAsinhStretch(stretch=recipe['stretch'], Q=recipe['Q']), output_dtype=np.uint8)
    sheet = Image.new('RGB', (512, 1450), '#181818'); draw = ImageDraw.Draw(sheet)
    draw.text((4, 4), 'BLUE protected / RED unqualified / YELLOW no radius1', fill='white')
    draw.text((4, 22), 'PURPLE real recovery / DARK processed', fill='white'); facts = []
    for index, patch in enumerate(qualification['patches']):
        x0, y0, x1, y1 = patch['boundsXYExclusive']; region = slice(y0, y1), slice(x0, x1)
        draw.text((4, 50 + index * 280), patch['name'] + ' / current RGB - saved roles', fill='white')
        for column, pixels in enumerate((rgb[region], palette[categories[region]])):
            sheet.paste(Image.fromarray(pixels).resize((256, 256), Image.Resampling.NEAREST), (column * 256, 74 + index * 280))
        facts.append({'name': patch['name'], 'boundsXYExclusive': patch['boundsXYExclusive'],
            'recovered': int(supply[region].sum()), 'remainingUnqualifiedOriginal': int((~q[region] & ~supply[region]).sum()),
            'qualifiedButNoApertureOriginal': int(qualified_without_aperture[region].sum()),
            'interiorQualifiedNoApertureAllRadius1Blocked': int((qualified_without_aperture & interior & blocked)[region].sum()),
            'outsideDeclaredInteriorNoExteriorAttribution': int((qualified_without_aperture & ~interior)[region].sum())})
    sheet.save(OUT / 'actual-rgb-and-saved-roles.png')
    np.savez_compressed(OUT / 'saved-radius1-attribution.npz', qualifiedWithoutAperture=qualified_without_aperture,
        savedInteriorRadius1Blocked=blocked & interior, categories=categories)
    for pin in inputs: assert bind(ROOT / pin['path']) == pin
    report = {'scope': __doc__, 'inputs': inputs, 'inputsAfterExact': True,
        'qualifiedButNoAperture': int(qualified_without_aperture.sum()),
        'interiorQualifiedNoAperture': int((qualified_without_aperture & interior).sum()),
        'interiorQualifiedNoApertureRadius1Blocked': int((qualified_without_aperture & interior & blocked).sum()),
        'remainingUnqualifiedOriginal': int((~q & ~supply).sum()),
        'remainingRadiusNegativeOriginal': int(((radius < 0) & ~supply).sum()), 'patches': facts,
        'meaning': 'Actual saved interior roles prove first-radius qualification interruption. Existing recovery supplies raw alternate centres only and does not recompute aperture support or native covariance. The chart does not supply a new mask/coverage, quality/confidence or an automatically usable recovered aperture.',
        'sourceRequests': 0, 'projectionFilterOrCoaddRuns': 0, 'candidateChanges': 0,
        'ordinaryAdoption': False, 'independentReview': 'MISSING'}
    reader.producer.save(OUT / 'result.json', report)
    print(json.dumps({k: v for k, v in report.items() if k != 'inputs'}))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        if OUT.exists(): reader.producer.save(OUT / 'failed.json', {'type': type(error).__name__, 'error': str(error)})
        raise
