"""Read frozen r2 coadd arrays into the shared transfer owner, without reprojection."""
from pathlib import Path
import argparse
import io
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT/'output/allwise-w3-atlas-0929/python-deps'),str(ROOT/'data-pipelines/deep-sky')]
import numpy as np
from astropy.wcs import WCS
from PIL import Image
from image_quality import digest,inspect_image,write_report
import sdss_gri_tan as owner


def binding(path):
    path = path.resolve()
    raw = path.read_bytes()
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(raw),'sha256':digest(raw)}


def inventory(path):
    return [binding(item) for item in sorted(path.rglob('*')) if item.is_file()]


def save_array(path,array):
    with path.open('xb') as output:
        np.save(output,array,allow_pickle=False)
    return binding(path)|{'shape':list(array.shape),'dtype':array.dtype.str}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    args = parser.parse_args()
    output = args.output.resolve()
    if output.exists():
        raise RuntimeError('preserve_existing_shared_transfer_generation')
    cached = ROOT/'output/sdss-m51-gri-mosaic-candidate-1002-r2'
    trial = ROOT/'output/sdss-m51-global-transfer-1002'
    cached_before,trial_before = inventory(cached),inventory(trial)
    source_paths = [ROOT/'data-pipelines/deep-sky'/name for name in ('sdss_gri_tan.py','test_sdss_gri_tan.py','image_quality.py','requirements.txt')]
    source_before = [binding(path) for path in source_paths]
    candidate = json.loads((cached/'candidate.json').read_bytes())
    trial_report = json.loads((trial/'result.json').read_bytes())
    inputs = [binding(cached/'candidate.json'),binding(cached/'binding.json'),binding(trial/'result.json'),binding(trial/'binding.json')]
    science = {}
    for band in owner.BANDS:
        metadata = candidate['arrays'][f'{band}-science']
        path = cached/metadata['file']
        bound = binding(path)
        if (bound['bytes'],bound['sha256'])!=(metadata['bytes'],metadata['sha256']):
            raise RuntimeError('frozen_coadd_science_changed')
        science[band] = np.load(path,mmap_mode='r',allow_pickle=False)
        inputs.append(bound)
    path = cached/candidate['arrays']['joint-availability']['file']
    joint = np.load(path,mmap_mode='r',allow_pickle=False)
    if binding(path)['sha256']!=candidate['arrays']['joint-availability']['sha256']:
        raise RuntimeError('frozen_coadd_joint_mask_changed')
    inputs.append(binding(path))
    bands = {band:owner.ProjectedBand(data,joint,joint,candidate['science']['perBand'][band]) for band,data in science.items()}
    entry = {'objectRef':candidate['objectRef'],'center':candidate['center'],'orientation':candidate['orientation']}
    row = {'objectRef':entry['objectRef'],'raDeg':entry['center']['raDeg'],'decDeg':entry['center']['decDeg']}
    target = WCS(candidate['wcsHeader'])
    choices = [('fixed-5-q8',owner.FixedDisplayTransfer()),('docs-05-q10',owner.FixedDisplayTransfer(stretch=.5,Q=10)),('global-zscale-q8',owner.WholeMasterZscaleTransfer())]
    output.mkdir(parents=True,exist_ok=False)
    reports = {}
    for name,config in choices:
        directory = output/name
        directory.mkdir()
        rgb,recipe = owner.make_rgb_display(bands,joint,transfer=config)
        original_master = np.load(trial/trial_report['variants'][name]['rgbMaster']['path'].split('/')[-2]/'rgb-master.npy',mmap_mode='r',allow_pickle=False)
        if not np.array_equal(rgb,original_master):
            raise RuntimeError('shared_transfer_differs_from_reviewed_global_trial')
        master_binding = save_array(directory/'rgb-master.npy',rgb)
        master = owner.GriMaster(target,bands,joint,rgb,{'fieldDegrees':candidate['fieldDegrees'],'display':{'transfer':recipe}})
        levels = {}
        quality = []
        for level,(payload,metadata) in owner.pyramid(master,entry).items():
            path = directory/(level.lower()+'.png')
            with path.open('xb') as image:
                image.write(payload)
            previous = trial/name/(level.lower()+'.png')
            inputs.append(binding(previous))
            if payload!=previous.read_bytes():
                raise RuntimeError('shared_transfer_png_bytes_changed_from_reviewed_trial')
            with Image.open(io.BytesIO(payload)) as image:
                image.load()
                decoded = np.asarray(image.convert('RGBA'))
            quality.append(inspect_image(payload,entry,level,metadata,row=row,
                source={'kind':'task-only frozen six-field science coadd global display transfer','master':master_binding['sha256']},
                processing={'transfer':master.report['display']['transfer'],'crop':metadata['masterCrop']}))
            levels[level] = metadata|{'actualFile':binding(path),'actualDecodedRgbaSha256':digest(decoded.tobytes()),
                'sameReviewedTrialBytesAndPixels':True,'sourceRgbMaster':master_binding}
        write_report(directory/'quality.json',{'transfer':master.report['display']['transfer'],'reports':quality,
            'scope':'actual shared recipe/crop/encoding checks; not science or color/PSF quality acceptance'})
        reports[name] = {'transfer':recipe,'rgbMaster':master_binding,'levels':levels,
            'sameReviewedTrialMasterPixels':True,'pngFamilyBytes':sum(item['bytes'] for item in levels.values())}
    cached_after,trial_after = inventory(cached),inventory(trial)
    source_after = [binding(path) for path in source_paths]
    if cached_before!=cached_after or trial_before!=trial_after or source_before!=source_after:
        raise RuntimeError('frozen_inputs_or_shared_owner_changed_during_trial')
    write_report(output/'result.json',{'version':'sdss-shared-display-transfer-real-coadd-v1','script':binding(Path(__file__)),
        'sharedOwnerBefore':source_before,'sharedOwnerAfter':source_after,'actualInputs':inputs,
        'frozenMosaicBefore':cached_before,'frozenMosaicAfter':cached_after,'frozenTransferBefore':trial_before,'frozenTransferAfter':trial_after,
        'scienceArraysAndMasksUnchanged':True,'noSourceFrameReadOrWcsReprojection':True,'variants':reports,
        'scope':'Shared display processing capability verified on previously reviewed actual science master; no selected source/color/format adoption, publication/native acceptance or source-quality repair'})
    write_report(output/'binding.json',{'script':binding(Path(__file__)),'sourceBefore':source_before,'sourceAfter':source_after,
        'inputs':inputs,'outputs':inventory(output),'scope':'new exclusive shared-transfer generation; old r2/trial frozen'})
    print(json.dumps({'result':str(output/'result.json'),'owner':source_before[0]['sha256'],
        'allThreeMastersAndNinePngBytesMatchReviewedTrial':True,'scienceArraysAndMasksUnchanged':True,
        'noSourceFrameReadOrWcsReprojection':True,'qualityAdoption':'UNVERIFIED'}))


if __name__=='__main__':
    main()
