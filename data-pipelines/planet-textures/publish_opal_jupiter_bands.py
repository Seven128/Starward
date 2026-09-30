"""Derive a longitude-neutral Jupiter cloud-band strip from one licensed OPAL map.

The source is the MAST OPAL Cycle 31 2024c color preview. Keeping only each
planetographic latitude's median removes the dated Great Red Spot longitude:
this is a historical band profile, not a forecast of present Jovian weather.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from opal_latitude_profile import derive_profile


SOURCE_SHA256 = "b352755811130a1ede851f9c62de48454cc249f2047a763782870ac8d8a158e2"
SOURCE_SIZE = (3600, 1800)
def derive(source: Path, output: Path) -> dict[str, object]:
    return derive_profile(source, output, source_sha256=SOURCE_SHA256,
                          source_size=SOURCE_SIZE)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    print(derive(args.source, args.output))
