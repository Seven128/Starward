type Viewer = { userId: string | null; memberships: string[]; invitationIds: string[] };
type LocationRecord = { ownerId: string; tripId?: string; invitationId?: string; visibility: "private" | "invite_only" | "members" | "approximate" | "public"; latitude: number; longitude: number; label: string };

export function serializeLocationForViewer(record: LocationRecord, viewer: Viewer) {
  const exact = viewer.userId === record.ownerId
    || (record.visibility === "members" && record.tripId !== undefined && viewer.memberships.includes(record.tripId))
    || (record.visibility === "invite_only" && record.invitationId !== undefined && viewer.invitationIds.includes(record.invitationId))
    || record.visibility === "public";
  return { label: record.label, precision: exact ? "precise" : "coarse", latitude: exact ? record.latitude : Math.round(record.latitude * 10) / 10, longitude: exact ? record.longitude : Math.round(record.longitude * 10) / 10 };
}

export function redactProductAnalytics(fields: Record<string, unknown>, consent: boolean) {
  if (!consent) return null;
  const blocked = /^(?:lat|lon|latitude|longitude|trajectory|contacts|privateSpot|exif)$/u;
  return Object.fromEntries(Object.entries(fields).filter(([key]) => !blocked.test(key)));
}
