import assert from "node:assert/strict";
import test from "node:test";
import { preparedNativeOpticalFixture, preparedRegisteredNativeFixture } from "./test-fixtures/prepared-native-optical-publication.ts";
import { assertPreparedNativeOpticalManifest, assertPreparedNativeOpticalPublication,
  preparedNativeOpticalPublicationHash, preparedNativeOpticalSource, isPreparedOpticalReference, preparedNativeDisplayGeometry } from "./prepared-native-optical-publication.ts";
import { assertPreparedRenderedOpticalManifest } from "./prepared-rendered-optical-publication.ts";
import { assertPreparedOpticalPublication, preparedOpticalPublicationHash } from "./prepared-optical-publication.ts";
import { preparedOpticalFixture } from "./test-fixtures/prepared-optical-publication.ts";
import { isCelestialObjectReference } from "./celestial-identity.ts";
import { OPTICAL_IMAGE_LEVELS } from "./optical-publication-content.ts";

test("upstream ready textures keep explicit corner provenance and cannot pretend to be raw AVM observations", () => {
  const original = preparedNativeOpticalFixture(), p = structuredClone(original);
  assert(p.processing.producerVersion === "prepared-native-full-source-v1");
  p.processing = { ...p.processing, producerVersion: "prepared-native-ready-texture-v1" };
  p.nominalTan.accuracy = "UNVERIFIED_APPROXIMATE_PUBLISHER_CORNERS";
  p.source.metadata.kind = "stellarium-corners"; p.source.encoded.format = "png";
  const hash = preparedNativeOpticalPublicationHash(p);
  assertPreparedNativeOpticalPublication(p, p.reference, hash);
  assert.deepEqual(p.levels, original.levels);
  const source = preparedNativeOpticalSource({ ...p, publicationHash: hash });
  assert(source.attribution?.statements.includes(p.source.credit));
  assert(source.limitations.some(line => line.includes("上游加工细节未知") && line.includes("独立绝对配准")));
  for (const edit of [
    (v: any) => { v.processing.producerVersion = "prepared-native-full-source-v1"; },
    (v: any) => { v.nominalTan.accuracy = "UNVERIFIED_APPROXIMATE_PUBLISHER_AVM"; },
    (v: any) => { v.source.metadata.kind = "publisher-avm"; },
    (v: any) => { v.source.encoded.format = "jpeg"; },
    (v: any) => { v.processing.separation = {}; },
  ]) {
    const changed = structuredClone(p); edit(changed);
    assert.throws(() => assertPreparedNativeOpticalPublication(changed, p.reference,
      preparedNativeOpticalPublicationHash(changed)), /publication_invalid/);
  }
});

test("measured placement has explicit V2 admission and preserves original pixels/metadata", () => {
  const original = preparedNativeOpticalFixture(), p = preparedRegisteredNativeFixture();
  const oldHash = preparedNativeOpticalPublicationHash(original), hash = preparedNativeOpticalPublicationHash(p);
  assertPreparedNativeOpticalPublication(p, p.reference, hash);
  assert.notEqual(hash, oldHash);
  assert.deepEqual(p.source, original.source); assert.deepEqual(p.levels, original.levels);
  assert.deepEqual(p.nominalTan, original.nominalTan);
  assert.equal(preparedNativeDisplayGeometry(p), p.registration!.geometry);
  assert.equal(preparedNativeDisplayGeometry(original), original.nominalTan);
  const source = preparedNativeOpticalSource({ ...p, publicationHash: hash });
  assert(source.attribution!.statements.includes(p.registration!.catalogue.credit));
  assert(source.limitations.some(line => line.includes("留出RMS 0.500") && line.includes("最大 1.200")));
  assert(source.precision?.includes("独立目录"));
  for (const edit of [
    (v: any) => { v.schemaVersion = "prepared-native-optical-publication-v1"; },
    (v: any) => { delete v.registration; },
    (v: any) => { v.registration.sourceImage = { bytes: 128, sha256: "0".repeat(64) }; },
    (v: any) => { v.registration.geometry.sourceWidth--; },
    (v: any) => { v.registration.geometry.cdDegreesPerPixel = [[1, 2], [2, 4]]; },
    (v: any) => { v.registration.holdout.count = 0; },
    (v: any) => { v.registration.holdout.rmsPixels = -1; },
    (v: any) => { v.registration.holdout.maxPixels = .1; },
    (v: any) => { v.registration.quality = "ABSOLUTE_CALIBRATION_PASSED"; },
    (v: any) => { v.registration.pixelTransform = "reprojected"; },
    (v: any) => { v.registration.catalogue.rightsUrl = "http://example.invalid/rights"; },
  ]) {
    const changed = structuredClone(p); edit(changed);
    assert.throws(() => assertPreparedNativeOpticalPublication(changed, p.reference,
      preparedNativeOpticalPublicationHash(changed)), /publication_invalid/);
    assert.throws(() => preparedNativeDisplayGeometry(changed), /registration_invalid/);
  }
  assert.equal(preparedNativeOpticalPublicationHash(original), oldHash);
});

