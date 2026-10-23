import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { pagePresentationForTest } from "../navigation/page-presentation-test-support";

async function notificationOwner(primary?: "map" | "my") {
  const h = await pagePresentationForTest({ ...(primary ? { primary } : {}), modules: {
    "@/components/shared-button-press": { SharedButton: "Button" },
    "./semantic-asset": { SemanticIcon: "Icon" },
    "@/theme/native-metrics": { nativeNavigationInsets: () => ({ safeTop: 97 }) },
  } });
  return { h, owner: h.load("components/notification.tsx") };
}

test("passive floating feedback can be dismissed by tapping its full message", async () => {
  const { h, owner } = await notificationOwner();
  try {
    let dismissed = 0;
    const notification = { id: "empty", placement: "floating", tone: "info", title: "当前区域暂无观星点", body: "" };
    const message = owner.NotificationComponent({ notification, onDismiss: () => dismissed++ });
    assert.equal(message.type, "Button");
    message.props.onClick(); assert.equal(dismissed, 1);
    const actionable = owner.NotificationComponent({ notification: { ...notification, action: { label: "重试", route: "/pages/map/index" } }, onDismiss: () => dismissed++ });
    assert.equal(actionable.props.onClick, undefined, "a recovery message keeps a separate action instead of passive body dismissal");
    assert.equal(dismissed, 1);
  } finally { await h.dispose(); }
});

test("notification recovery reaches primary pages through their owner and ordinary pages through native push", async () => {
  const { h, owner } = await notificationOwner("map");
  try {
    const action = (route: string, onAction?: () => void) => {
      const tree = owner.NotificationComponent({ notification: { id: "recovery", placement: "inline", tone: "info", title: "恢复",
        action: { label: "继续", route } }, onAction });
      tree.props.children.find((child: any) => child?.type === "Button").props.onClick();
    };
    action("/pages/my/index"); await h.settle();
    assert.equal(h.controller.getSnapshot().route, "pages/my/index");
    action("/pages/map/index"); await h.settle();
    assert.equal(h.controller.getSnapshot().route, "pages/map/index");
    assert.equal(h.calls.length, 0, "primary actions reuse the physical Map through the real dispatcher");
    action("/pages/auth/index"); await h.settle();
    assert.equal(h.calls.length, 1); assert.equal(h.calls[0]!.kind, "navigateTo");
    assert.equal(h.calls[0]!.url, "/pages/auth/index");
    h.calls[0]!.succeed(); await h.settle();
    let domainActions = 0;
    action("/pages/my/index", () => { domainActions++; }); await h.settle();
    assert.equal(domainActions, 1, "an explicit recovery command retains domain ownership");
    assert.equal(h.controller.getSnapshot().route, "pages/map/index");
    assert.equal(h.calls.length, 1);
  } finally { await h.dispose(); }
});

