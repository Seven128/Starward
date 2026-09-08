import hashlib
import json
from pathlib import Path
import sys
import zipfile

apk = Path(sys.argv[1])
with zipfile.ZipFile(apk) as archive:
    entries = archive.infolist()
    groups = {name: {"entries": 0, "bytes": 0, "compressedBytes": 0} for name in ["dex", "native", "resources", "assets", "other"]}
    for entry in entries:
        name = entry.filename
        group = "dex" if name.endswith(".dex") else "native" if name.startswith("lib/") else "resources" if name.startswith("res/") or name == "resources.arsc" else "assets" if name.startswith("assets/") else "other"
        groups[group]["entries"] += 1
        groups[group]["bytes"] += entry.file_size
        groups[group]["compressedBytes"] += entry.compress_size
    result = {
        "file": apk.name,
        "bytes": apk.stat().st_size,
        "sha256": hashlib.file_digest(apk.open("rb"), "sha256").hexdigest() if hasattr(hashlib, "file_digest") else hashlib.sha256(apk.read_bytes()).hexdigest(),
        "abis": sorted({entry.filename.split("/")[1] for entry in entries if entry.filename.startswith("lib/") and entry.filename.endswith(".so")}),
        "nativeLibrarySha256": {entry.filename: hashlib.sha256(archive.read(entry)).hexdigest() for entry in entries if entry.filename.startswith("lib/") and entry.filename.endswith(".so")},
        "groups": groups,
    }
print(json.dumps(result, indent=2))
