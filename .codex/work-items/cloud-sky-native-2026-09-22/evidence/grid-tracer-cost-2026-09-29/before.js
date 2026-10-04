"use strict";
var gridBefore = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // <stdin>
  var stdin_exports = {};
  __export(stdin_exports, {
    createSkyGridTracer: () => createSkyGridTracer,
    createSkyViewBasis: () => createSkyViewBasis,
    skyEquatorialDirectionToEnu: () => skyEquatorialDirectionToEnu,
    skyEquatorialGrid: () => skyEquatorialGrid,
    skyHorizontalDirection: () => skyHorizontalDirection,
    skyHorizontalGrid: () => skyHorizontalGrid
  });

  // apps/wechat-miniapp/src/features/sky/sky-view-projection.ts
  var DEGREES_TO_RADIANS = Math.PI / 180;
  var BASIS_TOLERANCE = 1e-6;
  function finite(value) {
    return typeof value === "number" && Number.isFinite(value);
  }
  function normalizeDegrees(value) {
    const normalized = (value % 360 + 360) % 360;
    return Object.is(normalized, -0) ? 0 : normalized;
  }
  function skyHorizontalDirection(azimuthDeg, altitudeDeg) {
    if (!finite(azimuthDeg) || !finite(altitudeDeg) || altitudeDeg < -90 || altitudeDeg > 90) return null;
    const azimuthRad = normalizeDegrees(azimuthDeg) * DEGREES_TO_RADIANS;
    const altitudeRad = altitudeDeg * DEGREES_TO_RADIANS;
    const cosAltitude = Math.cos(altitudeRad);
    return [cosAltitude * Math.sin(azimuthRad), cosAltitude * Math.cos(azimuthRad), Math.sin(altitudeRad)];
  }
  function cleanZero(value) {
    return Math.abs(value) < 1e-12 ? 0 : value;
  }
  function vector(value) {
    return [cleanZero(value[0]), cleanZero(value[1]), cleanZero(value[2])];
  }
  function rotatePoseVector(input, headingRad, betaRad, gammaRad) {
    const sinGamma = Math.sin(gammaRad);
    const cosGamma = Math.cos(gammaRad);
    const afterY = [
      cosGamma * input[0] + sinGamma * input[2],
      input[1],
      -sinGamma * input[0] + cosGamma * input[2]
    ];
    const sinBeta = Math.sin(betaRad);
    const cosBeta = Math.cos(betaRad);
    const afterX = [
      afterY[0],
      cosBeta * afterY[1] - sinBeta * afterY[2],
      sinBeta * afterY[1] + cosBeta * afterY[2]
    ];
    const sinHeading = Math.sin(headingRad);
    const cosHeading = Math.cos(headingRad);
    return vector([
      cosHeading * afterX[0] + sinHeading * afterX[1],
      -sinHeading * afterX[0] + cosHeading * afterX[1],
      afterX[2]
    ]);
  }
  function createSkyViewBasis(headingDeg, betaDeg, gammaDeg) {
    if (!finite(headingDeg) || !finite(betaDeg) || !finite(gammaDeg) || betaDeg < -180 || betaDeg > 180 || gammaDeg < -90 || gammaDeg > 90)
      return null;
    const headingRad = normalizeDegrees(headingDeg) * DEGREES_TO_RADIANS;
    const betaRad = betaDeg * DEGREES_TO_RADIANS;
    const gammaRad = gammaDeg * DEGREES_TO_RADIANS;
    return {
      right: rotatePoseVector([1, 0, 0], headingRad, betaRad, gammaRad),
      up: rotatePoseVector([0, 1, 0], headingRad, betaRad, gammaRad),
      forward: rotatePoseVector([0, 0, -1], headingRad, betaRad, gammaRad)
    };
  }
  function dot(left, right) {
    return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
  }
  function cross(left, right) {
    return [
      left[1] * right[2] - left[2] * right[1],
      left[2] * right[0] - left[0] * right[2],
      left[0] * right[1] - left[1] * right[0]
    ];
  }
  function validVector(value) {
    return Array.isArray(value) && value.length === 3 && value.every((component) => finite(component));
  }
  function validBasis(value) {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value;
    const right = candidate.right;
    const up = candidate.up;
    const forward = candidate.forward;
    if (!validVector(right) || !validVector(up) || !validVector(forward))
      return false;
    const vectors = [right, up, forward];
    for (const current of vectors) {
      if (Math.abs(Math.hypot(...current) - 1) > BASIS_TOLERANCE) return false;
    }
    const rightCrossUp = cross(right, up);
    return Math.abs(dot(right, up)) <= BASIS_TOLERANCE && Math.abs(dot(right, forward)) <= BASIS_TOLERANCE && Math.abs(dot(up, forward)) <= BASIS_TOLERANCE && rightCrossUp.every(
      (component, index) => Math.abs(component + forward[index]) <= BASIS_TOLERANCE
    );
  }
  function projectSkyDirectionUnclipped(azimuthDeg, altitudeDeg, basis, width, height, verticalFovDeg, center) {
    if (!finite(azimuthDeg) || !finite(altitudeDeg) || altitudeDeg < -90 || altitudeDeg > 90 || !validBasis(basis) || !finite(width) || !finite(height) || width <= 0 || height <= 0 || !finite(verticalFovDeg) || verticalFovDeg <= 0 || verticalFovDeg >= 360)
      return null;
    const direction = skyHorizontalDirection(azimuthDeg, altitudeDeg);
    const cameraRight = dot(direction, basis.right);
    const cameraUp = dot(direction, basis.up);
    const cameraForward = dot(direction, basis.forward);
    const denominator = 1 + cameraForward;
    if (!(denominator > 1e-9)) return null;
    const scale = skyProjectionScale(height, verticalFovDeg);
    if (scale === null) return null;
    const x = (center?.x ?? width / 2) + scale * cameraRight / denominator;
    const y = (center?.y ?? height / 2) - scale * cameraUp / denominator;
    if (!finite(x) || !finite(y))
      return null;
    return {
      x,
      y,
      degrees: normalizeDegrees(azimuthDeg),
      altitude: altitudeDeg
    };
  }
  function skyProjectionScale(height, verticalFovDeg) {
    if (!finite(height) || height <= 0 || !finite(verticalFovDeg) || verticalFovDeg <= 0 || verticalFovDeg >= 360) return null;
    return height / (2 * Math.tan(verticalFovDeg * Math.PI / 720));
  }

  // apps/wechat-miniapp/src/features/sky/sky-line-clip.ts
  function clipSkyLineToViewport(a, b, width, height) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    let start = 0, end = 1;
    for (const [p, q] of [[-dx, a[0]], [dx, width - a[0]], [-dy, a[1]], [dy, height - a[1]]]) {
      if (p === 0) {
        if (q < 0) return null;
        continue;
      }
      const t = q / p;
      if (p < 0) start = Math.max(start, t);
      else end = Math.min(end, t);
      if (start > end) return null;
    }
    return [a[0] + start * dx, a[1] + start * dy, a[0] + end * dx, a[1] + end * dy];
  }

  // apps/wechat-miniapp/src/features/sky/sky-grid-projection.ts
  var midpoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  function createSkyGridTracer(basis, width, height, verticalFovDeg, center, direction) {
    const ray = (sample) => direction(sample[0], sample[1]);
    const project = (sample) => {
      const value = ray(sample);
      if (!value || value[2] < -1e-12) return null;
      const forward = value[0] * basis.forward[0] + value[1] * basis.forward[1] + value[2] * basis.forward[2];
      if (forward < -0.98) return null;
      const azimuth = Math.atan2(value[0], value[1]) * 180 / Math.PI;
      const altitude = Math.asin(Math.max(0, Math.min(1, value[2]))) * 180 / Math.PI;
      const point = projectSkyDirectionUnclipped(azimuth, altitude, basis, width, height, verticalFovDeg, center);
      return point ? [point.x, point.y] : null;
    };
    return (count, sample) => {
      const lines = [];
      const arc = (a, b, pa, pb, depth) => {
        const middle = midpoint(a, b), pm = project(middle);
        if (!pm) return;
        const error = Math.hypot(pm[0] - (pa[0] + pb[0]) / 2, pm[1] - (pa[1] + pb[1]) / 2);
        const margin = Math.max(0.5, error);
        if (Math.max(pa[0], pm[0], pb[0]) < -margin || Math.min(pa[0], pm[0], pb[0]) > width + margin || Math.max(pa[1], pm[1], pb[1]) < -margin || Math.min(pa[1], pm[1], pb[1]) > height + margin) return;
        if (depth < 12 && error > 0.35) {
          arc(a, middle, pa, pm, depth + 1);
          arc(middle, b, pm, pb, depth + 1);
        } else {
          const clipped = clipSkyLineToViewport(pa, pb, width, height);
          if (clipped) lines.push(clipped);
        }
      };
      let previous = sample(0);
      for (let index = 1; index <= count; index++) {
        const current = sample(index);
        const start = previous;
        previous = current;
        const first = ray(start), last = ray(current);
        if (!first || !last) continue;
        let pieces = [[start, current]];
        if (first[2] < 0 && last[2] < 0) {
          const middle = ray(midpoint(start, current));
          if (!middle) continue;
          const curvature = first[2] - 2 * middle[2] + last[2];
          if (curvature >= 0) continue;
          const fraction = 0.5 + (first[2] - last[2]) / (4 * curvature);
          if (fraction <= 0 || fraction >= 1) continue;
          const peak = [
            start[0] + (current[0] - start[0]) * fraction,
            start[1] + (current[1] - start[1]) * fraction
          ];
          const peakRay = ray(peak);
          if (!peakRay || peakRay[2] < 0) continue;
          pieces = [[start, peak], [peak, current]];
        }
        for (const [startPiece, endPiece] of pieces) {
          let a = startPiece, b = endPiece;
          const ra = ray(a), rb = ray(b);
          if (ra[2] < 0 !== rb[2] < 0) {
            let below = ra[2] < 0 ? a : b, above = ra[2] < 0 ? b : a;
            for (let iteration = 0; iteration < 24; iteration++) {
              const middle = midpoint(below, above), value = ray(middle);
              if (!value || value[2] < 0) below = middle;
              else above = middle;
            }
            if (ra[2] < 0) a = above;
            else b = above;
          }
          const pa = project(a), pb = project(b);
          if (pa && pb) arc(a, b, pa, pb, 0);
        }
      }
      return lines;
    };
  }

  // apps/wechat-miniapp/src/features/sky/sky-horizontal-grid.ts
  function skyHorizontalGrid(basis, width, height, verticalFovDeg, center, enabled = true) {
    const trace = createSkyGridTracer(basis, width, height, verticalFovDeg, center, skyHorizontalDirection);
    const step = verticalFovDeg >= 90 ? 2 : 1;
    return {
      horizon: trace(360 / step, (index) => [index * step, 0]),
      altitude: enabled ? [30, 60].flatMap((altitude) => trace(360 / step, (index) => [index * step, altitude])) : [],
      meridians: enabled ? Array.from({ length: 12 }, (_, index) => index * 30).flatMap((azimuth) => trace(90 / step, (index) => [azimuth, index * step])) : []
    };
  }

  // packages/miniapp-contracts/src/filters.ts
  var facility = (spot, type) => spot.facilities.some(
    (item) => item.type === type && item.status === "AVAILABLE"
  );
  var dynamicUnavailable = () => false;
  var FILTER_OPTIONS = Object.freeze([
    {
      id: "lightPollution",
      label: "\u5149\u5BB3",
      group: "LIGHT_POLLUTION",
      category: "OBSERVATION",
      mode: "CANCELABLE_SINGLE",
      evidence: "STATIC_SPOT",
      test: (spot) => spot.lightPollution.productBand !== null
    },
    {
      id: "lessCloud",
      label: "\u5C11\u4E91",
      group: "LESS_CLOUD",
      category: "OBSERVATION",
      mode: "CANCELABLE_SINGLE",
      evidence: "DYNAMIC_CONTEXT",
      test: dynamicUnavailable
    },
    {
      id: "parking",
      label: "\u505C\u8F66",
      group: "PARKING",
      category: "FACILITIES",
      mode: "CANCELABLE_SINGLE",
      evidence: "STATIC_SPOT",
      test: (spot) => facility(spot, "PARKING")
    },
    {
      id: "restroom",
      label: "\u5395\u6240",
      group: "RESTROOM",
      category: "FACILITIES",
      mode: "CANCELABLE_SINGLE",
      evidence: "STATIC_SPOT",
      test: (spot) => facility(spot, "TOILET")
    },
    {
      id: "driveUpAccess",
      label: "\u53EF\u9A7E\u8F66\u76F4\u8FBE",
      group: "DRIVE_UP_ACCESS",
      category: "ARRIVAL",
      mode: "CANCELABLE_SINGLE",
      evidence: "STATIC_SPOT",
      test: (spot) => spot.accessTags.includes("DRIVE_TO")
    },
    {
      id: "photoForeground",
      label: "\u6444\u5F71\u524D\u666F",
      group: "PHOTO_FOREGROUND",
      category: "PLACE",
      mode: "CANCELABLE_SINGLE",
      evidence: "STATIC_SPOT",
      test: (spot) => spot.media.some((item) => item.isSiteSpecific)
    },
    {
      id: "campingOvernightParking",
      label: "\u53EF\u9732\u8425/\u9A7B\u8F66",
      group: "CAMPING_OVERNIGHT_PARKING",
      category: "PLACE",
      mode: "CANCELABLE_SINGLE",
      evidence: "STATIC_SPOT",
      test: (spot) => facility(spot, "CAMPING")
    },
    {
      id: "specificCelestialEvent",
      label: "\u7279\u5B9A\u5929\u8C61",
      group: "SPECIFIC_CELESTIAL_EVENT",
      category: "OBSERVATION",
      mode: "CANCELABLE_SINGLE",
      evidence: "DYNAMIC_CONTEXT",
      test: dynamicUnavailable
    },
    {
      id: "moonImpact",
      label: "\u6708\u4EAE\u5F71\u54CD",
      group: "MOON_IMPACT",
      category: "OBSERVATION",
      mode: "CANCELABLE_SINGLE",
      evidence: "DYNAMIC_CONTEXT",
      test: dynamicUnavailable
    },
    {
      id: "hikingDifficulty",
      label: "\u5F92\u6B65\u96BE\u5EA6",
      group: "HIKING_DIFFICULTY",
      category: "ARRIVAL",
      mode: "CANCELABLE_SINGLE",
      evidence: "STATIC_SPOT",
      test: (spot) => spot.accessTags.includes("NO_HIKE")
    },
    {
      id: "signal",
      label: "\u4FE1\u53F7",
      group: "SIGNAL",
      category: "FACILITIES",
      mode: "CANCELABLE_SINGLE",
      evidence: "STATIC_SPOT",
      test: (spot) => facility(spot, "SIGNAL")
    },
    {
      id: "charging",
      label: "\u5145\u7535",
      group: "CHARGING",
      category: "FACILITIES",
      mode: "CANCELABLE_SINGLE",
      evidence: "STATIC_SPOT",
      test: (spot) => facility(spot, "CHARGING")
    },
    {
      id: "openSkyDirection",
      label: "\u5929\u7A7A\u5F00\u9614\u65B9\u5411",
      group: "OPEN_SKY_DIRECTION",
      category: "OBSERVATION",
      mode: "CANCELABLE_SINGLE",
      evidence: "STATIC_SPOT",
      test: (spot) => spot.clearDirections.length > 0
    },
    {
      id: "lastVerifiedAt",
      label: "\u6700\u8FD1\u6838\u9A8C\u65F6\u95F4",
      group: "LAST_VERIFIED_AT",
      category: "FRESHNESS",
      mode: "CANCELABLE_SINGLE",
      evidence: "STATIC_SPOT",
      test: (spot) => spot.lastVerifiedAt !== null
    }
  ]);
  var FILTER_GROUPS = Object.freeze(
    FILTER_OPTIONS.map((option) => {
      return {
        key: option.group,
        category: option.category,
        title: option.label,
        mode: option.mode
      };
    })
  );
  var EMPTY_FILTER_STATE = Object.freeze(
    Object.fromEntries(
      [
        ...FILTER_GROUPS.map(({ key }) => [key, Object.freeze([])])
      ]
    )
  );
  if (FILTER_OPTIONS.length !== 14 || new Set(FILTER_OPTIONS.map((item) => item.id)).size !== 14) {
    throw new Error("filter_schema_must_be_exact_ordered_14");
  }

  // packages/miniapp-contracts/src/feature-flags.ts
  var SELECTED_FEATURE_FLAGS = Object.freeze({
    GLOBAL_NIGHT_TAB_ENABLED: false,
    ORDINARY_PLACE_SKY_ENABLED: false,
    DARK_SKY_CANDIDATES_ENABLED: false,
    SKY_EVENT_ENABLED: true,
    REAL_WEATHER_ENABLED: true,
    LAYERED_CLOUD_ENABLED: false,
    WEATHER_MODEL_COMPARISON_ENABLED: false,
    LIGHT_POLLUTION_LAYER_ENABLED: true,
    SKY_OPPORTUNITY_LAYER_ENABLED: true,
    DYNAMIC_SKY_MAP_ENABLED: true,
    WECHAT_AUTH_ENABLED: true,
    EVENT_SUBSCRIPTION_ENABLED: false,
    PROFILE_LINKS_ENABLED: true,
    OWN_POST_IMPORT_ENABLED: true
  });

  // packages/miniapp-contracts/src/preferences.ts
  var DEFAULT_USER_PREFERENCES = Object.freeze({
    defaultPlace: "\u6DF1\u5733",
    locationPreference: "ASK_ONCE",
    experience: "BEGINNER",
    maxDriveMinutes: 180,
    requiredFacilities: [],
    equipment: "\u672A\u8BBE\u7F6E",
    capturePreference: "\u76EE\u89C6\u4E0E\u624B\u673A",
    displayMode: "DAY",
    notificationEnabled: false,
    departureConditionReminder: false,
    contributionStatusReminder: false,
    largeText: false,
    reducedMotion: false
  });

  // packages/miniapp-contracts/src/stellar-geometry.ts
  var YEAR_MS = 365.25 * 864e5;

  // packages/miniapp-contracts/src/sky-scene.ts
  var SKY_SCENE_MAX_SERIALIZED_BYTES = 2 * 1048576;

  // packages/miniapp-contracts/src/stellar-supplement.ts
  var SAO_MAX_TILE_BYTES = 192 * 1024;

  // packages/miniapp-contracts/src/constellation-catalog.ts
  var CONSTELLATION_SOURCE_COMMIT = "ab961cbde42eec8121be0df6ff48292f8d492b54";
  var CONSTELLATION_SOURCE_BASE = `https://raw.githubusercontent.com/Stellarium/stellarium/${CONSTELLATION_SOURCE_COMMIT}/skycultures/modern/`;

  // apps/wechat-miniapp/src/features/sky/sky-observation-frame.ts
  function skyEquatorialDirectionToEnu(matrix, direction) {
    return [
      matrix[0] * direction[0] + matrix[1] * direction[1] + matrix[2] * direction[2],
      matrix[3] * direction[0] + matrix[4] * direction[1] + matrix[5] * direction[2],
      matrix[6] * direction[0] + matrix[7] * direction[1] + matrix[8] * direction[2]
    ];
  }

  // apps/wechat-miniapp/src/features/sky/sky-equatorial-grid.ts
  function skyEquatorialGrid(frame, basis, width, height, verticalFovDeg, center) {
    const trace = createSkyGridTracer(basis, width, height, verticalFovDeg, center, (ra, dec) => {
      const longitude = ra * Math.PI / 180, latitude = dec * Math.PI / 180;
      return skyEquatorialDirectionToEnu(
        frame.equatorialToEnu,
        [Math.cos(latitude) * Math.cos(longitude), Math.cos(latitude) * Math.sin(longitude), Math.sin(latitude)]
      );
    });
    const step = verticalFovDeg >= 90 ? 2 : 1;
    return {
      equator: trace(360 / step, (index) => [index * step, 0]),
      parallels: [-60, -30, 30, 60].flatMap((dec) => trace(360 / step, (index) => [index * step, dec])),
      meridians: Array.from({ length: 12 }, (_, index) => index * 30).flatMap((ra) => trace(180 / step, (index) => [ra, -90 + index * step]))
    };
  }
  return __toCommonJS(stdin_exports);
})();
