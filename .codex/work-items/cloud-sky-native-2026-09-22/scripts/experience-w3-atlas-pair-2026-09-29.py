"""One same-survey intensity/coverage pair for M42; task-only source evidence."""
from pathlib import Path
import hashlib
import io
import json
import sys
import urllib.parse

ROOT = Path(__file__).resolve().parents[4]
OUTPUT = ROOT / "output/allwise-w3-atlas-0929"
sys.path.insert(0, str(OUTPUT / "python-deps"))
from astropy.io import fits
from astropy.table import Table
from astropy.wcs import WCS
import numpy as np
from PIL import Image
from importlib.util import spec_from_file_location, module_from_spec

spec = spec_from_file_location("source_query", Path(__file__).with_name("experience-w3-atlas-input-2026-09-29.py"))
query_module = module_from_spec(spec)
spec.loader.exec_module(query_module)


def main():
    tag = "r2" if sys.argv[1:] == ["r2"] else ""
    assert not sys.argv[1:] or tag == "r2"
    result_path = OUTPUT / ("pair-result-r2.json" if tag else "pair-result.json")
    assert not result_path.exists(), "preserve_previous_pair_trial"
    rows = Table.read(OUTPUT / "atlas-metadata.tbl", format="ascii.ipac")
    assert len(rows) == 1 and rows[0]["band"] == 3
    coadd = str(rows[0]["coadd_id"])
    assert coadd == "0835m061_ac51"
    result = {"scope": "One 512 native-pixel M42 AllWISE W3 pair; not a published JPEG validity mask", "coadd": coadd, "files": []}
    images = {}
    headers = {}
    for product in ["int", "cov"]:
        basename = f"{coadd}-w3-{product}-3.fits" + (".gz" if tag and product == "cov" else "")
        if tag:
            # The actual official directory names COV as .fits.gz; do not infer
            # an uncompressed sibling from the documentation's generic name.
            directory = (OUTPUT / "atlas-directory.html").read_text(encoding="utf-8")
            assert f'href="{basename}"' in directory, "source_product_not_listed"
        query = urllib.parse.urlencode({"center": "83.818666666667,-5.389666666667deg", "size": "512pix", "gzip": "false"})
        url = f"https://irsa.ipac.caltech.edu/ibe/data/wise/allwise/p3am_cdd/{coadd[:2]}/{coadd[:4]}/{coadd}/{basename}?{query}"
        metadata = {"product": product, "url": url}
        try:
            print(f"M42 Atlas: one {product} cutout request", flush=True)
            raw = query_module.fetch(url, 1_500_000)
            # Retain received bytes even if a diagnostic assertion is wrong.
            (OUTPUT / f"m42-{product}.fits").write_bytes(raw)
            with fits.open(io.BytesIO(raw), memmap=False) as hdus:
                hdus.verify("exception")
                hdu = hdus[0]
                # IBE chooses inclusive rounded endpoints: size=512pix can
                # return 513 samples. The service header is authoritative.
                assert hdu.data.ndim == 2 and max(hdu.data.shape) <= (513 if tag else 512), f"unexpected_shape: {hdu.data.shape}"
                images[product] = np.array(hdu.data, copy=True)
                headers[product] = hdu.header.copy()
                metadata.update(shape=list(hdu.data.shape), bitpix=hdu.header["BITPIX"])
            metadata.update(state="RECEIVED", bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())
        except Exception as error:
            metadata.update(state="UNAVAILABLE", error=f"{type(error).__name__}: {error}")
        result["files"].append(metadata)
        result_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    if set(images) != {"int", "cov"}:
        raise RuntimeError("source_pair_incomplete; preserve independent successful input, no automatic retry")
    intensity, coverage = images["int"], images["cov"]
    assert intensity.shape == coverage.shape
    for keyword in ["CTYPE1", "CTYPE2", "CRPIX1", "CRPIX2", "CRVAL1", "CRVAL2", "CDELT1", "CDELT2"]:
        assert headers["int"][keyword] == headers["cov"][keyword], f"pair WCS differs: {keyword}"
    nan = ~np.isfinite(intensity)
    cov_zero = coverage == 0
    result["nativeSourceSamples"] = {
        "pixels": int(intensity.size), "nonfiniteIntensity": int(nan.sum()),
        "zeroCoverage": int(cov_zero.sum()), "nonfiniteIntensityWithZeroCoverage": int((nan & cov_zero).sum()),
        "lowCoverageAtMostFour": int((coverage <= 4).sum()),
        "finiteIntensityRange": [float(np.nanmin(intensity)), float(np.nanmax(intensity))],
        "coverageRange": [float(np.nanmin(coverage)), float(np.nanmax(coverage))],
    }
    manifest = json.loads((ROOT / "workers/miniapp-api/assets/deep-sky/manifest.json").read_text(encoding="utf-8"))
    entry = next(row for row in manifest["entries"] if row["objectRef"] == "M:42")
    asset = entry["levels"]["DETAIL"]
    jpeg_raw = (ROOT / "workers/miniapp-api/assets/deep-sky" / asset["file"]).read_bytes()
    assert hashlib.sha256(jpeg_raw).hexdigest() == asset["sha256"]
    jpeg = np.asarray(Image.open(io.BytesIO(jpeg_raw)).convert("L"))
    # CDS cutout geometry is the existing measured M31 WCS convention. This
    # independently returned Atlas pair is NOT a matching CDS cutout header.
    n = asset["pixels"]
    cutout_wcs = WCS(naxis=2)
    cutout_wcs.wcs.ctype = ["RA---TAN", "DEC--TAN"]
    cutout_wcs.wcs.crval = [entry["center"]["raDeg"], entry["center"]["decDeg"]]
    cutout_wcs.wcs.crpix = [n / 2, n / 2]
    step = 2 * np.tan(np.deg2rad(asset["fieldDegrees"]) / 2) / n
    cutout_wcs.wcs.cdelt = np.rad2deg([-step, step])
    y, x = np.mgrid[0:n, 0:n]
    ra, dec = cutout_wcs.all_pix2world(x, n - 1 - y, 0)
    atlas_x, atlas_y = WCS(headers["int"]).all_world2pix(ra, dec, 0)
    ix, iy = np.rint(atlas_x).astype(int), np.rint(atlas_y).astype(int)
    inside = (ix >= 0) & (iy >= 0) & (ix < intensity.shape[1]) & (iy < intensity.shape[0])
    target_nan = np.zeros(jpeg.shape, dtype=bool)
    target_cov_zero = np.zeros(jpeg.shape, dtype=bool)
    target_nan[inside] = nan[iy[inside], ix[inside]]
    target_cov_zero[inside] = cov_zero[iy[inside], ix[inside]]
    result["publishedJpegComparison"] = {
        "sourceHash": asset["sha256"], "sourceFieldDegrees": asset["fieldDegrees"],
        "geometryBasis": "Existing CDS TAN half-pixel convention; direct Atlas WCS, nearest native sample",
        "sampledJpegPixels": int(inside.sum()), "mappedNonfiniteIntensity": int(target_nan.sum()),
        "mappedZeroCoverage": int(target_cov_zero.sum()),
        "jpegAtMappedNonfinite": {"median": float(np.median(jpeg[target_nan])), "maximum": int(jpeg[target_nan].max())} if target_nan.any() else None,
        "limits": "One central native patch; nearest sampling does not establish exact HiPS resampling, all JPEG validity, absolute source astrometry or phone registration",
    }
    display = np.zeros((*intensity.shape, 3), dtype=np.uint8)
    lo, hi = np.nanpercentile(intensity, [1, 99.7])
    scaled = np.nan_to_num(np.arcsinh(np.maximum(intensity - lo, 0) / (hi - lo) * 10) / np.arcsinh(10))
    gray = (np.clip(scaled, 0, 1) * 255).astype(np.uint8)
    display[:] = gray[..., None]
    display[nan & cov_zero] = [255, 0, 255]
    Image.fromarray(display[::-1]).save(OUTPUT / "m42-atlas-intensity-coverage-diagnostic.png")
    comparison = np.repeat(jpeg[..., None], 3, axis=2)
    comparison[target_nan & target_cov_zero] = [255, 0, 255]
    Image.fromarray(comparison).save(OUTPUT / "m42-jpeg-source-samples-diagnostic.png")
    result["wcsHeader"] = {k: headers["int"].get(k) for k in ["CTYPE1", "CTYPE2", "CRPIX1", "CRPIX2", "CRVAL1", "CRVAL2", "CDELT1", "CDELT2", "CROTA2"]}
    result_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result))


if __name__ == "__main__":
    main()
