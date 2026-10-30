import { assertSkyObservationFrames, assertSkyTimeModel, assertStellarGeometryFrame, skyGeometryWindow,
  cloudPointSeriesAt,
  STELLAR_GEOMETRY_FORMAT, STELLAR_GEOMETRY_REFERENCE_AT,
  type SkyReport, type SkyGeometryReport, type SkyGeometryRow, type SkyTimeModel,
  type DeepSkyScenePoint, type HourlySkyRow, type SourceSummary } from "@starward/miniapp-contracts";
import { evaluateSkyTimeModel, reprojectSkyTimeDirection } from "@starward/astronomy-core/sky-time-model";
import { exactSkyTimeFrame } from "./sky-time-frame";

const prepared = new WeakMap<SkyReport, SkyTimeModel | null>();
export type SkyTimeRulerRow = Pick<HourlySkyRow, "at"> & Partial<Pick<HourlySkyRow, "opportunityBlockers" | "opportunityEligible">>;

/** Calendar selection keeps the complete observation day even when the
 * admitted geometry is only a short preview. These ticks supply no facts. */
export function skyTimeRulerRows(report: SkyReport | undefined, model: SkyTimeModel | null,
  requestedAt?: string, previous?: readonly SkyTimeRulerRow[]): readonly SkyTimeRulerRow[] {
  const original = skyPresentationTimeModel(report);
  const outsideOriginal = requestedAt && (!original || Date.parse(requestedAt) < Date.parse(original.startAt) ||
    Date.parse(requestedAt) > Date.parse(original.endAt));
  if (!model || !report || model === original && !outsideOriginal) return report?.hourly ?? [];
  const at = requestedAt ?? model.startAt, instant = Date.parse(at);
  // The caller retains only this report's current ticks. Reuse their exact
  // civil-day interval without repeating IANA conversion on every Play frame.
  if (previous && previous !== report.hourly && previous.length > 1 &&
    Date.parse(previous[0]!.at) <= instant && instant < Date.parse(previous[previous.length - 1]!.at)) return previous;
  try { return skyGeometryWindow(at, report.context.timezone).hourlyAt.map(at => ({ at })); }
  catch { return []; } // Unsupported supply must not crash the independent civil controls.
}

/** The ruler spaces supplied rows uniformly, not their elapsed durations.
 * Calendar selection can request a not-yet-supplied instant; the geometry owner
 * obtains it separately. Older exact-only reports retain nearest-row input. */
export function skyRulerTime(rows: readonly Pick<HourlySkyRow, "at">[], position: number,
  model: Pick<SkyTimeModel, "startAt" | "endAt"> | "CALENDAR" | null): string | null {
  if (!rows.length || !Number.isFinite(position)) return null;
  const bounded = Math.max(0, Math.min(position, rows.length - 1));
  const nearest = rows[Math.round(bounded)]!.at;
  const left = Math.floor(bounded), right = Math.ceil(bounded);
  if (!model || left === right) return nearest;
  const start = Date.parse(rows[left]!.at), end = Date.parse(rows[right]!.at);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start ||
    (model !== "CALENDAR" && !(start >= Date.parse(model.startAt) && end <= Date.parse(model.endAt)))) return nearest;
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

const WEATHER_FIELDS = ["precipitationMm", "precipitationProbabilityPercent", "windKph", "windGustKph",
  "windDirectionDeg", "temperatureC", "relativeHumidityPercent", "dewPointC", "visibilityKm"] as const;

/** Follow the existing provider-hour coverage, never a nearest astronomy row.
 * Conflicting copies of the same source hour are unusable rather than picked. */
function weatherAt(rows: SkyReport["hourly"], at: string, independentCloud: boolean): HourlySkyRow | null {
  const instant = Date.parse(at);
  const rowsInHour = rows.filter(row => row.weatherAt && Date.parse(row.weatherAt) <= instant &&
    instant < Date.parse(row.weatherAt) + 3_600_000);
  const latest = rowsInHour.reduce<HourlySkyRow | null>((value, row) => !value ||
    Date.parse(row.weatherAt!) > Date.parse(value.weatherAt!) ? row : value, null);
  return latest && rowsInHour.filter(row => row.weatherAt === latest.weatherAt).every(row =>
    WEATHER_FIELDS.every(field => row[field] === latest[field]) &&
    (independentCloud || row.cloudPercent === latest.cloudPercent && row.state === latest.state)) ? latest : null;
}

type SkyTimeWeather = Pick<HourlySkyRow, "at" | "weatherAt" | "cloudPercent" | "cloudEvidence" | "state" | typeof WEATHER_FIELDS[number]>;

