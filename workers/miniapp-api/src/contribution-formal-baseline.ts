import {
  CONTRIBUTION_FORMAL_FIELD_KEYS,
  type ContributionFormalBaseline,
  type FacilityEvidence,
  type SpotDetail,
} from "@starward/miniapp-contracts";

function statusLabel(status: FacilityEvidence["status"]) {
  if (status === "AVAILABLE") return "有";
  if (status === "UNAVAILABLE") return "没有";
  if (status === "SEASONAL") return "季节性开放";
  return null;
}

function facilityNote(facility: FacilityEvidence | undefined) {
  if (!facility) return null;
  const parts = [facility.detail, facility.openingHours, facility.usageCondition]
    .filter((value): value is string => Boolean(value?.trim()));
  return parts.length ? parts.join("；") : facility.summary.trim() || null;
}

function evidenceClaims(detail: SpotDetail, subjectType: "SPOT" | "ACCESS" | "SAFETY" | "HORIZON") {
  const claims = detail.evidence
    .filter((item) => item.subjectType === subjectType && item.state !== "EXPIRED")
    .map((item) => item.claim.trim())
    // Evidence identifiers such as ACCESS_LAST_ROAD are machine policy keys,
    // not contributor-facing copy. Only project human-authored Chinese claims.
    .filter((value) => /\p{Script=Han}/u.test(value));
  return claims.length ? [...new Set(claims)].join("；") : null;
}

export function contributionFormalBaseline(detail: SpotDetail, revision: number): ContributionFormalBaseline {
  if (!Number.isSafeInteger(revision) || revision <= 0)
    throw new Error("contribution_baseline_revision_invalid");
  const fields = Object.fromEntries(CONTRIBUTION_FORMAL_FIELD_KEYS.map((key) => [key, null])) as unknown as Record<(typeof CONTRIBUTION_FORMAL_FIELD_KEYS)[number], string | null>;
  const parking = detail.spot.facilities.find((item) => item.type === "PARKING");
  const toilet = detail.spot.facilities.find((item) => item.type === "TOILET");
  const platform = detail.spot.facilities.find((item) => item.type === "PLATFORM");
  const signal = detail.spot.facilities.find((item) => item.type === "SIGNAL");
  const camping = detail.spot.facilities.find((item) => item.type === "CAMPING");
  fields.name = detail.spot.name;
  fields.address = detail.spot.address;
  fields.openness = ({ OPEN: "开放", CONDITIONAL: "有条件开放", CLOSED: "不开放", UNKNOWN: null } as const)[detail.accessAndSafety.openness];
  fields.access = ({ PERMITTED: "允许进入", CONDITIONAL: "需预约或其他条件", PROHIBITED: "禁止进入", UNKNOWN: null } as const)[detail.accessAndSafety.legalAccess];
  fields.accessNote = detail.accessAndSafety.restrictions.length ? detail.accessAndSafety.restrictions.join("；") : null;
  fields.road = detail.route.lastRoad && !/^暂无/u.test(detail.route.lastRoad)
    ? detail.route.lastRoad
    : evidenceClaims(detail, "ACCESS");
  fields.safety = detail.accessAndSafety.guidance.length ? detail.accessAndSafety.guidance.join("；") : evidenceClaims(detail, "SAFETY");
  fields.parking = parking ? statusLabel(parking.status) : null;
  fields.parkingNote = facilityNote(parking);
  fields.toilet = toilet ? statusLabel(toilet.status) : null;
  fields.toiletNote = facilityNote(toilet);
  fields.platform = facilityNote(platform);
  fields.signal = facilityNote(signal);
  fields.camping = facilityNote(camping);
  fields.horizon = evidenceClaims(detail, "HORIZON");
  fields.detail = evidenceClaims(detail, "SPOT");
  for (const key of CONTRIBUTION_FORMAL_FIELD_KEYS) {
    if (detail.formalFacts && Object.prototype.hasOwnProperty.call(detail.formalFacts, key))
      fields[key] = detail.formalFacts?.[key] ?? null;
  }

  const media = { parking: [] as string[], toilet: [] as string[], site: [] as string[] };
  for (const item of detail.spot.media) {
    const label = `${item.alt} ${item.caption}`;
    if (/停车/u.test(label)) media.parking.push(item.id);
    else if (/洗手间|厕所/u.test(label)) media.toilet.push(item.id);
    else if (item.isSiteSpecific) media.site.push(item.id);
  }
  for (const kind of ["parking", "toilet", "site"] as const) {
    if (detail.formalMedia && Object.prototype.hasOwnProperty.call(detail.formalMedia, kind))
      media[kind] = [...(detail.formalMedia[kind] ?? [])];
  }
  return { spotId: detail.spot.spotId, revision, fields, media };
}
