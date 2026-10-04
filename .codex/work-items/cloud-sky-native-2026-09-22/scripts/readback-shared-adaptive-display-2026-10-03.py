"""Read saved full estimates and derive actual numeric LOD without filtering."""
from pathlib import Path
import ast,ctypes,hashlib,json,sys
from ctypes import wintypes
ROOT=Path(__file__).resolve().parents[4]
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from PIL import Image,ImageDraw
from astropy.visualization import ManualInterval,LuptonAsinhStretch,make_lupton_rgb
SOURCE=ROOT/'output/shared-adaptive-display-1003-r1';OUT=SOURCE/'readback'
def bind(path):
    b=path.read_bytes();return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def stats(value):
    return {'count':int(value.size),'mean':float(value.mean()),'p50p95p99':np.percentile(value,[50,95,99]).tolist(),'maximum':float(value.max())}
def main():
    OUT.mkdir();rp=SOURCE/'result.json';cp=SOURCE/'candidate/candidate.json'
    result=json.loads(rp.read_bytes());candidate=json.loads(cp.read_bytes());assert bind(cp)==result['candidate']
    op=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json'
    assert bind(op)['sha256']=='73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52'
    original=json.loads(op.read_bytes());paths={Path(__file__),rp,cp,op}
    def load(meta,base):
        path=base/meta['file'];assert bind(path)['sha256']==meta['sha256'];paths.add(path)
        return np.load(path,mmap_mode='r',allow_pickle=False)
    raw={b:load(original['arrays'][b+'-science'],op.parent) for b in 'gri'}
    display={b:load(candidate['arrays'][b],SOURCE/'candidate') for b in 'gri'}
    joint=load(original['arrays']['joint-availability'],op.parent)
    maps={k:load(candidate['arrays'][k],SOURCE/'candidate') for k in ('qualified','radius','reached','protected')}
    radius=maps['radius'];qualified=maps['qualified'];protected=maps['protected'];reached=maps['reached']
    assert np.isin(radius,[-1,0,1,2,4,8]).all()
    assert np.array_equal(protected,radius==0)
    assert not (qualified&~joint).any() and not ((radius>=0)&~qualified).any() and not (reached&(radius<=0)).any()
    assert (radius[:8]==-1).all() and (radius[-8:]==-1).all() and (radius[:,:8]==-1).all() and (radius[:,-8:]==-1).all()
    facts={};changed=np.zeros(joint.shape,bool)
    for b in 'gri':
        np.testing.assert_array_equal(display[b][radius<=0],raw[b][radius<=0])
        assert np.isfinite(display[b][joint]).all()
        changed|=~((display[b]==raw[b])|(np.isnan(display[b])&np.isnan(raw[b])))
        facts[b]={'fallbackExact':True,'absoluteDisplayDelta':stats(np.abs(display[b][joint].astype(float)-raw[b][joint]))}
    assert int(changed.sum())==candidate['changedEstimatePixels']
    recipe=candidate['sourceResolvedRecipe']
    def rgb(bands):
        return make_lupton_rgb(bands['i'],bands['r'],bands['g'],interval=ManualInterval(vmin=0,vmax=None),
          stretch_object=LuptonAsinhStretch(stretch=recipe['stretch'],Q=recipe['Q']),output_dtype=np.uint8)
    reference_path=ROOT/'output/sdss-m51-shared-transfer-1002/global-zscale-q8/rgb-master.npy'
    assert bind(reference_path)['sha256']=='3073421521ca303701a5a5c5090753f6e43a00034d022838080dad66d791d4b6';paths.add(reference_path)
    reference=np.load(reference_path,mmap_mode='r',allow_pickle=False);current_rgb=rgb(display)
    sheet=Image.new('RGB',(1536,3*540),'#181818');draw=ImageDraw.Draw(sheet);levels={}
    old_candidate_path=ROOT/'output/shared-noise-display-1003-r1/candidate/candidate.json'
    paths.add(old_candidate_path);old_candidate=json.loads(old_candidate_path.read_bytes())
    for at,(level,meta) in enumerate(candidate['levels'].items()):
        x0,y0,x1,y1=meta['crop']['boundsXYExclusive'];factor=meta['crop']['boxFactor'];crop=(slice(y0,y1),slice(x0,x1));out=meta['pixels']
        validity=joint[crop].reshape(out,factor,out,factor);counts=validity.sum(axis=(1,3));means={}
        for b in 'gri':
            values=display[b][crop].reshape(out,factor,out,factor)
            total=np.where(validity,values.astype(np.float64),0).sum(axis=(1,3))
            means[b]=np.divide(total,counts,out=np.zeros_like(total),where=counts>0).astype(np.float32)
        alpha=np.rint(counts.astype(float)*255/(factor*factor)).astype(np.uint8)
        expected=np.dstack([rgb(means),alpha]);path=SOURCE/'candidate'/meta['file'];paths.add(path)
        assert bind(path)['sha256']==meta['sha256'];actual=np.asarray(Image.open(path));np.testing.assert_array_equal(actual,expected)
        old_item=result['originalMeanProducts'][level];original_path=ROOT/old_item['path'];assert bind(original_path)==old_item;paths.add(original_path)
        old=np.asarray(Image.open(original_path));np.testing.assert_array_equal(actual[:,:,3],old[:,:,3])
        fixed_meta=old_candidate['levels'][level];fixed_path=old_candidate_path.parent/fixed_meta['file'];assert bind(fixed_path)['sha256']==fixed_meta['sha256'];paths.add(fixed_path)
        fixed=np.asarray(Image.open(fixed_path));np.testing.assert_array_equal(fixed[:,:,3],old[:,:,3])
        for column,(label,image) in enumerate((('original',old),('fixed',fixed),('adaptive',actual))):
            draw.text((column*512+4,at*540+4),f'{level} / {label}',fill='white');sheet.paste(Image.fromarray(image[:,:,:3]),(column*512,at*540+24))
        levels[level]={'savedNumericMeanThenFrozenRGBExact':True,'alphaExact':True,'current':bind(path),'original':old_item,
          'changedRgbPixels':int(np.any(actual[:,:,:3]!=old[:,:,:3],axis=2).sum()),'absoluteRgbDelta':stats(np.abs(actual[:,:,:3].astype(np.int16)-old[:,:,:3].astype(np.int16)))}
    sheet.save(OUT/'actual-full-lod-comparison.png')
    weights=np.stack([load(d['normalized-weight'],op.parent) for d in original['mosaic']['diagnostics'].values()]);dominant=weights.argmax(axis=0)
    transition=np.zeros(joint.shape,bool);transition[1:]|=dominant[1:]!=dominant[:-1];transition[:,1:]|=dominant[:,1:]!=dominant[:,:-1]
    edge=np.zeros(joint.shape,bool);edge[1:]|=qualified[1:]!=qualified[:-1];edge[:,1:]|=qualified[:,1:]!=qualified[:,:-1]
    delta=np.abs(current_rgb.astype(np.int16)-reference.astype(np.int16)).max(axis=2)
    interior=np.zeros(joint.shape,bool);interior[64:-64,64:-64]=True
    patches=[('arm',[1056,960,1184,1088]),('diffuse-arm',[1100,1140,1228,1268]),('flagged-foreground',[1376,1360,1504,1488])]
    for name,mask in (('field-transition',transition),('qualification-edge',edge)):
        selected=mask&interior;assert selected.any();y,x=np.unravel_index(np.where(selected,delta,-1).argmax(),delta.shape)
        patches.append((name,[int(x-64),int(y-64),int(x+64),int(y+64)]))
    pairs=Image.new('RGB',(512,len(patches)*282),'#181818');draw=ImageDraw.Draw(pairs);patch_facts=[]
    for at,(name,bounds) in enumerate(patches):
        x0,y0,x1,y1=bounds;crop=(slice(y0,y1),slice(x0,x1));draw.text((4,at*282+4),f'{name} {bounds}: original / adaptive',fill='white')
        for column,image in enumerate((reference,current_rgb)):
            pairs.paste(Image.fromarray(image[crop]).resize((256,256),Image.Resampling.NEAREST),(column*256,at*282+24))
        patch_facts.append({'name':name,'boundsXYExclusive':bounds,'qualified':int(qualified[crop].sum()),'protected':int(protected[crop].sum()),'changedRgbPixels':int(np.any(current_rgb[crop]!=reference[crop],axis=2).sum())})
    pairs.save(OUT/'actual-boundary-and-structure-pairs.png')
    joins=[]
    for offset in (-1,0,1):
        rows=np.arange(40,2040,32)+offset
        joins.append({'offset':offset,'originalGradient':stats(np.abs(reference[rows].astype(float)-reference[rows-1].astype(float))),
          'adaptiveGradient':stats(np.abs(current_rgb[rows].astype(float)-current_rgb[rows-1].astype(float)))})
    files=[bind(p) for p in sorted((SOURCE/'candidate').iterdir()) if p.is_file()]
    # Reuse exercised Windows metadata functions without its old export scan.
    allocation_owner=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/scripts/inspect-static-file-allocation-2026-10-03.py'
    paths.add(allocation_owner);nodes=[]
    for node in ast.parse(allocation_owner.read_text(encoding='utf-8')).body:
        if isinstance(node,(ast.ClassDef,ast.FunctionDef)) and node.name in ('StandardInfo','FileIdInfo','info'):nodes.append(node)
        elif isinstance(node,ast.Assign):
            target=node.targets[0]
            if (isinstance(target,ast.Name) and target.id=='kernel') or (isinstance(target,ast.Attribute) and ast.unparse(target).startswith('kernel.')):nodes.append(node)
    namespace={'ctypes':ctypes,'wintypes':wintypes}
    exec(compile(ast.Module(body=nodes,type_ignores=[]),str(allocation_owner),'exec'),namespace);info=namespace['info']
    allocation=[{'path':f['path'],**info(ROOT/f['path'])} for f in files]
    assert allocation==[{'path':f['path'],**info(ROOT/f['path'])} for f in files]
    unique={}
    for f,row in zip(files,allocation):
        assert f['bytes']==row['bytes'];unique.setdefault(row['identity'],row)
    result={'status':'PASSED_SAVED_ADAPTIVE_NUMERIC_LOD_READBACK','inputs':[bind(p) for p in sorted(paths)],'bands':facts,'levels':levels,
      'sampleCounts':{'scienceAvailable':int(joint.sum()),'qualified':int(qualified.sum()),'protected':int(protected.sum()),'reached':int(reached.sum()),'changedEstimates':int(changed.sum()),'changedRgb':int(np.any(current_rgb!=reference,axis=2).sum())},
      'joinDescriptions':joins,'joinMeaning':'Descriptive adjacent rows, not seam/registration/structure acceptance.',
      'patches':patch_facts,'actualPairs':bind(OUT/'actual-boundary-and-structure-pairs.png'),'actualLevels':bind(OUT/'actual-full-lod-comparison.png'),
      'candidateDisk':{'logicalBytes':sum(f['bytes'] for f in files),'files':files,'allocationReadback':allocation,
        'uniqueFileIdentities':len(unique),'reportedAllocationBytesByUniqueFileIdentity':sum(v['reportedAllocationBytes'] for v in unique.values()),
        'meaning':'New Windows candidate only, API-reported AllocationSize excludes filesystem metadata/shared internals; no all-retained or Linux/cloud retention/capacity claim.'},
      'adaptiveFilterRuns':0,'statisticalFitCalls':0,'sourceRequests':0,'independentReview':'MISSING','qualityAcceptance':'UNVERIFIED','adopted':False}
    (OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    with (OUT/'result.json').open('x',encoding='utf-8') as f:json.dump(result,f,indent=2);f.write('\n')
    print(json.dumps({'receipt':bind(OUT/'result.json'),'counts':result['sampleCounts'],'candidateLogicalBytes':result['candidateDisk']['logicalBytes']}))
if __name__=='__main__':main()
