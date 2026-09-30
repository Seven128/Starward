import assert from "node:assert/strict";
import test from "node:test";
import { matchingSkyTargetInstantResponse } from "./sky-target-instant-response.ts";
import type { ApiEnvelope, SkyTargetInstantData } from "@starward/miniapp-contracts";

const binding = { spotId: "spot:test", contextId: "ctx:test", contextRevision: 2,
  contextFingerprint: "context-fingerprint", at: "2026-08-06T13:00:24.087Z" };
const source = { id: "astronomy:test" } as SkyTargetInstantData["targets"][number]["source"];
const target = { targetId: "target:jupiter", displayName: "木星", type: "PLANET", window: null,
  direction: "124°", azimuthDeg: 124, altitudeDeg: 32, reason: "按当前时刻计算", source,
  confidence: 0.85 } as const;
const envelope = (data: SkyTargetInstantData): ApiEnvelope<SkyTargetInstantData> => ({
  apiVersion: "v2", data, dataState: "FRESH", generatedAt: binding.at, validAt: binding.at,
  etag: "test-etag", requestId: "test-request", sources: [source], warnings: [],
});

test("fine target response distinguishes a genuine empty result from a missing or stale one", () => {
  const empty = envelope({ ...binding, targets: [] });
  assert.equal(matchingSkyTargetInstantResponse(empty, binding), empty);
  assert.equal(matchingSkyTargetInstantResponse({ ...empty, dataState: "SAMPLE_DATA" }, binding).dataState,
    "SAMPLE_DATA");
  assert.equal(matchingSkyTargetInstantResponse({ ...empty, dataState: "PARTIAL" }, binding).dataState, "PARTIAL");
  assert.throws(() => matchingSkyTargetInstantResponse({ ...empty, dataState: "UNAVAILABLE" }, binding),
    /availability_invalid/);
  assert.throws(() => matchingSkyTargetInstantResponse({ ...empty, dataState: "EXPIRED" }, binding),
    /availability_invalid/);
  assert.throws(() => matchingSkyTargetInstantResponse({ ...empty, validAt: "2026-08-06T13:00:00.000Z" }, binding),
    /metadata_invalid/);
  assert.throws(() => matchingSkyTargetInstantResponse({ ...empty, contextRevision: 1 }, binding),
    /metadata_invalid/);
  assert.throws(() => matchingSkyTargetInstantResponse(envelope({ ...binding, targets: undefined as never }), binding),
    /target_frame_0:targets/);
  assert.throws(() => matchingSkyTargetInstantResponse(envelope({ ...binding, at: "2026-08-06T13:00:00.000Z",
    targets: [target] }), binding), /binding_invalid/);
  assert.throws(() => matchingSkyTargetInstantResponse(envelope({ ...binding, contextRevision: 1,
    targets: [target] }), binding), /binding_invalid/);
  assert.equal(matchingSkyTargetInstantResponse(envelope({ ...binding, targets: [target] }), binding).data.targets[0]?.targetId,
    target.targetId);
});
