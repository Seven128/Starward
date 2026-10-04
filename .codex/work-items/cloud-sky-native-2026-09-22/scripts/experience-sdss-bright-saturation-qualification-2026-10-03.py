"""Full-master Lupton bright-SAT qualification, saved inputs only."""
import json,math,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True;sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image,ImageDraw
from image_quality import digest,write_report
from sdss_gri_tan import BANDS,ProjectedBand,FixedDisplayTransfer,make_rgb_display
from astropy.visualization import LuptonAsinhStretch
out=ROOT/'output/sdss-bright-saturation-qualification-1003-r2';out.mkdir(exist_ok=False);(out/'executed-script.py').write_bytes(Path(__file__).read_bytes());paths=[Path(__file__)]

def bind(p):
    raw=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':digest(raw)}
def doc(relative,pin):
    p=ROOT/relative;assert bind(p)['sha256']==pin;paths.append(p);return json.loads(p.read_bytes()),p.parent
def arr(m,base):
    p=base/m['file'] if 'file' in m else ROOT/m['path'];assert bind(p)['sha256']==m['sha256'];paths.append(p);return np.load(p,mmap_mode='r',allow_pickle=False)
c,base=doc('output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json','73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52')
q,_=doc('output/sdss-m51-mosaic-quality-diagnosis-1002-r3/result.json','9322203537531e0cba3fbf9addcd3ea6e19fd75fdfeb2dc57637bd2d42bee4d0')
n,nb=doc('output/shared-noise-display-1003-r1/candidate/candidate.json','0dc8f1d5a6a82e1cfa50709832123a3e3982b76e3b73b4bc3d228f600fcd65c5')
r,rb=doc('output/shared-flag-display-recovery-1003-r2/candidate/candidate.json','46d4ac28173962d52d09c575f0559959644292fdd9582e80c5a73962f5ce0d76')
g,_=doc('output/shared-flag-display-recovery-1003-r2/guard-closeout/result.json','c8c9b7d5694599c90706ff533db89dd6f1df68fddcdbb9a8599fc7e115d98ef7')
assert len(g['actual18ProcessingIdentitiesKnownAndExact'])==18
for f in q['fields']:
    for b in BANDS:
        raw=f['bands'][b]['maskSource'];p=ROOT/raw['path'];assert bind(p)['sha256']==raw['sha256'];paths.append(p)
for row in json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes()):
    p=ROOT/row['path'];assert bind(p)['sha256']==row['sha256'];paths.append(p)