test("whole rectangular rotated tiers preserve non-Messier/region identity and keep old admission/hash", () => {
  for (const region of [false, true]) {
    const p = preparedNativeOpticalFixture(region), hash = preparedNativeOpticalPublicationHash(p);
    assertPreparedNativeOpticalPublication(p, p.reference, hash);
    assert(isPreparedOpticalReference(p.reference));
    assert.equal(isCelestialObjectReference(p.reference), !region);
    const m = { ...p, publicationHash: hash, levels: Object.fromEntries(OPTICAL_IMAGE_LEVELS.map(level => [level,
      { ...p.levels[level], downloadUrl: `/v2/sky/prepared-optical/${hash}/${p.levels[level].file}` }])) } as any;
    assertPreparedNativeOpticalManifest(m, p.reference, hash); assertPreparedRenderedOpticalManifest(m, p.reference, hash);
    assert.equal(preparedNativeOpticalPublicationHash(m), hash);
    assert.throws(() => assertPreparedOpticalPublication(p, "M:51"), /publication_invalid/u);
    const source = preparedNativeOpticalSource(m);
    assert(source.attribution?.statements.includes(p.source.credit));
    assert(source.limitations.some(line => line.includes("黑像素") && line.includes("不表示科学有效")));
    const larger = structuredClone(p);
    larger.levels.DETAIL.width = 2048; larger.levels.DETAIL.height = Math.round(7510 * 2048 / 8285);
    larger.levels.DETAIL.decodedRgb.bytes = larger.levels.DETAIL.width * larger.levels.DETAIL.height * 3;
    assertPreparedNativeOpticalPublication(larger, p.reference, preparedNativeOpticalPublicationHash(larger));
  }
  const old = preparedOpticalFixture(), hash = preparedOpticalPublicationHash(old);
  assertPreparedOpticalPublication(old, "M:51", hash);
  assert.throws(() => assertPreparedNativeOpticalPublication(old, "M:51"), /native_optical_publication_invalid/u);
  assert.equal(preparedOpticalPublicationHash(old), hash);
});

test("fresh hashes cannot lend a crop, fabricated validity, wrong subject or singular/non-TAN geometry", () => {
  const edits = [
    (p: any) => { p.objectRef = "NGC:253"; }, (p: any) => { p.center = { raDeg: 11.888, decDeg: -25.288 }; },
    (p: any) => { p.subject.kind = "region"; }, (p: any) => { p.nominalTan.projection = "SIN"; },
    (p: any) => { p.nominalTan.cdDegreesPerPixel = [[1, 2], [2, 4]]; },
    (p: any) => { p.source.metadata.kind = "companion-fits"; },
    (p: any) => { p.levels.DETAIL.sourceUvBounds = [.1, .1, .9, .9]; },
    (p: any) => { p.levels.DETAIL.scientificAvailability = "AVAILABLE"; },
    (p: any) => { p.levels.MEDIUM.decodedRgb.bytes++; },
    (p: any) => { p.levels.DETAIL.height = 1024; },
    (p: any) => { p.levels.OVERVIEW.file = "../photo.jpg"; },
  ];
  for (const edit of edits) {
    const p = preparedNativeOpticalFixture(); edit(p);
    assert.throws(() => assertPreparedNativeOpticalPublication(p, p.reference, preparedNativeOpticalPublicationHash(p)), /native_optical_publication_invalid/u);
  }
});

