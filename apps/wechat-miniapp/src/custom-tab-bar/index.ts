import Taro from "@tarojs/taro";
import { useAppStore } from "@/state/app-store";
import { PRIMARY_NAVIGATION_ITEMS, isPrimaryPageRoute, primaryNavigationIconPath, primaryNavigationLayout } from "@/navigation/primary-navigation";
import { createPrimaryNavigationController, type PrimaryNavigationState } from "@/navigation/primary-navigation-controller";
import type { PrimaryNavigationHandle } from "@/navigation/primary-navigation-cover";
import "./index.scss";

type NavigationItem = {
  pagePath: string; text: string; selected: boolean; pending: boolean; retry: boolean;
  label: string; dayIcon: string; nightIcon: string; observationIcon: string;
};
type Data = PrimaryNavigationState & {
  modeClass: string; pageClass: string; layout: string; items: NavigationItem[]; covered: boolean;
};
type NativeBar = PrimaryNavigationHandle & {
  data: Data;
  setData(data: Partial<Data>): void;
  sync(): void;
  open(event: { currentTarget: { dataset: { route?: string } } }): void;
  alive?: boolean;
  covering?: Set<string> | undefined;
  navigation?: ReturnType<typeof createPrimaryNavigationController> | undefined;
  unsubscribe?: (() => void) | undefined;
};

const initial: Data = { route: null, pending: null, failed: null, modeClass: "", pageClass: "", layout: "", items: [], covered: false };

/** Project canonical state into native data; no React instance or second store. */
function paint(bar: NativeBar, state: PrimaryNavigationState = bar.data) {
  if (!bar.alive) return;
  const mode = useAppStore.getState().mode;
  bar.setData({ ...state, covered: Boolean(bar.covering?.size), modeClass: `theme-${mode.toLowerCase()}`,
    pageClass: state.route === "pages/map/index" ? "primary-navigation--map" : "primary-navigation--my",
    items: PRIMARY_NAVIGATION_ITEMS.map(item => {
      const selected = state.route === item.pagePath, retry = state.failed === item.pagePath;
      return { pagePath: item.pagePath, text: item.text, selected, retry, pending: state.pending === item.pagePath,
        label: retry ? `${item.text}，页面暂未打开，再点重试` : `${item.text}${selected ? "，当前页面" : ""}`,
        dayIcon: "/" + primaryNavigationIconPath(item.icon, "DAY", selected),
        nightIcon: "/" + primaryNavigationIconPath(item.icon, "NIGHT", selected),
        observationIcon: "/" + primaryNavigationIconPath(item.icon, "OBSERVATION", selected),
      };
    }),
  });
}

const options = {
  options: { styleIsolation: "apply-shared" },
  data: initial,
  lifetimes: {
    attached(this: NativeBar) {
      if (this.alive) return;
      this.alive = true;
      this.covering = new Set();
      this.navigation = createPrimaryNavigationController({
        currentPage: () => Taro.getCurrentPages().at(-1),
        switchTab: url => Taro.switchTab({ url }),
        changed: state => paint(this, state),
      });
      this.unsubscribe = useAppStore.subscribe((state, prior) => {
        if (state.mode !== prior.mode) paint(this);
      });
      this.sync();
    },
    detached(this: NativeBar) {
      this.alive = false;
      this.covering?.clear(); this.covering = undefined;
      this.unsubscribe?.(); this.unsubscribe = undefined;
      this.navigation?.dispose(); this.navigation = undefined;
    },
  },
  pageLifetimes: {
    show(this: NativeBar) { this.sync(); },
    hide(this: NativeBar) { this.hide(); },
    resize(this: NativeBar) { this.sync(); },
  },
  methods: {
    sync(this: NativeBar) {
      const page = Taro.getCurrentPages().at(-1);
      if (page && isPrimaryPageRoute(page.route)) this.show(page.route);
    },
    show(this: NativeBar, route: Parameters<PrimaryNavigationHandle["show"]>[0]) {
      const current = Taro.getCurrentPages().at(-1);
      if (!this.alive || !current || current.route !== route || current.getTabBar?.() !== this) return;
      let info;
      try { info = Taro.getWindowInfo(); } catch { /* Retain CSS safe-area fallback. */ }
      const layout = primaryNavigationLayout(route, info).style;
      this.setData({ layout: Object.entries(layout).map(([key, value]) => `${key}:${value}`).join(";") });
      this.navigation?.show(current);
      paint(this);
    },
    hide(this: NativeBar) { this.navigation?.hide(); },
    cover(this: NativeBar, owner: string, active: boolean) {
      if (!this.alive || !this.covering) return;
      if (active) this.covering.add(owner); else this.covering.delete(owner);
      paint(this);
    },
    open(this: NativeBar, event: Parameters<NativeBar["open"]>[0]) {
      const route = event.currentTarget.dataset.route;
      const page = Taro.getCurrentPages().at(-1);
      if (this.alive && !this.covering?.size && page?.getTabBar?.() === this && isPrimaryPageRoute(route)) void this.navigation?.open(route);
    },
  },
};

// Native WXML makes Taro compile this as the official WeChat Component entry.
declare const Component: (config: typeof options) => void;
Component(options);
