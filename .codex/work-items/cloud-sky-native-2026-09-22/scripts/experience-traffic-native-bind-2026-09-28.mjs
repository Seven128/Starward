import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";
import sdk from "miniprogram-automator";
import { fingerprintBundle } from "../../../../tools/miniapp/release-bundle-artifact.mjs";
import { boundedWechatConnect, boundWechatProtocol } from "../../../../tools/miniapp/wechat-protocol.mjs";

const root=path.resolve("."), evidence=path.join(root,".codex/work-items/cloud-sky-native-2026-09-22/evidence");
const output=path.join(evidence,"experience-traffic-native-binding-2026-09-28.json");
assert.ok(!await fs.access(output).then(()=>true,()=>false),"preserve previous evidence");
const read=async name=>JSON.parse(await fs.readFile(path.join(evidence,name),"utf8"));
const actual=await read("experience-traffic-native-2026-09-28.json");
const candidate=await read("experience-combined-clean-v11-candidate-2026-09-28.json");
const previous=await read("experience-imagery-combined-binding-2026-09-28.json");
const fingerprint=await fingerprintBundle(path.join(root,candidate.bundle));
assert.equal(fingerprint.sha256,candidate.fingerprint.sha256);
assert.equal(fingerprint.sha256,actual.candidateSha256);
assert.equal(fingerprint.fileCount,257);
const captureBinding=[];
for(const capture of actual.captures){
  assert.match(capture.filename,/^[a-z0-9-]+\.png$/);
  const bytes=await fs.readFile(path.join(evidence,capture.filename)),png=PNG.sync.read(bytes);
  assert.equal(png.width,capture.width);assert.equal(png.height,capture.height);
  captureBinding.push({filename:capture.filename,width:png.width,height:png.height,sha256:createHash("sha256").update(bytes).digest("hex"),bytes:bytes.length});
}
assert.equal(actual.cancel.activeAfterCapture.length,1);
assert.equal(actual.cancel.activeAfterCapture[0].controlledResourceDelayMs,30000);
assert.equal(actual.cancel.canceledImage.controlledResourceOutcome,"downstream-cancel");
assert.equal(actual.cancel.canceledImage.downstreamFinished,false);
assert.equal(actual.cancel.canceledImage.downstreamClosedBeforeFinish,true);
assert.ok(actual.cancel.canceledImage.observedDurationMs<30000);
assert.deepEqual(actual.cancel.filesAfterCancel,[{object:"M 42",level:"OVERVIEW",bytes:8226}]);
assert.deepEqual(actual.cancel.filesAfterRetry,[{object:"M 42",level:"DETAIL",bytes:23697}]);
assert.equal(actual.cancel.retryImage.upstreamBodyBytes,23697);
assert.equal(actual.cancel.retryImage.downstreamFinished,true);
assert.equal(actual.cancel.heldResourceCountAfter,0);
assert.equal(actual.encodedFiles.onSource.count,0);
assert.equal(actual.encodedFiles.historicalPreservedOnSource,true);
assert.equal(actual.encodedFiles.historicalPreservedOnFinal,true);
assert.equal(actual.progression.totalM31ImageBodyBytes,55607);
const program=await boundedWechatConnect(()=>sdk.launcher.connectTool({wsEndpoint:"ws://127.0.0.1:9444"}),5000);
boundWechatProtocol(program,5000);
try{
  const page=await program.currentPage();assert.equal(page.path,"sky/detail/index");
  const state=await program.callWxMethod("getStorageSync","starward.wechat-miniapp.state.current"),active=state.observationContext;
  assert.equal(active.location.kind,"FORMAL_SPOT");
  // Never place either side's private identity in an assertion error/output.
  assert.ok(active.contextId===decodeURIComponent(page.query.contextId),"route_context_identity_mismatch");
  assert.ok(active.location.spotId===decodeURIComponent(page.query.spotId),"route_location_identity_mismatch");
  const response=await fetch("http://127.0.0.1:8789/v2/observation-contexts/"+encodeURIComponent(active.contextId),{signal:AbortSignal.timeout(8000)});
  assert.equal(response.status,200);const context=(await response.json()).data;
  assert.ok(context.contextId===active.contextId,"server_context_identity_mismatch");
  assert.equal(context.selectedAtUtc,active.selectedAtUtc);assert.equal(context.revision,active.revision);
  assert.equal(context.selectedAtUtc,"2026-09-28T16:00:00.000Z");assert.equal(context.revision,8);
  const description=await (await page.$(".sky-orientation-canvas")).attribute("aria-label");
  assert.equal(description,actual.final.state.description);
  assert.equal(await (await page.$(".sky-located-object")).attribute("aria-label"),actual.final.state.located);
  for(const selector of [".sky-object-modal",".sky-object-tracking-status",".sky-orientation-time-ruler__track"])
    assert.equal(await page.$(selector),null);
  const landmark=(await (await fetch("http://127.0.0.1:8789/v2/sky/landscape/manifest")).json());
  const moon=(await (await fetch("http://127.0.0.1:8789/v2/sky/moon/coverage/manifest")).json());
  assert.equal(landmark.publicationHash,previous.source.landscapePublicationHash);
  assert.equal(moon.publicationHash,previous.source.moonPublicationHash);
  assert.equal(moon.image.sha256,previous.source.moonImageHash);
  assert.ok(actual.final.paintedLandscapeSource.includes(landmark.publicationHash+"/panorama-2048.png"));
  const proxy=await (await fetch("http://127.0.0.1:8791/__sky_test/traffic-status")).json();
  const fault=await (await fetch("http://127.0.0.1:8791/__sky_test/context-status")).json();
  assert.equal(fault.mode,"pass");assert.equal(proxy.resourceMode,"pass");assert.equal(proxy.heldResourceCount,0);assert.equal(proxy.active.length,0);
  const record={scope:"Current candidate fingerprint, actual capture files, native accepted Context/route/BFF/Canvas and unchanged publications. No phone, whole-quality, memory/FPS/cloud-cost or independent-review acceptance.",
    candidate:{bundle:candidate.bundle,...fingerprint,rawPackageBytes:candidate.rawPackageBytes},captureBinding,
    current:{selectedAtUtc:context.selectedAtUtc,revision:context.revision,localDate:context.localDate,timezone:context.timezone,locationKind:context.location.kind,
      routeMatchesAcceptedIdentity:true,serverMatchesAcceptedIdentity:true,description,canvasSize:await (await page.$(".sky-orientation-canvas")).size(),
      theme:await (await page.$(".sky-orientation-page")).attribute("class"),contextFaultMode:fault.mode,resourceMode:proxy.resourceMode,heldResourceCount:proxy.heldResourceCount,activeProxyRequests:proxy.active.length},
    publications:{landscapePublicationHash:landmark.publicationHash,moonPublicationHash:moon.publicationHash,moonImageHash:moon.image.sha256,unchanged:true},
    cancellation:{observedMs:actual.cancel.canceledImage.observedDurationMs,coarseFileBytes:8226,retriedDetailFileBytes:23697,partialDetailFileRemained:false},
    phoneAcceptance:"unverified",independentReview:"unavailable",goal:"active, unbudgeted, incomplete"};
  await fs.writeFile(output,JSON.stringify(record,null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify({candidateHash:fingerprint.sha256,captures:captureBinding.length,selectedAtUtc:context.selectedAtUtc,revision:context.revision,
    identityReadbackVerified:true,publicationsUnchanged:true,proxyPassAndIdle:true,cancellation:record.cancellation}));
}finally{await program.disconnect();}
