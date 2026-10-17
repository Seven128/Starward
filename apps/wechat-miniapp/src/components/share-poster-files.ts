/** The preview and album handoff share only this poster's native PNG exports. */
export function createSharePosterFiles<Frame>(port: {
  export(frame: Frame): Promise<string>;
  remove(image: string): Promise<void>;
}) {
  const uses = new Map<string, number>();
  let queue = Promise.resolve();
  function enqueue<Result>(work: () => Promise<Result>) {
    const result = queue.then(work);
    queue = result.then(() => {}, () => {});
    return result;
  }
  return {
    export(frame: Frame, current: () => boolean) {
      // Wait for native deletion to settle before issuing another export. A
      // timed-out JS wait cannot retract an already-issued filesystem action.
      return enqueue(async () => {
        if (!current()) throw new Error("poster_export_retired");
        const image = await port.export(frame);
        if (typeof image !== "string" || !image.trim()) throw new Error("poster_export_path_unavailable");
        uses.set(image, (uses.get(image) ?? 0) + 1);
        return image;
      });
    },
    retain(image: string) {
      const count = uses.get(image);
      if (!count) throw new Error("poster_image_retired");
      uses.set(image, count + 1);
    },
    release(image: string) {
      const count = uses.get(image);
      if (!count) return;
      uses.set(image, count - 1);
      if (count > 1) return;
      void enqueue(async () => {
        // An in-flight export may have retained this same native path while
        // its earlier preview was retired. Keep the new bitmap in that case.
        if (uses.get(image) !== 0) return;
        try { await port.remove(image); }
        finally { if (uses.get(image) === 0) uses.delete(image); }
      }).catch(() => {});
    },
  };
}
