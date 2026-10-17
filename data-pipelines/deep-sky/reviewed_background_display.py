"""Byte-bound background display review/admission; no refit or adoption.

The generic image-quality entry dispatches this different pixel mechanism here.
Its parent keeps its own SXT/PS proof and review; final RGB obtains a new review.
"""
import hashlib
import io
import json
from pathlib import Path

import numpy as np
from PIL import Image

from optical_publication_io import bound_bytes, bound_file
from optical_display_background import VERSION
from publish_prepared_display import (open_background_npz, verify_display_pixels,
                                     background_batch_byte_budget, background_median_rgb)
from reviewed_restored_display import (file_reviewed_processed_display, reviewed_processed_display, admit_processed_display)
from sxt_processing import checked_work_image

PROCESSING_SCHEMA = 'optical-display-background-batch-result-v1'
REVIEW_SCHEMA = 'optical-display-background-review-v1'


def content(binding):
    return {k: binding[k] for k in ('bytes', 'sha256')}


def background_row_hash(row):
    key = {k: row.get(k) for k in
        ('input', 'parentProcessingKeySha256', 'size', 'recipe', 'outputs', 'details')}
    return hashlib.sha256(json.dumps(key, sort_keys=True).encode()).hexdigest()


def select(rows, sid):
    found = [r for r in rows if r['id'] == sid]
    if len(found) != 1:
        raise ValueError('background_display_row_identity_invalid')
    return found[0]


def background_parent(spec, stage, *, root):
    """Normalize only the two concrete full-image parents; forbid stage loops."""
    if stage == 'SXT_ORIGINAL_RESTORED':
        parent, bindings = file_reviewed_processed_display(spec, root=root)
        key = hashlib.sha256(json.dumps(parent['key'], sort_keys=True).encode()).hexdigest()
        return {'input': parent['outputs']['starless'], 'size': parent['key']['job']['outputSize'],
            'keySha256': key}, bindings
    if stage != 'NXT_SXT_ORIGINAL_RESTORED':
        raise ValueError('background_display_parent_stage_invalid')
    from reviewed_denoised_display import denoise_processing_row, denoise_row_hash
    _, parent, config, bindings = denoise_processing_row(spec, root=root)
    if config.get('parentStage') != 'SXT_ORIGINAL_RESTORED':
        raise ValueError('background_display_nested_stage_order_invalid')
    return {'input': parent['output'], 'size': parent['size'], 'keySha256': denoise_row_hash(parent)}, bindings


