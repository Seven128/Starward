"""Recover saved M51 pair crops and propose visible M82 foreground points.

R1 report serialization failed after saving all M51 crops. Do not rerun that
work; recover measurements from the bound saved RGB crops. M82 visual hints
are proposals, not catalog qualification or automatic identification.
"""
from pathlib import Path
import hashlib
import importlib.util
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
OLD = ROOT / 'output/prepared-wide-tie-proposals-1004-r1'
M82_SAVED = ROOT / 'output/prepared-wide-tie-proposals-1004-r2'
OUT = ROOT / 'output/prepared-wide-tie-proposals-1004-r3'
sys.path[:0] = [str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'), str(ROOT / 'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image, ImageDraw

helper_path = TASK / 'scripts/experience-hubble-m51-curated-registration-2026-10-02.py'
spec = importlib.util.spec_from_file_location('existing_aperture_estimator', helper_path)
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
HINTS = [('visible-spike-southeast',1254,1293),('visible-blue-west',427,939),
         ('visible-blue-north',1037,541),('visible-faint-east',1530,870)]

def bound(p):
    b = p.read_bytes()
    return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}

def save(name,value):
    # Serialize before exclusive creation; never leave a partly written report.
    raw = json.dumps(value,ensure_ascii=False,indent=2,allow_nan=False)+'\n'
    with (OUT/name).open('x',encoding='utf-8') as f:
        f.write(raw)

def crop(a,x,y,radius):
    return np.array(a[y-radius:y+radius+1,x-radius:x+radius+1],copy=True)

def measure(rgb,origin_xy):
    assert rgb.shape==(129,129,3)
    area=rgb[42:87,42:87].mean(axis=-1)
    iy,ix=np.unravel_index(np.argmax(area),area.shape)
    lx,ly=42+int(ix),42+int(iy)
    intensity=crop(rgb,lx,ly,32).mean(axis=-1)
    measurements={str(rad):helper.estimate(intensity,rad) for rad in (4,8,12)}
    px,py=origin_xy[0]+lx,origin_xy[1]+ly
    return {'peakIntegerTargetColumnTopRow':[px,py], 'apertureMeasurements':measurements,
            'centroidTargetColumnTopRow':{rad:[px+v['columnRow'][0],py+v['columnRow'][1]] for rad,v in measurements.items()},
            'decodedAnyChannel255InRoi':int(np.any(rgb==255,axis=-1).sum()),'physicalSaturation':'UNKNOWN'}

