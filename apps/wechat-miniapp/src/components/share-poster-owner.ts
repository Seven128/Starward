type PosterError = "permission" | "export";
interface PosterClock {
  set(callback: () => void, delay: number): unknown;
  clear(handle: unknown): void;
}
const clock: PosterClock = {
  set: (callback, delay) => setTimeout(callback, delay),
  clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
};
class PosterCancelled extends Error {}

/** One live poster owns preview, export and the platform handoff in that order. */
export function createSharePosterOwner<Frame>(port: {
  nextTick(callback: () => void): void;
  draw(frame: Frame, done: () => void, fail: (cause: unknown) => void, current: () => boolean): void;
  export(frame: Frame): Promise<string>;
  save(image: string): Promise<unknown>;
  albumFailure(): Promise<PosterError>;
  retire(frame: Frame): void;
  busy(value: boolean): void;
  error(value: PosterError): void;
  saved(): void;
}, timers: PosterClock = clock) {
  let frame: Frame | undefined;
  let revision = 0, ticket = 0;
  let visible = true, disposed = false, saving = false, scheduled = false, previewPaused = false;
  let queue = Promise.resolve();
  const cancellations = new Set<() => void>();
  const active = () => !disposed && visible && frame !== undefined;
  const current = (version: number) => active() && version === revision;
  const assertCurrent = (version: number) => { if (!current(version)) throw new PosterCancelled(); };
  const enqueue = (work: () => Promise<void>) => {
    const result = queue.then(work);
    queue = result.catch(() => {});
    return result;
  };
  // Native work may finish after cancellation/timeout. Its callback can settle
  // only this wait; it cannot export, write to the album or update a later UI.
  function wait<Result>(start: (done: (value: Result) => void, fail: (cause: unknown) => void, pending: () => boolean) => void) {
    return new Promise<Result>((resolve, reject) => {
      let finished = false;
      const settle = (failure: boolean, value: unknown) => {
        if (finished) return;
        finished = true;
        timers.clear(deadline);
        cancellations.delete(cancel);
        if (failure) reject(value); else resolve(value as Result);
      };
      const cancel = () => settle(true, new PosterCancelled());
      const deadline = timers.set(() => settle(true, new Error("poster_callback_timeout")), 6000);
      cancellations.add(cancel);
      try { start(value => settle(false, value), cause => settle(true, cause), () => !finished); }
      catch (cause) { settle(true, cause); }
    });
  }
  function invalidate() {
    revision++;
    ticket++;
    scheduled = false;
    for (const cancel of [...cancellations]) cancel();
  }
  function retire() {
    const retired = frame;
    frame = undefined;
    invalidate();
    // React must commit a new native Canvas ID and call update before another
    // draw is allowed. Cancelling JS cannot retract already-submitted commands.
    if (!disposed && retired !== undefined) port.retire(retired);
  }
  // A delayed native node lookup must not resize or paint a retired node.
  const draw = (value: Frame, version: number) => wait<void>((done, fail, pending) =>
    port.draw(value, done, fail, () => pending() && current(version)));
  function preview() {
    if (!active() || saving || scheduled || previewPaused) return;
    scheduled = true;
    const scheduledTicket = ++ticket;
    port.nextTick(() => {
      if (scheduledTicket !== ticket) return;
      scheduled = false;
      if (!active() || saving || previewPaused) return;
      const value = frame!, version = revision;
      void enqueue(async () => {
        try {
          assertCurrent(version);
          await draw(value, version);
          assertCurrent(version);
        } catch (cause) {
          if (!(cause instanceof PosterCancelled) && current(version)) {
            port.error("export");
            previewPaused = true;
            retire();
          }
        }
      });
    });
  }
  return {
    // Retiring/remounting the same content is an isolation handshake, not a
    // retry. Only new content, an explicit save or returning from hide retries.
    update(value: Frame, contentChanged = true) {
      invalidate(); frame = value;
      if (contentChanged) previewPaused = false;
      preview();
    },
    show() { if (!disposed && !visible) { visible = true; previewPaused = false; preview(); } },
    hide() { visible = false; retire(); },
    dispose() { disposed = true; frame = undefined; invalidate(); },
    save() {
      // React state does not lock a second click in the same event turn.
      if (!active() || saving) return Promise.resolve();
      previewPaused = false;
      // A tick scheduled before this save must not repaint the same completed
      // bitmap if the native handoff settles before nextTick runs.
      ticket++;
      scheduled = false;
      saving = true;
      port.busy(true);
      const value = frame!, version = revision;
      return enqueue(async () => {
        let stage: "export" | "album" = "export";
        let exported = false;
        try {
          assertCurrent(version);
          await draw(value, version);
          assertCurrent(version);
          const image = await wait<string>((done, fail) => { void port.export(value).then(done, fail); });
          assertCurrent(version);
          exported = true;
          stage = "album";
          // An already-issued platform save cannot be revoked. Keep the lock
          // until it settles; hiding only fences subsequent UI and effects.
          await port.save(image);
          assertCurrent(version);
          port.saved();
        } catch (cause) {
          if (!(cause instanceof PosterCancelled) && current(version)) {
            let failure: PosterError = "export";
            if (stage === "album") {
              try { failure = await wait<PosterError>((done, fail) => { void port.albumFailure().then(done, fail); }); }
              catch { /* Unavailable settings do not establish denied permission. */ }
            }
            if (current(version)) port.error(failure);
          }
        } finally {
          saving = false;
          if (!disposed) port.busy(false);
          if (current(version)) {
            // A completed draw/export remains a valid visible bitmap, even
            // when album permission fails. Remounting would flash it empty.
            // Failed or timed-out native work still retires its surface.
            if (!exported) { previewPaused = true; retire(); }
          } else {
            // Content may have changed while the platform held the save lock.
            preview();
          }
        }
      });
    },
  };
}
