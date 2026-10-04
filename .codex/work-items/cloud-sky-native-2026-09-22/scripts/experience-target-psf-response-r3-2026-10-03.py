"""Native signed PSF response through the actual saved science-coadd operator.

Unit model response, NOT observed stars, a matching kernel or the nonlinear
adaptive display's effective PSF. Source, science and display stay unchanged.
"""
from pathlib import Path
import hashlib,importlib.util,json,sys,time
ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.path[:0]=[str(ROOT/'output/sdss-psf-tools-1003-r1/python-deps'),str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from astropy.wcs import WCS
from astropy.io.fits import Header
from PIL import Image,ImageDraw
from sdss_gri_tan import target_tan
from sdss_source_stencil import source_pixel_stencil
from sdss_frame_quality import read_cached_psfield

# Common native unit model; historical outputs are retained, never replayed here.
spec=importlib.util.spec_from_file_location('shared_native_unit',TASK/'scripts/sdss-native-unit-response-2026-10-04.py')
shared=importlib.util.module_from_spec(spec);sys.modules[spec.name]=shared;spec.loader.exec_module(shared)
OUT=ROOT/'output/target-psf-response-1003-r3'
def bind(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
    return {'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':h.hexdigest()}
def save(p,v):
    with p.open('x',encoding='utf-8') as f:json.dump(v,f,indent=2,allow_nan=False);f.write('\n')
def main():
    OUT.mkdir(exist_ok=False);(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes());started=time.perf_counter();paths=[Path(__file__),Path(shared.__file__)]
    def doc(p,pin=None):
        if pin:assert bind(p)['sha256']==pin
        paths.append(p);return json.loads(p.read_bytes())
    base=ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2'
    c=doc(base/'candidate.json','73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52')
    q=doc(ROOT/'output/sdss-m51-mosaic-quality-diagnosis-1002-r3/result.json','9322203537531e0cba3fbf9addcd3ea6e19fd75fdfeb2dc57637bd2d42bee4d0')
    material=doc(ROOT/'output/center-native-detections-1003-r2/result.json','49077d1c2a10c2be4e69ae823c2f1d2370fc1758510153cd93f5bbe642456a6b')
    current=doc(ROOT/'output/shared-adaptive-flag-recovery-1003-r2/candidate/candidate.json','e3f8f732ed0fda1121ac38aec2cae9ad57521c3d2807b3d985955f64e5548235')
    bounds=current['levels']['DETAIL']['crop']['boundsXYExclusive']
    points=[t for t in material['commonTriplets'] if bounds[0]<=t['bands']['r']['targetColumnRow'][0]<bounds[2] and bounds[1]<=t['bands']['r']['targetColumnRow'][1]<bounds[3]]
    assert len(points)==87
    for v in current['levels'].values():paths.append(ROOT/'output/shared-adaptive-flag-recovery-1003-r2/candidate'/v['file'])
    for v in doc(TASK/'tmp/resume-preserved-hashes-2026-10-01.json'):
        p=ROOT/v['path'];assert bind(p)['sha256']==v['sha256'];paths.append(p)
    for n in ('sdss_gri_tan.py','sdss_source_stencil.py','sdss_frame_quality.py'):paths.append(ROOT/'data-pipelines/deep-sky'/n)
    fields={}
    def array(v):
        p=base/v['file'];assert bind(p)['sha256']==v['sha256'];paths.append(p)
        a=np.load(p,mmap_mode='r',allow_pickle=False);assert list(a.shape)==v['shape'];return a
    for f in c['mosaic']['fields']:
        key=f['fieldKey'];fq=next(v for v in q['fields'] if v['fieldKey']==key);s=fq['psfSource'];p=ROOT/s['path'];paths.append(p)
        assert bind(p)['sha256']==s['sha256'];i=f['perBand']['g']['sourceReceipt']['identity']
        ps=read_cached_psfield(p,i|{'sourceUrl':f'https://data.sdss.org/sas/dr17/eboss/photo/redux/301/{i["run"]}/objcs/6/{p.name}','bytes':s['bytes'],'sha256':s['sha256']},max_uncompressed_bytes=4*1024*1024)
        d=c['mosaic']['diagnostics'][key];bands={}
        for b in ('g','r','i'):
            rec=f['perBand'][b]['sourceReceipt'];cards=rec['wcs']['primaryHeaderFitsCards']
            assert hashlib.sha256(cards.encode('ascii')).hexdigest()==rec['wcs']['primaryHeaderSha256']
            bands[b]=(WCS(Header.fromstring(cards,sep='\n'),naxis=2),tuple(rec['scientificSamples']['shapeRowsColumns']),array(d[b+'-footprint']),array(d[b+'-finite-neighbors']))
        fields[key]=(ps,bands,array(d['normalized-weight']))
    science=array(c['arrays']['r-science'])
    paths=list(dict.fromkeys(paths));before=[bind(p) for p in paths];save(OUT/'inputs-before.json',before)
    target=target_tan(c['center'],c['pixels'],c['fieldDegrees']);records=[]
    for index,t in enumerate(points):
        cx,cy=t['bands']['r']['targetColumnRow'];x0=int(round(cx))-20;y0=int(round(cy))-20
        yy,xx=np.mgrid[y0:y0+41,x0:x0+41];region=(slice(y0,y0+41),slice(x0,x0+41))
        ra,dec=target.all_pix2world(xx,c['pixels']-1-yy,0)
        # One common sky point from the saved r detection; no fit shift or
        # per-band observed centroid is silently applied to the WCS/model.
        anchor=target.all_pix2world(cx,c['pixels']-1-cy,0)
        arrays={'target_x':xx,'target_y':yy,'original_r_science':np.asarray(science[region])};contributors=[]
        summed={b:np.zeros(xx.shape,float) for b in ('g','r','i')};known={b:np.ones(xx.shape,bool) for b in summed}
        all_weight=np.zeros(xx.shape,float);raw=[]
        for key,(ps,bands,weight) in fields.items():
            w=np.asarray(weight[region]);all_weight+=w;field_native={};edge=[];joint=[]
            for b,(wcs,shape,footprint,finite) in bands.items():
                sx,sy=wcs.all_world2pix(ra,dec,0);st=source_pixel_stencil(shape,sx,sy)
                actual=np.asarray(footprint[region])&np.asarray(finite[region]);assert np.array_equal(st.geometry,np.asarray(footprint[region]))
                distance=np.minimum.reduce([sx,sy,shape[1]-1-sx,shape[0]-1-sy])
                edge.append(np.where(actual,np.maximum(distance,0),0).astype(np.float32));joint.append(actual)
                field_native[b]=(sx,sy,shape,wcs)
            j=np.logical_and.reduce(joint);rw=np.where(j,np.minimum.reduce(edge)+1,0).astype(np.float32);raw.append((key,rw))
            if not (w>0).any():continue
            prefix=key.replace('/','-');arrays[prefix+'-weight']=w
            contributor={'fieldKey':key,'run':int(key.split('/')[1]),'positiveWeightPixels':int((w>0).sum()),'bands':{}}
            for b,(sx,sy,shape,wcs) in field_native.items():
                value=shared.native_unit_response(ps,b,wcs,shape,anchor,sx,sy)
                nx,ny=value.anchor_xy;inside=value.anchor_inside;kernel=value.kernel
                response,support=value.response,value.support
                if kernel is not None:
                    arrays[prefix+'-'+b+'-kernel']=kernel
                    arrays[prefix+'-'+b+'-native-model']=value.native_model
                    arrays[prefix+'-'+b+'-native-bounds']=np.asarray(value.native_bounds)
                bad=(w>0)&~support;known[b]&=~bad
                use=(w>0)&support;summed[b][use]+=response[use].astype(float)*w[use]
                arrays[prefix+'-'+b+'-response']=response;arrays[prefix+'-'+b+'-support']=support
                arrays[prefix+'-'+b+'-sx']=sx;arrays[prefix+'-'+b+'-sy']=sy
                contributor['bands'][b]={'anchorNativeXY':[nx,ny],'anchorInsideNative':bool(inside),'modelUnsupportedPositiveWeightPixels':int(bad.sum()),'finiteKernelSum':float(kernel.sum()) if kernel is not None else None}
            contributors.append(contributor)
        assert np.allclose(all_weight,1,rtol=0,atol=9e-8)
        denominator=sum(v.astype(np.float64) for _,v in raw)
        for key,rw in raw:assert np.array_equal((rw/denominator).astype(np.float32),np.asarray(fields[key][2][region]))
        summaries={}
        for b in summed:
            response=np.where(known[b],summed[b],np.nan).astype(np.float32);arrays['coadd-'+b]=response;arrays['known-'+b]=known[b]
            summaries[b]={'knownPixels':int(known[b].sum()),'unknownPixels':int((~known[b]).sum()),'patchSum':float(np.nansum(response)),'peak':float(np.nanmax(response)), 'negativePixels':int((response<0).sum())}
        p=OUT/f'response-{index:03}.npz';np.savez_compressed(p,**arrays)
        records.append({'index':index,'imageCandidateId':t['bands']['r']['candidateId'],'anchorTargetXY':[cx,cy],'anchorIcrsApprox':list(map(float,anchor)),'targetBoundsXYExclusive':[x0,y0,x0+41,y0+41],'contributors':contributors,'distinctRuns':sorted({v['run'] for v in contributors}),'summary':summaries,'saved':bind(p)})
        if index%16==0:panel=Image.new('RGB',(410,104*min(16,len(points)-index)),'#181818');draw=ImageDraw.Draw(panel)
        row=index%16;draw.text((2,row*104),f'{index}: actual r | model g/r/i; runs '+str(records[-1]['distinctRuns']),fill='white')
        for col,a in enumerate([arrays['original_r_science']]+[arrays['coadd-'+b] for b in ('g','r','i')]):
            lo,hi=np.nanpercentile(a,[2,99.5]);gray=np.nan_to_num(np.clip((a-lo)/max(hi-lo,1e-15),0,1),nan=0)
            panel.paste(Image.fromarray(np.rint(gray*255).astype(np.uint8)).resize((82,82),Image.Resampling.NEAREST),(col*102,row*104+20))
        if index%16==15 or index==len(points)-1:panel.save(OUT/f'actual-science-and-unit-responses-{index//16+1}.png')
    after=[bind(p) for p in paths];assert after==before;save(OUT/'inputs-after.json',after)
    report={'version':'sdss-target-unit-psf-response-diagnostic-v1','records':records,'actualDetailCandidates':len(records),'elapsedSeconds':time.perf_counter()-started,
        'sourceRequests':0,'nativeFrameReads':0,'detectionsOrFits':0,'scienceOrDisplayCorrections':'NONE','normalizedSavedWeightsExact':True,
        'meaning':'Unit signed finite-kernel native model sampled on actual integer native pixels, through existing all-four-neighbor float32 bilinear owner and saved common-gri float32 weights. One sky anchor per image candidate. Original linear science-coadd operator only.',
        'limits':['Not empirical stars or validated effective PSF. Mixed extended/blend material and previous center-bound fits stay unqualified.',
            'Primary-header TAN only; full asTrans/DCR, absolute registration, cross-run flux/color/PSF systematics unverified.',
            'Finite kernel normalization and target patch sum are not calibrated total flux; target reprojection is not flux conserving.',
            'Same-run overlapping fields can reuse native samples; counts/weights do not establish independent exposures.',
            'The current adaptive median/shared-radius/flag-recovery display is nonlinear. These science-parent responses do not describe its effective PSF.',
            'Unknown positive-weight model support remains unknown; zero-weight fields do not contaminate a valid response. Figure normalizes panels separately, no observed/model flux comparison.'],
        'quality':'UNVERIFIED','independentReview':'MISSING','adopted':False}
    save(OUT/'result.json',report)
    print(json.dumps({'result':bind(OUT/'result.json'),'candidates':len(records),'elapsedSeconds':report['elapsedSeconds'],'mixedRuns':sum(len(v['distinctRuns'])>1 for v in records),'unknownModelPixels':sum(v['summary'][b]['unknownPixels'] for v in records for b in ('g','r','i'))}),flush=True)
if __name__=='__main__':
    try:main()
    except Exception as e:
        if OUT.exists():save(OUT/'failed.json',{'type':type(e).__name__,'error':str(e),'scienceOrDisplayChanges':False})
        raise
