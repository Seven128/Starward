"""Measured catalog/retained asTrans/current saved-image comparison only.

No field shift, origin fitting, full reprojection, PSF or display correction.
Catalog and frames share the upstream solution; this is not independent absolute
astrometry. Aperture centroids below are diagnostic, not fitted PSF truth.
"""
import argparse
import csv
import importlib.util
import io
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image,ImageDraw
from astropy.coordinates import SkyCoord
from sdss_corrected_frame import read_cached_frame
from sdss_gri_tan import BANDS,target_tan,make_rgb_display,ProjectedBand,FixedDisplayTransfer
from image_quality import digest,write_report

spec=importlib.util.spec_from_file_location('prior_astrometry',TASK/'scripts/experience-sdss-astrans-approximation-audit-2026-10-02.py')
prior=importlib.util.module_from_spec(spec);spec.loader.exec_module(prior)


def bind(path):
    raw=path.read_bytes()
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':digest(raw)}


def summary(values):
    values=np.asarray(values,dtype=float)
    return {'count':len(values),'median':float(np.median(values)) if len(values) else None,
        'p95':float(np.percentile(values,95)) if len(values) else None,
        'maximum':float(np.max(values)) if len(values) else None}


def sky(ra,dec):
    return SkyCoord(ra=ra,dec=dec,unit='deg',frame='icrs')


