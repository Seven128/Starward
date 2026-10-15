import assert from "node:assert/strict";
import test from "node:test";
import type Taro from "@tarojs/taro";
import { loadPosterIcons } from "./share-poster-icons";

test("retiring the frame detaches pending image callbacks and cannot resolve a late decode", async () => {
  const images: any[] = [];
  const canvas = { createImage() { const image = { src: "", onload: null, onerror: null }; images.push(image); return image; } } as unknown as Taro.Canvas;
  const work = loadPosterIcons(canvas, name => `/content/${name}.png`);
  const late = images.map(image => image.onload);
  const rejected = assert.rejects(work.promise, /poster_image_retired/);
  work.cancel(); await rejected;
  assert.ok(images.every(image => image.onload === null && image.onerror === null));
  late.forEach(callback => callback());
});

test("completed icons are frame-local native images and no callback retains the loading closures", async () => {
  const images: any[] = [];
  const canvas = { createImage() { const image = { src: "", onload: null, onerror: null }; images.push(image); return image; } } as unknown as Taro.Canvas;
  const work = loadPosterIcons(canvas, name => `/content/${name}.png`);
  images.forEach(image => image.onload()); const icons = await work.promise;
  assert.equal(icons.meteor, images[1]); assert.equal(icons["place-pin"], images[2]);
  work.cancel(); assert.ok(images.every(image => image.onload === null && image.onerror === null));
});
