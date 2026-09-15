"""Build an attributable historical radiant reference; never infer ZHR from counts."""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
import math
from collections import Counter, defaultdict
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
import numpy as np

SCHEMA = "starward.gmn-annual-reference.v1"
NAMES = {
    "QUA": "象限仪座流星雨", "LYR": "四月天琴座流星雨", "ETA": "宝瓶座η流星雨",
    "SDA": "南宝瓶座δ流星雨", "CAP": "摩羯座α流星雨", "PER": "英仙座流星雨",
    "AUR": "御夫座流星雨", "SPE": "九月英仙座ε流星雨", "DRA": "十月天龙座流星雨",
    "ORI": "猎户座流星雨", "LEO": "狮子座流星雨", "GEM": "双子座流星雨", "URS": "小熊座流星雨",
}


class Table(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows, self.row, self.cell = [], None, None

    def handle_starttag(self, tag, attrs):
        if tag == "tr": self.row = []
        if tag in ("td", "th") and self.row is not None: self.cell = []

    def handle_data(self, value):
        if self.cell is not None: self.cell.append(value)

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.cell is not None:
            self.row.append(" ".join("".join(self.cell).split()))
            self.cell = None
        if tag == "tr" and self.row is not None:
            self.rows.append(self.row)
            self.row = None


def signed_angle(value):
    return (value + 180) % 360 - 180


def annual_table(html):
    table = Table()
    table.feed(html)
    expected = ["IAU #", "IAU code", "Name", "Sol begin", "Sol max", "Sol end", "Year", "Population index"]
    if expected not in table.rows: raise ValueError("gmn_operational_table_schema_changed")
    result = {}
    for row in table.rows:
        if len(row) != 8 or row[6] != "annual" or row[1] not in NAMES: continue
        number, code, name, begin, peak, end, _, population = row
        values = list(map(float, (begin, peak, end, population)))
        if not all(math.isfinite(v) for v in values): raise ValueError("gmn_table_nonfinite")
        begin, peak, end, population = values
        if not all(0 <= v < 360 for v in (begin, peak, end)) or not 0 < population < 10:
            raise ValueError("gmn_table_range")
        if not signed_angle(begin - peak) <= 0 <= signed_angle(end - peak):
            raise ValueError("gmn_table_order")
        if code in result: raise ValueError("gmn_duplicate_annual_shower")
        result[code] = dict(iauNumber=int(number), code=code, englishName=name, displayName=NAMES[code],
            solarLongitudeStartDeg=begin, solarLongitudeReferenceDeg=peak, solarLongitudeEndDeg=end,
            populationIndex=population)
    if set(result) != set(NAMES): raise ValueError("gmn_required_shower_missing")
    return result


def rows(path):
    """GMN's documented two-row, semicolon-separated trajectory summary format."""
    header = None
    columns = None
    with path.open(encoding="utf-8") as stream:
        for line in stream:
            if line.startswith("#"):
                values = [v.strip() for v in line.lstrip("# ").split(";")]
                if values[0] == "Unique trajectory": header = values
                elif values[0] == "identifier" and header:
                    if len(values) != len(header): raise ValueError("gmn_header_width")
                    columns = [f"{name} ({unit})" for name, unit in zip(header, values)]
                    occurrences = Counter()
                    unique_columns = []
                    for column in columns:
                        occurrences[column] += 1
                        unique_columns.append(column if occurrences[column] == 1 else f"{column} [{occurrences[column]}]")
                    columns = unique_columns
                continue
            if not line.strip(): continue
            if not columns: raise ValueError("gmn_header_missing")
            values = next(csv.reader([line], delimiter=";"))
            if len(values) != len(columns): raise ValueError("gmn_row_width")
            yield dict(zip(columns, (value.strip() for value in values)))


def fit_reference(samples, reference):
    """Equal-weight one-degree-bin medians prevent peak counts dominating a direction fit."""
    if len(samples) < 100: raise ValueError("gmn_insufficient_radiant_samples")
    raw = np.asarray([s[1:] for s in samples], dtype=float)
    center = float(np.degrees(np.arctan2(np.median(np.sin(np.radians(raw[:, 1]))), np.median(np.cos(np.radians(raw[:, 1]))))))
    raw[:, 1] = center + (raw[:, 1] - center + 180) % 360 - 180
    bins = defaultdict(list)
    for index, row in enumerate(raw): bins[math.floor(row[0])].append(index)
    used_bins = [indices for _, indices in sorted(bins.items()) if len(indices) >= 10]
    used_indices = [index for indices in used_bins for index in indices]
    years = Counter(samples[index][0] for index in used_indices)
    if len([year for year, count in years.items() if count >= 20]) < 2:
        raise ValueError("gmn_insufficient_radiant_years")
    if len(used_indices) < 100: raise ValueError("gmn_insufficient_radiant_samples")
    medians = np.asarray([np.median(raw[indices], axis=0) for indices in used_bins])
    if len(medians) < 3: raise ValueError("gmn_insufficient_radiant_span")
    x = medians[:, 0]
    if not min(x) <= 0 <= max(x): raise ValueError("gmn_reference_outside_measured_span")
    longitude = np.polyfit(x, medians[:, 1], 1)
    latitude = np.polyfit(x, medians[:, 2], 1)
    residual = np.hypot((medians[:, 1] - np.polyval(longitude, x)) * np.cos(np.radians(medians[:, 2])), medians[:, 2] - np.polyval(latitude, x))
    used = raw[used_indices]
    scatter = np.hypot((used[:, 1] - np.polyval(longitude, used[:, 0])) * np.cos(np.radians(used[:, 2])), used[:, 2] - np.polyval(latitude, used[:, 0]))
    year_differences = []
    matched_year_bins = 0
    for indices in used_bins:
        by_year = defaultdict(list)
        for index in indices: by_year[samples[index][0]].append(raw[index])
        yearly = [np.median(values, axis=0) for values in by_year.values() if len(values) >= 5]
        if len(yearly) >= 2: matched_year_bins += 1
        for a_index, a in enumerate(yearly):
            for b in yearly[a_index + 1:]:
                year_differences.append(float(np.hypot((a[1] - b[1]) * np.cos(np.radians((a[2] + b[2]) / 2)), a[2] - b[2])))
    metrics = dict(binMedianResidualRmsDeg=round(float(np.sqrt(np.mean(residual ** 2))), 6),
        binMedianResidualMaxDeg=round(float(max(residual)), 6),
        sampleResidualP90Deg=round(float(np.percentile(scatter, 90)), 6),
        matchedYearBinCount=matched_year_bins, yearPairComparisonCount=len(year_differences),
        yearMedianDifferenceMaxDeg=round(max(year_differences), 6) if year_differences else None)
    # Conservative engineering eligibility for a coarse direction cue, not a
    # scientific uncertainty estimate. Preserve rejected diagnostics for review.
    failures = []
    if metrics["binMedianResidualRmsDeg"] > 1 or metrics["binMedianResidualMaxDeg"] > 3: failures.append("nonlinear_radiant_drift")
    if metrics["sampleResidualP90Deg"] > 5: failures.append("dispersed_radiant_samples")
    if matched_year_bins < 3: failures.append("insufficient_matched_year_bins")
    elif metrics["yearMedianDifferenceMaxDeg"] > 3: failures.append("inconsistent_yearly_radiants")
    if any(abs(value) > 90 for value in np.polyval(latitude, [min(x), 0, max(x)])): failures.append("invalid_fitted_latitude")
    return dict(state="UNAVAILABLE" if failures else "CANDIDATE", unavailableReasons=failures,
        frame="SUN_CENTERED_ECLIPTIC_J2000", referenceSolarLongitudeDeg=reference,
        sunCenteredLongitudeDeg=round(float(longitude[1] % 360), 6), latitudeDeg=round(float(latitude[1]), 6),
        longitudeDriftDegPerDeg=round(float(longitude[0]), 6), latitudeDriftDegPerDeg=round(float(latitude[0]), 6),
        validSolarOffsetMinDeg=round(float(min(x)), 6), validSolarOffsetMaxDeg=round(float(max(x)), 6),
        inputSampleCount=len(samples), sampleCount=len(used_indices), samplesByYear=dict(sorted(years.items())), binCount=len(medians),
        **metrics, velocityKmPerSecond=round(float(np.median(used[:, 3])), 3))


def file_sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""): digest.update(chunk)
    return digest.hexdigest()


