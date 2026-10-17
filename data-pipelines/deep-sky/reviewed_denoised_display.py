"""Read a saved NXT full-display chain into the shared review/publication owner.

No inference, background fit, image encoding or automatic quality decision.
Only two finite stage orders are supported. Each stage retains its own proof.
"""
import hashlib
import io
import json
from pathlib import Path

import numpy as np
from PIL import Image

from optical_publication_io import bound_bytes, bound_file
from reviewed_background_display import (background_processing_row, admit_reviewed_background,
    reviewed_background_row, content, select)
from sxt_processing import checked_work_image, digest

PROCESSING_SCHEMA = 'background-display-nxt-trial-result-v1'
REVIEW_SCHEMA = 'optical-display-denoise-review-v1'
METHOD = 'nxt-srgb-background-display-denoise-v1'
SOURCE_METHOD = 'nxt-srgb-source-display-denoise-v1'
RECIPE = {'denoise': .9, 'iterations': 1, 'mlVersion': 3.1, 'overlap': .2, 'depth': '8U', 'device': 'gpu'}


def file_reviewed_denoise_parent(config, sid, *, root):
    """Two concrete full-image stages; no alpha loss or recursive stage graph."""
    stage = config.get('parentStage', 'BACKGROUND_DISPLAY')
    spec = config['review'] | {'id': sid}
    if stage == 'BACKGROUND_DISPLAY': return background_processing_row(spec, root=root)
    if stage != 'SXT_ORIGINAL_RESTORED': raise ValueError('denoise_parent_stage_invalid')
    from reviewed_restored_display import file_reviewed_processed_display
    parent, bindings = file_reviewed_processed_display(spec, root=root)
    return {}, {'size': parent['key']['job']['outputSize'], 'outputs': {'display.png': parent['outputs']['starless']}}, bindings


def denoise_outputs(row):
    return {'display.png': row['output'], 'vendor.png': row['vendor']} if 'output' in row and 'vendor' in row else {}


def denoise_row_hash(row):
    keys = ('id', 'input', 'modelInput', 'size', 'recipe', 'vendor', 'output', 'changedPixels',
            'suppliedPixels', 'colour', 'reviewRois', 'comparisons')
    return hashlib.sha256(json.dumps({k: row.get(k) for k in keys}, sort_keys=True).encode()).hexdigest()


def validate_denoise_display_pixels(before, staged, vendor, display, row):
    """Whole RGB/ICC/model input equality; effects are not quality acceptance."""
    size = tuple(row['size']); profile = before.info.get('icc_profile')
    if (not profile or any(image.mode != 'RGB' or image.size != size for image in (before, staged, vendor, display)) or
            before.tobytes() != staged.tobytes() or staged.info.get('icc_profile') != profile or
            vendor.info.get('icc_profile') not in (None, profile) or display.info.get('icc_profile') != profile or
            display.tobytes() != vendor.tobytes() or
            row['colour'] != {'colorSpace': 'sRGB', 'iccSha256': digest(profile),
                'iccOwner': 'bound normalized input; vendor ICC is not relied on'}):
        raise ValueError('denoise_vendor_pixels_or_icc_changed')
    changed = int(np.count_nonzero(np.any(np.asarray(before) != np.asarray(display), axis=2)))
    if not changed or row['changedPixels'] != changed or row['suppliedPixels'] != size[0] * size[1]:
        raise ValueError('denoise_saved_pixel_proof_changed')
    return changed


