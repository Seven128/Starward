"""One known-flag alternative-observation display trial; no inferred pixels.

Where one actual scan has known INTERP/SATUR/GHOST/CR and the other supplies
coherent unflagged gri at positive original weights, use the latter scan's raw
weighted mean as a display alternative. Same-run copies cannot supply recovery.
No new scientific measurement, temporal/PSF confidence or ordinary adoption.
"""
import argparse
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image,ImageDraw
from image_quality import digest,write_report
from sdss_gri_tan import BANDS,coherent_box_means,ProjectedBand,FixedDisplayTransfer,make_rgb_display


def bind(path):
    raw=path.read_bytes();return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':digest(raw)}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',default='sdss-flag-alternative-1003-r1');args=parser.parse_args()
    assert Path(args.output).name==args.output and args.output.startswith('sdss-flag-alternative-1003-r')
    out=ROOT/'output'/args.output;out.mkdir(exist_ok=False);paths=[Path(__file__),ROOT/'data-pipelines/deep-sky/sdss_gri_tan.py']
    def doc(relative,pin):
        f=ROOT/relative;assert bind(f)['sha256']==pin;paths.append(f);return json.loads(f.read_bytes()),f
    c,cp=doc('output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json','73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52')
    n,npth=doc('output/shared-noise-display-1003-r1/candidate/candidate.json','0dc8f1d5a6a82e1cfa50709832123a3e3982b76e3b73b4bc3d228f600fcd65c5')
    q,_=doc('output/sdss-m51-mosaic-quality-diagnosis-1002-r3/result.json','9322203537531e0cba3fbf9addcd3ea6e19fd75fdfeb2dc57637bd2d42bee4d0')
    p,_=doc('output/noise-display-provenance-1003-r2/processing-provenance.json','685021971466e559024d6bd70c5a810603851ab626a54fd5429b99a60473c597')
    cross,_=doc('output/sdss-cross-run-structure-1003-r1/result.json','5ec55ef0e46956c31e4e07a4375ccfb2e9ae086129e385e4e53d14b5d7cb80a9')
    def arr(meta,base):
        f=base/meta['file'] if 'file' in meta else ROOT/meta['path'];assert bind(f)['sha256']==meta['sha256'];paths.append(f)
        return np.load(f,mmap_mode='r',allow_pickle=False)
    raw={b:arr(c['arrays'][b+'-science'],cp.parent) for b in BANDS}
    old={b:arr(n['arrays'][b],npth.parent) for b in BANDS};joint=arr(c['arrays']['joint-availability'],cp.parent)
    processable=arr(n['arrays']['processable'],npth.parent)
    weights={name:arr(d['normalized-weight'],cp.parent) for name,d in c['mosaic']['diagnostics'].items()}
    fields={name:{b:arr(d[b+'-science'],cp.parent) for b in BANDS} for name,d in c['mosaic']['diagnostics'].items()}
    flags={f['fieldKey']:{b:arr(f['bands'][b]['projectedFlags'],ROOT) for b in BANDS} for f in q['fields']}
    assert set(fields)==set(flags)=={f['fieldKey'] for f in p['fields']}
    for f in p['fields']:
        for b,v in f['bands'].items():
            r=v['frameAdmissionReceipt'];source=Path(r['source']['path']);assert bind(source)['sha256']==r['source']['sha256'];paths.append(source)
            mask=v['flags']['admissionReceipt'];assert v['primaryHeaderProcessingId']==mask['actualPrimaryIdentity']['PS_ID']
            mask_source=Path(mask['source']['path']);assert bind(mask_source)['sha256']==mask['source']['sha256'];paths.append(mask_source)
            assert {key:v['flags']['planeNumbers'][key] for key in ('S_MASK_INTERP','S_MASK_SATUR','S_MASK_GHOST','S_MASK_CR')}=={
                'S_MASK_INTERP':0,'S_MASK_SATUR':1,'S_MASK_GHOST':8,'S_MASK_CR':9}
    dates={run:[o['bandMjd'][b] for o in cross['observations'] if int(o['fieldKey'].split('/')[1])==run for b in BANDS] for run in (3699,3716)}
    assert max(dates[3699])<min(dates[3716])
    for row in json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes()):
        f=ROOT/row['path'];assert bind(f)['sha256']==row['sha256'];paths.append(f)
    before=[bind(f) for f in paths];write_report(out/'inputs-before.json',before);(out/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    runs={}
    for run in (3699,3716):
        names=[name for name in fields if int(name.split('/')[1])==run];w=sum(weights[name].astype(float) for name in names)
        known_bad=np.zeros(joint.shape,dtype=bool)
        for name in names:
            known_bad|=(weights[name]>0)&np.logical_or.reduce([(flags[name][b]&771)!=0 for b in BANDS])
        runs[run]={'weight':w,'bad':known_bad,'clean':(w>0)&~known_bad,'names':names}
    selection={run:joint&~processable&runs[other]['bad']&runs[run]['clean'] for run,other in ((3699,3716),(3716,3699))}
    assert not (selection[3699]&selection[3716]).any()
    recovered=selection[3699]|selection[3716];assert not (recovered&processable).any()
    candidate={b:old[b].copy() for b in BANDS};records=[]
    for run in (3699,3716):
        chosen=selection[run];w=runs[run]['weight'];records.append({'usedRun':run,'excludedRun':3716 if run==3699 else 3699,'pixels':int(chosen.sum()),'actualBandMjdRange':[min(dates[run]),max(dates[run])]})
        for b in BANDS:
            # Compute only chosen samples; no unknown contributor is zero-filled
            # into a measurement, and no all-masked observation is synthesized.
            numerator=sum(np.where(weights[name][chosen]>0,fields[name][b][chosen],0).astype(float)*weights[name][chosen] for name in runs[run]['names'])
            candidate[b][chosen]=(numerator/w[chosen]).astype(np.float32)
            assert np.isfinite(candidate[b][chosen]).all()
            assert np.array_equal(candidate[b][~recovered],old[b][~recovered],equal_nan=True)
    saved={}
    for b in BANDS:
        f=out/(b+'-display-alternative.npy');np.save(f,candidate[b],allow_pickle=False);saved[b]=bind(f)
    np.save(out/'alternative-supply.npy',recovered,allow_pickle=False)
    recipe=n['sourceResolvedRecipe'];transfer=FixedDisplayTransfer(recipe['stretch'],recipe['Q']);levels={}
    for level,meta in n['levels'].items():
        x0,y0,x1,y1=meta['crop']['boundsXYExclusive'];crop=(slice(y0,y1),slice(x0,x1));factor=meta['crop']['boxFactor'];support=joint[crop]
        images=[]
        for values in (old,candidate):
            means,counts=coherent_box_means({b:values[b][crop] for b in BANDS},support,factor);available=counts>0
            rgb,_=make_rgb_display({b:ProjectedBand(means[b],available,available,{}) for b in BANDS},available,transfer=transfer)
            alpha=np.rint(counts.astype(float)*255/(factor*factor)).astype(np.uint8);images.append(np.dstack([rgb,alpha]))
        original=npth.parent/meta['file'];assert bind(original)['sha256']==meta['sha256'];paths.append(original)
        assert np.array_equal(images[0],np.asarray(Image.open(original)))
        assert np.array_equal(images[0][:,:,3],images[1][:,:,3])
        f=out/(level.lower()+'-alternative.png');Image.fromarray(images[1]).save(f)
        levels[level]={'image':bind(f),'baselineExact':True,'alphaExact':True,'changedRgbPixels':int(np.any(images[0][:,:,:3]!=images[1][:,:,:3],axis=2).sum())}
    # View largest actual estimated changes in occupied 512x512 target cells.
    score=np.maximum.reduce([np.abs(candidate[b].astype(float)-old[b]) for b in BANDS]);patches=[];tiles=[]
    for cy in range(4):
        for cx in range(4):
            selected=recovered[cy*512:(cy+1)*512,cx*512:(cx+1)*512]
            if not selected.any():continue
            local=np.where(selected,score[cy*512:(cy+1)*512,cx*512:(cx+1)*512],-1)
            y,x=np.unravel_index(local.argmax(),local.shape);y+=cy*512;x+=cx*512
            x0,y0=int(max(0,min(1984,x-32))),int(max(0,min(1984,y-32)));crop=(slice(y0,y0+64),slice(x0,x0+64));images=[]
            for values in (old,candidate):
                rgb,_=make_rgb_display({b:ProjectedBand(values[b][crop],joint[crop],joint[crop],{}) for b in BANDS},joint[crop],transfer=transfer)
                images.append(Image.fromarray(rgb).resize((256,256),Image.Resampling.NEAREST))
            tiles.append(images);patches.append({'boundsXYExclusive':[x0,y0,x0+64,y0+64],'recoveredPixels':int(recovered[crop].sum()),'maximumEstimateChange':float(score[crop].max())})
    if tiles:
        sheet=Image.new('RGB',(512,282*len(tiles)),(20,20,20));draw=ImageDraw.Draw(sheet)
        for at,images in enumerate(tiles):
            draw.text((4,at*282+4),str(patches[at]['boundsXYExclusive'])+' old / actual other-run alternative',fill='white')
            for col,img in enumerate(images):sheet.paste(img,(col*256,at*282+24))
        sheet.save(out/'actual-alternative-pairs.png')
    # Original level files were read after initial pin; bind these separately.
    after=[bind(ROOT/r['path']) for r in before];write_report(out/'inputs-after.json',after);assert before==after
    result={'scope':__doc__,'actualIndependentRunSupply':records,'alternativePixels':int(recovered.sum()),
        'unrecoveredOriginalKept':int(((~processable)&~recovered).sum()),'oldCandidateUnchanged':True,'inputBindingsExact':True,
        'unchangedOutsideAlternative':True,'arrays':saved,'supplyMask':bind(out/'alternative-supply.npy'),'levels':levels,'patches':patches,
        'comparison':bind(out/'actual-alternative-pairs.png') if tiles else None,
        'sourceScience':'Original science/joint/weights retained; alternate raw actual scan means are display estimates only.',
        'limitations':['No PSF matching/temporal or independent-systematics certification.',
            'Declared mask qualification does not prove actual artifact absence.',
            'No recovery where only same-run duplicate fields or all observations are flagged.',
            'Original brightness/negative/black meanings retained; no sky/gain change or generated detail.'],
        'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False,'filterRuns':0,'fitRuns':0,'sourceRequests':0}
    write_report(out/'result.json',result);print(json.dumps({k:result[k] for k in ('alternativePixels','actualIndependentRunSupply','unrecoveredOriginalKept','levels','patches')}))


if __name__=='__main__':main()
