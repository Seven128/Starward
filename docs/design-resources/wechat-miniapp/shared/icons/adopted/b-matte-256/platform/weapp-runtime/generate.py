from __future__ import annotations

import hashlib
import io
import json
import struct
import zlib
from pathlib import Path

from PIL import Image
from zopfli.zlib import compress
from zopfli.png import optimize as optimize_png


HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent.parent / "assets"
OUTPUT = HERE / "assets"
MAIN_OUTPUT = HERE / "assets-main"
TAB_OUTPUT = HERE.parent / "weapp-tabbar" / "assets"
UI_SIZE = 192
LARGE_SIZE = 224
MAIN_UI_SIZE = 96
MAIN_FILES = ("parking--day--default.png", "restroom--day--default.png")
TAB_FILES = ("account-user--day--default.png", "account-user--day--selected.png", "map--day--default.png", "map--day--selected.png")
FILTERED_FILES = {
    "navigation--day--default.png", "more--day--default.png",
    "clock--day--default.png", "images--day--default.png", "settings--day--default.png",
    "sun--day--default.png", "meteor--day--default.png", "info--day--default.png",
    "location--day--default.png", "pencil--day--default.png", "layers--day--default.png",
    "favorite-star--day--default.png", "cloud--day--default.png", "moon--day--default.png",
    "arrow-left--day--default.png", "bulb--day--default.png", "low-cloud--day--default.png",
    "terrain--day--default.png", "horizon--day--default.png", "four-point-star--day--default.png",
    "favorite-trail--day--default.png", "chevron-right--day--default.png", "favorite-satellite--day--default.png",
}
COMPRESSED_FILES = {
    "favorite-star--day--selected.png", "favorite-trail--day--default.png",
    "layers--day--default.png", "bulb--day--default.png",
    "terrain--day--default.png", "favorite-satellite--day--default.png",
    "account-user--day--default.png", "arrow-left--day--default.png",
    "check--day--default.png", "chevron-down--day--default.png",
    "chevron-right--day--default.png", "chevron-up--day--default.png",
    "close--day--default.png", "cloud--day--default.png",
    "compass--day--default.png", "eye--day--default.png",
    "four-point-star--day--default.png", "horizon--day--default.png",
    "favorite-star--day--default.png", "images--day--default.png",
    "info--day--default.png", "low-cloud--day--default.png",
    "location--day--default.png", "meteor--day--default.png",
    "moon--day--default.png", "pencil--day--default.png",
    "plan-suv--day--default.png", "search--day--default.png",
    "settings--day--default.png", "share--day--default.png",
    "spot-marker--day--default.png", "spot-marker--day--draft.png",
    "spot-marker--day--pending.png", "spot-marker--day--selected.png",
    "sun--day--default.png", "clock--day--default.png",
    "telescope--day--default.png", "navigation--day--default.png",
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


def compress_png_filters(data: bytes) -> bytes:
    optimized = optimize_png(data, lossy_transparent=False, lossy_8bit=False, num_iterations=15)
    with Image.open(io.BytesIO(data)) as before, Image.open(io.BytesIO(optimized)) as after:
        # Keep RGBA and every pixel, including the RGB of fully transparent ones.
        if before.mode != after.mode or before.size != after.size or before.tobytes() != after.tobytes():
            return data
    return optimized if len(optimized) < len(data) else data


def write_derivative(source: Path, size: int, directory: Path) -> dict[str, object]:
    directory.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        rgba = image.convert("RGBA")
        if rgba.size != (256, 256):
            raise ValueError(f"unexpected source size: {source.name} {rgba.size}")
        target = rgba.resize((size, size), Image.Resampling.LANCZOS)
        destination = directory / source.name
        target.save(destination, format="PNG", optimize=True, compress_level=9)
        if source.name in COMPRESSED_FILES:
            destination.write_bytes(compress_deflate(destination.read_bytes()))
        if directory == TAB_OUTPUT or (directory == OUTPUT and source.name in FILTERED_FILES):
            destination.write_bytes(compress_png_filters(destination.read_bytes()))
    with Image.open(destination) as written:
        if written.mode != "RGBA" or written.size != (size, size):
            raise ValueError(f"invalid derivative: {destination}")
    return {
            "filename": source.name,
            "sourceSha256": sha256(source),
            "sha256": sha256(destination),
            "bytes": destination.stat().st_size,
            "outputSize": [size, size],
    }


files: list[dict[str, object]] = []
for source in sorted(SOURCE.glob("*.png")):
    size = LARGE_SIZE if source.name.startswith(("spot-marker", "map--", "account-user", "plan-suv")) else UI_SIZE
    files.append(write_derivative(source, size, OUTPUT))
main_files = [write_derivative(SOURCE / name, MAIN_UI_SIZE, MAIN_OUTPUT) for name in MAIN_FILES]
tab_files = [write_derivative(SOURCE / name, UI_SIZE, TAB_OUTPUT) for name in TAB_FILES]

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
            "losslessFilterSelection": {"method": "Zopfli PNG", "iterations": 15, "files": sorted(FILTERED_FILES), "preserveRGBA": True},
            "files": files,
            "mainPackageVariants": {"directory": "assets-main", "uiSize": MAIN_UI_SIZE, "displaySize": 24, "files": main_files},
            "tabBarVariants": {"directory": "../weapp-tabbar/assets", "uiSize": UI_SIZE, "files": tab_files},
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
