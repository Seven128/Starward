import type { SkyObjectIdentity } from "./sky-object-picking";

/** Presentation only; the current Scene still owns all coordinates and facts. */
export interface SkyTransitionStar extends SkyObjectIdentity {
  kind: "STAR";
  magnitude: number;
  magnitudeBand?: "V" | "VISUAL";
  azimuthDeg: number;
  altitudeDeg: number;
  radiusPx: number;
  color: string;
  opacity: number;
  named: boolean;
}
interface Layer {
  identity: object | string;
  stars: Map<string, Transition>;
}
interface Transition { point: SkyTransitionStar; from: number; target: number; startedAt: number }
interface Scope { context: object | undefined; at: string | undefined; mode: string }
interface Accepted extends Scope { now: number; layers: Map<string, Layer> }
const FADE_MS = 160;

/** One accepted display state, at most the visible points plus a short exit.
 * A rejected paint cannot advance it. New time uses fresh coordinates; invalid
 * layers/Context never keep old points alive through an exit animation. */
export function createSkyStarTransitions() {
  let accepted: Accepted | null = null;
  let revision = 0;
  return {
    reset() { accepted = null; revision++; },
    prepare(scope: Scope, now: number, reducedMotion = false, paused = false) {
      const before = accepted?.context === scope.context && accepted?.mode === scope.mode ? accepted : null;
      const expectedRevision = revision;
      const layers = new Map<string, Layer>();
      let pending = false;
      const retarget = (old: Transition | undefined, point: SkyTransitionStar, target: number): Transition => {
        const progress = old ? Math.max(0, Math.min(1, (now - old.startedAt) / FADE_MS)) : 0;
        const live = old ? old.from + (old.target - old.from) * progress : 0;
        const from = paused ? old?.point.opacity ?? 0 : reducedMotion ? target : live;
        const changed = !old || old.target !== target || reducedMotion || paused;
        // Scene submits plain owned points. Keep a detached snapshot (including
        // optional fields) without the per-property object-spread helper.
        const snapshot = Object.assign({}, point);
        snapshot.opacity = from;
        const next = { point: snapshot,
          from: changed ? from : old.from, target: paused ? from : target,
          startedAt: changed ? now : old.startedAt };
        if (!paused && Math.abs(from - target) > 1e-6) pending = true;
        return next;
      };
      return {
        layer(name: string, identity: object | string | null) {
          const old = identity !== null && before?.layers.get(name)?.identity === identity
            ? before.layers.get(name) : undefined;
          const stars = new Map<string, Transition>();
          if (identity !== null) layers.set(name, { identity, stars });
          return {
            point(point: SkyTransitionStar): SkyTransitionStar {
              const current = retarget(old?.stars.get(point.reference), point, point.opacity);
              stars.set(point.reference, current);
              return current.point;
            },
            exits(): readonly SkyTransitionStar[] {
              if (!old || before?.at !== scope.at || reducedMotion) return [];
              const exits: SkyTransitionStar[] = [];
              for (const [reference, previous] of old.stars) {
                if (stars.has(reference)) continue;
                const exit = retarget(previous, previous.point, 0);
                if (exit.point.opacity <= 0) continue;
                stars.set(reference, exit);
                exits.push(exit.point);
              }
              return exits;
            },
          };
        },
        get animating() { return pending; },
        commit() {
          if (revision !== expectedRevision) return false;
          accepted = { ...scope, now, layers };
          revision++;
          return true;
        },
      };
    },
  };
}

export type SkyStarTransitionFrame = ReturnType<ReturnType<typeof createSkyStarTransitions>["prepare"]>;
