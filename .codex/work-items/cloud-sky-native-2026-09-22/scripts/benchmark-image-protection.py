"""Replay the benchmark's frozen ellipse mask on already measured whole images.

This measures a bounded recovery option, not a finished asset pipeline. It does
not run a model, invent a nebula mask, remove stars inside protected regions,
change geometric coverage, or admit StarNet-derived pixels to the product.
"""
from __future__ import annotations
import argparse
import importlib.util
import io
import json
from pathlib import Path
import re
import time

import numpy as np
from PIL import Image, ImageCms, ImageDraw

SCRIPT = Path(__file__).resolve()
spec = importlib.util.spec_from_file_location('image_benchmark', SCRIPT.with_name('benchmark-image-tools.py'))
benchmark = importlib.util.module_from_spec(spec)
spec.loader.exec_module(benchmark)
ROOT = benchmark.ROOT
OUTPUT_ROOT = (ROOT / 'output/image-tool-full-comparison-2026-10-08').resolve()


def workspace_path(value):
    path = (ROOT / value).resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError('path_outside_workspace')
    return path


def read_bound_json(value):
    path = workspace_path(value)
    binding = benchmark.bound_file(path, root=ROOT)
    return path, json.loads(path.read_text(encoding='utf8')), binding


def checked_pixels(path, receipt, size):
    binding = next(p for p in receipt['outputs']
                   if workspace_path(p['path']) == path)
    benchmark.bound_file(path, root=ROOT, expected=binding)
    with Image.open(path) as image:
        image.load()
        profile = image.info.get('icc_profile')
        if image.mode != 'RGB' or image.size != size or not profile:
            raise ValueError('replay_color_or_geometry_missing')
        description = ImageCms.getProfileDescription(ImageCms.ImageCmsProfile(io.BytesIO(profile)))
        if 'sRGB' not in description:
            raise ValueError('replay_requires_bound_srgb')
        return np.array(image), profile, binding


