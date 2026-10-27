const empty = new Float32Array(0);

/** One renderer's current dynamic batch. No frame or geometry identity is cached. */
export class SkyVertexStaging {
  private data = empty;
  private frameMaximum = 0;
  length = 0;

  beginFrame() { this.length = this.frameMaximum = 0; }

  reserve(additional: number) {
    const required = this.length + additional;
    if (required > this.data.length) {
      let capacity = Math.max(1, this.data.length);
      while (capacity < required) capacity *= 2;
      try {
        const next = new Float32Array(capacity);
        next.set(this.data.subarray(0, this.length));
        this.data = next;
      } catch (error) { this.release(); throw error; }
    }
    this.frameMaximum = Math.max(this.frameMaximum, required);
    return this.data;
  }

  view() { return this.data.subarray(0, this.length); }

  finishFrame() {
    this.length = 0;
    let capacity = this.frameMaximum ? 1 : 0;
    while (capacity < this.frameMaximum) capacity *= 2;
    if (capacity < this.data.length) {
      // Submitted bytes already belong to WebGL. Retain less than twice this
      // frame's largest actual batch, not a past wide-view high-water mark.
      this.data = empty;
      if (capacity) this.data = new Float32Array(capacity);
    }
  }

  release() { this.data = empty; this.length = this.frameMaximum = 0; }
}
