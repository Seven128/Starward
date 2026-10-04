"""Read saved TAN/PNG outputs; independent geometry/box oracle, no master generation."""
from pathlib import Path
import hashlib, json, math, struct, sys, zlib
ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from PIL import Image

OUT = ROOT/'output/prepared-rgb-tan-independent-1003-r1'
def sha(raw): return hashlib.sha256(raw).hexdigest()
def bind(p):
    p = Path(p).resolve(); raw = p.read_bytes()
    return {'path': p.relative_to(ROOT).as_posix() if p.is_relative_to(ROOT) else p.as_posix(), 'bytes':len(raw),'sha256':sha(raw)}
def load(p): return json.loads(Path(p).read_bytes())
def png(p):
    raw=Path(p).read_bytes(); assert raw[:8]==b'\x89PNG\r\n\x1a\n'
    pos=8; compressed=bytearray(); filters=[]; counts={}; end=False
    while pos<len(raw):
        n=struct.unpack('>I',raw[pos:pos+4])[0]; typ=raw[pos+4:pos+8]; data=raw[pos+8:pos+8+n]
        assert zlib.crc32(typ+data)&0xffffffff==struct.unpack('>I',raw[pos+8+n:pos+12+n])[0]
        counts[typ.decode()]=counts.get(typ.decode(),0)+1
        if typ==b'IHDR':
            w,h,bits,colour,compression,filtermethod,interlace=struct.unpack('>IIBBBBB',data)
            assert (bits,colour,compression,filtermethod,interlace)==(8,6,0,0,0)
        elif typ==b'IDAT': compressed.extend(data)
        elif typ==b'IEND': assert not data; end=True
        pos+=12+n
    assert end and pos==len(raw)
    inflated=zlib.decompress(compressed); stride=w*4; assert len(inflated)==h*(stride+1)
    rows=[]; prior=bytearray(stride)
    for y in range(h):
        f=inflated[y*(stride+1)]; filters.append(f); row=bytearray(inflated[y*(stride+1)+1:(y+1)*(stride+1)])
        assert f in range(5)
        for i in range(stride):
            a=row[i-4] if i>=4 else 0; b=prior[i]; c=prior[i-4] if i>=4 else 0
            if f==1: add=a
            elif f==2: add=b
            elif f==3: add=(a+b)//2
            elif f==4:
                q=a+b-c; da,db,dc=abs(q-a),abs(q-b),abs(q-c)
                add=a if da<=db and da<=dc else b if db<=dc else c
            else: add=0
            row[i]=(row[i]+add)&255
        rows.append(bytes(row)); prior=row
    return np.frombuffer(b''.join(rows),np.uint8).reshape(h,w,4), sorted(set(filters)), counts

def basis(ra,dec):
    r,d=math.radians(ra),math.radians(dec)
    return (np.array([math.cos(d)*math.cos(r),math.cos(d)*math.sin(r),math.sin(d)]),
            np.array([-math.sin(r),math.cos(r),0.]),
            np.array([-math.sin(d)*math.cos(r),-math.sin(d)*math.sin(r),math.cos(d)]))