test("the production floating host stops rendering on hide, resumes on show, and owns only its effective foreground", async () => {
  let safeTop: number | undefined = 97;
  const h = await pagePresentationForTest({ primary: "map", modules: {
    "@/theme/native-metrics": { nativeNavigationInsets: () => ({ safeTop }) },
    "@/components/shared-button-press": { SharedButton: "button" },
    "./semantic-asset": { SemanticIcon: "icon" },
  } });
  h.modules["@tarojs/components"] = { View: h.leaf("view"), ScrollView: h.leaf("scroll"), Text: "text" };
  Object.assign(h.taro, { createIntersectionObserver: () => ({ relativeTo() { return this; }, relativeToViewport() { return this; },
    observe(_selector: string, callback: (result: { intersectionRatio: number }) => void) { callback({ intersectionRatio: 1 }); }, disconnect() {} }) });
  const { FloatingNotificationHost } = h.load("components/notification.tsx");
  const { enqueueNotification } = h.load("state/notification.ts");
  const { currentNotificationPageRoute } = h.load("state/notification-page-route.ts");
  const presentation = h.load("navigation/page-presentation.tsx");
  const my = presentation.createPrimaryPagePresentation(h.controller, "pages/my/index", presentation.createPresentedPageBack());
  const activeHost = () => h.leaves.get("view")?.filter(props => props.className === "notification-host") ?? [];
  const scroll = () => h.leaves.get("scroll")?.at(-1);
  const visibleTimers = () => [...h.timers.values()].filter(timer => timer.delay === 3000).length;
  const add = async (id: string, pageRoute: string) => h.changeState({ notifications: enqueueNotification(h.store.getState().notifications,
    { id, pageRoute, owner: "host-test", placement: "floating", tone: "info", title: id, body: "" }, h.store.getState().notifications.length + 1) });
  function MyHost() {
    h.React.useSyncExternalStore(h.controller.subscribe, h.controller.getSnapshot, h.controller.getSnapshot);
    return h.create(presentation.PagePresentationProvider, { value: my.snapshot() }, h.create(FloatingNotificationHost));
  }
  function Fixture() { return h.create(h.React.Fragment, null, h.create(FloatingNotificationHost), h.create(MyHost)); }
  try {
    await h.render(Fixture);
    assert.equal(activeHost().length, 1); assert.equal(currentNotificationPageRoute(), "pages/map/index");
    assert.equal(activeHost()[0].style["--notification-top"], "97px");
    safeTop = 120; await h.resize();
    assert.equal(activeHost()[0].style["--notification-top"], "120px", "resize refreshes native capsule clearance");
    await h.hide(); assert.equal(activeHost().length, 0); assert.equal(visibleTimers(), 0);
    safeTop = 105; await h.show();
    assert.equal(activeHost().length, 1); assert.equal(activeHost()[0].style["--notification-top"], "105px");
    safeTop = undefined; await h.resize();
    assert.equal(activeHost()[0].style["--notification-top"], undefined, "unavailable native metrics retain the CSS fallback");
    await add("first-notice", "pages/map/index");
    const nodeId = h.load("components/notification-visibility.ts").floatingNotificationNodeId;
    assert.equal(scroll().scrollIntoView, nodeId(h.store.getState().notifications[0]));
    await add("new-head-after-scrolling", "pages/map/index");
    assert.equal(scroll().scrollIntoView, nodeId(h.store.getState().notifications[0]), "new queue head asks native scroller to reveal it");
    assert.equal(visibleTimers(), 2);
    const mapTimerCallbacks = [...h.timers.values()].filter(timer => timer.delay === 3000).map(timer => timer.callback);
    await h.update(() => h.controller.openMy());
    assert.equal(activeHost().length, 1); assert.equal(currentNotificationPageRoute(), "pages/my/index");
    assert.equal(scroll().scrollIntoView, "", "My must not scroll to its retained Map host's notice");
    assert.equal(visibleTimers(), 0, "the hidden physical Map host releases both notice timers");
    await h.update(() => { for (const callback of mapTimerCallbacks) callback(); });
    assert.equal(h.store.getState().notifications.length, 2, "late timers cannot dismiss hidden messages");
    await add("my-notice", "pages/my/index");
    assert.equal(scroll().scrollIntoView, nodeId(h.store.getState().notifications[0]));
    assert.equal(visibleTimers(), 1, "only My's visible notification owns a timer");
    await h.hide(); assert.equal(activeHost().length, 0); assert.equal(visibleTimers(), 0);
    await h.show(); assert.equal(activeHost().length, 1); assert.equal(visibleTimers(), 1);
    await h.update(() => h.controller.closeMy());
    assert.equal(activeHost().length, 0); assert.equal(visibleTimers(), 0, "both hosts suspend through the exit transition");
    await h.update(() => h.controller.finishTransition(h.controller.getSnapshot().transitionTicket));
    assert.equal(activeHost().length, 1); assert.equal(currentNotificationPageRoute(), "pages/map/index");
    assert.equal(visibleTimers(), 2); assert.equal(h.store.getState().notifications.length, 3);
  } finally { await h.dispose(); }
});

