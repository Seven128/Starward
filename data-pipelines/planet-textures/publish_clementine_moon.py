"""Create a candidate only from the complete, hash-pinned USGS v2.1 raster."""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import rasterio

from clementine_moon import reduce_raster

SOURCE_URL = 'https://planetarymaps.usgs.gov/mosaic/Lunar_Clementine_UVVIS_750nm_Global_Mosaic_118m_v2.1.tif'
SOURCE_BYTES = 4247470871
SOURCE_SIZE = (92160, 46080)
SOURCE_SHA256 = '51b2367ecbcc939c03a92297ecff7e35c592b17c12141e4ff152dd7e30459120'


def validate_geography(dataset):
    crs = dataset.crs.to_dict() if dataset.crs else {}
    expected = {'proj': 'eqc', 'lat_ts': 0, 'lat_0': 0, 'lon_0': 0,
                'x_0': 0, 'y_0': 0, 'R': 1737400, 'units': 'm'}
    if any(crs.get(key) != value for key, value in expected.items()):
        raise ValueError('unexpected lunar CRS')
    if dataset.transform.b != 0 or dataset.transform.d != 0 or dataset.transform.a <= 0 or dataset.transform.e >= 0:
        raise ValueError('unexpected lunar grid orientation')
    half = math.pi * 1737400
    bounds = (-half, -half/2, half, half/2)
    # Product rounded metre coordinates differ by <1 m from exact +/-180, +/-90.
    if any(abs(actual - target) > 1 for actual, target in zip(dataset.bounds, bounds)):
        raise ValueError('unexpected lunar spatial coverage')


def publish(source: Path, output: Path, source_sha256: str):
    if source.stat().st_size != SOURCE_BYTES:
        raise ValueError('incomplete or unexpected source byte length')
    if source_sha256 != SOURCE_SHA256:
        raise ValueError('source must match the reviewed USGS v2.1 hash')
    with rasterio.open(source) as dataset:
        validate_geography(dataset)
    result = reduce_raster(source, output, source_sha256=source_sha256,
                           source_size=SOURCE_SIZE, output_size=(2048, 1024))
    return {**result, 'sourceUrl': SOURCE_URL, 'sourceBytes': SOURCE_BYTES,
            'processing': 'Exact 45x45 area mean of nonzero source samples; RGBA alpha is measured area fraction. Native 8-bit grayscale retained without contrast stretch; no synthetic infill.',
            'projection': {'kind': 'simple-cylindrical', 'longitude': 'positive-east',
                           'latitude': 'planetocentric', 'bboxDeg': [-180, -90, 180, 90]},
            'candidateOnly': True}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--source-sha256', required=True)
    args = parser.parse_args()
    if len(args.source_sha256) != 64 or any(c not in '0123456789abcdef' for c in args.source_sha256):
        parser.error('source SHA-256 must be 64 lowercase hexadecimal characters')
    print(json.dumps(publish(args.source, args.output, args.source_sha256), indent=2))
