"""Camera binding, native units and unavailable-noise regressions."""
import bz2
from dataclasses import replace
import io
import json
from pathlib import Path
import tempfile
import unittest

import numpy as np
from astropy.io import fits

from image_quality import digest
from sdss_corrected_frame import read_cached_frame
from sdss_frame_noise import (read_cached_field_noise, native_noise_samples,
                             retained_sky_samples, SKY_RECONSTRUCTION_VERSION)


class RetainedSkyBoundaryTest(unittest.TestCase):
    def test_official_idl_grid_example_and_both_constant_edges(self):
        grid = np.arange(16,dtype=np.float32).reshape(4,4)
        x = np.array([.5,1.5,2.5,3.1,-1,1.5,3],dtype=np.float32)
        y = np.array([.5,1.5,2.5,2,1.5,100,2],dtype=np.float32)
        values, raw, finite, edge = retained_sky_samples(grid,x,y)
        np.testing.assert_array_equal(values,[2.5,7.5,12.5,11,6,13.5,11])
        np.testing.assert_array_equal(raw,[True,True,True,False,False,False,False])
        self.assertTrue(finite.all())
        np.testing.assert_array_equal(edge,~raw)

    def test_nonfinite_endpoint_is_not_filled_from_another_grid_value(self):
        grid = np.array([[1,2],[3,np.nan]],dtype=np.float32)
        values, raw, finite, edge = retained_sky_samples(grid,
            np.array([10,np.nan,np.inf,-5]),np.array([10,0,0,-5]))
        np.testing.assert_array_equal(finite,[False,False,False,False])
        self.assertTrue(np.isnan(values).all())
        # The lower corner also needs its actual interpolation neighborhood;
        # a nonfinite touched neighbor is never changed into a confidence claim.

    def test_short_one_row_grid_has_provider_constant_y_reconstruction(self):
        values,raw,finite,edge=retained_sky_samples(np.array([[10,20,30]],dtype=np.float32),
            np.array([.5,1.5,4]),np.array([-1,100,10]))
        np.testing.assert_array_equal(values,[15,25,30]);self.assertTrue(finite.all())
        self.assertFalse(raw.any());self.assertTrue(edge.all())

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / "output/sdss-corrected-m51-1002"
FIELD = ROOT / "output/sdss-m51-field-quality-1002-r3"


@unittest.skipUnless((CACHE / "frame-acquisition.json").is_file() and (FIELD / "receipt.json").is_file(),
                     "actual acquired frame/Field cache is not shipped")
class ActualNativeNoiseTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.binding = json.loads((FIELD / "receipt.json").read_bytes())
        cls.frames, cls.parameters = {}, {}
        cls.records = json.loads((CACHE / "frame-acquisition.json").read_bytes())["sourceFiles"]
        for record in cls.records:
            band = record["identity"]["band"]
            cls.frames[band] = read_cached_frame(CACHE / "sources" / record["path"],
                record["identity"] | {"bytes": record["bytes"], "sha256": record["sha256"], "sourceUrl": record["url"]},
                max_uncompressed_bytes=32*1024*1024)
            cls.parameters[band] = read_cached_field_noise(FIELD / "response.csv", cls.binding, record["identity"])

    def test_three_actual_bands_agree_with_direct_hdu_official_formula(self):
        x, y = np.array([64, 777, 1800]), np.array([64, 700, 1200])
        for record in self.records:
            band = record["identity"]["band"]
            frame, camera = self.frames[band], self.parameters[band]
            result = native_noise_samples(frame, camera, x, y)
            self.assertTrue(result.available.all())
            with fits.open(io.BytesIO(bz2.decompress((CACHE/"sources"/record["path"]).read_bytes()))) as hdus:
                grid = hdus[2].data["ALLSKY"][0].astype(np.float64)
                xx, yy = hdus[2].data["XINTERP"][0][x], hdus[2].data["YINTERP"][0][y]
                ix, iy = np.floor(xx).astype(int), np.floor(yy).astype(int)
                dx, dy = xx-ix, yy-iy
                sky = ((1-dx)*(1-dy)*grid[iy,ix] + dx*(1-dy)*grid[iy,ix+1] +
                       (1-dx)*dy*grid[iy+1,ix] + dx*dy*grid[iy+1,ix+1])
                calib = hdus[1].data[x].astype(np.float64)
                expected = (hdus[0].data[y,x]/calib+sky)/camera.gain_electrons_per_count*calib**2 + camera.dark_variance_counts_squared*calib**2
            np.testing.assert_allclose(result.variance_nmgy_squared, expected, rtol=1e-7)
            self.assertEqual(camera.field_id, "1237661362908561408")
            self.assertEqual(camera.response_sha256, self.binding["sha256"])
            for array in vars(frame.calibration_sky).values():
                self.assertFalse(array.flags.writeable)

    def test_provider_constant_sky_edge_and_native_outside_have_distinct_meaning(self):
        result = native_noise_samples(self.frames["g"], self.parameters["g"],
            np.array([0, 64, -1, 2048]), np.array([700]*4))
        np.testing.assert_array_equal(result.native_geometry, [True, True, False, False])
        np.testing.assert_array_equal(result.sky_geometry, [False, True, False, False])
        np.testing.assert_array_equal(result.available, [True, True, False, False])
        self.assertGreater(result.variance_nmgy_squared[0], 0)
        self.assertTrue(np.isnan(result.variance_nmgy_squared[[2,3]]).all())
        np.testing.assert_array_equal(result.sky_constant_edge,[True,False,False,False])
        self.assertEqual(result.sky_reconstruction_version,SKY_RECONSTRUCTION_VERSION)

    def test_finite_negative_and_zero_science_are_kept_but_bad_variance_is_unavailable(self):
        source = self.frames["g"]
        data = source.data.copy()
        x, y = np.array([64,65,66,67]), np.array([700]*4)
        data[y,x] = [0, -.01, -1e6, np.nan]
        frame = replace(source, data=data)
        before = data.tobytes()
        result = native_noise_samples(frame, self.parameters["g"], x, y)
        np.testing.assert_array_equal(result.available, [True, True, False, False])
        self.assertEqual(before, data.tobytes())
        self.assertTrue(np.isnan(result.variance_nmgy_squared[2:]).all())

    def test_bad_calibration_does_not_erase_science_or_become_zero_noise(self):
        source = self.frames["g"]
        calib = source.calibration_sky.calibration.copy()
        calib[[64,65,66]] = [0, -1, np.nan]
        frame = replace(source, calibration_sky=replace(source.calibration_sky, calibration=calib))
        result = native_noise_samples(frame, self.parameters["g"], np.array([64,65,66]), np.array([700]*3))
        self.assertFalse(result.available.any())
        self.assertTrue(np.isnan(result.variance_nmgy_squared).all())
        self.assertIs(frame.data, source.data)

    def test_foreign_band_field_missing_metadata_and_noninteger_coordinates_are_rejected(self):
        frame, camera = self.frames["g"], self.parameters["g"]
        for other in (self.parameters["r"], replace(camera, identity=(3699,"301",6,99,"g"))):
            with self.assertRaisesRegex(RuntimeError, "identity_mismatch"):
                native_noise_samples(frame, other, np.array([64]), np.array([700]))
        with self.assertRaisesRegex(RuntimeError, "metadata_unavailable"):
            native_noise_samples(replace(frame, calibration_sky=None), camera, np.array([64]), np.array([700]))
        with self.assertRaisesRegex(RuntimeError, "coordinates_invalid"):
            native_noise_samples(frame, camera, np.array([64.5]), np.array([700]))

    def test_actual_camera_parameters_are_not_defaults_and_corrupt_binding_is_rejected(self):
        self.assertEqual([self.parameters[b].gain_electrons_per_count for b in "gri"], [4.035,4.895,4.76])
        self.assertEqual([self.parameters[b].dark_variance_counts_squared for b in "gri"], [1.8225,.9025,5.0625])
        with self.assertRaisesRegex(RuntimeError, "bytes_changed"):
            read_cached_field_noise(FIELD/"response.csv", self.binding | {"sha256":"0"*64}, self.frames["g"].receipt["identity"])
        with self.assertRaisesRegex(RuntimeError, "ambiguous_or_missing"):
            read_cached_field_noise(FIELD/"response.csv", self.binding, self.frames["g"].receipt["identity"] | {"field":98})
        # A newly bound malformed CSV must fail at the parameter boundary too.
        for text, reason in (("fieldID,rerun,run,camcol,field,gain_g,darkVariance_g\n123,301,3699,6,100,0,1\n", "parameters_invalid"),
                             ("fieldID,rerun,run,camcol,field,gain_g,darkVariance_g\n123,301,3699,6,100,4,1\n123,301,3699,6,100,4,1\n", "ambiguous_or_missing")):
            with tempfile.TemporaryDirectory(prefix="starward-noise-csv-") as temporary:
                path = Path(temporary)/"response.csv"; payload = text.encode(); path.write_bytes(payload)
                with self.assertRaisesRegex(RuntimeError, reason):
                    read_cached_field_noise(path, self.binding | {"bytes":len(payload), "sha256":digest(payload)}, self.frames["g"].receipt["identity"])


if __name__ == "__main__":
    unittest.main()