def trajectory_identity(row, seen):
    identifier = row["Unique trajectory (identifier)"]
    if not identifier: raise ValueError("gmn_trajectory_identifier_missing")
    try:
        instant = datetime.strptime(row["Beginning (UTC Time)"], "%Y-%m-%d %H:%M:%S.%f")
    except ValueError as error:
        raise ValueError("gmn_invalid_trajectory_utc") from error
    # Includes every parsed source field, so overlapping files cannot silently
    # replace different versions of the same physical trajectory.
    fingerprint = hashlib.sha256(json.dumps(row, sort_keys=True).encode()).digest()
    if identifier in seen:
        if seen[identifier] != fingerprint: raise ValueError("gmn_trajectory_identity_conflict")
        return None
    seen[identifier] = fingerprint
    return str(instant.year)


def build(table_path, trajectory_paths):
    events = annual_table(table_path.read_text(encoding="utf-8"))
    samples = defaultdict(list)
    counts = Counter()
    sources = []
    seen = {}
    paths_seen = set()
    for path in trajectory_paths:
        if path.suffix != ".txt": raise ValueError("gmn_completed_text_input_required")
        resolved = path.resolve()
        if resolved in paths_seen: raise ValueError("gmn_duplicate_trajectory_file")
        paths_seen.add(resolved)
        digest = file_sha256(path)
        sources.append(dict(file=path.name, sha256=digest, bytes=path.stat().st_size))
        for row in rows(path):
            counts["read"] += 1
            code = row["IAU (code)"]
            if code not in events: continue
            year = trajectory_identity(row, seen)
            if year is None:
                counts["duplicate"] += 1
                continue
            event = events[code]
            if int(row["IAU (No)"]) != event["iauNumber"]: raise ValueError("gmn_identity_conflict")
            try:
                solar, longitude, latitude, velocity = (float(row[key]) for key in
                    ("Sol lon (deg)", "LAMgeo (deg)", "BETgeo (deg)", "Vgeo (km/s)"))
                stations = int(row["Num (stat)"])
            except ValueError:
                counts["invalid"] += 1
                continue
            if not all(map(math.isfinite, (solar, longitude, latitude, velocity))) or not (0 <= solar < 360 and 0 <= longitude < 360 and -90 <= latitude <= 90 and 0 < velocity < 100 and stations >= 2):
                counts["invalid"] += 1
                continue
            offset = signed_angle(solar - event["solarLongitudeReferenceDeg"])
            if not signed_angle(event["solarLongitudeStartDeg"] - event["solarLongitudeReferenceDeg"]) <= offset <= signed_angle(event["solarLongitudeEndDeg"] - event["solarLongitudeReferenceDeg"]): continue
            samples[code].append((year, offset, (longitude - solar) % 360, latitude, velocity))
    for code, event in events.items():
        try:
            event["radiantReference"] = fit_reference(samples[code], event["solarLongitudeReferenceDeg"])
        except ValueError as error:
            event["radiantReference"] = dict(state="UNAVAILABLE", unavailableReasons=[str(error)], inputSampleCount=len(samples[code]))
        event["nominalPeakZhr"] = None
    return dict(schemaVersion=SCHEMA, source="Global Meteor Network", license="CC-BY-4.0",
        sourceUrl="https://globalmeteornetwork.org/flux/", trajectorySourceUrl="https://globalmeteornetwork.org/data/traj_summary_data/",
        tableSha256=hashlib.sha256(table_path.read_bytes()).hexdigest(), trajectoryFiles=sources,
        method="One-degree-bin medians, equal-weight linear drift in sun-centered J2000 ecliptic coordinates; historical directional reference only",
        coverage="Operational annual monitoring windows, not exhaustive activity boundaries or annual outburst forecasts",
        counts=dict(counts), showers=sorted(events.values(), key=lambda event: event["iauNumber"]))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--table", type=Path, required=True)
    parser.add_argument("--trajectory", type=Path, action="append", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = build(args.table, args.trajectory)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"showers": len(result["showers"]), "counts": result["counts"]}))
