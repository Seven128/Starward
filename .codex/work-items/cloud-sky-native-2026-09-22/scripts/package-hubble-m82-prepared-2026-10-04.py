"""Recover a new, honest cached-validation receipt and use the existing publisher.

The original producer failed after saving its master/PNGs. Nothing here changes
that status. Re-admit the bound source, validate saved pixels, never reproject.
"""
from dataclasses import asdict
from pathlib import Path
import hashlib
import json
import shutil
import sys

ROOT = Path(__file__).resolve().parents[4]
PIPE = ROOT / 'data-pipelines/deep-sky'
sys.path[:0] = [str(PIPE), str(ROOT/'output/pyavm-metadata-trial-1002-r1/lib'),
               str(ROOT/'output/allwise-w3-atlas-0929/python-deps')]
import numpy as np
from prepared_rgb_observation import ByteIdentity, PreparedRgbSource, load_prepared_rgb_observation
from prepared_rgb_tan import PreparedRgbTanMaster, prepared_rgb_tan_products
from publish_prepared_optical import verify_cached_prepared_generation, publish_verified_prepared_generation

OLD = ROOT/'output/hubble-m82-prepared-coverage-1004-r1'
SRC = ROOT/'output/hubble-m82-prepared-source-1004-r1'
OUT = ROOT/'output/hubble-m82-prepared-validation-1004-r1'
PUB = ROOT/'output/hubble-m82-prepared-publication-1004-r1'

def bind(path):
    data = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix() if path.is_relative_to(ROOT) else path.as_posix(),
            'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

def save(path, value):
    with path.open('x', encoding='utf-8') as f:
        json.dump(value, f, ensure_ascii=False, indent=2, allow_nan=False)
        f.write('\n')

def main():
    OUT.mkdir(exist_ok=False)
    shutil.copyfile(__file__, OUT/'executed-script.py')
    source_files = [SRC/n for n in ['heic0604a.jpg','embedded-xmp.xml','source-page.html','rights-page.html']]
    inputs = [Path(__file__).resolve(), Path(sys.executable)] + list(OLD.glob('*')) + [PIPE/n for n in
        ['prepared_rgb_observation.py','prepared_rgb_tan.py','sdss_gri_tan.py','sdss_source_stencil.py',
         'publish_prepared_optical.py','optical_publication_io.py']]
    protected = json.loads((ROOT/'.codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json').read_bytes())
    inputs += [ROOT/r['path'] for r in protected]
    def inventory():
        return {'files': [bind(p) for p in inputs], 'source': [bind(p) for p in source_files],
                'historicalNominal': [], 'allPublishedAssets': []}
    before = inventory()
    save(OUT/'inputs-before.json', before)
    for row in protected:
        assert bind(ROOT/row['path'])['sha256'] == row['sha256']
    meta = json.loads((OLD/'master.json').read_bytes())
    fields = dict(meta['source'])
    fields['jpeg'], fields['xmp'] = ByteIdentity(**fields['jpeg']), ByteIdentity(**fields['xmp'])
    source = PreparedRgbSource(**fields)
    obs = load_prepared_rgb_observation(source_files[0], source_files[1], source,
        max_encoded_bytes=12*1024*1024, max_decoded_pixels=4000*3116)
    assert json.loads(json.dumps(asdict(obs.geometry))) == meta['sourceGeometry']
    assert hashlib.sha256(obs.rgb_bytes).hexdigest() == meta['sourceRgbSha256']
    assert hashlib.sha256(obs.parser_xmp).hexdigest() == meta['sourceParserXmpSha256']
    (OUT/'parser-normalized-xmp.xml').write_bytes(obs.parser_xmp)
    admission = {'status':'PASSED_BOUNDED_OFFLINE_SOURCE_ADMISSION','requests':0,
        'source':asdict(source), 'geometry':asdict(obs.geometry),
        'decodedRgb':{'bytes':len(obs.rgb_bytes),'sha256':meta['sourceRgbSha256'],'shape':[3116,4000,3]},
        'normalization':{'parserXml':bind(OUT/'parser-normalized-xmp.xml')},
        'spectralBandpass':obs.spectral_bandpass, 'libraries':dict(obs.library_versions),
        'scientificAvailability':'UNKNOWN', 'rightsApproval':'NOT_IMPLIED_BY_ADAPTER'}
    save(OUT/'source-admission.json', admission)
    array = np.load(OLD/'master-rgba.npy', allow_pickle=False)
    assert array.shape == (2048,2048,4) and array.dtype == np.uint8
    assert hashlib.sha256(array.tobytes()).hexdigest() == meta['rgba']['sha256']
    master = PreparedRgbTanMaster(meta['objectRef'],meta['center']['raDeg'],meta['center']['decDeg'],
        2048,meta['fieldDegrees'],array.tobytes(),source,obs.geometry,meta['sourceRgbSha256'],
        meta['sourceRawXmpSha256'],meta['sourceParserXmpSha256'],tuple(meta['sourceLibraryVersions'].items()),
        meta['geometricSupportPixels'],meta['supportedBlackPixels'],meta['sampling']['chunkRows'])
    assert json.loads(json.dumps(master.metadata())) == meta
    shutil.copyfile(OLD/'master-rgba.npy',OUT/'master-rgba.npy')
    levels = {}
    for product in prepared_rgb_tan_products(master):
        name = product.level.lower()+'.png'
        assert (OLD/name).read_bytes() == product.png_bytes
        shutil.copyfile(OLD/name,OUT/name)
        levels[product.level] = {'file':bind(OUT/name),'metadata':product.metadata()}
    after = inventory()
    assert before == after
    save(OUT/'inputs-after.json',after)
    save(OUT/'result.json',{'status':'PASSED_BOUNDED_CACHED_MASTER_VALIDATION','requests':0,
        'source':asdict(source),'sourceAdmission':bind(OUT/'source-admission.json'),
        'master':bind(OUT/'master-rgba.npy')|{'rawArraySha256':meta['rgba']['sha256']},
        'masterMetadata':meta,'levels':levels,
        'savedOutputReadback':bind(OLD/'saved-output-readback.json'),
        'originalProducerStatus':'FAILED_AFTER_PNG_SAVE_AT_REPORT_ATTRIBUTE',
        'sourceDecodes':1,'masterReprojections':0,
        'scope':'New cached validation only. Earlier failure preserved. No quality, registration, rights or runtime acceptance.'})
    verified = verify_cached_prepared_generation(OUT,root=ROOT,
        result_sha256=bind(OUT/'result.json')['sha256'],
        before_sha256=bind(OUT/'inputs-before.json')['sha256'],
        after_sha256=bind(OUT/'inputs-after.json')['sha256'])
    receipt = publish_verified_prepared_generation(verified,PUB,root=ROOT,
        publication_id='esa-hubble-heic0604a-m82.v20261004-candidate')
    print(json.dumps({'status':receipt['status'],'publicationHash':receipt['publicationHash'],
        'manifest':bind(PUB/'manifest.json'),'qualityAdopted':False,'runtimeRegistered':False}))

if __name__ == '__main__':
    main()
