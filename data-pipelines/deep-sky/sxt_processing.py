"""Offline SXT execution shared by production preparation and experiments.

Source adapters own rights, geometry and working-image admission. This owner
preserves the bound RGB8/sRGB contract; processing never certifies quality.
"""
from __future__ import annotations
import hashlib
import io
import json
import os
import re
import shutil
from pathlib import Path
import subprocess
import threading
import time
import numpy as np
from PIL import Image, ImageCms
import psutil
from optical_publication_io import bound_bytes, bound_file

SXT_OVERLAP = {'sxt': .2, 'sxt-overlap': .5, 'sxt-upsample': .2}

def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def sxt_event_for_log(event):
    # Only processing contract fields enter evidence. Account/license secrets
    # or future discovery fields must never leak through a raw vendor log.
    fields = {'status': ('phase', 'output'),
              'progress': ('file', 'files', 'done', 'mpPerSec', 'eta'),
              'warning': (), 'error': ()}.get(event.get('event'))
    if event.get('event') == 'info':
        fields = {'version': ('cliVersion', 'schemaVersion'),
                  'device': ('device', 'name', 'provider', 'runtime'),
                  'license': ('daysLeft',),
                  'modelDownload': ('file', 'status', 'received', 'total'),
                  'update': ('current', 'new')}.get(event.get('topic'))
    if fields is None:
        return {'event': 'ignored', 'reason': 'outside_processing_contract'}
    return {key: event[key] for key in ('event', 'topic', *fields) if key in event}


def run_external(command, cwd, log, timeout, event_filter=None, cancel=None):
    start = time.perf_counter()
    peak = 0
    with log.open('xb') as stream:
        process = subprocess.Popen(command, cwd=cwd,
            stdout=subprocess.PIPE if event_filter else stream, stderr=subprocess.STDOUT)
        reader_errors = []
        reader = None
        if event_filter:
            def drain():
                try:
                    for line in iter(process.stdout.readline, b''):
                        try:
                            event = json.loads(line)
                            safe = event_filter(event) if isinstance(event, dict) else None
                        except (ValueError, TypeError):
                            safe = None
                        if safe is None:
                            safe = {'event': 'unparsed', 'reason': 'vendor_diagnostic_redacted'}
                        stream.write((json.dumps(safe, allow_nan=False) + '\n').encode('utf8'))
                except Exception as error:
                    reader_errors.append(type(error).__name__)
                finally:
                    process.stdout.close()
            reader = threading.Thread(target=drain, daemon=True)
            reader.start()
        try:
            while process.poll() is None:
                if cancel is not None and cancel():
                    raise InterruptedError('external_processing_cancelled')
                try:
                    parent = psutil.Process(process.pid)
                    members = [parent, *parent.children(recursive=True)]
                    peak = max(peak, sum(p.memory_info().rss for p in members))
                except psutil.NoSuchProcess:
                    pass
                if time.perf_counter() - start > timeout:
                    raise TimeoutError('external_processing_timeout')
                time.sleep(.05)
        finally:
            terminated_children = []
            if process.poll() is None:
                try:
                    terminated_children = psutil.Process(process.pid).children(recursive=True)
                    for child in reversed(terminated_children):
                        try:
                            child.kill()
                        except psutil.NoSuchProcess:
                            pass
                except psutil.NoSuchProcess:
                    pass
                process.kill()
            process.wait()
            if terminated_children:
                _, alive = psutil.wait_procs(terminated_children, timeout=5)
                if alive:
                    raise RuntimeError('external_child_process_not_retired')
            if reader:
                reader.join(timeout=5)
                if reader.is_alive() or reader_errors:
                    raise RuntimeError('external_event_stream_not_drained')
    if process.returncode:
        raise RuntimeError(f'external_exit_{process.returncode}: {log}')
    return {'wallSeconds': time.perf_counter() - start, 'peakWorkingSetBytes': peak,
            'measurement': '50ms process-tree aggregate RSS polling; sampled lower bound, shared pages may count more than once',
            'gpuPeakBytes': 'UNKNOWN'}


