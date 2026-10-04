"""Bounded metadata-only range inspection; never downloads the 4.25 GB mosaic."""
import json
import math
import struct
import sys
import urllib.request

URL = "https://planetarymaps.usgs.gov/mosaic/Lunar_Clementine_UVVIS_750nm_Global_Mosaic_118m_v2.1.tif"
transferred = 0


def read_range(start, length):
    global transferred
    if length > 16384 or transferred + length > 131072:
        raise ValueError("metadata byte budget exceeded")
    request = urllib.request.Request(URL, headers={"Range": f"bytes={start}-{start+length-1}",
                                                   "User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=15) as response:
        if response.status != 206 or not response.headers.get("Content-Range", "").startswith(f"bytes {start}-"):
            raise ValueError("server did not honor the bounded range")
        data = response.read(length + 1)
    if len(data) != length:
        raise ValueError("unexpected range length")
    transferred += len(data)
    return data


header = read_range(0, 16)
order = "<" if header[:2] == b"II" else ">" if header[:2] == b"MM" else None
magic = struct.unpack(order + "H", header[2:4])[0] if order else None
if magic not in (42, 43):
    raise ValueError("not a TIFF header")
big = magic == 43
if big and header[4:8] != struct.pack(order + "HH", 8, 0):
    raise ValueError("unsupported BigTIFF offsets")
offset_format, offset_size = ("Q", 8) if big else ("I", 4)
count_format, count_size = ("Q", 8) if big else ("H", 2)
entry_format, entry_size = ("HHQQ", 20) if big else ("HHII", 12)
offset = struct.unpack(order + offset_format, header[8:16] if big else header[4:8])[0]
names = {254: "subfile_type", 256: "width", 257: "height", 258: "bits_per_sample",
         259: "compression", 262: "photometric", 277: "samples_per_pixel", 278: "rows_per_strip",
         273: "strip_offsets", 279: "strip_byte_counts",
         322: "tile_width", 323: "tile_height", 330: "sub_ifds", 339: "sample_format", 42113: "gdal_nodata",
         33550: "pixel_scale", 33922: "tie_points", 34735: "geo_keys", 34736: "geo_double_params",
         34737: "geo_ascii_params"}
result = []
seen = set()
while offset:
    if offset in seen or len(seen) >= 8:
        raise ValueError("IFD chain exceeds bounded metadata inspection")
    seen.add(offset)
    count = struct.unpack(order + count_format, read_range(offset, count_size))[0]
    entries = read_range(offset + count_size, count * entry_size + offset_size)
    item = {}
    for i in range(count):
        raw = entries[i*entry_size:(i+1)*entry_size]
        tag, kind, size, value = struct.unpack(order + entry_format, raw)
        if tag not in names:
            continue
        formats = {1: (1, "B"), 3: (2, "H"), 4: (4, "I"), 12: (8, "d"), 16: (8, "Q"), 18: (8, "Q")}
        inline = raw[-offset_size:]
        if kind == 2 and size <= 128:
            text = inline[:size] if size <= offset_size else read_range(value, size)
            item[names[tag]] = text.rstrip(b"\0").decode("ascii")
        elif kind in formats and size <= 128:
            width, fmt = formats[kind]
            data = inline[:size*width] if size*width <= offset_size else read_range(value, size*width)
            item[names[tag]] = list(struct.unpack(order + fmt*size, data))
        else:
            item[names[tag]] = {"type": kind, "count": size, "offset": value}
    result.append(item)
    offset = struct.unpack(order + offset_format, entries[-offset_size:])[0]
metadata_bytes = transferred
samples = []
if "--sample" in sys.argv:
    # This probe supports only this declared single-byte, one-row strip source.
    first = result[0]
    assert first["width"] == [92160] and first["height"] == [46080]
    assert first["compression"] == [1] and first["rows_per_strip"] == [1]
    assert first["bits_per_sample"] == [8] and first["samples_per_pixel"] == [1]
    assert first["gdal_nodata"] == "0"
    assert first["geo_ascii_params"].startswith("Equirectangular Moon|")
    assert first["geo_double_params"] == [0, 0, 0, 0, 0, 1737400, 1737400, 0]
    keys = first["geo_keys"]
    key_values = {keys[i]: keys[i+1:i+4] for i in range(4, len(keys), 4)}
    assert key_values[1025] == [0, 1, 1]  # PixelIsArea
    assert key_values[3075] == [0, 1, 17]  # Equirectangular
    assert key_values[3076] == [0, 1, 9001]  # Metres
    sx, sy, _ = first["pixel_scale"]
    tx, ty = first["tie_points"][3:5]
    assert abs(tx + math.pi*1737400) < 1 and abs(ty - math.pi*1737400/2) < 1
    for x, y in [(866,492), (1038,461), (1183,646), (1883,682)]:
        longitude = -180 + (x+.5)*360/2048
        latitude = 90 - (y+.5)*180/1024
        row = math.floor((ty-1737400*math.radians(latitude))/sy)
        col = math.floor((1737400*math.radians(longitude)-tx)/sx)
        table = first["strip_offsets"]
        counts = first["strip_byte_counts"]
        assert table["type"] == counts["type"] == 16 and table["count"] == counts["count"] == 46080
        strip = struct.unpack(order+"Q", read_range(table["offset"]+row*8, 8))[0]
        byte_count = struct.unpack(order+"Q", read_range(counts["offset"]+row*8, 8))[0]
        assert byte_count == 92160 and col > 22 and col+15*45+23 < byte_count
        values = read_range(strip+col-22, 15*45+45)
        for delta, role in [(0, "observed_black_patch"), (15, "adjacent_control")]:
            line = values[delta*45:delta*45+45]
            samples.append({"preview_x": x+delta, "preview_y": y, "role": role,
                            "tiff_col": col+delta*45, "tiff_row": row,
                            "line_pixels": len(line), "zero_pixels": line.count(0),
                            "min": min(line), "max": max(line), "mean": sum(line)/len(line)})
print(json.dumps({"source": URL, "metadata_bytes": metadata_bytes,
                  "total_response_bytes": transferred, "ifds": result, "samples": samples}, indent=2))
