#!/usr/bin/env python3
"""Publish a bounded, GCJ-02 registered terrain raster from Copernicus GLO-30 COGs.

The source COGs are immutable public AWS Open Data objects. Source downloads are
kept outside the publication directory; only the derived PNG and its provenance
manifest are release inputs.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import rasterio

SOURCE_ROOT = "https://copernicus-dem-30m.s3.amazonaws.com"
DATASET_VERSION = "Copernicus DEM GLO-30 Public AWS COG 2021"
TRANSFORM_VERSION = "starward-wgs84-gcj02-grid-v1"
DEFAULT_CENTER = (22.55, 114.25)
DEFAULT_RADIUS_KM = 85.0


def _tile_id(lat_degree: int, lon_degree: int) -> str:
    lat = f"{'N' if lat_degree >= 0 else 'S'}{abs(lat_degree):02d}_00"
    lon = f"{'E' if lon_degree >= 0 else 'W'}{abs(lon_degree):03d}_00"
    return f"Copernicus_DSM_COG_10_{lat}_{lon}_DEM"


def _source_url(tile_id: str) -> str:
    return f"{SOURCE_ROOT}/{tile_id}/{tile_id}.tif"


def _download(url: str, destination: Path) -> tuple[str, int] | None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256()
    size = 0
    if not destination.exists():
        temporary = destination.with_suffix(".part")
        request = urllib.request.Request(url, headers={"User-Agent": "Starward terrain publisher/1"})
        try:
            with urllib.request.urlopen(request, timeout=120) as response, temporary.open("wb") as output:
                while chunk := response.read(1024 * 1024):
                    digest.update(chunk)
                    output.write(chunk)
                    size += len(chunk)
        except urllib.error.HTTPError as error:
            if error.code == 404:
                if temporary.exists():
                    temporary.unlink()
                return None
            raise
        os.replace(temporary, destination)
    else:
        with destination.open("rb") as source:
            while chunk := source.read(1024 * 1024):
                digest.update(chunk)
                size += len(chunk)
    return digest.hexdigest(), size


def _outside_china(lat: np.ndarray, lon: np.ndarray) -> np.ndarray:
    return (lon < 72.004) | (lon > 137.8347) | (lat < 0.8293) | (lat > 55.8271)


def _transform_lat(x: np.ndarray, y: np.ndarray) -> np.ndarray:
    result = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * np.sqrt(np.abs(x))
    result += (20.0 * np.sin(6.0 * x * np.pi) + 20.0 * np.sin(2.0 * x * np.pi)) * 2.0 / 3.0
    result += (20.0 * np.sin(y * np.pi) + 40.0 * np.sin(y / 3.0 * np.pi)) * 2.0 / 3.0
    return result + (160.0 * np.sin(y / 12.0 * np.pi) + 320 * np.sin(y * np.pi / 30.0)) * 2.0 / 3.0


def _transform_lon(x: np.ndarray, y: np.ndarray) -> np.ndarray:
    result = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * np.sqrt(np.abs(x))
    result += (20.0 * np.sin(6.0 * x * np.pi) + 20.0 * np.sin(2.0 * x * np.pi)) * 2.0 / 3.0
    result += (20.0 * np.sin(x * np.pi) + 40.0 * np.sin(x / 3.0 * np.pi)) * 2.0 / 3.0
    return result + (150.0 * np.sin(x / 12.0 * np.pi) + 300.0 * np.sin(x / 30.0 * np.pi)) * 2.0 / 3.0


def _wgs84_to_gcj02(lat: np.ndarray, lon: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    a = 6378245.0
    ee = 0.00669342162296594323
    d_lat = _transform_lat(lon - 105.0, lat - 35.0)
    d_lon = _transform_lon(lon - 105.0, lat - 35.0)
    rad_lat = lat / 180.0 * np.pi
    magic = 1.0 - ee * np.sin(rad_lat) ** 2
    sqrt_magic = np.sqrt(magic)
    d_lat = d_lat * 180.0 / ((a * (1.0 - ee)) / (magic * sqrt_magic) * np.pi)
    d_lon = d_lon * 180.0 / (a / sqrt_magic * np.cos(rad_lat) * np.pi)
    outside = _outside_china(lat, lon)
    return np.where(outside, lat, lat + d_lat), np.where(outside, lon, lon + d_lon)


def _gcj02_to_wgs84(lat: np.ndarray, lon: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    guess_lat, guess_lon = lat.copy(), lon.copy()
    for _ in range(5):
        projected_lat, projected_lon = _wgs84_to_gcj02(guess_lat, guess_lon)
        guess_lat -= projected_lat - lat
        guess_lon -= projected_lon - lon
    return guess_lat, guess_lon


def _bounds(center_lat: float, center_lon: float, radius_km: float) -> tuple[float, float, float, float]:
    lat_delta = radius_km / 111.32
    lon_delta = radius_km / (111.32 * math.cos(math.radians(center_lat)))
    center_gcj_lat, center_gcj_lon = _wgs84_to_gcj02(np.array(center_lat), np.array(center_lon))
    return (float(center_gcj_lon - lon_delta), float(center_gcj_lat - lat_delta), float(center_gcj_lon + lon_delta), float(center_gcj_lat + lat_delta))


def _terrain_rgba(elevation: np.ndarray, valid: np.ndarray, pixel_metres: float) -> np.ndarray:
    filled = np.where(valid, elevation, np.nan)
    fallback = float(np.nanmedian(filled)) if np.any(valid) else 0.0
    filled = np.nan_to_num(filled, nan=fallback)
    dy, dx = np.gradient(filled, pixel_metres, pixel_metres)
    slope = np.pi / 2.0 - np.arctan(np.hypot(dx, dy))
    aspect = np.arctan2(-dx, dy)
    azimuth = math.radians(315)
    altitude = math.radians(42)
    shade = np.sin(altitude) * np.sin(slope) + np.cos(altitude) * np.cos(slope) * np.cos(azimuth - aspect)
    shade = np.clip((shade + 0.18) / 1.18, 0.0, 1.0)
    normalized = np.clip((filled + 20.0) / 900.0, 0.0, 1.0)
    low = np.array([215.0, 224.0, 207.0])
    high = np.array([112.0, 139.0, 104.0])
    color = low[None, None, :] * (1.0 - normalized[:, :, None]) + high[None, None, :] * normalized[:, :, None]
    color *= (0.67 + 0.42 * shade[:, :, None])
    rgba = np.empty((*filled.shape, 4), dtype=np.uint8)
    rgba[:, :, :3] = np.clip(color, 0, 255).astype(np.uint8)
    rgba[:, :, 3] = np.where(valid, 224, 0).astype(np.uint8)
    return rgba


def publish(cache: Path, output: Path, size: int, center_lat: float, center_lon: float, radius_km: float) -> dict:
    west, south, east, north = _bounds(center_lat, center_lon, radius_km)
    rows = np.linspace(north, south, size, dtype=np.float64)
    cols = np.linspace(west, east, size, dtype=np.float64)
    grid_lon, grid_lat = np.meshgrid(cols, rows)
    source_lat, source_lon = _gcj02_to_wgs84(grid_lat, grid_lon)
    elevation = np.full((size, size), np.nan, dtype=np.float32)
    sources = []
    unavailable_tiles = []
    lat_degrees = range(math.floor(float(source_lat.min())), math.floor(float(source_lat.max())) + 1)
    lon_degrees = range(math.floor(float(source_lon.min())), math.floor(float(source_lon.max())) + 1)
    for lat_degree in lat_degrees:
        for lon_degree in lon_degrees:
            tile_id = _tile_id(lat_degree, lon_degree)
            url = _source_url(tile_id)
            path = cache / f"{tile_id}.tif"
            downloaded = _download(url, path)
            if downloaded is None:
                unavailable_tiles.append(tile_id)
                continue
            sha256, byte_size = downloaded
            with rasterio.open(path) as dataset:
                band = dataset.read(1, masked=True)
                mask = ((source_lon >= dataset.bounds.left) & (source_lon <= dataset.bounds.right) &
                        (source_lat >= dataset.bounds.bottom) & (source_lat <= dataset.bounds.top))
                row_index = np.clip(((dataset.bounds.top - source_lat[mask]) / dataset.res[1]).astype(np.int64), 0, dataset.height - 1)
                col_index = np.clip(((source_lon[mask] - dataset.bounds.left) / dataset.res[0]).astype(np.int64), 0, dataset.width - 1)
                values = band[row_index, col_index]
                elevation[mask] = np.asarray(values.filled(np.nan), dtype=np.float32)
                sources.append({"tileId": tile_id, "url": url, "sha256": sha256, "byteSize": byte_size, "etag": None})
    valid = np.isfinite(elevation)
    output.mkdir(parents=True, exist_ok=True)
    image_path = output / "glo30-greater-bay-area-85km.png"
    pixel_metres = radius_km * 2000.0 / max(1, size - 1)
    rgba = _terrain_rgba(elevation, valid, pixel_metres)
    transform = rasterio.transform.from_bounds(west, south, east, north, size, size)
    with rasterio.open(image_path, "w", driver="PNG", width=size, height=size, count=4, dtype="uint8", transform=transform, crs="EPSG:4326") as target:
        for band_index in range(4):
            target.write(rgba[:, :, band_index], band_index + 1)
    derived_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    center_gcj_lat, center_gcj_lon = _wgs84_to_gcj02(np.array(center_lat), np.array(center_lon))
    record = {
        "schemaVersion": "starward-terrain-publication-v1",
        "publicationId": "terrain:glo30:greater-bay-area:2021:v2",
        "dataset": DATASET_VERSION,
        "sourceProvider": "Copernicus Programme / AWS Open Data",
        "license": "Copernicus DEM licence",
        "sourceResolution": "1 arc-second (approximately 30 m)",
        "derivedResolutionM": round(pixel_metres, 1),
        "derivedAt": derived_at,
        "coordinateSystem": "GCJ02",
        "transformVersion": TRANSFORM_VERSION,
        "centerWgs84": {"latitude": center_lat, "longitude": center_lon},
        "centerGcj02": {"latitude": float(center_gcj_lat), "longitude": float(center_gcj_lon)},
        "maximumRadiusKm": radius_km,
        "boundsGcj02": {"west": west, "south": south, "east": east, "north": north},
        "elevationM": {"minimum": round(float(np.nanmin(elevation)), 1), "maximum": round(float(np.nanmax(elevation)), 1)},
        "validPixelPercent": round(float(valid.mean() * 100.0), 2),
        "image": {"file": image_path.name, "sha256": hashlib.sha256(image_path.read_bytes()).hexdigest(), "byteSize": image_path.stat().st_size, "width": size, "height": size},
        "sources": sources,
        "unavailableSourceTiles": unavailable_tiles,
        "limitations": [
            f"覆盖仅限清单中的大湾区中心点周边 {radius_km:.0f} km；范围外返回不可用。",
            "呈现为高程派生山体阴影，不包含近处树木、围墙、临时灯或逐方向遮挡角。",
            "源产品采样间隔不等于逐点垂直误差或拍摄方向精度。"
        ]
    }
    (output / "publication.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return record


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--size", type=int, default=1536)
    parser.add_argument("--center-lat", type=float, default=DEFAULT_CENTER[0])
    parser.add_argument("--center-lon", type=float, default=DEFAULT_CENTER[1])
    parser.add_argument("--radius-km", type=float, default=DEFAULT_RADIUS_KM)
    args = parser.parse_args()
    if not 256 <= args.size <= 4096 or not 50 <= args.radius_km <= 100:
        raise SystemExit("terrain_publication_arguments_invalid")
    print(json.dumps(publish(args.cache.resolve(), args.output.resolve(), args.size, args.center_lat, args.center_lon, args.radius_km), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
