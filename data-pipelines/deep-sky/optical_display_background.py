"""Source-excluded background estimates for known sRGB display images.

This is the existing Photutils display recipe, separate from source supply,
scientific background, geometry, star separation and publication approval.
Callers bind source colour, masks, parameters and actual output review.
"""
import numpy as np
from publish_prepared_display import (verify_display_pixels, background_payload_bytes,
    background_batch_byte_budget, background_median_rgb, BACKGROUND_ARRAY_LIMIT_BYTES)

VERSION = 'source-excluded-srgb-display-background-v1'


def estimate_display_background(rgb, guard, *, box_size=(128, 128), source_dilation=5):
    """Return display RGB, encoded background, exclusion mask and diagnostics.

    Guard/detected pixels are excluded from estimation, not erased or treated
    as missing. The complete rectangle remains supplied, including valid black.
    Only the signed display difference is clamped, never the original data.
    """
    if (not isinstance(rgb, np.ndarray) or rgb.dtype != np.uint8 or rgb.ndim != 3 or
            rgb.shape[2] != 3 or not rgb.shape[0] or not rgb.shape[1] or
            not isinstance(guard, np.ndarray) or guard.dtype != np.bool_ or
            guard.shape != rgb.shape[:2] or not (~guard).any()):
        raise ValueError('display_background_rgb_or_exclusion_invalid')
    if (not isinstance(box_size, (tuple, list)) or len(box_size) != 2 or
            any(type(v) is not int or not 2 <= v <= rgb.shape[i] for i, v in enumerate(box_size)) or
            type(source_dilation) is not int or not 0 <= source_dilation <= min(rgb.shape[:2])):
        raise ValueError('display_background_recipe_invalid')
    import photutils
    from astropy.stats import SigmaClip
    from photutils.background import Background2D, MedianBackground
    from photutils.segmentation import detect_threshold, detect_sources
    from photutils.utils import circular_footprint
    if photutils.__version__ != '3.0.0':
        raise ValueError('display_background_estimator_version_invalid')
    clip = SigmaClip(sigma=3, maxiters=10)
    intensity = rgb.max(axis=2).astype(float)
    threshold = detect_threshold(intensity, n_sigma=2, mask=guard, sigma_clip=clip)
    segments = detect_sources(intensity, threshold, n_pixels=10, mask=guard)
    mask = guard.copy()
    if segments is not None:
        mask |= segments.make_source_mask(footprint=circular_footprint(radius=source_dilation))
    if not (~mask).any():
        raise ValueError('display_background_no_estimation_samples')
    del intensity, threshold, segments
    background = np.empty(rgb.shape, dtype='float64'); meshes = []
    for c in range(3):
        model = Background2D(rgb[..., c].astype(float), tuple(box_size), filter_size=(3, 3),
            mask=mask, sigma_clip=clip, bkg_estimator=MedianBackground())
        background[..., c] = model.background
        meshes.append({'channel': 'RGB'[c], 'background': model.background_mesh.tolist(),
                       'remainingPixelCounts': model.n_pixels_mesh.tolist()})
        del model
    def linear(value):
        value = value / 255
        return np.where(value <= .04045, value / 12.92, ((value + .055) / 1.055) ** 2.4)
    result = np.empty_like(rgb)
    for start in range(0, rgb.shape[0], 128):
        section = slice(start, start + 128)
        residual = linear(rgb[section].astype(float)) - linear(background[section])
        positive = np.maximum(residual, 0)
        encoded = np.where(positive <= .0031308, 12.92 * positive,
            1.055 * positive ** (1 / 2.4) - .055)
        result[section] = np.rint(np.clip(encoded * 255, 0, 255)).astype('uint8')
    alpha = np.full((*rgb.shape[:2], 1), 255, dtype='uint8')
    negative, support, black = verify_display_pixels(np.concatenate((rgb, alpha), axis=2),
        np.concatenate((result, alpha), axis=2), background)
    return result, background, mask, {'producerVersion': VERSION,
        'boxSize': list(box_size), 'meshFilterSize': [3, 3], 'sigmaClip': [3, 10],
        'detectNSigma': 2, 'detectNPixels': 10, 'sourceDilation': source_dilation,
        'maskedFraction': float(mask.mean()), 'guardPixels': int(guard.sum()),
        'detectedOnlyPixels': int((mask & ~guard).sum()),
        'backgroundMedianRGB': background_median_rgb(background),
        'negativeChannelPixels': list(negative), 'suppliedPixels': support,
        'validBlackDisplayPixels': black,
        'meshes': meshes,
        'formulaOwner': 'publish_prepared_display.verify_display_pixels',
        'meaning': 'Display estimate only; full source geometry and original pixels remain separate. '
                   'Clipping negative display differences does not establish missing data, physical sky, '
                   'faint-structure preservation, seamless fusion or product adoption.'}


