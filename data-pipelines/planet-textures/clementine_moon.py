"""Reduce the reviewed Clementine raster with explicit source coverage.

No JPEG threshold, infill or synthetic terrain. GDAL reads bounded row windows;
each output pixel averages only measured samples in its exact source footprint.
Alpha expresses that footprint's measured fraction, not surface darkness.
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import tempfile

import numpy as np
from PIL import Image
import rasterio
from rasterio.windows import Window


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def reduce_raster(source: Path, output: Path, *, source_sha256: str,
                  source_size: tuple[int, int], output_size: tuple[int, int]) -> dict:
    if sha256_file(source) != source_sha256:
        raise ValueError('Clementine source hash mismatch')
    width, height = output_size
    if width <= 0 or height <= 0 or source_size[0] % width or source_size[1] % height:
        raise ValueError('output must divide the source grid exactly')
    sx, sy = source_size[0] // width, source_size[1] // height
    if sx < 1 or sy < 1:
        raise ValueError('upsampling is not supported')
    pixels = np.zeros((height, width, 4), dtype=np.uint8)
    source_valid = 0
    footprint = sx * sy
    with rasterio.Env(GDAL_CACHEMAX=32 * 1024 * 1024), rasterio.open(source) as dataset:
        if ((dataset.width, dataset.height) != source_size or dataset.count != 1
                or dataset.dtypes != ('uint8',) or dataset.nodata != 0):
            raise ValueError('unexpected Clementine geometry/type/NoData')
        for y in range(height):
            values = dataset.read(1, window=Window(0, y * sy, dataset.width, sy))
            cells = values.reshape(sy, width, sx)
            measured = cells != 0  # Exact GDAL_NODATA, never a brightness threshold.
            count = measured.sum(axis=(0, 2), dtype=np.uint64)
            total = cells.sum(axis=(0, 2), dtype=np.uint64)
            valid = count > 0
            gray = np.zeros(width, dtype=np.uint8)
            gray[valid] = np.rint(total[valid] / count[valid]).astype(np.uint8)
            pixels[y, :, :3] = gray[:, None]
            # At least one valid measurement remains nonzero even below 1/255.
            alpha = np.rint(count.astype(np.float64) * 255 / footprint)
            pixels[y, :, 3] = np.where(valid, np.maximum(1, alpha), 0).astype(np.uint8)
            source_valid += int(count.sum(dtype=np.uint64))
    if source_valid == 0:
        raise ValueError('no measured lunar surface')
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(prefix=f'.{output.name}.', suffix='.png',
                                     dir=output.parent, delete=False) as temporary:
        temporary_path = Path(temporary.name)
    try:
        Image.fromarray(pixels).save(temporary_path, format='PNG', optimize=True)
        size, digest = temporary_path.stat().st_size, sha256_file(temporary_path)
        os.replace(temporary_path, output)
    finally:
        if temporary_path.exists():
            temporary_path.unlink()
    return {'sourceSha256': source_sha256, 'sourceSize': list(source_size),
            'sourceValidPixels': source_valid, 'outputSize': list(output_size),
            'fullyMissingOutputPixels': int(np.count_nonzero(pixels[:, :, 3] == 0)),
            'partialOutputPixels': int(np.count_nonzero((pixels[:, :, 3] > 0) & (pixels[:, :, 3] < 255))),
            'outputBytes': size, 'outputSha256': digest}