test("page and event-modal composition keeps one floating host outside scroll content", () => {
  const owners = [
    "pages/map/index", "pages/map/search-page", "pages/auth/index", "features/my/my-library-page",
    "features/sky/spot-sky-page", "features/spot/spot-detail-page", "components/source-page",
    "content/article/detail/index", "content/plan/detail/plan-editor-page", "content/plan/list/index", "content/contribution/index",
    "content/event/modal-host-page",
    "content/settings/index", "content/profile/links/index", "content/import/index",
  ];
  for (const owner of owners) {
    const source = readFileSync(new URL(`../${owner}.tsx`, import.meta.url), "utf8");
    const ast = ts.createSourceFile(owner, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let roots = 0;
    const visit = (node: ts.Node) => {
      if (ts.isJsxElement(node) && node.openingElement.attributes.properties.some((prop) =>
        ts.isJsxAttribute(prop) && prop.name.getText(ast) === "className" &&
        (owner === "components/source-page" ? /\bsource-page\b/.test(prop.getText(ast)) : /\b(themeClass|presentationClass)\b/.test(prop.getText(ast))) &&
        !prop.getText(ast).includes("map-my-presentation"))) {
        roots += 1;
        const hosts = node.children.filter((child) => ts.isJsxSelfClosingElement(child) && child.tagName.getText(ast) === "FloatingNotificationHost");
        const conditionalHosts = node.children.filter((child): child is ts.JsxExpression => ts.isJsxExpression(child) && Boolean(child.expression?.getText(ast).includes("FloatingNotificationHost")));
        const modals: ts.JsxSelfClosingElement[] = [];
        const collectModal = (child: ts.Node) => {
          if (ts.isJsxSelfClosingElement(child) && child.tagName.getText(ast) === "AstronomicalEventModal") modals.push(child);
          ts.forEachChild(child, collectModal);
        };
        collectModal(node);
        for (const eventModalPresent of [false, true]) {
          const conditionalCount = conditionalHosts.reduce((count, child) => {
            const code = ts.transpileModule(child.expression!.getText(ast), { compilerOptions: { jsx: ts.JsxEmit.React } }).outputText;
            const value = vm.runInNewContext(code, { eventModalPresent, pageVisible: true, FloatingNotificationHost: "Host", React: { createElement: () => 1 } });
            return count + Number(Boolean(value));
          }, 0);
          // Compatibility routes leave after closing; ordinary callers resume their page host.
          const expected = owner === "content/event/modal-host-page" && !eventModalPresent ? 0 : 1;
          assert.equal(hosts.length + conditionalCount + (eventModalPresent ? modals.length : 0), expected, `${owner}, modal=${eventModalPresent}`);
        }
        if (conditionalHosts.length) assert.ok(modals.every(modal => modal.attributes.properties.some(prop =>
          ts.isJsxAttribute(prop) && prop.name.getText(ast) === "onPresenceChange")), `${owner} must receive actual presence, including exit`);
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
    assert.ok(roots > 0, owner);
    if (owner === "pages/map/index") {
      let retainedMyPages = 0;
      const retained = (node: ts.Node) => {
        if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === "MyLibraryPage") retainedMyPages++;
        ts.forEachChild(node, retained);
      };
      retained(ast);
      assert.equal(retainedMyPages, 1, "Map's separate presentation must compose the one My page owner, including its host");
    }
  }
  // Native source routes compose the shared page instead of mounting a second host.
  for (const owner of ["spot/data-source/index", "spot/data-source/document-reading", "sky/sources/index"]) {
    const ast = ts.createSourceFile(owner, readFileSync(new URL(`../${owner}.tsx`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let sharedPages = 0, localHosts = 0;
    const visit = (node: ts.Node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        if (node.tagName.getText(ast) === "SourcePage") sharedPages++;
        if (node.tagName.getText(ast) === "FloatingNotificationHost") localHosts++;
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
    assert.ok(sharedPages > 0, `${owner} must use the shared source page`);
    assert.equal(localHosts, 0, `${owner} must not duplicate its page host`);
  }
  const modal = ts.createSourceFile("modal", readFileSync(new URL("./astronomical-event-modal.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let modalHosts = 0;
  const visitModal = (node: ts.Node, insideScroll = false) => {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(modal) === "ScrollView") insideScroll = true;
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(modal) === "FloatingNotificationHost") {
      modalHosts++; assert.equal(insideScroll, false);
    }
    ts.forEachChild(node, child => visitModal(child, insideScroll));
  };
  visitModal(modal); assert.equal(modalHosts, 1);
  assert.doesNotMatch(readFileSync(new URL("../app.tsx", import.meta.url), "utf8"), /FloatingNotificationHost/);
});

test("floating entries expire, animate, preserve close across page hide, and cancel stale timers", () => {
  const currentSource = readFileSync(new URL("./notification.tsx", import.meta.url), "utf8");
  const source = process.env.MUTATE_NOTIFICATION_VISIBILITY === "1" ? currentSource.replace(" || !visible", "") : currentSource;
  const ast = ts.createSourceFile("notification.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const component = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "FloatingNotification");
  assert.ok(component);
  const code = ts.transpileModule(component.getText(ast).replace(/^export /, ""), {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mount = (notification: any = {}, initiallyVisible = true) => {
    let cursor = 0, dismissed = false, commits = 0;
    let now = 0;
    let visible = initiallyVisible;
    const slots: any[] = [];
    const timers: { callback: () => void; delay: number }[] = [];
    const renderFunction = vm.runInNewContext(code + "\nFloatingNotification", {
      useState: (initial: unknown) => {
        const index = cursor++; slots[index] ??= { value: initial };
        return [slots[index].value, (value: unknown) => { slots[index].value = value; }];
      },
      useRef: (current: unknown) => { const index = cursor++; return slots[index] ??= { current }; },
      useEffect: (effect: () => (() => void) | undefined, deps: unknown[]) => {
        const index = cursor++;
        if (!slots[index] || deps.some((value, i) => !Object.is(value, slots[index].deps[i]))) {
          slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: effect() };
        }
      },
      setTimeout: (callback: () => void, delay: number) => { timers.push({ callback, delay }); return timers.length; },
      clearTimeout: () => {},
      Date: { now: () => now },
      React: { createElement: (type: unknown, props: any, ...children: any[]) => ({ type, props, children }) },
      View: "View", NotificationComponent: "NotificationComponent",
      floatingNotificationNodeId: () => "notice-test",
      useFloatingNotificationVisibility: () => visible,
    });
    const render = () => { cursor = 0; return renderFunction({ notification, onDismiss: () => {
      if (!dismissed) { dismissed = true; commits++; }
    } }); };
    return { render, timers, advance: (elapsed: number) => { now += elapsed; }, setVisible: (value: boolean) => { visible = value; }, unmount: () => slots.forEach(slot => slot.cleanup?.()), commits: () => commits };
  };
  for (const tone of ["error", "warning", "info", "success"]) {
    const entry = mount({ tone }); entry.render();
    assert.equal(entry.timers.length, 1);
    assert.equal(entry.timers[0]!.delay, 3000);
    entry.timers[0]!.callback();
    assert.equal(entry.commits(), 0, "exit animation retains the visual");
    assert.match(entry.render().props.className, /--closing/);
    assert.equal(entry.timers[1]!.delay, 160);
    entry.timers[1]!.callback(); entry.unmount();
    assert.equal(entry.commits(), 1);
  }
  const hidden = mount(); hidden.render(); hidden.unmount(); hidden.timers[0]!.callback();
  assert.equal(hidden.commits(), 0, "hide without dismissal retains queued notice");
  const closed = mount();
  closed.render().children[0].props.onDismiss();
  closed.unmount();
  assert.equal(closed.commits(), 1, "close intent survives hide even before the next render");
  closed.timers[0]!.callback(); assert.equal(closed.commits(), 1);
  const exiting = mount(); exiting.render().children[0].props.onDismiss(); exiting.render(); exiting.unmount();
  exiting.timers.at(-1)!.callback();
  assert.equal(exiting.commits(), 1, "cancelled exit cannot commit twice");
  const actionable = mount({ action: { label: "重试" } }); actionable.render();
  assert.equal(actionable.timers[0]?.delay, 3000, "an actionable floating notice still expires");
  const paused = mount();
  paused.render(); paused.advance(1200);
  paused.render().props.onTouchStart(); paused.render();
  paused.timers[0]!.callback();
  assert.doesNotMatch(paused.render().props.className, /--closing/);
  paused.advance(4000);
  paused.render().props.onTouchEnd(); paused.render();
  assert.equal(paused.timers.at(-1)!.delay, 1800, "touch pauses the remaining visible interval");
  paused.timers.at(-1)!.callback();
  assert.match(paused.render().props.className, /--closing/);
  const offscreen = mount({}, false); offscreen.render();
  assert.equal(offscreen.timers.length, 0, "unseen notices have no expiry timer");
  offscreen.setVisible(true); offscreen.render();
  assert.equal(offscreen.timers[0]!.delay, 3000);
  offscreen.setVisible(false); offscreen.render(); offscreen.timers[0]!.callback();
  assert.doesNotMatch(offscreen.render().props.className, /--closing/, "scrolling offscreen cancels expiry");
  offscreen.setVisible(true); offscreen.render();
  assert.equal(offscreen.timers.at(-1)!.delay, 3000, "returning onscreen gets a full reading interval");
  offscreen.timers.at(-1)!.callback(); assert.match(offscreen.render().props.className, /--closing/);
});
test("floating region renders three separate notices and advances retained notifications", async () => {
  const { enqueueNotification, selectNotifications } = await import("../state/notification");
  const source = readFileSync(new URL("./notification.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("notification.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const component = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "NotificationRegion");
  assert.ok(component);
  const code = ts.transpileModule(component.getText(ast).replace(/^export /, ""), {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  let queue: any[] = [];
  for (let i = 1; i <= 4; i++) queue = enqueueNotification(queue, {
    id: `error-${i}`, owner: "weather", tone: "error", placement: "floating", title: `失败${i}`, body: "暂不可用",
  }, i);
  const render = vm.runInNewContext(code + "\nNotificationRegion", {
    useAppStore: Object.assign((select: any) => select({ notifications: queue, dismissNotification: (id: string) => { queue = queue.filter((item) => item.id !== id); } }), { getState: () => ({ notifications: queue }) }),
    selectNotifications,
    React: { createElement: (type: unknown, props: any, ...children: any[]) => ({ type, props, children }) },
    View: "View", FloatingNotification: "FloatingNotification",
  });
  const notices = render({ placement: "floating" }).children[0];
  assert.deepEqual(Array.from(notices, (item: any) => item.props.notification.id), ["error-4", "error-3", "error-2"]);
  queue = enqueueNotification(queue, { ...queue[0]! }, 10);
  notices[0].props.onDismiss();
  assert.ok(queue.some(item => item.createdAt === 10), "old exit cannot remove a newer record");
  notices[1].props.onDismiss();
  assert.deepEqual(Array.from(render({ placement: "floating" }).children[0], (item: any) => item.props.notification.id), ["error-4", "error-2", "error-1"]);
});
