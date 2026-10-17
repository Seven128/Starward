"""Acquire declared ESO observation JPEGs into the existing RGB/SXT pipeline.

The declaration records a reviewed use, not an automatically approved catalogue.
Original JPEG/XMP, page and policy bytes remain bound. Nominal AVM, scientific
availability, file quality, Scene quality and ordinary adoption stay distinct.
"""
from __future__ import annotations

import argparse
from dataclasses import asdict
import html
import json
from pathlib import Path
import re
import time
import urllib.parse
import urllib.request

from PIL import Image

from normalized_rgb_source import normalize_whole_rgb
from optical_publication_io import bound_file, pinned_json
from prepared_rgb_observation import (ByteIdentity, PreparedRgbSource,
    load_prepared_rgb_observation, parse_prepared_rgb_avm)

POLICY_URL = 'https://www.eso.org/public/outreach/copyright/'
LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/'


def download(url, destination, limit, *, timeout=180):
    """Bound a public read; keep partial bytes on failure, never overwrite."""
    partial = destination.with_name(destination.name + '.partial')
    started = time.monotonic()
    request = urllib.request.Request(url, headers={'User-Agent': 'Starward-image-preparation/1'})
    with urllib.request.urlopen(request, timeout=timeout) as response, partial.open('xb') as target:
        final = urllib.parse.urlsplit(response.url)
        if final.scheme != 'https' or final.hostname not in ('www.eso.org', 'cdn.eso.org'):
            raise ValueError('eso_download_redirect_outside_provider')
        length = response.headers.get('Content-Length')
        if length and int(length) > limit:
            raise ValueError('eso_download_declared_size_exceeds_budget')
        count = 0
        while chunk := response.read(256 * 1024):
            count += len(chunk)
            if count > limit or time.monotonic() - started > timeout:
                raise ValueError('eso_download_resource_budget_exceeded')
            target.write(chunk)
        if not count or (length and count != int(length)):
            raise ValueError('eso_download_incomplete')
    partial.rename(destination)


def validate_source_declaration(source):
    identifier = source.get('resourceId', '')
    if not re.fullmatch(r'[a-z0-9]+', identifier):
        raise ValueError('eso_resource_id_invalid')
    if source.get('pageUrl') != f'https://www.eso.org/public/images/{identifier}/':
        raise ValueError('eso_page_identity_invalid')
    if source.get('downloadUrl') != f'https://cdn.eso.org/images/large/{identifier}.jpg':
        raise ValueError('eso_download_identity_invalid')
    if source.get('kind') not in ('galaxy', 'galaxy-pair', 'nebula', 'region'):
        raise ValueError('eso_processing_subject_not_supported')
    if (not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', source.get('id', '')) or
            not source.get('credit', '').strip() or not source.get('colourMeaning', '').strip() or
            source.get('rightsUse') != 'CC_BY_4_0_REVIEWED_WITH_CREDIT_AND_AI_MODIFICATION_NOTICE'):
        raise ValueError('eso_source_use_declaration_missing')
    if type(source.get('workWidth')) is not int or source['workWidth'] < 2:
        raise ValueError('eso_work_width_invalid')


