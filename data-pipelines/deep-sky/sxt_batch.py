"""Bounded local SXT preparation and review; no downloads or publication.

Source-specific acquisition/admission owners supply a pinned manifest of whole
working images and their original receipts. Processing size is caller-owned,
not fixed to the historical experiment's 1024-pixel configuration.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import io
import re
import numpy as np
from PIL import Image

from optical_publication_io import pinned_json, bound_file, bound_bytes
from sxt_processing import run_sxt_batch, import_sxt_products
from image_quality import processing_review, write_report
from normalized_rgb_source import normalize_whole_rgb


def stage_continuous_regions(preparation_path, pin, directory, *, root, tools, max_batch_pixels,
                             coverage_mode='complete-only'):
    """Reuse a pinned whole-region preparation; retain partial coverage in queue.

    No raster resampling or inference here. Actual PNG/alpha readback, not a
    claimed complete flag, decides which rows can enter the existing RGB owner.
    Explicit binary-covered-only mode binds model padding and restored alpha;
    it skips unchanged complete regions and never broadens source coverage.
    """
    root, directory = root.resolve(), directory.resolve()
    prepared, binding = pinned_json(preparation_path, pin, root=root)
    if prepared.get('schemaVersion') != 'continuous-hips-region-trial-v1' or not prepared.get('rows'):
        raise ValueError('sxt_region_preparation_invalid')
    if type(max_batch_pixels) is not int or max_batch_pixels <= 0:
        raise ValueError('sxt_region_pixel_budget_invalid')
    if coverage_mode not in ('complete-only','binary-covered-only'):
        raise ValueError('sxt_region_coverage_mode_invalid')
    if directory.exists() or directory == root or not directory.is_relative_to(root):
        raise ValueError('sxt_region_staging_must_be_new_under_root')
    directory.mkdir(parents=True, exist_ok=False)
    jobs, queued, retained, seen = [], [], [binding], set()
    for row in prepared['rows']:
        reference = row['reference']
        if reference in seen:
            raise ValueError('sxt_region_reference_duplicate')
        seen.add(reference)
        spec = row['inputPreparation']
        if spec.get('schemaVersion') != 'cached-hips-continuous-rgb-region-v1':
            raise ValueError('sxt_region_preparation_owner_invalid')
        source = row['wholeImage']
        raw, source_binding = bound_bytes(root / source['path'], root=root, expected=source, max_bytes=128 * 1024 * 1024)
        dependencies = [binding, source_binding, row['suppliedMask'], *spec['inputs']]
        for dependency in dependencies:
            bound_file(root / dependency['path'], root=root, expected=dependency)
        retained.extend(dependencies)
        with Image.open(io.BytesIO(raw)) as image:
            image.load()
            if image.format != 'PNG' or image.mode != 'RGBA' or image.size != (spec['width'],spec['height']):
                raise ValueError('sxt_region_full_image_geometry_invalid')
            alpha = np.asarray(image.getchannel('A')).copy()
        mask_binding = row['suppliedMask']
        mask_raw, _ = bound_bytes(root / mask_binding['path'], root=root, expected=mask_binding, max_bytes=128 * 1024 * 1024)
        with Image.open(io.BytesIO(mask_raw)) as mask:
            mask.load()
            if mask.format != 'PNG' or mask.mode != 'L' or mask.size != (spec['width'],spec['height']):
                raise ValueError('sxt_region_supplied_mask_invalid')
            supplied = np.asarray(mask).copy()
        if not np.all((supplied == 0) | (supplied == 255)):
            raise ValueError('sxt_region_supplied_mask_invalid')
        missing = int(np.count_nonzero(supplied == 0))
        opaque = int(np.count_nonzero((supplied == 255) & (alpha == 255)))
        complete = missing == 0 and bool(np.all(alpha == 255))
        if missing != spec['counts']['missingTileSamples'] or opaque != spec['counts']['opaqueSamples']:
            raise ValueError('sxt_region_claimed_coverage_invalid')
        if complete != spec['completeOpaqueRgb'] or complete != (spec['counts']['opaqueSamples'] == spec['width']*spec['height']):
            raise ValueError('sxt_region_claimed_coverage_invalid')
        coverage = None
        if not complete and coverage_mode=='complete-only':
            queued.append({'reference':reference,'status':'COVERAGE_ADAPTER_REQUIRED','input':source_binding,
                'counts':spec['counts'],'reason':'Keep exact original alpha and missing-tile mask; never flatten partial source into admitted RGB.'})
            continue
        if complete and coverage_mode=='binary-covered-only':
            queued.append({'reference':reference,'status':'COMPLETE_RGB_NOT_REPROCESSED',
                'input':source_binding,'reason':'This stage changes only partial binary-coverage representation; reuse existing complete-region jobs/products.'})
            continue
        if complete:
            normalized = normalize_whole_rgb(raw, spec['width'])
            working_png = normalized.png_bytes
        else:
            from covered_rgb_display import VERSION, model_canvas
            coverage = {'schemaVersion':VERSION,'originalRgba':source_binding,'suppliedMask':mask_binding}
            working_png = model_canvas(coverage,[spec['width'],spec['height']],root)
        sid = reference.lower().replace(':','-') + '-continuous'
        if re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', sid) is None:
            raise ValueError('sxt_region_reference_invalid')
        if spec['width'] * spec['height'] > max_batch_pixels:
            raise ValueError('sxt_region_exceeds_declared_batch_budget')
        target = directory / (sid+'.png')
        with target.open('xb') as stream:
            stream.write(working_png)
        width, height = spec['width'],spec['height']
        jobs.append({'id':sid,'kind':'region','input':bound_file(target,root=root),'outputSize':[width,height],
            'dependencies':list({(d['path'],d['sha256']):d for d in dependencies}.values()),
            'sourceContext':{'reference':reference,'input':source_binding,'preparation':binding,
                'source':spec['source'],'targetFitsHeader':spec['targetFitsHeader'], 'rowOrder':spec['rowOrder'],
                'colourMeaning':spec['colourMeaning'],'science':'UNKNOWN','absoluteRegistration':'UNVERIFIED',
                'meaning':'Whole declared continuous region processed before LOD; original source/mask retained.'},
            'reviewRois':[[width//4,height//4,3*width//4,3*height//4]] if min(width,height)>=4 else []})
        if coverage:
            jobs[-1]['coverage'] = coverage
            jobs[-1]['sourceContext']['workingPaddingMeaning'] = 'Zero outside source binary alpha is model context only, not observed black or new coverage.'
    for dependency in retained:
        bound_file(root / dependency['path'],root=root,expected=dependency)
    manifest = {'schema':'sxt-batch-input-v1','method':'sxt','tools':tools,'maxBatchPixels':max_batch_pixels,'jobs':jobs}
    write_report(directory/'input.json',manifest)
    write_report(directory/'coverage-queue.json',{'preparationReceipt':binding,'rows':queued,'ordinaryAdoption':False})
    return manifest


def prepare_batch(manifest_path, pin, directory, *, root, reuse_from=None):
    root = root.resolve()
    manifest, binding = pinned_json(manifest_path, pin, root=root)
    if manifest.get('schema') != 'sxt-batch-input-v1' or not manifest.get('jobs'):
        raise ValueError('sxt_batch_manifest_invalid')
    limit = manifest.get('maxBatchPixels')
    if type(limit) is not int or limit <= 0:
        raise ValueError('sxt_batch_requires_explicit_pixel_budget')
    factor = 2 if manifest['method'] == 'sxt-upsample' else 1
    groups, group, pixels = [], [], 0
    for job in manifest['jobs']:
        size = job.get('outputSize', [])
        if len(size) != 2 or any(type(v) is not int or v <= 0 for v in size):
            raise ValueError('sxt_batch_job_size_invalid')
        cost = size[0] * size[1] * factor * factor
        if cost > limit:
            raise ValueError('sxt_batch_single_input_exceeds_declared_budget')
        if group and pixels + cost > limit:
            groups.append(group); group, pixels = [], 0
        group.append(job); pixels += cost
    groups.append(group)
    if len({j['id'] for j in manifest['jobs']}) != len(manifest['jobs']):
        raise ValueError('sxt_batch_duplicate_id')
    directory = directory.resolve()
    if directory.exists() or directory == root or not directory.is_relative_to(root):
        raise ValueError('sxt_output_must_be_new_directory_under_root')
    rows, receipts, calls = [], [], 0
    products = {p['id']: p for p in manifest.get('existingProducts', [])}
    if products and (len(products) != len(manifest['existingProducts']) or
                     set(products) != {j['id'] for j in manifest['jobs']}):
        raise ValueError('sxt_batch_existing_product_set_invalid')
    directory.mkdir(parents=True, exist_ok=False)
    for index, group in enumerate(groups):
        child = directory / f'group-{index}'
        try:
            if products:
                result = import_sxt_products(group, [products[j['id']] for j in group], child,
                    manifest['tools'], manifest['method'], root=root)
            else:
                result = run_sxt_batch(group, child, manifest['tools'], manifest['method'],
                    root=root, timeout=manifest.get('timeoutSeconds', 600), reuse_from=reuse_from)
        except (ValueError, RuntimeError, OSError) as error:
            if (child / 'result.json').exists():
                result = json.loads((child / 'result.json').read_text(encoding='utf8'))
            else:
                child.mkdir(parents=True, exist_ok=True)
                result = {'schema': 'sxt-processing-v1', 'nativeInferenceCalls': 0,
                    'rows': [{'id': j['id'], 'key': {'job': j}, 'status': 'FAILED',
                              'error': str(error)} for j in group], 'ordinaryAdoption': False}
                write_report(child / 'result.json', result)
        rows.extend(result['rows'])
        calls += result['nativeInferenceCalls']
        receipts.append(bound_file(child / 'result.json', root=root))
    bound_file(manifest_path, root=root, expected=binding)
    result = {'schema': 'sxt-processing-v1', 'manifest': binding, 'rows': rows,
        'groupReceipts': receipts, 'nativeInferenceCalls': calls,
        'ordinaryAdoption': False, 'visualQuality': 'UNVERIFIED'}
    write_report(directory / 'result.json', result)
    processing_review(directory / 'result.json', directory / 'review', root=root)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument('--manifest', type=Path)
    parser.add_argument('--manifest-pin')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--reuse-from', type=Path)
    parser.add_argument('--review-from', type=Path)
    parser.add_argument('--decisions', type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    if args.review_from:
        if args.manifest or args.reuse_from:
            parser.error('review mode cannot process or reuse inference')
        result = processing_review(args.review_from, args.output, root=root, decisions_path=args.decisions)
        counts = result.get('counts')
        if counts is None:
            counts = {}
            for row in result['rows']:
                counts[row['status']] = counts.get(row['status'], 0) + 1
        print(json.dumps({'review': str(args.output / 'review.json'), 'counts': counts}))
    else:
        if not args.manifest or not args.manifest_pin or args.decisions:
            parser.error('processing requires a pinned manifest; decisions belong to review mode')
        result = prepare_batch(args.manifest, args.manifest_pin, args.output,
                               root=root, reuse_from=args.reuse_from)
        print(json.dumps({'receipt': str(args.output / 'result.json'),
            'rows': len(result['rows']), 'nativeInferenceCalls': result['nativeInferenceCalls'],
            'failed': sum(r['status'] == 'FAILED' for r in result['rows'])}))


if __name__ == '__main__':
    main()
