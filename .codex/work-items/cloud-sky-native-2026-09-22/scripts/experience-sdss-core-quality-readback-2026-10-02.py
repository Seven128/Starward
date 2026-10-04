"""Offline completion of psField admission; preserve all once-only requests."""
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
TASK = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22"
BASE = ROOT / "output/sdss-m51-core-quality-inputs-1002-r1"
OUT = ROOT / "output/sdss-m51-core-quality-readback-1002-r1"
SOURCE = TASK / "scripts/experience-sdss-core-quality-inputs-2026-10-02.py"
spec = importlib.util.spec_from_file_location("core_quality_structural_reader", SOURCE)
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)


def main():
    OUT.mkdir(exist_ok=False)
    (OUT / "executed-script.py").write_bytes(Path(__file__).read_bytes())
    (OUT / "structural-reader.py").write_bytes(SOURCE.read_bytes())
    before = reader.inventory(BASE)
    acquisition = json.loads((BASE / "acquisition.json").read_bytes())
    records = []
    for item in acquisition["sourceFiles"]:
        raw = ROOT / item["raw"]["path"]
        assert reader.bind(raw) == item["raw"]
        if item["filename"].startswith("psField"):
            # Only cached bytes are re-inspected. The prior acquisition state
            # remains immutable and bound to its actual old executed script.
            result = reader.inspect_fits(raw.read_bytes(), item["filename"])
            reader.save(OUT / (item["filename"] + ".inspection.json"), result)
            inspection = reader.bind(OUT / (item["filename"] + ".inspection.json"))
            filters = result["actualPrimaryIdentity"]["FILTERS"].split()
            assert filters == list("ugriz")
            assert result["coreIdentityChecks"] == {"RUN": "MATCH", "CAMCOL": "MATCH", "FIELD": "MATCH"}
            eigen = [{**value, "bandFromActualPrimaryFiltersOrder": filters[value["hdu"] - 1]}
                     for value in result["detail"]["eigenimages"]]
            records.append({"filename": item["filename"], "raw": item["raw"],
                            "priorHTTPAcquisitionState": item["state"], "state": "FITS_STRUCTURE_CHECKED_OFFLINE",
                            "inspection": inspection, "eigenimages": eigen,
                            "actualPrimaryIdentity": result["actualPrimaryIdentity"],
                            "coreIdentityChecks": result["coreIdentityChecks"],
                            "psfReconstructed": False})
        else:
            assert item["state"] == "FITS_STRUCTURE_CHECKED" and item["gzipCompleteCrcAndLengthReadback"] is True
            assert reader.bind(ROOT / item["inspection"]["path"]) == item["inspection"]
            assert reader.bind(ROOT / item["decodedFits"]["path"]) == item["decodedFits"]
            records.append({"filename": item["filename"], "raw": item["raw"], "decodedFits": item["decodedFits"],
                            "state": "FITS_STRUCTURE_CHECKED_REUSED", "inspection": item["inspection"],
                            "actualPrimaryIdentity": item["actualPrimaryIdentity"], "coreIdentityChecks": item["coreIdentityChecks"]})
    after = reader.inventory(BASE)
    assert before == after
    preserved = json.loads((TASK / "tmp/resume-preserved-hashes-2026-10-01.json").read_bytes())
    assert all(reader.bind(ROOT / item["path"])["sha256"] == item["sha256"] for item in preserved)
    assets = reader.inventory(ROOT / "workers/miniapp-api/assets/deep-sky")
    assert assets == json.loads((ROOT / "output/sdss-m51-gri-mosaic-candidate-1002-r2/binding.json").read_bytes())["oldAssetsAfter"]
    reader.save(OUT / "readback.json", {"scope": "Cached readback only; complete structural admission, no additional request, no PSF reconstruction, span decoding or quality adoption",
                "script": reader.bind(Path(__file__)), "structuralReader": reader.bind(SOURCE),
                "acquisition": reader.bind(BASE / "acquisition.json"), "acquisitionBinding": reader.bind(BASE / "binding.json"),
                "caseCheckRepair": "Required column membership accepts FITS field-name case; actual mixed RNROW/RNCOL/RTYPE/RROWS are retained",
                "requestsInThisGeneration": 0, "sourceFiles": records, "checkedStructures": len(records),
                "knownRawBytes": sum(item["raw"]["bytes"] for item in records),
                "oldAcquisitionInventoryBefore": before, "oldAcquisitionInventoryAfter": after,
                "old201AssetsUnchanged": True, "sixPreservedUnchanged": True,
                "limits": "RERUN absent in all actual primaries; fpM FILTER/FILTERS absent. Canonical provenance supplies requested identities, not invented header facts."})
    reader.save(OUT / "binding.json", {"script": reader.bind(Path(__file__)), "structuralReader": reader.bind(SOURCE),
                                      "outputs": reader.inventory(OUT), "inputs": before})
    print(json.dumps({"readback": reader.bind(OUT / "readback.json"), "binding": reader.bind(OUT / "binding.json")}))


if __name__ == "__main__":
    main()
