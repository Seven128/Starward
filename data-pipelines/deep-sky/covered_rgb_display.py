"""Explicit binary-coverage model canvas and exact geometric-alpha restoration.

Model-only zero padding is not observed black or new source coverage. Original
RGBA/supply masks remain bound; no crop, feather, brightness mask or interpolation.
This is display processing, not science or a publication/adoption decision.
"""
import io
import numpy as np
from PIL import Image
from optical_publication_io import bound_bytes

VERSION = 'binary-source-alpha-model-canvas-v1'


def image_from_binding(binding, root):
    raw, _ = bound_bytes(root / binding['path'], root=root, expected=binding, max_bytes=128*1024*1024)
    with Image.open(io.BytesIO(raw)) as image:
        image.load()
        if image.format != 'PNG' or image.getexif().get(274,1) != 1:
            raise ValueError('covered_rgb_source_png_invalid')
        return image.copy()


def covered_source(coverage, size, root):
    if not isinstance(coverage,dict) or coverage.get('schemaVersion') != VERSION:
        raise ValueError('covered_rgb_contract_invalid')
    image = image_from_binding(coverage['originalRgba'],root)
    mask = image_from_binding(coverage['suppliedMask'],root)
    if image.mode != 'RGBA' or mask.mode != 'L' or image.size != tuple(size) or mask.size != image.size:
        raise ValueError('covered_rgb_source_geometry_invalid')
    rgba, supplied = np.asarray(image), np.asarray(mask)
    if not np.all((rgba[:,:,3]==0)|(rgba[:,:,3]==255)) or not np.all((supplied==0)|(supplied==255)):
        raise ValueError('covered_rgb_requires_binary_source_alpha')
    if np.any((supplied==0)&(rgba[:,:,3]!=0)):
        raise ValueError('covered_rgb_missing_supply_cannot_be_opaque')
    if not image.info.get('icc_profile'):
        raise ValueError('covered_rgb_colour_profile_missing')
    return image,rgba,supplied


def model_canvas(coverage, size, root):
    original,rgba,_ = covered_source(coverage,size,root)
    rgb = rgba[:,:,:3].copy()
    rgb[rgba[:,:,3]==0] = 0
    buffer=io.BytesIO()
    Image.fromarray(rgb).save(buffer,format='PNG',icc_profile=original.info['icc_profile'])
    return buffer.getvalue()


def validate_covered_input(job, factor, root):
    if factor != 1:
        raise ValueError('covered_rgb_upsampled_model_canvas_not_supported')
    original,rgba,_ = covered_source(job['coverage'],job['outputSize'],root)
    working = image_from_binding(job['input'],root)
    expected = rgba[:,:,:3].copy()
    expected[rgba[:,:,3]==0] = 0
    if (working.mode!='RGB' or working.size!=original.size or
            working.info.get('icc_profile')!=original.info['icc_profile'] or
            not np.array_equal(np.asarray(working),expected)):
        raise ValueError('covered_rgb_model_canvas_changed_source_or_padding')
    dependencies=job['dependencies']
    if any(binding not in dependencies for binding in
           (job['coverage']['originalRgba'],job['coverage']['suppliedMask'])):
        raise ValueError('covered_rgb_source_dependency_missing')


def covered_pixels(job, starless_binding, root):
    original,rgba,supplied = covered_source(job['coverage'],job['outputSize'],root)
    after=image_from_binding(starless_binding,root)
    if after.mode!='RGB' or after.size!=original.size or after.info.get('icc_profile')!=original.info['icc_profile']:
        raise ValueError('covered_rgb_starless_geometry_or_colour_changed')
    result=np.dstack((np.asarray(after),rgba[:,:,3])).copy()
    result[result[:,:,3]==0,:3]=0
    return result,original.info['icc_profile'],{'schemaVersion':VERSION,
        'originalRgba':job['coverage']['originalRgba'],'suppliedMask':job['coverage']['suppliedMask'],
        'alphaMeaning':'exact original binary display alpha; absent supply retained separately',
        'opaqueSamples':int(np.count_nonzero(rgba[:,:,3]==255)),
        'sourceTransparentSamples':int(np.count_nonzero((supplied==255)&(rgba[:,:,3]==0))),
        'missingTileSamples':int(np.count_nonzero(supplied==0)),
        'workingPaddingMeaning':'Zero outside source alpha is model context only, not observed black or added coverage.',
        'scientificAvailability':'UNKNOWN','edgeAndStructureQuality':'UNVERIFIED'}


def write_covered_output(job, starless_binding, target, root):
    pixels,profile,proof=covered_pixels(job,starless_binding,root)
    with target.open('xb') as stream:
        Image.fromarray(pixels).save(stream,format='PNG',icc_profile=profile)
    return proof


def validate_covered_output(job, outputs, root):
    expected,profile,_=covered_pixels(job,outputs['starless'],root)
    image=image_from_binding(outputs['coveredStarless'],root)
    if image.mode!='RGBA' or image.info.get('icc_profile')!=profile or not np.array_equal(np.asarray(image),expected):
        raise ValueError('covered_rgb_output_changed_native_alpha_or_pixels')
