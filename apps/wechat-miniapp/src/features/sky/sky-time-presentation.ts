import { assertSkyObservationFrames, assertSkyTimeModel, assertStellarGeometryFrame,
  STELLAR_GEOMETRY_FORMAT, STELLAR_GEOMETRY_REFERENCE_AT,
  type SkyReport, type SkyGeometryReport, type SkyGeometryRow, type SkyTimeModel,
  type DeepSkyScenePoint, type HourlySkyRow, type SourceSummary } from "@starward/miniapp-contracts";
import { evaluateSkyTimeModel, reprojectSkyTimeDirection } from "@starward/astronomy-core/sky-time-model";
import { exactSkyTimeFrame } from "./sky-time-frame";

const prepared = new WeakMap<SkyReport, SkyTimeModel | null>();
export type SkyTimeRulerRow = Pick<HourlySkyRow, "at"> & Partial<Pick<HourlySkyRow, "opportunityBlockers" | "opportunityEligible">>;

/** Geometry windows supply ticks only, with no fabricated weather/advice. */
export function skyTimeRulerRows(report: SkyReport | undefined, model: SkyTimeModel | null): readonly SkyTimeRulerRow[] {
  return model && model !== skyPresentationTimeModel(report) ? model.knots.map(knot => ({ at: knot.at })) : report?.hourly ?? [];
}

/** The ruler spaces supplied rows uniformly, not their elapsed durations.
 * Interpolate the actual adjacent instants only within admitted model coverage;
 * older reports keep their independently valid nearest supplied row. */
export function skyRulerTime(rows: readonly Pick<HourlySkyRow, "at">[], position: number,
  model: Pick<SkyTimeModel, "startAt" | "endAt"> | null): string | null {
  if (!rows.length || !Number.isFinite(position)) return null;
  const bounded = Math.max(0, Math.min(position, rows.length - 1));
  const nearest = rows[Math.round(bounded)]!.at;
  const left = Math.floor(bounded), right = Math.ceil(bounded);
  if (!model || left === right) return nearest;
  const start = Date.parse(rows[left]!.at), end = Date.parse(rows[right]!.at);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start ||
    !(start >= Date.parse(model.startAt) && end <= Date.parse(model.endAt))) return nearest;
  return new Date(Math.round(start + (end - start) * (bounded - left))).toISOString();
}

function freezeGeometry(value: unknown): void {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
  for (const child of Object.values(value)) freezeGeometry(child);
  Object.freeze(value);
}

/** Admit and freeze only the provider geometry once per report object. The
 * returned immutable model is reused by frames; no day of expanded stars or
 * per-frame contract walk is retained. Other report facts remain untouched. */
export function skyPresentationTimeModel(report: SkyReport | undefined): SkyTimeModel | null {
  if (!report) return null;
  if (prepared.has(report)) return prepared.get(report)!;
  let model: SkyTimeModel | null = null;
  try {
    const at = report.hourly.map(row => row.at);
    assertSkyObservationFrames(report.observationFrames, at);
    const observer = report.observationFrames?.[0]?.observer;
    if (!observer) throw new Error("sky_time_observer_missing");
    assertSkyTimeModel(report.timeModel, { observer, hourlyAt: at });
    model = report.timeModel!;
    freezeGeometry(model);
  } catch { /* Old/bad fine supply retains the independently admitted exact rows. */ }
  prepared.set(report, model);
  return model;
}

const WEATHER_FIELDS = ["cloudPercent", "precipitationMm", "precipitationProbabilityPercent", "windKph", "windGustKph",
  "windDirectionDeg", "temperatureC", "relativeHumidityPercent", "dewPointC", "visibilityKm"] as const;

/** Follow the existing provider-hour coverage, never a nearest astronomy row.
 * Conflicting copies of the same source hour are unusable rather than picked. */
function weatherAt(rows: SkyReport["hourly"], at: string): HourlySkyRow | null {
  const instant = Date.parse(at);
  const rowsInHour = rows.filter(row => row.weatherAt && Date.parse(row.weatherAt) <= instant &&
    instant < Date.parse(row.weatherAt) + 3_600_000);
  const latest = rowsInHour.reduce<HourlySkyRow | null>((value, row) => !value ||
    Date.parse(row.weatherAt!) > Date.parse(value.weatherAt!) ? row : value, null);
  return latest && rowsInHour.filter(row => row.weatherAt === latest.weatherAt).every(row =>
    WEATHER_FIELDS.every(field => row[field] === latest[field]) && row.state === latest.state) ? latest : null;
}

