from __future__ import annotations

import hashlib
import json
import struct
import zlib
from pathlib import Path

from PIL import Image
from zopfli.zlib import compress


HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent.parent / "assets"
OUTPUT = HERE / "assets"
UI_SIZE = 192
LARGE_SIZE = 224
COMPRESSED_FILES = {
    "favorite-star--day--selected.png", "favorite-trail--day--default.png",
    "layers--day--default.png", "bulb--day--default.png",
    "terrain--day--default.png", "favorite-satellite--day--default.png",
}


def compress_deflate(data: bytes) -> bytes:
    chunks = []
    offset = 8
    while offset < len(data):
        length = struct.unpack(">I", data[offset:offset + 4])[0]
        chunk = data[offset:offset + length + 12]
        chunks.append(chunk)
        offset += len(chunk)
    original = zlib.decompress(b"".join(chunk[8:-4] for chunk in chunks if chunk[4:8] == b"IDAT"))
    encoded = compress(original, numiterations=15)
    if zlib.decompress(encoded) != original:
        raise ValueError("lossless PNG compression changed filtered pixels")
    idat = struct.pack(">I", len(encoded)) + b"IDAT" + encoded + struct.pack(">I", zlib.crc32(b"IDAT" + encoded) & 0xffffffff)
    result, emitted = data[:8], False
    for chunk in chunks:
        if chunk[4:8] != b"IDAT":
            result += chunk
        elif not emitted:
            result += idat
            emitted = True
    return result if len(result) < len(data) else data


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


OUTPUT.mkdir(parents=True, exist_ok=True)
files: list[dict[str, object]] = []
for source in sorted(SOURCE.glob("*.png")):
    with Image.open(source) as image:
        rgba = image.convert("RGBA")
        if rgba.size != (256, 256):
            raise ValueError(f"unexpected source size: {source.name} {rgba.size}")
        size = LARGE_SIZE if source.name.startswith(("spot-marker", "map--", "account-user", "plan-suv")) else UI_SIZE
        target = rgba.resize((size, size), Image.Resampling.LANCZOS)
        destination = OUTPUT / source.name
        target.save(destination, format="PNG", optimize=True, compress_level=9)
        if source.name in COMPRESSED_FILES:
            destination.write_bytes(compress_deflate(destination.read_bytes()))
    with Image.open(destination) as written:
        if written.mode != "RGBA" or written.size != (size, size):
            raise ValueError(f"invalid derivative: {destination}")
    files.append(
        {
            "filename": source.name,
            "sourceSha256": sha256(source),
            "sha256": sha256(destination),
            "bytes": destination.stat().st_size,
            "outputSize": [size, size],
        }
    )

(HERE / "manifest.json").write_text(
    json.dumps(
        {
            "schemaVersion": 2,
            "source": "../../assets",
            "sourceSize": [256, 256],
            "uiSize": [UI_SIZE, UI_SIZE],
            "largeSize": [LARGE_SIZE, LARGE_SIZE],
            "format": "RGBA PNG",
            "resampling": "Lanczos",
            "losslessCompression": {"method": "Zopfli DEFLATE", "iterations": 15, "files": sorted(COMPRESSED_FILES)},
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
