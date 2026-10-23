import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { MINIAPP_DESIGN } from "../../theme/design-tokens";
import { sharedButtonTestBoundary } from "../../components/shared-button-test-support";

/** Exercise the production component with cached account data and a native media return. */
function avatarComponent() {
  const source = readFileSync(new URL("./my-avatar.tsx", import.meta.url), "utf8");
  const slots: any[] = [];
  let cursor = 0, saves = 0;
  const state = { mode: "DAY", mapResetVersion: 1, notify() {} };
  let foreground = true;
  const queryOptions: any[] = [];
  const presentation = { visible: true, isCurrent: () => foreground };
  let shown = () => {}, hidden = () => {};
  const saved = { mimeType: "image/png", dataBase64: "TEST-avatar", zoom: 1.65 };
  const profile = { revision: 3, avatar: { version: "TEST-avatar-version" } };
  const buttons = sharedButtonTestBoundary((type: unknown, props: unknown) => ({ type, props }), "button");
  const element = buttons.element;
  const module = { exports: {} as any };
  const store = Object.assign((selector: (value: typeof state) => unknown) => selector(state), { getState: () => state });
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, {
    module, exports: module.exports,
    require(name: string) {
      if (name === "react/jsx-runtime") return { jsx: element, jsxs: element, Fragment: "fragment" };
      if (name === "react") return {
        useRef(initial: unknown) { return slots[cursor++] ??= { current: initial }; },
        useState(initial: unknown) {
          const index = cursor++; if (!(index in slots)) slots[index] = initial;
          return [slots[index], (next: unknown) => { slots[index] = typeof next === "function" ? (next as Function)(slots[index]) : next; }];
        },
        useEffect() { cursor++; },
      };
      if (name === "@tarojs/components") return { Button: "button", Image: "image", Slider: "slider", Text: "text", View: "view" };
      if (name === "@/components/shared-button-press") return buttons;
      if (name === "@tarojs/taro") return { default: { chooseMedia: async () => ({ tempFiles: [{ tempFilePath: "TEST-avatar.png", size: 100 }] }) }, useDidHide() {}, useDidShow() {} };
      if (name.endsWith("page-presentation")) return { usePresentedPageLifecycle: ({ show, hide }: { show: () => void; hide: () => void }) => {
        shown = show; hidden = hide; return presentation;
      } };
      if (name.endsWith("semantic-asset")) return { SemanticIcon: "semantic-icon" };
      if (name.endsWith("loading-indicator")) return { LoadingIndicator: "loading" };
      if (name.endsWith("use-resource-query")) return { useResourceQuery: (options: any) => {
        queryOptions.push(options);
        return { data: { data: options.queryKey[0] === "account-profile" ? profile : saved } };
      } };
      if (name.endsWith("api-client")) return { currentDraftUserId: () => "account-a", saveAccountAvatar: () => { saves++; } };
      if (name.endsWith("query-client")) return { miniappQueryClient: {} };
      if (name.endsWith("app-store")) return { useAppStore: store };
      if (name.endsWith("native-back-boundary")) return { NativeBackBoundary: "native-back" };
      if (name.endsWith("red-light-handoff")) return { useRedLightHandoff: () => ({ active: false, warning: null, confirm: async () => true }) };
      if (name.endsWith("use-account-operation")) return { useAccountOperation: (_kind: string, pending: (value: boolean) => void) => ({ begin() { pending(true); return { assertCurrent() {}, isCurrent: () => true, native: (run: () => unknown) => run(), release: () => pending(false) }; } }) };
      if (name.endsWith("design-tokens")) return { MINIAPP_DESIGN };
      throw new Error(`unexpected component dependency: ${name}`);
    },
  });
  const render = () => { cursor = 0; queryOptions.length = 0; return module.exports.MyAvatar({ owner: "account-a" }); };
  function nodes(tree: any, predicate: (node: any) => boolean): any[] {
    const result: any[] = [];
    const visit = (node: any) => { if (Array.isArray(node)) { node.forEach(visit); return; } if (!node?.props) return; if (predicate(node)) result.push(node); visit(node.props.children); };
    visit(tree); return result;
  }
  async function preview() {
    nodes(render(), n => n.props["data-control"] === "my-avatar-action")[0].props.onClick();
    nodes(render(), n => n.props["data-control"] === "my-avatar-album")[0].props.onClick();
    await new Promise(resolve => setImmediate(resolve));
    return render();
  }
  return { state, saved, profile, render, nodes, preview, queryOptions,
    hide() { foreground = presentation.visible = false; hidden(); },
    show() { foreground = presentation.visible = true; shown(); },
    retireBeforeRender() { foreground = false; },
    get saves() { return saves; } };
}

test("observation hides the saved color avatar without discarding it, and day restores the same image and crop", () => {
  const owner = avatarComponent();
  const image = (tree: unknown) => owner.nodes(tree, n => n.props.className === "profile-summary__avatar-image");
  const before = image(owner.render())[0].props;
  assert.equal(before.src, "data:image/png;base64,TEST-avatar");
  assert.equal(before.style.transform, "scale(1.65)");
  owner.state.mode = "OBSERVATION";
  assert.equal(image(owner.render()).length, 0, "cached color media must not render automatically in red-light mode");
  owner.state.mode = "DAY";
  assert.deepEqual(image(owner.render())[0].props, before);
  assert.equal(owner.saved.dataBase64, "TEST-avatar");
  assert.equal(owner.profile.revision, 3);
  assert.equal(owner.saves, 0);
});

test("the avatar preview uses red native slider colors after explicit media choice, while day keeps its adopted colors", async () => {
  const owner = avatarComponent();
  owner.state.mode = "OBSERVATION";
  const preview = await owner.preview();
  const slider = owner.nodes(preview, n => n.type === "slider")[0].props;
  assert.equal(slider.activeColor, "#d84a3c");
  assert.equal(slider.backgroundColor, "#7a1e18");
  assert.equal(slider.blockColor, "#ff6b58");
  assert.equal(owner.nodes(preview, n => n.props.className === "profile-summary__avatar-image").length, 0);
  owner.state.mode = "DAY";
  const day = owner.nodes(owner.render(), n => n.type === "slider")[0].props;
  assert.equal(day.activeColor, "#365D67");
  assert.equal(day.backgroundColor, "#D8DEDF");
  assert.equal(day.blockColor, undefined);
  assert.equal(owner.saves, 0);
});

test("hidden retained My suspends both avatar readers and rejects a stale avatar entry", () => {
  const owner = avatarComponent();
  const action = owner.nodes(owner.render(), n => n.props["data-control"] === "my-avatar-action")[0];
  owner.retireBeforeRender();
  action.props.onClick();
  assert.equal(owner.nodes(owner.render(), n => n.props.className === "my-avatar-sheet").length, 0);
  owner.hide();
  const hidden = owner.render();
  assert.equal(owner.queryOptions.length, 2);
  assert.ok(owner.queryOptions.every(options => options.enabled === false));
  assert.equal(owner.nodes(hidden, n => n.props["data-control"] === "my-avatar-action")[0].props.disabled, true);
  owner.show();
  const shown = owner.render();
  assert.ok(owner.queryOptions.every(options => options.enabled === true));
  assert.equal(owner.nodes(shown, n => n.props.className === "profile-summary__avatar-image")[0].props.src,
    "data:image/png;base64,TEST-avatar");
  assert.equal(owner.saves, 0);
});
