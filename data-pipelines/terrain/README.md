# Copernicus DEM terrain publication

`publish_copernicus_dem.py` turns immutable public Copernicus DEM GLO-30 COGs
into a bounded GCJ-02 registered RGBA hillshade for the Mini Program. The
publication manifest carries source URLs, full-file SHA-256 values, derived
resolution, transform version and honest coverage limits.

`elevationColorEncoding` describes the elevation base colour used by the same
`_terrain_rgba` producer and is bound to the PNG SHA-256. Version
`starward-terrain-elevation-color-v1` linearly interpolates RGB `[215, 224, 207]` to
`[112, 139, 104]` over -20 to 880 m, clamps outside that range, then applies
synthetic hillshade and alpha 224; missing pixels have alpha 0. These bounds
describe the colour encoding, not the dataset's measured elevation range.
Display themes and compositing further affect appearance, so a displayed
colour cannot be read as an exact height or actual lighting. The API exposes
the optional descriptor and this explanation through the shared source notice;
legacy manifests without it remain usable without an invented colour meaning.

The selected objects are the 2021 GLO-30 Public AWS COG mirror of Copernicus
DEM. GLO-30 is available under the free worldwide licence described on the
[official collection page](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM),
DOI `10.5270/ESA-c5d3d65`. The output is a modified product: the manifest keeps
the official modification notice and a concrete derivation statement. Preserve
both whenever the PNG is distributed. Copernicus DEM is a digital surface
model acquired during 2011–2015, so buildings, infrastructure and vegetation
may be represented; it is not a bare-earth terrain model.

Both viewport terrain and spot terrain consume the same publication source.
They use different presentation products: Spot retains elevation colour and its
published legend; the main Map derives a `RELIEF_OVERLAY` with Horn gradients
and Igor slope/aspect shading, following the
[GDAL hillshade documentation](https://gdal.org/en/stable/programs/gdal_raster_hillshade.html).
This small TypeScript rendering kernel reuses the existing GeoTIFF.js/pngjs
pipeline instead of adding a GDAL deployment dependency. Map relief leaves level
ground transparent and marks missing source samples with grey hatching; visual
vertical emphasis does not alter the numeric elevation range or represent live
lighting. It has no elevation-colour descriptor. The client derives its extent
from actual logical Map dimensions, latitude and zoom, with the existing loading
buffer; a design width in rpx is not a native-map pixel count.
The Map layer sheet offers its full source notice in a scrollable disclosure;
the spot terrain view shows its own source directly. The fixed Map controls
must remain outside the long notice. Use the WorldDEM-30 notice from this
publication, not a generic Copernicus Sentinel modification notice.

```powershell
python data-pipelines/terrain/publish_copernicus_dem.py `
  --cache output/terrain-source-cache `
  --output workers/miniapp-api/assets/terrain
```

The cache contains regenerable source GeoTIFFs and is not a release input. The
default publication covers an 85 km radius around the declared Greater Bay Area
center, enough for a 50 km point-centred crop at the initial Shenzhen test and
map centers. The PNG and `publication.json` are served by the API; clients must
treat locations outside the manifest radius as unavailable rather than flat terrain.
Transparent pixels remain missing data and make the current publication partial.

The bundled Greater Bay Area raster is a retained legacy publication, not the
product's national coverage boundary. `workers/miniapp-api/src/terrain-service.ts`
serves it to Spot where covered and uses the same licensed GLO-30 Public AWS COG dataset
on demand for other domestic coordinates. Map and Spot share this owner and the
overlay/image contract. The optional `imageStyle` distinguishes Map relief from
the original colour product; old clients/responses retain their original
compositing. The runtime uses the mature MIT-licensed
GeoTIFF.js reader for selected COG byte ranges/overviews; it does not require
Python or download a national DEM into the Node deployment image.

Cold derivation requires HTTPS reachability from its actual executor to the
declared Public AWS source. Workstation access does not prove deployed-service
connectivity; the existing domestic deployment network restriction still applies.
Deployment must supply an authorized reachable ingestion/cache publication path,
not depend on a client fetching the provider or on a workstation VPN. The
current local data evidence does not certify that deployment prerequisite or
native Map rendering.

Dynamic v2 manifests explicitly bind the retrieved range offsets, lengths and
SHA-256 values plus the source object's ETag. Their source checksum is a digest
of the range proof, **not** a full-object hash. v1 full-file provenance remains
unchanged. Generated 512px RGBA rasters retain transparent missing pixels,
actual coverage/elevation, derivation time, coordinate transform and notices.
Both producers read `workers/miniapp-api/assets/terrain/elevation-color.json`;
the colour interval remains an encoding, not local elevation or accuracy.
Map relief uses the same adopted shadow hue while its alpha expresses synthetic
slope/aspect shading, so it does not attach that colour interval to the image.
Map `glo30-cn-v2-map` filenames and cache keys are distinct from v1 colour
products. Both old bundled and dynamic v1 PNG URLs remain hash-bound and readable;
an in-region old dynamic asset must not be replaced by a bundled or new Map
publication. PNG transparency alone is not a coverage mask for a relief image;
valid-pixel metadata and hatching retain the missing-data meaning.

Runtime work is limited to two active derivations and 24 MiB of retrieved source
bytes per derivation. A workspace-scoped regenerable temp cache holds at most
128 MiB of PNGs/manifests; successful complete-source results are reused for
24 hours, partial/source-missing results for one minute. Immutable asset URLs
include the content hash and geographic request identity, allowing regeneration
after eviction without serving changed bytes under an old URL. The terrain-only
client/server limits are 18/16 seconds. A cold request returned a read failure
near the former 8.5-second window; the wider terrain-only window accommodates
the observed source work while ordinary DTO timeouts stay unchanged.

The [AWS dataset owner](https://registry.opendata.aws/copernicus-dem/) describes
GLO-30 Public as limited worldwide coverage: unreleased or absent source tiles
remain missing. On-demand domestic support does not guarantee every pixel or
new live terrain. Redistribution also carries the liability notice required by
[Article 6(c) of the GLO-30 free licence](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/DEM/resources/license/License-COPDEM-30.pdf),
in addition to source/modification notices. Do not infer rights to other DEM
products or to the separately restricted online view service.