def validate_sxt_events(log, result_path, size, events=None):
    if events is None:
        events = [json.loads(line) for line in log.read_text(encoding='utf8').splitlines()]
    if any(e.get('event') in ('error', 'unparsed') for e in events):
        raise RuntimeError('sxt_processing_stream_error')
    completed = [Path(e['output']).resolve() for e in events
                 if e.get('event') == 'status' and e.get('phase') == 'complete' and 'output' in e]
    expected = result_path.resolve()
    if len(completed) != 2 or len(set(completed)) != 2 or expected not in completed:
        raise RuntimeError('sxt_missing_or_ambiguous_completed_output')
    star_path = next(p for p in completed if p != expected)
    if star_path.parent != expected.parent or star_path.suffix.lower() != '.png':
        raise RuntimeError('sxt_star_output_outside_invocation')
    with Image.open(star_path) as image:
        image.load()
        if image.size != size or image.mode != 'RGB' or not np.any(np.asarray(image) > 0):
            raise RuntimeError('sxt_invalid_star_layer')
    devices = [e for e in events if e.get('event') == 'info' and e.get('topic') == 'device']
    if not devices:
        raise RuntimeError('sxt_resolved_device_missing')
    return {'resolvedDevice': devices[-1], 'starLayer': star_path.name,
            'modelVersion': 11, 'eventContract': 6}


def sxt_identity(tools, method):
    if method not in SXT_OVERLAP:
        raise ValueError('unknown_sxt_recipe')
    folder = Path(tools['sxt']).parent
    model = Path(tools['sxtModel']).resolve()
    if model != (Path(os.environ['APPDATA']) / 'RC-Astro/StarXTerminator.11.onnx').resolve():
        raise ValueError('sxt_model_not_in_vendor_ml11_location')
    identity = []
    for p in [Path(tools['sxt']), *sorted(folder.glob('*.dll')),
              *sorted(p for p in (folder / 'rsc').rglob('*') if p.is_file()), model]:
        identity.append({'name': p.name if p == model else p.relative_to(folder).as_posix(),
                         'sha256': digest(p.read_bytes())})
    identity.append({'mlVersion': 11, 'overlap': SXT_OVERLAP[method],
                     'deviceRequest': 'gpu', 'depth': '8U', 'stars': True,
                     'inputUpsample': 2 if method == 'sxt-upsample' else 1})
    return identity


def native_sxt_outputs(completed, sample_id, directory):
    # Observed RC CLI 2.6.9 directory output: <input>-sxt.png and
    # <input>-sxt-stars.png, unlike an explicitly named single-file output.
    expected = directory.resolve() / (sample_id + '-sxt.png')
    stars = directory.resolve() / (sample_id + '-sxt-stars.png')
    if completed.count(expected) != 1 or completed.count(stars) != 1:
        raise RuntimeError('sxt_native_batch_output_name_or_location_mismatch')
    return expected, stars


def write_sxt_native_final(result_path, normalized_input, output_path, final_size, factor):
    """Vendor PNGs may omit ICC; final pixels keep the bound input's sRGB contract."""
    infer_size = tuple(v * factor for v in final_size)
    with Image.open(normalized_input) as source:
        source.load()
        profile = source.info.get('icc_profile')
        if source.mode != 'RGB' or source.size != infer_size or not profile:
            raise RuntimeError('sxt_native_input_color_or_geometry_missing')
        description = ImageCms.getProfileDescription(ImageCms.ImageCmsProfile(io.BytesIO(profile)))
        if 'sRGB' not in description:
            raise RuntimeError('sxt_native_input_not_srgb')
    with Image.open(result_path) as image:
        image.load()
        if image.mode != 'RGB' or image.size != infer_size:
            raise RuntimeError('sxt_native_batch_invalid_starless_pixels')
        final = image.copy() if factor == 1 else image.resize(final_size, Image.Resampling.LANCZOS)
    pixels = np.array(final)
    # Caller uses a new output directory; do not overwrite earlier evidence.
    with output_path.open('xb') as stream:
        final.save(stream, format='PNG', icc_profile=profile)
    with Image.open(output_path) as saved:
        saved.load()
        if saved.info.get('icc_profile') != profile or not np.array_equal(np.array(saved), pixels):
            raise RuntimeError('sxt_native_final_color_or_pixels_not_preserved')
    return pixels, {'colorSpace': 'sRGB', 'iccSha256': digest(profile),
                    'iccOwner': 'bound normalized input; vendor ICC is not relied on'}