test("SXT display has distinct version/meaning, exact reviewed finest identity and visible limits", () => {
  const original = preparedNativeOpticalFixture(), oldHash = preparedNativeOpticalPublicationHash(original);
  const p = structuredClone(original), id = { bytes: 128, sha256: "2".repeat(64) };
  assert(p.processing.producerVersion==="prepared-native-full-source-v1");
  p.processing = { ...p.processing, producerVersion: "prepared-native-sxt-display-v1",
    colourUnit: "sxt-starless-display-estimate", separation: { method: "sxt", modelVersion: 11, overlap: .2,
      inputUpsample: 1, processingReceipt: id, reviewReceipt: id,
      workingImage: { ...id, width: 1024, height: 928 }, starless: { ...id, width: 1024, height: 928 },
      fileReview: "PASSED", sceneAcceptance: "MISSING" } };
  for (const level of OPTICAL_IMAGE_LEVELS) {
    p.levels[level].format = "png"; p.levels[level].file = `${p.publicationId}-${level.toLowerCase()}.png`;
  }
  p.levels.DETAIL.bytes = id.bytes; p.levels.DETAIL.sha256 = id.sha256;
  const hash = preparedNativeOpticalPublicationHash(p);
  assert.notEqual(hash, oldHash); assertPreparedNativeOpticalPublication(p, p.reference, hash);
  assert.equal(preparedNativeOpticalPublicationHash(original), oldHash);
  const source = preparedNativeOpticalSource({ ...p, publicationHash: hash });
  assert(source.attribution?.statements.some(line=>line.includes('AI')&&line.includes('SXT ML11')));
  assert(!preparedNativeOpticalSource({...original,publicationHash:oldHash}).attribution?.statements.some(line=>line.includes('AI')));
  assert(source.title.includes("去星显示估计"));
  assert(source.limitations.some(line => line.includes("移除真实天体结构") && line.includes("尚未验收")));
  const edits = [
    (v: any) => { v.processing.colourUnit = "published-encoded-RGB"; },
    (v: any) => { v.processing.producerVersion = "prepared-native-full-source-v1"; v.processing.colourUnit = "published-encoded-RGB"; },
    (v: any) => { v.processing.separation.fileReview = "PENDING_REVIEW"; },
    (v: any) => { v.processing.separation.sceneAcceptance = "PASSED"; },
    (v: any) => { v.processing.separation.workingImage.height--; },
    (v: any) => { v.processing.separation.starless.sha256 = "3".repeat(64); },
    (v: any) => { v.processing.separation.overlap = .5; },
    (v: any) => { v.levels.DETAIL.width = 2048; v.levels.DETAIL.height = 1856; v.levels.DETAIL.decodedRgb.bytes = 2048 * 1856 * 3; },
  ];
  for (const edit of edits) {
    const changed = structuredClone(p); edit(changed);
    assert.throws(() => assertPreparedNativeOpticalPublication(changed, p.reference, preparedNativeOpticalPublicationHash(changed)), /native_optical_publication_invalid/u);
  }
});

