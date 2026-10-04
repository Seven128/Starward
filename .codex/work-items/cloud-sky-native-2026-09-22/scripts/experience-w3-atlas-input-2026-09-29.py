"""Bounded same-survey Atlas source trial; never replaces published JPEGs."""
from pathlib import Path
import hashlib
import json
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[4]
OUTPUT = ROOT / "output/allwise-w3-atlas-0929"
QUERY = "https://irsa.ipac.caltech.edu/ibe/search/wise/allwise/p3am_cdd?" + urllib.parse.urlencode({
    "POS": "83.818666666667,-5.389666666667", "WHERE": "band=3",
})


def fetch(url: str, maximum: int) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "Starward-bounded-Atlas-check/1.0"})
    with urllib.request.urlopen(req, timeout=25) as response:
        assert response.status == 200
        raw = response.read(maximum + 1)
        assert 0 < len(raw) <= maximum, "source_response_exceeds_trial_limit"
        return raw


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    result_path = OUTPUT / "query-result.json"
    assert not result_path.exists(), "preserve_previous_trial"
    result = {"scope": "One M42 W3 Atlas metadata query, not new publication or scientific validity mask", "url": QUERY}
    try:
        raw = fetch(QUERY, 500_000)
        (OUTPUT / "atlas-metadata.tbl").write_bytes(raw)
        result.update(bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(), state="RECEIVED")
        print(raw.decode("utf-8")[:18000])
    except Exception as error:
        result.update(state="UNAVAILABLE", error=f"{type(error).__name__}: {error}")
        raise
    finally:
        result_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(result))


if __name__ == "__main__":
    main()
