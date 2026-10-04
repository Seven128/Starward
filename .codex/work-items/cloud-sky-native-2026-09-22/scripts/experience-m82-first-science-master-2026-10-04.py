"""First M82 complete source coadd and existing quality consumer, no adoption."""
from pathlib import Path
import importlib.util
import json
import sys
import time

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / '.codex/work-items/cloud-sky-native-2026-09-22'
OUT = ROOT / 'output/sdss-m82-first-science-master-1004-r2'
sys.path[:0] = [str(ROOT / 'output/allwise-w3-atlas-0929/python-deps'), str(ROOT / 'data-pipelines/deep-sky')]
import numpy as np
from sdss_corrected_frame import read_cached_band_set
from sdss_frame_quality import PixelFlags, read_cached_psfield, check_frame_quality
from sdss_frame_noise import read_cached_field_noise
from sdss_gri_tan import build_mosaic_master, save_candidate, WholeMasterZscaleTransfer, SCIENCE_PYRAMID_KIND
from sdss_noise_display import NoiseDisplaySource, _qualified_sources, _project_display_region

def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, TASK / 'scripts' / filename)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value

prior = module('mask_binding', 'readback-m82-fpm-frame-intersection-2026-10-04.py')
resource = module('memory_owner', 'experience-shared-noise-display-2026-10-03.py')
bind = prior.bind

