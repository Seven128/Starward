"""Project admitted source flags and spatial PSF into the frozen real M51 mosaic.

Only diagnostics: no requests, edits to science/weights/display/publication, or
automatic good/bad interpretation of processing flags. Source support, finite
measurements, processing flags and display alpha retain separate meanings.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22"
sys.path[:0] = [str(ROOT / "data-pipelines/deep-sky"),
               str(ROOT / "output/allwise-w3-atlas-0929/python-deps")]
import numpy as np
from sdss_corrected_frame import read_cached_frame
from sdss_frame_quality import check_frame_quality, read_cached_fpm, read_cached_psfield
from sdss_gri_tan import bilinear_samples, target_tan

spec = importlib.util.spec_from_file_location("core_quality_diagnostic_helpers",
    TASK / "scripts/experience-sdss-core-quality-diagnosis-2026-10-02.py")
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
bound, save, inventory = helper.bound, helper.save, helper.inventory
array_identity, save_array = helper.array_identity, helper.save_array
flag_counts, kernel_summary = helper.flag_counts, helper.kernel_summary
BANDS = ("g", "r", "i")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    output = args.output.resolve()
    if output.exists() or not output.is_relative_to((ROOT / "output").resolve()):
        raise RuntimeError("exclusive_workspace_output_required")
    candidate_path = ROOT / "output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json"
    assert bound(candidate_path)["sha256"] == "73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52"
    acquisitions = [
        (ROOT / "output/sdss-m51-core-quality-inputs-1002-r1/acquisition.json",
         "5b4d5e73c52bf1613412ba948ae5d2046a38f7991bd54dc353298fe9e1686eb8"),
        (ROOT / "output/sdss-contributing-quality-inputs-1002-r1/acquisition.json",
         "901b671c84da7799c85f092c3a15652fc1e7eb37e508e56863a2d961d463ff31")]
    sources = {}
    for path, sha in acquisitions:
        assert bound(path)["sha256"] == sha
        for entry in json.loads(path.read_bytes())["sourceFiles"]:
            assert entry["httpStatus"] == 200 and entry["rawTransferComplete"]
            assert entry["actualFinalUrl"] == entry["url"]
            assert entry["filename"] not in sources
            sources[entry["filename"]] = entry
    assert len(sources) == 24
    candidate = json.loads(candidate_path.read_bytes())
    n = candidate["pixels"]
    assert n == 2048 and candidate["mosaic"]["fieldCount"] == 6
    # Reuse the actual candidate construction parameters. FITS-card decimal
    # serialization rounds CDELT, so rereading its summary is not byte-exact
    # replay of the original double-precision target.
    target = target_tan(candidate["center"], n, candidate["fieldDegrees"])
    assert dict(target.to_header()) == candidate["wcsHeader"]
    assert target.wcs.radesys == "ICRS"
    owners = [ROOT / "data-pipelines/deep-sky" / name for name in (
        "sdss_frame_quality.py", "sdss_source_stencil.py", "sdss_corrected_frame.py", "sdss_gri_tan.py")]
    owner_before = [bound(path) for path in owners]
    assert owner_before[0]["sha256"] == "0e450d57d13baa31d1029a6e66435d2dcdd420e866ffe1633b8c3f1ecb02bbeb"
    old_assets = inventory(ROOT / "workers/miniapp-api/assets/deep-sky")
    assert len(old_assets) == 201
    preserved = json.loads((TASK / "tmp/resume-preserved-hashes-2026-10-01.json").read_bytes())
    assert all(bound(ROOT / r["path"])["sha256"] == r["sha256"] for r in preserved)
    frozen_candidate = inventory(candidate_path.parent)
    frozen_quality = [bound(ROOT / r["raw"]["path"]) for r in sources.values()]
    frozen_science = [bound(Path(f["perBand"][b]["sourceReceipt"]["source"]["path"]))
        for f in candidate["mosaic"]["fields"] for b in BANDS]
    output.mkdir(parents=True)
    (output / "executed-script.py").write_bytes(Path(__file__).read_bytes())
    save(output / "started.json", {"scope": __doc__, "owners": owner_before,
        "candidate": bound(candidate_path), "acquisitions": [bound(p) for p, _ in acquisitions], "requests": 0})
    yy, xx = np.mgrid[0:n, 0:n]
    ra, dec = target.all_pix2world(xx, n - 1 - yy, 0)
    union_flags = {band: np.zeros((n, n), dtype=np.uint16) for band in BANDS}
    contributor_count = np.zeros((n, n), dtype=np.uint32)
    weight_sum = np.zeros((n, n), dtype=np.float64)
    crop = {level: tuple(slice(v["masterCrop"]["boundsXYExclusive"][i],
                                 v["masterCrop"]["boundsXYExclusive"][i + 2])
                         for i in (1, 0)) for level, v in candidate["levels"].items()}
    grid = np.rint(np.linspace(0, n - 1, 17)).astype(int)
    field_results = []
    enums = {}

    def quality_input(filename, identity, band=None):
        r = sources[filename]
        path = ROOT / r["raw"]["path"]
        assert bound(path) == r["raw"]
        # The original core acquisition's exact identity was fixed by its
        # task, while the later batch persists it per file. Both bind to the
        # actual candidate field and strict filename/URL/header admission.
        expected_identity = {**identity, **({"band": band} if band else {})}
        if "identity" in r:
            assert r["identity"] == expected_identity
        return path, {**expected_identity, "bytes": r["bytes"], "sha256": r["sha256"], "sourceUrl": r["url"]}

    def frozen_array(record):
        path = candidate_path.parent / record["file"]
        actual = bound(path)
        assert actual["bytes"] == record["bytes"] and actual["sha256"] == record["sha256"]
        return np.load(path, allow_pickle=False, mmap_mode="r")

    for f in candidate["mosaic"]["fields"]:
        name, identity = f["fieldKey"], f["identity"]
        run, field, camcol = identity["run"], identity["field"], identity["camcol"]
        print(json.dumps({"phase": "field", "fieldKey": name}), flush=True)
        diagnostics = candidate["mosaic"]["diagnostics"][name]
        weight = frozen_array(diagnostics["normalized-weight"])
        active = weight > 0
        assert active.sum() == f["jointAvailablePixels"]
        contributor_count += active.astype(np.uint32)
        weight_sum += weight
        ps_path, ps_expected = quality_input(f"psField-{run:06d}-{camcol}-{field:04d}.fit", identity)
        psf = read_cached_psfield(ps_path, ps_expected, max_uncompressed_bytes=16 * 1024 * 1024)
        band_results = {}
        coherent = np.ones((n, n), dtype=np.bool_)
        for band in BANDS:
            fr = f["perBand"][band]["sourceReceipt"]
            source = fr["source"]
            frame_path = Path(source["path"])
            expected = {**fr["identity"], "bytes": source["bytes"], "sha256": source["sha256"], "sourceUrl": source["sourceUrl"]}
            frame = read_cached_frame(frame_path, expected, max_uncompressed_bytes=32 * 1024 * 1024)
            science_before = array_identity(frame.data)
            mask_path, mask_expected = quality_input(f"fpM-{run:06d}-{band}{camcol}-{field:04d}.fit.gz", identity, band)
            mask = read_cached_fpm(mask_path, mask_expected, max_uncompressed_bytes=16 * 1024 * 1024)
            association = check_frame_quality(frame, psf, mask)
            sx, sy = frame.wcs.all_world2pix(ra, dec, 0)
            fresh, geometry, finite = bilinear_samples(frame.data, sx, sy)
            sampled = mask.stencil(sx, sy)
            assert np.array_equal(sampled.geometry, geometry)
            old_science = frozen_array(diagnostics[f"{band}-science"])
            assert fresh.tobytes() == old_science.tobytes()
            assert np.array_equal(geometry, frozen_array(diagnostics[f"{band}-footprint"]))
            assert np.array_equal(finite, frozen_array(diagnostics[f"{band}-finite-neighbors"]))
            coherent &= geometry & finite
            assert np.all(~active | (geometry & finite))
            union_flags[band][active] |= sampled.flags[active]
            enums[band] = dict(mask.enum)
            psf_samples = []
            # Only actual, coherent positive-weight field locations. This is
            # sparse spatial diagnosis, not a continuously matched mosaic PSF.
            for ty in grid:
                for tx in grid:
                    if active[ty, tx]:
                        kernel = psf.reconstruct(band, float(sx[ty, tx]), float(sy[ty, tx]))
                        psf_samples.append({"targetColumnRow": [int(tx), int(ty)],
                            "sourceColumnRow": [float(sx[ty, tx]), float(sy[ty, tx])], **kernel_summary(kernel)})
            center_x, center_y = frame.wcs.all_world2pix(candidate["center"]["raDeg"], candidate["center"]["decDeg"], 0)
            center_stencil = mask.stencil(np.asarray(center_x), np.asarray(center_y))
            center_record = {"sourceColumnRow": [float(center_x), float(center_y)],
                             "completeSourceStencil": bool(center_stencil.geometry)}
            if center_stencil.geometry:
                center_record.update(stencilFlags=int(center_stencil.flags),
                    psf=kernel_summary(psf.reconstruct(band, float(center_x), float(center_y))))
            band_results[band] = {"association": association, "correctedSource": bound(frame_path),
                "maskSource": bound(mask_path), "nativeFlags": array_identity(mask.flags),
                "geometryPixels": int(geometry.sum()), "finiteAvailablePixels": int(finite.sum()),
                "scienceBytesEqualFrozenField": True, "stencilMasksEqualFrozenField": True,
                "projectedFlags": save_array(output / f"{name.replace('/', '-')}-{band}-flags.npy", sampled.flags),
                "enum": dict(mask.enum),
                "nativePlanePixels": flag_counts(mask.flags, np.ones(mask.flags.shape, dtype=np.bool_), mask.enum),
                "activePlanePixels": flag_counts(sampled.flags, active, mask.enum),
                "levels": {level: {"activeCoherentPixels": int(active[c].sum()),
                    "activePlanePixels": flag_counts(sampled.flags[c], active[c], mask.enum),
                    "weightedFlagContribution": {p: float(np.sum(weight[c][active[c] & ((sampled.flags[c] & (1 << bit)) != 0)], dtype=np.float64))
                        for p, bit in mask.enum.items() if bit < 10}}
                    for level, c in crop.items()},
                "center": center_record, "spatialPsfSamples": psf_samples,
                "scienceArrayUnchanged": array_identity(frame.data) == science_before}
            assert band_results[band]["scienceArrayUnchanged"]
            del frame, fresh, old_science, sampled, mask, sx, sy
        assert np.array_equal(coherent, active)
        field_results.append({"fieldKey": name, "identity": identity, "activePixels": int(active.sum()),
            "psfSource": bound(ps_path), "psfActualIdentity": psf.receipt["actualPrimaryIdentity"],
            "psfDescription": psf.receipt["psf"], "bands": band_results})
        save(output / f"{name.replace('/', '-')}.result.json", field_results[-1])
        del psf, coherent, active, weight
    frozen_contributors = frozen_array(candidate["mosaic"]["contributorCount"])
    assert np.array_equal(contributor_count, frozen_contributors)
    available = frozen_array(candidate["arrays"]["joint-availability"])
    assert np.array_equal(weight_sum > 0, available) and available.all()
    assert np.max(np.abs(weight_sum - 1)) <= 1e-7
    save_arrays = {b: save_array(output / f"mosaic-{b}-contributor-union-flags.npy", flags)
                   for b, flags in union_flags.items()}
    aggregate = {level: {"nativeMasterCropPixels": int(available[c].size),
        "allAvailablePixels": int(available[c].sum()),
        "singleContributorPixels": int((contributor_count[c] == 1).sum()),
        "overlapPixels": int((contributor_count[c] > 1).sum()),
        "bands": {b: flag_counts(union_flags[b][c], available[c], enums[b]) for b in BANDS}}
        for level, c in crop.items()}
    assert owner_before == [bound(p) for p in owners]
    assert frozen_candidate == inventory(candidate_path.parent)
    assert frozen_quality == [bound(ROOT / r["raw"]["path"]) for r in sources.values()]
    assert frozen_science == [bound(Path(f["perBand"][b]["sourceReceipt"]["source"]["path"]))
        for f in candidate["mosaic"]["fields"] for b in BANDS]
    assert old_assets == inventory(ROOT / "workers/miniapp-api/assets/deep-sky")
    assert all(bound(ROOT / r["path"])["sha256"] == r["sha256"] for r in preserved)
    result = {"scope": __doc__, "candidate": bound(candidate_path), "fields": field_results,
        "target": {"pixels": n, "wcsHeader": dict(target.to_header()), "orientation": "north-up/east-left",
                   "exactConstruction": {"center": candidate["center"], "fieldDegrees": candidate["fieldDegrees"]}},
        "all18ScienceAndStencilArraysEqualFrozenMosaicFields": True,
        "coherentFieldWeightsAndContributorCountUnchanged": True,
        "weightSumMaximumAbsoluteErrorFromOne": float(np.max(np.abs(weight_sum - 1))),
        "projectedFlagArrays": save_arrays, "levels": aggregate,
        "flagUnionMeaning": "Bitwise union only from actual positive-weight coherent source contributors. It does not reject science or determine final display alpha.",
        "scientificQuality": "UNKNOWN", "wholeImageQuality": "UNVERIFIED", "requests": 0,
        "protectedInputsUnchanged": True,
        "limitations": ["Retained primary TAN approximation; no full asTrans/absolute astrometric validation.",
            "Processing labels do not establish missing astronomical flux or a rejection/weight policy.",
            "Spatial signed relative PSF samples do not validate stellar PSF accuracy or matched coadd resolution.",
            "Counts refer to exact source-master crops, not downsampled OV/MED output pixels.",
            "No science/weight/display correction, image output, publication adoption or native acceptance."]}
    save(output / "result.json", result)
    save(output / "binding.json", {"script": bound(Path(__file__)), "helper": bound(Path(helper.__file__)),
        "ownersBefore": owner_before, "ownersAfter": [bound(p) for p in owners],
        "candidateBefore": frozen_candidate, "qualityInputs": frozen_quality, "scienceInputs": frozen_science,
        "published201Before": old_assets, "sixPreserved": preserved,
        "outputsBeforeBinding": inventory(output), "acquisitions": [bound(p) for p, _ in acquisitions]})
    print(json.dumps({"phase": "done", "result": bound(output / "result.json"), "binding": bound(output / "binding.json")}), flush=True)


if __name__ == "__main__":
    main()
