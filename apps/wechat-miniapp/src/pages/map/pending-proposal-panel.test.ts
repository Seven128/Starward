import assert from "node:assert/strict";
import test from "node:test";
import type { ContributionSubmission } from "@starward/miniapp-contracts";
import { pendingProposalPanelValues } from "./pending-proposal-model.ts";

test("pending proposal panel projects only the submitted candidate fields without inventing nearby facts", () => {
  const submission = {
    candidateLocation: { displayName: "位置原名", region: "深圳", wgs84: { system: "WGS84", latitude: 22.5, longitude: 114.1 } },
    candidateProfile: { fields: { name: "海风观星台", address: "东岸观景台", openness: "开放", parking: "有" }, media: {} },
  } as unknown as ContributionSubmission;
  const value = pendingProposalPanelValues(submission);
  assert.equal(value.name, "海风观星台");
  assert.equal(value.address, "东岸观景台");
  assert.deepEqual(value.opening, ["开放", "暂无数据"]);
  assert.deepEqual(value.facilities[0], ["停车", "有", "暂无数据"]);
  assert.equal(value.safety, "暂无数据");
  assert.deepEqual(value.media, []);
});

test("pending proposal media keeps the submitted category order and identity", () => {
  const submission = {
    candidateProfile: {
      fields: {},
      media: { parking: ["upload:parking"], toilet: ["upload:toilet"], site: ["upload:site"] },
    },
  } as unknown as ContributionSubmission;
  assert.deepEqual(pendingProposalPanelValues(submission).media, [
    { uploadId: "upload:parking", label: "停车照片" },
    { uploadId: "upload:toilet", label: "洗手间照片" },
    { uploadId: "upload:site", label: "现场照片" },
  ]);
});
