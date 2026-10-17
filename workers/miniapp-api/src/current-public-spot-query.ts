/** Canonical eligibility of the current public spot summary. Query aliases s/a
 * match the existing repository; notification mapping must not bypass this gate. */
export const CURRENT_PUBLIC_SPOT_PREDICATE = `s.visibility_policy = 'PUBLIC_EXACT'
  AND s.status IN ('PUBLISHED', 'TEMPORARILY_CLOSED')
  AND a.complete = true AND a.spot_revision = s.version
  AND a.assessed_at >= now() - interval '30 days'`;

/** Correlated current name for queries whose plan alias is p. Use payload.name,
 * exactly as getSpot does, never the separately maintained spots.name column. */
export const CURRENT_PLAN_SPOT_NAME_SQL = `(SELECT s.payload->>'name' FROM spots s
  JOIN spot_publication_assessments a USING (spot_id)
  WHERE s.spot_id=p.spot_id AND ${CURRENT_PUBLIC_SPOT_PREDICATE})`;
