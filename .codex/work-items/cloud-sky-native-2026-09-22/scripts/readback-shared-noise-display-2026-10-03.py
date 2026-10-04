"""Inspect saved whole-master estimates/LOD; no filtering, fitting or acquisition."""
import hashlib
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[4]
sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image,ImageDraw
from sdss_gri_tan import BANDS,ProjectedBand,FixedDisplayTransfer,make_rgb_display


def bound(path):
    data=path.read_bytes()
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}


def summary(values):
    return {'count':int(values.size),'mean':float(values.mean()),
        'p50p95p99':np.percentile(values,[50,95,99]).tolist(),'maximum':float(values.max())}


def main():
    source=ROOT/'output/shared-noise-display-1003-r1'
    out=source/'readback';out.mkdir(exist_ok=False)
    cp=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json'
    assert bound(cp)['sha256']=='73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52'
    result=json.loads((source/'result.json').read_bytes());candidate=json.loads((source/'candidate/candidate.json').read_bytes())
    assert bound(source/'candidate/candidate.json')==result['candidate']
    original=json.loads(cp.read_bytes());joint=np.load(cp.parent/original['arrays']['joint-availability']['file'],allow_pickle=False)
    def load(meta,base):
        path=base/meta['file'];assert bound(path)['sha256']==meta['sha256']
        return np.load(path,mmap_mode='r',allow_pickle=False)
    processable=load(candidate['arrays']['processable'],source/'candidate')
    raw={b:load(original['arrays'][b+'-science'],cp.parent) for b in BANDS}
    display={b:load(candidate['arrays'][b],source/'candidate') for b in BANDS}
    bands={};changed=np.zeros(joint.shape,dtype=bool);facts={}
    for b in BANDS:
        assert np.array_equal(display[b][~processable],raw[b][~processable],equal_nan=True)
        assert np.isfinite(display[b][joint]).all()
        changed|=display[b]!=raw[b]
        facts[b]={'originalKeptExact':True,'absoluteEstimateDelta':summary(np.abs(display[b][joint].astype(float)-raw[b][joint]))}
        bands[b]=ProjectedBand(display[b],joint,joint,{})
    recipe=candidate['sourceResolvedRecipe']
    rgb,_=make_rgb_display(bands,joint,transfer=FixedDisplayTransfer(stretch=recipe['stretch'],Q=recipe['Q']))
    reference=np.load(ROOT/'output/sdss-m51-shared-transfer-1002/global-zscale-q8/rgb-master.npy',mmap_mode='r',allow_pickle=False)
    # This RGB readback uses the already resolved transfer, never a new fit.
    rgb_delta=np.abs(rgb.astype(np.int16)-reference.astype(np.int16))
    lod={}
    for level,meta in candidate['levels'].items():
        path=source/'candidate'/meta['file'];assert bound(path)['sha256']==meta['sha256']
        current=np.asarray(Image.open(path));old=np.asarray(Image.open(source/(level.lower()+'-original.png')))
        assert np.array_equal(current[:,:,3],old[:,:,3])
        lod[level]={'alphaExact':True,'changedRgbPixels':int(np.any(current[:,:,:3]!=old[:,:,:3],axis=2).sum()),
            'absoluteRgbDelta':summary(np.abs(current[:,:,:3].astype(np.int16)-old[:,:,:3].astype(np.int16))),
            'current':bound(path),'original':bound(source/(level.lower()+'-original.png'))}
    # Descriptive rows at the actual chunk joins and adjoining rows. Natural
    # source structure differs by row, so these are not a seam acceptance test.
    rows=np.arange(34,2046,32)
    joins=[]
    for offset in (-1,0,1):
        at=rows+offset
        before=np.abs(reference[at].astype(float)-reference[at-1].astype(float))
        after=np.abs(rgb[at].astype(float)-rgb[at-1].astype(float))
        joins.append({'joinRowOffset':offset,'originalAbsRgbGradient':summary(before),
            'candidateAbsRgbGradient':summary(after)})
    # Real patches from the established arm/weak-arm/flagged-source diagnosis,
    # plus one dominant-field transition and one actual qualification edge.
    weights=np.stack([load(d['normalized-weight'],cp.parent) for d in original['mosaic']['diagnostics'].values()])
    dominant=weights.argmax(axis=0);transition=np.zeros(joint.shape,dtype=bool)
    transition[1:]|=dominant[1:]!=dominant[:-1];transition[:,1:]|=dominant[:,1:]!=dominant[:,:-1]
    edge=np.zeros(joint.shape,dtype=bool)
    edge[1:]|=processable[1:]!=processable[:-1];edge[:,1:]|=processable[:,1:]!=processable[:,:-1]
    score=rgb_delta.max(axis=2).astype(float)
    interior=np.zeros(joint.shape,dtype=bool);interior[64:-64,64:-64]=True
    patches=[('arm',[1056,960,1184,1088]),('diffuse-arm',[1100,1140,1228,1268]),
        ('flagged-foreground',[1376,1360,1504,1488])]
    for name,mask in (('field-transition',transition),('qualification-edge',edge)):
        selected=mask&interior
        assert selected.any()
        y,x=np.unravel_index(np.where(selected,score,-1).argmax(),score.shape)
        patches.append((name,[int(x-64),int(y-64),int(x+64),int(y+64)]))
    sheet=Image.new('RGB',(512,5*282),(22,22,22));draw=ImageDraw.Draw(sheet);patch_facts=[]
    for at,(name,bounds) in enumerate(patches):
        x0,y0,x1,y1=bounds;crop=(slice(y0,y1),slice(x0,x1));top=at*282
        draw.text((4,top+3),f'{name} {bounds}: original / candidate',fill='white')
        for col,image in enumerate((reference,rgb)):
            tile=Image.fromarray(image[crop]).resize((256,256),Image.Resampling.NEAREST)
            sheet.paste(tile,(col*256,top+24))
        patch_facts.append({'name':name,'boundsXYExclusive':bounds,'processable':int(processable[crop].sum()),
            'changedRgbPixels':int(np.any(rgb[crop]!=reference[crop],axis=2).sum())})
    sheet.save(out/'actual-boundary-and-structure-pairs.png')
    # Categorize new actual files only; logical bytes are not allocation or a
    # deployment-retention decision, and caller inputs are not copied here.
    candidate_files=[bound(p) for p in sorted((source/'candidate').iterdir()) if p.is_file()]
    data={'scope':__doc__,'inputResult':bound(source/'result.json'),'candidate':result['candidate'],
        'sampleCounts':{'scienceAvailable':int(joint.sum()),'processable':int(processable.sum()),
            'originalKept':int((~processable).sum()),'changedEstimatePixels':int(changed.sum()),
            'changedRgbPixels':int(np.any(rgb!=reference,axis=2).sum())},'bands':facts,'levels':lod,
        'chunkJoinDescriptions':joins,'joinMeaning':'Descriptive neighboring rows only, not full source-registration/seam or physical structure acceptance.',
        'patches':patch_facts,'actualPairs':bound(out/'actual-boundary-and-structure-pairs.png'),
        'candidateDisk':{'logicalBytes':sum(f['bytes'] for f in candidate_files),'files':candidate_files,
            'meaning':'Explicit local estimate arrays, processability, three PNG and candidate receipt only; excludes retained acquisition/master/baselines/diagnostics, physical allocation and production rollback copies.'},
        'filterRuns':0,'statisticalFitCalls':0,'scienceRequests':0,
        'qualityAcceptance':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    (out/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    (out/'result.json').write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'result':bound(out/'result.json'),'counts':data['sampleCounts'],'candidateLogicalBytes':data['candidateDisk']['logicalBytes'],'levels':{l:v['changedRgbPixels'] for l,v in lod.items()}}))


if __name__=='__main__':main()
