import path from "node:path";
import { fileURLToPath } from "node:url";
import Jimp from "jimp";

const root = path.dirname(fileURLToPath(import.meta.url));
const referenceRoot = path.join(root, "reference");
const implementationRoot = path.join(root, "implementation");
const comparisonRoot = path.join(root, "comparison");

const mobileNames = [
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
];

const operationsNames = [
  "ops-01-queue.png",
  "ops-02-case.png",
  "ops-03-media.png",
  "ops-04-merge.png",
  "ops-05-publication.png",
  "ops-06-replacement.png",
  "ops-07-audit.png",
];

const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);

function fitWidth(image, width) {
  const height = Math.round((image.bitmap.height * width) / image.bitmap.width);
  return image.resize(width, height, Jimp.RESIZE_BICUBIC);
}

async function compose(name, panelWidth, mobile) {
  const reference = await Jimp.read(path.join(referenceRoot, name));
  const implementation = await Jimp.read(path.join(implementationRoot, name));
  if (mobile) {
    const specimenWidth = Math.min(reference.bitmap.width, Math.round(390 * 0.8));
    const specimenHeight = Math.min(reference.bitmap.height, Math.round(844 * 0.8));
    reference.crop(0, 0, specimenWidth, specimenHeight).resize(390, 844, Jimp.RESIZE_BICUBIC);
    implementation.resize(390, 844, Jimp.RESIZE_BICUBIC);
  }
  fitWidth(reference, panelWidth);
  fitWidth(implementation, panelWidth);
  const labelHeight = 48;
  const gap = 20;
  const contentHeight = Math.max(reference.bitmap.height, implementation.bitmap.height);
  const canvas = await Jimp.create(panelWidth * 2 + gap, contentHeight + labelHeight, "#dde3eaff");
  canvas.print(font, 12, 14, "REFERENCE");
  canvas.print(font, panelWidth + gap + 12, 14, "IMPLEMENTATION");
  canvas.composite(reference, 0, labelHeight);
  canvas.composite(implementation, panelWidth + gap, labelHeight);
  await canvas.writeAsync(path.join(comparisonRoot, name));
}

for (const name of mobileNames) await compose(name, 390, true);
for (const name of operationsNames) await compose(name, 1000, false);
