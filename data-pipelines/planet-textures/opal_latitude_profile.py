"""Reduce a reviewed OPAL color preview to longitude-neutral latitude bands."""

from __future__ import annotations

import hashlib
import os
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image


OUTPUT_SIZE = (8, 512)


def derive_profile(source: Path, output: Path, *, source_sha256: str,
                   source_size: tuple[int, int],
                   strict_missing_mask: bool = False) -> dict[str, object]:
    raw = source.read_bytes()
    source_sha = hashlib.sha256(raw).hexdigest()
    if source_sha != source_sha256:
        raise ValueError(f"unexpected OPAL source SHA-256: {source_sha}")
    with Image.open(source) as image:
        if image.size != source_size or image.mode != "RGB":
            raise ValueError(f"unexpected OPAL source geometry/mode: {image.size} {image.mode}")
        pixels = np.asarray(image, dtype=np.uint8)

    rows = np.zeros((source_size[1], OUTPUT_SIZE[0], 4), dtype=np.uint8)
    valid_rows = 0
    measured = np.zeros(source_size[1], dtype=bool)
    for y, row in enumerate(pixels):
        # Black/no-data pixels, including Saturn's ring occultation, are not
        # atmosphere measurements. Never turn those gaps into a dark cloud band.
        valid = np.max(row, axis=1) > 20
        if np.mean(valid) < 0.9:
            continue
        rgb = np.rint(np.median(row[valid], axis=0)).astype(np.uint8)
        rows[y, :, :3] = rgb
        rows[y, :, 3] = 255
        measured[y] = True
        valid_rows += 1

    if valid_rows == 0:
        raise ValueError("no measured OPAL latitude rows")

    if strict_missing_mask:
        # Large unobserved hemispheres must stay entirely transparent. Fill RGB
        # only for filtering near measured boundaries, then resize the binary
        # coverage mask independently without introducing partial-alpha rows.
        valid_indices = np.flatnonzero(measured)
        missing_indices = np.flatnonzero(~measured)
        nearest = np.abs(missing_indices[:, None] - valid_indices).argmin(axis=1)
        rows[missing_indices, :, :3] = rows[valid_indices[nearest], :, :3]
        color = Image.fromarray(rows[:, :, :3], "RGB").resize(OUTPUT_SIZE, Image.Resampling.LANCZOS)
        coverage = Image.fromarray(rows[:, :, 3], "L").resize(OUTPUT_SIZE, Image.Resampling.NEAREST)
        strip = Image.merge("RGBA", (*color.split(), coverage))
    else:
        strip = Image.fromarray(rows, "RGBA").resize(OUTPUT_SIZE, Image.Resampling.LANCZOS)
    output.parent.mkdir(parents=True, exist_ok=True)
    # A failed encoder must not clobber a previously published, hash-pinned asset.
    with tempfile.NamedTemporaryFile(prefix=f".{output.name}.", suffix=".png",
                                     dir=output.parent, delete=False) as temporary:
        temporary_path = Path(temporary.name)
    try:
        strip.save(temporary_path, format="PNG", optimize=True)
        out_bytes = temporary_path.read_bytes()
        os.replace(temporary_path, output)
    finally:
        if temporary_path.exists():
            temporary_path.unlink()
    return {
        "sourceSha256": source_sha,
        "sourceSize": list(source_size),
        "validSourceLatitudeRows": valid_rows,
        "outputSize": list(OUTPUT_SIZE),
        "outputBytes": len(out_bytes),
        "outputSha256": hashlib.sha256(out_bytes).hexdigest(),
    }
