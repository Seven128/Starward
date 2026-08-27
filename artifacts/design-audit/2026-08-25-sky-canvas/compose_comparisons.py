import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
REFERENCE = ROOT / "reference"
IMPLEMENTATION = ROOT / "implementation"
COMPARISON = ROOT / "comparison"
COMPARISON.mkdir(parents=True, exist_ok=True)

FONT_PATH = Path(r"C:\Windows\Fonts\msyh.ttc")
FONT = ImageFont.truetype(str(FONT_PATH), 22) if FONT_PATH.exists() else ImageFont.load_default()
SMALL = ImageFont.truetype(str(FONT_PATH), 16) if FONT_PATH.exists() else ImageFont.load_default()


def crop_mobile_references() -> None:
    metadata = json.loads((REFERENCE / "mobile-board-metadata.json").read_text(encoding="utf-8"))
    for board in metadata.values():
        source = Image.open(REFERENCE / board["file"]).convert("RGB")
        scale_x = source.width / board["document"]["scrollWidth"]
        scale_y = source.height / board["document"]["scrollHeight"]
        for name, rect in board["rects"].items():
            left = round(rect["x"] * scale_x)
            top = round(rect["y"] * scale_y)
            right = round((rect["x"] + rect["width"]) * scale_x)
            bottom = round((rect["y"] + rect["height"]) * scale_y)
            source.crop((left, top, right, bottom)).save(REFERENCE / name, optimize=True)


def fit_width(image: Image.Image, width: int) -> Image.Image:
    height = round(image.height * width / image.width)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def normalize_mobile_reference(image: Image.Image) -> Image.Image:
    """Project the 0.8x handoff phone specimen onto the declared 390x844 viewport."""
    specimen_width = round(390 * 0.8)
    specimen_height = round(844 * 0.8)
    return image.crop((0, 0, specimen_width, specimen_height)).resize(
        (390, 844), Image.Resampling.LANCZOS
    )


def normalize_mobile_implementation(image: Image.Image) -> Image.Image:
    """Normalize DevTools' content-only capture to the handoff viewport."""
    return image.resize((390, 844), Image.Resampling.LANCZOS)


def compose(name: str, panel_width: int) -> None:
    reference_source = Image.open(REFERENCE / name).convert("RGB")
    implementation_source = Image.open(IMPLEMENTATION / name).convert("RGB")
    if name.startswith("ops-"):
        reference = fit_width(reference_source, panel_width)
        implementation = fit_width(implementation_source, panel_width)
    else:
        reference = fit_width(normalize_mobile_reference(reference_source), panel_width)
        implementation = fit_width(normalize_mobile_implementation(implementation_source), panel_width)
    label_height = 48
    gap = 20
    content_height = max(reference.height, implementation.height)
    canvas = Image.new("RGB", (panel_width * 2 + gap, content_height + label_height), "#DDE3EA")
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 10), "设计资源 / REFERENCE", fill="#111827", font=FONT)
    draw.text((panel_width + gap + 12, 10), "当前实现 / IMPLEMENTATION", fill="#111827", font=FONT)
    canvas.paste(reference, (0, label_height))
    canvas.paste(implementation, (panel_width + gap, label_height))
    draw.line((panel_width + gap // 2, 0, panel_width + gap // 2, canvas.height), fill="#64748B", width=2)
    canvas.save(COMPARISON / name, optimize=True)


for name in [
    "01-map-finder-day.png",
    "02-spot-detail-dusk.png",
    "03-spot-night-astronomy.png",
    "04-spot-night-orientation.png",
    "05-my-home.png",
    "06-plan-detail.png",
    "07-settings.png",
    "09-contribution-intake.png",
    "10-contribution-form.png",
    "11-contribution-upload-recovery.png",
    "12-contribution-review-history.png",
]:
    compose(name, 390)

for name in [
    "ops-01-queue.png",
    "ops-02-case.png",
    "ops-03-media.png",
    "ops-04-merge.png",
    "ops-05-publication.png",
    "ops-06-replacement.png",
    "ops-07-audit.png",
]:
    compose(name, 1000)

profile = fit_width(Image.open(REFERENCE / "08-profile-import.png").convert("RGB"), 390)
profile_canvas = Image.new("RGB", (390, profile.height + 78), "#DDE3EA")
profile_draw = ImageDraw.Draw(profile_canvas)
profile_draw.text((12, 8), "设计资源 / REFERENCE", fill="#111827", font=FONT)
profile_draw.text((12, 40), "当前实现：功能门控关闭，生产路由树中不存在", fill="#7C2D12", font=SMALL)
profile_canvas.paste(profile, (0, 78))
profile_canvas.save(COMPARISON / "08-profile-import-gated.png", optimize=True)
