import Taro from "@tarojs/taro";

// An explicit native command is needed even when snapping back to the same
// React scrollLeft value after a small drag. Do not drive it on every scroll.
export function createRulerScrollPosition(id: string) {
  let revision = 0;
  return {
    cancel() { revision++; },
    move(left: number) {
      const expected = ++revision;
      Taro.createSelectorQuery().select(`#${id}`).node().exec(result => {
        if (expected !== revision) return;
        const node = result[0]?.node as { scrollTo?: (options: { left: number; animated: boolean }) => void } | undefined;
        node?.scrollTo?.({ left, animated: false });
      });
    },
  };
}
