"""Independent six-file raw FITS admission preparation. No sampler/network."""
from pathlib import Path
import hashlib
import io
import json
import math
import re
import sys
import warnings

ROOT=Path(__file__).resolve().parents[4]
sys.path.insert(0,str(ROOT/'output/allwise-w3-atlas-0929/python-deps'))
import numpy as np
from astropy.io import fits

OUTPUT=ROOT/'output/allwise-w3-m82-source-independent-1002-r1'
assert not OUTPUT.exists()
inputs=[]
def binding(path):
    raw=path.read_bytes()
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(raw),
            'sha256':hashlib.sha256(raw).hexdigest()}
def admit(path,expected=None):
    result=binding(path)
    if expected:
        assert(result['bytes'],result['sha256'])==(expected['bytes'],expected['sha256'])
    inputs.append(result)
    return path
def load(path):return json.loads(admit(path).read_text(encoding='utf8'))
acquisition=load(ROOT/'output/allwise-w3-m82-detail-acquisition-1002-r1/acquisition.json')
plan=load(ROOT/'output/allwise-w3-m82-source-0930/candidate-detail/candidate-plan.json')
old=load(ROOT/'output/allwise-w3-m82-source-0930/candidate-detail/candidate-result.json')
properties_path=ROOT/'output/allwise-w3-m82-source-0930/properties'
properties_raw=admit(properties_path).read_bytes()
assert hashlib.sha256(properties_raw).hexdigest()==acquisition['sourcePropertiesSha256']==old['sourcePropertiesSha256']
properties={line.split('=',1)[0].strip():line.split('=',1)[1].strip()for line in properties_raw.decode().splitlines()if '='in line and not line.startswith('#')}
assert properties['hips_frame']=='equatorial'and properties['hips_order']=='8'and properties['hips_tile_width']=='512'
profile=plan['profiles'][0]
assert profile==acquisition['detailProfile']
assert profile['level']=='DETAIL'and profile['pixels']==512 and profile['fieldDegrees']==.25 and profile['sourceOrder']==8
pixels=(121705,121707,121708,121710,121793,121796)
expected_paths=[f'Norder8/Dir120000/Npix{pixel}.fits'for pixel in pixels]
assert profile['tiles']==expected_paths
assert sorted(x['path']for x in acquisition['sourceFiles'])==expected_paths
sources=[]
for item in acquisition['sourceFiles']:
    assert item['state']=='CHECKED'and item['receipt']['completeArrayReceived']is True
    assert item['url']=='https://irsa.ipac.caltech.edu/data/hips/CDS/AllWISE/W3/'+item['path']
    if item['acquisition']=='ONE_CANONICAL_REQUEST':
        assert item['httpStatus']==200 and item['actualFinalUrl']==item['url']and item['automaticRetries']==0
    else:
        old_item=next(x for x in old['sourceFiles']if x['path']==item['path'])
        assert(item['bytes'],item['sha256'])==(old_item['bytes'],old_item['sha256'])
    path=admit(ROOT/item['raw']['path'],item['raw'])
    raw=path.read_bytes()
    assert len(raw)==item['bytes']and hashlib.sha256(raw).hexdigest()==item['sha256']
    cards=[]
    for offset in range(0,min(len(raw),28800),80):
        card=raw[offset:offset+80].decode('ascii')
        cards.append(card)
        if card[:8].strip()=='END':break
    end=next(i for i,card in enumerate(cards)if card[:8].strip()=='END')
    header_bytes=math.ceil((end+1)*80/2880)*2880
    header={card[:8].strip():card[10:].split('/',1)[0].strip()for card in cards[:end]if card[8:10]=='= '}
    assert header['SIMPLE']=='T'and int(header['BITPIX'])==-32
    assert int(header['NAXIS'])==2 and int(header['NAXIS1'])==int(header['NAXIS2'])==512
    assert not any(key in header for key in ['BSCALE','BZERO'])
    scalar_bytes=512*512*4
    assert len(raw)>=header_bytes+scalar_bytes
    payload=raw[header_bytes:header_bytes+scalar_bytes]
    direct=np.frombuffer(payload,dtype='>f4').reshape(512,512)
    with warnings.catch_warnings(record=True)as notices:
        with fits.open(io.BytesIO(raw),memmap=False)as hdus:
            assert len(hdus)==1 and hdus[0].data.shape==(512,512)
            assert hdus[0].data.dtype.str=='>f4'
            assert hdus[0].data.tobytes(order='C')==payload
            astropy_header=dict(hdus[0].header)
    expected_length=header_bytes+math.ceil(scalar_bytes/2880)*2880
    missing_padding=max(0,expected_length-len(raw))
    assert missing_padding==item['receipt']['missingEndPaddingBytes']==2624
    nonfinite=~np.isfinite(direct)
    assert int(nonfinite.sum())==item['nonfinite']
    finite=direct[~nonfinite]
    sources.append({'identityPath':item['path'],'encoded':binding(path),
        'scalarCount':int(direct.size),'shape':[512,512],'dtype':direct.dtype.str,
        'rawPayloadExactlyEqualsAstropyPrimary':True,'scalarPayloadSha256':hashlib.sha256(payload).hexdigest(),
        'header':astropy_header,'headerBytes':header_bytes,'scientificPayloadBytes':scalar_bytes,
        'missingFitsEndPaddingBytes':missing_padding,'readerWarnings':[str(x.message)for x in notices],
        'finite':int(np.isfinite(direct).sum()),'nan':int(np.isnan(direct).sum()),
        'positiveInfinity':int(np.isposinf(direct).sum()),'negativeInfinity':int(np.isneginf(direct).sum()),
        'zero':int((direct==0).sum()),'negativeFinite':int((finite<0).sum()),
        'finitePercentiles0_1_50_99p7_100':np.percentile(finite,[0,1,50,99.7,100]).tolist(),
        'nonfiniteXY':np.stack(np.where(nonfinite)[::-1],axis=-1).tolist(),
        'sourceFrame':'equatorial from properties, not per-tile WCS',
        'sourceUnit':'UNKNOWN_NO_BUNIT','scientificQuality':'UNVERIFIED_NO_ARTIFACT_MASK'})
