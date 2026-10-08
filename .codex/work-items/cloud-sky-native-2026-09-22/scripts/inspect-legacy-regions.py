"""Batch coverage triage and bounded original-tile previews, not publication.

Uses the existing TAN and HEALPix owners. Cached source pixels are never changed.
MOC membership is nominal; PNG alpha, black and science remain distinct.
"""
import argparse
import hashlib
import io
import importlib.util
import json
import re
from pathlib import Path
import subprocess
import sys
import time

import numpy as np
from astropy.io import fits
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / 'data-pipelines/deep-sky'))
from optical_publication_io import bound_file, bound_bytes

OUT = ROOT / 'output/legacy-region-batch-2026-10-07'
CATALOG = ROOT / 'packages/astronomy-core/data/opengc-deep-sky.v2.json'
MOC = ROOT / 'output/legacy-wide-source-1006-q1-r1/Moc.fits'
META = ROOT / 'output/legacy-wide-next-primary-1006-q1-r1/properties.txt'
MASTER = 'https://alasky.cds.unistra.fr/DESI-legacy-surveys/DR10/CDS_P_DESI-Legacy-Surveys_DR10_color'
SOURCE = 'legacy'
LEGACY_INPUT = OUT, MOC, META, MASTER


def select_source(name):
    """Fixed reviewed inputs share this task batch; no arbitrary remote URL."""
    global SOURCE, OUT, MOC, META, MASTER
    SOURCE = name
    if name in ('ztf', 'fds', 'vphas', 'rubin', 'ps1'):
        reviewed = {
            'ztf': ('output/ztf-region-batch-2026-10-07', 'ZTF/DR7/CDS_P_ZTF_DR7_color', 'ZTF/DR7/color'),
            'fds': ('output/fds-region-batch-2026-10-08', 'FDS/CDS_P_FDS_DR1_color', 'FDS/DR1/color'),
            'vphas': ('output/vphas-region-batch-2026-10-08', 'VPHAS/CDS_P_VPHAS_DR4_color', 'VPHAS/DR4/color'),
            'rubin': ('output/rubin-region-batch-2026-10-08', 'Rubin/CDS_P_Rubin_FirstLook', 'Rubin/FirstLook'),
            'ps1': ('output/ps1-region-batch-2026-10-08', 'Pan-STARRS/DR1/color-i-r-g', 'PanSTARRS/DR1/color-i-r-g'),
        }
        output_dir, source_path, source_id = reviewed[name]
        OUT = ROOT / output_dir
        MOC, META = OUT/'Moc.fits', OUT/'properties.txt'
        if name == 'rubin':
            META = ROOT/'output/optical-hips-registry-research-2026-10-08/rubin-firstlook-properties.txt'
        if name == 'ps1':
            META = ROOT/'output/ps1-ngc891-contiguous-hips-1006-q1-r1/properties'
            MOC = ROOT/'artifacts/miniapp/cloud-sky-native/optical-hips-ps1-moc.fits'
        MASTER = 'https://alasky.cds.unistra.fr/' + source_path
        text = META.read_text(encoding='utf8')
        properties = dict(re.findall(r'^([a-z_]+)\s*=\s*(.*)$', text, re.MULTILINE))
        expected_id = 'ivo://CDS/P/' + source_id
        assert properties['creator_did'] == expected_id
        assert properties['hips_frame'] == 'equatorial' and properties['hips_tile_width'] == '512'
        expected_formats = 'jpeg' if name == 'ps1' else ('png webp' if name == 'rubin' else 'png')
        assert properties['hips_tile_format'] == expected_formats and int(properties['hips_order']) >= 7
        assert properties['hips_license'] == 'ODbL-1.0'
        assert properties['hips_status'] == 'public master clonableOnce'
        if name == 'ps1':
            rights = json.loads((OUT/'background-role-intent.json').read_text(encoding='utf8'))
            assert rights['sourceId'] == 'CDS/P/PanSTARRS/DR1/color-i-r-g'
            assert rights['serviceUrl'] == MASTER and rights['ordinaryAdoption'] is False
            assert rights['scope'] == 'BOUNDED_INTERNAL_EXTERIOR_BACKGROUND_REPRESENTATIVE'
            assert properties['hips_doi'] == '10.26093/cds/aladin/598a-0e'
            for item in rights['inputs']:
                bound_file(ROOT/item['path'], root=ROOT, expected=item)
        if name == 'fds':
            assert properties['dataproduct_type'] == 'image' and properties['dataproduct_subtype'] == 'color'
            assert properties['obs_regime'] == 'Optical' and int(properties['hips_order']) >= 8
            assert 'Creative Commons Attribution 4.0' in properties['obs_copyright']
            assert float(properties['hips_initial_fov']) == 2.1
        if name == 'vphas':
            assert properties['dataproduct_type'] == 'image' and properties['dataproduct_subtype'] == 'color'
            assert properties['obs_regime'] == 'Optical' and properties['hips_order'] == '11'
            assert 'Creative Commons Attribution 4.0' in properties['obs_copyright']
            assert 'Montage' in properties['obs_description']
            assert '10.18727/archive/65' in properties['obs_ack']
        if name == 'rubin':
            assert properties['dataproduct_type'] == 'image' and properties['dataproduct_subtype'] == 'color'
            assert properties['obs_regime'] == 'Optical' and properties['hips_order'] == '12'
            rights = json.loads((OUT/'rights-and-role.json').read_text(encoding='utf8'))
            assert rights['sourceId'] == 'CDS/P/Rubin/FirstLook' and rights['serviceUrl'] == MASTER
            assert rights['contentLicense'] == 'CC-BY-4.0' and rights['hipsDatabaseLicense'] == 'ODbL-1.0'
            assert len(rights['specificProducerImages']) == 2 and rights['ordinaryAdoption'] is False
            bound_file(META, root=ROOT, expected=rights['sourcePropertiesPin'])
            for item in rights['inputs']:
                bound_file(ROOT/item['path'], root=ROOT, expected=item)
    else:
        assert name == 'legacy'
        OUT, MOC, META, MASTER = LEGACY_INPUT


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf8')


