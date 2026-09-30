# AllWISE W3 deep-sky imagery publication

## Historical 2MASS Galactic panorama

`publish_2mass_galactic.py` takes the **specific** 9600×4800 equirectangular
[IPAC Cool Cosmos 2MASS image](https://coolcosmos.ipac.caltech.edu/images/142)
and writes a 2048×1024 JPEG and manifest to
`workers/miniapp-api/assets/deep-sky/galactic-2mass/`. Download the exact
`sourceUrl` in that manifest as the input; its SHA-256 is pinned in the script.
Use `requirements.txt` (Pillow 12.3.0) to regenerate. The JPEG is 703,555
bytes and 8 MiB decoded RGBA before native image and GPU overhead. The BFF
serves only its local hash-checked bytes via `/v2/sky/galactic`; runtime never
requests IPAC. It is shown only on a dark, wide normal-mode sky; an explicitly
enabled W3 wide layer replaces it at FOV ≥60° to stay within the 16 MiB GPU
texture cache. The existing coordinate schematic is the missing/failure
fallback.

The [2MASS gallery](https://www.ipac.caltech.edu/2mass/gallery/showcase/copyright.html)
explicitly releases its gallery images into the public domain and asks for
2MASS/UMass/IPAC-Caltech/NASA/NSF acknowledgment. The
[IPAC Cool Cosmos image policy](https://coolcosmos.ipac.caltech.edu/page/image_use_policy)
allows use of its imagery for any purpose absent an identified exception,
requests attribution and disclaims institutional endorsement. The manifest
and Mini disclosure keep the image-specific credit, record and both use-policy
links. These rights apply to this particular gallery image, not by inference to
other 2MASS atlas data or unrelated imagery. This is historical J/H/K
near-infrared false color, not visible-light Milky Way, calibrated sky
brightness, current conditions or high-resolution optical coverage. Longitude
registration and physical-device appearance remain validation obligations.

## Optional wide-sky infrared layer

`publish_allwise_w3_wide.py` publishes exactly the twelve 512×512 order-0 JPEG
tiles from the [CDS/Aladin AllWISE W3 public master](https://alasky.cds.unistra.fr/AllWISE/W3).
This is a separate, low-resolution historical 12 µm infrared layer for a
nighttime field of view of at least 60°. It is off by default; the user can turn
it on, and Observation red mode suppresses it. It is neither a visible-light
Milky Way image nor an optical all-sky survey. The original tiles contain
instrument artifacts and gaps. No higher HiPS orders are packaged or promised.

The publisher pins each source tile's JPEG geometry and SHA-256, reuses a local
copy when unchanged. `--refresh` fetches from the master again and refuses a
changed tile against the existing manifest until that change is reviewed and
repinned deliberately. With a Python runtime and
Pillow installed, regenerate the bounded publication from the repository root:

```powershell
python data-pipelines/deep-sky/publish_allwise_w3_wide.py
```

The output is `workers/miniapp-api/assets/deep-sky/wide-field-w3/`: twelve
unmodified JPEGs, an integrity/provenance manifest and a HiPS `properties`
file. The checked-in JPEG total is 678,144 bytes; decoded RGBA for all twelve
tiles is 12 MiB before GPU/upload overhead. That is a bounded dataset size,
not a measured device memory peak or a cloud-traffic cost estimate. The BFF
serves only local hash-verified files under `/v2/sky/wide-field` and never
proxies the upstream survey at runtime.

The [CDS W3 record](https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FallWISE%2FW3&fmt=html&get=record)
lists the HiPS processing database as ODbL-1.0 with CNRS/Unistra attribution
and DOI `10.26093/cds/aladin/na1n-03`. The [IRSA data terms](https://irsa.ipac.caltech.edu/data_use_terms.html)
and [WISE/NEOWISE acknowledgment](https://irsa.ipac.caltech.edu/data/WISE/docs/release/AllWISE/expsup/sec1_6b.html)
apply separately to the original IPAC/NASA imagery. The copy comes from the
CDS public master, not the IRSA mirror marked `unclonable`. It declares itself
`public partial unclonable` at order 0 and carries a machine-readable manifest,
source URLs, changes, licenses and acknowledgment. See the [HiPS cloning rule](https://www.ivoa.net/documents/HiPS/20170519/REC-HIPS-1.0-20170519.pdf)
and [ODbL terms](https://opendatacommons.org/licenses/odbl/1-0/). Retain the
manifest and properties with the tiles in any deployment; the ODbL notice is
for this image database, not a license on the Mini Program source code.

## Object cutouts

`publish_allwise_w3.py` builds the three progressive image levels used by the
Mini Program from the pinned 51-row OpenNGC Messier catalog. It queries the
IRSA-hosted AllWISE W3 HiPS (12 µm) and requests exact north-up TAN products
from the documented CDS `hips2fits` processor at build time. It writes those
self-hosted JPEGs plus a provenance manifest that binds the IRSA survey URL,
the processing request and both dataset/service citations.

Rendered build products are regenerable cache inputs and must stay outside the release
bundle. The default output contains only the derived assets and manifest:

```powershell
.\.venv\Scripts\python.exe data-pipelines/deep-sky/publish_allwise_w3.py `
  --cache output/allwise-w3-source-cache `
  --output workers/miniapp-api/assets/deep-sky `
  --all
```

Use `--objects M:31,M:42` for a bounded integration trial. Requests are
sequential and cached so interrupted builds can resume without repeatedly
loading IRSA.

## Coverage metadata and compatibility

The current manifest is `allwise-w3-deep-sky-publication-v3`. It retains 150
CDS JPEG levels and supplies three source-bound M42 PNG levels. Each level
has `validFraction: null` and `coverageState: NOT_MEASURED`:
dimension, decoding and nonconstant display extrema do not measure valid
scientific samples. A black pixel can be low brightness or missing data;
unmasked JPEGs have no published source validity mask. M42 PNG alpha marks
only nonfinite selected HiPS samples, separately from scientific validity. Source saturation,
detector artifacts and mosaicking differences remain quality obligations.

The [AllWISE Atlas cautionary notes](https://irsa.ipac.caltech.edu/data/WISE/docs/release/AllWISE/expsup/sec4_4.html)
distinguish saturated, masked NaN/zero-coverage regions from low-response
W3/W4 bands that can still have coverage. The
[depth-of-coverage maps](https://irsa.ipac.caltech.edu/data/WISE/docs/release/All-Sky/expsup/sec2_3d.html)
measure PRF-weighted usable observation depth, not confidence or freedom from
artifacts. Original Atlas cutouts retain their source WCS (including SIN and
off-cutout reference pixels); they are not the published TAN cutout headers.
A local original-data sample must be bound to the actual HiPS inputs and
resampling before it can supply a published image mask. Do not derive missing
pixels from JPEG darkness, use positive coverage as a complete quality mask,
or certify a full cutout from a partial source patch. New pixel/mask products
must retain their exact input, geometry and predecessor offers.

For a new raw-HiPS-derived cutout, bind every actual FITS tile and its NESTED
pixel mapping to the output's own full TAN WCS and declared resampling. HiPS
JPEG/PNG columns use NW and rows NE; FITS rows reverse that image convention,
as established by the [CDS packaging mapping](https://gist.github.com/tboch/f68cd1bb1529d8ac12184b40e54ba692).
Preserving selected nonfinite source samples as transparent pixels does not
measure artifact-free scientific coverage. Finite low or black measurements
must not be classified as absent. Missing FITS end-block padding is distinct
from a truncated scientific array; retain the raw receipt and reject missing
array bytes. A local source-bound candidate is not a published image or a
replacement mask for the old CDS JPEG. Publication must keep the actual
processing statement, geometry, original notices and historical download
offers together before consumers switch to new pixels.

The metadata-only correction preserves the previous v1 manifest in
`assets/deep-sky/publications/` and names its hash in `previousPublicationHash`.
Its source offer and image URLs remain readable through the same BFF owner.
The preserved v1 fraction was hard-coded, not measured; do not use it as
coverage evidence. All JPEG bytes stay unchanged. Regeneration carries the
declared predecessor, requires its archive to remain present, and refuses to
replace an existing published JPEG in place. A v1 input needs explicit metadata
migration/archiving before regeneration. New pixel assets require versioned
paths and preserved published predecessors rather than overwriting these files.

## Source-bound PNG migration and delivery

`publish_allwise_w3.py --objects M:42 --finite-candidate <checked-candidate-directory>`
uses `allwise_finite_tan.py` and the existing Node/healpix-ts implementation in
`hips_tan_lookup.mjs`. Install the pinned offline-render requirements when
regenerating (Pillow, Astropy and NumPy); ordinary CDS JPEG publishing imports
only Pillow. The checked directory contains the input plan/receipt and cached
FITS tiles; its parent supplies the hash-bound HiPS properties. This mode makes
no upstream request. It verifies each receipt/hash and the complete scientific
array, reconstructs the TAN WCS, selects nearest NESTED cells, stretches finite
values and checks encoded PNG alpha and the already approved candidate hashes.
Missing end padding stays in the receipt; truncated arrays are rejected.

The migration requires a current v2 publication, preserves its raw archived
manifest and all old JPEGs, writes immutable PNG paths, then switches metadata
atomically. Partial failure keeps old current metadata usable. Ordinary
`--all` refuses to regenerate v3 in place. The manifest carries both previous
hashes and the explicit legacy v2 hash. BFF hashes use JSON.stringify semantics,
not arbitrary JSON serialization. Current input/projection/processing and
rights travel with the new PNGs; the old JPEG is not given an inferred mask.

New Mini requests opt in with `imageVersion=source-finite-v3`; no-version
clients still receive v2 JPEGs. Explicit publication hashes always select that
archived offer. The response supplies MIME, dimensions, field, publication
hash and source ID, plus missing-sample count only for source-bound PNG. New
clients require identity headers before writing/painting and need a compatible
BFF before rollout. Object information accepts `deepSkyImageVersion` and
`deepSkyPublicationHash`; modal/source route and caches bind actual painted
pixels rather than automatically disclosing the newest publication. A missing
bound source retains independent catalogue facts as PARTIAL with retry.

This is local pipeline/HTTP/consumer verification. Source detector bands and
saturation remain; finite samples do not establish artifact-free quality,
Atlas exposure depth or confidence. Native/phone composition, registration,
whole experience and resource/cost acceptance remain separate obligations.

## Commercial-use notices and distribution

The adopted AllWISE W3 HiPS is `CDS/P/allWISE/W3`. Its [CDS record](https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FallWISE%2FW3&fmt=html&get=record) identifies ODbL-1.0, CNRS/Unistra, CDS/Aladin and HiPS DOI `10.26093/cds/aladin/na1n-03`. The IRSA mirror's `unclonable` flag concerns HiPS mirroring; it is not a noncommercial license. See [HiPS §5.4](https://www.ivoa.net/documents/HiPS/20170519/REC-HIPS-1.0-20170519.pdf).

Keep the full [AllWISE WISE + NEOWISE acknowledgment](https://irsa.ipac.caltech.edu/data/WISE/docs/release/AllWISE/expsup/sec1_6b.html), IPAC/NASA credit and original Atlas DOI `10.26131/IRSA153` separately from the HiPS database license. Credit the actual [online CDS hips2fits service](https://alasky.cds.unistra.fr/hips-image-services/hips2fits); `10.26093/2msf-n437` refers to a different offline script and is not this pipeline's service citation. No CDS/NASA logos or endorsement are implied.

Starward offers this imagery selection/arrangement under ODbL, preserving the upstream database notice and the individual image acknowledgment. The manifest separately credits OpenNGC's CC BY-SA 4.0 target identities/positions. ODbL is not applied to the entire app or substituted for the catalog or image-content terms. The manifest describes the modifications and every exact processing request; the existing object-information source disclosure offers its hash-bound download, which lists all three image levels and their verified download URLs. This supplies the machine-readable collection and changes for [ODbL §§4.2–4.6](https://opendatacommons.org/licenses/odbl/1-0/). On an update, preserve applicable notices, regenerate publication identity, and keep the offer associated with the images being served.

The BFF serves `/v2/sky/deep-sky/{publicationHash}/manifest`; its hash identifies the stored manifest before delivery URLs are added. It is not the raw-byte SHA of that response. Image download URLs include the same hash and reject an unavailable version. Deployment must include the actual JPEGs and this download route; a local manifest alone does not deliver the offer to users. The runtime never retrieves upstream images.

## SDSS DR17 M51 optical target

`workers/miniapp-api/assets/deep-sky/sdss-m51/` contains **only M:51** at 512×512 and 1.6, 0.8 and 0.4 arcsec/pixel. The three JPEGs are original responses from the official DR17 `https://skyserver.sdss.org/dr17/SkyServerWS/ImgCutout/getjpeg` with `ra=202.469625`, `dec=47.1951666667`, `width=height=512`, and no overlay; only their local filenames changed. `manifest.json` pins each full request, input SHA-256/byte count, field width, exact source and modification statement. `SdssOpticalImageryService` verifies local bytes at HTTP delivery and serves a hash-bound, machine-readable manifest with three download URLs. Runtime upstream fetch is forbidden. New publication data must receive its own identity and client validation; do not silently replace a pinned file.

The [SDSS Image Use Policy](https://www.sdss.org/collaboration/image-use-policy/) explicitly permits use for any purpose with image credit and links its CC BY 4.0 license. Keep `Sloan Digital Sky Survey` visible with the displayed image, and retain the source, [license](https://creativecommons.org/licenses/by/4.0/) and no-pixel-edits notice in the source page/manifest. The [SkyServer JPEG documentation](https://www.sdss4.org/dr16/imaging/jpg-images-on-skyserver/) explains the g/r/i construction; these are historical optical composites, not current eyepiece appearance or photometry. This limited product asset does not authorize an automated full-sky scrape or promise more targets. [SDSS imaging coverage](https://www.sdss.org/dr18/imaging/) is limited and [official access guidance](https://www.sdss.org/dr18/imaging/tools/) uses CAS/SAS for broader retrieval. Image quality, local center registration and operational cost must be checked per new target before expansion.
