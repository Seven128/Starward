import test from "node:test";
import assert from "node:assert/strict";
import { skyStaticDeliveryFragment, type SkyPublicAssetExportRecord } from "./sky-public-asset-export.ts";
import { skyPublicAssetHeaders } from "./sky-public-asset-headers.ts";
import { MoonTexturePublicationService } from "./moon-texture-publication.ts";

test("static paths preserve canonical publication identity and reject dot segments or unapproved families", () => {
  const route = new MoonTexturePublicationService().coverageManifest().image.downloadUrl;
  const record: SkyPublicAssetExportRecord = { route, bytes: 1, sha256: "0".repeat(64), headers: skyPublicAssetHeaders("moon", "image/png") };
  const valid = skyStaticDeliveryFragment([record]);
  assert.ok(valid.includes("path " + route)); assert.ok(valid.includes("method GET HEAD"));
  assert.ok(valid.includes("try_files {path}")); assert.ok(!valid.includes("browse"));
  for (const bad of [
    `/v2/sky/constellations/${"f".repeat(64)}/assets/.`,
    `/v2/sky/constellations/${"f".repeat(64)}/assets/..`,
    `/v2/sky/constellations/${"f".repeat(64)}/assets/../geometry.json`,
    `/v2/sky/optical/${"f".repeat(64)}/trial.png`,
    `/v2/sky/constellations/${"f".repeat(64)}/assets/%2e%2e`,
    route.replace("/coverage/", "/coverage//"), route + "?private=1", route + "#fragment", "/v2/me/avatar.jpg",
  ]) assert.throws(() => skyStaticDeliveryFragment([{ ...record, route: bad }]), /sky_static_route_invalid/, bad);
});

test("static Caddy headers cannot inject directives and SDSS field meaning cannot be missing", () => {
  const route = new MoonTexturePublicationService().coverageManifest().image.downloadUrl;
  const record: SkyPublicAssetExportRecord = { route, bytes: 1, sha256: "0".repeat(64), headers: { "x-starward-image-source": 'image"\nrespond 200' } };
  assert.throws(() => skyStaticDeliveryFragment([record]), /sky_static_header_invalid/);
  assert.throws(() => skyPublicAssetHeaders("sdss-optical", "image/jpeg"), /sky_public_asset_field_invalid/);
  assert.throws(() => skyPublicAssetHeaders("sdss-optical", "image/jpeg", 0), /sky_public_asset_field_invalid/);
});
