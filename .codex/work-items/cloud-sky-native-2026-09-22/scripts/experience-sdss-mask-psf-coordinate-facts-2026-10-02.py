"""Offline factual addendum: follow actual reader entrypoints, no adoption.

Two standard polynomial expressions are compared numerically; no official or
pydl source is executed, compiled, installed or copied into an implementation.
"""
import gzip
import hashlib
import io
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "output/allwise-w3-atlas-0929/python-deps"))
import numpy as np
from astropy.io import fits

OUT = ROOT / "output/sdss-mask-psf-capability-independent-1002-r1"
SOURCE = ROOT / "output/sdss-m51-core-quality-inputs-1002-r1/sources"


def bind(path):
    data = path.read_bytes()
    return {"path": path.resolve().relative_to(ROOT).as_posix(), "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest()}


def main():
    assert not (OUT / "coordinate-addendum.json").exists()
    prior = json.loads((OUT / "result.json").read_text("utf-8"))
    mask_facts = {}
    source_bindings = []
    for band in "gri":
        path = SOURCE / f"fpM-003699-{band}6-0100.fit.gz"
        source_bindings.append(bind(path))
        raw = gzip.decompress(path.read_bytes())
        with fits.open(io.BytesIO(raw), memmap=False) as hdus:
            total, empty, unsorted, overlapping, touching = 0, 0, 0, 0, 0
            refcntr, offsets = set(), set()
            local_bounds_invalid = global_bounds_invalid = 0
            for hdu in hdus[1:11]:
                for row in hdu.data:
                    total += 1
                    refcntr.add(int(row["refcntr"]))
                    row0, col0 = int(row["row0"]), int(row["col0"])
                    offsets.add((row0, col0))
                    spans = np.frombuffer(np.asarray(row["s"]).tobytes(), dtype=">i2").reshape(-1, 3).astype(np.int64)
                    if len(spans) == 0:
                        empty += 1
                        continue
                    y, x1, x2 = spans.T
                    if len(spans) > 1:
                        same_y = y[1:] == y[:-1]
                        ordered = (y[1:] > y[:-1]) | (same_y & (x1[1:] > x1[:-1]))
                        unsorted += int(not np.all(ordered))
                        overlapping += int(np.count_nonzero(same_y & (x1[1:] <= x2[:-1])))
                        touching += int(np.count_nonzero(same_y & (x1[1:] == x2[:-1] + 1)))
                    nr, nc = int(hdus[0].header["MASKROWS"]), int(hdus[0].header["MASKCOLS"])
                    local_bounds_invalid += int(np.count_nonzero((y < 0) | (y >= nr) | (x1 < 0) | (x2 >= nc)))
                    global_bounds_invalid += int(np.count_nonzero((y + row0 < 0) | (y + row0 >= nr) | (x1 + col0 < 0) | (x2 + col0 >= nc)))
            mask_facts[band] = {"objectRows": total, "emptySpanObjectRows": empty,
                "referenceCounterValues": sorted(refcntr), "objectOffsets": [list(v) for v in sorted(offsets)],
                "unsortedObjects": unsorted, "overlappingAdjacentSpansWithinObject": overlapping,
                "touchingAdjacentSpansWithinObject": touching,
                "localOutOfFrameSpans": local_bounds_invalid, "globalOutOfFrameSpans": global_bounds_invalid}
    psf_path = SOURCE / "psField-003699-6-0100.fit"
    source_bindings.append(bind(psf_path))
    psf_facts = {}
    with fits.open(io.BytesIO(psf_path.read_bytes()), memmap=False) as hdus:
        for band in "gri":
            point = next(p for p in prior["coreGeometry"]["points"]
                         if p["identity"]["run"] == 3699 and p["identity"]["band"] == band)
            xpos, ypos = point["zeroBasedSourceXY"]
            rows = hdus["ugriz".index(band) + 1].data
            direct_weights, transposed_weights, no_half_weights = [], [], []
            shape = (int(rows[0]["RNROW"]), int(rows[0]["RNCOL"]))
            direct = np.zeros(shape, dtype=np.float64)
            transposed = np.zeros(shape, dtype=np.float64)
            for row in rows:
                nr, nc = int(row["nrow_b"]), int(row["ncol_b"])
                coefficients = np.asarray(row["c"], dtype=np.float64)
                values = np.asarray(row["RROWS"], dtype=np.float64).reshape(shape)
                # Documented mathematical expressions, independently evaluated
                # using explicit row/column power indices, not library owner.
                direct_weight = sum(coefficients[r, c] * ((ypos + .5) * .001) ** r * ((xpos + .5) * .001) ** c
                                    for r in range(nr) for c in range(nc))
                transposed_weight = sum(coefficients[c, r] * ((ypos + .5) * .001) ** r * ((xpos + .5) * .001) ** c
                                        for r in range(nr) for c in range(nc))
                no_half_weight = sum(coefficients[r, c] * (ypos * .001) ** r * (xpos * .001) ** c
                                     for r in range(nr) for c in range(nc))
                direct_weights.append(float(direct_weight))
                transposed_weights.append(float(transposed_weight))
                no_half_weights.append(float(no_half_weight))
                direct += values * direct_weight
                transposed += values * transposed_weight
            psf_facts[band] = {"zeroBasedSourceXY": [xpos, ypos],
                "declaredPhotoCoordinates": [xpos + .5, ypos + .5], "shapeRowColumn": list(shape),
                "RROW0": [int(r["RROW0"]) for r in rows], "RCOL0": [int(r["RCOL0"]) for r in rows],
                "directWireCRowPowerColumnPowerWeights": direct_weights,
                "transposedCWeights": transposed_weights, "directWithoutPhotoHalfOffsetWeights": no_half_weights,
                "directKernelSum": float(direct.sum()), "transposedKernelSum": float(transposed.sum()),
                "rawKernelMaximumAbsoluteDifference": float(np.max(np.abs(direct - transposed))),
                "unitIntegralKernelMaximumAbsoluteDifference": float(np.max(np.abs(direct / direct.sum() - transposed / transposed.sum()))),
                "directNegativeKernelSamples": int(np.count_nonzero(direct < 0)),
                "scope": "Only two declared arithmetic recipes compared; no measured-star PSF/absolute validation or quality adoption"}
    result = {
        "priorFullFormatResult": bind(OUT / "result.json"), "priorBinding": bind(OUT / "binding.json"),
        "sources": source_bindings, "actualMaskFacts": mask_facts, "actualCorePsfArithmeticComparison": psf_facts,
        "coordinateCorrection": {
            "reason": "Prior r1 referenced phRegionSetValFromObjmask, a different API. Complete standalone read_mask path governs mask raster offsets.",
            "entrypoint": "main_mask.c125 -> phMaskSetFromObjmask in phSpanUtil.c2854-2898",
            "globalSpanCoordinates": "row=span.y+object.row0; columns=span.x1/x2+object.col0; target array subtracts targetMask.row0/col0",
            "bbox": "Table bbox is local SPAN extrema; global bbox applies object offset once",
            "raster": "Inclusive endpoints, clip to target mask and OR all object/plane contributions; reference count is memory bookkeeping",
            "actualInputScope": "All current object offsets zero; no empty-span object, so nonzero/empty synthetic controls are still necessary at a future decoder owner"},
        "emptyObjectFacts": {
            "phObjmaskNew": "phSpanUtil.c53-73 initializes nspan0, bbox0, npix-1, refcntr1; not a serialized empty-object uniqueness guarantee",
            "phObjmaskBBSet": "phSpanUtil.c413-441 sets npix0 for empty and updates bbox only if nspan>0",
            "implication": "No unique meaningful empty-object bbox can be required from these functions; absence of objects is NAXIS2=0 in actual data",
            "actual": "All actual object rows nonempty; no scientific good/empty-source inference"},
        "psfAxisConclusion": {
            "wire": "Astropy c equals raw BE25float C-order5x5 bitwise, including inactive padding NaNs; no automatic transpose",
            "officialEntry": "main_PSF.c61 assigns rowc=argument3,colc=argument4, c104 forwards in that order",
            "officialFormula": "variablePsf.c1084-1093 and direct wire copy read.c430 evaluate C[rowPower,columnPower] times (rowc*.001)^rowPower (colc*.001)^columnPower",
            "pydlDifference": "pydl source96,105-106 uses outer(ypos+.5,xpos+.5).T with Astropy c, reversing these axes; same source applies row0 orders despite docs allowing varying rows",
            "decisionBoundary": "Use documented official wire/row-column formula for independently implemented bounded trial, explicit per-row orders and basis count. Pydl is not an exact orientation oracle here.",
            "photoOrigin": "Interface zero-based array x/y -> PHOTO row/column +.5; TAN approximation/full asTrans absolute precision remains unverified",
            "kernelOrigin": "RROW0/RCOL0 belong to eigenimage region, not full-frame sky coordinates. Actual all zero and51x51; center25,25, no subpixel shift. Non-square/origin variation not proven by actual square input",
            "signedBasis": "Keep all signed basis values and full linear combination; no positive clip or per-basis normalization"},
        "codeRights": "Official archive component geometry.c contains AT&T permission, no whole-bundle grant found. Unknown/GPL code not copied, adopted, executed, installed or compiled; only standard file-format facts researched.",
        "references": ["https://www.sdss4.org/dr17/imaging/images/", "https://data.sdss.org/datamodel/files/PHOTO_REDUX/RERUN/RUN/objcs/CAMCOL/psField.html", "https://data.sdss.org/datamodel/files/PHOTO_REDUX/RERUN/RUN/objcs/CAMCOL/fpM.html", "https://pydl.readthedocs.io/en/latest/_modules/pydl/photoop/image.html", "https://pydl.readthedocs.io/en/latest/licenses.html"],
        "networkRequests": 0, "sharedOwnerOrQualityDecoderImplemented": False}
    path = OUT / "coordinate-addendum.json"
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    closure = {"script": bind(Path(__file__)), "addendum": bind(path), "referencesFromPriorArchive": bind(OUT / "reference/readAtlasImages-v5_4_11.tar.gz")}
    (OUT / "coordinate-addendum-binding.json").write_text(json.dumps(closure, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(closure, indent=2))


if __name__ == "__main__":
    main()
