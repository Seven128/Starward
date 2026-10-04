"""One new-hash wrong-band association fixture; no source or owner edits."""
import gzip
import hashlib
import io
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[4]
sys.path[:0] = [str(ROOT / "data-pipelines/deep-sky"), str(ROOT / "output/allwise-w3-atlas-0929/python-deps")]
from astropy.io import fits
from sdss_corrected_frame import read_cached_frame
from sdss_frame_quality import read_cached_fpm, read_cached_psfield, check_frame_quality

OUT = ROOT / "output/sdss-m51-core-quality-independent-1002-r2"
MAIN = ROOT / "output/sdss-m51-core-quality-independent-1002-r1"
AUTHOR = ROOT / "output/sdss-m51-core-quality-diagnosis-1002-r1"
RAW = ROOT / "output/sdss-m51-core-quality-inputs-1002-r1"
CORE = {"run": 3699, "rerun": "301", "camcol": 6, "field": 100}


def bind(path):
    data = path.read_bytes()
    return {"path": path.resolve().relative_to(ROOT).as_posix(), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def main():
    assert not OUT.exists()
    primary_review = bind(MAIN / "review.json")
    assert primary_review["sha256"] == "00a66c14f8dd5322407756c36b32f7825aa46e413045eabe5089f1e69239ee81"
    author = json.loads((AUTHOR / "result.json").read_text("utf-8"))
    frozen = json.loads((AUTHOR / "binding.json").read_text("utf-8"))["owners"]
    original_path = RAW / "sources/fpM-003699-g6-0100.fit.gz"
    original = bind(original_path)
    assert original["sha256"] == "de27f43803c187f70021be90754654bf6f39ba9a5291a5242032727dd3e47952"
    for entry in frozen:
        assert bind(ROOT / entry["path"]) == entry
    with fits.open(io.BytesIO(gzip.decompress(original_path.read_bytes())), memmap=False) as hdus:
        hdus[0].header["FILTER"] = "r"
        stream = io.BytesIO()
        hdus.writeto(stream)
    changed = gzip.compress(stream.getvalue(), mtime=0)
    OUT.mkdir()
    fixture = OUT / "fpM-003699-r6-0100.fit.gz"
    fixture.write_bytes(changed)
    expected = {**CORE, "band": "r", "bytes": len(changed), "sha256": hashlib.sha256(changed).hexdigest(),
                "sourceUrl": "https://data.sdss.org/sas/dr17/eboss/photo/redux/301/3699/objcs/6/" + fixture.name}
    limit = 16 * 1024 * 1024
    mask = read_cached_fpm(fixture, expected, max_uncompressed_bytes=limit)
    ps_source = author["psfReceipt"]["source"]
    ps = read_cached_psfield(ROOT / "output/sdss-m51-core-quality-inputs-1002-r1/sources/psField-003699-6-0100.fit",
        {**CORE, "bytes": ps_source["bytes"], "sha256": ps_source["sha256"], "sourceUrl": ps_source["sourceUrl"]}, max_uncompressed_bytes=limit)
    source = author["bands"]["g"]["correctedReceipt"]["source"]
    frame_path = ROOT / author["bands"]["g"]["correctedSource"]["path"]
    frame = read_cached_frame(frame_path,
        {**CORE, "band": "g", "bytes": source["bytes"], "sha256": source["sha256"], "sourceUrl": source["sourceUrl"]},
        max_uncompressed_bytes=32 * 1024 * 1024)
    science_before = hashlib.sha256(frame.data.tobytes()).hexdigest()
    try:
        check_frame_quality(frame, ps, mask)
    except RuntimeError as error:
        assert str(error) == "sdss_quality_correlation_identity_mismatch"
        reason = str(error)
    else:
        raise AssertionError("new-hash wrong-band input incorrectly associated")
    assert hashlib.sha256(frame.data.tobytes()).hexdigest() == science_before
    assert bind(original_path) == original
    for entry in frozen:
        assert bind(ROOT / entry["path"]) == entry
    result = {"scope": "Bounded true new-hash standalone-admitted wrong-band fixture reaches correlation boundary; no network or scientific adoption",
        "primaryReview": primary_review, "owner": frozen[0], "original": original, "fixture": bind(fixture),
        "newExpectedBinding": expected, "actualAdmittedHeaderFilter": mask.receipt["actualPrimaryIdentity"]["FILTER"],
        "standaloneAdmittedExpectedBand": mask.receipt["expectedIdentity"]["band"], "frameBand": frame.receipt["identity"]["band"],
        "associationRejected": reason, "scienceUnchanged": True, "rawAndOwnersUnchanged": True,
        "networkRequests": 0, "fixtureOrigin": "Synthetic g-file-derived task fixture, not acquired r data or canonical-URL origin evidence"}
    (OUT / "result.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    (OUT / "binding.json").write_text(json.dumps({"script": bind(Path(__file__)), "result": bind(OUT / "result.json"),
        "frame": bind(frame_path), "owners": frozen, "fixture": bind(fixture), "priorReview": primary_review}, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"result": bind(OUT / "result.json"), "binding": bind(OUT / "binding.json")}, indent=2))


if __name__ == "__main__":
    main()
