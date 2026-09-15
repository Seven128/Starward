import tempfile
import unittest
from pathlib import Path
from build_gmn_reference import NAMES, annual_table, fit_reference, rows, trajectory_identity, file_sha256, build


def table(extra=""):
    headers = ["IAU #", "IAU code", "Name", "Sol begin", "Sol max", "Sol end", "Year", "Population index"]
    values = [f"<tr><td>{i}</td><td>{code}</td><td>{code} shower</td><td>358</td><td>1</td><td>4</td><td>annual</td><td>2.1</td></tr>" for i, code in enumerate(NAMES, 1)]
    return "<table><tr>" + "".join(f"<th>{h}</th>" for h in headers) + "</tr>" + "".join(values) + extra + "</table>"


class ReferenceTests(unittest.TestCase):
    def test_recurring_window_wrap_and_outburst_exclusion(self):
        result = annual_table(table("<tr><td>7</td><td>PER</td><td>Outburst</td><td>1</td><td>2</td><td>3</td><td>2023</td><td>2.5</td></tr>"))
        self.assertEqual(len(result), 13)
        self.assertEqual(result["PER"]["solarLongitudeStartDeg"], 358)
        self.assertEqual(result["PER"]["populationIndex"], 2.1)
        with self.assertRaisesRegex(ValueError, "required_shower_missing"):
            annual_table(table().replace("<td>URS</td>", "<td>UNLISTED</td>"))
        with self.assertRaisesRegex(ValueError, "table_order"):
            annual_table(table().replace("<td>358</td>", "<td>2</td>"))

    def test_j2000_sun_centered_wrap_drift_and_measured_validity(self):
        samples = []
        for year in ("2022", "2023"):
            for x in (-2.5, -1.5, -.5, .5, 1.5):
                for i in range(30):
                    noise = (i - 14.5) / 1000
                    samples.append((year, x, (359.9 + .2*x + noise) % 360, 30 + .1*x + noise, 35 + noise))
        result = fit_reference(samples, 1)
        self.assertAlmostEqual(result["sunCenteredLongitudeDeg"], 359.9, places=5)
        self.assertAlmostEqual(result["longitudeDriftDegPerDeg"], .2, places=5)
        self.assertAlmostEqual(result["latitudeDeg"], 30, places=5)
        self.assertAlmostEqual(result["latitudeDriftDegPerDeg"], .1, places=5)
        self.assertEqual(result["validSolarOffsetMinDeg"], -2.5)
        self.assertEqual(result["validSolarOffsetMaxDeg"], 1.5)
        self.assertEqual(result["velocityKmPerSecond"], 35)
        self.assertEqual(result["samplesByYear"], {"2022": 150, "2023": 150})
        self.assertEqual(result["state"], "CANDIDATE")
        with self.assertRaisesRegex(ValueError, "radiant_years"):
            fit_reference([row for row in samples if row[0] == "2022"], 1)

    def test_sparse_second_year_cannot_establish_multiyear_reference(self):
        samples = [("2022", x, 100, 30, 35) for x in (-1.5, -.5, .5) for _ in range(40)]
        samples += [("2023", x + .5, 100, 30, 35) for x in range(2, 22)]
        with self.assertRaisesRegex(ValueError, "radiant_years"):
            fit_reference(samples, 1)

    def test_bad_drift_keeps_diagnostics_but_is_unavailable(self):
        samples = [(year, x, longitude, 0, 35) for year in ("2022", "2023")
            for x, longitude in ((-1.5, 0), (-.5, 90), (.5, 0)) for _ in range(20)]
        result = fit_reference(samples, 1)
        self.assertEqual(result["state"], "UNAVAILABLE")
        self.assertIn("nonlinear_radiant_drift", result["unavailableReasons"])
        self.assertGreater(result["binMedianResidualRmsDeg"], 30)

    def test_yearly_disagreement_is_distinct_from_fit_residual(self):
        samples = [(year, x, longitude, 0, 35) for year, longitude in (("2022", 100), ("2023", 106))
            for x in (-1.5, -.5, .5) for _ in range(20)]
        result = fit_reference(samples, 1)
        self.assertAlmostEqual(result["binMedianResidualRmsDeg"], 0)
        self.assertIn("inconsistent_yearly_radiants", result["unavailableReasons"])

    def test_three_years_in_one_bin_are_not_three_matched_bins(self):
        samples = [("2022", x, 100, 30, 35) for x in (-1.5, -.5, .5) for _ in range(40)]
        samples += [(year, -.5, 100, 30, 35) for year in ("2023", "2024") for _ in range(20)]
        result = fit_reference(samples, 1)
        self.assertEqual(result["matchedYearBinCount"], 1)
        self.assertEqual(result["yearPairComparisonCount"], 3)
        self.assertIn("insufficient_matched_year_bins", result["unavailableReasons"])

    def test_identity_date_conflicts_and_stream_hash(self):
        seen = {}
        row = {"Unique trajectory (identifier)": "abc", "Beginning (UTC Time)": "2023-01-01 00:21:19.897825", "Vgeo (km/s)": "35"}
        self.assertEqual(trajectory_identity(row, seen), "2023")
        self.assertIsNone(trajectory_identity(dict(row), seen))
        with self.assertRaisesRegex(ValueError, "identity_conflict"):
            trajectory_identity({**row, "Vgeo (km/s)": "36"}, seen)
        with self.assertRaisesRegex(ValueError, "invalid_trajectory_utc"):
            trajectory_identity({**row, "Beginning (UTC Time)": "2022-invalid"}, {})
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "input.txt"
            path.write_bytes(b"abc")
            self.assertEqual(file_sha256(path), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")

    def test_duplicate_file_rejected_and_missing_direction_keeps_event(self):
        with tempfile.TemporaryDirectory() as directory:
            table_path = Path(directory) / "table.html"
            table_path.write_text(table(), encoding="utf-8")
            path = Path(directory) / "input.txt"
            path.write_text("# Unique trajectory; IAU\n# identifier; code\n", encoding="utf-8")
            result = build(table_path, [path])
            self.assertEqual(len(result["showers"]), 13)
            self.assertTrue(all(event["radiantReference"]["state"] == "UNAVAILABLE" for event in result["showers"]))
            self.assertTrue(all(event["nominalPeakZhr"] is None for event in result["showers"]))
            with self.assertRaisesRegex(ValueError, "duplicate_trajectory_file"):
                build(table_path, [path, path])

    def test_two_header_csv_preserves_units_and_rejects_truncated_rows(self):
        header = "# Unique trajectory; IAU; LAMgeo\n\n# identifier; code; deg\n# --------; ---; ---\n"
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "input.txt"
            path.write_text(header + "20230101000000abcdef; PER; 359.8\n", encoding="utf-8")
            self.assertEqual(list(rows(path)), [{"Unique trajectory (identifier)": "20230101000000abcdef", "IAU (code)": "PER", "LAMgeo (deg)": "359.8"}])
            path.write_text(header + "20230101000000abcdef; PER\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "row_width"):
                list(rows(path))


if __name__ == "__main__": unittest.main()
