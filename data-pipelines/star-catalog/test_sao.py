import math
from pathlib import Path
import tempfile
import unittest

from astropy.table import MaskedColumn, Table

from build_sao import bsc_cross_identifications, encode_runtime_json, read_complete, sao_ra_motion_to_tangent


class SaoSourceBoundaryTests(unittest.TestCase):
    def test_actual_js_number_spelling_for_real_small_motion_and_negative_zero(self):
        # SAO 41's converted RA motion caused a real all-pack hash disagreement.
        self.assertEqual(encode_runtime_json([-8.7077e-05, -0.0, 1e-7, 1e20]),
                         b'[-0.000087077,0,1e-7,100000000000000000000]')

    def test_documented_time_unit_matches_independent_bsc_tangent_motion(self):
        # Actual published samples: source time seconds versus BSC arcseconds.
        for raw, dec, bsc in [(-.0379, -16.716142, -.553), (.0173, 38.783661, .202), (.2012, 89.264067, .038)]:
            self.assertLess(abs(sao_ra_motion_to_tangent(raw, dec)-bsc), .012)
            self.assertGreater(abs(raw-bsc), .05)  # the incorrect TAP interpretation fails

    def test_pole_and_invalid_values(self):
        self.assertAlmostEqual(sao_ra_motion_to_tangent(1, 0), 15)
        self.assertAlmostEqual(sao_ra_motion_to_tangent(1, 90), 0)
        for raw, dec in [(math.nan, 0), (1, math.inf), (1, 91)]:
            with self.assertRaises(ValueError): sao_ra_motion_to_tangent(raw, dec)

    def test_query_overflow_and_missing_status_never_pass_as_complete(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory)/'catalog.xml'
            for infos in ['', '<INFO name="QUERY_STATUS" value="ERROR"/>',
                          '<INFO name="QUERY_STATUS" value="OK"/><INFO name="QUERY_STATUS" value="OVERFLOW"/>']:
                p.write_text(f'<VOTABLE>{infos}</VOTABLE>')
                with self.assertRaisesRegex(ValueError, 'query failed or incomplete'): read_complete(p)

    def cross_fixture(self):
        base = dict(catalogVersion='bsc5p-bright-stars.v2', rows=[{'hr':str(i)} for i in range(1,8405)])
        table = Table({'hr':range(1,8405)})
        table['sao'] = MaskedColumn([400,400]+[0]*8402, mask=[False,False]+[True]*8402)
        return base, table

    def test_shared_sao_retains_all_bsc_components_without_guessing_missing(self):
        base, table = self.cross_fixture()
        self.assertEqual(dict(bsc_cross_identifications(base, table)), {400:[1,2]})

    def test_repeated_or_missing_hr_cross_identity_rejected(self):
        base, table = self.cross_fixture()
        with self.assertRaisesRegex(ValueError, 'population differs'): bsc_cross_identifications(base, table[:-1])
        table['hr'][1] = table['hr'][0]
        with self.assertRaisesRegex(ValueError, 'population differs'): bsc_cross_identifications(base, table)


if __name__ == '__main__': unittest.main()
