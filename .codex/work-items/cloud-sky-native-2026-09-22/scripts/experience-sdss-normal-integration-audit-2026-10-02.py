"""Read-only source bindings for the normal SDSS integration boundary audit."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / "output/sdss-artwork-level-integration-audit-1002-r1"
NOTE = ROOT / ".codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-normal-level-integration-audit-2026-10-02.md"
PATHS = [
    "data-pipelines/deep-sky/sdss_gri_tan.py",
    "packages/miniapp-contracts/src/sdss-optical-publication.ts",
    "packages/miniapp-contracts/src/deep-sky-image-publication.ts",
    "packages/miniapp-contracts/src/sky-image-display-support.ts",
    "workers/miniapp-api/src/sdss-optical-imagery.ts",
    "workers/miniapp-api/src/controller.ts",
    "workers/miniapp-api/src/miniapp-service.ts",
    "workers/miniapp-api/src/celestial-object-information.ts",
    "workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json",
    "apps/wechat-miniapp/src/services/sdss-optical-client.ts",
    "apps/wechat-miniapp/src/services/sdss-optical-publication.ts",
    "apps/wechat-miniapp/src/features/sky/use-sky-sdss-optical.ts",
    "apps/wechat-miniapp/src/features/sky/sky-sdss-optical-selection.ts",
    "apps/wechat-miniapp/src/features/sky/use-sky-artwork.ts",
    "apps/wechat-miniapp/src/features/sky/sky-artwork-loader.ts",
    "apps/wechat-miniapp/src/features/sky/sky-artwork-request.ts",
    "apps/wechat-miniapp/src/features/sky/sky-scene-render.ts",
    "apps/wechat-miniapp/src/features/sky/sky-render-surface.ts",
    "apps/wechat-miniapp/src/features/sky/sky-artwork-level-composition.ts",
    "apps/wechat-miniapp/src/features/sky/sky-gpu-renderer.ts",
    "apps/wechat-miniapp/src/features/sky/sky-artwork-registration.ts",
    "apps/wechat-miniapp/src/features/sky/sky-survey-registration.ts",
    "apps/wechat-miniapp/src/features/sky/sky-artwork-visibility.ts",
    "apps/wechat-miniapp/src/features/sky/spot-sky-page.tsx",
    "apps/wechat-miniapp/src/services/api-client.ts",
    "apps/wechat-miniapp/src/services/celestial-information-response.ts",
    "apps/wechat-miniapp/src/hooks/use-celestial-information.ts",
    "apps/wechat-miniapp/src/sky/sources/index.tsx",
    "data-pipelines/deep-sky/allwise_finite_tan.py",
    "data-pipelines/deep-sky/test_publish_allwise_w3.py",
]


def bind(path):
    raw = path.read_bytes()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}


def main():
    OUT.mkdir(exist_ok=False)
    (OUT / "executed-script.py").write_bytes(Path(__file__).read_bytes())
    before = [bind(ROOT / path) for path in PATHS]
    preserved = json.loads((ROOT / ".codex/work-items/cloud-sky-native-2026-09-22/tmp/resume-preserved-hashes-2026-10-01.json").read_text(encoding="utf-8"))
    retained = [bind(ROOT / record["path"]) for record in preserved]
    assert all(current["sha256"] == expected["sha256"] for current, expected in zip(retained, preserved))
    assets = [bind(path) for path in sorted((ROOT / "workers/miniapp-api/assets/deep-sky").rglob("*")) if path.is_file()]
    prior = json.loads((ROOT / "output/sdss-m51-gri-mosaic-candidate-1002-r2/binding.json").read_text(encoding="utf-8"))["oldAssetsAfter"]
    assert assets == prior
    after = [bind(ROOT / path) for path in PATHS]
    assert before == after
    assert before[-2]["sha256"] == "d917e04227ce6b0faefdf7780bb144f040c3049eaae8f4cb629603411c5b25c4"
    assert before[-1]["sha256"] == "8109e6037ad465d17f0411ef0197a626f8c8d33d598ca25198930c0b3c0da5a2"
    result = {"scope": "Read-only current source/consumer migration audit; no code, publication, source request or GPU execution",
              "script": bind(Path(__file__)), "note": bind(NOTE), "sourceFilesBefore": before, "sourceFilesAfter": after,
              "oldAssetFiles": len(assets), "oldAssetsMatchFrozenInventory": True,
              "preserved": retained, "freshSamplerFreezeUnchanged": True,
              "currentNormalConsumer": "Legacy optical JPEG via artwork(optical-cutout); group capability opt-in only",
              "nextUnverifiedBoundary": "Versioned immutable science publication, normal transport/consumer integration and actual contribution/provenance semantics",
              "qualityAdopted": False}
    (OUT / "audit.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(bind(OUT / "audit.json")))


if __name__ == "__main__":
    main()
