"""Admit saved, reviewed reference TAN measurements without refitting pixels."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from astropy.io.fits import Header
from astropy.wcs import WCS

from optical_publication_io import bound_bytes, bound_file


def admit_display_registration(spec, encoded, metadata, nominal, parent_hash, *, root):
    bindings = []

    def read(binding):
        raw, actual = bound_bytes(root / binding['path'], root=root, expected=binding,
                                  max_bytes=binding['bytes'])
        bindings.append(actual)
        return json.loads(raw)

    def retain_inputs(document, document_binding):
        directory = (root / document_binding['path']).parent
        for binding in document['inputs']:
            path = root / binding['path']
            snapshot = directory / Path(binding['path']).name
            if '/scripts/' in binding['path'] and snapshot.is_file():
                path = snapshot
            bindings.append(bound_file(path, root=root, expected=binding))

    measurement = read(spec['measurement'])
    review = read(spec['review'])
    if (measurement.get('status') != 'MEASURED_TAN_CANDIDATE_NOT_ADOPTED' or
            review.get('status') != 'MEASURED_DISPLAY_TAN_SAMPLE_REVIEWED' or
            review.get('measurement') != spec['measurement'] or review.get('source') != encoded or
            not isinstance(review.get('limitations'), str) or not review['limitations'].strip()):
        raise ValueError('prepared_registration_measurement_review_join_invalid')
    declaration = measurement['declaration']
    points = read(declaration['points'])
    source = read(points['sourceReceipt'])
    if (source.get('jpeg') != encoded or source.get('xmp') != metadata or
            source.get('originalSize') != [nominal['sourceWidth'], nominal['sourceHeight']] or
            [measurement['sourceWidth'], measurement['sourceHeight']] != source['originalSize'] or
            review.get('training') != declaration['training'] or review.get('holdout') != declaration['holdout']):
        raise ValueError('prepared_registration_source_or_split_invalid')
    retain_inputs(measurement, spec['measurement'])
    retain_inputs(points, declaration['points'])
    names = declaration['training'] + declaration['holdout']
    if (len(set(names)) != len(names) or min(len(declaration['training']), len(declaration['holdout'])) < 3):
        raise ValueError('prepared_registration_independent_holdout_missing')
    observations = measurement['observations']
    if [r['designation'] for r in observations] != names:
        raise ValueError('prepared_registration_observations_split_mismatch')
    source_points = {r['designation']: r for r in points['rows']}
    for row in observations:
        original = source_points[row['designation']]
        if (original['observation']['status'] != 'UNREVIEWED_CANDIDATE' or original['observation']['warnings'] or
                row['measuredPixelTopFirst'] != original['observation']['centroid'] or
                row['referenceIcrsDegrees'] != [original['ra'], original['dec']] or
                row['referenceJdate'] != original['jdate']):
            raise ValueError('prepared_registration_point_measurement_mismatch')
    wcs = WCS(Header.fromstring(measurement['fittedHeader'], sep='\n'))
    matrix = wcs.pixel_scale_matrix
    # FITS cards round decimal doubles. These serialization tolerances are far
    # below a source pixel; residual readback separately checks the transform.
    if (wcs.pixel_n_dim != 2 or wcs.has_distortion or list(wcs.wcs.ctype) != ['RA---TAN', 'DEC--TAN'] or
            wcs.wcs.radesys != 'ICRS' or not np.isfinite(matrix).all() or np.linalg.det(matrix) == 0 or
            not np.allclose(matrix, measurement['cdDegreesPerPixel'], rtol=0, atol=1e-18) or
            not np.allclose(wcs.wcs.crval, measurement['referenceValue'], rtol=0, atol=5e-12) or
            not np.allclose(wcs.wcs.crpix, measurement['referencePixelFitsOneBased'], rtol=0, atol=1e-10)):
        raise ValueError('prepared_registration_tan_header_invalid')
    world = np.array([r['referenceIcrsDegrees'] for r in observations])
    measured = np.array([r['measuredPixelTopFirst'] for r in observations])
    if not np.isfinite(world).all() or not np.isfinite(measured).all():
        raise ValueError('prepared_registration_nonfinite_coordinates')
    predicted = wcs.all_world2pix(world, 0)
    canonical = WCS(naxis=2)
    canonical.wcs.ctype = ['RA---TAN', 'DEC--TAN']
    canonical.wcs.radesys = 'ICRS'
    canonical.wcs.crval = measurement['referenceValue']
    canonical.wcs.crpix = measurement['referencePixelFitsOneBased']
    canonical.wcs.cd = measurement['cdDegreesPerPixel']
    if not np.allclose(predicted, canonical.all_world2pix(world, 0), rtol=0, atol=1e-7):
        raise ValueError('prepared_registration_unrepresented_wcs_invalid')
    predicted[:, 1] = nominal['sourceHeight']-1-predicted[:, 1]
    residual = predicted-measured
    if not np.allclose(residual, [r['fittedResidualPixels'] for r in observations], rtol=0, atol=1e-7):
        raise ValueError('prepared_registration_residual_readback_invalid')
    summaries = {}
    for label, start, end in [('training', 0, len(declaration['training'])),
                              ('holdout', len(declaration['training']), len(names))]:
        lengths = np.linalg.norm(residual[start:end], axis=1)
        actual = {'count': len(lengths), 'rmsPixels': float(np.sqrt(np.mean(lengths**2))),
                  'maxPixels': float(np.max(lengths))}
        saved = measurement['summaries'][label]
        if saved['count'] != actual['count'] or any(abs(saved[k]-actual[k]) > 1e-7 for k in ('rmsPixels', 'maxPixels')):
            raise ValueError('prepared_registration_statistics_readback_invalid')
        # Carry measured numbers, not newly rounded values or an accuracy claim.
        summaries[label] = {key: saved[key] for key in actual}
    if spec['catalogue'] != review.get('catalogue'):
        raise ValueError('prepared_registration_catalogue_review_mismatch')
    geometry = {'projection': 'TAN', 'frame': 'ICRS', 'sourceWidth': nominal['sourceWidth'],
                'sourceHeight': nominal['sourceHeight'], 'referenceValue': measurement['referenceValue'],
                'referencePixelFitsOneBased': measurement['referencePixelFitsOneBased'],
                'cdDegreesPerPixel': measurement['cdDegreesPerPixel'], 'rowOrder': 'top-first'}
    registration = {'method': 'reference-catalogue-tan-display-v1', 'geometry': geometry,
                    'evidence': {k: spec['measurement'][k] for k in ('bytes', 'sha256')},
                    'sourceImage': {k: encoded[k] for k in ('bytes', 'sha256')},
                    'parentPublicationHash': parent_hash, 'catalogue': spec['catalogue'], **summaries,
                    'residualUnit': 'original-source-pixel', 'pixelTransform': 'none',
                    'quality': 'MEASURED_LOCAL_CANDIDATE', 'limitations': review['limitations']}
    return registration, canonical, bindings
