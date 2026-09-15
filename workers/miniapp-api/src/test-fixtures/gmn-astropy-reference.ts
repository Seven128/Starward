// Independent Astropy 6.1.7 / NumPy 2.2.6 reference, derived from GMN 2022–2023.
// get_sun -> GeocentricMeanEcliptic(equinox=J2000), then TETE/airless AltAz.
// Observer 114.5E, 22.6N, 30 m. Bundled IERS, no network; future rows use
// mean polar motion/UT1-UTC=0. Tests allow 0.02 degrees, not arcsecond claims.
// Acquisition/generator: output/provider-selection-and-repair/adoption-2026-09-14/gmn-astropy-reference.py
export default [
  {
    "code": "PER",
    "at": "2026-08-12T18:00:00Z",
    "model": {
      "frame": "SUN_CENTERED_ECLIPTIC_J2000",
      "referenceSolarLongitudeDeg": 140.4,
      "sunCenteredLongitudeDeg": 283.40668,
      "latitudeDeg": 38.295803,
      "longitudeDriftDegPerDeg": 0.07615,
      "latitudeDriftDegPerDeg": -0.070791,
      "validSolarOffsetMinDeg": -17.209357,
      "validSolarOffsetMaxDeg": 6.188334
    },
    "solarLongitudeDeg": 139.6739161283105,
    "offset": -0.7260838716894966,
    "rightAscensionDeg": 48.47469381351369,
    "declinationDeg": 58.01520572251002,
    "azimuthDeg": 34.321000558245956,
    "altitudeDeg": 33.34575285023623
  },
  {
    "code": "URS",
    "at": "2026-12-21T18:00:00Z",
    "model": {
      "frame": "SUN_CENTERED_ECLIPTIC_J2000",
      "referenceSolarLongitudeDeg": 270.4,
      "sunCenteredLongitudeDeg": 217.857209,
      "latitudeDeg": 71.996959,
      "longitudeDriftDegPerDeg": -0.63569,
      "latitudeDriftDegPerDeg": 0.460286,
      "validSolarOffsetMinDeg": -1.168204,
      "validSolarOffsetMaxDeg": 0.111727
    },
    "solarLongitudeDeg": 269.5001750087122,
    "offset": -0.8998249912878009,
    "rightAscensionDeg": 217.4448820823253,
    "declinationDeg": 75.71857237668164,
    "azimuthDeg": 14.733617636939263,
    "altitudeDeg": 18.82310188058899
  },
  {
    "code": "QUA",
    "at": "2026-01-04T00:00:00Z",
    "model": {
      "frame": "SUN_CENTERED_ECLIPTIC_J2000",
      "referenceSolarLongitudeDeg": 283,
      "sunCenteredLongitudeDeg": 277.160668,
      "latitudeDeg": 63.87002,
      "longitudeDriftDegPerDeg": 0.10234,
      "latitudeDriftDegPerDeg": 0.102693,
      "validSolarOffsetMinDeg": -1.508164,
      "validSolarOffsetMaxDeg": 1.521605
    },
    "solarLongitudeDeg": 283.26015003069426,
    "offset": 0.26015003069426257,
    "rightAscensionDeg": 230.59776882745152,
    "declinationDeg": 49.61377345076976,
    "azimuthDeg": 16.92438244115877,
    "altitudeDeg": 61.25473287561874
  }
] as const;