def checked_work_image(path, binding, size, *, root):
    """Only an explicit source adapter may supply a normalized working image.

    Refuse alpha rather than silently losing footprint. No production resize
    ceiling is inferred from the experiment's 512/1024-pixel fixtures.
    """
    raw, current = bound_bytes(path, root=root, expected=binding,
                               max_bytes=binding['bytes'])
    if (not isinstance(size, (list, tuple)) or len(size) != 2 or
            any(type(v) is not int or v <= 0 for v in size)):
        raise ValueError('sxt_work_size_invalid')
    if (raw[:8] != b'\x89PNG\r\n\x1a\n' or raw[24:26] != b'\x08\x02' or
            raw[-12:] != b'\x00\x00\x00\x00IEND\xaeB\x60\x82'):
        raise ValueError('sxt_requires_complete_rgb8_png')
    with Image.open(io.BytesIO(raw)) as image:
        image.verify()
    with Image.open(io.BytesIO(raw)) as image:
        image.load()
        profile = image.info.get('icc_profile')
        if image.mode != 'RGB' or image.size != tuple(size) or not profile:
            raise ValueError('sxt_work_color_or_geometry_invalid')
        if 'sRGB' not in ImageCms.getProfileDescription(ImageCms.ImageCmsProfile(io.BytesIO(profile))):
            raise ValueError('sxt_work_not_srgb')
    return current


def validate_job(job, *, root, factor):
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', job.get('id', '')):
        raise ValueError('sxt_job_id_invalid')
    if job.get('kind') not in ('galaxy', 'galaxy-pair', 'nebula', 'region'):
        raise ValueError('sxt_subject_not_admitted')
    size = job.get('outputSize')
    if (not isinstance(size, list) or len(size) != 2 or
            any(type(v) is not int or v <= 0 for v in size)):
        raise ValueError('sxt_job_size_invalid')
    # Preserve source-specific rights/coordinates/normalization decisions by
    # binding their existing receipts, not interpreting a parallel WCS schema.
    dependencies = job.get('dependencies')
    if not isinstance(dependencies, list) or not dependencies or not job.get('sourceContext'):
        raise ValueError('sxt_source_admission_missing')
    for binding in dependencies:
        bound_file(root / binding['path'], root=root, expected=binding)
    checked_work_image(root / job['input']['path'], job['input'],
                       [v * factor for v in size], root=root)
    if 'coverage' in job:
        from covered_rgb_display import validate_covered_input
        validate_covered_input(job, factor, root)


def processing_key(job, tools, method, *, root):
    return {'job': job, 'tools': tools, 'method': method,
            'owner': bound_file(Path(__file__), root=root),
            'pillow': Image.__version__, 'numpy': np.__version__}


def same_sxt_recipe(recorded, current, method):
    """The earliest default receipts predate explicit inputUpsample=1.

    Only that missing representation field is compatible; all binaries,
    model, overlap and other parameters still have to match exactly.
    """
    if not isinstance(recorded, list) or len(recorded) != len(current):
        return False
    normalized = [dict(row) for row in recorded]
    if method in ('sxt', 'sxt-overlap') and 'inputUpsample' not in normalized[-1]:
        normalized[-1]['inputUpsample'] = 1
    return normalized == current


