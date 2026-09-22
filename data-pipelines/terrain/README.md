# Copernicus DEM terrain publication

`publish_copernicus_dem.py` turns immutable public Copernicus DEM GLO-30 COGs
into a bounded GCJ-02 registered RGBA hillshade for the Mini Program. The
publication manifest carries source URLs, full-file SHA-256 values, derived
resolution, transform version and honest coverage limits.

The selected objects are the 2021 GLO-30 Public AWS COG mirror of Copernicus
DEM. GLO-30 is available under the free worldwide licence described on the
[official collection page](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM),
DOI `10.5270/ESA-c5d3d65`. The output is a modified product: the manifest keeps
the official modification notice and a concrete derivation statement. Preserve
both whenever the PNG is distributed. Copernicus DEM is a digital surface
model acquired during 2011–2015, so buildings, infrastructure and vegetation
may be represented; it is not a bare-earth terrain model.

Both viewport terrain and spot terrain consume the same publication source.
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