/** Geometry can move at every Play tick while the total cloud is sampled from
 * this report's one pinned native series. Other fields keep their source hour. */
function presentWeather(report: SkyReport, at: string, now: number, exact?: HourlySkyRow | null): SkyTimeWeather | null {
  const totalCloud = report.weatherEvidence?.totalCloud;
  const independentCloud = totalCloud !== undefined || report.hourly.some(row => row.cloudEvidence !== undefined);
  if (!independentCloud) return exact ? exact.weatherAt ? exact : null : weatherAt(report.hourly, at, false);
  const source = weatherAt(report.hourly, at, true);
  const weather = source?.weatherAt && now < Date.parse(source.weatherAt) + 3_600_000 ? source : null;
  const cloudEvidence = totalCloud?.value ? cloudPointSeriesAt(totalCloud.value, at, now) : null;
  if (!weather && !cloudEvidence) return null;
  return { at, weatherAt: weather?.weatherAt ?? null, cloudPercent: cloudEvidence?.cloudPercent ?? null, cloudEvidence,
    precipitationMm: weather?.precipitationMm ?? null, precipitationProbabilityPercent: weather?.precipitationProbabilityPercent ?? null,
    windKph: weather?.windKph ?? null, windGustKph: weather?.windGustKph ?? null, windDirectionDeg: weather?.windDirectionDeg ?? null,
    temperatureC: weather?.temperatureC ?? null, relativeHumidityPercent: weather?.relativeHumidityPercent ?? null,
    dewPointC: weather?.dewPointC ?? null, visibilityKm: weather?.visibilityKm ?? null,
    state: weather && cloudEvidence ? weather.state : "PARTIAL" };
}

export interface SkyTimePresentation {
  source: SkyReport;
  model: SkyTimeModel | null;
  report: SkyGeometryReport;
  row: SkyGeometryRow;
  weather: SkyTimeWeather | null;
  mode: "EXACT" | "MODEL";
}

/** The page supplies only its current lifecycle-accepted input. Reusing that
 * one input keeps resource demand and drawing on the same valid instant while
 * another window loads; cancellation chooses the time owner's legal entry
 * instant, which may precede a future Map Context. Native generation, mode
 * and visibility remain the page's acceptance scope. */
export function selectSkyTimePresentation(report: SkyReport | undefined, requestedAt: string, restoreAt: string,
  requested: SkyTimePresentation | null, accepted: SkyTimePresentation | null, latestInstant = Infinity): SkyTimePresentation | null {
  const allowed = (at: string) => Number.isFinite(Date.parse(at)) && Date.parse(at) <= latestInstant;
  if (requested && allowed(requested.row.at)) return requested;
  if (requestedAt !== restoreAt && accepted && accepted.source === report && allowed(accepted.row.at)) return accepted;
  return allowed(restoreAt) ? presentSkyTime(report, restoreAt) : null;
}

/** A transient, single-instant render input. Never write it into Query,
 * response storage or the committed Context. Advice/event activity is not
 * evaluated by the geometry model and is never relabeled to this instant. */
export function presentSkyTime(report: SkyReport | undefined, at: string,
  suppliedModel?: SkyTimeModel | null, geometrySources?: readonly SourceSummary[], now = Date.now()): SkyTimePresentation | null {
  if (!report) return null;
  const exact = exactSkyTimeFrame(report.hourly, at);
  if (exact) return { source: report, model: null, report, row: exact, weather: presentWeather(report, at, now, exact), mode: "EXACT" };
  const originalModel = skyPresentationTimeModel(report);
  const model = suppliedModel ?? originalModel;
  const anchorAt = originalModel?.startAt ?? report.observationFrames?.[0]?.at;
  const observer = report.observationFrames?.[0]?.observer;
  if (model && (!observer || model.observer.latitude !== observer.latitude ||
    model.observer.longitude !== observer.longitude || model.observer.elevationM !== observer.elevationM)) return null;
  const geometry = model ? evaluateSkyTimeModel(model, at) : null;
  if (!geometry) return null;
  const weather = presentWeather(report, at, now);
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
      // This newly owned exact instant can safely feed current-Canvas drawing
      // preparation. Do not freeze or retain historical report frames here.
      freezeGeometry(current);
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
  return { source: report, model, mode: "MODEL", row, weather, report: { ...report, hourly: [row], observationFrames: [geometry.observationFrame],
    timeModel: null, targets: [], targetFrames: [],
    ...(geometrySources?.length ? { sources: [...report.sources.filter(source =>
      !geometrySources.some(geometrySource => geometrySource.id === source.id)), ...geometrySources] } : {}),
    skyScene: { ...scene, frames, ...(deepSky ? { deepSky } : {}) } } };
}
