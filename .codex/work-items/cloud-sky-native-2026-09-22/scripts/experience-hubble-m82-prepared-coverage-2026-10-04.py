"""Use current Prepared owners once on cached M82; coverage, not adoption."""
from pathlib import Path
from dataclasses import asdict
import hashlib
import json
import math
import sys
import time
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[4]
TASK=ROOT/'.codex/work-items/cloud-sky-native-2026-09-22'
PIPE=ROOT/'data-pipelines/deep-sky'
sys.path[:0]=[str(PIPE),str(ROOT/'output/pyavm-metadata-trial-1002-r1/lib'),str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from PIL import Image
from prepared_rgb_observation import PreparedRgbSource,ByteIdentity,load_prepared_rgb_observation
from prepared_rgb_tan import build_prepared_rgb_tan_master,prepared_rgb_tan_products

SRC=ROOT/'output/hubble-m82-prepared-source-1004-r1'
OUT=ROOT/'output/hubble-m82-prepared-coverage-1004-r1'
CREDIT='NASA, ESA and the Hubble Heritage Team (STScI/AURA). Acknowledgment: J. Gallagher (University of Wisconsin), M. Mountain (STScI) and P. Puxley (NSF).'

def bind(p):
    b=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
def save(name,value):
    with (OUT/name).open('x',encoding='utf-8') as f:json.dump(value,f,ensure_ascii=False,indent=2,allow_nan=False);f.write('\n')

def main():
    OUT.mkdir(exist_ok=False)
    (OUT/'executed-script.py').write_bytes(Path(__file__).read_bytes())
    inputs=[SRC/n for n in ['heic0604a.jpg','embedded-xmp.xml','source-page.html','rights-page.html']]
    inputs += [PIPE/n for n in ['prepared_rgb_observation.py','prepared_rgb_tan.py','sdss_source_stencil.py','sdss_gri_tan.py']]
    descriptor=ROOT/'workers/miniapp-api/assets/deep-sky/sdss-m82/manifest.json'
    inputs += [descriptor,Path(__file__)]
    before=[bind(p) for p in inputs];save('inputs-before.json',before)
    assert before[0]['sha256']=='a552168b5cad1f87fb552bed2637cedbd70fcae98bc5f2c7bcf27af95c9a1286'
    source=PreparedRgbSource('heic0604a',ByteIdentity(before[0]['bytes'],before[0]['sha256']),ByteIdentity(before[1]['bytes'],before[1]['sha256']),
        'https://cdn.esahubble.org/archives/images/publicationjpg/heic0604a.jpg','https://esahubble.org/images/heic0604a/',CREDIT,
        'Creative Commons Attribution 4.0 International License','https://creativecommons.org/licenses/by/4.0/','https://esahubble.org/copyright/',
        'Historical Hubble ACS B/V/H-alpha/I published composite; B blue, V green, H-alpha and I red; encoded RGB, not SDSS gri or calibrated flux')
    start=time.perf_counter();cpu=time.process_time()
    obs=load_prepared_rgb_observation(inputs[0],inputs[1],source,max_encoded_bytes=12*1024*1024,max_decoded_pixels=4000*3116)
    assert obs.geometry.decoded_shape_width_height==(4000,3116)
    assert hashlib.sha256(obs.rgb_bytes).hexdigest()=='5927e6c475c9abcd4019db4d4637ef1369cf5abd97cb98d2e423382b99a21619'
    old=json.loads(descriptor.read_bytes());field=old['levels']['OVERVIEW']['fieldDegrees']
    master=build_prepared_rgb_tan_master(obs,object_ref='M:82',center=old['center'],pixels=2048,field_degrees=field,chunk_rows=64)
    np.save(OUT/'master-rgba.npy',master.rgba_top_first,allow_pickle=False)
    save('master.json',master.metadata())
    products=prepared_rgb_tan_products(master)
    rows=[]
    for product in products:
        name=product.level.lower()+'.png';(OUT/name).write_bytes(product.png_bytes)
        a=product.rgba_top_first;meta=product.metadata();meta['file']=name
        meta['geometricSupportedFraction']=product.geometric_source_master_support_pixels/product.total_source_master_crop_pixels
        meta['edgeAlphaNonzero']={k:int(v.sum()) for k,v in {'top':a[0,:,3]>0,'bottom':a[-1,:,3]>0,'left':a[:,0,3]>0,'right':a[:,-1,3]>0}.items()}
        with Image.open(OUT/name) as image:assert image.convert('RGBA').tobytes()==product.rgba_bytes
        rows.append(meta)
    # Nominal rectangle footprint and known catalog centre in original source pixels.
    wcs=obs.geometry.new_wcs();w,h=obs.geometry.decoded_shape_width_height
    corners=wcs.all_pix2world([[0,0],[w-1,0],[w-1,h-1],[0,h-1]],0)
    centre=wcs.all_world2pix([[old['center']['raDeg'],old['center']['decDeg']]],0)[0]
    # Independently reconstruct declared TAN rotation for corners and centre;
    # this checks metadata arithmetic, not astrometric accuracy against stars.
    g=obs.geometry;theta=math.radians(g.rotation);a0,d0=map(math.radians,g.reference_value);errors=[]
    for x,y in [[0,0],[w-1,0],[w-1,h-1],[0,h-1],list(centre)]:
        dx,dy=x+1-g.crpix[0],y+1-g.crpix[1]
        xi=math.radians(g.cdelt[0]*math.cos(theta)*dx-g.cdelt[1]*math.sin(theta)*dy)
        eta=math.radians(g.cdelt[0]*math.sin(theta)*dx+g.cdelt[1]*math.cos(theta)*dy)
        denom=math.cos(d0)-eta*math.sin(d0)
        predicted=[math.degrees(a0+math.atan2(xi,denom))%360,math.degrees(math.atan2(math.sin(d0)+eta*math.cos(d0),math.hypot(xi,denom)))]
        actual=wcs.all_pix2world([[x,y]],0)[0];errors.append(float(np.max(np.abs(actual-predicted))))
    assert max(errors)<1e-10
    result={'state':'PREPARED_CANDIDATE_NOT_ADOPTED','source':asdict(source),'geometry':asdict(g),'bands':obs.spectral_bandpass,
        'sourcePixels':[w,h],'sourceDecodedRgbBytes':len(obs.rgb_bytes),'sourceRgbaEquivalentBytes':w*h*4,
        'sourceFootprintNominalCornersRaDec':corners.tolist(),'catalogCentreFitsXY':centre.tolist(),
        'nominalTanArithmeticMaxDegreeDifference':max(errors),'levels':rows,
        'elapsedSeconds':time.perf_counter()-start,'cpuSeconds':time.process_time()-cpu,
        'imageQuality':'UNVERIFIED','registration':'UNVERIFIED_APPROXIMATE_PUBLISHER_AVM','scienceAvailability':'UNKNOWN',
        'limits':['rectangular JPEG support is not full scientific coverage','no new tone mapping, fitting, masking or source reconstruction',
                  'no production/default registry or runtime acceptance','same existing three-level field geometry; limited source support retained']}
    save('result.json',result)
    after=[bind(p) for p in inputs];assert after==before;save('inputs-after.json',after)
    print(json.dumps({'state':result['state'],'elapsedSeconds':result['elapsedSeconds'],'levels':[{'level':x['level'],'fieldDegrees':x['fieldDegrees'],'coverage':x['geometricSupportedFraction'],'bytes':x['bytes']} for x in rows]}))

if __name__=='__main__':main()
