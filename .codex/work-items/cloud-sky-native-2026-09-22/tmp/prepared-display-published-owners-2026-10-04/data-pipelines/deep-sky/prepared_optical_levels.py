"""Same-master geometric RGBA tiers, independent of the producer's colour unit."""
from dataclasses import dataclass
import io
import math
import numpy as np
from PIL import Image
from sdss_gri_tan import premultiplied_rgba_box


@dataclass(frozen=True)
class PreparedOpticalLevel:
    level: str
    pixels: int
    field_degrees: float
    bounds_xy_exclusive: tuple[int, int, int, int]
    box_factor: int
    png_bytes: bytes
    rgba_bytes: bytes
    geometric_source_master_support_pixels: int
    total_source_master_crop_pixels: int


def prepared_optical_levels(rgba: np.ndarray, field_degrees: float, *, output_pixels: int = 512):
    """Call after the producer admits binary geometry and its colour meaning.

    This shared responsibility crops and box-filters existing pixels only. It
    supplies no source admission, science mask, colour processing or adoption.
    """
    if (not isinstance(rgba, np.ndarray) or rgba.dtype != np.uint8 or rgba.ndim != 3 or
            rgba.shape[2] != 4 or rgba.shape[0] != rgba.shape[1] or
            not 1 <= rgba.shape[0] <= 4096 or type(output_pixels) is not int or output_pixels <= 0 or
            rgba.shape[0] < output_pixels * 4 or rgba.shape[0] % (output_pixels * 4) or
            not math.isfinite(field_degrees) or not 0 < field_degrees <= 4):
        raise RuntimeError("prepared_optical_levels_geometry_invalid")
    n = rgba.shape[0]
    products = []
    for index, level in enumerate(("OVERVIEW", "MEDIUM", "DETAIL")):
        extent = n // (2 ** index)
        start, end = (n - extent) // 2, (n + extent) // 2
        factor = extent // output_pixels
        crop = rgba[start:end, start:end]
        sampled = premultiplied_rgba_box(crop, factor)
        output = io.BytesIO()
        Image.fromarray(sampled).save(output, format="PNG")
        exact_field = math.degrees(2 * math.atan(math.tan(math.radians(field_degrees) / 2) * extent / n))
        products.append(PreparedOpticalLevel(level, output_pixels, exact_field,
            (start, start, end, end), factor, output.getvalue(), sampled.tobytes(order="C"),
            int((crop[:, :, 3] == 255).sum()), extent ** 2))
    return tuple(products)