def aperture_centroid(plane,cx,cy):
    y,x=np.indices(plane.shape,dtype=float);r=np.hypot(x-cx,y-cy)
    annulus=(r>=10)&(r<=12);core=r<=7
    background=float(np.median(plane[annulus]));weight=np.maximum(plane.astype(float)-background,0)*core
    total=float(weight.sum())
    if not np.isfinite(total) or total<=0:return {'available':False,'background':background}
    return {'available':True,'background':background,'positiveApertureSum':total,
        'centerXY':[float((weight*x).sum()/total),float((weight*y).sum()/total)],
        'meaning':'Radius7 positive residual moment after local10..12 median, not PSF fit or calibrated flux.'}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',default='sdss-measured-registration-1003-r1');args=parser.parse_args()
    assert Path(args.output).name==args.output and args.output.startswith('sdss-measured-registration-1003-r')
    out=ROOT/'output'/args.output;out.mkdir(exist_ok=False)
    paths=[Path(__file__),Path(prior.__file__),ROOT/'data-pipelines/deep-sky/sdss_corrected_frame.py',
        ROOT/'data-pipelines/deep-sky/sdss_gri_tan.py']
    def pinned(path,sha):
        path=ROOT/path;assert bind(path)['sha256']==sha;paths.append(path);return json.loads(path.read_bytes())
    c=pinned('output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json','73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52')
    n=pinned('output/shared-noise-display-1003-r1/candidate/candidate.json','0dc8f1d5a6a82e1cfa50709832123a3e3982b76e3b73b4bc3d228f600fcd65c5')
    q=pinned('output/sdss-m51-mosaic-quality-diagnosis-1002-r3/result.json','9322203537531e0cba3fbf9addcd3ea6e19fd75fdfeb2dc57637bd2d42bee4d0')
    audit=pinned('output/sdss-astrans-approximation-audit-1002/audit.json','75c0f2043c5bce595e5544525e41661c470d0103ef63138dec6b4e4cbb9c2f28')
    rp=ROOT/'output/sdss-registration-stars-1003-r1/receipt.json';cp=rp.parent/'response.csv'
    receipt=json.loads(rp.read_bytes());raw=cp.read_bytes()
    assert receipt['status']==200 and receipt['sha256']==digest(raw) and receipt['bytes']==len(raw)
    assert receipt['sha256']=='04a1a37273d3d08783454b19da9272c8735e94b3bdd771de6988123c0c6a91e7'
    paths.extend([rp,cp,rp.parent/'query.sql'])
    text=raw.decode('utf-8-sig');assert text.startswith('#Table1')
    stars=list(csv.DictReader(io.StringIO('\n'.join(line for line in text.splitlines() if not line.startswith('#')))))
    assert 0<len(stars)<receipt['maximumRows'] and len({s['objID'] for s in stars})==len(stars)
    fields={(3699,99):'1237661362908495872',(3699,100):'1237661362908561408',(3699,101):'1237661362908626944',
        (3716,116):'1237661435924054016',(3716,117):'1237661435924119552',(3716,118):'1237661435924185088'}
    for s in stars:
        key=(int(s['run']),int(s['field']))
        assert fields[key]==s['fieldID'] and s['rerun']=='301' and s['camcol']=='6'
        assert int(s['type'])==6 and int(s['mode']) in (1,2) and int(s['clean'])==1 and int(s['nChild'])==0
        assert 14<=float(s['psfMag_r'])<=20
        for b in BANDS:
            assert all(np.isfinite(float(s[f'{name}_{b}'])) for name in ('rowc','colc','rowcErr','colcErr','psfMag','psfMagErr'))
            assert int(s[f'flags_{b}'])>=0
    for m in audit['inputs']:
        p=ROOT/m['path'];assert bind(p)==m;paths.append(p)
    acquisition=[r for m in audit['inputs'] for r in json.loads((ROOT/m['path']).read_bytes())['sourceFiles']
        if (r['identity']['run'],r['identity']['camcol'])!=(3716,5)]
    assert len(acquisition)==18
    for r in acquisition:
        p=ROOT/'output/sdss-corrected-m51-1002/sources'/r['path'];assert bind(p)['sha256']==r['sha256'];paths.append(p)
    def arr(meta,base):
        p=base/meta['file'] if 'file' in meta else ROOT/meta['path'];assert bind(p)['sha256']==meta['sha256'];paths.append(p)
        return np.load(p,mmap_mode='r',allow_pickle=False)
    base=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2'
    science={b:arr(c['arrays'][b+'-science'],base) for b in BANDS}
    estimates={b:arr(n['arrays'][b],ROOT/'output/shared-noise-display-1003-r1/candidate') for b in BANDS}
    flags={b:arr(q['projectedFlagArrays'][b],ROOT) for b in BANDS}
    joint=arr(c['arrays']['joint-availability'],base)
    for r in json.loads((TASK/'tmp/resume-preserved-hashes-2026-10-01.json').read_bytes()):
        p=ROOT/r['path'];assert bind(p)['sha256']==r['sha256'];paths.append(p)
    before=[bind(p) for p in paths];write_report(out/'inputs-before.json',before)
    (out/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    frames={}
    for r in acquisition:
        f=read_cached_frame(ROOT/'output/sdss-corrected-m51-1002/sources'/r['path'],
            {**r['identity'],'bytes':r['bytes'],'sha256':r['sha256'],'sourceUrl':r['url']},max_uncompressed_bytes=32*1024*1024)
        old=next(m for m in audit['results'] if m['identity']==r['identity'])
        assert f.receipt['asTrans']['row']==old['retainedAsTrans']
        frames[(r['identity']['run'],r['identity']['field'],r['identity']['band'])]=f
    target=target_tan(c['center'],c['pixels'],c['fieldDegrees']);records=[]
    for s in stars:
        ra,dec=float(s['ra']),float(s['dec']);cat=sky(ra,dec);run,field=int(s['run']),int(s['field'])
        px,py=target.all_world2pix(ra,dec,0);py=c['pixels']-1-float(py);px=float(px)
        measured={}
        for b in BANDS:
            f=frames[(run,field,b)];col,row=float(s['colc_'+b]),float(s['rowc_'+b])
            # Declared official integer-edge convention: catalog centers already
            # use edges, and native FITS origin0 centers subtract one half pixel.
            color=float(s['psfMag_g'])-float(s['psfMag_r']) if b=='g' else float(s['psfMag_r'])-float(s['psfMag_i'])
            fr,fd=prior.retained_solution(f.receipt['asTrans']['row'],col-.5,row-.5,origin_offset=.5,color=color)
            tr,td=f.wcs.all_pix2world(col-.5,row-.5,0)
            measured[b]={'catalogColumnRow':[col,row],'catalogColor':color,'colorMeaning':'g-r' if b=='g' else 'r-i',
                'catalogFlags':s['flags_'+b],'centroidErrorPixels':[float(s['colcErr_'+b]),float(s['rowcErr_'+b])],
                'psfMagnitudeError':float(s['psfMagErr_'+b]),'fullToCatalogArcsec':float(cat.separation(sky(fr,fd)).arcsec),
                'linearToCatalogArcsec':float(cat.separation(sky(tr,td)).arcsec),
                'fullToLinearArcsec':float(sky(fr,fd).separation(sky(tr,td)).arcsec),
                'insideNative':0<=col-.5<2048 and 0<=row-.5<1489}
        records.append({'objID':s['objID'],'fieldID':s['fieldID'],'run':run,'field':field,'mode':int(s['mode']),
            'catalogRaDec':[ra,dec],'targetColumnRow':[px,py],'bands':measured})
    candidates=[];reasons={'outsideSavedTarget':0,'catalogCentroidUncertainOrOutsideNative':0,'projectedRejectedFlagsOrMissing':0,'nearCatalogNeighbor':0}
    for r in records:
        px,py=r['targetColumnRow'];ix,iy=int(round(px)),int(round(py))
        if not (16<=ix<c['pixels']-16 and 16<=iy<c['pixels']-16):reasons['outsideSavedTarget']+=1;continue
        if any(not v['insideNative'] or max(v['centroidErrorPixels'])>.1 or not 0<=v['psfMagnitudeError']<=.1 for v in r['bands'].values()):
            reasons['catalogCentroidUncertainOrOutsideNative']+=1;continue
        yy,xx=np.mgrid[iy-16:iy+17,ix-16:ix+17];core=np.hypot(xx-px,yy-py)<=7
        if not joint[iy-16:iy+17,ix-16:ix+17].all() or any(np.any((flags[b][iy-16:iy+17,ix-16:ix+17]&771)[core]) for b in BANDS):
            reasons['projectedRejectedFlagsOrMissing']+=1;continue
        # Other catalog detections within1 arcsec may be repeat observations of
        # the same star. They are not independent neighbors or exposures.
        others=[np.hypot(px-s['targetColumnRow'][0],py-s['targetColumnRow'][1]) for s in records if s['objID']!=r['objID']]
        if any(2.5<d<24 for d in others):reasons['nearCatalogNeighbor']+=1;continue
        crop=(slice(iy-16,iy+17),slice(ix-16,ix+17));cx,cy=px-(ix-16),py-(iy-16)
        r['savedPatch']={'boundsXYExclusive':[ix-16,iy-16,ix+17,iy+17],'expectedXY':[cx,cy],'perBand':{}}
        for b in BANDS:
            a=aperture_centroid(science[b][crop],cx,cy);z=aperture_centroid(estimates[b][crop],cx,cy)
            r['savedPatch']['perBand'][b]={'rawScience':a,'displayEstimate':z}
            if a['available'] and z['available']:
                r['savedPatch']['perBand'][b].update({'rawToCatalogPixels':float(np.linalg.norm(np.array(a['centerXY'])-[cx,cy])),
                    'estimateToCatalogPixels':float(np.linalg.norm(np.array(z['centerXY'])-[cx,cy])),
                    'filterCenterMovementPixels':float(np.linalg.norm(np.array(z['centerXY'])-a['centerXY']))})
        candidates.append(r)
    # Actual saved image patches spread over target cells; display only. All
    # qualified catalog records remain in JSON, not just these first examples.
    selected=[];cells=set()
    for r in candidates:
        cell=tuple(int(v//512) for v in r['targetColumnRow'])
        if cell not in cells:cells.add(cell);selected.append(r)
    tiles=[]
    recipe=n['sourceResolvedRecipe']
    for r in selected:
        x0,y0,x1,y1=r['savedPatch']['boundsXYExclusive'];crop=(slice(y0,y1),slice(x0,x1));pair=[]
        for arrays in (science,estimates):
            rgb,_=make_rgb_display({b:ProjectedBand(arrays[b][crop],joint[crop],joint[crop],{}) for b in BANDS},
                joint[crop],transfer=FixedDisplayTransfer(recipe['stretch'],recipe['Q']))
            pair.append(Image.fromarray(rgb).resize((132,132),Image.Resampling.NEAREST))
        tiles.append((r,pair))
    if tiles:
        sheet=Image.new('RGB',(560,158*((len(tiles)+1)//2)),(20,20,20));draw=ImageDraw.Draw(sheet)
        for i,(r,pair) in enumerate(tiles):
            x,y=(i%2)*280,(i//2)*158;draw.text((x+2,y+2),r['objID']+' raw / estimate',fill='white')
            sheet.paste(pair[0],(x+2,y+24));sheet.paste(pair[1],(x+136,y+24))
        sheet.save(out/'distributed-actual-star-patches.png')
    after=[bind(p) for p in paths];write_report(out/'inputs-after.json',after);assert before==after
    metrics={b:{k:summary([r['bands'][b][k] for r in records]) for k in ('fullToCatalogArcsec','linearToCatalogArcsec','fullToLinearArcsec')} for b in BANDS}
    patchmetrics={b:{k:summary([r['savedPatch']['perBand'][b][k] for r in candidates if k in r['savedPatch']['perBand'][b]]) for k in ('rawToCatalogPixels','estimateToCatalogPixels','filterCenterMovementPixels')} for b in BANDS}
    report={'scope':__doc__,'catalogReceipt':bind(rp),'catalogResponse':bind(cp),'catalogDetections':len(records),
        'fieldDetectionCounts':{f'{run}/{field}':sum(r['run']==run and r['field']==field for r in records) for run,field in fields},
        'catalogConvention':'SDSS centers already integer-edge coordinates; native FITS0 centers subtract .5, not selected by residual minimization.',
        'catalogBindingValidation':True,'actualNativeFrames':18,'inputBindingsExact':True,'coordinateMetrics':metrics,
        'imageQualification':reasons,'qualifiedImageDetections':len(candidates),'apertureMetrics':patchmetrics,
        'records':records,'displayedObjectRefs':[r['objID'] for r in selected],
        'limitations':['Catalog and frames share upstream astrometry, not independent absolute truth.',
            'Selected type6/clean1/nChild0/14..20 catalog subset, not all stars, diffuse structures or full PSF.',
            'Catalog neighbor check omits unqueried/faint/galaxy neighbors; local moments retain source/blend/noise uncertainty.',
            'Repeated observations and same-run adjacent frames are not independent samples.',
            'True star colors do not supply extended-source per-pixel DCR or authorize whole-image transforms.'],
        'quality':'UNVERIFIED','productionCorrection':'NONE','sourceImageRequests':0,'filterRuns':0,'fitRuns':0,'independentReview':'MISSING'}
    write_report(out/'result.json',report)
    print(json.dumps({k:report[k] for k in ('catalogDetections','fieldDetectionCounts','qualifiedImageDetections','coordinateMetrics','apertureMetrics')}))


if __name__=='__main__':main()
