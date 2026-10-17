"""Admission of an exact file-reviewed SXT result to local display trials.

File review never establishes Scene acceptance, absolute registration, scientific
validity or adoption. Original rights/geometry are owned by the native publisher.
"""
import hashlib
import io
import json
from PIL import Image
from optical_publication_io import bound_bytes, bound_file
from normalized_rgb_source import normalize_loaded_rgb
from sxt_processing import checked_work_image, validate_job, SXT_OVERLAP


def validate_sxt_display_pixels(job, outputs, method, expected_profile, *, root):
    """Shared exact vendor → normalized display readback, independent of review.

    The source adapter owns expected sRGB/whole-image normalization. This
    verifies already-produced RGB, never reruns inference or decides quality.
    """
    if method not in SXT_OVERLAP:
        raise ValueError('sxt_publication_pixel_method_invalid')
    factor=2 if method=='sxt-upsample'else 1
    size=tuple(job['outputSize']);work_size=tuple(v*factor for v in size);bindings=[]
    def read(binding):
        raw,current=bound_bytes(root/binding['path'],root=root,expected=binding,max_bytes=binding['bytes'])
        bindings.append(current);return raw
    checked_work_image(root/outputs['starless']['path'],outputs['starless'],size,root=root)
    with Image.open(io.BytesIO(read(outputs['vendorStarless']))) as vendor:
        vendor.load()
        if vendor.mode!='RGB' or vendor.size!=work_size:
            raise ValueError('sxt_publication_vendor_geometry_invalid')
        expected=vendor.copy()if factor==1 else vendor.resize(size,Image.Resampling.LANCZOS)
    raw=read(outputs['starless'])
    with Image.open(io.BytesIO(raw)) as display:
        display.load()
        if display.tobytes()!=expected.tobytes() or display.info.get('icc_profile')!=expected_profile:
            raise ValueError('sxt_publication_display_pixels_or_icc_changed')
        rgb=display.copy()
    for binding in bindings:
        bound_file(root/binding['path'],root=root,expected=binding)
    return rgb,raw,tuple(bindings)


def reviewed_processing_row(spec, required_status, *, root):
    bindings = []
    def read(binding):
        raw, current = bound_bytes(root / binding['path'], root=root, expected=binding,
                                   max_bytes=binding['bytes'])
        bindings.append(current)
        return raw
    processing = json.loads(read(spec['processingReceipt']))
    review = json.loads(read(spec['reviewReceipt']))
    if (processing.get('schema') != 'sxt-processing-v1' or review.get('schema') != 'sxt-review-queue-v1' or
            review.get('processingReceipt') != spec['processingReceipt'] or not review.get('decisionReceipt')):
        raise ValueError('sxt_publication_review_receipt_invalid')
    decisions = json.loads(read(review['decisionReceipt']))
    if decisions.get('processingReceipt') != spec['processingReceipt']:
        raise ValueError('sxt_publication_decision_receipt_invalid')
    rows = [r for r in processing['rows'] if r['id'] == spec['id']]
    reviewed = [r for r in review['rows'] if r['id'] == spec['id']]
    decided = [r for r in decisions['decisions'] if r['id'] == spec['id']]
    if len(rows) != 1 or len(reviewed) != 1 or len(decided) != 1:
        raise ValueError('sxt_publication_review_selection_invalid')
    row, selected, decision = rows[0], reviewed[0], decided[0]
    key_hash = hashlib.sha256(json.dumps(row['key'], sort_keys=True).encode()).hexdigest()
    if (row['status'] != 'PROCESSED_PENDING_REVIEW' or row.get('processingWarnings') or
            selected.get('status') != required_status or
            decision.get('status') != selected['status'] or decision.get('reason') != selected.get('reason') or
            any(r.get('processingKeySha256') != key_hash or r.get('outputs') != row['outputs']
                for r in (selected, decision))):
        raise ValueError('sxt_publication_requires_exact_file_review_pass')
    return row, tuple(bindings)


def reviewed_sxt_row(spec, original_binding, *, root, required_status='FILE_REVIEW_PASSED_SCENE_PENDING'):
    row, initial_bindings = reviewed_processing_row(spec, required_status, root=root)
    bindings = list(initial_bindings)
    job, method, tools = row['key']['job'], row['key']['method'], row['key']['tools']
    if 'coverage' in job:
        raise ValueError('native_whole_rectangle_does_not_admit_covered_region')
    factor = 2 if method == 'sxt-upsample' else 1
    if (method not in SXT_OVERLAP or not isinstance(tools, list) or not tools or not isinstance(tools[-1], dict) or
            tools[-1].get('mlVersion') != 11 or
            tools[-1].get('overlap') != SXT_OVERLAP[method] or tools[-1].get('inputUpsample') != factor):
        raise ValueError('sxt_publication_recipe_invalid')
    validate_job(job, root=root, factor=factor)
    if (job['sourceContext'].get('input') != original_binding or
            original_binding not in job['dependencies']):
        raise ValueError('sxt_publication_original_source_mismatch')
    bindings.extend(bound_file(root / b['path'], root=root, expected=b) for b in job['dependencies'])
    return row, tuple(bindings)


def admit_reviewed_sxt(spec, original_binding, original_image, *, root, required_status='FILE_REVIEW_PASSED_SCENE_PENDING'):
    row, initial_bindings = reviewed_sxt_row(spec, original_binding, root=root, required_status=required_status)
    bindings = list(initial_bindings)
    def read(binding):
        raw, current = bound_bytes(root / binding['path'], root=root, expected=binding, max_bytes=binding['bytes'])
        bindings.append(current)
        return raw
    job, method = row['key']['job'], row['key']['method']
    factor = 2 if method == 'sxt-upsample' else 1
    input_raw = read(job['input'])
    work_size = [v * factor for v in job['outputSize']]
    work = normalize_loaded_rgb(original_image, work_size[0],
        untagged_colour_interpretation=job['sourceContext'].get('untaggedColorInterpretation'))
    if list(work.work_size) != work_size or work.png_bytes != input_raw:
        raise ValueError('sxt_publication_whole_source_normalization_mismatch')
    layers = {name: read(binding) for name, binding in row['outputs'].items()}
    rgb,_,pixel_bindings=validate_sxt_display_pixels(job,row['outputs'],method,work.icc_profile,root=root)
    bindings.extend(pixel_bindings)
    proof = {'method': method, 'modelVersion': 11, 'overlap': SXT_OVERLAP[method], 'inputUpsample': factor,
        'processingReceipt': {k: spec['processingReceipt'][k] for k in ('bytes', 'sha256')},
        'reviewReceipt': {k: spec['reviewReceipt'][k] for k in ('bytes', 'sha256')},
        'workingImage': {k: job['input'][k] for k in ('bytes', 'sha256')} | {'width': work_size[0], 'height': work_size[1]},
        'starless': {k: row['outputs']['starless'][k] for k in ('bytes', 'sha256')} |
            {'width': rgb.width, 'height': rgb.height},
        'sceneAcceptance': 'MISSING', 'fileReview': 'PASSED' if required_status=='FILE_REVIEW_PASSED_SCENE_PENDING'else 'NEEDS_REPAIR'}
    return rgb, layers['starless'], proof, tuple(bindings)
