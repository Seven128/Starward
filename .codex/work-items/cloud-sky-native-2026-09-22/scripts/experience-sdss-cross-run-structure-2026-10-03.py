"""Compare real separate-run supply with saved common display, no new filter.

Adjacent fields within a run remain repeated CCD samples. Separate MJD/run is
not proof of independent systematics. Blocks measure signed native-pixel means,
not uniform surface brightness, inverse-variance confidence or PSF equivalence.
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


def stats(values):
    values=np.asarray(values,dtype=float)
    return {'count':int(values.size),'signedMean':float(values.mean()) if values.size else None,
        'median':float(np.median(values)) if values.size else None,
        'p95Absolute':float(np.percentile(np.abs(values),95)) if values.size else None,
        'maximumAbsolute':float(np.abs(values).max()) if values.size else None}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',default='sdss-cross-run-structure-1003-r1');args=parser.parse_args()
    assert Path(args.output).name==args.output and args.output.startswith('sdss-cross-run-structure-1003-r')
    out=ROOT/'output'/args.output;out.mkdir(exist_ok=False);paths=[Path(__file__),ROOT/'data-pipelines/deep-sky/sdss_gri_tan.py']
    def doc(relative,pin):
        p=ROOT/relative;assert bind(p)['sha256']==pin;paths.append(p);return json.loads(p.read_bytes()),p
    c,cp=doc('output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json','73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52')
    n,npth=doc('output/shared-noise-display-1003-r1/candidate/candidate.json','0dc8f1d5a6a82e1cfa50709832123a3e3982b76e3b73b4bc3d228f600fcd65c5')
    q,_=doc('output/sdss-m51-mosaic-quality-diagnosis-1002-r3/result.json','9322203537531e0cba3fbf9addcd3ea6e19fd75fdfeb2dc57637bd2d42bee4d0')
    p,_=doc('output/noise-display-provenance-1003-r2/processing-provenance.json','685021971466e559024d6bd70c5a810603851ab626a54fd5429b99a60473c597')
    def arr(meta,base):
        f=base/meta['file'] if 'file' in meta else ROOT/meta['path'];assert bind(f)['sha256']==meta['sha256'];paths.append(f)
        return np.load(f,mmap_mode='r',allow_pickle=False)
    raw={b:arr(c['arrays'][b+'-science'],cp.parent) for b in BANDS}
    filtered={b:arr(n['arrays'][b],npth.parent) for b in BANDS}
    joint=arr(c['arrays']['joint-availability'],cp.parent);processable=arr(n['arrays']['processable'],npth.parent)
    weights={name:arr(d['normalized-weight'],cp.parent) for name,d in c['mosaic']['diagnostics'].items()}
    fields={name:{b:arr(d[b+'-science'],cp.parent) for b in BANDS} for name,d in c['mosaic']['diagnostics'].items()}
    flags={f['fieldKey']:{b:arr(f['bands'][b]['projectedFlags'],ROOT) for b in BANDS} for f in q['fields']}
    assert set(fields)==set(flags)=={f['fieldKey'] for f in p['fields']}
    observations=[]
    for f in p['fields']:
        dates={}
        for b,v in f['bands'].items():
            r=v['frameAdmissionReceipt'];source=Path(r['source']['path']);assert bind(source)['sha256']==r['source']['sha256'];paths.append(source)
            assert '/'.join(str(r['identity'][k]) for k in ('rerun','run','camcol','field'))==f['fieldKey']
            dates[b]=r['asTrans']['row']['MJD']
        observations.append({'fieldKey':f['fieldKey'],'bandMjd':dates})
    for row in json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes()):
        f=ROOT/row['path'];assert bind(f)['sha256']==row['sha256'];paths.append(f)
    before=[bind(f) for f in paths];write_report(out/'inputs-before.json',before);(out/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    runs={};reconstructed={b:np.zeros(joint.shape,dtype=float) for b in BANDS};absolute={b:np.zeros(joint.shape,dtype=float) for b in BANDS}
    # Reuse actual common geometric weights, not a new inverse-variance coadd.
    for run in (3699,3716):
        names=[name for name in fields if int(name.split('/')[1])==run]
        w=sum(weights[name].astype(float) for name in names);available=w>0;clean=available.copy();values={}
        for b in BANDS:
            numerator=np.zeros(joint.shape,dtype=float)
            for name in names:
                active=weights[name]>0;contribution=np.where(active,fields[name][b],0).astype(float)*weights[name]
                numerator+=contribution;reconstructed[b]+=contribution;absolute[b]+=np.abs(contribution)
                clean&=(~active)|((flags[name][b]&771)==0)
            values[b]=np.divide(numerator,w,out=np.full(w.shape,np.nan),where=available)
        runs[run]={'values':values,'available':available,'clean':clean,'weight':w}
    for b in BANDS:
        tol=(len(fields)+2)*np.finfo(np.float32).eps*absolute[b]+len(fields)*np.finfo(np.float32).smallest_subnormal
        assert np.all(np.abs(reconstructed[b][joint]-raw[b][joint])<=tol[joint])
        assert np.array_equal(filtered[b][~processable],raw[b][~processable],equal_nan=True)
    both=runs[3699]['available']&runs[3716]['available'];qualified=both&runs[3699]['clean']&runs[3716]['clean']
    block=16;coarse={};clean_counts=qualified.reshape(128,block,128,block).sum(axis=(1,3));both_counts=both.reshape(128,block,128,block).sum(axis=(1,3))
    masks={}
    for name,values,available in [('run3699',runs[3699]['values'],runs[3699]['available']),('run3716',runs[3716]['values'],runs[3716]['available']),('rawCommon',raw,joint),('savedDisplay',filtered,joint)]:
        means,counts=coherent_box_means(values,available,block);coarse[name]=means;masks[name]=counts==block*block
    # Full 128x128 target-cell descriptions with actual support. No positive
    # mean, matching observations or query success is converted to confidence.
    valid=(clean_counts==block*block);descriptions={};cell_records=[]
    for b in BANDS:
        difference=coarse['run3699'][b]-coarse['run3716'][b];correction=coarse['savedDisplay'][b]-coarse['rawCommon'][b]
        descriptions[b]={'qualifiedRunDifference':stats(difference[valid]),'qualifiedDisplayMeanChange':stats(correction[valid]),
            'bothRunPositiveMeans':int(((coarse['run3699'][b]>0)&(coarse['run3716'][b]>0)&valid).sum()),
            'meaning':'Signed block mean comparisons only; no empty-sky estimate, SNR or independent-exposure model.'}
    for y,x in zip(*np.nonzero(both_counts)):
        cell_records.append({'targetBoundsXYExclusive':[int(x*block),int(y*block),int((x+1)*block),int((y+1)*block)],
            'bothRunSupply':int(both_counts[y,x]),'bothRunCleanProcessing':int(clean_counts[y,x]),
            'sourceMeans':{name:{b:float(coarse[name][b][y,x]) if masks[name][y,x] else None for b in BANDS} for name in coarse}})
    # Views use the same frozen recipe and signed means before display.
    recipe=n['sourceResolvedRecipe'];transfer=FixedDisplayTransfer(recipe['stretch'],recipe['Q']);images={}
    for name,values,available in [('run3699',runs[3699]['values'],runs[3699]['available']),('run3716',runs[3716]['values'],runs[3716]['available']),('rawCommon',raw,joint),('savedDisplay',filtered,joint)]:
        means,counts=coherent_box_means(values,available,4);support=counts>0
        rgb,_=make_rgb_display({b:ProjectedBand(means[b],support,support,{}) for b in BANDS},support,transfer=transfer)
        alpha=np.rint(counts*255/16).astype(np.uint8);f=out/(name+'-overview.png');Image.fromarray(np.dstack([rgb,alpha])).save(f);images[name]=bind(f)
    sheet=Image.new('RGB',(2048,536),(20,20,20));draw=ImageDraw.Draw(sheet)
    for i,(name,m) in enumerate(images.items()):
        draw.text((i*512+4,4),name+' signed mean / fixed original recipe',fill='white');sheet.paste(Image.open(ROOT/m['path']).convert('RGB'),(i*512,24))
    sheet.save(out/'actual-run-and-common-overviews.png')
    # Processing correction across actual four-neighbour qualification edges:
    # raw natural gradients remain separate, not counted as introduced seams.
    edges=[]
    for axis in (0,1):
        left=(slice(None,-1),slice(None)) if axis==0 else (slice(None),slice(None,-1))
        right=(slice(1,None),slice(None)) if axis==0 else (slice(None),slice(1,None))
        crossing=processable[left]!=processable[right]
        edges.append({'axis':axis,'pairs':int(crossing.sum()),'bands':{b:{
            'rawDifference':stats((raw[b][right].astype(float)-raw[b][left])[crossing]),
            'displayDifference':stats((filtered[b][right].astype(float)-filtered[b][left])[crossing]),
            'processingCorrectionJump':stats(((filtered[b][right].astype(float)-raw[b][right])-(filtered[b][left].astype(float)-raw[b][left]))[crossing])} for b in BANDS},
            'meaning':'Correction discontinuity descriptively measured; not natural-gradient removal or acceptance threshold.'})
    after=[bind(f) for f in paths];write_report(out/'inputs-after.json',after);assert before==after
    result={'scope':__doc__,'observations':observations,'sameRunAdjacency':'Known duplicated CCD samples, not independent exposures.',
        'separateRunMeaning':'Different actual MJD/run supply, no independent-systematics/PSF equivalence claim.',
        'coaddReconstructed':True,'fallbackExact':True,'inputBindingsExact':True,
        'supply':{'bothRunPixels':int(both.sum()),'bothRunCleanProcessingPixels':int(qualified.sum()),'fullyBothClean16Blocks':int(valid.sum()),'total16Blocks':128*128},
        'bandDescriptions':descriptions,'cells':cell_records,'qualificationEdges':edges,'images':images,
        'actualComparison':bind(out/'actual-run-and-common-overviews.png'),'filterRuns':0,'fitRuns':0,'sourceRequests':0,
        'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    write_report(out/'result.json',result)
    print(json.dumps({k:result[k] for k in ('supply','bandDescriptions','qualificationEdges')}))


if __name__=='__main__':main()