test("PS original restoration keeps the failed baseline, distinct composite identity and bounded truthful proof",()=>{
  // Metadata-only fixture; actual PS/pixels are verified by the offline owner.
  const p:any=preparedNativeOpticalFixture(true),id={bytes:128,sha256:"2".repeat(64)},restored={bytes:129,sha256:"3".repeat(64),width:1024,height:928};
  p.processing={...p.processing,producerVersion:"prepared-native-sxt-ps-restored-display-v1",colourUnit:"sxt-original-restored-display-estimate",
    separation:{method:"sxt",modelVersion:11,overlap:.2,inputUpsample:1,processingReceipt:id,reviewReceipt:id,
      workingImage:{...id,width:1024,height:928},starless:{...id,width:1024,height:928},fileReview:"NEEDS_REPAIR",sceneAcceptance:"MISSING"},
    restoration:{method:"photoshop-local-original-restoration-v1",processingReceipt:id,reviewReceipt:id,nativeReport:id,mask:id,editablePsd:id,
      restored,pixels:{corePixels:333,exteriorPixels:900000,coreChannelDifferences:0,exteriorChannelDifferences:0,featherMaximumVsEncodedNormalBlend:0,changedPixels:594},
      fileReview:"PASSED",sceneAcceptance:"MISSING"}};
  for(const level of OPTICAL_IMAGE_LEVELS){p.levels[level].format="png";p.levels[level].file=`${p.publicationId}-${level.toLowerCase()}.png`;}
  Object.assign(p.levels.DETAIL,{bytes:restored.bytes,sha256:restored.sha256});
  const hash=preparedNativeOpticalPublicationHash(p);assertPreparedNativeOpticalPublication(p,p.reference,hash);
  assert(preparedNativeOpticalSource({...p,publicationHash:hash}).limitations.some(line=>line.includes("原SXT文件仍需修复")));
  for(const edit of [
    (v:any)=>{v.processing.producerVersion="prepared-native-sxt-display-v1";v.processing.colourUnit="sxt-starless-display-estimate";v.processing.separation.fileReview="PASSED";},
    (v:any)=>{v.processing.separation.fileReview="PASSED";},(v:any)=>{v.processing.restoration.sceneAcceptance="PASSED";},
    (v:any)=>{v.processing.restoration.pixels.coreChannelDifferences=1;},(v:any)=>{v.processing.restoration.pixels.exteriorChannelDifferences=1;},
    (v:any)=>{v.processing.restoration.pixels.featherMaximumVsEncodedNormalBlend=2;},
    (v:any)=>{v.processing.restoration.pixels.exteriorPixels=1024*928;},
    (v:any)=>{v.processing.restoration.restored.sha256=id.sha256;v.levels.DETAIL.sha256=id.sha256;},
    (v:any)=>{delete v.processing.restoration.mask;},(v:any)=>{v.processing.restoration.restored.width--;},
  ]){const changed=structuredClone(p);edit(changed);assert.throws(()=>assertPreparedNativeOpticalPublication(changed,p.reference,preparedNativeOpticalPublicationHash(changed)),/publication_invalid/);}
});