def import_sxt_products(jobs, products, directory, tools, method, *, root):
    """Check already-bound vendor products without repeating unchanged inference.

    Legacy/source adapters supply receipt, events and tool identity. Revalidate
    every product and the exact final RGB/ICC against the vendor layer. This is
    current import evidence, never a claim that old inference ran current code.
    """
    root, directory = root.resolve(), directory.resolve()
    if directory.exists() or directory == root or not directory.is_relative_to(root):
        raise ValueError('sxt_output_must_be_new_directory_under_root')
    if (not jobs or len({j['id'] for j in jobs}) != len(jobs) or
            len(products) != len(jobs) or {p['id'] for p in products} != {j['id'] for j in jobs}):
        raise ValueError('sxt_import_product_set_invalid')
    identity = sxt_identity(tools, method)
    factor = 2 if method == 'sxt-upsample' else 1
    by_id = {p['id']: p for p in products}
    rows = []
    for job in jobs:
        product = by_id[job['id']]
        row = {'id': job['id'], 'key': processing_key(job, identity, method, root=root),
               'status': 'FAILED', 'cacheHit': True, 'origin': 'IMPORTED_EXISTING_INFERENCE'}
        rows.append(row)
        try:
            validate_job(job, root=root, factor=factor)
            receipt_raw, receipt_binding = bound_bytes(root / product['receipt']['path'],
                root=root, expected=product['receipt'], max_bytes=8 * 1024 * 1024)
            receipt = json.loads(receipt_raw)
            if receipt.get('schema') == 'sxt-processing-v1':
                previous = [r for r in receipt.get('rows', []) if r.get('id') == job['id']]
                if len(previous) != 1:
                    raise ValueError('sxt_import_processing_row_missing_or_duplicate')
                prior = previous[0]
                old_job = prior['key']['job']
                # Source declarations and review ROIs can be corrected without
                # repeating inference. Its exact pixels, subject mechanism and
                # coverage must still be those of the sealed original run.
                if (prior.get('status') != 'PROCESSED_PENDING_REVIEW' or prior.get('processingWarnings') or
                        any(old_job.get(k) != job.get(k) for k in ('input', 'outputSize', 'kind', 'coverage')) or
                        prior.get('outputs') != product['outputs']):
                    raise ValueError('sxt_import_processing_pixels_or_subject_changed')
                validate_job(old_job, root=root, factor=factor)
                event_path = (root / product['receipt']['path']).parent / 'tool.jsonl'
                if bound_file(event_path, root=root) != product['events']:
                    raise ValueError('sxt_import_processing_events_changed')
                receipt = {'key': prior['key'],
                    'outputs': [old_job['input'], product['events'], *prior['outputs'].values()]}
            recorded_tools = receipt.get('tools', receipt.get('key', {}).get('tools'))
            if (receipt.get('method', receipt.get('key', {}).get('method')) != method or
                    not same_sxt_recipe(recorded_tools, identity, method)):
                raise ValueError('sxt_import_tool_or_recipe_changed')
            for binding in [product['events'], *product['outputs'].values()]:
                if binding not in receipt.get('outputs', []):
                    raise ValueError('sxt_import_output_not_in_receipt')
                bound_file(root / binding['path'], root=root, expected=binding)
            layers = product['outputs']
            starless, stars = root / layers['vendorStarless']['path'], root / layers['vendorStars']['path']
            event_raw, _ = bound_bytes(root / product['events']['path'], root=root,
                expected=product['events'], max_bytes=8 * 1024 * 1024)
            events = [json.loads(line) for line in event_raw.decode('utf8').splitlines()]
            subset = [e for e in events if e.get('event') != 'status' or
                      e.get('phase') != 'complete' or Path(e.get('output', '')).resolve() in (starless, stars)]
            state = validate_sxt_events(root / product['events']['path'], starless,
                tuple(v * factor for v in job['outputSize']), subset)
            if (state['starLayer'] != stars.name or state['resolvedDevice'].get('device') != 'gpu'):
                raise ValueError('sxt_import_layer_or_device_mismatch')
            checked_work_image(root / layers['starless']['path'], layers['starless'],
                               job['outputSize'], root=root)
            with Image.open(root / job['input']['path']) as image:
                image.load(); profile = image.info['icc_profile']
            with Image.open(starless) as image:
                image.load()
                if image.mode != 'RGB' or image.size != tuple(v * factor for v in job['outputSize']):
                    raise ValueError('sxt_import_vendor_geometry_invalid')
                expected = image.copy() if factor == 1 else image.resize(tuple(job['outputSize']), Image.Resampling.LANCZOS)
            with Image.open(root / layers['starless']['path']) as image:
                image.load()
                if image.tobytes() != expected.tobytes() or image.info.get('icc_profile') != profile:
                    raise ValueError('sxt_import_final_color_or_pixels_changed')
            # An imported vendor run may have used a private staged filename.
            # Its input must be bound by that same receipt and byte-identical.
            if not any(b['sha256'] == job['input']['sha256'] and b['bytes'] == job['input']['bytes']
                       for b in receipt.get('outputs', [])):
                raise ValueError('sxt_import_input_not_in_receipt')
            row.update(status='PROCESSED_PENDING_REVIEW', outputs=layers, state=state,
                       importedReceipt=receipt_binding,
                       color={'colorSpace': 'sRGB', 'iccSha256': digest(profile),
                              'iccOwner': 'bound normalized input'})
            if 'coverage' in job:
                from covered_rgb_display import validate_covered_output, covered_pixels
                validate_covered_output(job, layers, root)
                row['coverageProof'] = covered_pixels(job, layers['starless'], root)[2]
        except (ValueError, RuntimeError, OSError, KeyError) as error:
            row['error'] = str(error)
    if identity != sxt_identity(tools, method):
        raise RuntimeError('sxt_tool_or_model_changed_during_import')
    directory.mkdir(parents=True, exist_ok=False)
    result = {'schema': 'sxt-processing-v1', 'rows': rows, 'nativeInferenceCalls': 0,
              'details': None, 'invocationError': None, 'ordinaryAdoption': False,
              'visualQuality': 'UNVERIFIED'}
    with (directory / 'result.json').open('x', encoding='utf8') as stream:
        json.dump(result, stream, ensure_ascii=False, indent=2, allow_nan=False)
    return result


