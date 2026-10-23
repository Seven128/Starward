import type { PrimaryPageRoute } from "./primary-navigation";

export type PrimaryNativePage = { route?: string };
export type PrimaryNavigationState = Readonly<{
  route: PrimaryPageRoute;
  phase: "closed" | "opening" | "open" | "closing";
  transitionTicket: number | null;
  nativeVisible: boolean;
  foregroundRoute: PrimaryPageRoute | null;
  disposed: boolean;
}>;

const MAP: PrimaryPageRoute = "pages/map/index";
const MY: PrimaryPageRoute = "pages/my/index";

/** The Map Page owns one logical My presentation; native children only suspend it. */
export function createPrimaryNavigationController(ports: {
  currentPage(): PrimaryNativePage | undefined;
  changed?(state: PrimaryNavigationState): void;
}) {
  let page: PrimaryNativePage | undefined;
  let activation: object | null = null;
  let serial = 0;
  let state: PrimaryNavigationState = Object.freeze({
    route: MAP, phase: "closed", transitionTicket: null,
    nativeVisible: false, foregroundRoute: null, disposed: false,
  });
  const listeners = new Set<() => void>();
  const emit = (patch: Partial<PrimaryNavigationState>) => {
    state = Object.freeze({ ...state, ...patch });
    ports.changed?.(state);
    for (const listener of [...listeners]) listener();
  };
  const currentPageIs = (owner: PrimaryNativePage) => {
    try { return ports.currentPage() === owner; }
    catch { return false; }
  };
  const nativeForeground = () => {
    if (state.disposed || !state.nativeVisible || !page) return false;
    return currentPageIs(page);
  };
  const isForeground = (route: string | undefined) => nativeForeground() && route === state.route && state.phase !== "closing";
  const present = (route: PrimaryPageRoute) => {
    if (!nativeForeground() || route === state.route) return false;
    activation = {};
    emit({ route, phase: route === MY ? "opening" : "closing",
      transitionTicket: ++serial, foregroundRoute: route === MY ? MY : null });
    return true;
  };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      if (state.disposed) return () => {};
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    owns: (owner: PrimaryNativePage | undefined) => !state.disposed && !!page && owner === page,
    show(owner: PrimaryNativePage) {
      if (state.disposed || owner.route !== MAP || !currentPageIs(owner) || (page && page !== owner)) return false;
      if (!page) { page = owner; activation = {}; }
      // Resize/layout synchronization is not a new activation or transition.
      if (!state.nativeVisible) emit({ nativeVisible: true, foregroundRoute: state.phase === "closing" ? null : state.route });
      return true;
    },
    hide() {
      if (!state.disposed && state.nativeVisible) emit({ nativeVisible: false, foregroundRoute: null });
    },
    dispose() {
      if (state.disposed) return;
      activation = null;
      emit({ disposed: true, nativeVisible: false, foregroundRoute: null, transitionTicket: null });
      listeners.clear();
      page = undefined;
    },
    openMy: () => present(MY),
    closeMy: () => present(MAP),
    finishTransition(ticket: number) {
      if (state.disposed || state.transitionTicket !== ticket) return false;
      emit({ phase: state.route === MY ? "open" : "closed", transitionTicket: null,
        foregroundRoute: state.nativeVisible ? state.route : null });
      return true;
    },
    isForeground,
    /** A native child hide/show retains this identity; a primary intent replaces it. */
    presentationIdentity: (route: string | undefined) => !state.disposed && page && route === state.route ? activation : null,
  };
}

export type PrimaryNavigationController = ReturnType<typeof createPrimaryNavigationController>;
