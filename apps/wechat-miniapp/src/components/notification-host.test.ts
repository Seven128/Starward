import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

test("the production floating host stops rendering on page hide and resumes on show", () => {
  const source = readFileSync(new URL("./notification.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("notification.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const host = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "FloatingNotificationHost");
  assert.ok(host);
  let cursor = 0;
  const states: unknown[] = [];
  let safeTop: number | undefined = 97;
  let notifications: { id: string }[] = [];
  let show = () => {};
  let hide = () => {};
  let resize = () => {};
  const code = ts.transpileModule(host.getText(ast).replace(/^export /, ""), {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const renderHost = vm.runInNewContext(code + "\nFloatingNotificationHost", {
    useState: (initial: unknown) => {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
      return [states[index], (value: unknown) => { states[index] = value; }];
    },
    nativeNavigationInsets: () => ({ safeTop }),
    useResize: (callback: () => void) => { resize = callback; },
    useDidShow: (callback: () => void) => { show = callback; },
    useDidHide: (callback: () => void) => { hide = callback; },
    useAppStore: (select: any) => select({ notifications }),
    selectNotifications: (queue: any[]) => queue,
    floatingNotificationNodeId: (item: any) => item.id,
    React: { createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({ type, props, children }) },
    View: "View", ScrollView: "ScrollView", NotificationRegion: "NotificationRegion",
  });
  const render = () => { cursor = 0; return renderHost(); };
  assert.ok(render());
  assert.equal(render().props.style?.["--notification-top"], "97px", "native capsule clearance overrides unsupported CSS safe-area");
  safeTop = 120; resize();
  assert.equal(render().props.style?.["--notification-top"], "120px", "resize refreshes native navigation clearance");
  hide();
  assert.equal(render(), null);
  safeTop = 105;
  show();
  assert.ok(render());
  assert.equal(render().props.style?.["--notification-top"], "105px", "show rechecks the current native inset");
  safeTop = undefined; resize();
  assert.equal(render().props.style?.["--notification-top"], undefined, "unavailable metrics retain the stylesheet fallback");
  notifications = [{ id: "first-notice" }];
  assert.equal(render().children[0].props.scrollIntoView, "first-notice");
  notifications = [{ id: "new-head-after-scrolling" }, ...notifications];
  assert.equal(render().children[0].props.scrollIntoView, "new-head-after-scrolling", "new queue head asks native scroller to reveal it");
});

test("page and event-modal composition keeps one floating host outside scroll content", () => {
  const owners = [
    "pages/map/index", "pages/map/search-page", "pages/auth/index", "features/my/my-library-page",
    "features/sky/spot-sky-page", "features/spot/spot-detail-page", "spot/data-source/index",
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
        ts.isJsxAttribute(prop) && prop.name.getText(ast) === "className" && /\b(themeClass|presentationClass)\b/.test(prop.getText(ast)))) {
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
            const value = vm.runInNewContext(code, { eventModalPresent, FloatingNotificationHost: "Host", React: { createElement: () => 1 } });
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
      React: { createElement: (type: unknown, props: any, ...children: any[]) => ({ type, props, children }) },
      View: "View", NotificationComponent: "NotificationComponent",
      floatingNotificationNodeId: () => "notice-test",
      useFloatingNotificationVisibility: () => visible,
    });
    const render = () => { cursor = 0; return renderFunction({ notification, onDismiss: () => {
      if (!dismissed) { dismissed = true; commits++; }
    } }); };
    return { render, timers, setVisible: (value: boolean) => { visible = value; }, unmount: () => slots.forEach(slot => slot.cleanup?.()), commits: () => commits };
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
  paused.render().props.onTouchStart(); paused.render();
  paused.timers[0]!.callback();
  assert.doesNotMatch(paused.render().props.className, /--closing/);
  paused.render().props.onTouchEnd(); paused.render();
  assert.equal(paused.timers.at(-1)!.delay, 3000, "release grants a fresh readable interval");
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
