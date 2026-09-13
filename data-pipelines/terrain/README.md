# Copernicus DEM terrain publication

`publish_copernicus_dem.py` turns immutable public Copernicus DEM GLO-30 COGs
into a bounded GCJ-02 registered RGBA hillshade for the Mini Program. The
publication manifest carries source URLs, full-file SHA-256 values, derived
resolution, transform version and honest coverage limits.

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