joint=arr(c['arrays']['joint-availability'],base);science={b:arr(c['arrays'][b+'-science'],base) for b in BANDS}
flags={b:arr(q['projectedFlagArrays'][b],ROOT) for b in BANDS};processable=arr(n['arrays']['processable'],nb)
alternative=arr(r['arrays']['alternative-supply'],rb);display={b:arr(r['arrays'][b],rb) for b in BANDS}
before=[bind(p) for p in paths];write_report(out/'inputs-before.json',before)
recipe=r['sourceResolvedRecipe'];limit=recipe['stretch']/recipe['Q']*math.sinh(math.asinh(.1*recipe['Q'])/.1)
stretch=LuptonAsinhStretch(stretch=recipe['stretch'],Q=recipe['Q']);assert abs(float(stretch(np.array([limit]),clip=False)[0])-1)<1e-12
intensity=sum(science[b].astype(float) for b in BANDS)/3;sat=np.logical_or.reduce([(v&2)!=0 for v in flags.values()]);bright=sat&joint&(intensity>limit)&~alternative
remaining={tuple(map(int,v)) for v in np.argwhere(sat&joint&~alternative)};components=[];tiles=[]
while remaining:
    start=min(remaining);stack=[start];remaining.remove(start);comp=set()
    while stack:
        y,x=stack.pop();comp.add((y,x))
        for dy in (-1,0,1):
            for dx in (-1,0,1):
                z=(y+dy,x+dx)
                if z in remaining:remaining.remove(z);stack.append(z)
    replace={z for z in comp if bright[z]}
    if not replace:continue
    ring={(y+dy,x+dx) for y,x in comp for dy in (-1,0,1) for dx in (-1,0,1)}-comp
    in_bounds={z for z in ring if 0<=z[0]<joint.shape[0] and 0<=z[1]<joint.shape[1]};qualified={z for z in in_bounds if joint[z] and processable[z]}
    qualified_full=(in_bounds==ring and qualified==ring)
    box=[min(x for y,x in comp),min(y for y,x in comp),max(x for y,x in comp)+1,max(y for y,x in comp)+1]
    record={'pixels':len(replace),'wholeSatRegionPixels':len(comp),'boundsXYExclusive':box,'touchingRingPixels':len(ring),'qualifiedRingPixels':len(qualified),
        'originalIntensityRange':[float(min(intensity[z] for z in comp)),float(max(intensity[z] for z in comp))],
        'fullRingQualification':qualified_full,'ringFlaggedByBand':{b:int(sum(bool(flags[b][z]&771) for z in in_bounds)) for b in BANDS},
        'ringSaturatedByBand':{b:int(sum(bool(flags[b][z]&2) for z in in_bounds)) for b in BANDS},
        'ringPositionsXY':[[x,y] for y,x in sorted(ring)],'corePositionsXY':[[x,y] for y,x in sorted(replace)],'wholeSatPositionsXY':[[x,y] for y,x in sorted(comp)],
        'meaning':'Connected8 actual SAT region, touching its unmasked outer boundary; replace only I>upper subset, leave low-brightness bleed untouched. Not star identity/PSF/flux repair.'}
    components.append(record)
    cx=(box[0]+box[2])//2;cy=(box[1]+box[3])//2;x0=max(0,min(1984,cx-32));y0=max(0,min(1984,cy-32));crop=(slice(y0,y0+64),slice(x0,x0+64));bands={b:ProjectedBand(display[b][crop],joint[crop],joint[crop],{}) for b in BANDS}
    rgb,_=make_rgb_display(bands,joint[crop],transfer=FixedDisplayTransfer(recipe['stretch'],recipe['Q']));img=Image.fromarray(rgb).resize((256,256),Image.Resampling.NEAREST);marked=img.copy();draw=ImageDraw.Draw(marked)
    for y,x in replace:draw.rectangle(((x-x0)*4,(y-y0)*4,(x-x0)*4+3,(y-y0)*4+3),outline=(255,255,255))
    tiles.append((img,marked,(x0,y0)))
if tiles:
    sheet=Image.new('RGB',(512,len(tiles)*284),(20,20,20));draw=ImageDraw.Draw(sheet)
    for at,(img,marked,origin) in enumerate(tiles):
        draw.text((4,at*284+4),f'{origin} actual saved RGB / bright SAT qualification overlay',fill='white');sheet.paste(img,(0,at*284+24));sheet.paste(marked,(256,at*284+24))
    sheet.save(out/'actual-bright-sat-regions.png')
after=[bind(ROOT/r['path']) for r in before];write_report(out/'inputs-after.json',after);assert before==after
result={'scope':__doc__,'paper':'https://arxiv.org/html/astro-ph/0312483','recipe':recipe,'actualLuptonIntensityUpper':limit,'libraryAtUpperExact':True,
    'realSatJointPixels':int((sat&joint).sum()),'realSatAboveUpperPixels':int((sat&joint&(intensity>limit)).sum()),'notRecoveredRealSatAboveUpperPixels':int(bright.sum()),
    'components':components,'fullRingQualifiedComponents':sum(c['fullRingQualification'] for c in components),
    'actualComparison':bind(out/'actual-bright-sat-regions.png') if tiles else None,'originalSourceAndProtectedExact':True,
    'fitRuns':0,'filterRuns':0,'sourceRequests':0,'quality':'UNVERIFIED','adopted':False,'independentReview':'MISSING'}
write_report(out/'result.json',result);print(json.dumps({k:v for k,v in result.items() if k not in ('recipe','components')}));print(json.dumps([{k:v for k,v in c.items() if k not in ('ringPositionsXY','corePositionsXY','wholeSatPositionsXY')} for c in components]))
