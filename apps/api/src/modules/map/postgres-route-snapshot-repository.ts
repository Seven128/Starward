import type { RouteRequest, RouteSnapshot, RouteSnapshotRepository } from "./route-service";
import type { SqlQueryClient } from "./spot-search-service";

function fromRow(row: Record<string, unknown> | undefined): RouteSnapshot | null {
  if (!row || typeof row.payload !== "object" || row.payload === null) return null;
  return structuredClone(row.payload as RouteSnapshot);
}

export class PostgresRouteSnapshotRepository implements RouteSnapshotRepository {
  constructor(private readonly sql: SqlQueryClient, private readonly now: () => Date = () => new Date()) {}

  async findUsable(request: RouteRequest): Promise<RouteSnapshot | null> {
    const result = await this.sql.query(
      `SELECT payload
         FROM route_snapshots
        WHERE mode = $1
          AND expires_at > $2::timestamptz
          AND ST_DWithin(origin, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, 1)
          AND ST_DWithin(destination, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography, 1)
        ORDER BY generated_at DESC
        LIMIT 1`,
      [request.mode, this.now().toISOString(), request.origin.lon, request.origin.lat, request.destination.lon, request.destination.lat],
    );
    const snapshot = fromRow(result.rows[0]);
    return snapshot?.navigationUsable ? snapshot : null;
  }

  async save(snapshot: RouteSnapshot): Promise<RouteSnapshot> {
    if (!snapshot.navigationUsable || snapshot.distanceMeters === null || snapshot.durationSeconds === null || snapshot.geometry === null) {
      throw new Error("route_snapshot_unusable_not_persisted");
    }
    const result = await this.sql.query(
      `INSERT INTO route_snapshots
         (id, request_id, provider, provider_version, origin, destination, provider_coordinate_system, mode, distance_m, duration_s, geometry, generated_at, expires_at, payload)
       VALUES
         ($1::uuid, $2, $3, $4,
          ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography,
          ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography,
          $9, $10, $11, $12, ST_GeomFromText($13, 4326), $14::timestamptz, $15::timestamptz, $16::jsonb)
       ON CONFLICT (request_id) DO NOTHING
       RETURNING payload`,
      [
        snapshot.id, snapshot.requestId, snapshot.provider, snapshot.providerVersion,
        snapshot.authoritativeCoordinates.origin.lon, snapshot.authoritativeCoordinates.origin.lat,
        snapshot.authoritativeCoordinates.destination.lon, snapshot.authoritativeCoordinates.destination.lat,
        snapshot.providerCoordinateSystem, snapshot.mode, snapshot.distanceMeters, snapshot.durationSeconds, snapshot.geometry,
        snapshot.generatedAt, snapshot.expiresAt, JSON.stringify(snapshot),
      ],
    );
    return fromRow(result.rows[0]) ?? snapshot;
  }
}
