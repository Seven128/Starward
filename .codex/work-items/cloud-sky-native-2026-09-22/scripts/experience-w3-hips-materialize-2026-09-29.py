"""One bounded source-bound M42 trial. No API/publication or release mutations."""
from pathlib import Path
import hashlib
import io
import json
import sys
import urllib.request
import warnings

ROOT = Path(__file__).resolve().parents[4]
BASE = ROOT / "output/allwise-w3-hips-0929"
OUTPUT = BASE / "candidate-axes-corrected"
sys.path.insert(0, str(ROOT / "output/allwise-w3-atlas-0929/python-deps"))
from astropy.io import fits
from astropy.wcs import WCS
import numpy as np
from PIL import Image


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def checked_fits(raw):
    with warnings.catch_warnings(record=True) as notices:
        warnings.simplefilter("always")
        with fits.open(io.BytesIO(raw), memmap=False) as hdus:
            hdus.verify("exception")
            hdu = hdus[0]
            assert hdu.header["BITPIX"] == -32 and hdu.data.shape == (512, 512)
            offset = hdu.fileinfo()["datLoc"]
            assert len(raw) >= offset + hdu.data.nbytes, "scientific_array_truncated"
            data = np.array(hdu.data, copy=True)
    return data, {"completeArrayReceived": True,
                  "missingEndPaddingBytes": (offset + data.nbytes + 2879) // 2880 * 2880 - len(raw),
                  "readerWarnings": sorted(set(str(n.message) for n in notices))}


def geometry_check():
    # Independent Atlas SIN WCS versus exact production tile directions.
    result_path = OUTPUT / "source-geometry.json"
    assert not result_path.exists(), "preserve_previous_geometry_check"
    world = np.fromfile(OUTPUT / "m42-source-tile-world.bin", dtype="<f8").reshape(64, 64, 2)
    raw = (BASE / "m42-tile.fits").read_bytes()
    tile, receipt = checked_fits(raw)
    atlas, header = fits.getdata(ROOT / "output/allwise-w3-atlas-0929/m42-int.fits", header=True)
    cov = fits.getdata(ROOT / "output/allwise-w3-atlas-0929/m42-cov.fits")
    x, y = WCS(header).all_world2pix(world[:, :, 0], world[:, :, 1], 0)
    x, y = np.rint(x).astype(int), np.rint(y).astype(int)
    inside = (x >= 0) & (y >= 0) & (x < atlas.shape[1]) & (y < atlas.shape[0])
    native = atlas[y[inside], x[inside]]
    source = tile[::-1][::8, ::8][inside]
    finite = np.isfinite(native) & np.isfinite(source)
    agreement = float(np.mean(np.isfinite(native) == np.isfinite(source)))
    result = {"fitsSha256": sha(raw), "geometry": "image column=nw,row=ne; FITS row reversed",
              "nativeWcs": "Atlas SIN", "sampledDirections": int(inside.sum()),
              "missingAgreement": agreement, "bothFinite": int(finite.sum()),
              "finiteIntensityCorrelation": float(np.corrcoef(native[finite], source[finite])[0, 1]),
              "zeroAtlasCoverageSamples": int((cov[y[inside], x[inside]] == 0).sum()),
              "receipt": receipt,
              "limits": "Local nearest native comparison; independent evidence for axes, not exact Atlas->HiPS resampling or absolute source astrometry"}
    result_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    assert result["sampledDirections"] > 2000 and agreement > .98
    assert result["finiteIntensityCorrelation"] > .99
    print(json.dumps(result), flush=True)


