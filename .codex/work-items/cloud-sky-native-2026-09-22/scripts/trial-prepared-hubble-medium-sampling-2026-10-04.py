"""Recover existing mother samples at MEDIUM; no source work or feathering."""
from pathlib import Path
import hashlib,json,sys,time
ROOT=Path(__file__).resolve().parents[4]
PIPE=ROOT/'data-pipelines/deep-sky'
sys.path[:0]=[str(PIPE),str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from PIL import Image
from optical_publication_io import bound_bytes,decode_bound_npy,bound_file
from sdss_gri_tan import premultiplied_rgba_box
OUT=ROOT/'output/prepared-hubble-medium-sampling-1004-r1'
def save(n,v):
 with (OUT/n).open('x',encoding='utf-8') as f:json.dump(v,f,ensure_ascii=False,indent=2,allow_nan=False);f.write('\n')
def bind(p):return bound_file(p,root=ROOT)
def main():
 pubpath=ROOT/'output/hubble-m82-prepared-publication-1004-r2/manifest.json';pub=json.loads(pubpath.read_bytes())
 assert pub['publicationHash']=='c9b0592eb6409636739d58ed147266d7f0f1bf37bc4c91eeb0d99d78fccd667c'
 p=ROOT/'output/hubble-m82-prepared-coverage-1004-r1/master-rgba.npy'
 inputs=[pubpath,p,Path(__file__),PIPE/'optical_publication_io.py',PIPE/'sdss_gri_tan.py',PIPE/'prepared_optical_levels.py']
 before=[bind(p) for p in inputs];OUT.mkdir(exist_ok=False);save('inputs-before.json',before);(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
 start=time.perf_counter();cpu=time.process_time()
 raw,pin=bound_bytes(p,root=ROOT,max_bytes=17*1024*1024,expected=pub['master']['rgbaNpy']);a=decode_bound_npy(raw,shape=(2048,2048,4),dtype='uint8')
 assert hashlib.sha256(a.tobytes()).hexdigest()==pub['master']['rgba']['sha256']
 b=pub['levels']['MEDIUM']['masterCrop']['boundsXYExclusive'];assert b==[512,512,1536,1536]
 cropped=a[b[1]:b[3],b[0]:b[2]];new=premultiplied_rgba_box(cropped,1);assert np.array_equal(new,cropped)
 np.save(OUT/'medium-rgba.npy',new,allow_pickle=False);Image.fromarray(new).save(OUT/'medium.png')
 support=int((new[:,:,3]==255).sum());assert support==pub['levels']['MEDIUM']['geometricMasterSupportPixels']
 save('medium.json',{'pixels':1024,'fieldDegrees':pub['levels']['MEDIUM']['fieldDegrees'],'crpixFitsOneBased':512.5,
  'center':pub['center'],'orientation':pub['orientation'],'parentPublicationHash':pub['publicationHash'],'parentMasterNpy':pin,
  'cropBoundsXYExclusive':b,'boxFactor':1,'parent512BoxFactor':2,'scienceAvailability':'UNKNOWN',
  'geometricSupportPixels':support,'rgbaPayloadSha256':hashlib.sha256(new.tobytes()).hexdigest(),
  'method':'Existing shared premultiplied_rgba_box factor1 exact crop. Encoded RGB/geometry unchanged. Unsupported by old512 v1 publication.'})
 assert [bind(p) for p in inputs]==before;save('inputs-after.json',before)
 save('result.json',{'status':'EXACT_CACHED_MOTHER_1024_MEDIUM_CROP_NOT_PUBLISHED','png':bind(OUT/'medium.png'),'npy':bind(OUT/'medium-rgba.npy'),
  'metadata':bind(OUT/'medium.json'),'newSourceRgbDecodesProjectionsFits':0,'sourceNetworkRequests':0,
  'mediumRgbaLogicalBytes':new.nbytes,'geometricSupportPixels':support,'elapsedSeconds':time.perf_counter()-start,'cpuSeconds':time.process_time()-cpu,
  'limits':'No new fine/mother/grid/filter/colour/alpha processing or source decode. Geometry mask preserved, not science validity. Not publisher/API/cache/native/full quality/ordinary adoption.'})
 r=json.loads((OUT/'result.json').read_bytes());print(json.dumps({k:r[k] for k in ['status','png','mediumRgbaLogicalBytes','elapsedSeconds']}))
if __name__=='__main__':main()
