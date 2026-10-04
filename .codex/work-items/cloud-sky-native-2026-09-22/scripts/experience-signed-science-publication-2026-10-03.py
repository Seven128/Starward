"""Explicit local v3 from preserved admitted science; not ordinary adoption."""
from pathlib import Path
import hashlib
import json
import sys
ROOT=Path(__file__).resolve().parents[4]
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import publish_sdss_science as publisher
import sdss_gri_tan as owner
def bind(path):
    raw=path.read_bytes()
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
OUT=ROOT/'output/signed-science-publication-1003-r1'
verified=publisher.verify_cached_candidate(ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2',root=ROOT,
    candidate_sha256='73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52',
    binding_sha256='bc2af0aafc316986c6e55ae75a144074421b930dad2273c001809803585c087d')
receipt=publisher.publish_verified_candidate(verified,OUT,root=ROOT,
    publication_id='sdss-dr17-m51-signed-mean-candidate-20261003',
    legacy_manifest=ROOT/'workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json',
    pyramid_kind=owner.SCIENCE_PYRAMID_KIND,display_transfer=owner.FixedDisplayTransfer(stretch=.5,Q=10))
manifest=json.loads((OUT/'manifest.json').read_bytes())
pilot=json.loads((ROOT/'output/signed-science-lod-1003-r1/result.json').read_bytes())
for row in pilot['records']:
    asset=manifest['levels'][row['level']]
    assert asset['sha256']==row['png']['sha256'] and asset['bytes']==row['png']['bytes']
    assert 'masterRgbSha256' not in asset
result={'status':'LOCAL_OPT_IN_V3_NOT_QUALITY_ADOPTED','manifest':bind(OUT/'manifest.json'),
    'writerReceipt':bind(OUT/'writer-receipt.json'),'publicationHash':receipt['publicationHash'],
    'exactPriorSignedPngs':True,'defaultRegistered':False,
    'script':bind(Path(__file__)),'scope':'New order uses new immutable version; upstream sources and legacy offers preserved. No cloud/native/full quality/independent review acceptance.'}
(OUT/'result.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
