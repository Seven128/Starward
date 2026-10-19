import Taro from "@tarojs/taro";

// Repeated targets still need an explicit native snap after a small drag.
// Keep positioning here; scroll events may request a read, not a new writer.
export function createRulerScrollPosition(id: string) {
  let revision = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const cancel = () => {
    revision++;
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  const readOffset = (expected: number, accept: (left: number | null) => void, retry = true) => {
    try {
      Taro.createSelectorQuery().select(`#${id}`).scrollOffset().exec(result => {
        if (expected !== revision) return;
        const left = result[0]?.scrollLeft;
        if (typeof left === "number" && Number.isFinite(left)) accept(left);
        else if (retry) Taro.nextTick(() => {
          if (expected === revision) readOffset(expected, accept, false);
        });
        else accept(null);
      });
    } catch { if (expected === revision) accept(null); }
  };
  return {
    cancel,
    readOffset(accept: (left: number | null) => void) { readOffset(revision, accept); },
    move(left: number, animated = false, observed?: (left: number | null) => void) {
      cancel();
      const expected = revision;
      const attempt = (retry: boolean) => {
        if (expected !== revision) return;
        try {
          Taro.createSelectorQuery().select(`#${id}`).node().exec(result => {
            if (expected !== revision) return;
            // This is the documented enhanced ScrollViewContext, not a Canvas
            // or an app-defined animated option. Duration is not portable to Android.
            const node = result[0]?.node as Pick<Taro.ScrollViewContext, "scrollTo"> | undefined;
            if (!node?.scrollTo) {
              if (retry) Taro.nextTick(() => attempt(false));
              else observed?.(null);
              return;
            }
            try {
              node.scrollTo({ left, animated });
              // Returning from scrollTo is not completion. Entry callers use
              // a real offset, or a later native scroll event, before showing ticks.
              if (observed) readOffset(expected, observed);
            } catch { observed?.(null); }
          });
        } catch { observed?.(null); }
      };
      attempt(true);
    },
    settle(from: number, left: number, reduced: boolean, present: (left: number) => void) {
      cancel();
      const expected = revision;
      Taro.createSelectorQuery().select(`#${id}`).node().exec(result => {
        if (expected !== revision) return;
        const node = result[0]?.node as Pick<Taro.ScrollViewContext, "scrollTo"> | undefined;
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
