# Copyright 2024 The Khronos Group, Inc.
# SPDX-License-Identifier: Apache-2.0
# Modified for Starward on 2026-10-04: Python/NumPy display-only shoulder;
# original material offset and desaturation omitted, input need not be linear
# Rec.709, below-knee values preserved. Not the complete PBR Neutral mapper.
"""Explicit common highlight compression of existing display RGB quantities.

Borrow only the rational highlight shoulder and its fixed knee from Khronos
PBR Neutral. This does not calibrate astronomical color, subtract background,
change science eligibility, apply gamma or identify physical linear sRGB.
Callers own source/alpha/geometry and explicit versioned adoption.

Source: KhronosGroup/ToneMapping, commit
b5a2eed5ddf6c2227090449399de9c7affb9e4c9/PBR_Neutral/pbrNeutral.glsl
Copyright and Apache-2.0 notice: licenses/khronos-tone-mapping-NOTICE.txt.
"""
import numpy as np

VERSION='common-display-highlight-shoulder-v1'
KNEE=.8-.04

def compress_display_highlights(rgb: np.ndarray) -> np.ndarray:
    """Map finite, nonnegative channel-first display RGB to float64 [0,1].

    The whole interval max(R,G,B)<=.76 is unchanged, including its finite weak
    values. Above the knee, scale all channels by the same positive factor.
    No per-image/level/object fit or local neighborhood operation is involved.
    Input is immutable. Scientific signed arrays are not accepted here.
    """
    if (not isinstance(rgb,np.ndarray) or rgb.ndim!=3 or rgb.shape[0]!=3 or
        not rgb.shape[1] or not rgb.shape[2] or rgb.dtype not in (np.dtype('f4'),np.dtype('f8')) or
        not np.isfinite(rgb).all() or np.any(rgb<0)):
        raise ValueError('Finite nonnegative float32/float64 display RGB required')
    output=rgb.astype(np.float64,copy=True)
    peak=output.max(axis=0);high=peak>KNEE
    d=1-KNEE
    new_peak=1-d*d/(peak[high]+d-KNEE)
    output[:,high]*=new_peak/peak[high]
    return output