def pin(path):
    return bound_file(path, root=ROOT)


def reference(row):
    return row['regionRef'] if 'regionRef' in row else row['objectRef']


def source_rows():
    if SOURCE != 'fds':
        return json.loads(CATALOG.read_text(encoding='utf8'))['rows']
    properties = dict(re.findall(r'^([a-z_]+)\s*=\s*(.*)$', META.read_text(encoding='utf8'), re.MULTILINE))
    ra, dec = float(properties['hips_initial_ra']), float(properties['hips_initial_dec'])
    assert np.isfinite(ra) and 0 <= ra < 360 and np.isfinite(dec) and -90 <= dec <= 90
    # Producer pointing is a region, never a newly invented catalogue object.
    return [{'regionRef': 'region:fds-initial', 'raDeg': ra, 'decDeg': dec}]


def source_profiles():
    return ((2.1, 5), (0.4, 8)) if SOURCE == 'fds' else ((4.0, 4), (0.4, 7))


def lookup(row, field, order, pixels):
    # The reviewed HiPS/MOC paths do not use SDSS science/RGB processing.
    from sdss_gri_tan import target_tan
    wcs = target_tan({'frame': 'ICRS J2000', 'raDeg': row['raDeg'], 'decDeg': row['decDeg']}, pixels, field)
    yy, xx = np.mgrid[:pixels, :pixels]
    ra, dec = wcs.all_pix2world(xx, pixels - 1 - yy, 0)
    world = np.stack((ra, dec), axis=-1).astype('<f8').tobytes()
    process = subprocess.run(['node', 'tools/run-node.cjs', 'data-pipelines/deep-sky/hips_tan_lookup.mjs', str(order), str(pixels)],
                             input=world, capture_output=True, cwd=ROOT, check=True, timeout=30)
    assert len(process.stdout) == pixels * pixels * 12
    return np.frombuffer(process.stdout, dtype='<u4').reshape(pixels, pixels, 3), wcs


def moc_cells():
    with fits.open(MOC) as hdus:
        assert hdus[1].header['ORDERING'] == 'NUNIQ' and hdus[1].header['COORDSYS'] == 'C'
        cells = []
        for item in hdus[1].data['UNIQ']:
            uniq = int(item)
            order = (uniq.bit_length() - 3) // 2
            assert 0 <= order <= 12
            pixel = uniq - 4 * 4 ** order
            assert 0 <= pixel < 12 * 4 ** order
            cells.append((order, pixel))
    assert cells, 'Empty nominal MOC cannot qualify a preview'
    return cells


def moc_ranges():
    cells = moc_cells()
    index_order = max(11, max(order for order, _ in cells))
    ranges = [(pixel * 4 ** (index_order-order), (pixel+1) * 4 ** (index_order-order))
              for order, pixel in cells]
    merged = []
    for start, end in sorted(ranges):
        if merged and start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(end, merged[-1][1]))
        else:
            merged.append((start, end))
    return np.array(merged, dtype=np.int64), index_order


def moc_membership(grid, intervals):
    """Keep each actual child cell; a parent must not inflate partial support."""
    ne, nw = 511-grid[..., 2], grid[..., 1]
    nested = np.zeros(ne.shape, dtype=np.uint64)
    for bit in range(9):
        nested |= ((ne.astype(np.uint64) >> bit) & 1) << (2*bit)
        nested |= ((nw.astype(np.uint64) >> bit) & 1) << (2*bit+1)
    cells = grid[..., 0].astype(np.uint64) * 512**2 + nested
    indices = np.searchsorted(intervals[:, 0], cells, side='right') - 1
    return (indices >= 0) & (cells < intervals[np.maximum(indices, 0), 1])


def plan(rows):
    path = OUT / 'coverage-plan.json'
    if path.exists():
        raise RuntimeError('Existing plan retained; inspect it instead of rerunning unchanged work')
    started = time.perf_counter()
    input_paths = [MOC, META, Path(__file__), ROOT / 'data-pipelines/deep-sky/hips_tan_lookup.mjs', ROOT / 'data-pipelines/deep-sky/sdss_gri_tan.py']
    if SOURCE != 'fds':
        input_paths.insert(0, CATALOG)
    if SOURCE == 'ps1':
        input_paths.append(OUT/'background-role-intent.json')
    inputs = [pin(p) for p in input_paths]
    intervals, index_order = moc_ranges()
    results = []
    # A 512 tile's 9 local bits plus tile order identify the actual MOC cell.
    for row in rows:
        for field in sorted(profile[0] for profile in source_profiles()):
            grid, _ = lookup(row, field, index_order - 9, 256)
            inside = moc_membership(grid, intervals)
            results.append({'reference': reference(row), 'raDeg': row['raDeg'], 'decDeg': row['decDeg'],
                            'fieldDegrees': field, 'sampledInside': int(inside.sum()), 'samples': int(inside.size),
                            'nominalSampleFraction': float(inside.mean()), 'quality': 'NOT_ASSESSED'})
    for item in inputs:
        bound_file(ROOT / item['path'], root=ROOT, expected=item)
    result = {'inputs': inputs, 'source': SOURCE, 'sourceUrl': MASTER, 'mocIndexOrder': index_order,
              'profiles': results, 'seconds': time.perf_counter()-started,
              'meaning': '256-square TAN pixel-centre membership only; not full footprint, raster alpha, science or actual page',
              'downloads': 0, 'processing': 'No image processing', 'ordinaryAdoption': False}
    save(path, result)
    print(json.dumps({'profiles': len(results), 'allSampledInside': sum(r['sampledInside']==r['samples'] for r in results),
                      'seconds': result['seconds'], 'output': str(path)}), flush=True)


