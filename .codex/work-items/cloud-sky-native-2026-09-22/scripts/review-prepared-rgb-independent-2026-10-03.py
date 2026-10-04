"""Read frozen actual receipts + independent cached JPEG/native-coordinate math.
No owner execution, test rerun, new source acquisition, reprojection or LOD.
"""
from pathlib import Path
import hashlib, json, math, sys
ROOT=Path(__file__).resolve().parents[4]
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from PIL import Image
OUT=ROOT/'output/prepared-rgb-independent-1003-r1'
assert not OUT.exists();OUT.mkdir()
def bind(p):
    p=Path(p).resolve();b=p.read_bytes()
    return {'path':p.relative_to(ROOT).as_posix() if p.is_relative_to(ROOT) else p.as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def save(name,data):
    (OUT/name).write_text(json.dumps(data,indent=2,allow_nan=False)+'\n',encoding='utf8')
(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
D=ROOT/'output/prepared-rgb-observation-source-1003-r4'
before=json.loads((D/'inputs-before.json').read_bytes());after=json.loads((D/'inputs-after.json').read_bytes())
assert before==after
receipt_paths=[D/'result.json',D/'checks.log',D/'row-direction-mutant.log',D/'parser-normalized-xmp.xml',
 D/'original-coordinate-encoded-rgb.npy',D/'original-coordinate-geometric-support.npy',D/'nominal-source-header.txt',
 ROOT/'output/prepared-rgb-observation-source-1003-r1/failed-fixture-observation.json',
 ROOT/'output/prepared-rgb-observation-source-1003-r1/failed-wire-fixture-observation.json',
 ROOT/'output/prepared-rgb-observation-source-1003-r2/failed.json']
all_bound=[row for rows in before.values() for row in rows]
current=[bind(ROOT/row['path']) for row in all_bound]
assert current==all_bound
receipt=json.loads((D/'result.json').read_bytes());assert receipt['status']=='PASSED_BOUNDED_OFFLINE_SOURCE_ADMISSION'
raw=(ROOT/'output/hubble-m51-source-quality-trial-1002-r1/embedded-xmp.xml').read_bytes()
first=raw.index(b'<avm:Spectral.Notes>');last=raw.index(b'</avm:Spectral.Notes>')+len(b'</avm:Spectral.Notes>')
assert last-first==110
normalized=raw[:first]+raw[last:]
assert normalized==(D/'parser-normalized-xmp.xml').read_bytes()
with Image.open(ROOT/'output/hubble-m51-source-quality-trial-1002-r1/heic0506a.jpg') as image:
    assert image.size==(4000,2776) and image.mode=='RGB';image.load();rgb=np.asarray(image)
    assert hashlib.sha256(image.tobytes()).hexdigest()==receipt['decodedRgb']['sha256']
    assert image.info['xmp']==raw
# Native zero-origin FITS sampling: independent scalar four-pixel arithmetic,
# bottom row is JPEG row h-1. Not a scientific-availability assertion.
rx=[0.,1.25,100.5,1999.3,2000.25,3998.5,3999.,-.01,float('nan')]
ry=[0.,1.5,1000.75,1387.2,1388.25,2774.5,1.,0.,0.]
measured=np.load(D/'original-coordinate-encoded-rgb.npy');support=np.load(D/'original-coordinate-geometric-support.npy')
expected=np.full((len(rx),3),np.nan,dtype=np.float32);mask=[]
for i,(x,y) in enumerate(zip(rx,ry)):
    inside=math.isfinite(x) and math.isfinite(y) and 0<=x<3999 and 0<=y<2775;mask.append(inside)
    if not inside:continue
    ix,iy=math.floor(x),math.floor(y);dx,dy=x-ix,y-iy
    for c in range(3):
        a,b,c0,d=map(float,[rgb[2775-iy,ix,c],rgb[2775-iy,ix+1,c],rgb[2774-iy,ix,c],rgb[2774-iy,ix+1,c]])
        expected[i,c]=a*(1-dx)*(1-dy)+b*dx*(1-dy)+c0*(1-dx)*dy+d*dx*dy
assert expected.tobytes()==measured.tobytes() and mask==support.tolist()
g=receipt['geometry'];a0,d0=map(math.radians,g['reference_value']);theta=math.radians(g['rotation'])
f=np.array([math.cos(d0)*math.cos(a0),math.cos(d0)*math.sin(a0),math.sin(d0)])
e=np.array([-math.sin(a0),math.cos(a0),0.]);n=np.array([-math.sin(d0)*math.cos(a0),-math.sin(d0)*math.sin(a0),math.cos(d0)])
coordinate_errors=[]
for row in receipt['coordinates']:
    x,y=row['sourceXYFitsOrigin0'];dx,dy=x+1-g['crpix'][0],y+1-g['crpix'][1]
    u,v=math.radians(g['cdelt'][0]*dx),math.radians(g['cdelt'][1]*dy)
    tangent=np.array([math.cos(theta)*u-math.sin(theta)*v,math.sin(theta)*u+math.cos(theta)*v])
    ray=f+e*tangent[0]+n*tangent[1];ray/=np.linalg.norm(ray)
    world=[math.degrees(math.atan2(ray[1],ray[0]))%360,math.degrees(math.asin(ray[2]))]
    error=max(abs(p-q) for p,q in zip(world,row['newOwnerWorld']));assert error<1e-11;coordinate_errors.append(error)
end=[bind(ROOT/row['path']) for row in all_bound];assert current==end
save('result.json',{'status':'INDEPENDENT_BOUNDED_OFFLINE_REVIEW_PASS','bindings':len(all_bound),'beforeAfterAndCurrentExact':True,
 'sourceMath':{'decodedRgbBytes':rgb.size,'actualRgbHash':receipt['decodedRgb']['sha256'],'all9RgbValuesAndMasksByteExact':True,
 'independent3dTanMaxDegreeDifference':max(coordinate_errors),'only110ByteVerifiedNoteRemovalExact':True},
 'receipts':[bind(p) for p in receipt_paths],
 'limits':['Independent cached JPEG decode and native-coordinate math, not another full owner run or matrix.',
 'Nominal publisher AVM including approximate astrometric warning retained; not star registration/colour/PSF/science-mask approval.',
 'No old 2048 master/LOD regeneration or runtime/default/GPU adoption. Historical failures remain separate.']})
print(json.dumps({'result':bind(OUT/'result.json'),'bindings':len(all_bound),'maxDegreeDifference':max(coordinate_errors)}))
