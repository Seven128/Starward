"""Saved-output readback and balanced-noise controls, not independent review."""
from pathlib import Path
import hashlib
import json
import sys
ROOT=Path(__file__).resolve().parents[4]
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image,ImageDraw
from astropy.visualization import ManualInterval,LuptonAsinhStretch,make_lupton_rgb
import sdss_gri_tan as owner
SOURCE=ROOT/'output/signed-science-lod-1003-r1'
OUT=ROOT/(sys.argv[1] if len(sys.argv)>1 else 'output/signed-science-lod-readback-1003-r1')
assert OUT.resolve().parent==ROOT/'output' and OUT.name.startswith('signed-science-lod-readback-')
def bind(p):
    data=p.read_bytes()
    return {'path':str(p.relative_to(ROOT)),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
result_path=SOURCE/'result.json';assert bind(result_path)['sha256']=='178dc73b819ea1600eabbc6532c403fade534a0f2f8c148363de115e3e57d293'
result=json.loads(result_path.read_bytes());arrays={};inputs=[result_path,Path(__file__),Path(owner.__file__)]
for row in result['records']:
    arrays[row['level']]={}
    for band,meta in row['bands'].items():
        artifact=meta['signedMeanArray'];p=ROOT/artifact['path'];assert bind(p)['sha256']==artifact['sha256']
        a=np.load(p,allow_pickle=False);assert a.shape==(512,512) and a.dtype==np.float64
        arrays[row['level']][band]=a;inputs.append(p)
    for key in ('png','comparison'):
        p=ROOT/row[key]['path'];assert bind(p)==row[key];inputs.append(p)
previous=ROOT/'output/sdss-m51-global-transfer-1002/docs-05-q10/overview.png'
assert bind(previous)['sha256']=='ee60f3c6bf98a3d0971069e736c8c4678738984a100723be8dcc7287177b5495'
inputs.append(previous)
before=[bind(p) for p in inputs]
cross_level=[]
for band in owner.BANDS:
    ov,med,detail=[arrays[level][band] for level in ('OVERVIEW','MEDIUM','DETAIL')]
    checks=[np.max(np.abs(ov[128:384,128:384]-med.reshape(256,2,256,2).mean(axis=(1,3)))),
            np.max(np.abs(med[128:384,128:384]-detail.reshape(256,2,256,2).mean(axis=(1,3))))]
    assert max(checks)<1e-12
    cross_level.append({'band':band,'commonCropMeanMaxErrors':list(map(float,checks))})
def display(data):
    return make_lupton_rgb(data,data,data,interval=ManualInterval(vmin=0,vmax=None),
        stretch_object=LuptonAsinhStretch(stretch=.5,Q=10),output_dtype=np.uint8)
noise=np.tile(np.array([[-.03,.03],[.03,-.03]],dtype=np.float32),(2,2))
controls=[]
for baseline in (0.,.02):
    raw=noise+np.float32(baseline)
    signed_mean=raw.mean(dtype=np.float64)
    new=display(np.array([[signed_mean]],dtype=np.float32))[0,0]
    expected=display(np.array([[baseline]],dtype=np.float32))[0,0]
    old=owner.premultiplied_box(display(raw),np.ones(raw.shape,dtype=np.bool_),4)[0,0,:3]
    assert abs(signed_mean-baseline)<1e-8 and np.array_equal(new,expected)
    if baseline==0:assert new.max()==0 and old.max()>0
    else:assert new.min()>0
    controls.append({'baseline':baseline,'negativeValidSamples':int((raw<0).sum()),
        'meanBeforeDisplay':float(signed_mean),'rgbBeforeScientificMean':old.tolist(),
        'rgbAfterScientificMean':new.tolist(),'scienceAvailability':'all16 samples available; valid black remains available',
        'meaning':'Synthetic balanced-noise control only, no generated celestial image or real-sky noise model.'})
OUT.mkdir()
old=np.array(Image.open(previous).convert('RGBA'))[:,:,:3]
new=np.array(Image.open(SOURCE/'overview-signed-first.png').convert('RGBA'))[:,:,:3]
sheet=Image.new('RGB',(1280,1344));draw=ImageDraw.Draw(sheet)
for row,bg in enumerate(([0,0,0],[3,7,16])):
    for column,rgb in enumerate((old,new)):
        origin=(640*column,672*row+32)
        panel=Image.new('RGB',(640,640),tuple(bg))
        rgba=owner.encoded_contribution_rgba(rgb,np.ones(rgb.shape[:2],dtype=np.bool_))
        alpha=rgba[:,:,3:4].astype(np.float64)/255
        composite=np.rint(rgba[:,:,:3]*alpha+np.array(bg)*(1-alpha)).astype(np.uint8)
        panel.paste(Image.fromarray(composite),(64,64));sheet.paste(panel,origin)
        draw.text((origin[0]+4,origin[1]-24),f'{"OLD RGB box" if column==0 else "SIGNED science box"}; bg={bg}; 64px margin',fill='white')
sheet.save(OUT/'overview-boundary-comparison.png')
assert before==[bind(p) for p in inputs]
readback={'status':'SELF_READBACK_NOT_INDEPENDENT_OR_NATIVE_ACCEPTANCE','crossLevelScience':cross_level,
    'balancedNoiseControls':controls,'savedPngAndMeanArrayIdentities':before,
    'boundaryComparison':bind(OUT/'overview-boundary-comparison.png'),
    'meaning':'Saved scientific means conserve signed samples and match common crops; fixed transfer used without re-fit. Constant-background encoded contribution presentation only; not geometry/PSF/source-quality or actual native Scene/DAU proof.'}
(OUT/'result.json').write_text(json.dumps(readback,indent=2)+'\n')
print(json.dumps({'result':bind(OUT/'result.json'),'controls':controls,'crossLevelScience':cross_level}))