def verify_background_row(processing, row, *, root, receipt_directory):
    """Verify saved whole RGB, formula, masks and qualified parent, not quality."""
    bindings = []
    def read(binding):
        raw, current = bound_bytes(root / binding['path'], root=root,
            expected=binding, max_bytes=binding['bytes'])
        bindings.append(current)
        return raw
    if processing.get('schemaVersion') != PROCESSING_SCHEMA or row.get('status') != 'DISPLAY_ESTIMATE_PENDING_REVIEW':
        raise ValueError('background_display_processing_incomplete')
    manifest = json.loads(read(processing['manifest']))
    if (manifest.get('schemaVersion') != 'optical-display-background-batch-v1' or
            manifest['processingReceipt'] != processing['processingReceipt'] or
            manifest['reviewReceipt'] != processing['reviewReceipt'] or
            manifest.get('parentStage', 'SXT_ORIGINAL_RESTORED') != processing.get('parentStage', 'SXT_ORIGINAL_RESTORED') or
            select(manifest['jobs'], row['id']) != row['recipe']):
        raise ValueError('background_display_recipe_join_invalid')
    spec = {k: processing[k] for k in ('processingReceipt', 'reviewReceipt')} | {'id': row['id']}
    parent, parents = background_parent(spec, processing.get('parentStage', 'SXT_ORIGINAL_RESTORED'), root=root)
    bindings.extend(parents)
    size = tuple(parent['size'])
    if (row['parentProcessingKeySha256'] != parent['keySha256'] or row['input'] != parent['input'] or
            tuple(row['size']) != size or
            set(row['outputs']) != {'display.png', 'background.npz', 'estimation-mask.png'}):
        raise ValueError('background_display_parent_join_invalid')
    if (type(manifest.get('maxBatchPixels')) is not int or manifest['maxBatchPixels'] <= 0 or
            size[0] * size[1] > manifest['maxBatchPixels']):
        raise ValueError('background_display_declared_pixel_budget_exceeded')
    for b in processing['inputs']:
        bindings.append(bound_file(root / b['path'], root=root, expected=b))
    def rgb(binding):
        checked_work_image(root / binding['path'], binding, size, root=root)
        raw = read(binding)
        with Image.open(io.BytesIO(raw)) as image:
            image.load()
            return raw, image.copy(), np.asarray(image).copy(), image.info['icc_profile']
    _, original, pixels, profile = rgb(row['input'])
    raw, display, result, result_profile = rgb(row['outputs']['display.png'])
    if profile != result_profile:
        raise ValueError('background_display_colour_changed')
    alpha = np.full((size[1], size[0], 1), 255, dtype=np.uint8)
    with open_background_npz(read(row['outputs']['background.npz']), shape=(size[1], size[0], 3),
                             max_payload_bytes=background_batch_byte_budget(manifest)) as model:
        negative, supplied, black = verify_display_pixels(np.concatenate((pixels, alpha), axis=2),
            np.concatenate((result, alpha), axis=2), model)
        background_median = background_median_rgb(model)
    masks = []
    for b in (row['recipe']['exclusionMask'], row['outputs']['estimation-mask.png']):
        with Image.open(io.BytesIO(read(b))) as mask:
            if mask.format != 'PNG' or mask.mode != 'L' or mask.size != size or mask.info:
                raise ValueError('background_display_mask_invalid')
            mask.load(); values = np.asarray(mask).copy()
            if not np.all((values == 0) | (values == 255)):
                raise ValueError('background_display_mask_invalid')
            masks.append(values == 255)
    guard, estimated = masks; details = row['details']
    if (np.any(guard & ~estimated) or not (~estimated).any() or
            details['producerVersion'] != VERSION or details['boxSize'] != row['recipe']['boxSize'] or
            details['sourceDilation'] != row['recipe']['sourceDilation'] or details['meshFilterSize'] != [3, 3] or
            details['sigmaClip'] != [3, 10] or details['detectNSigma'] != 2 or details['detectNPixels'] != 10 or
            details['negativeChannelPixels'] != list(negative) or details['suppliedPixels'] != supplied or
            details['validBlackDisplayPixels'] != black or details['guardPixels'] != int(guard.sum()) or
            details['detectedOnlyPixels'] != int((estimated & ~guard).sum()) or
            details['maskedFraction'] != float(estimated.mean()) or
            details['backgroundMedianRGB'] != background_median or
            row['changedPixels'] != int(np.any(pixels != result, axis=2).sum())):
        raise ValueError('background_display_saved_proof_changed')
    for b in row['comparisons']:
        bindings.append(bound_file(root / b['path'], root=root, expected=b))
    # Verify the frozen executed sources, not the later live owner pathname.
    for i, owner in enumerate(processing['executionOwners']):
        snapshot = receipt_directory / 'execution-sources'
        binding = content(owner) | {'path': (snapshot / f'{i}-{Path(owner["path"]).name}').as_posix()}
        bindings.append(bound_file(root / binding['path'], root=root, expected=binding))
    for b in bindings:
        bound_file(root / b['path'], root=root, expected=b)
    return display, raw, parent, tuple(bindings)


def background_processing_row(spec, *, root):
    bindings = []
    def document(binding):
        raw, current = bound_bytes(root / binding['path'], root=root, expected=binding, max_bytes=8 * 1024 * 1024)
        bindings.append(current)
        return json.loads(raw)
    processing, review = document(spec['processingReceipt']), document(spec['reviewReceipt'])
    if (processing.get('schemaVersion') != PROCESSING_SCHEMA or review.get('schemaVersion') != REVIEW_SCHEMA or
            review['processingReceipt'] != spec['processingReceipt'] or not review.get('decisionReceipt')):
        raise ValueError('background_display_review_join_invalid')
    decisions = document(review['decisionReceipt'])
    if decisions['processingReceipt'] != spec['processingReceipt']:
        raise ValueError('background_display_decision_join_invalid')
    row = select(processing['rows'], spec['id']); reviewed = select(review['rows'], spec['id'])
    decision = select(decisions['decisions'], spec['id'])
    if (reviewed['status'] != 'FILE_REVIEW_PASSED_SCENE_PENDING' or decision['status'] != reviewed['status'] or
            decision['reason'] != reviewed['reason'] or not reviewed['reason'].strip() or
            not decision.get('evidence') or
            any(r['processingKeySha256'] != background_row_hash(row) or r['outputs'] != row['outputs']
                for r in (reviewed, decision))):
        raise ValueError('background_display_requires_exact_file_review_pass')
    bindings.extend(bound_file(root / b['path'], root=root, expected=b) for b in decision['evidence'])
    _, _, _, proofs = verify_background_row(processing, row, root=root,
        receipt_directory=Path(spec['processingReceipt']['path']).parent)
    return processing, row, tuple(bindings) + proofs