assert sum(x['encoded']['bytes']for x in sources)==acquisition['checkedSourceBytes']==6308736
assert sum(x['nan']for x in sources)==24 and all(x['positiveInfinity']==x['negativeInfinity']==0 for x in sources)
manifest=load(ROOT/'workers/miniapp-api/assets/deep-sky/manifest.json')
entry=next(x for x in manifest['entries']if x['objectRef']=='M:82')
assert entry['center']==plan['center']
assert entry['levels']['DETAIL']['pixels']==512 and entry['levels']['DETAIL']['fieldDegrees']==.25
preserved=load(ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json')
assert all(binding(ROOT/x['path'])['sha256']==x['sha256']for x in preserved)
admit(Path(__file__).resolve())
assert all(binding(ROOT/x['path'])==x for x in inputs)
OUTPUT.mkdir()
result={'inputs':inputs,'profile':profile,'sources':sources,'sixTileSetIdentityClosed':True,
    'completeRawScientificScalarArrays':True,'rawSourceBytes':6308736,'sourceNonfiniteScalarCount':24,
    'sourceBindingsUnchanged':True,'preservedSixUnchanged':True,
    'scope':'Only actual cached six-tile source preparation. Target availability/WCS/science sampler not reviewed until owner freeze. No sampler invocation, new expected PNG, source request, science/output processing or adoption. FITS metadata has no tile ID/WCS/BUNIT; identity comes from hash-bound acquisition canonical URL/path plus survey properties. Overview/medium nine unacquired inputs and exact old CDS JPEG science coverage remain unknown.'}
(OUTPUT/'review.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8')
print(json.dumps({'binding':binding(OUTPUT/'review.json'),'sources':[{'path':x['identityPath'],'finite':x['finite'],'nan':x['nan'],'zero':x['zero'],'negative':x['negativeFinite']}for x in sources]}))
