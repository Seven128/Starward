"""Bounded local image benchmark. No downloads, publication or source mutation.

One manifest controls all samples; cached artifacts are verified, not trusted
because a directory exists. Scientific validity and absolute registration stay
unknown. Background masks exclude estimation samples, never change coverage.
"""
from __future__ import annotations
import argparse
import hashlib
import io
import json
import os
import re
from pathlib import Path
import subprocess
import sys
import time
import importlib.metadata as metadata

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / 'data-pipelines/deep-sky'))
import numpy as np
from PIL import Image, ImageDraw, ImageCms
import psutil
from optical_publication_io import bound_bytes, bound_file
from optical_display_background import estimate_display_background

# Explicit isolated Siril 1.4.4 defaults, matching first trial colour settings.
# Each invocation gets a private writable copy; no user preferences are read.
SIRIL_CONFIG = '''[core]
check_updates=false
force_16bit=false
fits_save_icc=true
mem_mode=0
mem_ratio=0.9
script_check_requires=true
[gui]
use_scripts_repository=false
use_spcc_repository=false
auto_update_scripts=false
auto_update_spcc=false
startup_scripts=
custom_monitor_profile=
soft_proofing_profile=
icc_custom_monitor_active=false
icc_soft_proofing_active=false
custom_RGB_ICC_profile=
custom_gray_ICC_profile=
rendering_intent=1
proofing_intent=1
export_intent=1
default_to_srgb=true
working_gamut=0
export_8bit_method=0
export_16bit_method=1
icc_autoconversion=0
icc_autoassignment=4
icc_rendering_bpc=true
icc_pedantic_linear=false
'''
METHODS = ('original', 'photutils', 'siril', 'nox', 'nox-upsample', 'starnet', 'starnet-upsample', 'siril-starnet', 'sxt', 'sxt-overlap', 'sxt-upsample')
STAR_REMOVERS = ('nox', 'nox-upsample', 'starnet', 'starnet-upsample', 'siril-starnet', 'sxt', 'sxt-overlap', 'sxt-upsample')
from sxt_processing import (SXT_OVERLAP, sxt_event_for_log, run_external,
    validate_sxt_events, sxt_identity, native_sxt_outputs, write_sxt_native_final, run_sxt_batch)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


RUNNER_SHA = digest(Path(__file__).read_bytes())


def save_json(path, value):
    with path.open('x', encoding='utf8') as file:
        json.dump(value, file, ensure_ascii=False, indent=2, allow_nan=False)


def packages():
    return {key: metadata.version(key) for key in
            ('numpy', 'Pillow', 'astropy', 'photutils', 'scipy', 'psutil', 'PyAVM', 'tifffile')}


def validate_sample_method(sample, method):
    if method not in METHODS:
        raise ValueError('unknown_method')
    if method in STAR_REMOVERS and sample['kind'] == 'cluster':
        raise ValueError('cluster_star_removal_forbidden')
    if method not in sample['methods']:
        raise ValueError('sample_method_not_admitted')
    if sample.get('width', 1024) not in (512, 1024, 2048):
        raise ValueError('unsupported_benchmark_width')


