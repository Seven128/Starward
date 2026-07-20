import type { Wgs84Coordinate } from "../../../../../packages/coordinate-system/src/index";

export interface SpotSearchRequest {
  center: Wgs84Coordinate;
  radiusMeters: number;
  limit: number;
  cursor?: string;
  requireFacilities?: string[];
  statuses?: Array<"verified" | "provisional">;
}

export interface SpotSearchItem {
  id: string;
  name: string;
  coordinate: Wgs84Coordinate;
  distanceMeters: number;
  status: "verified" | "provisional";
  facilities: string[];
  verificationAt: string | null;
}

export interface SpotSearchPage { items: SpotSearchItem[]; nextCursor: string | null; }

export type SqlQueryClient = {
  query<T extends Record<string, unknown>>(text: string, values: unknown[]): Promise<{ rows: T[] }>;
};

type Cursor = { distanceMeters: number; id: string };

function encodeCursor(value: Cursor): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeCursor(value: string | undefined): Cursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<Cursor>;
    if (!Number.isFinite(parsed.distanceMeters) || (parsed.distanceMeters ?? -1) < 0 || typeof parsed.id !== "string" || !parsed.id) throw new Error();
    return { distanceMeters: parsed.distanceMeters!, id: parsed.id };
  } catch { throw new Error("spot_search_cursor_invalid"); }
}

function validate(request: SpotSearchRequest): void {
  if (request.center.system !== "WGS84") throw new Error("spot_search_wgs84_required");
  if (!Number.isFinite(request.radiusMeters) || request.radiusMeters <= 0 || request.radiusMeters > 200_000) throw new RangeError("spot_search_radius_out_of_range");
  if (!Number.isInteger(request.limit) || request.limit < 1 || request.limit > 50) throw new RangeError("spot_search_limit_out_of_range");
  if ((request.requireFacilities?.length ?? 0) > 16) throw new RangeError("spot_search_facility_filter_limit");
}

export class PostgresSpotSearchRepository {
  constructor(private readonly sql: SqlQueryClient) {}

  async search(request: SpotSearchRequest): Promise<SpotSearchPage> {
    validate(request);
    const cursor = decodeCursor(request.cursor);
    const result = await this.sql.query<{
      id: string; name: string; latitude: number; longitude: number; distance_meters: number;
      status: "verified" | "provisional"; facilities: string[]; verification_at: string | null;
    }>(
      `WITH bounded AS (
         SELECT id, name, status, facilities, verification_at,
                ST_Y(location::geometry) AS latitude,
                ST_X(location::geometry) AS longitude,
                ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_meters
           FROM spots
          WHERE status = ANY($3::text[])
            AND facilities @> $4::text[]
            AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $5)
       )
       SELECT * FROM bounded
        WHERE ($6::double precision IS NULL OR (distance_meters, id) > ($6, $7::uuid))
        ORDER BY distance_meters ASC, id ASC
        LIMIT $8`,
      [request.center.lon, request.center.lat, request.statuses ?? ["verified", "provisional"], request.requireFacilities ?? [], request.radiusMeters, cursor?.distanceMeters ?? null, cursor?.id ?? null, request.limit + 1],
    );
    const hasNext = result.rows.length > request.limit;
    const rows = result.rows.slice(0, request.limit);
    const items = rows.map((row) => ({
      id: row.id, name: row.name, coordinate: { lat: row.latitude, lon: row.longitude, system: "WGS84" as const },
      distanceMeters: row.distance_meters, status: row.status, facilities: [...row.facilities], verificationAt: row.verification_at,
    }));
    const last = items.at(-1);
    return { items, nextCursor: hasNext && last ? encodeCursor({ distanceMeters: last.distanceMeters, id: last.id }) : null };
  }
}
