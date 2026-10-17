import test from "node:test";
import assert from "node:assert/strict";
import { approvedSkyPublicAssets, galacticSkyPublicAsset, skyStaticDeliveryFragment, type SkyPublicAssetExportInput, type SkyPublicAssetExportRecord } from "./sky-public-asset-export.ts";
import { galacticImagePublicAssetHeaders, galacticImagePublicMetadataHeaders, skyPublicAssetHeaders, skySourceManifestHeaders } from "./sky-public-asset-headers.ts";
import { GalacticImagePublicationService } from "./galactic-image-publication.ts";
import { MELLINGER_OPTICAL_MILKY_WAY, type OpticalMilkyWayManifestData } from "@starward/miniapp-contracts";
import { MoonTexturePublicationService } from "./moon-texture-publication.ts";
import { DeepSkyImageryService } from "./deep-sky-imagery.ts";
import { SdssOpticalImageryService } from "./sdss-optical-imagery.ts";

test("standard export includes exact SDSS/W3 source manifests for every admitted current and retained image publication", async () => {
  const expected = new Map<string, SkyPublicAssetExportInput>();
  for (const manifest of new DeepSkyImageryService().publishedManifests()) {
    const route = `/v2/sky/deep-sky/${manifest.publicationHash}/manifest`;
    expected.set(route, { route, bytes: Buffer.from(JSON.stringify(manifest)), headers: skySourceManifestHeaders("deep-sky") });
  }
  for (const manifest of new SdssOpticalImageryService().publishedManifests()) {
    const route = `/v2/sky/sdss-optical/${manifest.publicationHash}/manifest`;
    expected.set(route, { route, bytes: Buffer.from(JSON.stringify(manifest)), headers: skySourceManifestHeaders("sdss-optical", manifest.objectRef) });
  }
  assert(expected.size >= 8, "current and retained W3 plus all six SDSS references must be represented");
  const observed = new Map<string, SkyPublicAssetExportInput>();
  for await (const row of approvedSkyPublicAssets()) if (expected.has(row.route)) observed.set(row.route, row);
  assert.deepEqual(observed, expected);
  for (const row of observed.values()) assert(skyStaticDeliveryFragment([{ ...row, bytes: row.bytes.length, sha256: "0".repeat(64) }]).includes(row.route));
});

test("optical source headers reject infrared attribution and preserve the retained 2MASS export", async () => {
  const owner = new GalacticImagePublicationService(new URL("../assets/deep-sky/galactic-2mass/manifest.json",import.meta.url)), manifest = owner.manifest();
  const originalHeaders = skyPublicAssetHeaders("galactic", "image/jpeg");
  assert.deepEqual(galacticImagePublicAssetHeaders(manifest), originalHeaders);
  const exported = await galacticSkyPublicAsset(owner);
  assert.equal(exported.route, manifest.image.downloadUrl);
  assert.deepEqual(exported.headers, originalHeaders);
  assert.deepEqual(exported.bytes, await owner.image(manifest.publicationHash, manifest.image.file));
  const publicationHash = "f".repeat(64);
  const optical: OpticalMilkyWayManifestData = {
    schemaVersion: "starward-mellinger-optical-milky-way-trial-v1", scope: "TRIAL", role: "OPTICAL_MILKY_WAY_DISPLAY",
    publicationId: "conditional-optical-header-check", publicationHash,
    source: MELLINGER_OPTICAL_MILKY_WAY.source, projection: MELLINGER_OPTICAL_MILKY_WAY.projection,
    image: { ...MELLINGER_OPTICAL_MILKY_WAY.image, downloadUrl: `/v2/sky/galactic/${publicationHash}/milkyway.png` },
    scientificAvailability: "UNKNOWN", absoluteRegistration: "UNVERIFIED", processing: "Exact bundled display bitmap.",
    limitations: ["Conditional trial.", "Producer complete processing UNKNOWN."],
  };
  const headers = galacticImagePublicAssetHeaders(optical);
  assert.equal(headers["content-type"], "image/png");
  assert.ok(headers["x-starward-image-source"].includes("Axel Mellinger"));
  assert.ok(headers["x-starward-image-source"].includes("optical"));
  assert.notEqual(headers["x-starward-image-source"], skyPublicAssetHeaders("galactic", "image/png")["x-starward-image-source"]);
  assert.throws(() => galacticImagePublicAssetHeaders({ ...optical, scope: "ADOPTED" } as unknown as OpticalMilkyWayManifestData),
    /galactic_image_manifest_invalid/);
});

test("ordinary static export uses the same selected optical publication, bytes and headers as discovery",async()=>{
  const owner=new GalacticImagePublicationService(),manifest=owner.manifest();
  assert.equal(manifest.schemaVersion,"starward-mellinger-optical-milky-way-v1");
  const exported=await galacticSkyPublicAsset(owner);
  assert.equal(exported.route,manifest.image.downloadUrl);
  assert.equal(exported.headers["content-type"],"image/png");
  assert.equal(exported.headers["x-starward-image-source"],"Axel Mellinger / Stellarium historical optical Milky Way display");
  assert.deepEqual(exported.headers,galacticImagePublicAssetHeaders(manifest));
  assert.deepEqual(exported.bytes,await owner.image(manifest.publicationHash,manifest.image.file));
});

test("standard default enumerator retains both the optical current and legacy infrared immutable routes",async()=>{
  const rows: SkyPublicAssetExportInput[]=[];
  for await(const row of approvedSkyPublicAssets()){
    if(row.route.startsWith('/v2/sky/galactic/'))rows.push(row);
    else if(rows.length)break;
    if(rows.length===4)break;
  }
  assert.equal(rows.length,4,'default export must retain both real images and their immutable metadata');
  const current=new GalacticImagePublicationService().manifest();
  const retained=new GalacticImagePublicationService(new URL('../assets/deep-sky/galactic-2mass/manifest.json',import.meta.url)).manifest();
  for(const manifest of [current,retained]){
    const row=rows.find(r=>r.route===manifest.image.downloadUrl);assert(row);
    assert.deepEqual(row.headers,galacticImagePublicAssetHeaders(manifest));
    assert.deepEqual(row.bytes,await new GalacticImagePublicationService().image(manifest.publicationHash,manifest.image.file));
    const metadata=new GalacticImagePublicationService().publishedMetadata(manifest.publicationHash);
    const meta=rows.find(r=>r.route===metadata.route);assert(meta);
    assert.deepEqual(meta.bytes,metadata.bytes);assert.deepEqual(meta.headers,galacticImagePublicMetadataHeaders(manifest));
    assert.ok(skyStaticDeliveryFragment([{...meta,bytes:meta.bytes.length,sha256:'0'.repeat(64)}]).includes(metadata.route));
  }
});

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