def reject_failed_source():
    decision_path = OUT/'batch-decision.json'
    if decision_path.exists():
        decision = json.loads(decision_path.read_text(encoding='utf8'))
        if decision.get('status', '').startswith('FAILED'):
            raise RuntimeError('Final source sample FAILED; inspect preserved outputs, no unchanged processing or expansion')


def source_tile(order, pixel, receipts, *, receipt_path=None, source_instance='primary'):
    """One owner for bounded acquisition and cached header/pixel readback."""
    assert isinstance(order, int) and 0 <= order <= 8
    assert isinstance(pixel, int) and 0 <= pixel < 12 * 4**order
    assert source_instance in ('primary', 'rubin-mirror')
    assert source_instance == 'primary' or SOURCE == 'rubin'
    master = MASTER if source_instance == 'primary' else 'https://alaskybis.cds.unistra.fr/Rubin/CDS_P_Rubin_FirstLook'
    source_dir = OUT/'original-tiles'
    source_dir.mkdir(exist_ok=True)
    key = ('mirror-' if source_instance != 'primary' else '') + f'Norder{order}-Npix{pixel}'
    extension = 'jpg' if SOURCE == 'ps1' else 'png'
    path = source_dir/(key+'.'+extension)
    if key not in receipts:
        if path.exists():
            raise RuntimeError('Unreceipted response preserved; inspect before reusing or requesting')
        url = f'{master}/Norder{order}/Dir{pixel//10000*10000}/Npix{pixel}.{extension}'
        begun = time.perf_counter()
        headers = source_dir/(key+'.headers.txt')
        # These exact CDS presets have preserved successful same-host controls.
        transport = ['--tls-max', '1.2', '--http1.1'] if SOURCE in ('fds','vphas','rubin') else []
        request = subprocess.run(['curl.exe','--proto','=https','--connect-timeout','8','--max-time','25',
            '--max-filesize','2097152','--silent','--show-error',*transport,'-D',str(headers),'-o',str(path),url],
            capture_output=True, text=True, timeout=30, creationflags=subprocess.CREATE_NO_WINDOW)
        receipts[key] = {'url':url,'sourceInstance':source_instance,'exitCode':request.returncode,'seconds':time.perf_counter()-begun,'error':request.stderr,
                        'raw':pin(path) if path.exists() else None,'headers':pin(headers) if headers.exists() else None}
        save(receipt_path or OUT/'tile-receipts.json', receipts)
        print(json.dumps({'tile':key,'exitCode':request.returncode,
                          'bytes':receipts[key]['raw']['bytes'] if receipts[key]['raw'] else 0}), flush=True)
    receipt = receipts[key]
    expected_url = f'{master}/Norder{order}/Dir{pixel//10000*10000}/Npix{pixel}.{extension}'
    if receipt['url'] != expected_url or receipt['exitCode'] != 0 or receipt['raw'] is None:
        raise RuntimeError('Failed or mismatched request retained; no automatic retry')
    assert receipt['raw']['path'] == path.relative_to(ROOT).as_posix()
    header_raw, _ = bound_bytes(ROOT/receipt['headers']['path'], root=ROOT, expected=receipt['headers'], max_bytes=65536)
    statuses = re.findall(rb'^HTTP/\S+ (\d+)', header_raw, re.MULTILINE)
    if not statuses or statuses[-1] != b'200' or re.search(rb'^location:', header_raw, re.IGNORECASE | re.MULTILINE):
        raise RuntimeError('Non-200 or redirect retained; no automatic retry')
    raw, _ = bound_bytes(path, root=ROOT, expected=receipt['raw'], max_bytes=2097152)
    with Image.open(io.BytesIO(raw)) as tile:
        tile.load()
        expected_format = 'JPEG' if SOURCE == 'ps1' else 'PNG'
        assert tile.format == expected_format and tile.mode in ('RGB','RGBA') and tile.size == (512,512)
        source_mode = tile.mode
        # Raster opacity is neither scientific support nor exact coverage.
        rgba = np.asarray(tile.convert('RGBA'))
    return rgba, source_mode, receipt


