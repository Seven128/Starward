# Historical planetary surface and latitude publications

## Clementine lunar coverage publication

`publish_clementine_moon.py` processes the complete [USGS Clementine v2.1
GeoTIFF](https://planetarymaps.usgs.gov/mosaic/Lunar_Clementine_UVVIS_750nm_Global_Mosaic_118m_v2.1.tif)
using Rasterio/GDAL and NumPy. Install `requirements-moon.txt` in an isolated
environment. The raw 4,247,470,871-byte source belongs in a local ignored cache,
not in the released assets. Pin and retain its SHA-256 after complete acquisition.

```powershell
python data-pipelines/planet-textures/publish_clementine_moon.py <complete-source.tif> <candidate.png> --source-sha256 <reviewed-source-sha256>
python -m unittest discover -s data-pipelines/planet-textures -p test_clementine_moon.py
```

The publisher checks full byte length, source hash, single uint8 channel,
NoData=0, the lunar equirectangular CRS and global extent. It reads 45-row windows
and takes the mean of measured samples in each exact 45×45 footprint. RGB keeps
the original 8-bit grayscale scale; alpha records measured area fraction.
Very dark nonzero measurements remain valid. Empty footprints contain no invented
terrain and use the consumer's explicitly described geometric fallback. Alpha
is coverage, not albedo or the computed lunar phase. Encoding is atomic; invalid,
empty or failed sources preserve an existing candidate. The published coverage PNG has its own manifest and Mini API route under
`/v2/sky/moon/coverage`. The legacy WMS JPEG contract stays available for old
clients; source-information requests explicitly select the same publication
version as the image consumer. The fixed source SHA is in the publisher; output
SHA and processing metadata are in `workers/miniapp-api/assets/moon/coverage-manifest.json`.

The source is the already selected USGS public-domain product; preserve the
[USGS product record](https://astrogeology.usgs.gov/search/map/moon_clementine_uvvis_global_mosaic_118m),
[usage policy](https://www.usgs.gov/faqs/are-usgs-reportspublications-copyrighted)
and Clementine/USGS attribution with any eventual publication. Missing regions
also occur at middle/low latitudes. Transparent WMS PNG requests do not preserve
their mask; thresholding a JPEG is not an equivalent derivation. Acquisition,
processing, storage and delivery costs are separate. Local output pixels, registration and old/new consumer compatibility have been
checked. Target WeChat composition and device resource costs remain unverified.

## HST OPAL historical planetary latitude profiles

The shared `opal_latitude_profile.py` now owns the source-hash, RGB/geometry,
valid-longitude and output rules for both Jupiter and Saturn. Each product
wrapper pins its own reviewed source and dimensions.
Publishing rejects a source with no measured latitude rows before touching the
previous asset; a successfully encoded transparent image is not a valid band
publication.

## Jupiter 2024c

The checked-in `jupiter-opal-2024c-median-bands-8x512.png` is derived from the
[MAST OPAL Jupiter Cycle 31](https://archive.stsci.edu/hlsp/opal/opal-jupiter-cycle-31)
2024c F395N/F467M/F658N color preview. The [OPAL HLSP page](https://archive.stsci.edu/hlsp/opal)
marks these products CC BY 4.0; the [MAST data-use policy](https://archive.stsci.edu/publishing/data-use)
explains that this license travels with redistributed HLSP data. Credit NASA/ESA
HST OPAL, PI Amy Simon, STScI/AURA, and DOI 10.17909/T9G593; identify this
latitude-median transformation. The source is an arbitrarily scaled, historical
three-filter composite, not natural color or current Jovian weather.

Run with the pinned official TIFF downloaded separately:

```powershell
python data-pipelines/planet-textures/publish_opal_jupiter_bands.py <official-2024c-color.tif> workers/miniapp-api/assets/jupiter/jupiter-opal-2024c-median-bands-8x512.png
```

The script refuses any source SHA other than the reviewed file. It takes the
median RGB across each latitude with at least 90% valid longitude coverage,
then reduces to an 8×512 RGBA strip. Transparent polar rows mean missing source
coverage and should fall back to the plain globe. Longitude-dependent clouds,
including the 2024 Great Red Spot, are intentionally absent; applying a dated
red-spot longitude to a current report would imply an unsupported prediction.

## OPAL Saturn historical band profile

`saturn-opal-2025a-median-bands-8x512.png` is derived from the official
[MAST OPAL Saturn Cycle 32](https://archive.stsci.edu/hlsp/opal/opal-saturn-cycle-32)
2025a F395N/F502N/F631N global color TIFF. The
[OPAL HLSP page](https://archive.stsci.edu/hlsp/opal) marks this publication
CC BY 4.0; credit NASA/ESA/HST OPAL Team (PI Amy Simon)/STScI and DOI
10.17909/T9G593, link the license, and describe Starward's median adaptation.
This historical, arbitrarily scaled three-filter color composite is neither
natural color nor current Saturnian weather.

Run with the pinned 1800×900 official TIFF downloaded separately:

```powershell
python data-pipelines/planet-textures/publish_opal_saturn_bands.py <official-2025a-color.tif> workers/miniapp-api/assets/saturn/saturn-opal-2025a-median-bands-8x512.png
```

The source README identifies planetographic latitude and System III west
longitude; the derived image discards longitude entirely. Rows with less than
90% valid coverage, including ring-obscured latitudes and polar gaps, remain
transparent and fall back to the plain computed globe. The map's 2025 moon and
shadow positions are never displayed as current features. Ring geometry and
the globe's phase remain tied to the requested observation time.

## Ice-giant fixed publications

`publish_opal_ice_giant_bands.py` pins the official OPAL [Uranus Cycle 33](https://archive.stsci.edu/hlsp/opal/opal-uranus-cycle-33)
2025a and [Neptune Cycle 32](https://archive.stsci.edu/hlsp/opal/opal-neptune-cycle-32)
2025b RGB TIFFs. It uses the same source-hash and valid-longitude rules as the
adopted Jupiter/Saturn profiles. These are enhanced historical colors, not
natural color or current cloud locations. The pinned outputs live in `workers/miniapp-api/assets/{uranus,neptune}`;
manifest, hash-bound HTTP, client lifecycle and source attribution share the
existing fixed-publication owners. They remain historical adaptations with
partial latitude coverage. Target WeChat pixels, missing-latitude shader
fallback and device cost remain unverified; local checks do not close them. Body-axis
orientation is independently compared with JPL Horizons sub-observer values
in `workers/miniapp-api/src/astronomy-golden.test.ts`.

The source maps are 721×361. Uranus's southern latitudes and Neptune's northern
latitudes are missing from these particular products; transparent rows mean
missing measurement, not dark atmosphere. Longitude is discarded, so the
opposite longitude conventions of the two source maps cannot be interpreted as
present-day cloud placement. The [OPAL HLSP page](https://archive.stsci.edu/hlsp/opal)
licenses the products CC BY 4.0 and asks for NASA/ESA HST OPAL, PI Amy Simon,
STScI/AURA and DOI 10.17909/T9G593 attribution; redistribution carries the
license and must identify Starward's median-strip adaptation.
The ice-giant wrapper uses a strict binary coverage mask after color resampling:
LANCZOS must not leak low-opacity color into unmeasured latitude rows. This
opt-in does not change the pinned Jupiter/Saturn publication bytes.
