# BSC5P Mini Program bright-star acquisition

The Mini Program adopts the specific HEASARC BSC5P publication. NASA's [dataset metadata](https://data.nasa.gov/dataset/bright-star-catalog) identifies the dataset as public and links its license to [government works](https://www.usa.gov/government-works). Preserve the [HEASARC usage policy](https://heasarc.gsfc.nasa.gov/docs/heasarc/data_policy.html), dataset-specific provenance and author/service credit; this decision does not extend to arbitrary NASA-hosted mission material.

Acquire the fixed ADQL query in `build_bsc5p.py` from the official HEASARC TAP endpoint and the current IAU WGSN table. `build_bsc5p.py --catalog <VOTable> --names <IAU HTML> --output-dir packages/astronomy-core/data` uses pinned Astropy to decode binary VOTables, validate units/nulls/query completion and derive the complete -2 ≤ V ≤ 5 subset, excluding the publisher's 14 nonstellar HR identities. Runtime does not fetch either website. Raw bytes and acquisition evidence stay task-local; the runtime JSON and hash-bound manifest are versioned together.

Coordinates are FK5 J2000, epoch J2000. The original [catalog specification](https://cdsarc.cds.unistra.fr/viz-bin/ReadMe/V/50?format=html&tex=true) defines RA proper motion as cos(dec) × dRA/dt, in arcsec/year. Do not treat it as milliseconds of angle, seconds of time or unprojected RA. Preserve magnitude code H/R, uncertainty flags, and nullable B−V. BSC5P's older mixed photometry is not a new measurement or guaranteed Johnson V value.

IAU proper names join by exact, unambiguous HR or HD designation, otherwise exact Bayer identity including component digits or Flamsteed identity. Only the same IAU row supplies a HIP alias; conflicting identities never select the first candidate. Component/ambiguous identities are not guessed, and names/HD/astrometry are not imported from the displaced Hipparcos pack. The independent native App's existing data owners are outside this migration.

The pipeline produces data and provenance. Production provider/object-detail/cache migrations and real sky scene verification must additionally establish the delivered capability.
