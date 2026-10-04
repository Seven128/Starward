"""All new native fpM inputs via fixed owner and independent vector raster."""
from pathlib import Path
import gzip
import hashlib
import io
import json
import sys

ROOT=Path(__file__).resolve().parents[4]
GEN=ROOT/'output/sdss-m82-quality-inputs-1004-r1'
OUT=ROOT/'output/sdss-m82-fpm-frame-intersection-1004-r1'
sys.path[:0]=[str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from astropy.io import fits
import sdss_frame_quality as owner


def bind(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        while block:=f.read(1048576):h.update(block)
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':path.stat().st_size,'sha256':h.hexdigest()}


def main():
    assert OUT.is_dir() and not (OUT/'result.json').exists()
    (OUT/'executed-reader.py').write_bytes(Path(__file__).read_bytes())
    source=json.loads((GEN/'result.json').read_bytes())
    checked=[];recovered=[];pixel_columns=np.arange(2048)
    for record in source['sourceRecords']:
        if not record['filename'].startswith('fpM'):continue
        path=ROOT/record['raw']['path'];assert bind(path)==record['raw']
        expected={**record['identity'],'sourceUrl':record['url'],'bytes':record['bytes'],'sha256':record['sha256']}
        result=owner.read_cached_fpm(path,expected,max_uncompressed_bytes=16*1024*1024)
        # Independently include a pixel iff a source inclusive interval covers
        # its coordinate, after metadata remains checked by the owner. No use
        # of the owner's clipping slices or its stencil/raster helpers.
        reference=np.zeros((1489,2048),dtype=np.uint16)
        with fits.open(io.BytesIO(gzip.decompress(path.read_bytes())),memmap=False) as hdus:
            for plane,hdu in enumerate(hdus[1:11]):
                for row in hdu.data:
                    spans=np.frombuffer(np.asarray(row['s'],dtype=np.uint8).tobytes(),dtype='>i2').reshape(-1,3)
                    for y,left,right in spans:
                        native_rows=np.flatnonzero(np.arange(1489)==int(y))
                        if native_rows.size:
                            covered=(pixel_columns>=int(left))&(pixel_columns<=int(right))
                            reference[int(native_rows[0]),covered] |= np.uint16(1<<plane)
        assert np.array_equal(reference,result.flags)
        assert not result.flags.flags.writeable
        receipt_path=OUT/(record['filename']+'.current-admission.json')
        receipt_path.write_text(json.dumps(result.receipt,indent=2)+'\n',encoding='utf-8')
        npz_path=OUT/(record['filename']+'.flags.npz');np.savez_compressed(npz_path,flags=result.flags)
        if record['state']=='DIAGNOSTIC_STRUCTURE_CHECKED_SCIENTIFIC_QUALITY_UNKNOWN':
            old=json.loads((ROOT/record['qualityAdmission']['path']).read_bytes())
            assert [p['unionPixels'] for p in old['pixelFlags']['planes']]==[p['unionPixels'] for p in result.receipt['pixelFlags']['planes']]
            assert sum(p['sourceSpanPixelsOutsideFrame'] for p in result.receipt['pixelFlags']['planes'])==0
        else:
            assert record.get('qualityAdmissionError')=='sdss_quality_fpm_span_coordinate_invalid'
            recovered.append(record['filename'])
        checked.append({'source':record['raw'],'identity':record['identity'],'originalAcquisitionState':record['state'],
            'nativeFlagPixelsIndependentlyCompared':int(reference.size),'allFlagBitsExact':True,
            'outsideSourcePixels':sum(p['sourceSpanPixelsOutsideFrame'] for p in result.receipt['pixelFlags']['planes']),
            'currentAdmission':bind(receipt_path),'flags':bind(npz_path),'scientificQuality':'UNKNOWN'})
        print(json.dumps({'source':record['filename'],'nativePixelsExact':int(reference.size),'outsideSourcePixels':checked[-1]['outsideSourcePixels']}),flush=True)
    assert len(checked)==18 and len(recovered)==3
    # The actual source PSF diagnostics remain readable; do not refit/use them
    # as detector quality or full target PSF, and retain unknown header facts.
    psfs=[]
    for record in source['sourceRecords']:
        if not record['filename'].startswith('psField'):continue
        path=ROOT/record['raw']['path'];assert bind(path)==record['raw']
        result=owner.read_cached_psfield(path,{**record['identity'],'sourceUrl':record['url'],'bytes':record['bytes'],'sha256':record['sha256']},max_uncompressed_bytes=16*1024*1024)
        psfs.append({'source':record['raw'],'basisBands':list(result.bands),'scientificQuality':'UNKNOWN'})
    cp=json.loads((ROOT/source['checkpoint']['path']).read_bytes())
    allowed={'data-pipelines/deep-sky/sdss_frame_quality.py','data-pipelines/deep-sky/test_sdss_frame_quality.py'}
    changed=[]
    for p in cp['currentSources']:
        if bind(ROOT/p['path'])!=p:changed.append(p['path'])
    assert set(changed)==allowed
    for p in cp['protected']+cp['evidence']+source['griInputs']:assert bind(ROOT/p['path'])==p
    report={'scope':'Current fpM shared owner and raw-source independent vector raster, self-review not quality/absolute astrometry acceptance',
        'producerResult':bind(GEN/'result.json'),'reader':bind(Path(__file__)),'currentOwner':bind(ROOT/'data-pipelines/deep-sky/sdss_frame_quality.py'),
        'allNativeMasksExact':True,'nativePixelsCompared':sum(p['nativeFlagPixelsIndependentlyCompared'] for p in checked),
        'fpMInputs':checked,'previouslyUnqualifiedInputsRecovered':recovered,'originalFifteenAcceptedPlaneCountsExact':True,
        'psFieldInputs':psfs,'originalSourceScienceImagesAndProtectedBytesUnchanged':True,'oldCheckpointSourceChanges':changed,
        'scienceOrDisplayEdited':False,'ordinaryAdoption':False,'scientificQuality':'UNVERIFIED','independentReview':'MISSING'}
    (OUT/'result.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'all18NativeMasksExact':True,'recoveredActualSources':len(recovered),'nativePixelsCompared':report['nativePixelsCompared']}))


if __name__=='__main__':main()