def native_sxt_batch(run_path, destination, run_name, tools, method, samples):
    """Measure the vendor's multi-file call using already bound normalized inputs.

    Fresh inference/output, not artifact cache hits. Prior source normalization
    and review costs remain in the referenced individual receipts.
    """
    if method not in SXT_OVERLAP:
        raise ValueError('native_batch_requires_one_sxt_method')
    run_binding = bound_file(run_path.resolve(), root=ROOT)
    run = json.loads(run_path.read_text(encoding='utf8'))
    rows = [r for r in run['rows'] if r['method'] == method and
            r.get('status') == 'COMPLETED_NOT_QUALITY_ACCEPTANCE']
    if not 1 <= len(rows) <= 5 or len({r['sample'] for r in rows}) != len(rows):
        raise ValueError('native_batch_requires_1_to_5_unique_measured_samples')
    selected = []
    for row in rows:
        matches = [s for s in samples if s['id'] == row['sample']]
        if len(matches) != 1:
            raise ValueError('native_batch_missing_or_duplicate_current_sample')
        sample = matches[0]
        validate_sample_method(sample, method)
        selected.append((row, sample))
    started = time.perf_counter()
    identity = sxt_identity(tools, method)
    bound_sources = []
    for row, sample in selected:
        receipt_path = ROOT / row['receipt']
        receipt_binding = bound_file(receipt_path, root=ROOT)
        receipt = json.loads(receipt_path.read_text(encoding='utf8'))
        if (receipt['key']['method'] != method or
                not re.fullmatch(r'[a-z0-9-]+', sample['id'])):
            raise ValueError('native_batch_receipt_method_or_id_mismatch')
        if receipt['key']['sample'] != sample:
            raise ValueError('native_batch_sample_contract_changed')
        current_metadata = bound_file(ROOT / sample['metadata'], root=ROOT)
        if receipt['key']['metadata'] != current_metadata:
            raise ValueError('native_batch_metadata_changed')
        source_binding = bound_file(ROOT / sample['input']['path'], root=ROOT,
                                   expected=sample['input'])
        if source_binding != receipt['key']['input']:
            raise ValueError('native_batch_source_identity_mismatch')
        if receipt['key']['tools'] != identity:
            raise ValueError('native_batch_tool_or_recipe_changed')
        name = 'sxt-input-2x.png' if method == 'sxt-upsample' else 'original.png'
        source = receipt_path.parent / name
        binding = next(p for p in receipt['outputs'] if (ROOT / p['path']).resolve() == source.resolve())
        bound_file(source, root=ROOT, expected=binding)
        bound_sources.append((sample, receipt_binding, source, receipt['outputSize']))
    # Source-specific benchmark admission stays here. The production owner
    # performs staging, one native call, ICC readback and per-file isolation.
    directory = destination / (run_name + '-files')
    jobs = []
    for sample, receipt_binding, source, output_size in bound_sources:
        jobs.append({'id': sample['id'], 'kind': sample['kind'],
            'input': bound_file(source, root=ROOT), 'outputSize': output_size,
            'dependencies': [run_binding, receipt_binding,
                bound_file(ROOT / sample['metadata'], root=ROOT), sample['input']],
            'sourceContext': sample})
    staging_seconds = time.perf_counter() - started
    batch = run_sxt_batch(jobs, directory, tools, method, root=ROOT)
    comparisons = []
    for job, row in zip(jobs, batch['rows']):
        if row['status'] != 'PROCESSED_PENDING_REVIEW':
            raise RuntimeError('native_batch_item_failed: ' + row['id'])
        reference_path = ROOT / job['dependencies'][1]['path']
        reference = json.loads(reference_path.read_text())
        processed_path = reference_path.parent / 'processed.png'
        binding = next(p for p in reference['outputs'] if (ROOT / p['path']).resolve() == processed_path.resolve())
        bound_file(processed_path, root=ROOT, expected=binding)
        with Image.open(ROOT / row['outputs']['starless']['path']) as image:
            final = np.array(image)
        with Image.open(processed_path) as image:
            delta = np.abs(final.astype('int16') - np.array(image).astype('int16'))
        comparisons.append({'sample': row['id'], **row['state'], **row['color'],
            'meanAbsoluteRGBVsIndividual': float(delta.mean()), 'maxAbsoluteRGBVsIndividual': int(delta.max())})
    return {'status': 'COMPLETED_NOT_QUALITY_ACCEPTANCE', 'method': method,
            'nativeInferenceCalls': batch['nativeInferenceCalls'], 'freshInferenceNotOutputCache': True,
            'normalizedInputsPreviouslyPrepared': True,
            'sourceNormalizationCosts': 'see referenced individual receipts',
            'stagingHashSeconds': staging_seconds, 'details': batch['details'], 'comparisons': comparisons,
            'sources': [{'sample': j['id'], 'receipt': j['dependencies'][1],
                         'input': j['input'], 'outputSize': j['outputSize']} for j in jobs],
            'tools': identity, 'runnerSha256': RUNNER_SHA, 'inputRun': run_binding,
            'processingReceipt': bound_file(directory / 'result.json', root=ROOT),
            'outputs': [bound_file(p, root=ROOT) for p in sorted(directory.rglob('*')) if p.is_file()],
            'manualRepairSeconds': 0, 'reviewSeconds': 'UNKNOWN', 'ordinaryAdoption': False}