def prepare(manifest_path, run_paths, sample_ids, methods):
    _, config, manifest_binding = read_bound_json(manifest_path)
    samples = {s['id']: s for s in config['samples']}
    if len(samples) != len(config['samples']) or len(set(sample_ids)) != len(sample_ids):
        raise ValueError('duplicate_sample_id')
    if len(set(methods)) != len(methods) or not methods:
        raise ValueError('duplicate_or_empty_methods')
    # Reject incompatible targets even when the input runs contain no match.
    for sid in sample_ids:
        sample = samples[sid]
        for method in methods:
            benchmark.validate_sample_method(sample, method)
            if method not in benchmark.STAR_REMOVERS:
                raise ValueError('replay_requires_measured_star_remover')
        if not sample.get('protectEllipses'):
            raise ValueError('no_qualified_protection_mask')
        ellipses = np.asarray(sample['protectEllipses'], dtype=float)
        if (ellipses.ndim != 2 or ellipses.shape[1] != 5 or
                not np.isfinite(ellipses).all() or (ellipses[:, 2:4] <= 0).any()):
            raise ValueError('invalid_protection_ellipses')
    rows, runs = {}, []
    for run_path in run_paths:
        _, run, binding = read_bound_json(run_path)
        runs.append(binding)
        for row in run['rows']:
            if row['sample'] not in sample_ids or row['method'] not in methods:
                continue
            if row.get('status') != 'COMPLETED_NOT_QUALITY_ACCEPTANCE':
                raise ValueError('replay_requires_completed_measurement')
            key = (row['sample'], row['method'])
            if key in rows:
                raise ValueError('duplicate_measured_combination')
            rows[key] = row
    jobs, missing = [], []
    for sid in sample_ids:
        sample = samples[sid]
        for method in methods:
            row = rows.get((sid, method))
            if row is None:
                missing.append({'sample': sid, 'method': method, 'status': 'UNMEASURED_INPUT_COMBINATION'})
                continue
            receipt_path, receipt, receipt_binding = read_bound_json(row['receipt'])
            key = receipt['key']
            if key['method'] != method:
                raise ValueError('replay_receipt_method_mismatch')
            recorded_sample = dict(key['sample'])
            current_sample = dict(sample)
            recorded_methods = recorded_sample.pop('methods')
            current_methods = current_sample.pop('methods')
            # Historical runs may precede an additive candidate entry. No target,
            # geometry, rights, protection rule or revoked admission can change.
            if (recorded_sample != current_sample or method not in recorded_methods or
                    not set(recorded_methods).issubset(current_methods)):
                raise ValueError('replay_sample_contract_changed')
            if benchmark.bound_file(workspace_path(sample['metadata']), root=ROOT) != key['metadata']:
                raise ValueError('replay_metadata_changed')
            source = benchmark.bound_file(workspace_path(sample['input']['path']), root=ROOT,
                                          expected=sample['input'])
            if source != key['input']:
                raise ValueError('replay_original_source_changed')
            size = tuple(receipt['outputSize'])
            if len(size) != 2 or size[0] != sample['width'] or min(size) <= 0:
                raise ValueError('replay_output_geometry_changed')
            original, profile, original_binding = checked_pixels(receipt_path.parent / 'original.png', receipt, size)
            processed, processed_profile, processed_binding = checked_pixels(receipt_path.parent / 'processed.png', receipt, size)
            if profile != processed_profile:
                raise ValueError('replay_input_color_contract_changed')
            mask = benchmark.guard_mask(original.shape[:2], sample['protectEllipses'])
            if not mask.any() or mask.all():
                raise ValueError('replay_mask_empty_or_whole_frame')
            jobs.append({'sample': sample, 'method': method, 'receipt': receipt,
                         'receiptBinding': receipt_binding, 'sourceBinding': source,
                         'originalBinding': original_binding, 'processedBinding': processed_binding,
                         'samplePolicyEpochChange': recorded_methods != current_methods,
                         'original': original, 'processed': processed, 'profile': profile, 'mask': mask})
    if not jobs or len(jobs) > 15:
        raise ValueError('replay_requires_1_to_15_measured_combinations')
    return jobs, missing, {'manifest': manifest_binding, 'inputRuns': runs,
                           'helper': benchmark.bound_file(SCRIPT, root=ROOT),
                           'maskAndPolicyOwner': benchmark.bound_file(SCRIPT.with_name('benchmark-image-tools.py'), root=ROOT)}


