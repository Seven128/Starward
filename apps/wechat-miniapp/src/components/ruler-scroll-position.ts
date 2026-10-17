import Taro from "@tarojs/taro";

// An explicit native command is needed even when snapping back to the same
// React scrollLeft value after a small drag. Do not drive it on every scroll.
export function createRulerScrollPosition(id: string) {
  let revision = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const cancel = () => {
    revision++;
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  return {
    cancel,
    move(left: number) {
      cancel();
      const expected = revision;
      Taro.createSelectorQuery().select(`#${id}`).node().exec(result => {
        if (expected !== revision) return;
        const node = result[0]?.node as { scrollTo?: (options: { left: number; animated: boolean }) => void } | undefined;
        node?.scrollTo?.({ left, animated: false });
      });
    },
    settle(from: number, left: number, reduced: boolean, present: (left: number) => void) {
      cancel();
      const expected = revision;
      Taro.createSelectorQuery().select(`#${id}`).node().exec(result => {
        if (expected !== revision) return;
        const node = result[0]?.node as { scrollTo?: (options: { left: number; animated: boolean }) => void } | undefined;
        if (!node?.scrollTo) return;
        const startAt = Date.now();
        const tick = () => {
          if (expected !== revision) return;
          const progress = reduced ? 1 : Math.min(1, (Date.now() - startAt) / 220);
          const value = from + (left - from) * (1 - Math.pow(1 - progress, 3));
          node.scrollTo!({ left: value, animated: false });
          present(value);
          timer = progress < 1 ? setTimeout(tick, Math.min(16, 220 - (Date.now() - startAt))) : null;
        };
        tick();
      });
    },
  };
}
