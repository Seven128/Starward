export interface DecisionContextRevision {
  revision: number;
  observingNight: string;
  origin: string;
  profileId: string;
  target: string;
}

export type DecisionContextInput = Omit<DecisionContextRevision, "revision">;

export function currentObservingNight(timezone = "Asia/Shanghai", now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function createDecisionContext(profileId: string): DecisionContextRevision {
  return {
    revision: 1,
    observingNight: currentObservingNight(),
    origin: "尚未选择位置",
    profileId,
    target: "milky-way-core",
  };
}

export function advanceDecisionContext(
  current: DecisionContextRevision,
  input: DecisionContextInput,
): DecisionContextRevision {
  const unchanged = current.observingNight === input.observingNight
    && current.origin === input.origin
    && current.profileId === input.profileId
    && current.target === input.target;

  return unchanged ? current : { ...input, revision: current.revision + 1 };
}
