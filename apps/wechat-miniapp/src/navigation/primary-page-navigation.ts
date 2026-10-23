import Taro from "@tarojs/taro";
import type { PrimaryPageRoute, PrimaryPageUrl } from "./primary-navigation";
import type { PrimaryNativePage, PrimaryNavigationController, PrimaryNavigationState } from "./primary-navigation-controller";

const MAP: PrimaryPageRoute = "pages/map/index";
const MY: PrimaryPageRoute = "pages/my/index";
type Registration = { controller: PrimaryNavigationController; unsubscribe(): void };
type Handoff = {
  target: PrimaryPageRoute;
  destination: PrimaryPageRoute;
  expectedPage: PrimaryNativePage | undefined;
  accepted: boolean;
  shown: boolean;
  operation: number;
  promise: Promise<void>;
  resolve(): void;
  reject(error: unknown): void;
};
let host: Registration | null = null;
let pending: Handoff | null = null;
const listeners = new Set<() => void>();
const pages = () => Taro.getCurrentPages() as PrimaryNativePage[];
const notify = () => { for (const listener of [...listeners]) listener(); };
const findLast = (stack: PrimaryNativePage[], route: PrimaryPageRoute) => {
  let index = stack.length - 1;
  while (index >= 0 && stack[index]?.route !== route) index--;
  return index;
};
const fail = (handoff: Handoff, error: unknown) => {
  if (pending !== handoff) return;
  pending = null;
  handoff.reject(error);
};

function applyPending() {
  const handoff = pending;
  if (!handoff?.accepted || !handoff.shown) return;
  let stack: PrimaryNativePage[];
  try { stack = pages(); }
  catch { return; } // Unknown arrival never authorizes resending an accepted operation.
  const current = stack.at(-1);
  if (!current || current !== handoff.expectedPage) return;
  if (handoff.destination === MY) {
    if (handoff.target === MAP) {
      // This is the latest distinct intent, after the accepted My return actually showed.
      startNativeHandoff(handoff, stack);
    } else {
      pending = null;
      handoff.resolve();
    }
    return;
  }
  const controller = host?.controller, snapshot = controller?.getSnapshot();
  if (!controller?.owns(current) || !snapshot?.nativeVisible || snapshot.disposed) return;
  pending = null;
  if (handoff.target === MY) controller.openMy();
  else controller.closeMy();
  handoff.resolve();
}

/** The direct My wrapper calls this only from its real native onShow. */
export function showPrimaryNativePage(page: PrimaryNativePage) {
  let stack: PrimaryNativePage[];
  try { stack = pages(); }
  catch { return; }
  const handoff = pending;
  if (!handoff || stack.at(-1) !== page || page.route !== handoff.destination) return;
  if (handoff.expectedPage && page !== handoff.expectedPage) {
    if (!stack.includes(handoff.expectedPage)) fail(handoff, new Error("primary_navigation_destination_retired"));
    return;
  }
  handoff.expectedPage = page;
  handoff.shown = true;
  applyPending();
}

/** Register the one Map-owned presentation; old teardown cannot detach a new Page. */
export function registerPrimaryMapHost(controller: PrimaryNavigationController) {
  host?.unsubscribe();
  let lastNativeVisible = false;
  const observe = () => {
    const visible = controller.getSnapshot().nativeVisible;
    const shown = visible && !lastNativeVisible;
    lastNativeVisible = visible;
    if (shown) {
      let current: PrimaryNativePage | undefined;
      try { current = pages().at(-1); } catch { /* Await the next real show observation. */ }
      if (current && controller.owns(current)) showPrimaryNativePage(current);
    }
    applyPending(); notify();
  };
  const registration: Registration = { controller, unsubscribe: controller.subscribe(observe) };
  host = registration;
  observe();
  return () => {
    registration.unsubscribe();
    if (host !== registration) return;
    host = null;
    notify();
  };
}

export function subscribePrimaryMapPresentation(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Stable immutable controller snapshot; no host always has the same null value. */
export function getPrimaryMapPresentationSnapshot(): PrimaryNavigationState | null {
  return host?.controller.getSnapshot() ?? null;
}

export function readPagePresentationIdentity(page: PrimaryNativePage | undefined, route = page?.route): unknown {
  return page && host?.controller.owns(page) ? host.controller.presentationIdentity(route) : page;
}

export function isPagePresentationForeground(page: PrimaryNativePage | undefined, route = page?.route) {
  let current: PrimaryNativePage | undefined;
  try { current = pages().at(-1); }
  catch { return false; }
  if (!page || current !== page) return false;
  return host?.controller.owns(page) ? host.controller.isForeground(route) : route === page.route;
}

/** Logical My is exposed only by its actual visible, topmost native Map owner. */
export function currentPresentedPageRoute(nativePage?: PrimaryNativePage): string | undefined {
  let current: PrimaryNativePage | undefined;
  try { current = pages().at(-1); }
  catch { return nativePage?.route; }
  const page = nativePage ?? current;
  const controller = host?.controller;
  return page && page === current && controller?.owns(page) && controller.isForeground(MY) ? MY : page?.route;
}

function startNativeHandoff(handoff: Handoff, stack: PrimaryNativePage[]) {
  const mapIndex = findLast(stack, MAP), myIndex = findLast(stack, MY);
  // Preserve the direct My Page and scroll when returning from its own native child.
  const destination = handoff.target === MY && myIndex > mapIndex ? MY : MAP;
  const index = destination === MY ? myIndex : mapIndex;
  const expectedPage = index >= 0 ? stack[index] : undefined, current = stack.at(-1);
  handoff.destination = destination;
  handoff.expectedPage = expectedPage;
  handoff.shown = false;
  handoff.accepted = !!current && current === expectedPage;
  const operation = ++handoff.operation;
  if (handoff.accepted) {
    // Only an already visible exact Map host or actual direct My can complete now.
    handoff.shown = destination === MY || !!(host?.controller.owns(current) && host.controller.getSnapshot().nativeVisible);
    applyPending();
    return;
  }
  let native: Promise<unknown>;
  try {
    native = Promise.resolve(expectedPage
      ? Taro.navigateBack({ delta: stack.length - 1 - index })
      : Taro.reLaunch({ url: "/pages/map/index" }));
  } catch (error) { native = Promise.reject(error); }
  void native.then(() => {
    if (pending !== handoff || operation !== handoff.operation) return;
    handoff.accepted = true;
    applyPending();
  }, error => {
    if (operation === handoff.operation) fail(handoff, error);
  });
}

/** At most one native handoff and latest destination; acceptance is not native show. */
export function openPrimaryPage(url: PrimaryPageUrl): Promise<void> {
  const target = url === "/pages/map/index" ? MAP : url === "/pages/my/index" ? MY : null;
  if (!target) return Promise.reject(new Error("primary_navigation_invalid_destination"));
  if (pending) {
    const handoff = pending;
    handoff.target = target;
    applyPending();
    return handoff.promise;
  }
  let stack: PrimaryNativePage[];
  try { stack = pages(); }
  catch (error) { return Promise.reject(error); }
  if (target === MY && stack.at(-1)?.route === MY) return Promise.resolve();
  let resolve!: () => void, reject!: (error: unknown) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  const handoff: Handoff = { target, destination: MAP, expectedPage: undefined,
    accepted: false, shown: false, operation: 0, promise, resolve, reject };
  pending = handoff;
  startNativeHandoff(handoff, stack);
  return promise;
}