def save(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')

def main():
    assert not OUT.exists()
    OUT.mkdir()
    (OUT / 'executed-script.py').write_bytes(Path(__file__).read_bytes())
    cp_path = TASK / 'evidence/current-execution-state-2026-10-04-r77.json'
    cp = json.loads(cp_path.read_bytes())
    original_pins = cp['currentSources'] + cp['protected'] + cp['evidence']
    for pin in original_pins:
        assert bind(ROOT / pin['path']) == pin
    started = time.perf_counter()
    initial_memory = resource.memory()
    gi_path = ROOT / 'output/sdss-m82-gi-support-1004-r1/result.json'
    gi = json.loads(gi_path.read_bytes())
    quality = json.loads((ROOT / 'output/sdss-m82-quality-inputs-1004-r1/result.json').read_bytes())
    masks = json.loads((ROOT / 'output/sdss-m82-fpm-frame-intersection-1004-r1/result-r2.json').read_bytes())
    camera_pin = quality['cameraReceipt']
    assert bind(ROOT / camera_pin['path']) == camera_pin
    camera_receipt = json.loads((ROOT / camera_pin['path']).read_bytes())
    camera_path = ROOT / camera_receipt['raw']['path']
    assert all(isinstance(f['coherentGriPixels'], int) for f in gi['fields'])
    frames, sources, associations = [], {}, []
    for field in gi['fields']:
        identity = field['identity']
        key = '/'.join(str(identity[k]) for k in ('rerun', 'run', 'camcol', 'field'))
        ps_record = next(p for p in quality['sourceRecords'] if p['filename'].startswith('psField') and p['identity'] == identity)
        psf = read_cached_psfield(ROOT / ps_record['raw']['path'],
            identity | {'sourceUrl': ps_record['url'], 'bytes': ps_record['bytes'], 'sha256': ps_record['sha256']},
            max_uncompressed_bytes=16 * 1024 * 1024)
        current = read_cached_band_set(ROOT, field['sourceRecords'], ('g', 'r', 'i'), max_uncompressed_bytes=32 * 1024 * 1024)
        sources[key] = {}
        for frame in current:
            frame_identity = frame.receipt['identity']
            band = frame_identity['band']
            mask = next(p for p in masks['fpMInputs'] if p['identity'] == frame_identity)
            for pin in (mask['flags'], mask['currentAdmission']):
                assert bind(ROOT / pin['path']) == pin
            receipt = json.loads((ROOT / mask['currentAdmission']['path']).read_bytes())
            with np.load(ROOT / mask['flags']['path'], allow_pickle=False) as data:
                flags = data['flags']
            flags.setflags(write=False)
            flag_source = PixelFlags(flags, None, receipt)
            camera = read_cached_field_noise(camera_path, camera_receipt, frame_identity)
            correlation = check_frame_quality(frame, psf, flag_source)
            associations.append({'fieldKey': key, 'band': band, 'correlation': correlation,
                'mask': mask['currentAdmission'], 'camera': {'fieldID': camera.field_id,
                    'gainElectronsPerCount': camera.gain_electrons_per_count,
                    'darkVarianceCountsSquared': camera.dark_variance_counts_squared},
                'asTrans': frame.receipt['asTrans'], 'astrometry': frame.receipt['wcs'],
                'scientificQuality': 'UNKNOWN'})
            sources[key][band] = NoiseDisplaySource(frame, camera, flag_source)
        frames.extend(current)
        save(OUT / 'associations-progress.json', associations)
        print(json.dumps({'qualifiedInputField': key, 'bands': len(current), 'quality': 'UNKNOWN'}), flush=True)
    save(OUT / 'associations.json', {'inputs': associations, 'scope': 'Input identities/known processing batch only, not source quality/astrometry'})
    manifest = ROOT / 'workers/miniapp-api/assets/deep-sky/sdss-m82/manifest.json'
    entry = json.loads(manifest.read_bytes())
    catalog_path = ROOT / 'packages/astronomy-core/data/opengc-messier-deep-sky.v1.json'
    row = next(p for p in json.loads(catalog_path.read_bytes())['rows'] if p['objectRef'] == 'M:82')
    assert entry['center'] == gi['targetCenter'] and entry['levels']['OVERVIEW']['fieldDegrees'] == gi['fieldDegrees']
    build_start = time.perf_counter()
    master = build_mosaic_master(frames, entry, 2048, gi['fieldDegrees'], require_complete=True,
        display_transfer=WholeMasterZscaleTransfer())
    build_seconds = time.perf_counter() - build_start
    save(OUT / 'build-measurement.json', {'seconds': build_seconds, 'memory': resource.memory(),
        'scope': 'Actual local Windows Python process, not client/server capacity'})
    assert master.joint_available.all()
    for field in gi['fields']:
        key = '/'.join(str(field['identity'][k]) for k in ('rerun', 'run', 'camcol', 'field'))
        assert int(np.count_nonzero(master.mosaic_weights[key])) == field['coherentGriPixels']
    candidate = save_candidate(OUT / 'candidate', master, entry, row, pyramid_kind=SCIENCE_PYRAMID_KIND)
    recipe, projected, weights = _qualified_sources(master, sources)
    eligible = np.zeros((2048, 2048), dtype=np.bool_)
    native_model_known = np.zeros_like(eligible)
    variance_min, variance_max = None, None
    qualification_start = time.perf_counter()
    for y in range(0, 2048, 32):
        region = slice(y, y + 32), slice(0, 2048)
        values, usable, stencils = _project_display_region(master, sources, projected, weights, region, lambda: None)
        eligible[region] = usable
        known = np.ones(usable.shape, dtype=bool)
        for stencil in stencils:
            variances = stencil['variance']
            known &= np.isfinite(variances).all(axis=0)
            finite = variances[np.isfinite(variances) & (variances > 0)]
            if finite.size:
                lo, hi = float(finite.min()), float(finite.max())
                variance_min = lo if variance_min is None else min(variance_min, lo)
                variance_max = hi if variance_max is None else max(variance_max, hi)
        native_model_known[region] = known
        if y % 256 == 0:
            print(json.dumps({'qualityConsumerCompletedRows': y + 32, 'elapsedSeconds': time.perf_counter() - started,
                             'memory': resource.memory()}), flush=True)
    np.savez_compressed(OUT / 'display-qualification.npz', eligible=eligible, native_model_known=native_model_known)
    qual = {'sourceConsumer': 'sdss_noise_display._qualified_sources/_project_display_region',
        'fullTargetPixels': 2048 ** 2, 'processablePixels': int(eligible.sum()),
        'nativeConditionalModelKnownPixels': int(native_model_known.sum()),
        'knownButProcessingExcludedPixels': int((native_model_known & ~eligible).sum()),
        'conditionalWeightedSourceVarianceMinimum': variance_min, 'conditionalWeightedSourceVarianceMaximum': variance_max,
        'central64Processable': int(eligible[992:1056, 992:1056].sum()),
        'seconds': time.perf_counter() - qualification_start,
        'meaning': 'Original source noise model and known INTERP/SATUR/GHOST/CR qualification for existing display consumer; not detector validity, confidence, noise independence, or science mask',
        'omittedUncertainty': 'SKY/model/processing/PSF/calibration/systematics omitted; same native pixels share noise and cross-field covariance is unknown'}
    save(OUT / 'display-qualification.json', qual)
    for pin in original_pins:
        assert bind(ROOT / pin['path']) == pin
    owners = ['sdss_gri_tan.py', 'sdss_corrected_frame.py', 'sdss_source_stencil.py',
              'sdss_frame_quality.py', 'sdss_frame_noise.py', 'sdss_noise_display.py', 'image_quality.py']
    for name in owners:
        (OUT / ('executed-' + name)).write_bytes((ROOT / 'data-pipelines/deep-sky' / name).read_bytes())
    result = {'scope': __doc__, 'checkpoint': bind(cp_path), 'producer': bind(Path(__file__)),
        'griInputs': bind(gi_path), 'qualityInputs': bind(ROOT / 'output/sdss-m82-quality-inputs-1004-r1/result.json'),
        'candidate': bind(OUT / 'candidate/candidate.json'), 'sourceAssociations': bind(OUT / 'associations.json'),
        'qualification': qual, 'recipe': recipe, 'buildSeconds': build_seconds,
        'elapsedSeconds': time.perf_counter() - started, 'initialMemory': initial_memory, 'finalMemory': resource.memory(),
        'newFilesLogicalBytesBeforeResult': sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file()),
        'previousSourcesProtectedEvidenceExact': True, 'originalScienceAndAssetsUnchanged': True,
        'networkRequests': 0, 'newFiltering': False, 'ordinaryAdoption': False,
        'scientificQuality': 'UNVERIFIED', 'independentReview': 'MISSING'}
    save(OUT / 'result.json', result)
    print(json.dumps({'candidate': result['candidate'], 'processable': qual['processablePixels'],
                     'buildSeconds': build_seconds, 'memory': result['finalMemory']}), flush=True)

if __name__ == '__main__':
    main()
