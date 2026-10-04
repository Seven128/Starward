"""Bounded real native->saved science->display->frozen LOD anomaly consumers.

Four explicitly recorded same-domain regions, not a new quality sample limit.
No noise model/fit/coadd/filter/radius selection or publication is performed.
"""
from pathlib import Path
import sys,json,importlib.util,time
ROOT=Path(__file__).resolve().parents[4];TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
sys.dont_write_bytecode=True
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from PIL import Image,ImageDraw
from sdss_corrected_frame import read_cached_frame
from sdss_gri_tan import target_tan,bilinear_samples,make_rgb_display,ProjectedBand,FixedDisplayTransfer
from sdss_frame_quality import PixelFlags
from sdss_noise_display import REJECT_PROCESSING_BITS
spec=importlib.util.spec_from_file_location('trace_binding',TASK/'scripts/analyze-m82-fixed-response-shapes-2026-10-04.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);bind,save=m.bind,m.save
OUT=ROOT/'output/sdss-m82-visible-native-display-1004-r2'
PATCHES=[('outer-stripe',[384,128,512,256]),('upper-stripe',[1152,640,1280,768]),
         ('lower-galaxy-stripe',[1152,1152,1280,1280]),('warm-core',[960,960,1088,1088])]

def signed_image(a,scale):
    f=np.isfinite(a);v=np.where(f,np.clip(a/scale,-1,1),0);pos=np.maximum(v,0);neg=np.maximum(-v,0)
    rgb=np.rint(np.stack((255*pos,190*pos+120*neg,255*neg),axis=-1)).astype('u1');rgb[~f]=(255,0,255)
    return Image.fromarray(rgb)

def main():
    assert not OUT.exists();OUT.mkdir();(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    started,cpu=time.perf_counter(),time.process_time();pins={}
    def pin(p,expected=None):
        v=bind(p)
        if expected is not None:assert v==expected
        assert pins.setdefault(v['path'],v)==v;return v
    def doc(p):pin(p);return json.loads(p.read_bytes())
    pin(Path(__file__));pin(Path(m.__file__))
    for name in ('sdss_corrected_frame.py','sdss_gri_tan.py','sdss_source_stencil.py','sdss_frame_quality.py','sdss_noise_display.py'):
        pin(ROOT/'data-pipelines/deep-sky'/name)
    cp=doc(TASK/'evidence/current-execution-state-2026-10-04-r90.json')
    for v in cp['currentSources']+cp['protected']+cp['evidence']:assert bind(ROOT/v['path'])==v
    pin(ROOT/'output/sdss-m82-target-profile-readback-1004-r1/checkpoint-continuity.json')
    doc(ROOT/'output/sdss-m82-visible-structure-1004-r1/result.json')
    sd=ROOT/'output/sdss-m82-first-science-master-1004-r2/candidate';cd=ROOT/'output/sdss-m82-recovered-complete-1004-r1/candidate'
    science,current=doc(sd/'candidate.json'),doc(cd/'candidate.json')
    def array(meta,d):
        p=d/meta['file'];v=pin(p);assert (v['bytes'],v['sha256'])==(meta['bytes'],meta['sha256'])
        a=np.load(p,mmap_mode='r',allow_pickle=False);assert list(a.shape)==meta['shape'] and a.dtype.str==meta['dtype'];return a
    sci={b:array(science['arrays'][b+'-science'],sd) for b in 'gri'}
    cur={b:array(current['arrays'][b],cd) for b in 'gri'}
    maps={k:array(current['arrays'][k],cd) for k in ('qualified','protected','radius','affected')}
    joint=array(science['arrays']['joint-availability'],sd)
    rd=ROOT/'output/sdss-m82-current-adaptive-recovery-1004-r1/candidate';recovery=doc(rd/'candidate.json')
    raw_recovered={b:array(recovery['arrays'][b],rd) for b in 'gri'}
    supply=array(recovery['arrays']['alternative-supply'],rd)
    target=target_tan(science['center'],science['pixels'],science['fieldDegrees'])
    frozen=science['display']['transfer'];assert frozen['stretch']==0.2358548697680099 and frozen['Q']==8
    transfer=FixedDisplayTransfer(stretch=frozen['stretch'],Q=frozen['Q'])
    mask=doc(ROOT/'output/sdss-m82-fpm-frame-intersection-1004-r1/result-r2.json')
    work=[]
    for name,bounds in PATCHES:
        x0,y0,x1,y1=bounds;region=np.s_[y0:y1,x0:x1];y,x=np.mgrid[region]
        ra,dec=target.all_pix2world(x,science['pixels']-1-y,0)
        data={stage+'-'+b:a[b][region].copy() for stage,a in (('science',sci),('current',cur)) for b in 'gri'}
        data.update({k:a[region].copy() for k,a in maps.items()});data['joint']=joint[region].copy()
        data['alternative-supply']=supply[region].copy()
        data.update({'recovered-raw-'+b:a[region].copy() for b,a in raw_recovered.items()})
        work.append({'name':name,'boundsXYExclusive':bounds,'region':region,'ra':ra,'dec':dec,'data':data,'fields':[]})
    frames_read=0
    for f in science['mosaic']['fields']:
        key=f['fieldKey'];weight=array(science['mosaic']['diagnostics'][key]['normalized-weight'],sd)
        active=[w for w in work if np.any(weight[w['region']]>0)]
        if not active:continue
        for w in active:
            w['data'][key.replace('/','-')+'-weight']=weight[w['region']].copy()
        for b in 'gri':
            receipt=f['perBand'][b]['sourceReceipt'];raw=receipt['source'];identity=receipt['identity']
            p=Path(raw['path']);v=pin(p);assert (v['sha256'],v['bytes'])==(raw['sha256'],raw['bytes'])
            frame=read_cached_frame(p,identity|{k:raw[k] for k in ('bytes','sha256','sourceUrl')},max_uncompressed_bytes=32*1024*1024)
            assert frame.receipt==receipt;frames_read+=1
            mi=next(v for v in mask['fpMInputs'] if v['identity']==identity)
            pin(ROOT/mi['flags']['path'],mi['flags']);admission=doc(ROOT/mi['currentAdmission']['path'])
            with np.load(ROOT/mi['flags']['path'],allow_pickle=False) as z:nflags=z['flags']
            flags=PixelFlags(nflags,None,admission)
            saved=array(science['mosaic']['diagnostics'][key][b+'-science'],sd)
            for w in active:
                sx,sy=frame.wcs.all_world2pix(w['ra'],w['dec'],0);sample,foot,finite=bilinear_samples(frame.data,sx,sy)
                assert np.array_equal(sample,saved[w['region']],equal_nan=True)
                sf=flags.stencil(sx,sy);on=weight[w['region']]>0;reject=on&(~sf.geometry|((sf.flags&REJECT_PROCESSING_BITS)!=0))
                inside=foot;xx=np.floor(sx[inside]).astype(int);yy=np.floor(sy[inside]).astype(int)
                nx0,ny0,nx1,ny1=int(xx.min()),int(yy.min()),int(xx.max())+2,int(yy.max())+2
                pfx=key.replace('/','-')+'-'+b
                for suffix,a in (('sx',sx),('sy',sy),('sample',sample),('footprint',foot),('finite',finite),
                                  ('sample-flags',sf.flags),('reject',reject),('native-data',frame.data[ny0:ny1,nx0:nx1]),('native-flags',nflags[ny0:ny1,nx0:nx1])):
                    w['data'][pfx+'-'+suffix]=a.copy()
                # Counts are literal native-row/column support, no inferred
                # physical cause or qualified sky/background model.
                columns,counts=np.unique(xx[(sf.flags[inside]&REJECT_PROCESSING_BITS)!=0],return_counts=True)
                detail={'fieldKey':key,'band':b,'nativeBoundsXYExclusive':[nx0,ny0,nx1,ny1],
                    'activePixels':int(on.sum()),'rejectedActivePixels':int(reject.sum()),'nativeToSavedProjectedExact':True,
                    'rejectPlanes':{v['name']:int((on&((sf.flags&(1<<v['plane']))!=0)).sum()) for v in admission['pixelFlags']['planes'] if REJECT_PROCESSING_BITS&(1<<v['plane'])},
                    'rejectedStencilFloorNativeColumns':dict(zip(map(str,columns.tolist()),counts.tolist())),
                    'nativeReceipt':receipt,'flagAdmission':mi['currentAdmission']}
                w['fields'].append(detail)
            del frame,nflags,flags
    records=[];images=[]
    for w in work:
        np.savez_compressed(OUT/(w['name']+'-native-stage.npz'),**w['data'])
        save(OUT/(w['name']+'-native-stage.json'),{'name':w['name'],'boundsXYExclusive':w['boundsXYExclusive'],'fields':w['fields']})
    for w in work:
        data=w['data'];q=data['qualified'];unknown=~q
        rejected=np.logical_or.reduce([a for k,a in data.items() if k.endswith('-reject')])
        # Retaining raw science where no display supply exists is an actual
        # recovery contract; this diagnostic does not authorize filling it.
        assert np.all(data['radius'][unknown]==-1)
        for b in 'gri':assert np.array_equal(data['current-'+b][unknown],data['science-'+b][unknown])
        record={'name':w['name'],'boundsXYExclusive':w['boundsXYExclusive'],'fields':w['fields'],
            'pixels':q.size,'unqualifiedPixels':int(unknown.sum()),'unqualifiedWithNativeReject':int((unknown&rejected).sum()),
            'unqualifiedWithoutNativeReject':int((unknown&~rejected).sum()),'nativeRejectStillQualified':int((q&rejected).sum()),
            'rawScienceFallbackExactOnAllUnqualifiedBands':True,'protected':int(data['protected'].sum()),'levels':{},'bands':{}}
        sheet=Image.new('RGB',(1024,1210),(18,18,18));draw=ImageDraw.Draw(sheet)
        for at,b in enumerate('gri'):
            a,c=data['science-'+b],data['current-'+b];scale=float(max(abs(a).max(),abs(c).max(),np.finfo('f4').tiny))
            changed=a!=c;preserved=data['protected']
            assert np.array_equal(data['recovered-raw-'+b][preserved],c[preserved])
            original_preserved=preserved&~data['alternative-supply']
            assert np.array_equal(a[original_preserved],c[original_preserved])
            record['bands'][b]={'sharedSignedScaleNmgy':scale,'scienceMinMeanMaxNmgy':[float(a.min()),float(a.astype('f8').mean()),float(a.max())],
                'currentMinMeanMaxNmgy':[float(c.min()),float(c.astype('f8').mean()),float(c.max())],
                'negativeSciencePixels':int((a<0).sum()),'negativeCurrentPixels':int((c<0).sum()),
                'changedPixels':int(changed.sum()),'protectedRecoveredRawExact':True,'protectedWithoutSupplyOriginalScienceExact':True,
                'protectedWithAlternativeSupply':int((preserved&data['alternative-supply']).sum())}
            for col,(label,val) in enumerate((('SCI',a),('CUR',c),('CUR-SCI',c.astype('f8')-a))):
                sheet.paste(signed_image(val,scale).resize((256,256),Image.Resampling.NEAREST),(col*256,at*286+30))
                draw.text((col*256+4,at*286+4),f'{w["name"]} {b} {label}; +/- {scale:.5g}',fill='white')
            native_fields=[v for v in w['fields'] if v['band']==b]
            # Show first active native frame in its original axes. This is a
            # crop, not rotated/interpolated native evidence.
            nf=native_fields[0];pfx=nf['fieldKey'].replace('/','-')+'-'+b
            im=signed_image(data[pfx+'-native-data'],scale);im.thumbnail((256,256),Image.Resampling.NEAREST)
            sheet.paste(im,(768,at*286+30));draw.text((772,at*286+4),'native '+nf['fieldKey']+' x/y',fill='white')
        rgba=np.zeros((*q.shape,3),np.uint8);rgba[unknown]=(255,0,255);rgba[rejected]=(255,60,0)
        sheet.paste(Image.fromarray(rgba).resize((256,256),Image.Resampling.NEAREST),(768,888));draw.text((772,864),'Native reject red / unknown pink',fill='white')
        x0,y0,x1,y1=w['boundsXYExclusive']
        for i,(lev,start,end,factor) in enumerate((('OVERVIEW',0,2048,4),('MEDIUM',512,1536,2),('DETAIL',768,1280,1))):
            if x0<start or y0<start or x1>end or y1>end:continue
            size=128//factor;pp={}
            for stage in ('science','current'):
                means={b:data[stage+'-'+b].reshape(size,factor,size,factor).sum(axis=(1,3),dtype=np.float64)/(factor*factor) for b in 'gri'}
                projected={b:ProjectedBand(v.astype('f4'),np.ones(v.shape,bool),np.ones(v.shape,bool),{}) for b,v in means.items()}
                rgb,_=make_rgb_display(projected,np.ones((size,size),bool),transfer=transfer)
                data[stage+'-'+lev+'-rgb']=rgb
                p=(sd if stage=='science' else cd)/('M-82-'+lev.lower()+'.png');pin(p)
                saved=np.asarray(Image.open(p).convert('RGB'))[(y0-start)//factor:(y1-start)//factor,(x0-start)//factor:(x1-start)//factor]
                assert np.array_equal(rgb,saved)
                intensity=(means['i']+means['r']+means['g'])/3
                pp[stage]={'rgbSavedExact':True,'pixels':size*size,'negativeMeans':{b:int((v<0).sum()) for b,v in means.items()},
                    'nonpositiveIntensity':int((intensity<=0).sum()),'allBlackRGB':int((rgb==0).all(axis=2).sum()),
                    'meanRGB':rgb.astype('f8').mean(axis=(0,1)).tolist()}
            diff=data['current-'+lev+'-rgb'].astype('i2')-data['science-'+lev+'-rgb'].astype('i2')
            pp['changedRgbPixels']=int(np.any(diff!=0,axis=2).sum());pp['maximumChannelDelta']=int(abs(diff).max())
            record['levels'][lev]=pp
            sheet.paste(Image.fromarray(data['current-'+lev+'-rgb']).resize((256,256),Image.Resampling.NEAREST),(i*256,888))
            draw.text((i*256+4,864),'Actual current '+lev+'; frozen',fill='white')
        packet=OUT/(w['name']+'.npz');np.savez_compressed(packet,**data);record['saved']=bind(packet)
        image=OUT/(w['name']+'-actual-native-science-display.png');sheet.save(image);images.append(bind(image));records.append(record)
    before=list(pins.values());assert [bind(ROOT/v['path']) for v in before]==before
    report={'scope':__doc__,'inputsBefore':before,'inputsAfterExact':True,'records':records,'images':images,'nativeFramesReadForNewAnomaly':frames_read,
        'elapsedSeconds':time.perf_counter()-started,'cpuSeconds':time.process_time()-cpu,'peakMemory':'UNMEASURED',
        'sourceRequests':0,'wholeProjectionOrVarianceOrFitOrCoaddOrFilterOrRadiusSelectionRuns':0,'frozenRgbLevelFitCalls':0,
        'signedDiagnosticsMeaning':'Same per-band actual maximum absolute nMgy scale; positive orange/negative blue/unknown pink. No photometry, sky fit, probability or quality threshold.',
        'candidateChanges':False,'otherBusinessLogicEdited':False,'quality':'UNVERIFIED','ordinaryAdoption':False,'independentReview':'MISSING'}
    save(OUT/'result.json',report);print(json.dumps({k:v for k,v in report.items() if k not in ('inputsBefore','records')}),flush=True)
if __name__=='__main__':main()
