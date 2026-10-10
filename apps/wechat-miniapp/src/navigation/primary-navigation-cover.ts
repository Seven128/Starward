import Taro from "@tarojs/taro";
import { isPrimaryPageRoute, type PrimaryPageRoute } from "./primary-navigation";

export type PrimaryNavigationHandle = {
  show(route: PrimaryPageRoute): void;
  hide(): void;
  cover(owner: string, active: boolean): void;
};

let sequence = 0;

/** A mounted overlay covers only the current native Page's own custom bar. */
export function retainPrimaryNavigationCover() {
  const page = Taro.getCurrentPages().at(-1);
  if (!isPrimaryPageRoute(page?.route)) return () => {};
  const bar = page?.getTabBar?.() as PrimaryNavigationHandle | undefined;
  if (!bar) return () => {};
  const owner = `primary-cover:${++sequence}`;
  bar.cover(owner, true);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    bar.cover(owner, false);
  };
}