def verify_denoise_row(processing, row, *, root, receipt_directory):
    bindings = []
    def read(b):
        raw, current = bound_bytes(root / b['path'], root=root, expected=b, max_bytes=b['bytes'])
        bindings.append(current); return raw
    def document(b):
        if b['bytes'] > 8 * 1024 * 1024: raise ValueError('denoise_receipt_too_large')
        return json.loads(read(b))
    if (processing.get('schemaVersion') != PROCESSING_SCHEMA or processing.get('nativeNxtBatchCalls') != 1 or
            row.get('status') != 'NXT_DISPLAY_TRIAL_PENDING_REVIEW' or processing.get('ordinaryAdoption') is not False or
            any(processing.get(k) != 0 for k in ('sourceDownloads', 'sxtCalls', 'psCalls', 'backgroundFits', 'publicationCalls'))):
        raise ValueError('denoise_processing_scope_invalid')
    config = document(processing['config'])
    if (config.get('schemaVersion') != 'background-display-nxt-trial-batch-v1' or config.get('recipe') != RECIPE or
            row.get('recipe') != RECIPE or not config.get('question') or not config.get('transition')):
        raise ValueError('denoise_recipe_invalid')
    declaration = select(config['jobs'], row['id'])
    _, parent, parents = file_reviewed_denoise_parent(config, row['id'], root=root)
    bindings.extend(parents)
    if (row['input'] != parent['outputs']['display.png'] or row['size'] != parent['size'] or
            row['reviewRois'] != declaration['reviewRois'] or content(row['modelInput']) != content(row['input'])):
        raise ValueError('denoise_parent_or_model_input_changed')
    directory = root / receipt_directory
    admission_binding = bound_file(directory / 'admission.json', root=root)
    admission = document(admission_binding)
    ready = [r for r in processing['rows'] if r.get('modelInput')]
    if (len({r['id'] for r in ready}) != len(ready) or admission['config'] != processing['config'] or
            admission['runtime'] != processing['runtime'] or admission['inputs'] != [r['modelInput'] for r in ready] or
            admission['executionSources'] != processing['executionSources']):
        raise ValueError('denoise_execution_join_invalid')
    expected_sources = {'benchmark-image-denoise.py', 'sxt_processing.py', 'optical_publication_io.py', 'reviewed_background_display.py'}
    sources = processing['executionSources']
    names = {Path(b['path']).name for b in sources}
    if len(names) != len(sources) or names not in (expected_sources, expected_sources | {'reviewed_denoised_display.py'}):
        raise ValueError('denoise_executed_sources_missing')
    for i, b in enumerate(sources):
        frozen = directory / 'execution-sources' / f'{i}-{Path(b["path"]).name}'
        bindings.append(bound_file(frozen, root=root, expected=b))
    colour = document(config['colourBoundary'])
    colour_admission = document(colour['admission'])
    runtime = processing['runtime']
    if (colour.get('status') != 'PASS_BOUNDED_SRGB_METADATA_NUMERIC_PAIR' or colour.get('iccLabelPairChannelDifferences') != 0 or
            runtime != colour_admission['runtime'] or not runtime or Path(runtime[0]['path']).name.lower() != 'rc-astro.exe' or
            not any(Path(b['path']).name == 'NoiseXTerminator.3.1.onnx' for b in runtime)):
        raise ValueError('denoise_colour_or_runtime_changed')
    vendor_directory = directory / 'vendor'
    expected_command = [runtime[0]['path'], '--json', 'nxt', *[str(root / r['modelInput']['path']) for r in ready],
        '--output', str(vendor_directory), '--device', 'gpu', '--ml-version', '3.1', '--denoise', '0.9',
        '--iterations', '1', '--depth', '8U', '--overlap', '0.2']
    if [str(v).replace('\\', '/') for v in admission['command']] != [str(v).replace('\\', '/') for v in expected_command]:
        raise ValueError('denoise_command_changed')
    events_binding = bound_file(directory / 'events.jsonl', root=root)
    events = [json.loads(line) for line in read(events_binding).decode().splitlines()]
    expected_files = [(vendor_directory / (r['id'] + '-nxt.png')).resolve() for r in ready]
    completed = [Path(e['output']).resolve() for e in events if e.get('event') == 'status' and e.get('phase') == 'complete']
    if (sorted(completed) != sorted(expected_files) or any(e.get('event') in ('error', 'unparsed') for e in events) or
            not any(e.get('event') == 'info' and e.get('topic') == 'device' for e in events) or
            (root / row['vendor']['path']).resolve() != vendor_directory / (row['id'] + '-nxt.png')):
        raise ValueError('denoise_vendor_completion_invalid')
    size = tuple(row['size'])
    def rgb(b, *, icc_required=True):
        if icc_required: checked_work_image(root / b['path'], b, size, root=root)
        raw = read(b)
        with Image.open(io.BytesIO(raw)) as image:
            image.load()
            if image.format != 'PNG' or image.mode != 'RGB' or image.size != size or image.getexif().get(274, 1) != 1:
                raise ValueError('denoise_rgb_or_orientation_invalid')
            return image.copy(), raw
    before, before_raw = rgb(row['input']); staged, staged_raw = rgb(row['modelInput'])
    vendor, _ = rgb(row['vendor'], icc_required=False); display, raw = rgb(row['output'])
    if before_raw != staged_raw:
        raise ValueError('denoise_vendor_pixels_or_icc_changed')
    validate_denoise_display_pixels(before, staged, vendor, display, row)
    rois = [None, *row['reviewRois']]
    if len(row['comparisons']) != len(rois): raise ValueError('denoise_comparisons_missing')
    for b, roi in zip(row['comparisons'], rois):
        a, z = before, display
        if roi:
            if (len(roi) != 4 or any(type(v) is not int for v in roi) or
                    not (0 <= roi[0] < roi[2] <= size[0] and 0 <= roi[1] < roi[3] <= size[1])):
                raise ValueError('denoise_roi_invalid')
            a, z = a.crop(tuple(roi)), z.crop(tuple(roi))
        with Image.open(io.BytesIO(read(b))) as panel:
            panel.load()
            if (panel.mode != 'RGB' or panel.size != (a.width * 2, a.height) or
                    panel.crop((0, 0, a.width, a.height)).tobytes() != a.tobytes() or
                    panel.crop((a.width, 0, a.width * 2, a.height)).tobytes() != z.tobytes()):
                raise ValueError('denoise_actual_comparison_changed')
    for b in bindings: bound_file(root / b['path'], root=root, expected=b)
    return display, raw, config, tuple(bindings)


