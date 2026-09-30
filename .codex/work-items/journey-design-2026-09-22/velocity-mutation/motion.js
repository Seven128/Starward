/* Shared design-prototype physics. Logical px, px/ms; no product state or DOM. */
globalThis.StarwardElasticSheet = Object.freeze({
  unRubber(value, min, max) {
    const edge = value < min ? min : value > max ? max : value;
    const d = Math.min(71.999, Math.abs(value-edge));
    return d === 0 ? value : edge + Math.sign(value-edge) * (72 / (1-d/72) - 72) / .55;
  },
  resistance(value,min,max) {
    const d = value < min ? min-value : value > max ? value-max : 0;
    return d === 0 ? 1 : .55 / (1+d*.55/72)**2;
  },
  rubber(value, min, max) {
    const edge = value < min ? min : value > max ? max : value;
    const distance = value - edge;
    return edge + Math.sign(distance) * 72 * (1 - 1 / (1 + Math.abs(distance) * .55 / 72));
  },
  velocity(samples, releasedAt) {
    const recent = samples.filter(s => releasedAt - s.t <= 100 && s.t <= releasedAt);
    if (recent.length < 2 || releasedAt - recent.at(-1).t > 50) return 0;
    const first = recent[0], last = recent.at(-1), dt = last.t - first.t;
    return dt < 8 ? 0 : Math.max(-3, Math.min(3, (first.y - last.y) / dt));
  },
  snap(stops, height, velocity, current) {
    const entries = Object.entries(stops), projected = height;
    return entries.reduce((best, pair) => Math.abs(pair[1] - projected) < Math.abs(stops[best] - projected) ? pair[0] : best, current);
  },
  spring(from, to, velocity, elapsed) {
    const t = elapsed / 1000, decay = 17, frequency = Math.sqrt(420 - decay * decay);
    const a = from - to, b = (velocity * 1000 + decay * a) / frequency;
    const wave = a * Math.cos(frequency * t) + b * Math.sin(frequency * t);
    const exponential = Math.exp(-decay * t);
    const speed = exponential * ((-a * frequency * Math.sin(frequency * t) + b * frequency * Math.cos(frequency * t)) - decay * wave) / 1000;
    return {height: to + exponential * wave, speed};
  }
});
