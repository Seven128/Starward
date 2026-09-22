/** Pure catalog geometry: no catalog I/O, clock, observer or ephemeris dependency. */
export type StellarDirection = readonly [number, number, number];
/** Unit equatorial position followed by tangent velocity per Julian year. */
export type StellarMotion = readonly [number, number, number, number, number, number];
/** Row-major EQJ -> east/north/up matrix supplied by the ephemeris owner. */
export type EquatorialToEnu = readonly [number, number, number, number, number, number, number, number, number];

const RAD = Math.PI / 180;

function normalized(x: number, y: number, z: number): StellarDirection {
  const length = Math.hypot(x, y, z);
  if (!Number.isFinite(length) || length < 1e-12) throw new Error("stellar_direction_invalid");
  return [x / length, y / length, z / length];
}

export function createStellarMotion(input: {
  raDeg: number; decDeg: number;
  pmRaCosDecArcsecYr: number; pmDecArcsecYr: number;
}): StellarMotion {
  const { raDeg, decDeg, pmRaCosDecArcsecYr, pmDecArcsecYr } = input;
  if (![raDeg, decDeg, pmRaCosDecArcsecYr, pmDecArcsecYr].every(Number.isFinite) ||
    raDeg < 0 || raDeg >= 360 || Math.abs(decDeg) > 90) throw new Error("stellar_astrometry_invalid");
  const ra = raDeg * RAD, dec = decDeg * RAD;
  const east = pmRaCosDecArcsecYr * RAD / 3600, north = pmDecArcsecYr * RAD / 3600;
  return [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec),
    -east * Math.sin(ra) - north * Math.sin(dec) * Math.cos(ra),
    east * Math.cos(ra) - north * Math.sin(dec) * Math.sin(ra), north * Math.cos(dec)];
}

/** Same linear tangent-plane proper motion as the BSC owner; no radial velocity or parallax. */
export function stellarDirectionAt(motion: StellarMotion, julianYears: number): StellarDirection {
  if (!Number.isFinite(julianYears)) throw new Error("stellar_epoch_delta_invalid");
  return normalized(motion[0] + motion[3] * julianYears,
    motion[1] + motion[4] * julianYears, motion[2] + motion[5] * julianYears);
}

/** The matrix must come from a validated frame; this does not compute observer/time facts. */
export function rotateStellarDirection(direction: StellarDirection, matrix: EquatorialToEnu): StellarDirection {
  const [x, y, z] = direction;
  return normalized(matrix[0] * x + matrix[1] * y + matrix[2] * z,
    matrix[3] * x + matrix[4] * y + matrix[5] * z,
    matrix[6] * x + matrix[7] * y + matrix[8] * z);
}

/** Geometry only: the supplied matrix owns observation time/location and refraction policy. */
export function projectStellarMotion(motion: StellarMotion, julianYears: number, matrix: EquatorialToEnu) {
  const [east, north, up] = rotateStellarDirection(stellarDirectionAt(motion, julianYears), matrix);
  return { azimuthDeg: ((Math.atan2(east, north) / RAD) % 360 + 360) % 360,
    altitudeDeg: Math.atan2(up, Math.hypot(east, north)) / RAD };
}