test("background and denoised display stages bind their distinct final pixels, parent proofs and full supplied black", () => {
  for (const restored of [false, true]) for (const order of ["none", "after", "before"]) {
    const denoised = order !== "none", before = order === "before";
    const p: any = preparedNativeOpticalFixture(), id = { bytes: 128, sha256: "2".repeat(64) };
    const parent = { bytes: 129, sha256: "3".repeat(64), width: 1024, height: 928 };
    const display = { bytes: 130, sha256: "4".repeat(64), width: 1024, height: 928 };
    const denoisedDisplay = { bytes: 131, sha256: "5".repeat(64), width: 1024, height: 928 };
    p.processing = { ...p.processing, producerVersion: "prepared-native-source-background-display-v1",
      colourUnit: "source-excluded-srgb-background-display-estimate",
      separation: { method: "sxt", modelVersion: 11, overlap: .2, inputUpsample: 1, processingReceipt: id, reviewReceipt: id,
        workingImage: { ...id, width: 1024, height: 928 }, starless: { ...id, width: 1024, height: 928 },
        fileReview: restored ? "NEEDS_REPAIR" : "PASSED", sceneAcceptance: "MISSING" },
      ...(restored ? { restoration: { method: "photoshop-local-original-restoration-v1", processingReceipt: id, reviewReceipt: id,
        nativeReport: id, mask: id, editablePsd: id, restored: parent,
        pixels: { corePixels: 333, exteriorPixels: 900000, coreChannelDifferences: 0, exteriorChannelDifferences: 0,
          featherMaximumVsEncodedNormalBlend: 0, changedPixels: 594 }, fileReview: "PASSED", sceneAcceptance: "MISSING" } } : {}),
      background: { method: "source-excluded-srgb-display-background-v1", processingReceipt: id, reviewReceipt: id,
        parentDisplay: { ...(restored ? parent : id) }, display, exclusionMask: id, estimationMask: id, backgroundModel: id,
        boxSize: [128, 128], sourceDilation: 5, formula: "srgb-linear-subtract-clamp-negative-display-only",
        suppliedPixels: 1024 * 928, validBlackDisplayPixels: 22000, negativeChannelPixels: [23000, 20000, 25000],
        fileReview: "PASSED", sceneAcceptance: "MISSING" } };
    if (denoised) Object.assign(p.processing, {
      producerVersion: before ? "prepared-native-source-denoised-background-display-v1" : "prepared-native-source-background-denoised-display-v1",
      colourUnit: before ? "source-excluded-denoised-srgb-background-display-estimate" : "source-excluded-srgb-background-denoised-display-estimate",
      denoising: { method: before ? "nxt-srgb-source-display-denoise-v1" : "nxt-srgb-background-display-denoise-v1", processingReceipt: id, reviewReceipt: id,
        parentDisplay: { ...(before ? restored ? parent : id : display) }, modelInput: { ...(before ? restored ? parent : id : display) }, display: { ...denoisedDisplay }, vendor: id, cli: id, model: id,
        modelVersion: 3.1, denoise: .9, iterations: 1, overlap: .2, depth: "8U", changedPixels: 30000,
        suppliedPixels: 1024 * 928, fileReview: "PASSED", sceneAcceptance: "MISSING" },
    });
    if (before) p.processing.background.parentDisplay = { ...denoisedDisplay };
    for (const level of OPTICAL_IMAGE_LEVELS) {
      p.levels[level].format = "png"; p.levels[level].file = `${p.publicationId}-${level.toLowerCase()}.png`;
    }
    Object.assign(p.levels.DETAIL, { bytes: (denoised && !before ? denoisedDisplay : display).bytes, sha256: (denoised && !before ? denoisedDisplay : display).sha256 });
    const hash = preparedNativeOpticalPublicationHash(p);
    assertPreparedNativeOpticalPublication(p, p.reference, hash);
    const source = preparedNativeOpticalSource({ ...p, publicationHash: hash });
    assert(source.limitations.some(line => line.includes("全图像素")));
    assert(source.limitations.some(line => line.includes("没有变成缺测或透明")));
    if (denoised) {
      assert(source.limitations.some(line => line.includes("NXT ML3.1") && line.includes("此前阶段")));
      for (const edit of [
        (v: any) => { v.processing.denoising.method = before ? "nxt-srgb-background-display-denoise-v1" : "nxt-srgb-source-display-denoise-v1"; },
        (v: any) => { v.processing.producerVersion = before ? "prepared-native-source-background-denoised-display-v1" : "prepared-native-source-denoised-background-display-v1"; },
        (v: any) => { v.processing.producerVersion = "prepared-native-source-background-display-v1"; v.processing.colourUnit = "source-excluded-srgb-background-display-estimate"; Object.assign(v.levels.DETAIL, display); },
        (v: any) => { delete v.processing.denoising; },
        (v: any) => { v.processing.denoising.parentDisplay.sha256 = "f".repeat(64); },
        (v: any) => { v.processing.denoising.modelInput.bytes++; },
        (v: any) => { v.processing.denoising.display.width--; },
        (v: any) => { v.processing.denoising.modelVersion = 11; },
        (v: any) => { v.processing.denoising.changedPixels = 0; },
        (v: any) => { v.processing.denoising.suppliedPixels--; },
        (v: any) => { v.processing.denoising.sceneAcceptance = "PASSED"; },
      ]) {
        const changed = structuredClone(p); edit(changed);
        assert.throws(() => assertPreparedNativeOpticalPublication(changed, p.reference, preparedNativeOpticalPublicationHash(changed)), /publication_invalid/);
      }
    }
    for (const edit of [
      (v: any) => { v.processing.colourUnit = "sxt-original-restored-display-estimate"; },
      (v: any) => { v.processing.producerVersion = "prepared-native-sxt-display-v1"; v.processing.colourUnit = "sxt-starless-display-estimate"; },
      (v: any) => { delete v.processing.background; },
      (v: any) => { v.processing.background.parentDisplay.sha256 = "f".repeat(64); },
      (v: any) => { v.processing.background.display.width--; },
      (v: any) => { v.levels.DETAIL.sha256 = v.processing.background.parentDisplay.sha256; },
      (v: any) => { v.processing.background.suppliedPixels--; },
      (v: any) => { v.processing.background.validBlackDisplayPixels = -1; },
      (v: any) => { v.processing.background.negativeChannelPixels[0] = 1024 * 928 + 1; },
      (v: any) => { v.processing.background.formula = "brightness-alpha-mask"; },
      (v: any) => { v.processing.background.boxSize = [0, 128]; },
      (v: any) => { v.processing.background.fileReview = "PENDING_REVIEW"; },
      (v: any) => { v.processing.background.sceneAcceptance = "PASSED"; },
    ]) {
      const changed = structuredClone(p); edit(changed);
      assert.throws(() => assertPreparedNativeOpticalPublication(changed, p.reference, preparedNativeOpticalPublicationHash(changed)), /publication_invalid/);
    }
  }
});
