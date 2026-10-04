"""Read-only source binding for the independent file-cache API review.

No execution of proposed production cache, FS/runtime hooks or Settings;
task evidence only. New owner will require a later actual-output review.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / "output/sky-public-file-cache-api-independent-1002-r1"
PATHS = (
    "apps/wechat-miniapp/src/services/sky-image-file-session.ts",
    "apps/wechat-miniapp/src/features/sky/use-sky-artwork.ts",
    "apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts",
    "apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts",
    "apps/wechat-miniapp/src/features/sky/deep-sky-image-request.ts",
    "apps/wechat-miniapp/src/services/api-client.ts",
    "apps/wechat-miniapp/src/app.tsx",
    "apps/wechat-miniapp/src/services/response-cache.ts",
    "packages/miniapp-contracts/src/sky-image-display-support.ts",
    ".codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-public-image-cache-audit-2026-10-02.md",
)


def bind(path):
    path = path.resolve()
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw),
            "sha256": hashlib.sha256(raw).hexdigest()}


def main():
    assert not OUT.exists()
    baseline = [bind(ROOT / p) for p in PATHS]
    assert baseline[0]["sha256"] == "1950f44454703066702bf2d452e41d77d5925449a76391462f9caaa093ecfc7a"
    assert baseline[1]["sha256"] == "69789bb336b7f083e1e5dddac6ba2eb202a029a24f8b3ae641c481c2f6b162fb"
    assert baseline[2]["sha256"] == "7e42ec756f5567fe7afffc34fa79f43dd4608bf65a1b6bd821f91dac8a3109e5"
    assert baseline[3]["sha256"] == "05a9a6f6b380ec38c0674b771b9d37ef2c5917b167979d81a31bbd4f18ac7ffe"
    OUT.mkdir()
    (OUT / "executed-script.py").write_bytes(Path(__file__).read_bytes())
    result = {"scope": __doc__, "sourceBefore": baseline,
              "sourceAfter": [bind(ROOT / p) for p in PATHS],
              "runtimeOrProposedOwnerExecuted": False, "requests": 0,
              "productionSettingsOrPreservedFilesEdited": False,
              "limits": "API/lifecycle design audit only; no persistence/native/clear/quota behavior has been verified here."}
    assert result["sourceBefore"] == result["sourceAfter"]
    (OUT / "result.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"result": bind(OUT / "result.json"), "script": bind(OUT / "executed-script.py")}))


if __name__ == "__main__":
    main()