def reviewed_background_row(spec, original_binding, *, root):
    processing, row, bindings = background_processing_row(spec, root=root)
    parent_spec = {k: processing[k] for k in ('processingReceipt', 'reviewReceipt')} | {'id': spec['id']}
    verifier = reviewed_processed_display
    if processing.get('parentStage') == 'NXT_SXT_ORIGINAL_RESTORED':
        from reviewed_denoised_display import reviewed_denoised_row
        verifier = reviewed_denoised_row
    _, checked = verifier(parent_spec, original_binding, root=root)
    return row, tuple(bindings) + tuple(checked)


def admit_reviewed_background(spec, original_binding, original_image, *, root):
    processing, row, bindings = background_processing_row(spec, root=root)
    parent_spec = {k: processing[k] for k in ('processingReceipt', 'reviewReceipt')} | {'id': spec['id']}
    if processing.get('parentStage') == 'NXT_SXT_ORIGINAL_RESTORED':
        from reviewed_denoised_display import admit_reviewed_denoised, SOURCE_METHOD
        _, parent_raw, separation, restoration, prior_background, denoising, parent_bindings = admit_reviewed_denoised(
            parent_spec, original_binding, original_image, root=root)
        if prior_background is not None or denoising['method'] != SOURCE_METHOD:
            raise ValueError('background_display_nested_stage_order_invalid')
    else:
        _, parent_raw, separation, restoration, parent_bindings = admit_processed_display(
            parent_spec, original_binding, original_image, root=root)
        denoising = None
    if content(row['input']) != {'bytes': len(parent_raw), 'sha256': hashlib.sha256(parent_raw).hexdigest()}:
        raise ValueError('background_display_exact_parent_pixels_changed')
    raw, bound = bound_bytes(root / row['outputs']['display.png']['path'], root=root,
        expected=row['outputs']['display.png'], max_bytes=row['outputs']['display.png']['bytes'])
    with Image.open(io.BytesIO(raw)) as image:
        image.load(); display = image.copy()
    details = row['details']
    proof = {'method': VERSION, 'processingReceipt': content(spec['processingReceipt']),
        'reviewReceipt': content(spec['reviewReceipt']), 'parentDisplay': content(row['input']),
        'display': content(row['outputs']['display.png']) | {'width': display.width, 'height': display.height},
        'exclusionMask': content(row['recipe']['exclusionMask']),
        'estimationMask': content(row['outputs']['estimation-mask.png']),
        'backgroundModel': content(row['outputs']['background.npz']),
        'boxSize': details['boxSize'], 'sourceDilation': details['sourceDilation'],
        'formula': 'srgb-linear-subtract-clamp-negative-display-only',
        'suppliedPixels': details['suppliedPixels'], 'validBlackDisplayPixels': details['validBlackDisplayPixels'],
        'negativeChannelPixels': details['negativeChannelPixels'], 'fileReview': 'PASSED', 'sceneAcceptance': 'MISSING'}
    return display, raw, separation, restoration, proof, denoising, tuple(bindings) + tuple(parent_bindings) + (bound,)


def review_background_batch(processing, processing_binding, decisions_path, directory, *, root):
    """Seal the same whole-batch quality queue with a pixel-specific verifier."""
    from image_quality import saved_display_review
    return saved_display_review(processing, processing_binding, decisions_path, directory, root=root,
        schema=REVIEW_SCHEMA, key_for_row=background_row_hash, outputs_for_row=lambda row: row.get('outputs'),
        verify_row=lambda row: verify_background_row(processing, row, root=root,
            receipt_directory=Path(processing_binding['path']).parent)[3],
        meaning='Separate saved display formula and file review. No refit, native/GPU execution, Scene pass, registration or adoption.')
