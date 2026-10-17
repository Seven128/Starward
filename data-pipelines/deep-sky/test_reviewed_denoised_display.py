"""Denoising pixel boundaries; no model or quality verdict runs in fixtures."""
import copy
import hashlib
import unittest

from PIL import Image, ImageCms

from reviewed_denoised_display import validate_denoise_display_pixels


class DenoisePixelsTest(unittest.TestCase):
    def fixture(self):
        profile = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
        before = Image.new('RGB', (40, 32), (20, 20, 20)); before.info['icc_profile'] = profile
        staged = before.copy(); vendor = Image.new('RGB', before.size, (18, 18, 18))
        final = vendor.copy(); final.info['icc_profile'] = profile
        row = {'size': [40, 32], 'changedPixels': 1280, 'suppliedPixels': 1280,
            'colour': {'colorSpace': 'sRGB', 'iccSha256': hashlib.sha256(profile).hexdigest(),
                'iccOwner': 'bound normalized input; vendor ICC is not relied on'}}
        return before, staged, vendor, final, row

    def test_whole_rgb_vendor_equality_rejects_one_pixel_even_when_change_count_is_still_valid(self):
        before, staged, vendor, final, row = self.fixture()
        self.assertEqual(validate_denoise_display_pixels(before, staged, vendor, final, row), 1280)
        final.putpixel((39, 31), (19, 18, 18))
        # Every pixel still differs from the parent; count-only proof escapes.
        with self.assertRaisesRegex(ValueError, 'vendor_pixels_or_icc_changed'):
            validate_denoise_display_pixels(before, staged, vendor, final, row)

    def test_same_size_no_effect_false_supply_and_wrong_stage_are_not_success(self):
        before, staged, vendor, final, row = self.fixture()
        no_effect = before.copy()
        with self.assertRaisesRegex(ValueError, 'saved_pixel_proof_changed'):
            validate_denoise_display_pixels(before, staged, no_effect, no_effect, row)
        wrong = copy.deepcopy(row); wrong['suppliedPixels'] -= 1
        with self.assertRaisesRegex(ValueError, 'saved_pixel_proof_changed'):
            validate_denoise_display_pixels(before, staged, vendor, final, wrong)
        staged.putpixel((0, 0), (21, 20, 20))
        with self.assertRaisesRegex(ValueError, 'vendor_pixels_or_icc_changed'):
            validate_denoise_display_pixels(before, staged, vendor, final, row)

    def test_alpha_geometry_and_conflicting_icc_cannot_inherit_rgb_display_proof(self):
        before, staged, vendor, final, row = self.fixture()
        for invalid in [final.convert('RGBA'), final.resize((20, 16))]:
            with self.assertRaisesRegex(ValueError, 'vendor_pixels_or_icc_changed'):
                validate_denoise_display_pixels(before, staged, vendor, invalid, row)
        vendor.info['icc_profile'] = b'conflicting-profile'
        with self.assertRaisesRegex(ValueError, 'vendor_pixels_or_icc_changed'):
            validate_denoise_display_pixels(before, staged, vendor, final, row)


if __name__ == '__main__': unittest.main()
