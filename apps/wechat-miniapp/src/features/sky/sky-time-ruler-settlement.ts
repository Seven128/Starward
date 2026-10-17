import { createScrollSettlement } from "../../components/scroll-settlement";

/** Observe the existing interaction owner for Sky's fine-target demand. Keep
 * this consumer-specific bridge in the Sky subpackage, not every ruler's main
 * package. Activity is read from the owner; no second gesture/timer is kept. */
export function createSkyTimeRulerSettlement(onSettle: (offset: number) => void,
  onActiveChange: (active: boolean) => void) {
  let reported = false;
  const changed = () => {
    if (owner.active === reported) return;
    reported = owner.active; onActiveChange(reported);
  };
  const owner = createScrollSettlement(offset => { changed(); onSettle(offset); });
  return {
    get active() { return owner.active; },
    begin() { owner.begin(); changed(); },
    cancel() { owner.cancel(); changed(); },
    release() { owner.release(); changed(); },
    update(offset: number) { owner.update(offset); },
    end() { owner.end(); },
  };
}