def sample(rows, references, fields=()):
    reject_failed_source()
    profiles = source_profiles()
    if fields:
        if len(fields) != len(set(fields)) or not set(fields).issubset({f for f, _ in profiles}):
            raise ValueError('Only distinct already-planned field profiles may be sampled')
        profiles = tuple(p for p in profiles if p[0] in fields)
    selected = [r for r in rows if reference(r) in references]
    if len(selected) != len(set(references)):
        raise ValueError('Unknown or duplicate references')
    cached_plan = json.loads((OUT/'coverage-plan.json').read_text(encoding='utf8'))
    assert cached_plan.get('source', 'legacy') == SOURCE
    # The script may gain sample handling after triage; source and geometry must not change.
    for item in cached_plan['inputs']:
        if item['path'] != Path(__file__).relative_to(ROOT).as_posix():
            bound_file(ROOT/item['path'], root=ROOT, expected=item)
    index_path = OUT/'tile-receipts.json'
    receipts = json.loads(index_path.read_text(encoding='utf8')) if index_path.exists() else {}
    for row in selected:
        for field, order in profiles:
            name = reference(row).replace(':', '-') + f'-{field:g}deg'
            result_path = OUT/(name+'.json')
            if result_path.exists():
                print(json.dumps({'reusedPreview': name}), flush=True)
                continue
            planned = next(r for r in cached_plan['profiles'] if r['reference']==reference(row) and r['fieldDegrees']==field)
            if planned['sampledInside'] != planned['samples']:
                raise RuntimeError('Representative preview requires all triage samples within nominal MOC')
            started = time.perf_counter()
            grid, wcs = lookup(row, field, order, 512)
            image = np.zeros((512,512,4), dtype=np.uint8)
            used = []
            for pixel in np.unique(grid[..., 0]).tolist():
                rgba, source_mode, receipt = source_tile(order, pixel, receipts)
                here = grid[...,0] == pixel
                image[here] = rgba[511-grid[...,2][here], grid[...,1][here]]
                used.append({'order':order,'pixel':pixel,'sourceMode':source_mode,**receipt['raw']})
            preview = OUT/(name+'.png')
            Image.fromarray(image).save(preview)
            save(result_path, {'reference':reference(row),'fieldDegrees':field,'order':order,
                'source':SOURCE,'sourceUrl':MASTER,'sourceTiles':used,
                'preview':pin(preview),'wcs':dict(wcs.to_header()),'alphaZero':int((image[...,3]==0).sum()),
                'opaqueBlack':int(((image[...,3]==255)&(image[...,:3]==0).all(axis=-1)).sum()),
                'seconds':time.perf_counter()-started,'sampling':'existing HEALPix nearest source pixel; no colour adjustment',
                'alphaMeaning':'Source PNG alpha or opaque RGB display raster; not scientific support',
                'science':'UNKNOWN','quality':'PENDING_VISUAL_REVIEW','actualPage':'NOT_RUN','ordinaryAdoption':False})
            print(json.dumps({'preview':name,'tiles':len(used),'alphaZero':int((image[...,3]==0).sum())}), flush=True)


