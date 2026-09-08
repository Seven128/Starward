/** Process-local public computation cache. Callers own identity and freshness;
 * promises are shared only while work is active, never after a failed attempt. */
export class ComputationCache<T> {
  private readonly values = new Map<string, { value: T; expiresAt: number }>();
  private readonly inFlight = new Map<string, Promise<T>>();
  private generation = 0;

  constructor(
    private readonly capacity: number,
    private readonly now: () => number = Date.now,
  ) {}

  async get(
    key: string,
    compute: () => Promise<T>,
    expiresAt: (value: T) => number,
  ): Promise<T> {
    const now = this.now();
    for (const [entryKey, entry] of this.values)
      if (entry.expiresAt <= now) this.values.delete(entryKey);
    const cached = this.values.get(key);
    if (cached) {
      this.values.delete(key);
      this.values.set(key, cached);
      return cached.value;
    }
    const pending = this.inFlight.get(key);
    if (pending) return pending;
    // Bound active identities too. Excess independent work can run without
    // retention; it cannot evict or cancel another caller's shared promise.
    if (this.inFlight.size >= this.capacity) return compute();
    const generation = this.generation;
    const promise = Promise.resolve().then(compute).then((value) => {
      const expiry = expiresAt(value);
      if (generation === this.generation && expiry > this.now()) {
        while (this.values.size >= this.capacity)
          this.values.delete(this.values.keys().next().value!);
        this.values.set(key, { value, expiresAt: expiry });
      }
      return value;
    }).finally(() => {
      if (this.inFlight.get(key) === promise) this.inFlight.delete(key);
    });
    this.inFlight.set(key, promise);
    return promise;
  }

  clear() {
    this.generation++;
    this.values.clear();
    this.inFlight.clear();
  }
}