def denoise_processing_row(spec, *, root):
    bindings = []
    def document(b):
        raw, current = bound_bytes(root / b['path'], root=root, expected=b, max_bytes=8 * 1024 * 1024)
        bindings.append(current); return json.loads(raw)
    processing, review = document(spec['processingReceipt']), document(spec['reviewReceipt'])
    if review.get('schemaVersion') != REVIEW_SCHEMA or review.get('processingReceipt') != spec['processingReceipt'] or not review.get('decisionReceipt'):
        raise ValueError('denoise_exact_review_missing')
    decisions = document(review['decisionReceipt']); row = select(processing['rows'], spec['id'])
    reviewed, decision = select(review['rows'], spec['id']), select(decisions['decisions'], spec['id'])
    if (decisions.get('processingReceipt') != spec['processingReceipt'] or
            reviewed.get('status') != 'FILE_REVIEW_PASSED_SCENE_PENDING' or
            any(r.get('processingKeySha256') != denoise_row_hash(row) or r.get('outputs') != denoise_outputs(row) or
                r.get('status') != reviewed['status'] or r.get('reason') != reviewed.get('reason') for r in (reviewed, decision)) or
            not reviewed.get('reason', '').strip() or not decision.get('evidence')):
        raise ValueError('denoise_requires_current_file_review_pass')
    bindings.extend(bound_file(root / b['path'], root=root, expected=b) for b in decision['evidence'])
    _, _, config, proofs = verify_denoise_row(processing, row, root=root, receipt_directory=Path(spec['processingReceipt']['path']).parent)
    return processing, row, config, tuple(bindings) + proofs


def reviewed_denoised_row(spec, original_binding, *, root):
    _, row, config, bindings = denoise_processing_row(spec, root=root)
    from reviewed_restored_display import reviewed_processed_display
    stage = config.get('parentStage', 'BACKGROUND_DISPLAY')
    verifier = reviewed_background_row if stage == 'BACKGROUND_DISPLAY' else reviewed_processed_display
    _, parents = verifier(config['review'] | {'id': row['id']}, original_binding, root=root)
    return dict(row, outputs=denoise_outputs(row)), bindings + tuple(parents)


def admit_reviewed_denoised(spec, original_binding, original_image, *, root):
    processing, row, config, bindings = denoise_processing_row(spec, root=root)
    stage = config.get('parentStage', 'BACKGROUND_DISPLAY')
    parent_spec = config['review'] | {'id': row['id']}
    if stage == 'BACKGROUND_DISPLAY':
        _, parent_raw, separation, restoration, background, nested_denoising, parents = admit_reviewed_background(
            parent_spec, original_binding, original_image, root=root)
        if nested_denoising is not None:
            raise ValueError('denoise_nested_stage_order_invalid')
    else:
        from reviewed_restored_display import admit_processed_display
        _, parent_raw, separation, restoration, parents = admit_processed_display(
            parent_spec, original_binding, original_image, root=root)
        background = None
    if content(row['input']) != {'bytes': len(parent_raw), 'sha256': digest(parent_raw)}:
        raise ValueError('denoise_original_parent_binding_changed')
    raw, final_binding = bound_bytes(root / row['output']['path'], root=root, expected=row['output'], max_bytes=row['output']['bytes'])
    with Image.open(io.BytesIO(raw)) as image: image.load(); display = image.copy()
    proof = {'method': METHOD if background else SOURCE_METHOD, 'processingReceipt': content(spec['processingReceipt']), 'reviewReceipt': content(spec['reviewReceipt']),
        'parentDisplay': content(row['input']), 'modelInput': content(row['modelInput']),
        'display': content(row['output']) | {'width': display.width, 'height': display.height}, 'vendor': content(row['vendor']),
        'cli': content(processing['runtime'][0]),
        'model': content(next(b for b in processing['runtime'] if Path(b['path']).name == 'NoiseXTerminator.3.1.onnx')),
        'modelVersion': 3.1, 'denoise': .9, 'iterations': 1, 'overlap': .2, 'depth': '8U',
        'changedPixels': row['changedPixels'], 'suppliedPixels': row['suppliedPixels'],
        'fileReview': 'PASSED', 'sceneAcceptance': 'MISSING'}
    return display, raw, separation, restoration, background, proof, bindings + tuple(parents) + (final_binding,)


def review_denoise_batch(processing, processing_binding, decisions_path, directory, *, root):
    from image_quality import saved_display_review
    return saved_display_review(processing, processing_binding, decisions_path, directory, root=root,
        schema=REVIEW_SCHEMA, key_for_row=denoise_row_hash, outputs_for_row=denoise_outputs,
        verify_row=lambda row: verify_denoise_row(processing, row, root=root,
            receipt_directory=Path(processing_binding['path']).parent)[3],
        meaning='Saved full RGB NXT display and qualified parent proof; no new inference, fit, encoding, Scene pass or adoption.')
