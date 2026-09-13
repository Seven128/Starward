from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent.parent / "assets"
OUTPUT = HERE / "assets"
SIZE = 224


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


OUTPUT.mkdir(parents=True, exist_ok=True)
files: list[dict[str, object]] = []
for source in sorted(SOURCE.glob("*.png")):
    with Image.open(source) as image:
        rgba = image.convert("RGBA")
        if rgba.size != (256, 256):
            raise ValueError(f"unexpected source size: {source.name} {rgba.size}")
        target = rgba.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
        destination = OUTPUT / source.name
        target.save(destination, format="PNG", optimize=True, compress_level=9)
    with Image.open(destination) as written:
        if written.mode != "RGBA" or written.size != (SIZE, SIZE):
            raise ValueError(f"invalid derivative: {destination}")
    files.append(
        {
            "filename": source.name,
            "sourceSha256": sha256(source),
            "sha256": sha256(destination),
            "bytes": destination.stat().st_size,
        }
    )

(HERE / "manifest.json").write_text(
    json.dumps(
        {
            "schemaVersion": 1,
            "source": "../../assets",
            "sourceSize": [256, 256],
            "outputSize": [SIZE, SIZE],
            "format": "RGBA PNG",
            "resampling": "Lanczos",
            "files": files,
        },
        ensure_ascii=False,
        indent=2,
    )
    + "\n",
    encoding="utf-8",
)

print(
    json.dumps(
        {
            "count": len(files),
            "bytes": sum(int(file["bytes"]) for file in files),
        }
    )
)
