"""One new 1024 fine footprint, through the existing source/TAN owner.

Not a three-tier publication or an admitted old v1 manifest. No sharpening,
background/colour fitting or fabricated detail. Old source/mothers stay frozen.
"""
from pathlib import Path
from dataclasses import fields
import hashlib,io,json,math,sys,time
ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
PIPE=ROOT/'data-pipelines/deep-sky'
sys.path[:0]=[str(PIPE),str(ROOT/'output/pyavm-metadata-trial-1002-r1/lib'),str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from PIL import Image
from prepared_rgb_observation import PreparedRgbSource,ByteIdentity,load_prepared_rgb_observation
from prepared_rgb_tan import build_prepared_rgb_tan_master,OFFSETS_DY_DX
from sdss_gri_tan import target_tan
OUT=ROOT/'output/prepared-hubble-fine-sampling-1004-r1'
SRC=ROOT/'output/hubble-m82-prepared-source-1004-r1'
def bind(p):
 b=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def save(name,value):
 with (OUT/name).open('x',encoding='utf-8') as f:json.dump(value,f,ensure_ascii=False,indent=2,allow_nan=False);f.write('\n')
def main():
 measured=ROOT/'output/prepared-sampling-applicability-1004-r1/result.json'
 sampling=json.loads(measured.read_bytes());assert sampling['currentFineScreenPixelsPerOutputPixel']>1.8
 oldmeta=ROOT/'output/hubble-m82-prepared-coverage-1004-r1/master.json'
 old=json.loads(oldmeta.read_bytes())
 pubpath=ROOT/'output/hubble-m82-prepared-publication-1004-r2/manifest.json'
 pub=json.loads(pubpath.read_bytes());assert pub['publicationHash']=='c9b0592eb6409636739d58ed147266d7f0f1bf37bc4c91eeb0d99d78fccd667c'
 source_fields=dict(old['source']);source_fields['jpeg']=ByteIdentity(**source_fields['jpeg']);source_fields['xmp']=ByteIdentity(**source_fields['xmp'])
 assert set(source_fields)=={f.name for f in fields(PreparedRgbSource)}
 source=PreparedRgbSource(**source_fields)
 inputs=[SRC/'heic0604a.jpg',SRC/'embedded-xmp.xml',oldmeta,pubpath,measured,Path(__file__)]
 inputs += [PIPE/n for n in ['prepared_rgb_observation.py','prepared_rgb_tan.py','sdss_source_stencil.py','sdss_gri_tan.py']]
 before=[bind(p) for p in inputs]
 OUT.mkdir(exist_ok=False);save('inputs-before.json',before);(OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
 start=time.perf_counter();cpu=time.process_time()
 observation=load_prepared_rgb_observation(inputs[0],inputs[1],source,max_encoded_bytes=12*1024*1024,max_decoded_pixels=4000*3116)
 assert hashlib.sha256(observation.rgb_bytes).hexdigest()==old['sourceRgbSha256']
 fine=build_prepared_rgb_tan_master(observation,object_ref='M:82',center=pub['center'],pixels=1024,
      field_degrees=pub['levels']['DETAIL']['fieldDegrees'],chunk_rows=64)
 assert fine.geometric_support_pixels==1024**2
 np.save(OUT/'fine-rgba.npy',fine.rgba_top_first,allow_pickle=False);save('fine.json',fine.metadata())
 Image.fromarray(fine.rgba_top_first).save(OUT/'fine.png')
 # Save a bounded set of actual source neighbours, for independent saved-value
 # arithmetic readback without decoding the source or projecting a whole grid again.
 target=target_tan(pub['center'],1024,fine.field_degrees);wcs=observation.geometry.new_wcs()
 witnesses=[]
 for y,x in [(0,0),(0,1023),(1023,0),(1023,1023),(512,512),(480,490),(350,610),(700,420),(180,760),(900,120),(256,256),(768,768)]:
  samples=[]
  for dy,dx in OFFSETS_DY_DX:
   ra,dec=target.all_pix2world(x+dx,1023-y-dy,0);sx,sy=wcs.all_world2pix(ra,dec,0)
   ix,iy=math.floor(sx),math.floor(sy);neighbours=[]
   for yy,xx in [(iy,ix),(iy,ix+1),(iy+1,ix),(iy+1,ix+1)]:
    neighbours.append(observation.rgb_top_first[observation.rgb_top_first.shape[0]-1-yy,xx].tolist())
   samples.append({'dy':dy,'dx':dx,'sourceFitsXY0':[float(sx),float(sy)],'neighboursOrder':'00,10,01,11 in FITS coordinates','encodedRgb':neighbours})
  witnesses.append({'targetTopXY':[x,y],'actualRgba':fine.rgba_top_first[y,x].tolist(),'quadrature':samples})
 save('bounded-native-sampling-witnesses.json',witnesses)
 assert [bind(p) for p in inputs]==before;save('inputs-after.json',before)
 save('result.json',{'status':'NEW_SOURCE_SAMPLED_1024_FINE_FOOTPRINT_NOT_PUBLISHED_OR_ADOPTED',
  'sourceRgbDecodes':1,'newFineReprojections':1,'oldMothersOrTiersRecomputed':0,'sourceNetworkRequests':0,
  'rgba':bind(OUT/'fine-rgba.npy'),'png':bind(OUT/'fine.png'),'metadata':bind(OUT/'fine.json'),
  'sourceDecodedRgbLogicalBytes':len(observation.rgb_bytes),'fineRgbaLogicalBytes':len(fine.rgba_bytes),
  'oldFinePixels':512,'newFinePixels':1024,'fieldDegrees':fine.field_degrees,'oldPublicationHash':pub['publicationHash'],
  'geometricSupportPixels':fine.geometric_support_pixels,'scienceAvailability':'UNKNOWN','registration':fine.source_geometry.accuracy,
  'elapsedSeconds':time.perf_counter()-start,'cpuSeconds':time.process_time()-cpu,
  'scope':'Existing admitted cached JPEG and exact unchanged AVM; one new fine grid, not old-v1 publication. No full 4096 mother, upscaling of old 512 raster, background/tone/PSF/noise work, native/quality/capacity acceptance.'})
 result=json.loads((OUT/'result.json').read_bytes());print(json.dumps({k:result[k] for k in ['status','png','fineRgbaLogicalBytes','elapsedSeconds','cpuSeconds']}))
if __name__=='__main__':main()