def run_sxt_batch(jobs, directory, tools, method, *, root, timeout=600,
                  reuse_from=None, cancel=None):
    """One bounded vendor invocation; immutable receipts and per-item failures.

    The caller groups admitted whole working images. Unchanged jobs may reuse
    an explicitly supplied receipt; invalid cache entries fail, never silently
    trigger paid/expensive work. No retries or publication occur here.
    """
    root, directory = root.resolve(), directory.resolve()
    if not directory.is_relative_to(root) or directory == root or directory.exists():
        raise ValueError('sxt_output_must_be_new_directory_under_root')
    if not jobs or len({job.get('id') for job in jobs}) != len(jobs):
        raise ValueError('sxt_batch_requires_unique_jobs')
    if not isinstance(timeout, (float, int)) or not 0 < timeout <= 86400:
        raise ValueError('sxt_timeout_invalid')
    factor = 2 if method == 'sxt-upsample' else 1
    tool_identity = sxt_identity(tools, method)
    # Serial preflight bounds decoder memory. Keep all independent good rows.
    rows, pending = [], []
    cached = {}
    if reuse_from is not None:
        raw, reuse_binding = bound_bytes(reuse_from, root=root, max_bytes=8 * 1024 * 1024)
        previous = json.loads(raw)
        if previous.get('schema') != 'sxt-processing-v1':
            raise ValueError('sxt_cache_schema_invalid')
        cached_rows = previous.get('rows', [])
        if len({r['id'] for r in cached_rows}) != len(cached_rows):
            raise ValueError('sxt_cache_duplicate_jobs')
        cached = {r['id']: r for r in cached_rows}
    for job in jobs:
        key = processing_key(job, tool_identity, method, root=root)
        row = {'id': job.get('id'), 'key': key, 'status': 'FAILED', 'cacheHit': False}
        rows.append(row)
        try:
            validate_job(job, root=root, factor=factor)
            old = cached.get(job['id'])
            if old and old.get('key') == key and old.get('status') == 'PROCESSED_PENDING_REVIEW':
                for binding in old['outputs'].values():
                    bound_file(root / binding['path'], root=root, expected=binding)
                checked_work_image(root / old['outputs']['starless']['path'],
                    old['outputs']['starless'], job['outputSize'], root=root)
                if 'coverage' in job:
                    from covered_rgb_display import validate_covered_output
                    validate_covered_output(job, old['outputs'], root)
                row.update(old, cacheHit=True, reusedReceipt=reuse_binding)
            else:
                pending.append((job, row))
        except (ValueError, RuntimeError, OSError, KeyError) as error:
            row['error'] = str(error)
    directory.mkdir(parents=True, exist_ok=False)
    details, invocation_error, calls = None, None, 0
    try:
        if pending:
            inputs, outputs = directory / 'inputs', directory / 'outputs'
            inputs.mkdir(); outputs.mkdir()
            for job, row in pending:
                staged = inputs / (job['id'] + '.png')
                # Private copies: a vendor must not be able to mutate a source
                # cache inode through a hard link.
                shutil.copyfile(root / job['input']['path'], staged)
                bound_file(staged, root=root, expected=job['input'])
            command = [tools['sxt'], 'sxt', *[str(inputs / (j['id'] + '.png')) for j, _ in pending],
                '-o', str(outputs), '--ml-version', '11', '--device', 'gpu',
                '--overlap', str(SXT_OVERLAP[method]), '--depth', '8U', '--stars', '--json']
            calls = 1
            try:
                details = run_external(command, Path(tools['sxt']).parent,
                    directory / 'tool.jsonl', timeout, event_filter=sxt_event_for_log, cancel=cancel)
            except (RuntimeError, TimeoutError, InterruptedError) as error:
                invocation_error = type(error).__name__
            if tool_identity != sxt_identity(tools, method):
                raise RuntimeError('sxt_tool_or_model_changed_during_batch')
            events = [json.loads(line) for line in (directory / 'tool.jsonl').read_text().splitlines()]
            completed = [Path(e['output']).resolve() for e in events if e.get('event') == 'status'
                         and e.get('phase') == 'complete' and 'output' in e]
            allowed = {outputs / (j['id'] + suffix) for j, _ in pending
                       for suffix in ('-sxt.png', '-sxt-stars.png')}
            if any(p not in allowed for p in completed) or len(set(completed)) != len(completed):
                raise RuntimeError('sxt_unexpected_or_duplicate_output')
            for job, row in pending:
                try:
                    validate_job(job, root=root, factor=factor)
                    staged = inputs / (job['id'] + '.png')
                    bound_file(staged, root=root, expected=job['input'])
                    starless, stars = native_sxt_outputs(completed, job['id'], outputs)
                    subset = [e for e in events if e.get('event') not in ('error', 'unparsed') and
                        (e.get('event') != 'status' or e.get('phase') != 'complete' or
                         Path(e.get('output', '')).resolve() in (starless, stars))]
                    state = validate_sxt_events(directory / 'tool.jsonl', starless,
                        tuple(v * factor for v in job['outputSize']), subset)
                    if state['resolvedDevice'].get('device') != 'gpu':
                        raise RuntimeError('sxt_gpu_not_used')
                    final = outputs / (job['id'] + '-final.png')
                    _, color = write_sxt_native_final(starless, staged, final, tuple(job['outputSize']), factor)
                    row.update(status='PROCESSED_PENDING_REVIEW', state=state, color=color,
                        outputs={k: bound_file(p, root=root) for k, p in
                                 [('starless', final), ('vendorStarless', starless), ('vendorStars', stars)]})
                    if 'coverage' in job:
                        from covered_rgb_display import write_covered_output
                        covered = outputs / (job['id'] + '-covered.png')
                        row['coverageProof'] = write_covered_output(job, row['outputs']['starless'], covered, root)
                        row['outputs']['coveredStarless'] = bound_file(covered, root=root)
                    if invocation_error or any(e.get('event') in ('error', 'unparsed') for e in events):
                        row['processingWarnings'] = ['VENDOR_INVOCATION_INCOMPLETE_REVIEW_REQUIRED']
                except (ValueError, RuntimeError, OSError, KeyError) as error:
                    row['error'] = str(error)
        for job, row in zip(jobs, rows):
            if row['status'] == 'PROCESSED_PENDING_REVIEW':
                try:
                    validate_job(job, root=root, factor=factor)
                    for binding in row['outputs'].values():
                        bound_file(root / binding['path'], root=root, expected=binding)
                    if 'coverage' in job:
                        from covered_rgb_display import validate_covered_output
                        validate_covered_output(job, row['outputs'], root)
                except (ValueError, RuntimeError, OSError, KeyError) as error:
                    row.update(status='FAILED', error=str(error))
    except BaseException as error:
        invocation_error = type(error).__name__
        raise
    finally:
        result = {'schema': 'sxt-processing-v1', 'rows': rows, 'nativeInferenceCalls': calls,
                  'details': details, 'invocationError': invocation_error,
                  'ordinaryAdoption': False, 'visualQuality': 'UNVERIFIED'}
        with (directory / 'result.json').open('x', encoding='utf8') as stream:
            json.dump(result, stream, ensure_ascii=False, indent=2, allow_nan=False)
    return result


