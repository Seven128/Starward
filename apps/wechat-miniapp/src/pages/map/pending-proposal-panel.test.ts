import assert from "node:assert/strict";
import test from "node:test";
import type { ContributionSubmission } from "@starward/miniapp-contracts";
import { pendingProposalPanelValues } from "./pending-proposal-model.ts";
import { readFileSync } from "node:fs";
import ts from "typescript";

test("formal and private panel handles remain in the same scroll document as their identity", () => {
  for (const file of ["spot-panel.tsx", "pending-proposal-panel.tsx"]) {
    const source = ts.createSourceFile(file, readFileSync(new URL(file, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const placements: ts.Identifier[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isIdentifier(node) && node.text === "panelHandle" && !ts.isVariableDeclaration(node.parent)) placements.push(node);
      ts.forEachChild(node, visit);
    };
    visit(source);
    assert.equal(placements.length, 1, `${file}: one retained handle placement across all extents and media states`);
    let ancestor: ts.Node | undefined = placements[0];
    while (ancestor && !(ts.isJsxElement(ancestor) && ancestor.openingElement.tagName.getText(source) === "ScrollView")) ancestor = ancestor.parent;
    assert.ok(ancestor && ts.isJsxElement(ancestor), `${file}: handle scrolls with the document instead of remaining panel chrome`);
    const children = (ancestor as ts.JsxElement).children.flatMap(child => ts.isJsxElement(child) && child.openingElement.tagName.getText(source) === "Block" ? child.children : [child]);
    const index = children.findIndex(child => child.getText(source).includes("panelHandle"));
    const next = children.slice(index + 1).find(child => !ts.isJsxText(child) || child.getText(source).trim());
    assert.ok(next?.getText(source).includes('className="spot-panel__identity"'), `${file}: handle and name share adjacent retained document content`);
  }
});

test("pending proposal panel projects only the submitted candidate fields without inventing nearby facts", () => {
  const submission = {
    candidateLocation: { displayName: "位置原名", region: "深圳", wgs84: { system: "WGS84", latitude: 22.5, longitude: 114.1 } },
    candidateProfile: { fields: { name: "海风观星台", address: "东岸观景台", openness: "开放", parking: "有" }, media: {} },
  } as unknown as ContributionSubmission;
  const value = pendingProposalPanelValues(submission);
  assert.equal(value.name, "海风观星台");
  assert.equal(value.address, "东岸观景台");
  assert.deepEqual(value.opening, ["开放", "暂无数据"]);
  assert.deepEqual(value.facilities[0], ["停车", "有", undefined]);
  assert.deepEqual(value.access, ["暂无数据", undefined]);
  assert.equal(value.road, undefined);
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

test("a submitted literal placeholder word remains candidate data, while missing identity falls back", () => {
  const submission = {
    candidateLocation: { displayName: "位置原名", region: "深圳" },
    candidateProfile: { fields: { name: " 暂无数据 ", address: "暂无数据", accessNote: "暂无数据", parkingNote: "暂无数据" }, media: {} },
  } as unknown as ContributionSubmission;
  assert.equal(pendingProposalPanelValues(submission).name, "暂无数据");
  assert.equal(pendingProposalPanelValues(submission).address, "暂无数据");
  assert.equal(pendingProposalPanelValues(submission).access[1], "暂无数据");
  assert.equal(pendingProposalPanelValues(submission).facilities[0][2], "暂无数据");
  const missing = { ...submission, candidateProfile: { fields: { name: "  ", address: "" }, media: {} } } as unknown as ContributionSubmission;
  assert.equal(pendingProposalPanelValues(missing).name, "位置原名");
  assert.equal(pendingProposalPanelValues(missing).address, "深圳");
});
