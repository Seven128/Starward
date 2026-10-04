"""Propose actual shared-grid foreground pairs from cached source masters.

No transform, image repair, source request or automatic match qualification.
Reuse the earlier encoded-aperture estimator and known M51 foreground hints.
"""
from pathlib import Path
import hashlib
import importlib.util
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
OUT = ROOT / 'output/prepared-wide-tie-proposals-1004-r1'
sys.path[:0] = [str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'), str(ROOT / 'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image, ImageDraw
from sdss_gri_tan import target_tan

helper_path = TASK / 'scripts/experience-hubble-m51-curated-registration-2026-10-02.py'
spec = importlib.util.spec_from_file_location('existing_encoded_apertures', helper_path)
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)

def bound(p):
    b = p.read_bytes()
    return {'path': p.relative_to(ROOT).as_posix(), 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()}

def save(name, value):
    with (OUT / name).open('x', encoding='utf-8') as f:
        json.dump(value, f, ensure_ascii=False, indent=2, allow_nan=False)
        f.write('\n')

def extract(a, x, y, radius):
    return np.array(a[y-radius:y+radius+1, x-radius:x+radius+1], copy=True)

def main():
    OUT.mkdir(exist_ok=False)
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    m51_proposals = ROOT / 'output/hubble-m51-curated-registration-1002-r1/result.json'
    m82_catalog = ROOT / 'output/sdss-m82-measured-stars-1004-r4/result.json'
    cases = [
        ('M:51', ROOT / 'output/hubble-m51-nominal-projection-trial-1002-r1/nominal-registered-display-master.npy',
         ROOT / 'output/noirlab-prepared-wide-quality-1004-r1/noao1309a'),
        ('M:82', ROOT / 'output/hubble-m82-prepared-coverage-1004-r1/master-rgba.npy',
         ROOT / 'output/noirlab-prepared-wide-quality-1004-r1/noao-m81m82'),
    ]
    inputs = [Path(__file__), helper_path, TASK / 'scripts/experience-hubble-m51-registration-trial-2026-10-02.py',
              TASK / 'scripts/experience-sdss-local-overlap-diagnosis-2026-10-02.py',
              ROOT / 'data-pipelines/deep-sky/sdss_gri_tan.py', m51_proposals, m82_catalog]
    for _ref, old, wide in cases:
        inputs += [old, wide / 'master-rgba.npy', wide / 'master.json']
    protected = json.loads((TASK / 'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
    inputs += [ROOT / r['path'] for r in protected]
    before = [bound(p) for p in inputs]
    save('inputs-before.json', before)
    proposals, rejections = [], []
    for ref, old, wide in cases:
        hst = np.load(old, mmap_mode='r', allow_pickle=False)
        noir = np.load(wide / 'master-rgba.npy', mmap_mode='r', allow_pickle=False)
        assert hst.shape == noir.shape == (2048, 2048, 4) and hst.dtype == noir.dtype == np.uint8
        meta = json.loads((wide / 'master.json').read_bytes())
        wcs = target_tan(meta['center'], 2048, meta['fieldDegrees'])
        if ref == 'M:51':
            raw = json.loads(m51_proposals.read_bytes())
            hints = [{'id': p['id'], 'targetColumnTopRow': p['hstNominalCoordinates']['8']['nominalTargetColumnRow'],
                      'origin': 'Earlier visually qualified HST foreground spike; new NOIRLab counterpart still unqualified.'}
                     for p in raw['proposals'] if p['id'] in ('foreground-1', 'foreground-2', 'foreground-3', 'foreground-5')]
            assert len(hints) == 4
        else:
            raw = json.loads(m82_catalog.read_bytes())
            hints = []
            for p in raw['records']:
                if p.get('imageQualification') != []:
                    continue
                cat = p['catalog']
                xy = wcs.all_world2pix([[float(cat['ra']), float(cat['dec'])]], 0)[0]
                hints.append({'id': p['objID'], 'targetColumnTopRow': [float(xy[0]), float(2047-xy[1])],
                              'catalogRaDecDeg': [float(cat['ra']), float(cat['dec'])],
                              'catalogPsfMagR': float(cat['psfMag_r']),
                              'origin': 'Existing actual SDSS type6 clean isolated/complete image diagnostic; independent HST/NOIRLab identification still unqualified.'})
        for hint in hints:
            x,y = map(int, np.rint(hint['targetColumnTopRow']))
            rid = ref.replace(':','-') + '-' + hint['id']
            if not (86 <= x < 1962 and 86 <= y < 1962):
                rejections.append({'objectRef': ref, 'hint': hint, 'state': 'OUTSIDE_COMPLETE_SHARED_TARGET_ROI'})
                continue
            # Geometry admission before proposal. No zero-filled source edge
            # is allowed to masquerade as a black observational star annulus.
            patches = [extract(a, x,y,86) for a in (hst,noir)]
            if not all((p[:, :, 3] == 255).all() for p in patches):
                rejections.append({'objectRef': ref, 'hint': hint, 'state': 'INCOMPLETE_HST_OR_NOIRLAB_GEOMETRIC_ROI'})
                continue
            pair = []
            contact = Image.new('RGB', (2*387, 424), (5,5,5))
            draw = ImageDraw.Draw(contact)
            for col,(name,a) in enumerate([('hst',hst),('noirlab',noir)]):
                search = extract(a, x,y,22)[:, :, :3].mean(axis=-1)
                iy,ix = np.unravel_index(np.argmax(search), search.shape)
                px,py = x-22+int(ix), y-22+int(iy)
                patch = extract(a,px,py,32)
                intensity = patch[:, :, :3].mean(axis=-1)
                measurements = {str(radius):helper.estimate(intensity, radius) for radius in (4,8,12)}
                centroids = {radius:[px+value['columnRow'][0], py+value['columnRow'][1]] for radius,value in measurements.items()}
                rgb_crop = extract(a,x,y,64)[:, :, :3]
                np.save(OUT / (rid+'-'+name+'-raw-rgb.npy'), rgb_crop, allow_pickle=False)
                # Nearest enlargement preserves each actual encoded RGB pixel.
                image = Image.fromarray(rgb_crop).resize((387,387),Image.Resampling.NEAREST)
                contact.paste(image,(col*387,37))
                draw.text((col*387+4,5),rid+' '+name+' raw shared-grid',fill=(240,240,240))
                draw.text((col*387+4,19),'peak '+str([px,py]),fill=(240,240,240))
                pair.append({'name':name,'peakIntegerTargetColumnTopRow':[px,py],
                             'apertureMeasurements':measurements,'centroidTargetColumnTopRow':centroids,
                             'rawRgbRoi':bound(OUT / (rid+'-'+name+'-raw-rgb.npy')),
                             'rawRoiBoundsXYExclusive':[x-64,y-64,x+65,y+65],
                             'decodedAnyChannel255InRoi':int(np.any(rgb_crop==255,axis=-1).sum()),
                             'physicalSaturation': 'UNKNOWN'})
            contact_path = OUT / (rid+'-contact.png')
            contact.save(contact_path)
            proposals.append({'objectRef':ref,'hint':hint,'state':'PROPOSED_PAIR_PENDING_ACTUAL_VISUAL_REVIEW',
                              'pair':pair,'contact':bound(contact_path),
                              'noirlabMinusHstTargetPixelsByRadius':{radius:(np.array(pair[1]['centroidTargetColumnTopRow'][radius])-pair[0]['centroidTargetColumnTopRow'][radius]).tolist() for radius in ('4','8','12')}})
    after = [bound(p) for p in inputs]
    assert before == after and all(bound(ROOT/r['path'])['sha256']==r['sha256'] for r in protected)
    save('inputs-after.json', after)
    result = {'scope':__doc__,'requests':0,'proposals':proposals,'rejections':rejections,
              'masterPixelScaleApproxArcsec':.2275555555555556*3600/2048,
              'matching':'Bounded +/-22 shared-grid pixel maximum proposal, not a match certificate.',
              'registration':'UNQUALIFIED_PAIRS_NO_FIT_OR_TRANSFORM',
              'limits':['Different ground/HST PSF, filters and clipping affect encoded centroids.',
                        'Old SDSS diagnostic qualification does not independently validate the new photographs.',
                        'Publisher AVM, historic epochs/proper motion and absolute astrometry remain unverified.',
                        'No source changes, full image decode/reprojection, new masks, default publication or production edits.']}
    save('result.json',result)
    print(json.dumps({'state':result['registration'],'proposalsByTarget':{ref:sum(p['objectRef']==ref for p in proposals) for ref,_,_ in cases},'rejections':len(rejections)}))

if __name__=='__main__':
    main()
