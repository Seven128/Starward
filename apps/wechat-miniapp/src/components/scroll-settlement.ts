// WebView scroll-view does not reliably emit scrollend. Retain native inertia:
// after release, settle only once scrolling has stopped.
export function createScrollSettlement(onSettle: (offset: number) => void) {
  let active = false;
  let released = false;
  let latest: number | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let revision = 0;
  const clear = () => {
    revision++;
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  const cancel = () => {
    clear(); active = false; released = false; latest = null;
  };
  const finish = () => {
    if (!active || !released || latest === null) return;
    const offset = latest;
    cancel();
    onSettle(offset);
  };
  const arm = () => {
    clear();
    if (!active || !released || latest === null) return;
    const expected = revision;
    timer = setTimeout(() => { if (revision === expected) finish(); }, 150);
  };
  return {
    get active() { return active; },
    begin() { cancel(); active = true; },
    cancel,
    update(offset: number) {
      if (!active || !Number.isFinite(offset)) return;
      latest = offset;
      if (released) arm();
    },
    release() {
      if (!active) return;
      // A tap without user scrolling must not authorize later programmatic
      // events (including a delayed end from a cancelled interaction).
      if (latest === null) { cancel(); return; }
      released = true;
      arm();
    },
    end() {
      // An old native end may arrive after regrabbing. Only onScroll owns the
      // current position; end is a quiet-period hint, never a commit payload.
      if (active && released) arm();
    },
  };
}