def acquire_periphery(max_order):
    """Acquire original nominal-region parents; never claim a covered viewport.

    Separate receipts keep the completed narrow-source epoch immutable. The
    original transport/header/PNG reader and cache namespace remain shared.
    """
    reject_failed_source()
    assert SOURCE == 'rubin' and max_order in (2, 4)
    intent_path = OUT/'periphery-plan.json'
    intent = json.loads(intent_path.read_text(encoding='utf8'))
    assert intent['sourceId'] == 'CDS/P/Rubin/FirstLook'
    for item in intent['inputs']:
        bound_file(ROOT/item['path'], root=ROOT, expected=item)
    cells = moc_cells()
    assert min(order for order, _ in cells) >= 4
    parents = sorted({pixel // 4**(order-4) for order, pixel in cells})
    assert intent['nominalEnvelope']['boundingOrder'] == 4
    assert intent['nominalEnvelope']['pixels'] == parents
    regions = intent['regions']
    assert [r['reference'] for r in regions] == ['region:rubin-virgo', 'region:rubin-trifid-lagoon']
    partition = [pixel for region in regions for pixel in region['order4Pixels']]
    assert len(partition) == len(set(partition)) and sorted(partition) == parents
    levels = [{'order': order, 'pixels': sorted({pixel // 4**(4-order) for pixel in parents})}
              for order in (2, 3, 4)]
    assert intent['proposedParentLevels'] == levels
    current = OUT/'periphery'
    current.mkdir(exist_ok=True)
    receipt_path = current/'tile-receipts.json'
    receipts = json.loads(receipt_path.read_text(encoding='utf8')) if receipt_path.exists() else {}
    if max_order == 4:
        quality_path = current/'coarse-quality.json'
        quality = json.loads(quality_path.read_text(encoding='utf8'))
        assert quality['status'] == 'COARSE_ORIGINALS_INSPECTED_BOUNDED_EXPANSION_ONLY'
        assert quality['science'] == 'UNKNOWN' and quality['ordinaryAdoption'] is False
        assert quality['sourceId'] == intent['sourceId']
        expected_keys = [f'Norder2-Npix{pixel}' for pixel in levels[0]['pixels']]
        assert sorted(quality['originals']) == expected_keys
        for key in expected_keys:
            assert quality['originals'][key] == receipts[key]['raw']
            bound_file(ROOT/receipts[key]['raw']['path'], root=ROOT, expected=receipts[key]['raw'])
    inputs = [pin(p) for p in (intent_path, MOC, META, Path(__file__), OUT/'rights-and-role.json')]
    results, failures = [], []
    for level in levels:
        if level['order'] > max_order:
            continue
        for pixel in level['pixels']:
            order = level['order']
            key = f'Norder{order}-Npix{pixel}'
            try:
                rgba, mode, receipt = source_tile(order, pixel, receipts, receipt_path=receipt_path)
                alpha = rgba[..., 3]
                yy, xx = np.nonzero(alpha)
                results.append({'key': key, 'order': order, 'pixel': pixel, 'sourceMode': mode,
                    'raw': receipt['raw'], 'alphaZero': int((alpha == 0).sum()),
                    'alphaOpaque': int((alpha == 255).sum()),
                    'alphaPartial': int(((alpha > 0) & (alpha < 255)).sum()),
                    'opaqueBlack': int(((alpha == 255) & (rgba[..., :3] == 0).all(axis=-1)).sum()),
                    'nonzeroAlphaBounds': [int(xx.min()), int(yy.min()), int(xx.max()), int(yy.max())]
                        if len(xx) else None})
            except Exception as error:
                failures.append({'key': key, 'error': str(error), 'receipt': receipts.get(key),
                                 'retry': False})
    for item in inputs:
        bound_file(ROOT/item['path'], root=ROOT, expected=item)
    save(current/'original-readback.json', {'status': 'FAILED' if failures else 'NOMINAL_PARENT_ORIGINALS_READBACK',
        'sourceId': intent['sourceId'], 'maxOrder': max_order, 'inputs': inputs, 'tiles': results,
        'failures': failures, 'science': 'UNKNOWN', 'ordinaryAdoption': False,
        'meaning': 'Original PNG alpha and nominal parent cells; not all viewport support, exact producer footprint or completed Scene'})
    print(json.dumps({'status': 'FAILED' if failures else 'NOMINAL_PARENT_ORIGINALS_READBACK',
                      'maxOrder': max_order, 'tiles': len(results), 'failures': len(failures)}), flush=True)
    if failures:
        raise RuntimeError('Partial parent acquisition retained; no automatic retry or missing/black substitution')


def acquire_quality_selection(quality_dir='quality'):
    """Acquire the bounded complete-target view, independent of exterior fill.

    The saved actual selector, catalogue extent and reviewed rights govern this
    role. Nominally absent tiles are recorded, never requested as black fill.
    Existing receipt owners remain immutable; only new requests live here.
    """
    reject_failed_source()
    assert SOURCE == 'rubin'
    assert re.fullmatch(r'quality(?:/[a-z0-9-]+)?', quality_dir)
    current = OUT/quality_dir
    result_path = current/'current-selection-coverage.json'
    if result_path.exists():
        raise RuntimeError('Existing quality acquisition retained; no unchanged rerun')
    selection_path = current/'current-selection.json'
    selection = json.loads(selection_path.read_text(encoding='utf8'))
    assert selection['sourceId'] == 'CDS/P/Rubin/FirstLook'
    assert (selection['width'], selection['height'], selection['samplesPerAxis']) == (390, 844, 256)
    assert selection['pixelRatios'] == [1, 2] and selection['ordinaryAdoption'] is False
    for item in selection['inputs']:
        bound_file(ROOT/item['path'], root=ROOT, expected=item)
    inputs = [pin(p) for p in (selection_path, MOC, META, Path(__file__),
                              OUT/'rights-and-role.json', ROOT/'data-pipelines/deep-sky/hips_tan_lookup.mjs')]
    intervals, index_order = moc_ranges()
    cells = moc_cells()

    def ray_grid(raw, order, size):
        process = subprocess.run(['node', 'tools/run-node.cjs', 'data-pipelines/deep-sky/hips_tan_lookup.mjs',
                                  str(order), str(size)], input=raw, capture_output=True, cwd=ROOT, check=True, timeout=30)
        assert len(process.stdout) == size**2*12
        return np.frombuffer(process.stdout, dtype='<u4').reshape(size, size, 3)

    def intersects(order, pixel):
        return any(pixel//4**(order-o) == p if order >= o else p//4**(o-order) == pixel for o, p in cells)

    profiles = []
    for profile in selection['profiles']:
        order, pixels = profile['order'], profile['pixels']
        assert isinstance(order, int) and 1 <= order <= 8
        assert 1 <= len(pixels) <= 12 and pixels == sorted(set(pixels))
        assert all(isinstance(p, int) and 0 <= p < 12*4**order for p in pixels)
        raw, _ = bound_bytes(ROOT/profile['rays']['path'], root=ROOT, expected=profile['rays'], max_bytes=256**2*16)
        assert len(raw) == 256**2*16
        inputs.append(profile['rays'])
        inside = moc_membership(ray_grid(raw, index_order-9, 256), intervals)
        boundary = profile['catalogueExtentBoundary']
        assert len(boundary) == 64
        boundary_raw = np.array([[p['raDeg'], p['decDeg']] for p in boundary], dtype='<f8').tobytes()
        extent_inside = moc_membership(ray_grid(boundary_raw, index_order-9, 8), intervals)
        needed = [p for p in pixels if intersects(order, p)]
        assert needed, 'No nominal source cells in the actual complete-target selection'
        profiles.append({'reference': profile['reference'], 'fieldDegrees': profile['fieldDegrees'],
                         'order': order, 'pixels': pixels, 'requiredOriginalPixels': needed,
                         'nominallyAbsentSelectedPixels': [p for p in pixels if p not in needed],
                         'sampledInside': int(inside.sum()), 'samples': int(inside.size),
                         'catalogueExtentNominallyInside': bool(extent_inside.all()),
                         'catalogueExtentSamples': int(extent_inside.size)})
    save(current/'current-selection-moc-check.json', {'profiles': profiles, 'mocIndexOrder': index_order,
        'meaning': 'Actual viewport centres and 64 conservative catalogue-extent boundary samples; nominal MOC only, not exact raster/science support.'})
    assert all(p['catalogueExtentNominallyInside'] for p in profiles), 'Complete target nominal support failed; no new requests'
    # One finite current request/cache owner for this role, across new inputs.
    # Frozen narrow/periphery request epochs remain in their existing owners.
    receipt_path = OUT/'quality/tile-receipts.json'
    receipts = json.loads(receipt_path.read_text(encoding='utf8')) if receipt_path.exists() else {}
    cache_owners = []
    for cache_path in (OUT/'tile-receipts.json', OUT/'periphery/tile-receipts.json'):
        cache_owners.append((cache_path, json.loads(cache_path.read_text(encoding='utf8'))))
    failures, reused, new_keys = [], [], []
    for profile in profiles:
        for pixel in profile['requiredOriginalPixels']:
            key = f'Norder{profile["order"]}-Npix{pixel}'
            owner = next(((p, r) for p, r in cache_owners if key in r), (receipt_path, receipts))
            try:
                if key not in owner[1]:
                    new_keys.append(key)
                else:
                    reused.append(key)
                rgba, mode, receipt = source_tile(profile['order'], pixel, owner[1], receipt_path=owner[0])
                if owner[0] != receipt_path and pin(owner[0]) not in inputs:
                    inputs.append(pin(owner[0]))
                profile.setdefault('originalTiles', []).append({'pixel': pixel, 'sourceMode': mode,
                    'raw': receipt['raw'], 'headers': receipt['headers'],
                    'alphaZero': int((rgba[..., 3] == 0).sum()),
                    'opaqueBlack': int(((rgba[..., 3] == 255) & (rgba[..., :3] == 0).all(axis=-1)).sum())})
            except Exception as error:
                failures.append({'key': key, 'error': str(error), 'receiptOwner': owner[0].relative_to(ROOT).as_posix(), 'retry': False})
    for item in inputs:
        bound_file(ROOT/item['path'], root=ROOT, expected=item)
    save(result_path, {'status': 'FAILED' if failures else 'COMPLETE_TARGET_REQUIRED_ORIGINALS_READBACK',
        'sourceId': selection['sourceId'], 'inputs': inputs, 'profiles': profiles, 'newTileKeys': sorted(set(new_keys)),
        'reusedTileKeys': sorted(set(reused)), 'failures': failures, 'ordinaryAdoption': False, 'science': 'UNKNOWN',
        'exteriorBackground': 'FAILED_INDEPENDENT_OBLIGATION', 'qualification': 'Only complete-target acquisition; no image processing, actual quality, native performance or publication acceptance.'})
    print(json.dumps({'status': 'FAILED' if failures else 'COMPLETE_TARGET_REQUIRED_ORIGINALS_READBACK',
                      'newRequests': len(set(new_keys)), 'reused': len(set(reused)), 'failures': len(failures)}), flush=True)
    if failures:
        raise RuntimeError('Partial quality acquisition retained; no retry or missing/black substitution')


def inspect_quality_coordinates(quality_dir):
    """Cached catalogue/source-pixel diagnostic, never a fitted registration.

    Reuse the existing positive-aperture moment. It is deliberately applied
    to both original and flipped pixels; a plausible moment alone cannot
    certify a star match in a crowded photographic field.
    """
    assert SOURCE == 'rubin' and re.fullmatch(r'quality(?:/[a-z0-9-]+)?', quality_dir)
    current = OUT/quality_dir/'coordinate-diagnostic'
    result_path = current/'result.json'
    if result_path.exists():
        raise RuntimeError('Existing coordinate diagnostic retained; no unchanged rerun')
    recipe_path = current/'intent.json'
    recipe = json.loads(recipe_path.read_text(encoding='utf8'))
    assert recipe['scope'] == 'CACHED_CATALOGUE_SOURCE_COORDINATE_DIAGNOSTIC_NOT_REGISTRATION'
    assert recipe['frame'] == 'FK5 J2000' and recipe['ordinaryAdoption'] is False
    inputs = [pin(recipe_path), pin(Path(__file__)), pin(META)]
    for item in recipe['inputs']:
        bound_file(ROOT/item['path'], root=ROOT, expected=item)
        inputs.append(item)
    moment_owner = Path(__file__).with_name('experience-sdss-measured-star-registration-2026-10-03.py')
    inputs.extend([pin(moment_owner), pin(moment_owner.with_name('experience-sdss-astrans-approximation-audit-2026-10-02.py'))])
    spec = importlib.util.spec_from_file_location('existing_star_moment', moment_owner)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    from astropy.coordinates import SkyCoord, FK5
    from astropy import units as units
    owners = []
    for receipt_path in (OUT/'quality/tile-receipts.json', OUT/'tile-receipts.json'):
        owners.append((receipt_path, json.loads(receipt_path.read_text(encoding='utf8'))))
    tiles, rows = {}, []
    for profile in recipe['profiles']:
        points = profile['anchors']
        assert 0 <= len(points) <= 64 and len({p['reference'] for p in points}) == len(points)
        if not points:
            continue
        sky = SkyCoord(ra=[p['raDeg'] for p in points]*units.deg,
                       dec=[p['decDeg'] for p in points]*units.deg, frame=FK5(equinox='J2000')).icrs
        directions = np.array(list(zip(sky.ra.deg, sky.dec.deg)), dtype='<f8')
        directions = np.concatenate([directions, np.repeat(directions[-1:], 64-len(points), axis=0)])
        process = subprocess.run(['node','tools/run-node.cjs','data-pipelines/deep-sky/hips_tan_lookup.mjs',str(profile['order']),'8'],
                                 input=directions.tobytes(), capture_output=True, cwd=ROOT, check=True, timeout=30)
        assert len(process.stdout) == 64*12
        grid = np.frombuffer(process.stdout, dtype='<u4').reshape(64,3)
        for point, (pixel, x, fits_y) in zip(points, grid):
            key = f'Norder{profile["order"]}-Npix{int(pixel)}'
            available = next(((p,r,'primary') for p,r in owners if key in r and r[key]['exitCode'] == 0 and r[key]['raw']), None)
            if available is None:
                available = next(((p,r,'rubin-mirror') for p,r in owners if 'mirror-'+key in r and r['mirror-'+key]['exitCode'] == 0 and r['mirror-'+key]['raw']), None)
            row = {'target':profile['reference'], **point, 'order':profile['order'], 'pixel':int(pixel), 'sourceXY':[int(x),511-int(fits_y)]}
            if available is None:
                rows.append({**row,'status':'MISSING_CURRENT_CACHED_SUBSET','requested':False})
                continue
            if key not in tiles:
                owner_path, receipts, instance = available
                rgba, _, receipt = source_tile(profile['order'], int(pixel), receipts, receipt_path=owner_path, source_instance=instance)
                inputs.extend([pin(owner_path),receipt['raw'],receipt['headers']])
                tiles[key] = rgba
            rgba = tiles[key]
            y = 511-int(fits_y)
            if min(int(x), y, 511-int(x), 511-y) < 12:
                rows.append({**row,'status':'SOURCE_CELL_EDGE_NOT_MEASURED'})
                continue
            if not np.all(rgba[y-12:y+13,int(x)-12:int(x)+13,3] == 255):
                rows.append({**row,'status':'NONOPAQUE_SOURCE_APERTURE_NOT_MEASURED'})
                continue
            moments = {}
            for label, source in (('original',rgba),('flipped-control',rgba[::-1])):
                plane = source[y-12:y+13,int(x)-12:int(x)+13,:3].astype(float).mean(axis=2)
                measured = module.aperture_centroid(plane,12,12)
                if measured['available']:
                    measured['residualSourcePixels'] = float(np.hypot(*(np.asarray(measured['centerXY'])-12)))
                moments[label] = measured
            rows.append({**row,'status':'DIAGNOSTIC_ONLY','moments':moments})
    unique = {item['path']:item for item in inputs}
    for item in unique.values():
        bound_file(ROOT/item['path'], root=ROOT, expected=item)
    save(result_path, {'status':'CACHED_COORDINATE_DIAGNOSTIC_NOT_ACCEPTANCE','inputs':list(unique.values()),'rows':rows,
        'emptyProfiles':[p['reference'] for p in recipe['profiles'] if not p['anchors']],
        'meaning':'Existing radius7 positive residual moment/local10..12 median on encoded mean RGB. Integer HiPS lookup, no subpixel fit, shift, source epoch correction, PSF or source-quality mask. Crowding and uncalibrated display can produce plausible moments on wrong pixels; flipped control is mandatory and cannot be used to tune a passing threshold.',
        'imageRequests':0,'sourcePixelsChanged':False,'framesRerendered':0,'absoluteRegistration':'UNVERIFIED','ordinaryAdoption':False})
    print(json.dumps({'status':'CACHED_COORDINATE_DIAGNOSTIC_NOT_ACCEPTANCE','anchors':len(rows),'measured':sum(r['status']=='DIAGNOSTIC_ONLY' for r in rows),'emptyProfiles':sum(not p['anchors'] for p in recipe['profiles']),'imageRequests':0}), flush=True)


def acquire_selection():
    """Read the real Scene recipe; triage its rays before missing edge tiles."""
    reject_failed_source()
    assert SOURCE in ('fds', 'rubin'), 'Only the reviewed mature regions may use this bridge'
    result_path = OUT/'current-selection-coverage.json'
    if result_path.exists():
        raise RuntimeError('Existing selection qualification retained; do not rerun unchanged work')
    selection_path = OUT/'current-selection.json'
    selection = json.loads(selection_path.read_text(encoding='utf8'))
    expected_id = 'CDS/P/FDS/DR1/color' if SOURCE == 'fds' else 'CDS/P/Rubin/FirstLook'
    assert selection['sourceId'] == expected_id
    if SOURCE == 'fds':
        assert selection['regionRef'] == source_rows()[0]['regionRef']
    assert (selection['width'], selection['height'], selection['samplesPerAxis']) == (390,844,256)
    if SOURCE == 'fds':
        assert [(p['fieldDegrees'],p['order']) for p in selection['profiles']] == list(source_profiles())
    else:
        intent_path = OUT/'sample-intent.json'
        intent = json.loads(intent_path.read_text(encoding='utf8'))
        assert intent['sourceId'] == expected_id
        assert selection['profiles'] and intent['regions']
        expected = [(r['reference'], p['fieldDegrees'], p['order']) for r in intent['regions'] for p in r['profiles']]
        actual = [(p['reference'], p['fieldDegrees'], p['order']) for p in selection['profiles']]
        assert actual == expected and len(actual) == len(set(actual))
        catalogue_rows = {reference(r): r for r in source_rows()}
        cached_plan = json.loads((OUT/'coverage-plan.json').read_text(encoding='utf8'))
        for region in intent['regions']:
            row = catalogue_rows[region['reference']]
            assert (row['raDeg'], row['decDeg']) == (region['raDeg'], region['decDeg'])
            for profile in region['profiles']:
                assert (profile['fieldDegrees'], profile['order']) in source_profiles()
                planned = next(p for p in cached_plan['profiles'] if p['reference'] == region['reference'] and p['fieldDegrees'] == profile['fieldDegrees'])
                assert planned['sampledInside'] == planned['samples']
        assert any(p['path'] == intent_path.relative_to(ROOT).as_posix() for p in selection['inputs'])
    assert (selection['minOrder'],selection['maxTiles']) == (1,12)
    for item in selection['inputs']:
        bound_file(ROOT/item['path'], root=ROOT, expected=item)
    inputs = [pin(p) for p in (selection_path, MOC, META, Path(__file__), ROOT/'data-pipelines/deep-sky/hips_tan_lookup.mjs')]
    intervals, index_order = moc_ranges()
    profiles = []
    for profile in selection['profiles']:
        ray_pin = profile['rays']
        raw, _ = bound_bytes(ROOT/ray_pin['path'], root=ROOT, expected=ray_pin, max_bytes=256**2*16)
        assert len(raw) == 256**2*16
        inputs.append(ray_pin)
        process = subprocess.run(['node','tools/run-node.cjs','data-pipelines/deep-sky/hips_tan_lookup.mjs',
            str(index_order-9),'256'], input=raw, capture_output=True, cwd=ROOT, check=True, timeout=30)
        assert len(process.stdout) == 256**2*12
        grid = np.frombuffer(process.stdout,dtype='<u4').reshape(256,256,3)
        inside = moc_membership(grid, intervals)
        pixels = profile['pixels']
        assert 1 <= len(pixels) <= 12 and pixels == sorted(set(pixels))
        assert all(isinstance(p,int) and 0 <= p < 12*4**profile['order'] for p in pixels)
        profiles.append({'fieldDegrees':profile['fieldDegrees'],'order':profile['order'],'pixels':pixels,
                         'sampledInside':int(inside.sum()),'samples':int(inside.size)})
    save(OUT/'current-selection-moc-check.json', {'profiles':profiles,'mocIndexOrder':index_order,
        'meaning':'Actual stereographic viewport pixel-centre sample, nominal registry MOC only; not exact master raster or science'})
    assert all(p['sampledInside'] == p['samples'] for p in profiles), 'Current view nominal coverage failed; no expansion'
    index_path = OUT/'tile-receipts.json'
    receipts = json.loads(index_path.read_text(encoding='utf8')) if index_path.exists() else {}
    keys_before = set(receipts)
    for profile in profiles:
        for pixel in profile['pixels']:
            _, mode, receipt = source_tile(profile['order'], pixel, receipts)
            profile.setdefault('originalTiles',[]).append({'pixel':pixel,'sourceMode':mode,**receipt['raw']})
    for item in inputs:
        bound_file(ROOT/item['path'], root=ROOT, expected=item)
    save(result_path, {'status':'CURRENT_VIEW_NOMINAL_CENTRES_INSIDE_AND_REQUIRED_ORIGINAL_TILES_READBACK',
        'inputs':inputs,'sourceId':selection['sourceId'],'profiles':profiles,
        'newTileKeys':sorted(set(receipts)-keys_before),'existingTileKeys':sorted(keys_before),
        'previewProcessing':0,'sceneDownloads':0,'ordinaryAdoption':False,
        'qualification':'Only bounded actual selection and PNG/header readback; no final quality, exact scientific coverage or publication'})
    print(json.dumps({'selected':sum(len(p['pixels']) for p in profiles),'newRequests':len(set(receipts)-keys_before),
                      'inputPins':len(inputs),'output':str(result_path)}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('plan','sample','selection','periphery','quality','coordinates'))
    parser.add_argument('--source', choices=('legacy','ztf','fds','vphas','rubin','ps1'), default='legacy')
    parser.add_argument('--references', nargs='+', default=[])
    parser.add_argument('--field-degrees', nargs='+', type=float, default=[],
                        help='Sample a subset of existing coverage-plan profiles; never bypass coverage')
    parser.add_argument('--max-order', type=int, choices=(2, 4), default=None,
                        help='Rubin periphery only; order4 requires inspected original order2 samples')
    parser.add_argument('--quality-dir', default='quality',
                        help='Complete-target recipe within quality or one named child; shared original cache/receipts')
    args = parser.parse_args()
    if args.field_degrees and args.action != 'sample':
        parser.error('--field-degrees only applies to sample')
    if args.max_order is not None and args.action != 'periphery':
        parser.error('--max-order only applies to periphery')
    if args.quality_dir != 'quality' and args.action not in ('quality','coordinates'):
        parser.error('--quality-dir only applies to quality or coordinates')
    select_source(args.source)
    OUT.mkdir(parents=True, exist_ok=True)
    rows = source_rows()
    if args.action == 'plan':
        if args.references:
            selected = [row for row in rows if reference(row) in args.references]
            if len(selected) != len(args.references) or len(args.references) != len(set(args.references)):
                parser.error('Unknown or duplicate plan references')
            rows = selected
        plan(rows)
    elif args.action == 'sample':
        sample(rows, args.references, args.field_degrees)
    elif args.action == 'periphery':
        acquire_periphery(args.max_order or 2)
    elif args.action == 'quality':
        acquire_quality_selection(args.quality_dir)
    elif args.action == 'coordinates':
        inspect_quality_coordinates(args.quality_dir)
    else:
        acquire_selection()
