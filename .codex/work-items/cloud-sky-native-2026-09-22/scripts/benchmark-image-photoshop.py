"""Actual local Photoshop batch; reuse byte-bound normalized benchmark originals.

No downloads, model inference substitution, source saves, or product adoption.
Every input is admitted before staging. A fresh run never overwrites evidence.
"""
from __future__ import annotations
import argparse
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import subprocess
import time
import sys

import numpy as np
from PIL import Image, ImageCms, ImageFilter, ImageDraw
import psutil

SCRIPT = Path(__file__).resolve()
ROOT = SCRIPT.parents[4]
OUTPUT = ROOT / 'output/image-tool-full-comparison-2026-10-08'
sys.path.insert(0, str(ROOT / 'data-pipelines/deep-sky'))
spec = importlib.util.spec_from_file_location('image_benchmark_owner', SCRIPT.with_name('benchmark-image-tools.py'))
benchmark = importlib.util.module_from_spec(spec)
spec.loader.exec_module(benchmark)
JSX = ROOT / 'data-pipelines/deep-sky/photoshop_batch.jsx'
HOST = ROOT / 'data-pipelines/deep-sky/photoshop_batch.ps1'
RECIPES = SCRIPT.with_name('image-tool-photoshop-recipes.json')
OPERATIONS = {'roundtrip': 'photoshop-roundtrip', 'ps-only': 'ps-only', 'ps-sxt': 'ps-sxt'}


def workspace_path(value):
    path = (ROOT / value).resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError('photoshop_path_outside_workspace')
    return path


def read_json(value):
    path = workspace_path(value)
    raw, binding = benchmark.bound_bytes(path, root=ROOT, max_bytes=8*1024*1024)
    return path, json.loads(raw), binding


def tool_binding(pin):
    path = Path(pin['path'])
    if not path.is_absolute():
        raise ValueError('photoshop_tool_path_not_absolute')
    path = path.resolve()
    # Explicit pinned vendor files, with the same streaming identity owner.
    value = benchmark.bound_file(path, root=path.parent, expected=pin, max_bytes=512*1024*1024)
    return {**value, 'path': path.as_posix()}


def recipe_inputs(operation):
    _, recipes, binding = read_json(RECIPES)
    recipe = recipes['recipes'][operation]
    if recipe['baseEligibility'] != ('sxt' if operation == 'ps-sxt' else 'original'):
        raise ValueError('photoshop_recipe_admission_changed')
    tools = recipes['tools'] if operation == 'ps-sxt' else recipes['tools'][:1]
    pins = [tool_binding(p) for p in tools]
    action = recipes['action']
    if operation == 'ps-sxt':
        benchmark.bound_file(workspace_path(action['path']), root=ROOT, expected=action)
        if action['model'] != 11 or action['overlap'] != .2:
            raise ValueError('photoshop_action_params_changed')
    if operation == 'ps-only' and not (0 <= recipe['fuzziness'] <= 100 and
            0 <= recipe['highlightMinimum'] <= 255 and 0 < recipe['minimumRadiusPixels'] <= 2 and
            0 <= recipe['expandPixels'] <= 2 and 0 < recipe['starFeatherPixels'] <= 2):
        raise ValueError('photoshop_star_reduction_outside_bounded_recipe')
    if operation != 'roundtrip' and not 0 < recipe['protectionFeatherPixels'] <= 16:
        raise ValueError('photoshop_protection_feather_outside_bound')
    return recipes, recipe, {'recipeBinding': binding, 'vendorTools': pins,
                            'action': action if operation == 'ps-sxt' else None}