def prepare_source(source, directory, policy_binding, *, root, limits):
    validate_source_declaration(source)
    directory.mkdir(exist_ok=False)
    page = directory / 'source-page.html'
    jpeg = directory / 'original.jpg'
    xmp_file = directory / 'embedded.xmp'
    cached = source.get('cached')
    if cached:
        page = root / cached['page']['path']
        jpeg = root / cached['jpeg']['path']
        bound_file(page, root=root, expected=cached['page'], max_bytes=limits['maxPageBytes'])
        bound_file(jpeg, root=root, expected=cached['jpeg'], max_bytes=limits['maxEncodedBytes'])
    else:
        download(source['pageUrl'], page, limits['maxPageBytes'])
    page_text = page.read_text(encoding='utf8')
    advertised = {urllib.parse.urljoin(source['pageUrl'], html.unescape(v))
                  for v in re.findall(r'href=["\x27]([^"\x27]+)', page_text)}
    if source['downloadUrl'] not in advertised or POLICY_URL not in advertised:
        raise ValueError('eso_image_or_policy_not_advertised_by_source')
    if not cached:
        download(source['downloadUrl'], jpeg, limits['maxEncodedBytes'])
    with Image.open(jpeg) as image:
        if image.width * image.height > limits['maxDecodedPixels']:
            raise ValueError('eso_decoded_source_exceeds_budget')
        raw_xmp = image.info.get('xmp')
        if not raw_xmp or len(raw_xmp) > 256 * 1024:
            raise ValueError('eso_embedded_xmp_missing_or_oversized')
    with xmp_file.open('xb') as target:
        target.write(raw_xmp)
    avm, _, _, _ = parse_prepared_rgb_avm(raw_xmp)
    if avm.ResourceID != source['resourceId'] or avm.Credit != source['credit']:
        raise ValueError('eso_embedded_identity_or_credit_differs_from_reviewed_source')
    metadata_url = avm.ReferenceURL
    if (not isinstance(metadata_url, str) or
            metadata_url.replace('http://', 'https://', 1) != source['pageUrl']):
        raise ValueError('eso_embedded_reference_differs_from_reviewed_source')
    rights_label = avm.Rights
    if rights_label not in ('CC BY 4.0', 'Creative Commons Attribution 4.0 International License'):
        raise ValueError('eso_embedded_rights_require_explicit_reassessment')
    jpeg_binding, xmp_binding = bound_file(jpeg, root=root), bound_file(xmp_file, root=root)
    facts = PreparedRgbSource(source['resourceId'],
        ByteIdentity(jpeg_binding['bytes'], jpeg_binding['sha256']),
        ByteIdentity(xmp_binding['bytes'], xmp_binding['sha256']),
        source['downloadUrl'], metadata_url, source['credit'], rights_label,
        LICENSE_URL, POLICY_URL, source['colourMeaning'])
    admitted = load_prepared_rgb_observation(jpeg, xmp_file, facts,
        max_encoded_bytes=limits['maxEncodedBytes'], max_decoded_pixels=limits['maxDecodedPixels'])
    normalized = normalize_whole_rgb(jpeg.read_bytes(), source['workWidth'],
        untagged_colour_interpretation=source.get('untaggedColourInterpretation'))
    working = directory / 'working.png'
    with working.open('xb') as target:
        target.write(normalized.png_bytes)
    receipt = {
        'schema': 'eso-prepared-rgb-source-v1', 'declaration': source,
        'source': asdict(facts), 'jpeg': jpeg_binding, 'xmp': xmp_binding,
        'page': bound_file(page, root=root), 'policy': policy_binding,
        'reusedSourceBytes': bool(cached),
        'sourceAdmissionOwner': bound_file(root / 'data-pipelines/deep-sky/prepared_rgb_observation.py', root=root),
        'normalizationOwner': bound_file(root / 'data-pipelines/deep-sky/normalized_rgb_source.py', root=root),
        'geometry': asdict(admitted.geometry), 'spectralBandpass': admitted.spectral_bandpass,
        'spectralNotes': admitted.spectral_notes,
        'originalSize': normalized.source_size, 'workSize': normalized.work_size,
        'working': bound_file(working, root=root), 'colourMeaning': normalized.colour_meaning,
        'scientificAvailability': 'UNKNOWN', 'absoluteRegistration': admitted.geometry.accuracy,
        'sceneAcceptance': 'MISSING', 'ordinaryAdoption': False,
        'requiredVisibleCredit': source['credit'],
        'requiredModificationNotice': 'Whole-field resize; subsequent SXT AI star separation when applied.',
    }
    receipt_file = directory / 'source-receipt.json'
    with receipt_file.open('x', encoding='utf8') as target:
        json.dump(receipt, target, ensure_ascii=False, indent=2, allow_nan=False)
        target.write('\n')
    return {'id': source['id'], 'kind': source['kind'], 'input': receipt['working'],
        'outputSize': list(normalized.work_size),
        'dependencies': [bound_file(receipt_file, root=root), jpeg_binding, xmp_binding,
                         receipt['page'], policy_binding],
        'sourceContext': source | {'input': jpeg_binding,
            'untaggedColorInterpretation': source.get('untaggedColourInterpretation'),
            'sourceReceipt': bound_file(receipt_file, root=root),
            'registration': admitted.geometry.accuracy},
        'reviewRois': source.get('reviewRois', [])}