def main():
    OUT.mkdir(exist_ok=False)
    freshdir=ROOT/'output/prepared-rgb-tan-generation-1003-r1'
    cachedir=ROOT/'output/prepared-rgb-tan-cached-validation-1003-r1'
    guarddir=ROOT/'output/prepared-rgb-tan-cache-guard-1003-r1'
    fresh,cached,guard=[load(d/'result.json') for d in (freshdir,cachedir,guarddir)]
    paths={Path(__file__), ROOT/'data-pipelines/deep-sky/prepared_rgb_tan.py', ROOT/'data-pipelines/deep-sky/test_prepared_rgb_tan.py',
           ROOT/'data-pipelines/deep-sky/sdss_source_stencil.py',ROOT/'data-pipelines/deep-sky/sdss_gri_tan.py',
           ROOT/'data-pipelines/deep-sky/prepared_rgb_observation.py', Path(sys.executable)}
    joins=[]
    for d in (freshdir,cachedir,guarddir):
        before,after=load(d/'inputs-before.json'),load(d/'inputs-after.json'); assert before==after
        rows=before if isinstance(before,list) else [r for v in before.values() for r in v]
        mismatch=[]
        for row in rows:
            p=Path(row['path']); p=p if p.is_absolute() else ROOT/p; paths.add(p)
            now=bind(p)
            if now!=row: mismatch.append({'record':row,'current':now})
        copies=[]
        for p in (d/'executed-owners').rglob('*.py'):
            paths.add(p); rel=p.relative_to(d/'executed-owners').as_posix()
            original=next(r for r in rows if r['path']==rel)
            actual=bind(p); assert actual['sha256']==original['sha256'] and actual['bytes']==original['bytes']
            copies.append(actual)
        for p in d.iterdir():
            if p.is_file(): paths.add(p)
        joins.append({'directory':d.relative_to(ROOT).as_posix(),'beforeAfterExact':True,'rows':len(rows),'currentDifferences':mismatch,'executionCopiesExact':copies})
    for d in (ROOT/'output/prepared-rgb-tan-execution-1003-r1',ROOT/'output/prepared-rgb-tan-cached-validation-execution-1003-r1',ROOT/'output/prepared-rgb-tan-cache-guard-execution-1003-r1'):
        paths.update(d.iterdir()); assert load(d/'result.json')['exitCode']==0
    source=ROOT/'output/hubble-m51-source-quality-trial-1002-r1/heic0506a.jpg'; paths.add(source)
    before=[bind(p) for p in sorted(paths)]
    master=np.load(ROOT/fresh['master']['path'],mmap_mode='r',allow_pickle=False)
    old=np.load(ROOT/fresh['historicalMaster']['path'],mmap_mode='r',allow_pickle=False)
    cachemaster=np.load(ROOT/cached['master']['path'],mmap_mode='r',allow_pickle=False)
    assert master.shape==(2048,2048,4) and master.dtype==np.uint8
    assert np.array_equal(master,old) and np.array_equal(master,cachemaster)
    assert (ROOT/fresh['master']['path']).read_bytes()==(ROOT/fresh['historicalMaster']['path']).read_bytes()==(ROOT/cached['master']['path']).read_bytes()
    md=fresh['masterMetadata']; assert md==cached['masterMetadata']
    assert sha(master.tobytes())==md['rgba']['sha256']==fresh['master']['rawArraySha256']
    a=master[:,:,3]; valid=a==255
    assert np.all((a==0)|valid) and np.all(master[:,:,:3][~valid]==0)
    count=int(valid.sum()); black=int((valid&(master[:,:,:3]==0).all(axis=2)).sum())
    assert count==md['geometricSupportPixels'] and black==md['supportedBlackPixels']
    assert md['scientificAvailability']==md['scientificValidity']=='UNKNOWN'
    levels=[]
    n=2048; pitch=2*math.tan(math.radians(md['fieldDegrees'])/2)/n
    for i,l in enumerate(('OVERVIEW','MEDIUM','DETAIL')):
        rec=fresh['levels'][l]; m=rec['metadata']; extent=n//2**i; start=(n-extent)//2; f=extent//512
        arr,filters,chunks=png(ROOT/rec['file']['path'])
        assert (ROOT/rec['file']['path']).read_bytes()==(ROOT/rec['historicalFile']['path']).read_bytes()==(ROOT/cached['levels'][l]['file']['path']).read_bytes()
        assert m==cached['levels'][l]['metadata']
        crop=master[start:start+extent,start:start+extent]
        block=crop.reshape(512,f,512,f,4).astype(np.uint64)
        weights=block[:,:,:,:,3]; total=weights.sum(axis=(1,3)); sums=(block[:,:,:,:,:3]*weights[:,:,:,:,None]).sum(axis=(1,3))
        expected=np.zeros((512,512,4),np.uint8)
        np.divide(sums,total[:,:,None],out=(rgb:=np.zeros(sums.shape,np.float64)),where=total[:,:,None]>0)
        expected[:,:,:3]=np.rint(rgb).astype(np.uint8); expected[:,:,3]=np.rint(total/(f*f)).astype(np.uint8)
        assert np.array_equal(expected,arr),l
        assert sha(arr.tobytes())==m['rgba']['sha256']
        assert m['masterCrop']['boundsXYExclusive']==[start,start,start+extent,start+extent] and m['masterCrop']['boxFactor']==f
        field=math.degrees(2*math.atan(math.tan(math.radians(md['fieldDegrees'])/2)*extent/n))
        assert field==m['fieldDegrees']; assert np.allclose(m['cdeltDeg'],[-math.degrees(pitch*f),math.degrees(pitch*f)],rtol=0,atol=1e-18)
        counts={'opaque':int((arr[:,:,3]==255).sum()),'partial':int(((arr[:,:,3]>0)&(arr[:,:,3]<255)).sum()),'zero':int((arr[:,:,3]==0).sum())}
        assert counts==m['alphaPixels']; assert int((crop[:,:,3]==255).sum())==m['geometricSourceMasterSupportPixels']
        levels.append({'level':l,'png':bind(ROOT/rec['file']['path']),'rgbaSha256':sha(arr.tobytes()),'wholeBoxByteExact':True,'historicalAndCachedPngByteExact':True,'alphaCounts':counts,'pngFilters':filters,'chunks':chunks,'crop':[start,start,start+extent,start+extent],'factor':f,'fieldDegrees':field})
    # Independent native source interpolation at bounded actual TAN target cells.
    with Image.open(source) as im:
        assert im.mode=='RGB' and im.size==(4000,2776); src=np.array(im)
    assert sha(src.tobytes())==md['sourceRgbSha256']
    g=md['sourceGeometry']; sn,se,sp=basis(*g['reference_value']); tn,te,tp=basis(md['center']['raDeg'],md['center']['decDeg'])
    theta=math.radians(g['rotation']); sxscale,syscale=map(math.radians,g['cdelt'])
    cd=np.array([[sxscale*math.cos(theta),-syscale*math.sin(theta)],[sxscale*math.sin(theta),syscale*math.cos(theta)]])
    inv=np.linalg.inv(cd); h,w=src.shape[:2]
    coords={(0,0),(0,n-1),(n-1,0),(n-1,n-1),(1024,1024),(768,768),(1279,1279),(512,512),(1535,1535)}
    # Deterministic support boundary neighbours, chosen only from saved alpha.
    for row in (512,768,1024,1279,1535):
        changes=np.flatnonzero(valid[row,1:]!=valid[row,:-1])
        for col in changes[:2]:
            coords.update((row,int(col)+dx) for dx in (-1,0,1,2) if 0<=int(col)+dx<n)
    samples=[]; mixed=0
    for y,x in sorted(coords):
        values=[]; flags=[]; details=[]
        for dy,dx in ((-.25,-.25),(-.25,.25),(.25,-.25),(.25,.25)):
            ray=tn-(x+dx-(n-1)/2)*pitch*te+((n-1)/2-y-dy)*pitch*tp
            den=ray@sn; plane=np.array([ray@se/den,ray@sp/den]); pix=inv@plane+np.array(g['crpix'])-1
            sx,sy=map(float,pix); ok=den>0 and 0<=sx<w-1 and 0<=sy<h-1; flags.append(ok)
            if ok:
                ix,iy=math.floor(sx),math.floor(sy); fx,fy=sx-ix,sy-iy
                v=(src[h-1-iy,ix].astype(float)*(1-fx)*(1-fy)+src[h-1-iy,ix+1].astype(float)*fx*(1-fy)+src[h-2-iy,ix].astype(float)*(1-fx)*fy+src[h-2-iy,ix+1].astype(float)*fx*fy).astype(np.float32)
            else: v=np.zeros(3,np.float32)
            values.append(v.astype(np.float64)); details.append({'dy':dy,'dx':dx,'sourceXY': [sx,sy],'fullFourNeighbourGeometry':bool(ok)})
        supplied=all(flags); mixed+=int(any(flags) and not supplied)
        rgba=list(np.rint(np.sum(values,axis=0)/4).astype(np.uint8)) if supplied else [0,0,0]
        rgba=[int(v) for v in rgba]+[255 if supplied else 0]
        assert rgba==master[y,x].tolist(),(y,x,rgba,master[y,x].tolist())
        samples.append({'targetYX':[y,x],'rgba':rgba,'offsets':details,'commonAllFourOffsets':supplied})
    assert mixed>0,'bounded boundary sample must detect AND-vs-OR meaning'
    after=[bind(p) for p in sorted(paths)]; assert before==after
    record={'status':'PASS_BOUNDED_INDEPENDENT_PREPARED_TAN_READBACK','productionOwner':bind(ROOT/'data-pipelines/deep-sky/prepared_rgb_tan.py'),
            'inputs':joins,'fullMasterFileExactOldAndCached':True,'masterRawSha256':sha(master.tobytes()),'masterSupportPixels':count,'masterSupportedBlackPixels':black,
            'levels':levels,'independentDirectTanNativeSamples':samples,'mixedOffsetBoundarySamples':mixed,
            'cacheGuardActualBeforeAndCurrent':guard,'bindingsBeforeAfterExact':True,'files':len(before),
            'operations':{'networkRequests':0,'gpuRuns':0,'masterGenerations':0,'lodGenerations':0,'independentSourceJpegReadDecodes':1},
            'scope':'Independent full saved-output byte/PNG/box/count/metadata readback and bounded direct 3D TAN/source-neighbour oracle. Not physical AVM accuracy, science quality, continuous footprint/edge correctness, native, total memory/cost, adopted publication or ordinary runtime acceptance.'}
    (OUT/'result.json').write_text(json.dumps(record,ensure_ascii=False,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    (OUT/'bindings.json').write_text(json.dumps({'before':before,'after':after},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    print(json.dumps({'result':bind(OUT/'result.json'),'samples':len(samples),'mixedOffsetBoundarySamples':mixed,'bindingFiles':len(before),'currentDifferences':[{'directory':j['directory'],'paths':[m['record']['path'] for m in j['currentDifferences']]} for j in joins]}))

if __name__=='__main__': main()