def validate_siril_starnet_log(log):
    # Siril itself returns zero even when a pyscript exits with an error.
    if ('StarNet: Working: Done!' not in log or
            'StarNet: Writing starless image to:' not in log or
            'StarNet: Saved Starmask to ' not in log or
            not re.search(r"FILTER\s*=\s*'Starless'", log) or
            'StarNet: unknown mask' in log or 'Traceback (most recent call last)' in log):
        raise RuntimeError('siril_starnet_did_not_complete_inference')


def guard_mask(shape, ellipses):
    h, w = shape
    y, x = np.mgrid[:h, :w]
    mask = np.zeros(shape, dtype=bool)
    for cx, cy, rx, ry, angle in ellipses:
        theta = np.deg2rad(angle)
        dx, dy = x / w - cx, y / h - cy
        a, b = dx * np.cos(theta) + dy * np.sin(theta), -dx * np.sin(theta) + dy * np.cos(theta)
        mask |= (a / rx) ** 2 + (b / ry) ** 2 <= 1
    return mask


def background_display(rgb, guard, out):
    result, background, mask, details = estimate_display_background(rgb, guard)
    np.savez_compressed(out / 'background.npz', background=background)
    Image.fromarray(mask.astype('uint8') * 255).save(out / 'estimation-mask.png')
    return result, details


def process_sample(sample, method, destination, tools, versions, retry_failed=False):
    started = time.perf_counter()
    validate_sample_method(sample, method)
    raw, identity = bound_bytes(ROOT / sample['input']['path'], root=ROOT,
                               expected=sample['input'], max_bytes=32 * 1024 * 1024)
    read_wall = time.perf_counter() - started
    tool_identity = []
    if method.startswith('nox'):
        for name in ('nox.exe', 'noxGeneratorColor.pb', 'tensorflow.dll'):
            p = Path(tools['nox']) / name
            tool_identity.append({'name': name, 'sha256': digest(p.read_bytes())})
    if method.startswith('sxt'):
        tool_identity.extend(sxt_identity(tools, method))
    if 'starnet' in method:
        folder = Path(tools['starnet']).parent
        for p in sorted(folder.rglob('*')):
            if p.is_file():
                tool_identity.append({'name': p.relative_to(folder).as_posix(), 'sha256': digest(p.read_bytes())})
    if method.startswith('siril'):
        p = Path(tools['siril'])
        tool_identity.append({'name': p.name, 'sha256': digest(p.read_bytes()), 'version': '1.4.4',
                              'configuration': digest(SIRIL_CONFIG.encode())})
        for dependency in sorted(p.parent.glob('*.dll')):
            tool_identity.append({'name': dependency.name, 'sha256': digest(dependency.read_bytes())})
        if method == 'siril-starnet':
            script = Path(tools['sirilStarnet'])
            tool_identity.append({'name': script.name, 'sha256': digest(script.read_bytes())})
            package_info = subprocess.check_output([tools['sirilPython'], '-m', 'pip', 'freeze'], text=True)
            tool_identity.append({'sirilPythonPackages': package_info.splitlines()})
    metadata_binding = bound_file(ROOT / sample['metadata'], root=ROOT)
    formula_binding = bound_file(ROOT / 'data-pipelines/deep-sky/publish_prepared_display.py', root=ROOT)
    key = {'input': identity, 'sample': sample, 'metadata': metadata_binding, 'formula': formula_binding, 'method': method, 'tools': tool_identity,
           'packages': versions, 'runner': RUNNER_SHA,
           'spec': f"full-source-LANCZOS-{sample.get('width', 1024)}-sRGB-8bit-PNG; no crop; geometric alpha opaque"}
    key_hash = digest(json.dumps(key, sort_keys=True).encode())
    base = destination / 'cache' / key_hash
    attempts = [p for p in base.parent.glob(key_hash + '-retry-*')
                if p.is_dir() and re.fullmatch(re.escape(key_hash) + r'-retry-\d+', p.name)]
    out = max(attempts, key=lambda p: int(p.name.rsplit('-', 1)[1])) if attempts else base
    receipt = out / 'receipt.json'
    failure = out / 'failure.json'
    if receipt.exists() or failure.exists():
        receipt = receipt if receipt.exists() else failure
        saved = json.loads(receipt.read_text(encoding='utf8'))
        if saved['key'] != key:
            raise RuntimeError('cache_identity_mismatch')
        for file in saved['outputs']:
            bound_file(ROOT / file['path'], root=ROOT, expected=file)
        if saved.get('status') != 'FAILED' or not retry_failed:
            return {'sample': sample['id'], 'method': method, 'cacheHit': True,
                    'seconds': time.perf_counter() - started, 'receipt': str(receipt.relative_to(ROOT)),
                    'status': saved.get('status', 'COMPLETED_NOT_QUALITY_ACCEPTANCE'),
                    **({'error': saved['error']} if 'error' in saved else {})}
        # One explicitly requested retry per invocation; at most three attempts
        # for an unchanged identity. Earlier failure files stay intact.
        attempt = int(out.name.rsplit('-', 1)[1]) + 1 if out != base else 1
        if attempt > 3:
            raise RuntimeError('failed_retry_limit_reached')
        out = base.with_name(key_hash + f'-retry-{attempt}')
        failure = out / 'failure.json'
    out.mkdir(parents=True, exist_ok=False)
    try:
        return produce(sample, method, out, raw, tools, key, started, read_wall)
    except Exception as error:
        saved = {'key': key, 'status': 'FAILED', 'error': f'{type(error).__name__}: {error}',
                 'seconds': time.perf_counter() - started,
                 'outputs': [bound_file(p, root=ROOT) for p in sorted(out.iterdir()) if p.is_file()]}
        save_json(failure, saved)
        return {'sample': sample['id'], 'method': method, 'cacheHit': False,
                'status': 'FAILED', 'error': saved['error'], 'seconds': saved['seconds'],
                'receipt': str(failure.relative_to(ROOT))}