export interface SkyTimePresentation {
  report: SkyGeometryReport;
  row: SkyGeometryRow;
  weather: HourlySkyRow | null;
  mode: "EXACT" | "MODEL";
}

/** A transient, single-instant render input. Never write it into Query,
 * response storage or the committed Context. Advice/event activity is not
 * evaluated by the geometry model and is never relabeled to this instant. */
export function presentSkyTime(report: SkyReport | undefined, at: string,
  suppliedModel?: SkyTimeModel | null, geometrySources?: readonly SourceSummary[]): SkyTimePresentation | null {
  if (!report) return null;
  const exact = exactSkyTimeFrame(report.hourly, at);
  if (exact) return { report, row: exact, weather: exact.weatherAt ? exact : null, mode: "EXACT" };
  const originalModel = skyPresentationTimeModel(report);
  const model = suppliedModel ?? originalModel;
  const anchorAt = originalModel?.startAt ?? report.observationFrames?.[0]?.at;
  const observer = report.observationFrames?.[0]?.observer;
  if (model && (!observer || model.observer.latitude !== observer.latitude ||
    model.observer.longitude !== observer.longitude || model.observer.elevationM !== observer.elevationM)) return null;
  const geometry = model ? evaluateSkyTimeModel(model, at) : null;
  if (!geometry) return null;
  const weather = weatherAt(report.hourly, at);
  const row = geometry.hourly;
  const scene = report.skyScene;
  const stellarAnchor = exactSkyTimeFrame(scene.frames, anchorAt);
  let frames: SkyReport["skyScene"]["frames"] = [{ at, state: "UNAVAILABLE", geometry: null }];
  if (scene.state === "AVAILABLE" && scene.catalog && scene.observer && stellarAnchor?.geometry && stellarAnchor.state === "AVAILABLE") {
    try {
      assertStellarGeometryFrame(stellarAnchor.geometry, { catalog: scene.catalog, observer: scene.observer, at: anchorAt! });
      const current = { ...stellarAnchor.geometry, at, julianYears: geometry.julianYears,
        equatorialToEnu: geometry.observationFrame.equatorialToEnu, observer: geometry.observationFrame.observer,
        format: STELLAR_GEOMETRY_FORMAT, referenceAt: STELLAR_GEOMETRY_REFERENCE_AT };
      assertStellarGeometryFrame(current, { catalog: scene.catalog, observer: scene.observer, at });
      frames = [{ at, state: "AVAILABLE", geometry: current }];
    } catch { /* Keep valid independent solar/observation/deep layers. */ }
  }
  let deepSky = scene.deepSky;
  const deepAnchor = exactSkyTimeFrame(deepSky?.frames, anchorAt);
  const observationAnchor = exactSkyTimeFrame(report.observationFrames, anchorAt);
  if (deepSky && deepAnchor && observationAnchor) {
    let points: DeepSkyScenePoint[] | null = null;
    if (deepSky.state === "AVAILABLE" && deepAnchor.state === "AVAILABLE" && deepAnchor.points) {
      try {
        points = deepAnchor.points.map(point => {
          const rays = [1, 3, 5].map(index => reprojectSkyTimeDirection(point[index]!, point[index + 1]!,
            observationAnchor.equatorialToEnu, geometry.observationFrame.equatorialToEnu));
          return [point[0], rays[0]!.azimuthDeg, rays[0]!.altitudeDeg, rays[1]!.azimuthDeg, rays[1]!.altitudeDeg,
            rays[2]!.azimuthDeg, rays[2]!.altitudeDeg];
        });
      } catch { /* An invalid deep layer cannot invalidate solar or stellar motion. */ }
    }
    deepSky = { ...deepSky, frames: [{ at, state: points ? "AVAILABLE" : "UNAVAILABLE", points }] };
  } else if (deepSky) deepSky = { ...deepSky, frames: [{ at, state: "UNAVAILABLE", points: null }] };
  return { mode: "MODEL", row, weather, report: { ...report, hourly: [row], observationFrames: [geometry.observationFrame],
    timeModel: null, targets: [], targetFrames: [],
    ...(geometrySources?.length ? { sources: [...report.sources.filter(source =>
      !geometrySources.some(geometrySource => geometrySource.id === source.id)), ...geometrySources] } : {}),
    skyScene: { ...scene, frames, ...(deepSky ? { deepSky } : {}) } } };
}
