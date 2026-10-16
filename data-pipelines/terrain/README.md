# Terrain publications

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

Map and Spot share `TerrainService` lifecycle, request/asset identity and bounded
execution. Spot retains this Copernicus elevation-colour publication and its
2–50 km radius/legend; legacy radius-based Map URLs remain readable. The main
Map requests an explicit viewport rectangle and derives a `RELIEF_OVERLAY` with Horn gradients
and Igor slope/aspect shading, following the
[GDAL hillshade documentation](https://gdal.org/en/stable/programs/gdal_raster_hillshade.html).
This small TypeScript rendering kernel reuses the existing pngjs pipeline
instead of adding a GDAL deployment dependency. Map relief leaves level
ground transparent and marks missing source samples with grey hatching; visual
vertical emphasis does not alter the numeric elevation range or represent live
lighting. It has no elevation-colour descriptor. The client retains the existing
20% loading buffer. Production Map bounds come from native `getRegion` on entry, camera
settlement and replacement, bound to the camera/Map/layout/visibility owner.
Android's actual scale did not match the assumed 256px world grid, so the
standard Mercator frame helper is only a public-data trial input. Missing native
bounds do not start a misleading narrow-image request; the existing 10s Map
window, at most two ordinary reads and explicit new-Map recovery handle that failure.
The Map layer sheet offers its own full source notice in a scrollable disclosure;
the spot terrain view shows its Copernicus source directly. The fixed Map controls
must remain outside the long notice. Copernicus products use the WorldDEM-30
notice, not a generic Sentinel notice or the separate Map source's attribution.

The viewport producer `terrain-viewport-renderer.ts` uses the mature
[AWS Terrain Tiles Terrarium pyramid](https://registry.opendata.aws/terrain-tiles/).
The [provider format](https://github.com/tilezen/joerd/blob/master/docs/formats.md)
encodes elevation as `R*256+G+B/256-32768`. Every contributing 256px PNG is
dimension/CRC checked and bound by its complete SHA-256, ETag and actual
`x-amz-meta-x-imagery-sources` response header. Only the currently verified
SRTM/GMTED/ETOPO1 families are accepted; unknown attribution fails that tile
instead of inheriting Copernicus rights. Preserve the
[individual source notices](https://github.com/tilezen/joerd/blob/master/docs/attribution.md),
Mapzen credit, modification description and USGS/NOAA limitations. This does not
certify worldwide/commercial entitlement or deployed reachability. Historical
sampling, buildings/vegetation, coastal/resampling artifacts and ETOPO1
bathymetry remain disclosed; negative heights are not silently flattened.

`TerrainOverlayRequest` distinguishes this Map rectangle from the radius product;
requested/effective radius is null for a viewport. The bounds participate in the
query, cache and reconstructible `terrarium-cn-v1-map` immutable filename.
GCJ-02 output rows follow Web Mercator, each sample transforms to WGS84, and
bilinear interpolation crosses source-tile edges. Horn gradients use separate
horizontal/vertical physical spacing at each row. Pyramid scale is chosen to
fit the existing 12-tile budget, capped at z12; zooming closer does not invent
finer SRTM detail. Only the existing domestic technical bounds are processed;
outside pixels are transparent and explicitly unsupported. A viewport request
does not also scan an enlarged annual-nightlight grid: Map LIGHT keeps its
independent existing query owner.

The native Map keeps a valid image at its true bounds during metadata/download.
Two fixed overlay ids allow a new image and extent to be acknowledged before
the old id is retired. Failed cleanup prevents reuse; timed-out commands retain
their id until the actual callback settles, and late obsolete adds are cleaned
instead of adopted. An id that cannot be safely retired offers the existing
new-Map recovery rather than looping ordinary retries. Displayed source,
resolution and limitations advance only with the confirmed image and stay
paired with retained imagery. Hidden cleanup clears presentation acknowledgment
so resuming still waits for native confirmation. Metadata, PNG and native acknowledgment share the terrain
loading state. Point-query loading is separate. Local API/PNG checks do not
establish actual Android viewport continuity or readability.

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

Dynamic Copernicus v2 manifests explicitly bind the retrieved range offsets, lengths and
SHA-256 values plus the source object's ETag. Their source checksum is a digest
of the range proof, **not** a full-object hash. v1 full-file provenance remains
unchanged. Generated 512px RGBA rasters retain transparent missing pixels,
actual coverage/elevation, derivation time, coordinate transform and notices.
Both producers read `workers/miniapp-api/assets/terrain/elevation-color.json`;
the colour interval remains an encoding, not local elevation or accuracy.
Map relief uses the same adopted shadow hue while its alpha expresses synthetic
slope/aspect shading, so it does not attach that colour interval to the image.
Map `glo30-cn-v3-map` increases display contrast without changing sampled elevations;
its filenames and cache keys are distinct from the previous v2 Map shading and
v1 colour products. Old v2 Map and bundled/dynamic v1 PNG URLs remain hash-bound and readable;
an in-region old dynamic asset must not be replaced by a bundled or new Map
publication. PNG transparency alone is not a coverage mask for a relief image;
valid-pixel metadata and hatching retain the missing-data meaning.

Terrarium v3 manifests bind full source PNGs and actual contributors, with a
separate license/source family rather than a Copernicus DOI. v1/v2 and old Map
v3 image identities retain their original producer and byte validation.

Runtime work is limited to two active derivations and 24 MiB of retrieved source
bytes per derivation. A workspace-scoped regenerable temp cache holds at most
128 MiB of PNGs/manifests; successful complete-source results are reused for
24 hours, genuinely missing-source results for one minute. A partial transient
read/unsupported-source failure retains valid pixels but expires immediately,
reports its independent failure code and permits bounded recovery. The Map
source owner also retains at most 16 completed Terrarium tiles for 24 hours;
pending/failed tiles are not cached. Immutable asset URLs
include the content hash and geographic request identity, allowing regeneration
after eviction without serving changed bytes under an old URL. The terrain-only
source owner keeps a per-image publication proof so an already-published partial
PNG remains readable after fresh metadata recovers to a different full image.
Metadata freshness and immutable-asset retrieval are separate responsibilities.
The terrain-only
client/server limits are 18/16 seconds. A cold request returned a read failure
near the former 8.5-second window; the wider terrain-only window accommodates
the observed source work while ordinary DTO timeouts stay unchanged.
Metadata and asset regeneration share a reader-aware cancellation owner: a
disconnected HTTP reader releases its claim, and the source stops when no reader
remains. One reader cannot cancel another reader's shared derivation. The client
does not retain a failed product as a 24-hour success; independent valid light
data survives, with one bounded automatic recovery that does not cancel a manual
request already in progress.

The [AWS dataset owner](https://registry.opendata.aws/copernicus-dem/) describes
GLO-30 Public as limited worldwide coverage: unreleased or absent source tiles
remain missing. On-demand domestic support does not guarantee every pixel or
new live terrain. Redistribution also carries the liability notice required by
[Article 6(c) of the GLO-30 free licence](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/DEM/resources/license/License-COPDEM-30.pdf),
in addition to source/modification notices. Do not infer rights to other DEM
products or to the separately restricted online view service.
