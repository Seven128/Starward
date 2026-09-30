"""Derive historical, longitude-neutral Saturn bands from reviewed OPAL data."""

from __future__ import annotations

import argparse
from pathlib import Path

from opal_latitude_profile import derive_profile


SOURCE_SHA256 = "c34a13a8253a39bcc1f8376b24c077b89f05ce0b5202706f535ded20314440d7"
SOURCE_SIZE = (1800, 900)


def derive(source: Path, output: Path) -> dict[str, object]:
    return derive_profile(source, output, source_sha256=SOURCE_SHA256,
                          source_size=SOURCE_SIZE)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    print(derive(args.source, args.output))