def replay(job, directory):
    started = time.perf_counter()
    original, processed, mask = job['original'], job['processed'], job['mask']
    result = processed.copy()
    result[mask] = original[mask]
    composition_seconds = time.perf_counter() - started
    directory.mkdir(exist_ok=False)
    output = directory / 'protected.png'
    with output.open('xb') as file:
        Image.fromarray(result).save(file, format='PNG', icc_profile=job['profile'])
    with Image.open(output) as image:
        image.load()
        saved = np.array(image)
        if (image.mode != 'RGB' or image.size != (original.shape[1], original.shape[0]) or
                image.info.get('icc_profile') != job['profile'] or not np.array_equal(saved, result)):
            raise RuntimeError('replay_output_readback_mismatch')
    protected_equal = np.array_equal(saved[mask], original[mask])
    outside_equal = np.array_equal(saved[~mask], processed[~mask])
    if not protected_equal or not outside_equal:
        raise RuntimeError('replay_internal_or_external_pixels_changed')
    with (directory / 'mask.png').open('xb') as file:
        Image.fromarray(mask.astype('uint8') * 255).save(file, format='PNG')
    width, height = original.shape[1], original.shape[0]
    contact = Image.new('RGB', (width * 3, height + 28), '#202020')
    draw = ImageDraw.Draw(contact)
    for i, (label, pixels) in enumerate((('ORIGINAL', original), (job['method'].upper(), processed),
                                        ('FROZEN MASK RESTORE (not final acceptance)', saved))):
        draw.text((i * width + 8, 5), job['sample']['id'] + ' ' + label, fill='white')
        contact.paste(Image.fromarray(pixels), (i * width, 28))
    with (directory / 'comparison.jpg').open('xb') as file:
        contact.save(file, format='JPEG', quality=93)
    info = {'sample': job['sample']['id'], 'method': job['method'],
            'status': 'COMPLETED_NOT_QUALITY_ACCEPTANCE', 'newInferenceCalls': 0,
            'recipe': 'original pixels inside frozen full-source ellipses; measured processed pixels outside; hard mask, no feathering',
            'originalSource': job['sourceBinding'], 'sourceReceipt': job['receiptBinding'],
            'normalizedOriginal': job['originalBinding'], 'measuredProcessed': job['processedBinding'],
            'samplePolicyEpochChange': job['samplePolicyEpochChange'],
            'outputSize': [width, height], 'colorSpace': 'sRGB', 'iccSha256': benchmark.digest(job['profile']),
            'coordinateChange': 'none; same full-frame dimensions and opaque geometry',
            'protectEllipses': job['sample']['protectEllipses'],
            'protectedPixels': int(mask.sum()), 'totalPixels': int(mask.size),
            'restoredChangedPixels': int(np.any(original[mask] != processed[mask], axis=1).sum()),
            'protectedPixelsEqualOriginal': protected_equal, 'outsidePixelsEqualMeasured': outside_equal,
            'protectedMeanAbsoluteRGBVsOriginal': float(np.abs(saved[mask].astype('int16') - original[mask]).mean()),
            'timings': {'compose': composition_seconds, 'composeEncodeReadbackDiagnostics': time.perf_counter() - started,
                        'priorSingleMachineTotal': job['receipt']['timings']['total']},
            'manualRepairSeconds': 0, 'manualRepairCount': 0, 'reviewSeconds': 'UNKNOWN',
            'visualQuality': 'PENDING_REVIEW', 'ordinaryAdoption': False,
            'remainingRisk': 'foreground stars also restored inside mask; target structure outside mask and mask/photo boundaries remain unqualified',
            'outputUse': ('INDEPENDENT_TOOL_REVIEW_ONLY_NOT_PRODUCT_ASSET_FIXTURE_OR_REFERENCE'
                          if 'starnet' in job['method'] else 'LOCAL_EVALUATION_NOT_ADOPTED'),
            'outputs': [benchmark.bound_file(p, root=ROOT) for p in sorted(directory.iterdir())]}
    benchmark.save_json(directory / 'receipt.json', info)
    return info


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', required=True)
    parser.add_argument('--from', dest='runs', nargs='+', required=True)
    parser.add_argument('--samples', nargs='+', required=True)
    parser.add_argument('--methods', nargs='+', required=True)
    parser.add_argument('--run', required=True)
    args = parser.parse_args()
    if not re.fullmatch(r'[a-z0-9-]+', args.run):
        raise ValueError('invalid_run_name')
    directory = OUTPUT_ROOT / args.run
    if directory.exists():
        raise FileExistsError('replay_run_already_exists')
    started = time.perf_counter()
    # Policy, source, receipts, color and every job resolve before any output.
    jobs, missing, inputs = prepare(args.manifest, args.runs, args.samples, args.methods)
    preflight_seconds = time.perf_counter() - started
    directory.mkdir(exist_ok=False)
    try:
        rows = [replay(job, directory / (job['sample']['id'] + '-' + job['method'])) for job in jobs]
        result = {'status': 'COMPLETED_NOT_QUALITY_ACCEPTANCE', 'rows': rows, 'unmeasured': missing,
                  'newInferenceCalls': 0, 'inputs': inputs, 'preflightSeconds': preflight_seconds,
                  'wallSeconds': time.perf_counter() - started,
                  'note': 'Offline protection feasibility only; preserved mask pixels are not global quality acceptance'}
        benchmark.save_json(directory / 'result.json', result)
        print(json.dumps({'status': result['status'], 'rows': len(rows), 'unmeasured': missing,
                          'wallSeconds': result['wallSeconds'], 'result': str((directory / 'result.json').relative_to(ROOT))}))
    except Exception as error:
        benchmark.save_json(directory / 'failed.json', {'status': 'FAILED', 'errorType': type(error).__name__,
                            'error': str(error), 'inputs': inputs,
                            'partialOutputs': [benchmark.bound_file(p, root=ROOT) for p in sorted(directory.rglob('*')) if p.is_file()]})
        raise


if __name__ == '__main__':
    main()
