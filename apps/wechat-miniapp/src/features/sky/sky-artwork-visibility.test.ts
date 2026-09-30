import assert from "node:assert/strict";
import test from "node:test";
import { artworkIntersectsView, artworkDisplaySupportIntersectsView } from "./sky-artwork-visibility.ts";
import { readFileSync } from "node:fs";
import { registerSkySurvey } from "./sky-survey-registration.ts";
import type { SkyImageDisplaySupport, DeepSkyScenePoint } from "@starward/miniapp-contracts";
import { registerSkyArtwork, skyArtworkUvAtDirection, type SkyArtworkView } from "./sky-artwork-registration.ts";
import { createSkyViewBasis, unprojectSkyPoint, type SkyVector } from "./sky-view-projection.ts";

const view: SkyArtworkView = { basis: createSkyViewBasis(0, 120, 0)!, verticalFovDeg: 25 };
function plane(left: number, right: number, bottom: number, top: number, camera = view.basis) {
  const ray = (x: number, y: number): SkyVector => {
    const vector = camera.forward.map((value, i) => value + x * camera.right[i]! + y * camera.up[i]!);
    return vector.map(value => value / Math.hypot(...vector)) as unknown as SkyVector;
  };
  return registerSkyArtwork([
    { uv: [0, 0], direction: ray(left, top) }, { uv: [1, 0], direction: ray(right, top) },
    { uv: [1, 1], direction: ray(right, bottom) },
  ])!;
}

test("a long offscreen image does not enter the texture working set through its loose circular bound", () => {
  const image = plane(-.6, -.4, -1, 1);
  assert.ok(image.bounds.radius < Math.PI / 2);
  assert.equal(artworkIntersectsView(image, view, 390, 844), false);
});

test("an edge crossing remains visible even when image and viewport corners are outside each other", () => {
  const image = plane(-1, 1, -.02, .02);
  assert.equal(artworkIntersectsView(image, view, 390, 844), true);
  const uv = skyArtworkUvAtDirection(image, view.basis.forward)!;
  assert.ok(uv.every(value => value > 0 && value < 1));
});

test("actual visible rays are never rejected under rolled and offset viewports", () => {
  for (const roll of [-67, 0, 71]) for (const fov of [.05, 25, 39.9, 85, 267.8]) {
    const current = { basis: createSkyViewBasis(60, 120, roll)!, verticalFovDeg: fov, center: { x: 120, y: 370 } };
    for (const [x, y] of [[10, 10], [120, 370], [380, 830]]) {
      const ray = unprojectSkyPoint(x!, y!, current.basis, 390, 844, fov, current.center)!;
      if (ray[2] <= 0) continue;
      const right: SkyVector = [ray[1], -ray[0], 0], length = Math.hypot(...right);
      if (length < 1e-6) continue;
      const unitRight = right.map(value => value / length) as unknown as SkyVector;
      const up: SkyVector = [unitRight[1] * ray[2], -unitRight[0] * ray[2], unitRight[0] * ray[1] - unitRight[1] * ray[0]];
      const image = plane(-.01, .01, -.01, .01, { forward: ray, right: unitRight, up });
      assert.equal(artworkIntersectsView(image, current, 390, 844), true, `${roll}/${fov}/${x}/${y}`);
    }
  }
});

test("actual M42 color-empty local viewport retains its cue while source-bearing wider views remain eligible", () => {
  const manifest = JSON.parse(readFileSync(new URL("../../../../../workers/miniapp-api/assets/deep-sky/manifest.json", import.meta.url), "utf8"));
  const asset = manifest.entries.find((entry: { objectRef: string }) => entry.objectRef === "M:42").levels.DETAIL;
  const point: DeepSkyScenePoint = [9, 142.511179367, 55.953728263, 142.409692079, 56.036059794, 142.364271951, 55.896935998];
  const registration = registerSkySurvey(point, asset.fieldDegrees, 512, 256)!;
  const camera = { basis: createSkyViewBasis(point[1], 90 + point[2], 0)!, verticalFovDeg: .05 };
  assert.equal(artworkIntersectsView(registration, camera, 390, 844), true, "whole-image geometry alone was the escaped defect");
  assert.equal(artworkDisplaySupportIntersectsView(registration, camera, 390, 844, asset.displaySupport), false);
  for (const roll of [-67, 71]) {
    const angle=roll*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
    const basis={forward:camera.basis.forward,
      right:camera.basis.right.map((v,i)=>v*c+camera.basis.up[i]!*s) as unknown as SkyVector,
      up:camera.basis.up.map((v,i)=>v*c-camera.basis.right[i]!*s) as unknown as SkyVector};
    assert.equal(artworkDisplaySupportIntersectsView(registration,
      {basis,verticalFovDeg:.05,center:{x:120,y:370}},390,844,asset.displaySupport),false,
      "coarse color cells and a mirrored offset hull cannot certify the current local image");
  }
  for (const fov of [.12, .8]) assert.equal(artworkDisplaySupportIntersectsView(registration,
    { ...camera, verticalFovDeg: fov }, 390, 844, asset.displaySupport), true);
  assert.equal(artworkDisplaySupportIntersectsView(registration, camera, 390, 844), true, "absent metadata is not a claim of empty data");
});

test("isolated color and filter neighbors remain eligible in rolled and offset local views", () => {
  for (const roll of [-67, 0, 71]) for (const fov of [.05, 25, 85]) {
    const current = { basis: createSkyViewBasis(60, 120, roll)!, verticalFovDeg: fov, center: { x: 120, y: 370 } };
    for (const [x, y] of [[10, 10], [120, 370], [380, 830]]) {
      const ray = unprojectSkyPoint(x!, y!, current.basis, 390, 844, fov, current.center)!;
      if (ray[2] <= 0) continue;
      const right: SkyVector = [ray[1], -ray[0], 0], length = Math.hypot(...right);
      if (length < 1e-6) continue;
      const unitRight = right.map(value => value / length) as unknown as SkyVector;
      const up: SkyVector = [unitRight[1] * ray[2], -unitRight[0] * ray[2], unitRight[0] * ray[1] - unitRight[1] * ray[0]];
      const image = plane(-.1, .1, -.1, .1, { forward: ray, right: unitRight, up });
      const uv = skyArtworkUvAtDirection(image, ray)!;
      // Just across a source-cell boundary, still within the LINEAR footprint.
      for (const offset of [-.75, .75]) {
        const index = Math.floor((uv[1] * 256 + offset) / 8) * 32 + Math.floor((uv[0] * 256 + offset) / 8);
        const bits = Array(256).fill("0"); bits[Math.floor(index / 4)] = (1 << (3 - index % 4)).toString(16);
        const support: SkyImageDisplaySupport = { version: "encoded-rgb-support-v1", sourceSha256: "a".repeat(64),
          pixels: 256, cellSize: 8, occupiedHex: bits.join("") };
        assert.equal(artworkDisplaySupportIntersectsView(image, current, 390, 844, support), true, `${roll}/${fov}/${x}/${y}/${offset}`);
        const sourceIndex=Math.floor(uv[1]*256+offset)*256+Math.floor(uv[0]*256+offset);
        const precise:SkyImageDisplaySupport={version:"encoded-rgb-runs-v1",sourceSha256:"a".repeat(64),pixels:256,
          emptyRuns:[0,sourceIndex,1,256*256-sourceIndex-1]};
        assert.equal(artworkDisplaySupportIntersectsView(image,current,390,844,precise),true,
          `source pixel/filter neighbor ${roll}/${fov}/${x}/${y}/${offset}`);
      }
    }
  }
});