def prepare_batch(manifest_path, pin, directory, *, root):
    root, directory = root.resolve(), directory.resolve()
    implementation = bound_file(Path(__file__), root=root)
    manifest, manifest_binding = pinned_json(manifest_path, pin, root=root)
    if manifest.get('schema') != 'eso-prepared-source-batch-v1' or not manifest.get('sources'):
        raise ValueError('eso_source_batch_invalid')
    sources = manifest['sources']
    for source in sources:
        validate_source_declaration(source)
    if len({s['id'] for s in sources}) != len(sources) or len({s['resourceId'] for s in sources}) != len(sources):
        raise ValueError('eso_source_batch_duplicate')
    limits = manifest['limits']
    for key in ('maxPageBytes', 'maxEncodedBytes', 'maxDecodedPixels', 'maxBatchPixels'):
        if type(limits.get(key)) is not int or limits[key] <= 0:
            raise ValueError('eso_source_batch_resource_limit_invalid')
    if directory.exists() or directory == root or not directory.is_relative_to(root):
        raise ValueError('eso_source_output_must_be_new_under_root')
    directory.mkdir(parents=True, exist_ok=False)
    policy = directory / 'policy.html'
    download(POLICY_URL, policy, limits['maxPageBytes'])
    policy_text = policy.read_text(encoding='utf8')
    if 'creativecommons.org/licenses/by/4.0/' not in policy_text or 'AI' not in policy_text:
        raise ValueError('eso_policy_conditions_require_reassessment')
    policy_binding = bound_file(policy, root=root)
    rows, jobs = [], []
    for source in sources:
        started = time.monotonic()
        row = {'id': source['id'], 'status': 'FAILED', 'ordinaryAdoption': False}
        try:
            job = prepare_source(source, directory / source['id'], policy_binding, root=root, limits=limits)
            jobs.append(job)
            row.update(status='SOURCE_PREPARED_PROCESSING_PENDING', job=job)
        except (OSError, ValueError, RuntimeError, KeyError) as error:
            row['error'] = str(error)
        row['seconds'] = time.monotonic() - started
        rows.append(row)
        print(json.dumps({'id': row['id'], 'status': row['status'], 'error': row.get('error')}, ensure_ascii=False), flush=True)
    bound_file(manifest_path, root=root, expected=manifest_binding)
    bound_file(policy, root=root, expected=policy_binding)
    bound_file(Path(__file__), root=root, expected=implementation)
    result = {'schema': 'eso-prepared-source-batch-result-v1', 'input': manifest_binding,
        'implementation': implementation, 'rows': rows, 'ordinaryAdoption': False}
    for name, content in [('result.json', result), ('sxt-input.json', {
        'schema': 'sxt-batch-input-v1', 'method': 'sxt', 'tools': manifest['tools'],
        'maxBatchPixels': limits['maxBatchPixels'], 'timeoutSeconds': 600, 'jobs': jobs})]:
        with (directory / name).open('x', encoding='utf8') as target:
            json.dump(content, target, ensure_ascii=False, indent=2, allow_nan=False)
            target.write('\n')
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--manifest-pin', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    prepare_batch(args.manifest, args.manifest_pin, args.output, root=args.root)