def background_batch(manifest_path, pin, directory, *, root):
    """Bound file-qualified complete RGB parents; retain partial exceptions.

    This preview receipt has its own type. It is deliberately not an SXT,
    restored-pixel or published-native receipt: the display formula changes
    pixels under a separate meaning and must obtain its own quality decision.
    """
    import hashlib
    import inspect
    import io
    import json
    import time
    from pathlib import Path
    from PIL import Image, ImageDraw
    from optical_publication_io import bound_bytes, bound_file, pinned_json
    from sxt_processing import checked_work_image
    from reviewed_background_display import background_parent
    from image_quality import write_report, _region_statistics
    from photutils.background import Background2D, MedianBackground
    from photutils.segmentation import detect_threshold, detect_sources
    from photutils.utils import circular_footprint
    root, directory = root.resolve(), directory.resolve()
    manifest, manifest_binding = pinned_json(manifest_path, pin, root=root)
    if (manifest.get('schemaVersion') != 'optical-display-background-batch-v1' or
            not manifest.get('jobs') or type(manifest.get('maxBatchPixels')) is not int or
            manifest['maxBatchPixels'] <= 0 or directory.exists() or
            not directory.is_relative_to(root / 'output')):
        raise ValueError('display_background_batch_invalid')
    byte_budget = background_batch_byte_budget(manifest)
    retained = [manifest_binding]
    def document(binding):
        encoded, current = bound_bytes(root / binding['path'], root=root, expected=binding,
            max_bytes=8 * 1024 * 1024)
        retained.append(current)
        return json.loads(encoded)
    processing, review = document(manifest['processingReceipt']), document(manifest['reviewReceipt'])
    parent_stage = manifest.get('parentStage', 'SXT_ORIGINAL_RESTORED')
    parent_schemas = {'SXT_ORIGINAL_RESTORED': ('sxt-processing-v1', 'sxt-review-queue-v1'),
        'NXT_SXT_ORIGINAL_RESTORED': ('background-display-nxt-trial-result-v1', 'optical-display-denoise-review-v1')}
    if (parent_stage not in parent_schemas or
            (processing.get('schemaVersion', processing.get('schema')), review.get('schemaVersion', review.get('schema'))) != parent_schemas[parent_stage] or
            review['processingReceipt'] != manifest['processingReceipt']):
        raise ValueError('display_background_parent_review_invalid')
    decisions = document(review['decisionReceipt'])
    if decisions['processingReceipt'] != manifest['processingReceipt']:
        raise ValueError('display_background_parent_decision_invalid')
    owners = [Path(__file__), Path(inspect.getfile(verify_display_pixels)),
        Path(inspect.getfile(checked_work_image)), Path(inspect.getfile(write_report)), Path(inspect.getfile(background_parent)),
        Path(inspect.getfile(bound_bytes)),
        *[Path(inspect.getfile(value)) for value in
            (Background2D, MedianBackground, detect_threshold, detect_sources, circular_footprint)]]
    owners_before = [bound_file(p, root=root) for p in owners]
    def unique(rows, sid):
        found = [r for r in rows if r['id'] == sid]
        if len(found) != 1:
            raise ValueError('display_background_parent_identity_ambiguous')
        return found[0]
    seen, pixels, model_bytes = set(), 0, 0
    for planned in manifest['jobs']:
        sid = planned['id']
        source = unique(processing['rows'], sid)
        size = source['key']['job']['outputSize'] if parent_stage == 'SXT_ORIGINAL_RESTORED' else source['size']
        if (sid in seen or not isinstance(size, list) or len(size) != 2 or
                any(type(v) is not int or v <= 0 for v in size)):
            raise ValueError('display_background_job_identity_or_size_invalid')
        seen.add(sid); pixels += size[0] * size[1]
        if pixels > manifest['maxBatchPixels']:
            raise ValueError('display_background_declared_pixel_budget_exceeded')
        payload_bytes = background_payload_bytes((size[1], size[0], 3))
        model_bytes += payload_bytes
        admitted_bytes = model_bytes if 'maxBackgroundBytes' in manifest else payload_bytes
        if admitted_bytes > byte_budget or payload_bytes > 3 * BACKGROUND_ARRAY_LIMIT_BYTES:
            raise ValueError('display_background_declared_byte_budget_exceeded')
    directory.mkdir(exist_ok=False)
    execution = directory / 'execution-sources'; execution.mkdir()
    for i, owner in enumerate(owners):
        (execution / f'{i}-{owner.name}').write_bytes(owner.read_bytes())
    rows, cards = [], []
    for planned in manifest['jobs']:
        started = time.perf_counter(); sid = planned['id']; row = {'id': sid, 'status': 'FAILED'}; rows.append(row)
        try:
            spec = {k: manifest[k] for k in ('processingReceipt', 'reviewReceipt')} | {'id': sid}
            source, proofs = background_parent(spec, parent_stage, root=root)
            size = tuple(source['size']); key_hash = source['keySha256']; retained.extend(proofs)
            input_binding = source['input']
            checked_work_image(root / input_binding['path'], input_binding, size, root=root)
            raw, _ = bound_bytes(root / input_binding['path'], root=root, expected=input_binding,
                max_bytes=input_binding['bytes'])
            with Image.open(io.BytesIO(raw)) as image:
                image.load(); rgb = np.asarray(image).copy(); profile = image.info['icc_profile']
            spec = planned['exclusionMask']; encoded, mask_binding = bound_bytes(root / spec['path'], root=root,
                expected=spec, max_bytes=spec['bytes']); retained.append(mask_binding)
            with Image.open(io.BytesIO(encoded)) as image:
                if image.format != 'PNG' or image.mode != 'L' or image.size != size or image.info:
                    raise ValueError('display_background_exclusion_mask_invalid')
                image.load(); mask_values = np.asarray(image).copy()
            if not np.all((mask_values == 0) | (mask_values == 255)):
                raise ValueError('display_background_exclusion_mask_not_binary')
            bounds = [(0, 0, *size)]
            for roi in planned.get('reviewRois', []):
                if (not isinstance(roi, list) or len(roi) != 4 or any(type(v) is not int for v in roi) or
                        not 0 <= roi[0] < roi[2] <= size[0] or not 0 <= roi[1] < roi[3] <= size[1]):
                    raise ValueError('display_background_review_roi_invalid')
                bounds.append(tuple(roi))
            result, background, mask, details = estimate_display_background(rgb, mask_values == 255,
                box_size=planned['boxSize'], source_dilation=planned['sourceDilation'])
            stage = directory / sid; stage.mkdir()
            Image.fromarray(result).save(stage / 'display.png', icc_profile=profile)
            np.savez_compressed(stage / 'background.npz', background=background)
            Image.fromarray(mask.astype('uint8') * 255).save(stage / 'estimation-mask.png')
            with Image.open(stage / 'display.png') as saved:
                saved.load()
                if saved.info.get('icc_profile') != profile or saved.size != size or not np.array_equal(saved, result):
                    raise ValueError('display_background_saved_pixel_or_colour_changed')
            images = [Image.fromarray(rgb), Image.fromarray(result)]; comparisons = []
            for i, bounds_ in enumerate(bounds):
                crops = [image.crop(bounds_) for image in images]
                for crop in crops: crop.thumbnail((640, 640), Image.Resampling.LANCZOS)
                w, h = crops[0].size; contact = Image.new('RGB', (w * 2, h + 28), '#202020'); draw = ImageDraw.Draw(contact)
                for col, (label, crop) in enumerate(zip(('Qualified parent', 'Background display estimate'), crops)):
                    draw.text((col * w + 6, 6), label, fill='white'); contact.paste(crop, (col * w, 28))
                path = stage / f'comparison-{i}.png'; contact.save(path, icc_profile=profile)
                comparisons.append(bound_file(path, root=root))
            opaque = np.full((size[1], size[0]), 255, dtype='uint8')
            row.update(status='DISPLAY_ESTIMATE_PENDING_REVIEW', input=input_binding,
                parentProcessingKeySha256=key_hash, size=list(size), recipe=planned,
                outputs={name: bound_file(stage / name, root=root) for name in
                    ('display.png', 'background.npz', 'estimation-mask.png')}, comparisons=comparisons,
                details=details, wallSeconds=time.perf_counter() - started,
                regions=[{'parent': _region_statistics(rgb, opaque, b),
                          'display': _region_statistics(result, opaque, b)} for b in bounds],
                changedPixels=int(np.any(rgb != result, axis=2).sum()), sceneAcceptance='MISSING',
                publicationContract='MISSING_EXPLICIT_NATIVE_BACKGROUND_DISPLAY_VARIANT',
                science='UNKNOWN', absoluteRegistration='UNVERIFIED', ordinaryAdoption=False)
            cards.append(f'<p>{sid}</p>' + ''.join(f'<img src="{sid}/comparison-{i}.png">' for i in range(len(bounds))))
        except (ValueError, RuntimeError, OSError, KeyError) as error:
            row['error'] = str(error)
    for b in retained + owners_before:
        bound_file(root / b['path'], root=root, expected=b)
    (directory / 'index.html').write_text('<!doctype html><meta charset="utf-8">' + ''.join(cards), encoding='utf-8')
    report = {'schemaVersion': 'optical-display-background-batch-result-v1', 'manifest': manifest_binding,
        'parentStage': parent_stage,
        'processingReceipt': manifest['processingReceipt'], 'reviewReceipt': manifest['reviewReceipt'],
        'rows': rows, 'inputs': retained, 'executionOwners': owners_before,
        'modelCalls': 0, 'photoshopCalls': 0, 'sourceDownloads': 0, 'ordinaryAdoption': False}
    write_report(directory / 'result.json', report)
    return report


if __name__ == '__main__':
    import argparse
    import json
    from pathlib import Path
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, required=True); parser.add_argument('--pin', required=True)
    parser.add_argument('--output', type=Path, required=True); args = parser.parse_args()
    report = background_batch(args.manifest, args.pin, args.output, root=Path(__file__).resolve().parents[2])
    failed = sum(row['status'] == 'FAILED' for row in report['rows'])
    print(json.dumps({'rows': len(report['rows']), 'failed': failed, 'modelCalls': 0, 'photoshopCalls': 0}))
    if failed: raise SystemExit(2)