def prepare(manifest, runs, ids, operation='roundtrip'):
    recipes, recipe, native_inputs = recipe_inputs(operation)
    _, config, manifest_pin = read_json(manifest)
    samples = {s['id']: s for s in config['samples']}
    if len(samples) != len(config['samples']) or not 1 <= len(ids) <= 5 or len(set(ids)) != len(ids):
        raise ValueError('photoshop_invalid_sample_selection')
    for sid in ids:
        sample = samples[sid]
        benchmark.validate_sample_method(sample, 'original')
        benchmark.validate_sample_method(sample, recipe['baseEligibility'])
        # This adapter will support star reduction/separation. Never generic
        # processing of cluster members, including when no old row is found.
        if sample['kind'] not in ('galaxy', 'galaxy-pair', 'nebula'):
            raise ValueError('photoshop_target_requires_separate_cluster_recipe')
    originals, run_pins = {}, []
    for value in runs:
        _, run, pin = read_json(value)
        run_pins.append(pin)
        for row in run['rows']:
            if row['sample'] not in ids or row['method'] != 'original':
                continue
            if row['sample'] in originals or row['status'] != 'COMPLETED_NOT_QUALITY_ACCEPTANCE':
                raise ValueError('photoshop_ambiguous_or_failed_original')
            originals[row['sample']] = row
    jobs = []
    for sid in ids:
        sample = samples[sid]
        row = originals[sid]
        receipt_path, receipt, receipt_pin = read_json(row['receipt'])
        key = receipt['key']
        old_sample, current_sample = dict(key['sample']), dict(sample)
        old_methods, current_methods = old_sample.pop('methods'), current_sample.pop('methods')
        if (key['method'] != 'original' or old_sample != current_sample or
                'original' not in old_methods or not set(old_methods).issubset(current_methods)):
            raise ValueError('photoshop_original_policy_changed')
        source_pin = benchmark.bound_file(workspace_path(sample['input']['path']), root=ROOT, expected=sample['input'])
        metadata_pin = benchmark.bound_file(workspace_path(sample['metadata']), root=ROOT)
        if key['input'] != source_pin or key['metadata'] != metadata_pin:
            raise ValueError('photoshop_source_or_metadata_changed')
        normalized = receipt_path.parent / 'original.png'
        pin = next(p for p in receipt['outputs'] if workspace_path(p['path']) == normalized)
        raw, _ = benchmark.bound_bytes(normalized, root=ROOT, expected=pin, max_bytes=16*1024*1024)
        with Image.open(io.BytesIO(raw)) as image:
            image.load()
            profile = image.info.get('icc_profile')
            if image.mode != 'RGB' or list(image.size) != receipt['outputSize'] or image.width != sample['width'] or not profile:
                raise ValueError('photoshop_normalized_geometry_or_color_changed')
            if 'sRGB' not in ImageCms.getProfileDescription(ImageCms.ImageCmsProfile(io.BytesIO(profile))):
                raise ValueError('photoshop_input_not_bound_srgb')
        jobs.append({'sample': sample, 'normalized': normalized, 'normalizedPin': pin,
                     'sourcePin': source_pin, 'metadataPin': metadata_pin,
                     'sourceReceipt': receipt_pin, 'size': receipt['outputSize'], 'profile': profile})
    return jobs, {'manifest': manifest_pin, 'sourceRuns': run_pins, **native_inputs,
                  'adapter': benchmark.bound_file(SCRIPT, root=ROOT),
                  'jsx': benchmark.bound_file(JSX, root=ROOT),
                  'host': benchmark.bound_file(HOST, root=ROOT),
                  'nativeDispatch': benchmark.bound_file(ROOT / 'data-pipelines/deep-sky/photoshop_host.py', root=ROOT),
                  'policyAndBindingOwner': benchmark.bound_file(SCRIPT.with_name('benchmark-image-tools.py'), root=ROOT),
                  'packages': benchmark.packages()}, recipes, recipe


def recheck_inputs(jobs, inputs):
    for name in ('manifest', 'adapter', 'jsx', 'host', 'policyAndBindingOwner', 'recipeBinding', 'nativeDispatch'):
        pin = inputs[name]
        benchmark.bound_file(workspace_path(pin['path']), root=ROOT, expected=pin)
    for pin in inputs['sourceRuns']:
        benchmark.bound_file(workspace_path(pin['path']), root=ROOT, expected=pin)
    for pin in inputs['vendorTools']:
        tool_binding(pin)
    if inputs['action']:
        pin = inputs['action']
        benchmark.bound_file(workspace_path(pin['path']), root=ROOT, expected=pin)
    for job in jobs:
        for field in ('sourcePin', 'metadataPin', 'sourceReceipt', 'normalizedPin'):
            pin = job[field]
            benchmark.bound_file(workspace_path(pin['path']), root=ROOT, expected=pin)