def main():
    OUT.mkdir(exist_ok=False)
    (OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    previous_before=json.loads((OLD/'inputs-before.json').read_bytes())
    assert previous_before==json.loads((OLD/'inputs-after.json').read_bytes())
    for row in previous_before:
        if row['path'].endswith('/propose-prepared-wide-ties-2026-10-04.py'):
            assert bound(OLD/'executed-script.py')['sha256']==row['sha256']
        else:
            assert bound(ROOT/row['path'])==row
    curated_path=ROOT/'output/hubble-m51-curated-registration-1002-r1/result.json'
    curated=json.loads(curated_path.read_bytes())
    old_points={p['id']:p for p in curated['proposals']}
    hst_path=ROOT/'output/hubble-m82-prepared-coverage-1004-r1/master-rgba.npy'
    noir_path=ROOT/'output/noirlab-prepared-wide-quality-1004-r1/noao-m81m82/master-rgba.npy'
    inputs=[Path(__file__),helper_path,curated_path,hst_path,noir_path,OLD/'inputs-before.json',OLD/'inputs-after.json',OLD/'executed-script.py']
    inputs += sorted(OLD.glob('*raw-rgb.npy'))+sorted(OLD.glob('*contact.png'))
    inputs += sorted(M82_SAVED.glob('*raw-rgba.npy'))+sorted(M82_SAVED.glob('*contact.png'))+[M82_SAVED/'executed-script.py']
    protected=json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
    inputs += [ROOT/r['path'] for r in protected]
    before=[bound(p) for p in inputs];save('inputs-before.json',before)
    proposals=[]
    for name in ('foreground-1','foreground-2','foreground-3','foreground-5'):
        xy=old_points[name]['hstNominalCoordinates']['8']['nominalTargetColumnRow']
        x,y=map(int,np.rint(xy));rid='M-51-'+name
        pair=[]
        for image in ('hst','noirlab'):
            p=OLD/(rid+'-'+image+'-raw-rgb.npy')
            rgb=np.load(p,allow_pickle=False)
            pair.append({'name':image,**measure(rgb,[x-64,y-64]),'rawRgbRoi':bound(p),
                         'rawRoiBoundsXYExclusive':[x-64,y-64,x+65,y+65]})
        proposals.append({'objectRef':'M:51','hint':{'id':name,'targetColumnTopRow':xy},
            'state':'PROPOSED_PAIR_RAW_CONTACT_VIEWED_BY_ROOT_NO_INDEPENDENT_REVIEW',
            'pair':pair,'contact':bound(OLD/(rid+'-contact.png')),
            'originalProposalState':'FAILED_REPORT_SERIALIZATION_AFTER_SAVED_CROPS'})
    hst=np.load(hst_path,mmap_mode='r',allow_pickle=False)
    noir=np.load(noir_path,mmap_mode='r',allow_pickle=False)
    assert hst.shape==noir.shape==(2048,2048,4)
    # R2 saved the first three pairs; its last east hint was actually outside
    # Hubble geometry and raised the estimator's no-positive-weight guard.
    # Preserve that failed generation. Recover only its saved crops/contacts.
    east_name,east_x,east_y=HINTS[-1]
    assert not (crop(hst,east_x,east_y,22)[:,:,3]==255).any()
    rejections=[{'hint':east_name,'source':'hst','state':'OUTSIDE_HST_GEOMETRY_NOT_A_BLACK_OBSERVATION'}]
    for name,x,y in HINTS[:-1]:
        rid='M-82-'+name
        pair=[]
        for col,(image,a) in enumerate([('hst',hst),('noirlab',noir)]):
            p=M82_SAVED/(rid+'-'+image+'-raw-rgba.npy')
            rgba=np.load(p,allow_pickle=False)
            assert np.array_equal(rgba,crop(a,x,y,64))
            rgb=rgba[:,:,:3]
            measurement=measure(rgb,[x-64,y-64])
            px,py=measurement['peakIntegerTargetColumnTopRow']
            lx,ly=px-(x-64),py-(y-64)
            support=crop(rgba,lx,ly,32)[:,:,3]
            # Contact may show a real photo edge; the centroid core+annulus
            # must still be complete geometry, never a zero-filled perimeter.
            geometry_complete=bool((support==255).all())
            if not geometry_complete:
                rejections.append({'hint':name,'source':image,'state':'INCOMPLETE_CENTROID_CORE_ANNULUS'})
            pair.append({'name':image,**measurement,'rawRgbaRoi':bound(p),
                         'rawRoiBoundsXYExclusive':[x-64,y-64,x+65,y+65],
                         'centroidCoreAnnulusGeometryComplete':geometry_complete})
        p=M82_SAVED/(rid+'-contact.png')
        proposals.append({'objectRef':'M:82','hint':{'id':name,'targetColumnTopRow':[x,y]},
            'state':'PROPOSED_VISIBLE_FOREGROUND_PAIR_PENDING_ACTUAL_VISUAL_REVIEW',
            'pair':pair,'contact':bound(p),'catalogQualification':'NOT_CLAIMED'})
    for p in proposals:
        p['noirlabMinusHstTargetPixelsByRadius']={rad:(np.array(p['pair'][1]['centroidTargetColumnTopRow'][rad])-p['pair'][0]['centroidTargetColumnTopRow'][rad]).tolist() for rad in ('4','8','12')}
    after=[bound(p) for p in inputs];assert before==after
    assert all(bound(ROOT/r['path'])['sha256']==r['sha256'] for r in protected)
    save('inputs-after.json',after)
    save('result.json',{'scope':__doc__,'proposals':proposals,'rejections':rejections,'requests':0,
        'recoveredM51SourceCrops':8,'recoveredM82SourceCrops':6,'masterReprojections':0,'originalImageDecodes':0,
        'registration':'NO_TRANSFORM_APPLIED','limits':['Proposal is not a counterpart or physical saturation certificate.',
        'Root visual review is not independent review; metadata/epoch/proper-motion/absolute astrometry remain unknown.']})
    print(json.dumps({'state':'SAVED_CROPS_RECOVERED_AND_NEW_M82_PROPOSALS','pairs':len(proposals),'incompleteAnnuli':len(rejections)}))

if __name__=='__main__':main()
