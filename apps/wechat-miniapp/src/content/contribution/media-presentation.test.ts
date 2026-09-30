import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { contributionValidationAnchor } from "./validation-anchor";

function declarations(path: URL, names: string[]) {
  const source = ts.createSourceFile(path.pathname, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  return source.statements.filter((node) => ts.isFunctionDeclaration(node) && names.includes(node.name?.text ?? ""))
    .map((node) => node.getText(source)).join("\n").replace(/export /gu, "");
}

type Node = { type: string; props: Record<string, unknown> & { onClick?: () => void }; children: unknown[] };
function tree(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(tree);
  if (!value || typeof value !== "object" || !("children" in value)) return [];
  return [value as Node, ...(value as Node).children.flatMap(tree)];
}

function renderer() {
  const source = declarations(new URL("../../components/soft-button.tsx", import.meta.url), ["SoftButton"])
    + declarations(new URL("./contribution-media-history.tsx", import.meta.url), ["ContributionMediaRecoveryAction", "mediaStateText"])
    + declarations(new URL("./contribution-editor.tsx", import.meta.url), ["CandidatePhotoGroup"]);
  return vm.runInNewContext(ts.transpileModule(source + "\nCandidatePhotoGroup;", {
    compilerOptions: { target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, jsxFactory: "h", jsxFragmentFactory: "Fragment" },
  }).outputText, {
    View: "view", Text: "text", Button: "button", Image: "image", StatusPanel: "status", Fragment: "fragment",
    h(type: string | ((props: unknown) => unknown), props: Record<string, unknown> | null, ...children: unknown[]) {
      return typeof type === "function" ? type({ ...props, children: children.length === 1 ? children[0] : children })
        : { type, props: props ?? {}, children };
    },
  });
}

test("new-place pending and expired photos can recover their own upload even when a preview is present", () => {
  const retried: string[] = [];
  const nodes = tree(renderer()({ kind: "site", form: {
    currentMedia: [{ uploadId: "pending", kind: "site", state: "PENDING" },
      { uploadId: "expired", kind: "site", state: "EXPIRED" }, { uploadId: "ready", kind: "site", state: "UPLOADED" }],
    candidateMediaPreviews: { expired: "owned-preview" }, commandBusy: false,
  }, commands: { retryMedia: (id: string) => retried.push(id) }, failedIds: [], onRetry() {} }));
  const actions = nodes.filter((node) => node.type === "button" && String(node.props.className).includes("contribution-photo-recovery"));
  assert.equal(actions.length, 2, "each unfinished photo must expose its own recovery action");
  for (const action of actions) action.props.onClick?.();
  assert.deepEqual(retried, ["pending", "expired"]);
  assert(nodes.some((node) => node.children.some((value) => typeof value === "string" && value.includes("已过期"))),
    "a thumbnail must not conceal an expired upload state");
});

test("new-place media recovery controls cannot run during another command", () => {
  let retried = 0;
  const nodes = tree(renderer()({ kind: "parking", form: {
    currentMedia: [{ uploadId: "pending", kind: "parking", state: "PENDING" }],
    candidateMediaPreviews: {}, commandBusy: true,
  }, commands: { retryMedia: () => retried++ }, failedIds: [], onRetry() {} }));
  const action = nodes.find((node) => node.type === "button" && String(node.props.className).includes("contribution-photo-recovery"));
  assert.ok(action);
  assert.equal(action.props.disabled, true);
  action.props.onClick?.();
  assert.equal(retried, 0);
});

test("new-place upload validation locates the actual unfinished photo group while generic feedback keeps its anchor", () => {
  assert.equal(contributionValidationAnchor("contribution-media-upload", [
    { kind: "parking", state: "UPLOADED" }, { kind: "site", state: "PENDING" },
  ]), "contribution-media-site");
  assert.equal(contributionValidationAnchor("contribution-media-upload", [{ kind: "toilet", state: "EXPIRED" }]), "contribution-media-toilet");
  assert.equal(contributionValidationAnchor("contribution-media-upload"), "feedback-media");
  assert.equal(contributionValidationAnchor("contribution-media-upload", [{ state: "PENDING" }]), "contribution-media-site");
});