def receipt_key(job, inputs, operation, recipe, export):
    return {'method': OPERATIONS[operation], 'sample': job['sample'], 'input': job['sourcePin'],
            'metadata': job['metadataPin'], 'normalizedInput': job['normalizedPin'], 'adapter': inputs,
            'recipe': recipe, 'export': export}


def reuse_rows(path, jobs, inputs, operation, recipe, export):
    _, previous, _ = read_json(path)
    selected = []
    for job in jobs:
        matches = [r for r in previous['rows'] if r['sample'] == job['sample']['id'] and r['method'] == OPERATIONS[operation]]
        if len(matches) != 1 or matches[0]['status'] != 'COMPLETED_NOT_QUALITY_ACCEPTANCE':
            raise ValueError('photoshop_reuse_missing_success')
        row = matches[0]
        _, receipt, _ = read_json(row['receipt'])
        if receipt['key'] != receipt_key(job, inputs, operation, recipe, export):
            raise ValueError('photoshop_reuse_identity_changed')
        for pin in receipt['outputs']:
            benchmark.bound_file(workspace_path(pin['path']), root=ROOT, expected=pin)
        selected.append({**row, 'cacheHit': True, 'seconds': 0})
    recheck_inputs(jobs, inputs)
    return selected


def dispatch(config_path, result_path, seconds=240):
    # One shared native host; historical benchmark orchestration stays task-local.
    from photoshop_host import dispatch_photoshop
    return dispatch_photoshop(config_path, result_path, seconds)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', required=True)
    parser.add_argument('--from', dest='runs', nargs='+', required=True)
    parser.add_argument('--samples', nargs='+', required=True)
    parser.add_argument('--run', required=True)
    parser.add_argument('--operation', choices=tuple(OPERATIONS), default='roundtrip')
    parser.add_argument('--export', choices=('plain', 'save-for-web-profile'), default='save-for-web-profile')
    parser.add_argument('--preflight-only', action='store_true')
    parser.add_argument('--reuse-from', help='Verify a previous identical run and all outputs; no Photoshop invocation')
    args = parser.parse_args()
    if not re.fullmatch('[a-z0-9-]+', args.run):
        raise ValueError('photoshop_invalid_run_name')
    directory = OUTPUT / args.run
    if directory.exists():
        raise FileExistsError('photoshop_run_already_exists')
    started = time.perf_counter()
    jobs, inputs, recipes, recipe = prepare(args.manifest, args.runs, args.samples, args.operation)
    if args.preflight_only:
        print(json.dumps({'status': 'PREFLIGHT_ONLY_NO_PS_EXECUTION', 'samples': args.samples, 'seconds': time.perf_counter()-started}))
        return
    preflight = time.perf_counter() - started
    if args.reuse_from:
        rows = reuse_rows(args.reuse_from, jobs, inputs, args.operation, recipe, args.export)
        directory.mkdir(exist_ok=False)
        benchmark.save_json(directory / 'result.json', {'status':'VERIFIED_REUSE_NO_PHOTOSHOP_EXECUTION',
            'rows':rows, 'inputs':inputs, 'wallSeconds':time.perf_counter()-started,
            'freshPhotoshopExecution':False, 'ordinaryAdoption':False})
        print(json.dumps({'status':'VERIFIED_REUSE_NO_PHOTOSHOP_EXECUTION', 'rows':len(rows), 'seconds':time.perf_counter()-started}))
        return
    directory.mkdir(exist_ok=False)
    config = {'operation': args.operation, 'pngExport': args.export,
              'jsxSha256': inputs['jsx']['sha256'], 'jobs': [], 'recipe':recipe,
              'photoshopVersion':recipes['photoshopVersion'], 'vendorTools':inputs['vendorTools']}
    if args.operation == 'ps-sxt':
        action = recipes['action']
        config.update({'actionPath':str(workspace_path(action['path'])), 'actionSha256':action['sha256'],
                       'actionSet':action['set'], 'actionName':action['name']})
    for job in jobs:
        folder = directory / job['sample']['id']
        folder.mkdir()
        os.link(job['normalized'], folder / 'original.png')
        instruction = {'sample': job['sample']['id'], 'input': str(job['normalized']),
            'inputSha256': job['normalizedPin']['sha256'], 'width': job['size'][0], 'height': job['size'][1],
            'output': str(folder / 'photoshop-raw.png')}
        if args.operation != 'roundtrip':
            instruction.update({'raw':str(folder / 'raw-processed.png'), 'psd':str(folder / 'editable.psd')})
            if job['sample'].get('protectEllipses'):
                mask = benchmark.guard_mask((job['size'][1],job['size'][0]),job['sample']['protectEllipses'])
                image = Image.fromarray(mask.astype('uint8')*255).filter(ImageFilter.GaussianBlur(recipe['protectionFeatherPixels']))
                with (folder / 'protection-mask.png').open('xb') as stream:
                    image.save(stream,format='PNG')
                instruction['protectionMask'] = str(folder / 'protection-mask.png')
                instruction['protectionMaskSha256'] = benchmark.bound_file(folder / 'protection-mask.png',root=ROOT)['sha256']
        config['jobs'].append(instruction)
    benchmark.save_json(directory / 'config.json', config)
    try:
        report, costs = dispatch(directory / 'config.json', directory / 'photoshop-result.json')
        if len(report['rows']) != len(jobs) or report['documentIdsBefore'] != report['documentIdsAfter']:
            raise RuntimeError('photoshop_missing_result_or_document_leak')
        rows = []
        for job, native, instruction in zip(jobs, report['rows'], config['jobs']):
            sid = job['sample']['id']
            if native['sample'] != sid or native['output'] != instruction['output'] or native['mode'] != 'RGB' or native['bits'] != 8 or 'sRGB' not in native['colorProfile']:
                raise RuntimeError('photoshop_result_identity_or_color_mismatch')
            folder = directory / sid
            with Image.open(job['normalized']) as original, Image.open(instruction['output']) as raw:
                original.load(); raw.load()
                if raw.mode != 'RGB' or raw.size != original.size:
                    raise RuntimeError('photoshop_export_geometry_or_mode_changed')
                pixels = np.array(raw)
                delta = np.abs(pixels.astype('int16') - np.array(original).astype('int16'))
                raw_profile = raw.info.get('icc_profile')
                if raw_profile and 'sRGB' not in ImageCms.getProfileDescription(ImageCms.ImageCmsProfile(io.BytesIO(raw_profile))):
                    raise RuntimeError('photoshop_export_non_srgb_profile')
                if args.operation == 'roundtrip' and np.any(delta):
                    raise RuntimeError('photoshop_roundtrip_rgb_changed')
                with (folder / 'processed.png').open('xb') as stream:
                    raw.save(stream, format='PNG', icc_profile=job['profile'])
                if args.operation != 'roundtrip' and not np.any(delta):
                    raise RuntimeError('photoshop_processing_no_pixel_effect')
            with Image.open(folder / 'processed.png') as saved:
                saved.load()
                if saved.info.get('icc_profile') != job['profile'] or not np.array_equal(np.array(saved), pixels):
                    raise RuntimeError('photoshop_final_readback_mismatch')
            protection_readback = None
            if instruction.get('protectionMask'):
                with Image.open(instruction['protectionMask']) as mask_file, Image.open(instruction['raw']) as unprotected, Image.open(job['normalized']) as source:
                    mask = np.array(mask_file); core = mask == 255; exterior = mask == 0
                    before = np.array(source); raw_pixels = np.array(unprotected)
                    if not np.any(core) or not np.any(exterior) or not np.array_equal(pixels[core],before[core]) or not np.array_equal(pixels[exterior],raw_pixels[exterior]):
                        raise RuntimeError('photoshop_protection_core_or_exterior_changed')
                    protection_readback = {'corePixels':int(core.sum()), 'exteriorPixels':int(exterior.sum()),
                                           'coreEqualsOriginal':True,'exteriorEqualsRawProcessed':True,
                                           'softMaskPixels':int(((mask>0)&(mask<255)).sum())}
            if args.operation != 'roundtrip':
                with Image.open(instruction['raw']) as unprotected, Image.open(job['normalized']) as source:
                    removed = np.clip(np.array(source).astype('int16')-np.array(unprotected).astype('int16'),0,255).astype('uint8')
                    with (folder / 'removed-diagnostic.png').open('xb') as stream:
                        Image.fromarray(removed).save(stream,format='PNG',icc_profile=job['profile'])
                contact = Image.new('RGB',(job['size'][0]*3,job['size'][1]+28),'#202020')
                draw = ImageDraw.Draw(contact)
                for index,(label,path) in enumerate((('ORIGINAL',job['normalized']),('PS RAW',Path(instruction['raw'])),('PS PROTECTED / UNPROTECTED IF NO MASK',folder/'processed.png'))):
                    draw.text((index*job['size'][0]+8,6),sid+' '+label,fill='white')
                    with Image.open(path) as part: contact.paste(part,(index*job['size'][0],28))
                with (folder / 'comparison.jpg').open('xb') as stream: contact.save(stream,format='JPEG',quality=93)
            receipt = {'status':'COMPLETED_NOT_QUALITY_ACCEPTANCE', 'key':receipt_key(job, inputs, args.operation, recipe, args.export),
                'sourceReceipt':job['sourceReceipt'], 'outputSize':job['size'], 'photoshop':native,
                'rawProfilePresent':bool(raw_profile), 'rawProfileBytesEqualInput':raw_profile == job['profile'],
                'meanAbsoluteRGBVsOriginal':float(delta.mean()), 'maxAbsoluteRGBVsOriginal':int(delta.max()),
                'finalICC':benchmark.digest(job['profile']), 'colorHandling':'Raw vendor export preserved; final uses byte-bound original sRGB ICC after PS document/profile and RGB readback checks',
                'timings':{'photoshopOpenEditExportClose':native['wallSeconds']},
                'protectionReadback':protection_readback,
                'removedLayerMeaning':'Clipped RGB original minus raw candidate diagnostic, not native SXT unscreen stars or a linear/scientific reconstruction',
                'protectionScope':'Frozen source ellipses feathered 8px; nebula has no qualified mask. Foreground stars are restored with protected target pixels.',
                'manualRepairSeconds':0, 'reviewSeconds':'UNKNOWN', 'ordinaryAdoption':False,
                'outputs':[benchmark.bound_file(p, root=ROOT) for p in sorted(folder.iterdir()) if p.is_file()]}
            benchmark.save_json(folder / 'receipt.json', receipt)
            rows.append({'sample':sid, 'method':OPERATIONS[args.operation], 'status':receipt['status'],
                         'receipt':str((folder / 'receipt.json').relative_to(ROOT)), 'seconds':native['wallSeconds'], 'cacheHit':False})
        recheck_inputs(jobs, inputs)
        result = {'status':'COMPLETED_NOT_QUALITY_ACCEPTANCE', 'rows':rows, 'inputs':inputs, 'costs':costs,
                  'preflightSeconds':preflight, 'wallSeconds':time.perf_counter()-started,
                  'freshPhotoshopExecution':True, 'ordinaryAdoption':False}
        benchmark.save_json(directory / 'result.json', result)
        print(json.dumps({'status':result['status'], 'rows':len(rows), 'seconds':result['wallSeconds'],
                          'result':str((directory / 'result.json').relative_to(ROOT))}))
    except Exception as error:
        benchmark.save_json(directory / 'failed.json', {'status':'FAILED', 'errorType':type(error).__name__,
            'error':str(error), 'inputs':inputs, 'ordinaryAdoption':False,
            'outputs':[benchmark.bound_file(p, root=ROOT) for p in sorted(directory.rglob('*')) if p.is_file()]})
        raise


if __name__ == '__main__':
    main()
