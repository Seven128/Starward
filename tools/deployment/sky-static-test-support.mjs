import assert from "node:assert/strict";
import { cpSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
import { skyStaticHash, writeSkyStaticBundle } from "./sky-static-bundle.mjs";
import { prepareSkyStaticDelivery } from "./sky-static-release.mjs";

// Deliberately small, distinct, valid PNGs. These are generated test inputs,
// not astronomical imagery, adopted publications or trusted OCI evidence.
const inputs = [1, 2].map(version => {
  const image = new PNG({ width: 2, height: 2 });
  for (let i = 0; i < image.data.length; i += 4) {
    image.data.set([version * 48, 32 + i, 192 - version * 32, 255], i);
  }
  return {
    route: `/v2/sky/moon/${String(version).repeat(64)}/texture.png`,
    bytes: PNG.sync.write(image),
    headers: { "content-type": "image/png", "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" },
  };
});
export const skyStaticFixtureSize = Object.freeze({ files: inputs.length, bytes: inputs.reduce((sum, input) => sum + input.bytes.length, 0) });

export async function assertSkyStaticFixtureBytes(directory) {
  for (const input of inputs) {
    assert.deepEqual(await readFile(path.join(directory, `files${input.route}`)), input.bytes);
  }
}

export async function writeSealedSkyStaticFixture(directory, revision, selected = inputs) {
  const bundle = await writeSkyStaticBundle(directory, selected);
  await writeFile(path.join(bundle.output, "image-artifact.json"), JSON.stringify({
    schemaVersion: "starward-sky-static-image-artifact-v1", revision, publicationHash: bundle.publicationHash,
    indexSha256: skyStaticHash(await readFile(path.join(bundle.output, "index.json"))),
    fragmentSha256: skyStaticHash(await readFile(path.join(bundle.output, "delivery.caddy"))),
  }), { flag: "wx" });
  return bundle;
}

/** Build two retained source generations through the production preparation
 * owner. Only the Docker inspection/extraction boundary is simulated. */
export async function createManagedSkyStaticFixture(root) {
  const directory = path.join(root, "store");
  for (const [index, input] of inputs.entries()) {
    const version = String(index + 1), revision = version.repeat(40), imageDigest = `sha256:${version.repeat(64)}`;
    const source = await writeSealedSkyStaticFixture(path.join(root, `producer-${version}`), revision, [input]);
    const validation = { revision, imageDigest, operations: { skyStaticDirectory: directory } };
    const deploy = { STARWARD_SKY_STATIC_DIRECTORY: directory, STARWARD_IMAGE_REF: `registry.example/starward@${imageDigest}` };
    let containerExists = false;
    const delivery = await prepareSkyStaticDelivery({ validation, deploy, execute(call) {
      let stdout = Buffer.alloc(0);
      if (call.step === "sky-static-image-revision") stdout = Buffer.from(revision);
      else if (call.step === "sky-static-artifact-container") containerExists = true;
      else if (call.step === "sky-static-artifact-copy") cpSync(source.output, call.args[2], { recursive: true });
      else if (call.step === "sky-static-artifact-container-discovery") stdout = Buffer.from(containerExists ? "a".repeat(12) : "");
      else if (call.step === "sky-static-artifact-container-cleanup") containerExists = false;
      else throw new Error(`unexpected_fixture_process:${call.step}`);
      return { stdout, stderr: Buffer.alloc(0) };
    } });
    await delivery.dispose();
  }
  const inventoryBytes = await readFile(path.join(directory, "prepared-inventory.json"));
  return { directory, inventoryBytes, inventory: JSON.parse(inventoryBytes.toString("utf8")) };
}
