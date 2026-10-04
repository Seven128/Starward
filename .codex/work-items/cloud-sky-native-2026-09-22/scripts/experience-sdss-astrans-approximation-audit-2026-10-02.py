"""Read-only numerical comparison of existing primary TAN and retained asTrans.

This is a diagnostic at declared colour/origin assumptions, not an adopted
astrometric adapter or an absolute accuracy certificate. No network/asset edit.
"""
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT / "output/allwise-w3-atlas-0929/python-deps"),
               str(ROOT / "data-pipelines/deep-sky")]
import numpy as np
from astropy.coordinates import SkyCoord
from sdss_corrected_frame import read_cached_frame
from image_quality import digest, write_report


def binding(path):
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw), "sha256": digest(raw)}


def retained_solution(row, native_x, native_y, *, origin_offset, color, swap=False):
    # Official SDSS equations call frame row x and column y. NumPy/FITS source
    # coordinates supplied here use x=column, y=row. The official page notes
    # integer *edges* in objc_rowc/objc_colc; alternative offsets are retained
    # separately, not inferred from this diagnostic's best-looking residual.
    x, y = native_y + origin_offset, native_x + origin_offset
    if swap:
        x, y = y, x
    dx = sum(row[f"DROW{k}"] * y ** k for k in range(4))
    dy = sum(row[f"DCOL{k}"] * y ** k for k in range(4))
    if color < row["RICUT"]:
        dx, dy = dx + row["CSROW"] * color, dy + row["CSCOL"] * color
    else:
        dx, dy = dx + row["CCROW"], dy + row["CCCOL"]
    xx, yy = x + dx, y + dy
    mu = np.deg2rad(row["A"] + row["B"] * xx + row["C"] * yy - row["NODE"])
    nu, inc = np.deg2rad(row["D"] + row["E"] * xx + row["F"] * yy), np.deg2rad(row["INCL"])
    numerator = np.sin(mu) * np.cos(nu) * np.cos(inc) - np.sin(nu) * np.sin(inc)
    denominator = np.cos(mu) * np.cos(nu)
    ra = (np.rad2deg(np.arctan2(numerator, denominator)) + row["NODE"]) % 360
    dec = np.rad2deg(np.arcsin(np.clip(np.sin(mu) * np.cos(nu) * np.sin(inc) + np.sin(nu) * np.cos(inc), -1, 1)))
    return ra, dec


def stats(values):
    return {"samples": values.size, "minArcsec": float(values.min()),
            "medianArcsec": float(np.median(values)), "p95Arcsec": float(np.percentile(values, 95)),
            "maxArcsec": float(values.max())}


def main():
    output = ROOT / "output/sdss-astrans-approximation-audit-1002"
    if output.exists():
        raise RuntimeError("preserve_existing_diagnostic_generation")
    source_dir = ROOT / "output/sdss-corrected-m51-1002/sources"
    receipt_files = [ROOT / "output/sdss-corrected-m51-1002" / name for name in
                     ("frame-acquisition.json", "field-r-acquisition.json", "field-gi-acquisition.json")]
    records = [item for path in receipt_files for item in json.loads(path.read_bytes())["sourceFiles"]
               if (item["identity"]["run"], item["identity"]["camcol"]) != (3716, 5)]
    if len(records) != 18 or len({item["path"] for item in records}) != 18:
        raise RuntimeError("actual_six_complete_fields_required")
    output.mkdir()
    y, x = np.mgrid[0:1488:13j, 0:2047:17j]
    results = []
    for item in records:
        source = source_dir / item["path"]
        expected = {**item["identity"], "bytes": item["bytes"], "sha256": item["sha256"], "sourceUrl": item["url"]}
        frame = read_cached_frame(source, expected=expected, max_uncompressed_bytes=32 * 1024 * 1024)
        row = frame.receipt["asTrans"]["row"]
        tan_ra, tan_dec = frame.wcs.all_pix2world(x, y, 0)
        tan = SkyCoord(ra=tan_ra, dec=tan_dec, unit="deg", frame="icrs")
        cases = []
        for offset in (0, .5, 1):
            for color in (0, 1, 2):
                ra, dec = retained_solution(row, x, y, origin_offset=offset, color=color)
                distance = tan.separation(SkyCoord(ra=ra, dec=dec, unit="deg", frame="icrs")).arcsec
                cases.append({"originOffsetSourcePixels": offset, "assumedColor": color,
                              "colorMeaning": "g-r for g; r-i for r/i; declared diagnostic, no measured per-pixel colour",
                              "dcrBranch": "linear" if color < row["RICUT"] else "constant", **stats(distance)})
        ra, dec = retained_solution(row, x, y, origin_offset=.5, color=0, swap=True)
        wrong = tan.separation(SkyCoord(ra=ra, dec=dec, unit="deg", frame="icrs")).arcsec
        results.append({"source": binding(source), "identity": item["identity"], "gridSourceColumnRowShape": [17, 13],
                        "retainedAsTrans": row, "comparison": cases,
                        "deliberateSwappedAxesCounterexample": stats(wrong),
                        "receiptCalibrationErrorsArcsec": {"mu": row["MUERR"], "nu": row["NUERR"]}})
    report = {"scope": "Read-only declared-assumption numerical primary TAN/asTrans diagnostic; no adoption or absolute astrometry certification",
              "officialSource": "https://www.sdss4.org/dr17/algorithms/astrometry/",
              "equations": "cubic column optical distortion + band-specific color DCR + affine great-circle + quadrant-safe J2000 rotation",
              "inputs": [binding(path) for path in receipt_files],
              "owners": [binding(ROOT / "data-pipelines/deep-sky/sdss_corrected_frame.py"), binding(Path(__file__).resolve())],
              "results": results,
              "limitations": ["Declared colours 0/1/2 are diagnostic assumptions, not actual extended-source pixel colours.",
                              "Offsets 0/.5/1 stay separate; selecting the smallest residual would not validate the native coordinate convention.",
                              "Source primary TAN is compared to metadata equations, not independent measured celestial truth.",
                              "This diagnostic does not mutate admission, current mosaic/source WCS, science arrays, encoded images or published identity.",
                              "Full astrometry, DCR for diffuse colour, detector validity, PSF/noise and display quality remain unverified."]}
    write_report(output / "audit.json", report)
    print(json.dumps({"files": len(results), "output": str(output / "audit.json"),
                      "declaredHalfPixelColorZeroMaxArcsec": max(case["maxArcsec"] for row in results for case in row["comparison"]
                                                                if case["originOffsetSourcePixels"] == .5 and case["assumedColor"] == 0)}))


if __name__ == "__main__":
    main()