def materialize():
    result_path = OUTPUT / "candidate-result.json"
    assert not result_path.exists(), "preserve_previous_materialization"
    plan = json.loads((OUTPUT / "candidate-plan.json").read_text(encoding="utf-8"))
    lookup = json.loads((OUTPUT / "candidate-lookup.json").read_text(encoding="utf-8"))
    assert plan["objectRef"] == "M:42"
    tile_count = sum(len(p["tiles"]) for p in lookup["profiles"])
    assert tile_count == 20, "bound_trial_to_actual_m42_plan"
    result = {"scope": "One M42 three-level source-bound local candidate, not published or target accepted",
              "sourcePropertiesSha256": sha((BASE / "properties").read_bytes()),
              "sourceTileCount": tile_count, "sourceBytes": 0, "sourceFiles": [], "levels": [],
              "maskMeaning": "finite selected HiPS FITS measurement only; no artifact-free quality, Atlas frame-depth or coverage confidence claim"}
    for profile in lookup["profiles"]:
        for tile in profile["tiles"]:
            path = OUTPUT / "sources" / tile["path"]
            url = f'{plan["source"]}/{tile["path"]}'
            metadata = {"path": tile["path"], "url": url}
            try:
                if path.exists():
                    raw = path.read_bytes()
                    metadata["acquisition"] = "REUSED"
                else:
                    print(f'One bounded source request: {tile["path"]}', flush=True)
                    request = urllib.request.Request(url, headers={"User-Agent": "Starward-bounded-M42-candidate/1.0"})
                    with urllib.request.urlopen(request, timeout=25) as response:
                        assert response.status == 200
                        raw = response.read(1_100_001)
                    assert 0 < len(raw) <= 1_100_000, "source_exceeds_trial_bound"
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(raw)
                    metadata["acquisition"] = "RECEIVED"
                data, receipt = checked_fits(raw)
                metadata.update(state="CHECKED", bytes=len(raw), sha256=sha(raw), receipt=receipt,
                                nonfinite=int((~np.isfinite(data)).sum()))
                result["sourceBytes"] += len(raw)
                assert result["sourceBytes"] <= 22_000_000
            except Exception as error:
                metadata.update(state="UNAVAILABLE", error=f"{type(error).__name__}: {error}")
            result["sourceFiles"].append(metadata)
            result_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    assert all(row["state"] == "CHECKED" for row in result["sourceFiles"]), "incomplete_input; no filling/retry/publication"
    for profile, mapping in zip(plan["profiles"], lookup["profiles"], strict=True):
        assert profile["level"] == mapping["level"]
        n = profile["pixels"]
        map_raw = (OUTPUT / mapping["lookupFile"]).read_bytes()
        assert sha(map_raw) == mapping["lookupSha256"]
        samples = np.frombuffer(map_raw, dtype="<u4").reshape(n, n, 3)
        intensity = np.full((n, n), np.nan, dtype=np.float32)
        for tile in mapping["tiles"]:
            data, _ = checked_fits((OUTPUT / "sources" / tile["path"]).read_bytes())
            take = samples[:, :, 0] == tile["pixel"]
            intensity[take] = data[samples[:, :, 2][take], samples[:, :, 1][take]]
        finite = np.isfinite(intensity)
        assert finite.any() and finite.sum() > intensity.size / 2
        lo, hi = np.percentile(intensity[finite], [1, 99.7])
        assert hi > lo
        gray = np.zeros((n, n), dtype=np.uint8)
        scale = np.maximum(intensity[finite] - lo, 0) / (hi - lo)
        gray[finite] = np.rint(np.clip(np.arcsinh(scale * 10) / np.arcsinh(10), 0, 1) * 255).astype(np.uint8)
        rgba = np.repeat(gray[..., None], 4, axis=-1)
        rgba[:, :, 3] = finite.astype(np.uint8) * 255
        name = f'm42-{profile["level"].lower()}-finite.png'
        Image.fromarray(rgba).save(OUTPUT / name)
        raw = (OUTPUT / name).read_bytes()
        readback = np.asarray(Image.open(io.BytesIO(raw)).convert("RGBA"))
        assert np.array_equal(readback[:, :, 3] > 0, finite)
        assert (readback[:, :, 3][~finite] == 0).all()
        assert (readback[:, :, 3][finite] == 255).all(), "dim finite data must not become missing"
        header = fits.Header(profile["wcsHeader"])
        fits.PrimaryHDU(data=intensity[::-1], header=header).writeto(OUTPUT / name.replace(".png", ".fits"), overwrite=False)
        original_raw = (ROOT / "workers/miniapp-api/assets/deep-sky" / profile["original"]["file"]).read_bytes()
        assert sha(original_raw) == profile["original"]["sha256"]
        original_gray = np.asarray(Image.open(io.BytesIO(original_raw)).convert("L"))
        result["levels"].append({"level": profile["level"], "fieldDegrees": profile["fieldDegrees"],
                                 "pixels": n, "file": name, "bytes": len(raw), "sha256": sha(raw),
                                 "sourceOrder": profile["sourceOrder"], "finitePixels": int(finite.sum()),
                                 "missingPixels": int((~finite).sum()), "finitePixelFraction": float(finite.mean()),
                                 "finiteButBlackPixels": int(((gray == 0) & finite).sum()),
                                 "originalJpegAtMappedMissingPercentiles": np.percentile(original_gray[~finite], [0, 50, 90, 100]).tolist() if (~finite).any() else None,
                                 "wcsHeader": profile["wcsHeader"], "stretch": {"percentiles": [1, 99.7], "finiteCutsDN": [float(lo), float(hi)], "asinhScale": .1},
                                 "limits": "Own exact TAN WCS and nearest HiPS sampling; not the original CDS sampler, not repaired finite detector bands"})
        result_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"sourceTileCount": tile_count, "sourceBytes": result["sourceBytes"], "levels": result["levels"]}), flush=True)


if __name__ == "__main__":
    assert sys.argv[1:] == ["source-bound-trial"]
    geometry_check()
    materialize()
