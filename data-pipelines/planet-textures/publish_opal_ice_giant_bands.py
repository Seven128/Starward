"""Derive pinned, longitude-neutral OPAL ice-giant latitude profiles for fixed publication.

The pinned published outputs retain only measured
latitudes; a source map's nominal 360-degree longitude does not imply complete
hemispheric coverage or a prediction of today's cloud longitude.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from opal_latitude_profile import derive_profile


SOURCES = {
    "uranus": {
        "sha256": "854ba9d0b744c2d6e6b646d315847a3528b94b4f0b8970cc4285d71228e69c7b",
        "size": (721, 361),
        "epoch": "2025a",
    },
    "neptune": {
        "sha256": "8c17a2872b5d55577c63abe7ba1369997ff32bb83e0f9b9c350a46db96713cb8",
        "size": (721, 361),
        "epoch": "2025b",
    },
}


def derive(body: str, source: Path, output: Path) -> dict[str, object]:
    if body not in SOURCES:
        raise ValueError(f"unsupported OPAL body: {body}")
    pinned = SOURCES[body]
    result = derive_profile(source, output, source_sha256=pinned["sha256"],
                            source_size=pinned["size"], strict_missing_mask=True)
    return {"body": body, "epoch": pinned["epoch"], **result}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("body", choices=sorted(SOURCES))
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    print(derive(args.body, args.source, args.output))
