"""Whole-source RGB working images shared by offline preparation and trials.

Geometry/rights remain with source adapters. This never crops, fills coverage,
upscales, removes stars or assigns scientific validity. Partial alpha needs a
separate coverage-preserving adapter; it cannot be erased at this boundary.
"""
from dataclasses import dataclass
import io
import time
from PIL import Image, ImageCms


@dataclass(frozen=True)
class NormalizedRgbSource:
    source_size: tuple[int, int]
    work_size: tuple[int, int]
    png_bytes: bytes
    rgb_bytes: bytes
    icc_profile: bytes
    colour_meaning: str
    resize_seconds: float
    encode_seconds: float


def normalize_loaded_rgb(image, width, *, untagged_colour_interpretation=None, allow_upscale=False):
    if type(width) is not int or width < 2 or (width > image.width and not allow_upscale):
        raise ValueError('whole_rgb_work_width_invalid_or_upscale')
    if image.getexif().get(274, 1) != 1:
        raise ValueError('whole_rgb_orientation_requires_source_adapter')
    if image.mode == 'RGBA' and image.getchannel('A').getextrema() == (255, 255):
        image = image.convert('RGB')
    if image.mode != 'RGB':
        raise ValueError('only_complete_RGB_sources_admitted')
    profile = image.info.get('icc_profile')
    colour = ImageCms.getProfileDescription(ImageCms.ImageCmsProfile(io.BytesIO(profile))).strip() if profile else 'unspecified'
    if not profile and untagged_colour_interpretation == 'sRGB-web-display':
        profile = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
        colour = 'sRGB web-display interpretation; original untagged, not calibrated'
    if not profile or 'sRGB' not in colour:
        raise ValueError('non_srgb_profile_requires_explicit_conversion')
    size = image.size
    target = (width, round(size[1] * width / size[0]))
    if target[1] < 2:
        raise ValueError('whole_rgb_work_height_invalid')
    started = time.perf_counter()
    work = image.copy().resize(target, Image.Resampling.LANCZOS)
    rgb = work.tobytes()
    resize_seconds = time.perf_counter() - started
    started = time.perf_counter()
    buffer = io.BytesIO()
    work.save(buffer, format='PNG', icc_profile=profile)
    return NormalizedRgbSource(size, target, buffer.getvalue(), rgb, profile, colour,
                               resize_seconds, time.perf_counter() - started)


def normalize_whole_rgb(raw, width, *, untagged_colour_interpretation=None, allow_upscale=False):
    with Image.open(io.BytesIO(raw)) as image:
        image.load()
        return normalize_loaded_rgb(image, width,
            untagged_colour_interpretation=untagged_colour_interpretation, allow_upscale=allow_upscale)