def produce(sample, method, out, raw, tools, key, started, read_wall):
    from normalized_rgb_source import normalize_loaded_rgb
    receipt = out / 'receipt.json'
    t = time.perf_counter()
    with Image.open(io.BytesIO(raw)) as image:
        image.load()
        source = image.copy()
    decode_wall = time.perf_counter() - t
    t = time.perf_counter()
    width = sample.get('width', 1024)
    work = normalize_loaded_rgb(source, width,
        untagged_colour_interpretation=sample.get('untaggedColorInterpretation'), allow_upscale=True)
    size, profile, color = work.source_size, work.icc_profile, work.colour_meaning
    source = Image.frombytes('RGB', work.work_size, work.rgb_bytes)
    rgb = np.array(source)
    resize_wall = work.resize_seconds
    t = time.perf_counter()
    # Store identical normalized bytes once; per-method paths are NTFS hardlinks.
    normalized_bytes = work.png_bytes
    objects = out.parent.parent / 'objects'
    objects.mkdir(exist_ok=True)
    common = objects / (digest(normalized_bytes) + '.png')
    if common.exists():
        if common.read_bytes() != normalized_bytes:
            raise RuntimeError('normalized_object_corrupt')
    else:
        with common.open('xb') as file:
            file.write(normalized_bytes)
    os.link(common, out / 'original.png')
    conversion_wall = time.perf_counter() - t + work.encode_seconds
    guard = guard_mask(rgb.shape[:2], sample.get('protectEllipses', []))
    t = time.perf_counter()
    details = {}
    if method == 'original':
        result = rgb
    elif method == 'photutils':
        if not sample.get('backgroundEligible'):
            raise ValueError('no_reliable_background_samples')
        result, details = background_display(rgb, guard, out)
    elif method.startswith('nox'):
        if sample['kind'] == 'cluster':
            raise ValueError('cluster_star_removal_forbidden')
        result_path = out / 'nox-16.png'
        nox_input = out / 'original.png'
        if method == 'nox-upsample':
            nox_input = out / 'nox-input-2x.png'
            source.resize((source.width * 2, source.height * 2), Image.Resampling.BICUBIC).save(nox_input)
        command = [str(Path(tools['nox']) / 'nox.exe'), '-f', str(nox_input.resolve()),
                   '-o', str(result_path.resolve()), '-w', str(Path(tools['nox']) / 'noxGeneratorColor.pb'),
                   '-p', '512', '-s', '128', '-b', '1']
        details = run_external(command, tools['nox'], out / 'tool.log', 240)
        with Image.open(result_path) as image:
            if method == 'nox-upsample':
                image = image.resize(source.size, Image.Resampling.LANCZOS)
            result = np.array(image.convert('RGB'))
    elif method.startswith('starnet'):
        result_path = out / 'starnet-result.png'
        command = [tools['starnet'], '-i', str((out / 'original.png').resolve()),
                   '-o', str(result_path.resolve()), '-m', str((out / 'starnet-stars.png').resolve())]
        if method == 'starnet-upsample':
            command.append('--upsample')
        details = run_external(command, Path(tools['starnet']).parent, out / 'tool.log', 600)
        with Image.open(result_path) as image:
            result = np.array(image.convert('RGB'))
    elif method.startswith('sxt'):
        result_path = out / 'sxt-result.png'
        sxt_input = out / 'original.png'
        inference_size = source.size
        if method == 'sxt-upsample':
            sxt_input = out / 'sxt-input-2x.png'
            inference_size = (source.width * 2, source.height * 2)
            source.resize(inference_size, Image.Resampling.BICUBIC).save(sxt_input, icc_profile=profile)
        command = [tools['sxt'], 'sxt', str(sxt_input.resolve()),
                   '-o', str(result_path.resolve()), '--ml-version', '11',
                   '--overlap', str(SXT_OVERLAP[method]), '--device', 'gpu',
                   '--depth', '8U', '--stars', '--json']
        details = run_external(command, Path(tools['sxt']).parent, out / 'tool.jsonl', 600,
                               event_filter=sxt_event_for_log)
        details.update(validate_sxt_events(out / 'tool.jsonl', result_path, inference_size))
        model_hash = next(i['sha256'] for i in key['tools'] if i.get('name') == 'StarXTerminator.11.onnx')
        if digest(Path(tools['sxtModel']).read_bytes()) != model_hash:
            raise RuntimeError('sxt_model_changed_during_processing')
        with Image.open(result_path) as image:
            image.load()
            if image.mode != 'RGB' or image.size != inference_size:
                raise RuntimeError('sxt_output_geometry_or_depth_changed')
            if method == 'sxt-upsample':
                image = image.resize(source.size, Image.Resampling.LANCZOS)
            result = np.array(image)
        if np.array_equal(result, rgb):
            raise RuntimeError('sxt_no_effect_on_known_starry_sample')
        details['modelInput'] = 'same normalized whole-source RGB8 PNG with sRGB ICC'
        details['overlap'] = SXT_OVERLAP[method]
        details['inputUpsample'] = 2 if method == 'sxt-upsample' else 1
    elif method == 'siril-starnet':
        import tifffile
        # Siril's 8-bit PNG loader retains 0..255 in uint16 storage, whereas
        # its official wrapper divides uint16 by 65535. An explicit, exact
        # 16-bit display handoff prevents an unintended 257x intensity loss.
        tifffile.imwrite(out / 'input16.tif', rgb.astype(np.uint16) * 257,
                         photometric='rgb', extratags=[(34675, 7, len(profile), profile, False)])
        init = out / 'siril.ini'
        init.write_text(SIRIL_CONFIG, encoding='utf8')
        script = out / 'process.ssf'
        script.write_text(f'''requires 1.4.4
load "{(out / 'input16.tif').resolve().as_posix()}"
savepng "{(out / 'roundtrip').resolve().as_posix()}" 8
pyscript "{Path(tools['sirilStarnet']).as_posix()}" --exe "{Path(tools['starnet']).as_posix()}" --weights "{(Path(tools['starnet']).parent / 'StarNet2_weights.onnx').as_posix()}" --no-linear --no-upsample --stride 256 --protect-highlights --masks starnet-mask
savepng "{(out / 'siril-result').resolve().as_posix()}" 8
close
''', encoding='utf8')
        details = run_external([tools['siril'], '-o', '-i', str(init.resolve()), '-d', str(out.resolve()), '-s', str(script.resolve())],
                               out, out / 'tool.log', 180)
        validate_siril_starnet_log((out / 'tool.log').read_text(encoding='utf8', errors='replace'))
        with Image.open(out / 'roundtrip.png') as image:
            if not np.array_equal(np.array(image.convert('RGB')), rgb):
                raise RuntimeError('siril_roundtrip_changed_input_color_or_scale')
        with Image.open(out / 'siril-result.png') as image:
            result = np.array(image.convert('RGB'))
        from astropy.io import fits
        masks = list(out.glob('starnetmask_*.fit'))
        if len(masks) != 1:
            raise RuntimeError('siril_starnet_mask_missing_or_ambiguous')
        with fits.open(masks[0]) as hdus:
            mask = hdus[0].data
            if (mask.shape != (3, *rgb.shape[:2]) or not np.isfinite(mask).all() or
                    not np.any(mask > 0)):
                raise RuntimeError('siril_starnet_invalid_mask')
        if np.array_equal(result, rgb):
            raise RuntimeError('siril_starnet_no_effect_on_known_starry_sample')
        details['inputRoundtripPixelsExact'] = True
        details['modelInput'] = '16-bit TIFF; exact uint8 * 257; sRGB ICC preserved'
    elif method == 'siril':
        init = out / 'siril.ini'
        init.write_text(SIRIL_CONFIG, encoding='utf8')
        script = out / 'process.ssf'
        script.write_text(f'requires 1.4.4\nload "{(out / "original.png").resolve().as_posix()}"\nset32bits\nsubsky 1 -samples=20 -tolerance=1.0\nsavepng "{(out / "siril-result").resolve().as_posix()}" 16\nclose\n', encoding='utf8')
        details = run_external([tools['siril'], '-o', '-i', str(init.resolve()), '-d', str(out.resolve()), '-s', str(script.resolve())],
                               out, out / 'tool.log', 120)
        with Image.open(out / 'siril-result.png') as image:
            result = np.array(image.convert('RGB'))
    else:
        raise ValueError('unknown_method')
    processing_wall = time.perf_counter() - t
    if result.shape != rgb.shape:
        raise RuntimeError('output_geometry_changed')
    t = time.perf_counter()
    if method == 'original':
        os.link(common, out / 'processed.png')
    else:
        Image.fromarray(result).save(out / 'processed.png', icc_profile=profile or b'')
    delta = result.astype('int16') - rgb.astype('int16')
    Image.fromarray(np.minimum(np.abs(delta) * 8, 255).astype('uint8')).save(out / 'difference-x8.png')
    Image.fromarray(np.maximum(-delta, 0).astype('uint8')).save(out / 'removed-layer.png')
    Image.fromarray(guard.astype('uint8') * 255).save(out / 'protection-region.png')
    contact = Image.new('RGB', (width * 3, rgb.shape[0] + 28), '#202020')
    draw = ImageDraw.Draw(contact)
    for i, (label, pixels) in enumerate([('ORIGINAL', rgb), (method.upper(), result),
                                       ('ABS DIFFERENCE x8 (not quality score)', np.minimum(np.abs(delta) * 8, 255).astype('uint8'))]):
        draw.text((i * width + 8, 5), sample['id'] + ' ' + label, fill='white')
        contact.paste(Image.fromarray(pixels), (i * width, 28))
    contact.save(out / 'comparison.jpg', quality=93)
    encoding_wall = time.perf_counter() - t
    output_bindings = [bound_file(p, root=ROOT) for p in sorted(out.iterdir()) if p.is_file()]
    info = psutil.Process().memory_info()
    saved = {'key': key, 'inputSize': size, 'outputSize': list(source.size), 'icc': color,
        'coordinateChange': 'none; whole-source resize with original bound coordinate metadata',
        'timings': {'readHash': read_wall, 'decode': decode_wall, 'resize': resize_wall,
                    'toolFormatConversion': conversion_wall, 'process': processing_wall,
                    'encodeAndDiagnostics': encoding_wall, 'total': time.perf_counter() - started},
        'download': {'requests': 0, 'inputCacheHit': True}, 'details': details,
        'parentPeakWorkingSetBytes': getattr(info, 'peak_wset', info.rss),
        'parentMemoryMeaning': 'process cumulative high water, not isolated per image',
        'metrics': {'changedPixels': int(np.any(delta != 0, axis=2).sum()),
                    'meanAbsoluteRGB': float(np.abs(delta).mean()),
                    'protectedMeanAbsoluteRGB': float(np.abs(delta[guard]).mean()) if guard.any() else None,
                    'newBlackPixels': int(((result == 0).all(axis=2) & (rgb != 0).any(axis=2)).sum())},
        'manualRepairSeconds': 0, 'manualRepairCount': 0, 'reviewSeconds': 'UNKNOWN',
        'visualQuality': 'PENDING_REVIEW', 'ordinaryAdoption': False,
        'outputUse': ('INDEPENDENT_TOOL_REVIEW_ONLY_NOT_PRODUCT_ASSET_FIXTURE_OR_REFERENCE'
                      if 'starnet' in method else 'LOCAL_EVALUATION_NOT_ADOPTED'),
        'outputs': output_bindings}
    save_json(receipt, saved)
    return {'sample': sample['id'], 'method': method, 'cacheHit': False,
            'seconds': time.perf_counter() - started, 'receipt': str(receipt.relative_to(ROOT))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--run', required=True)
    parser.add_argument('--methods', nargs='+', choices=METHODS, default=['original', 'photutils'])
    parser.add_argument('--samples', nargs='*')
    parser.add_argument('--native-sxt-batch-from', type=Path,
                        help='Bound previous run JSON; measure one native multi-file inference call from its normalized inputs')
    parser.add_argument('--retry-failed', action='store_true',
                        help='One new attempt for a cached failure; preserves evidence, max 3 explicit retries per identity')
    args = parser.parse_args()
    destination = args.output.resolve()
    if not any(destination.is_relative_to((ROOT / p).resolve()) for p in
               ('output/image-tool-benchmark-2026-10-08', 'output/image-tool-full-comparison-2026-10-08')):
        raise ValueError('output_outside_benchmark')
    if not args.run.replace('-', '').isalnum():
        raise ValueError('invalid_run_name')
    summary_path = destination / (args.run + '.json')
    if summary_path.exists():
        raise FileExistsError(summary_path)
    config = json.loads(args.manifest.read_text(encoding='utf8'))
    if args.native_sxt_batch_from:
        if len(args.methods) != 1 or args.samples or args.retry_failed:
            raise ValueError('native_batch_requires_one_method_and_uses_its_bound_run_selection')
        try:
            result = native_sxt_batch(args.native_sxt_batch_from, destination, args.run,
                                      config['tools'], args.methods[0], config['samples'])
        except Exception as error:
            directory = destination / (args.run + '-files')
            save_json(summary_path, {'status': 'FAILED', 'error': f'{type(error).__name__}: {error}',
                'runnerSha256': RUNNER_SHA, 'inputRun': bound_file(args.native_sxt_batch_from.resolve(), root=ROOT),
                'outputs': [bound_file(p, root=ROOT) for p in sorted(directory.rglob('*')) if p.is_file()]})
            raise
        result['manifest'] = bound_file(args.manifest, root=ROOT)
        save_json(summary_path, result)
        print(json.dumps({'status': result['status'], 'nativeInferenceCalls': 1,
                          'samples': len(result['comparisons']), 'seconds': result['details']['wallSeconds']}))
        return
    sample_ids = [s['id'] for s in config['samples']]
    if len(sample_ids) != len(set(sample_ids)) or not sample_ids:
        raise ValueError('empty_or_duplicate_samples')
    if args.samples and not set(args.samples).issubset(sample_ids):
        raise ValueError('unknown_sample_selection')
    rows = []
    started = time.perf_counter()
    versions = packages()
    for sample in config['samples']:
        if args.samples and sample['id'] not in args.samples:
            continue
        for method in args.methods:
            if method not in sample['methods']:
                rows.append({'sample': sample['id'], 'method': method, 'status': 'SKIPPED_POLICY', 'reason': sample.get('reason')})
                continue
            try:
                row = process_sample(sample, method, destination, config['tools'], versions, args.retry_failed)
                row.setdefault('status', 'COMPLETED_NOT_QUALITY_ACCEPTANCE')
            except Exception as error:
                row = {'sample': sample['id'], 'method': method, 'status': 'FAILED',
                       'error': f'{type(error).__name__}: {error}'}
            rows.append(row)
            print(json.dumps(row), flush=True)
    save_json(summary_path, {'rows': rows, 'wallSeconds': time.perf_counter() - started,
                            'packages': versions, 'manifest': bound_file(args.manifest, root=ROOT)})
    if any(row['status'] == 'FAILED' for row in rows):
        sys.exit(1)


if __name__ == '__main__':
    main()
