"""Convert a pinned Stellarium texture's four corners to a nominal TAN plane.

Uses Astropy, not Stellarium program code. This is a bounded geometric
conversion of published positions, not an independent astrometric solution.
The upstream prepared pixels and their unknown processing remain distinct from
the institution's original observation. No network access or rights approval.
"""
from __future__ import annotations

import json
import re

import astropy.units as u
from astropy.coordinates import SkyCoord
from astropy.wcs.utils import fit_wcs_from_points
import numpy as np


def stellarium_corner_geometry(recipe, metadata_raw, evidence, width, height):
    """Admit one opaque, complete texture, using the recorded acquisition pins.

    Upstream texture (0,0) is the lower-left *edge*, whereas array row zero is
    at the top. FITS zero-origin pixel centers therefore use u*width-.5 and
    v*height-.5. Runtime's existing top-first TAN owner performs the row flip.
    A half-source-pixel conversion bound is not an absolute accuracy claim.
    """
    revision = evidence.get('revision', '')
    if (evidence.get('schemaVersion') != 'source-fetch-evidence-v1' or
            evidence.get('repository') != 'https://github.com/Stellarium/stellarium' or
            not re.fullmatch(r'[0-9a-f]{40}', revision)):
        raise ValueError('prepared_corners_acquisition_invalid')
    base = f'https://raw.githubusercontent.com/Stellarium/stellarium/{revision}/nebulae/default/'
    source_url = recipe['source']['sourceUrl']
    name = source_url.removeprefix(base)
    if not source_url.startswith(base) or not re.fullmatch(r'[A-Za-z0-9_-]+\.png', name):
        raise ValueError('prepared_corners_source_url_invalid')
    rows = [row for row in evidence.get('files', []) if row.get('file') == name]
    if (len(rows) != 1 or rows[0].get('sourceUrl') != source_url or
            any(rows[0].get(k) != recipe['encoded'][k] for k in ('bytes', 'sha256')) or
            rows[0].get('size') != [width, height] or recipe['metadataSourceUrl'] != base+'textures.json' or
            recipe['metadata'] not in evidence.get('metadata', [])):
        raise ValueError('prepared_corners_source_metadata_join_invalid')
    # Upstream has literal tabs in some credit strings. Preserve the original
    # metadata bytes; allow JSON control characters without evaluating code.
    metadata = json.loads(metadata_raw, strict=False)
    if any(key in metadata for key in ('frame', 'frameType', 'worldCoords')):
        raise ValueError('prepared_corners_inherited_frame_unsupported')
    selected = [row for row in metadata.get('subTiles', []) if row.get('imageUrl') == name]
    if len(selected) != 1 or selected[0] != rows[0].get('texture'):
        raise ValueError('prepared_corners_texture_join_invalid')
    tile = selected[0]
    if (tile.get('textureCoords') != [[[0, 0], [1, 0], [1, 1], [0, 1]]] or
            any(key in tile for key in ('subTiles', 'frame', 'frameType')) or 'worldCoords' not in tile or len(tile['worldCoords']) != 1 or
            tile.get('imageCredits', {}).get('short') != recipe['source']['credit']):
        raise ValueError('prepared_corners_texture_form_invalid')
    world = np.asarray(tile['worldCoords'][0], dtype=float)
    if (world.shape != (4, 2) or not np.isfinite(world).all() or
            np.any(np.abs(world[:, 0]) > 360) or np.any(np.abs(world[:, 1]) >= 90)):
        raise ValueError('prepared_corners_world_invalid')
    world[:, 0] %= 360
    coordinates = SkyCoord(world[:, 0]*u.deg, world[:, 1]*u.deg, frame='icrs')
    # The publisher guide describes small approximately planar textures.
    # Larger/multi-polygon products need a different, explicitly tested adapter.
    separations = coordinates[:, None].separation(coordinates[None, :]).deg
    if np.max(separations) > 1 or np.min(separations[np.triu_indices(4, 1)]) <= 0:
        raise ValueError('prepared_corners_not_small_field')
    pixels = np.array([[0, 0], [width, 0], [width, height], [0, height]], dtype=float)-.5
    wcs = fit_wcs_from_points((pixels[:, 0], pixels[:, 1]), coordinates, projection='TAN')
    import scipy
    residual = wcs.all_world2pix(world, 0)-pixels
    errors = np.linalg.norm(residual, axis=1)
    if not np.isfinite(errors).all() or float(np.max(errors)) > .5:
        raise ValueError('prepared_corners_tan_conversion_exceeds_half_pixel')
    return wcs, {
        'method': 'publisher-four-corners-to-nominal-tan-v1',
        'revision': revision, 'imageFile': name,
        'worldCoordsDegrees': world.tolist(), 'textureCoordsBottomFirst': tile['textureCoords'][0],
        'cornerResidualPixels': residual.tolist(), 'maximumCornerResidualPixels': float(np.max(errors)),
        'maximumAllowedConversionErrorPixels': .5,
        'scipyVersion': scipy.__version__,
        'meaning': 'TAN approximation of the four published corners only; not independent registration, interior distortion, scientific validity or Scene acceptance.',
    }
