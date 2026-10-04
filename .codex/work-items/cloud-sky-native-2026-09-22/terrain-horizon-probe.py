#!/usr/bin/env python3
"""Task-local GLO-30 horizon probe; no production publication or UI output."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import rowcol

EARTH_RADIUS_M = 6_371_000.0
SOURCE_MANIFEST = Path("workers/miniapp-api/assets/terrain/publication.json")


def tile_id(lat: int, lon: int) -> str:
    return (f"Copernicus_DSM_COG_10_"
            f"{'N' if lat >= 0 else 'S'}{abs(lat):02d}_00_"
            f"{'E' if lon >= 0 else 'W'}{abs(lon):03d}_00_DEM")


def sample_elevation(lat: np.ndarray, lon: np.ndarray, cache: Path, sources: dict[str, dict]) -> tuple[np.ndarray, list[dict]]:
    values = np.full(lat.shape, np.nan, dtype=np.float32)
    used: list[dict] = []
    lat_deg = np.floor(lat).astype(int)
    lon_deg = np.floor(lon).astype(int)
    for a, b in sorted(set(zip(lat_deg.flat, lon_deg.flat))):
        key = tile_id(a, b)
        mask = (lat_deg == a) & (lon_deg == b)
        record = sources.get(key)
        path = cache / f"{key}.tif"
        if record is None or not path.is_file():
            used.append({"tileId": key, "state": "MISSING"})
            continue
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != record["sha256"] or path.stat().st_size != record["byteSize"]:
            raise ValueError(f"source integrity mismatch: {key}")
        with rasterio.open(path) as dataset:
            if dataset.crs.to_epsg() != 4326 or dataset.count < 1:
                raise ValueError(f"source coordinate/shape mismatch: {key}")
            band = dataset.read(1, masked=True)
            rows, cols = rowcol(dataset.transform, lon[mask], lat[mask])
            rows = np.asarray(rows)
            cols = np.asarray(cols)
            inside = (rows >= 0) & (rows < dataset.height) & (cols >= 0) & (cols < dataset.width)
            samples = np.full(rows.shape, np.nan, dtype=np.float32)
            if np.any(inside):
                observed = band[rows[inside], cols[inside]]
                samples[inside] = np.asarray(observed.filled(np.nan), dtype=np.float32)
            values[mask] = samples
        used.append({"tileId": key, "state": "SHA256_MATCH", "sha256": digest,
                     "byteSize": record["byteSize"]})
    return values, used


def probe(lat_deg: float, lon_deg: float, cache: Path, maximum_distance_km: float, step_m: int) -> dict:
    manifest = json.loads(SOURCE_MANIFEST.read_text(encoding="utf-8"))
    sources = {entry["tileId"]: entry for entry in manifest["sources"]}
    observer, observer_tiles = sample_elevation(np.array([lat_deg]), np.array([lon_deg]), cache, sources)
    if not np.isfinite(observer[0]):
        raise ValueError("observer elevation unavailable; no horizon can be inferred")
    # The first 300 m is deliberately outside this probe: spot coordinate and
    # near objects (trees/buildings) are not established by the DEM.
    minimum_m = max(300, step_m)
    distances = np.arange(minimum_m, maximum_distance_km * 1000 + 1, step_m, dtype=np.float64)
    azimuths = np.arange(360, dtype=np.float64)
    az = np.deg2rad(azimuths)[:, None]
    angular = distances[None, :] / EARTH_RADIUS_M
    observer_lat = math.radians(lat_deg)
    target_lat = np.arcsin(math.sin(observer_lat) * np.cos(angular)
                           + math.cos(observer_lat) * np.sin(angular) * np.cos(az))
    target_lon = math.radians(lon_deg) + np.arctan2(
        np.sin(az) * np.sin(angular) * math.cos(observer_lat),
        np.cos(angular) - math.sin(observer_lat) * np.sin(target_lat))
    elevation, tiles = sample_elevation(np.rad2deg(target_lat), np.rad2deg(target_lon), cache, sources)
    curvature_drop = distances[None, :] ** 2 / (2.0 * EARTH_RADIUS_M)
    angles = np.rad2deg(np.arctan2(elevation - float(observer[0]) - curvature_drop, distances[None, :]))
    valid = np.isfinite(angles)
    results = []
    for index, bearing in enumerate(azimuths.astype(int)):
        available = valid[index]
        if not np.any(available):
            results.append({"azimuthDeg": int(bearing), "state": "UNAVAILABLE", "validFraction": 0.0})
            continue
        known = np.flatnonzero(available)
        maximum_index = known[np.argmax(angles[index, available])]
        # PARTIAL is not silently flattened: an unseen farther ridge might be higher.
        state = "KNOWN_SAMPLED_RANGE" if np.all(available) else "PARTIAL"
        results.append({"azimuthDeg": int(bearing), "state": state,
                        "validFraction": round(float(np.mean(available)), 4),
                        "maximumKnownAngleDeg": round(float(angles[index, maximum_index]), 4),
                        "maximumAtKm": round(float(distances[maximum_index] / 1000), 3),
                        "sampleCount": int(np.sum(available))})
    counts = {state: sum(result["state"] == state for result in results)
              for state in ("KNOWN_SAMPLED_RANGE", "PARTIAL", "UNAVAILABLE")}
    return {"scope": "TASK_LOCAL_NUMERIC_PROBE_ONLY", "observer": {"latitudeWgs84": lat_deg,
            "longitudeWgs84": lon_deg, "heightMFromDsm": float(observer[0]),
            "heightIsGroundTruth": False},
            "sourcePublicationId": manifest["publicationId"], "sourceDataset": manifest["dataset"],
            "sourceTiles": observer_tiles + [tile for tile in tiles if tile not in observer_tiles],
            "geometricMethod": "source WGS84 COG sample, spherical forward geodesic, DEM relative height and Earth curvature; no refraction",
            "sample": {"minimumDistanceM": minimum_m, "maximumDistanceKm": maximum_distance_km,
                       "stepM": step_m, "azimuthStepDeg": 1},
            "coverage": counts, "directions": results,
            "limitations": ["2011-2015 digital surface model; buildings and vegetation may be present, and current near objects are missing.",
                            "Observer height is sampled from the DEM at a fixture coordinate, not a measured device altitude.",
                            "Unknown samples and all terrain beyond the chosen radius cannot be treated as clear sky.",
                            "One-degree azimuth rays and fixed distance steps miss sub-grid peaks; no conservative error bound.",
                            "No atmospheric refraction, validation against surveyed horizon, Android/iOS drawing or production spot coverage."]}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--latitude", type=float, required=True)
    parser.add_argument("--longitude", type=float, required=True)
    parser.add_argument("--maximum-distance-km", type=float, default=50)
    parser.add_argument("--step-m", type=int, default=100)
    args = parser.parse_args()
    if not (-90 < args.latitude < 90 and -180 <= args.longitude <= 180
            and 1 <= args.maximum_distance_km <= 85 and 30 <= args.step_m <= 300):
        parser.error("invalid location or sample bounds")
    result = probe(args.latitude, args.longitude, args.cache.resolve(), args.maximum_distance_km, args.step_m)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"observer": result["observer"], "coverage": result["coverage"],
                      "sourceTiles": result["sourceTiles"], "output": str(args.output)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
