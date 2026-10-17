import { isPrimaryPageRoute, type PrimaryPageRoute } from "./primary-navigation";

type Page = { route?: string };
export type PrimaryNavigationState = {
  route: PrimaryPageRoute | null;
  pending: PrimaryPageRoute | null;
  failed: PrimaryPageRoute | null;
};

/** Selection commits on a real page show; a switch promise never selects a tab. */
export function createPrimaryNavigationController(ports: {
  currentPage(): Page | undefined;
  switchTab(url: string): Promise<unknown>;
  changed(state: PrimaryNavigationState): void;
}) {
  let state: PrimaryNavigationState = { route: null, pending: null, failed: null };
  let page: Page | undefined, alive = true, visible = false, revision = 0;
  const emit = (next: PrimaryNavigationState) => { state = next; ports.changed(next); };
  const retire = () => { revision++; visible = false; page = undefined; };
  return {
    show(owner: Page) {
      if (!alive || ports.currentPage() !== owner || !isPrimaryPageRoute(owner.route)) return;
      // Layout refreshes belong to the same visible page and cannot retire its request.
      if (visible && page === owner && state.route === owner.route) return;
      revision++; visible = true; page = owner;
      emit({ route: owner.route, pending: null, failed: null });
    },
    hide() { retire(); if (alive) emit({ ...state, pending: null, failed: null }); },
    dispose() { retire(); alive = false; },
    async open(route: PrimaryPageRoute) {
      if (!alive || !visible || !page || ports.currentPage() !== page || state.pending || route === state.route) return;
      const owner = page, ticket = ++revision;
      const current = () => alive && visible && revision === ticket && page === owner && ports.currentPage() === owner;
      emit({ ...state, pending: route, failed: null });
      try { await ports.switchTab("/" + route); }
      catch { if (current()) emit({ ...state, pending: null, failed: route }); }
      finally { if (current() && state.pending) emit({ ...state, pending: null }); }
    },
  };
}
