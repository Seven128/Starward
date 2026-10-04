# AllWISE W3 deep-sky imagery publication

Prepared progressive publication now has an explicit `prepared-optical-v2` contract: OVERVIEW 512, MEDIUM/DETAIL 1024, frozen wide 2048 master plus same-source fine 1024 grid, with complete old-v1 ancestry, input/geometry/processing identities and a new canonical hash. This measured profile preserves strict old raw/display v1 and reuses existing publisher, file validation, HTTP, shared native loader and TAN/Scene consumers. `publish_prepared_progressive.py` validates cached products without another source decode/projection. Ordinary registry remains empty; explicit actual-page and standard file export are development evidence only. Optical retention stays at the existing 2MiB pressure target, protecting current wanted images (8MiB for both 1024 grids). A measured warm zoom-out intermediate Scene has no Prepared image; stable restoration does not close continuous fallback. Full quality/registration, actual static network exit/retention/capacity, native and new independent review remain open. See [current evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-prepared-progressive-publication-2026-10-05.md). Only the task PLAN owns execution order.

当前M82共享科学/显示责任：`sdss_noise_model_increment`现负责独立新版 display candidate 的源 noise 模型刷新：核真实 typed complete 父及 caller-bound 完整 circle/真实8px边外依赖，以原缓存 SCI/raw RUN-MJD-known-bad/有效 native-ID 系数和共同孔径实际消费；保旧 typed/版本、未请求及旧强信号，前后 source/implementation 身份与 late cancellation 准入不放松。新增资格不允许伪装旧父或绕过原 authenticity 守卫。新版独立 estimate/q/radius/strong及完整三级导出不改变原 SCI signed/unknown/coverage-alpha/WCS/冻结 recipe，不是科学校正或质量采用。完整必要增量和三级保存读回已有开发证据，边缘部分改善但暖核/颗粒/绿色结构/条带仍未过，普通 registry空；目录20星不覆盖DETAIL，不能冒中央恒星/PSF与配准验收。下一沿既有离线出版合同核 estimate 与原 science-v2/v3 责任、实际处理谱系与兼容，显式小路径未验；完整来源/standardstatic/cache/renderedBack、图质与成本通过才采用。 见[显式新版与完整输出](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-m82-noise-v2-increment-2026-10-04.md)。官方SKY finite constant-edge规则与真nonfinite/CCD flags边界见[原端点证据](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-m82-sky-endpoint-2026-10-04.md)。执行顺序仅由唯一PLAN控制。

显式`sdss-display-optical-v1`表示原科学母图之上的处理显示估计，不能冒原science-v3测量均值或Prepared JPEG/AVM重采样。`sdss-display-optical-publication`与旧science合同共用SDSS来源/母图/三级几何准入，分别核实际level语义；旧schema拒绝新版。`publish_sdss_display`以pinned实际execution/source/旧父/new noise/native-ID共同孔径/估计与诊断/原SCI-alpha-WCS-frozenrecipe封包，exclusive/取消/前后身份及冻结memory receipt保；canonical publication hash只由共享TS拥有。`optical_publication_io`统一Prepared与display的streaming byte绑定、同解码buffer pin、pinned JSON及domain固定NPY header-size-dtype/order分配前守卫，不加载AVM adapter；Prepared原错误与几何/估计含义不改。实际完整新publication/18原收据/三个PNG与当前守卫消费有开发证据，原图质仍未过；新版尚未迁移至运行时公开类型/API/静态/cache/Hook/Scene，不能默认注册或以封包当采用，来源完整链/成本/跨目录物理保留继续开放。 见[实际出版准入](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-m82-display-publication-2026-10-04.md)。执行顺序仅由唯一PLAN控制。

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
Pillow and NumPy for shared structure/display-review diagnostics, without the
FITS reader. The checked directory contains the input plan/receipt and cached
FITS tiles; its parent supplies the hash-bound HiPS properties. This mode makes
no upstream request. It verifies each receipt/hash and the complete scientific
array, reconstructs the TAN WCS, selects nearest NESTED cells, stretches finite
values and checks encoded PNG alpha and the already approved candidate hashes.
Missing end padding stays in the receipt; truncated arrays are rejected.

`sample_cached_tan` is the shared fresh-science entry before a display product
exists. Pass the actual plan/entry, source cache root, complete canonical
source records/count and hash-bound survey properties. An optional
`source_paths` map locates each canonical tile in that root, permitting direct
reuse of existing files; it supplies no extra coverage or altered identity.
The owner derives every requested TAN profile and its whole actual source
demand before source admission, then returns intensity, finite availability
and actual WCS/source metadata in `TanSamples`. It needs no expected PNG or
product receipt. Finite zero/negative values remain data; unavailable source
files fail admission. `render_cached_candidate` consumes this same sampling
owner and retains its three-level frozen PNG/metadata/QC compatibility.
Intensity units without an authoritative source declaration remain unknown;
finite availability does not certify source artifacts, source resolution or
absolute astrometry. See the task
[fresh sampler evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-allwise-fresh-tan-sampling-2026-10-02.md).

`allwise_atlas_source.read_cached_atlas_triplet` is the offline native W3
intensity/coverage/uncertainty admission owner. It reuses the same complete
file-set/receipt/hash boundary, verifies actual product identity, DN versus
effective-pixel units, float32 extent and common native SIN WCS/calibration,
and rechecks inputs after parsing. Cancellation or changed/incomplete sources
return no bundle. Read-only original arrays retain finite zero/negative values
and nonfinite samples. Finite intensity, known coverage/uncertainty, positive
contribution and joint support remain separate; positive coverage alone is not
availability, detector quality, display alpha, confidence or independent noise.
The actual cached M82 native consumer uses this owner: 25 positive-coverage
pixels have nonfinite intensity/uncertainty, while low positive support at its
finite dark core is retained. It fetches/resamples nothing and does not change
HiPS sampling, images, scientific masks or ordinary publication. See
[shared native admission and real consumer](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-shared-allwise-atlas-source-2026-10-04.md).

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

## Shared offline structure and quality review

`image_quality.py` owns full encoded-image decoding, byte/hash/dimension and
catalogue identity checks, published TAN header consistency and complete
planned scientific-source set admission. `publish_allwise_w3.py` uses it before
writing each JPEG. `allwise_finite_tan.py` uses it before sampling a complete
candidate and checks encoded PNG alpha against the actual finite source array.
The source-specific FITS reader still owns array completeness; an unavailable
source file never becomes a nonfinite scientific sample. Existing immutable
assets, predecessor offers and manifest identities are unchanged by reporting.

Reports bind actual manifest/asset bytes, source/processing, field, dimensions
and supplied WCS. SDSS JPEGs have no precise service WCS in the current input;
their reports retain that unknown rather than manufacturing a measured header.
An overview must geometrically contain the existing catalogue extent bound;
narrower medium/detail crops remain valid refinements and are flagged for
composition review. That catalogue bound is not a footprint measured in this
survey band. Encoded RGB/alpha, central-region counts, row/column jumps,
8×8 cell/chroma diagnostics and Laplacian variance only locate review regions.
They establish neither artifact cause, source resolution, photometry, missing
bands nor quality acceptance. All admitted reports say quality unverified.
Finite black measurements remain data; brightness never creates a science mask.

Run the same read-only batch over one or more current AllWISE/SDSS manifests:

```powershell
.\.venv\Scripts\python.exe data-pipelines/deep-sky/image_quality.py `
  --manifest workers/miniapp-api/assets/deep-sky/manifest.json `
  --manifest workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json `
  --report output/sky-image-review/new-report.json
```

The report path must be new. Publisher `--quality-report` accepts a new path
outside the publication directory and emits the same diagnostics separately
from scientific metadata. Reports are build/task artifacts, not published
quality certification. Shared checks do not repair M51's remaining daytime
rectangle, M82's unresolved dark region or source saturation/stripes. The
representative current inputs and checks do not cap future legitimate coverage
or authorize excluded survey sources, new rights or runtime source scraping.

## Commercial-use notices and distribution

The adopted AllWISE W3 HiPS is `CDS/P/allWISE/W3`. Its [CDS record](https://alasky.cds.unistra.fr/MocServer/query?ID=CDS%2FP%2FallWISE%2FW3&fmt=html&get=record) identifies ODbL-1.0, CNRS/Unistra, CDS/Aladin and HiPS DOI `10.26093/cds/aladin/na1n-03`. The IRSA mirror's `unclonable` flag concerns HiPS mirroring; it is not a noncommercial license. See [HiPS §5.4](https://www.ivoa.net/documents/HiPS/20170519/REC-HIPS-1.0-20170519.pdf).

Keep the full [AllWISE WISE + NEOWISE acknowledgment](https://irsa.ipac.caltech.edu/data/WISE/docs/release/AllWISE/expsup/sec1_6b.html), IPAC/NASA credit and original Atlas DOI `10.26131/IRSA153` separately from the HiPS database license. Credit the actual [online CDS hips2fits service](https://alasky.cds.unistra.fr/hips-image-services/hips2fits); `10.26093/2msf-n437` refers to a different offline script and is not this pipeline's service citation. No CDS/NASA logos or endorsement are implied.

Starward offers this imagery selection/arrangement under ODbL, preserving the upstream database notice and the individual image acknowledgment. The manifest separately credits OpenNGC's CC BY-SA 4.0 target identities/positions. ODbL is not applied to the entire app or substituted for the catalog or image-content terms. The manifest describes the modifications and every exact processing request; the existing object-information source disclosure offers its hash-bound download, which lists all three image levels and their verified download URLs. This supplies the machine-readable collection and changes for [ODbL §§4.2–4.6](https://opendatacommons.org/licenses/odbl/1-0/). On an update, preserve applicable notices, regenerate publication identity, and keep the offer associated with the images being served.

The BFF serves `/v2/sky/deep-sky/{publicationHash}/manifest`; its hash identifies the stored manifest before delivery URLs are added. It is not the raw-byte SHA of that response. Image download URLs include the same hash and reject an unavailable version. Deployment must include the actual JPEGs and this download route; a local manifest alone does not deliver the offer to users. The runtime never retrieves upstream images.

## SDSS DR17 M51 optical target

`workers/miniapp-api/assets/deep-sky/sdss-m51/` contains **only M:51** at 512×512 and 1.6, 0.8 and 0.4 arcsec/pixel. The three JPEGs are original responses from the official DR17 `https://skyserver.sdss.org/dr17/SkyServerWS/ImgCutout/getjpeg` with `ra=202.469625`, `dec=47.1951666667`, `width=height=512`, and no overlay; only their local filenames changed. `manifest.json` pins each full request, input SHA-256/byte count, field width, exact source and modification statement. `SdssOpticalImageryService` verifies local bytes at HTTP delivery and serves a hash-bound, machine-readable manifest with three download URLs. Runtime upstream fetch is forbidden. New publication data must receive its own identity and client validation; do not silently replace a pinned file.

Adjacent `sdss-m63`, `sdss-m64`, `sdss-m81`, `sdss-m82` and `sdss-m87`
directories retain their independently admitted three-level original JPEGs.
M81 uses 3.2/1.6/0.4 arcsec per pixel to preserve its larger overview; the other
five targets use 1.6/0.8/0.4. The shared contracts registry owns all six fixed
publication identities and the original M51 offer remains compatible. Source
centre footprint/decode admission does not prove whole-pixel or per-band
scientific coverage. Current targets are inputs, not a product requirement cap.

The [SDSS Image Use Policy](https://www.sdss.org/collaboration/image-use-policy/) explicitly permits use for any purpose with image credit and links its CC BY 4.0 license. Keep `Sloan Digital Sky Survey` visible with the displayed image, and retain the source, [license](https://creativecommons.org/licenses/by/4.0/) and no-pixel-edits notice in the source page/manifest. The [SkyServer JPEG documentation](https://www.sdss4.org/dr16/imaging/jpg-images-on-skyserver/) explains the g/r/i construction; these are historical optical composites, not current eyepiece appearance or photometry. This limited product asset does not authorize an automated full-sky scrape or promise more targets. [SDSS imaging coverage](https://www.sdss.org/dr18/imaging/) is limited and [official access guidance](https://www.sdss.org/dr18/imaging/tools/) uses CAS/SAS for broader retrieval. Image quality, local center registration and operational cost must be checked per new target before expansion.


## Cached SDSS scientific-frame trials

`sdss_corrected_frame.py` admits byte-bound local DR17 corrected frames from
the exact official release/run/camcol/field/band SAS URL. It checks one complete
bounded bzip2 stream, all scientific HDUs, source identity, asTrans and ICRS
primary WCS. Corrected samples are already calibrated and sky-subtracted;
finite zero/negative values remain measurements. Retained astrometric
coefficients, finite pixels and source completeness do not certify precise
polynomial/DCR alignment, detector validity or a full output footprint.

`sdss_gri_tan.py` consumes those frames offline and owns common north-up TAN
projection, independent geometry/finite-neighbor availability, one shared RGB
master and geometrically consistent progressive crops. These are reviewable
trials outside release assets, not a replacement for the fixed SDSS JPEG v1
product. Different bands must use their actual WCS; a complete center frame or
r-only union does not prove a complete gri target. Multi-field inputs require
explicit coherent contributions and overlap treatment before color mapping.
Display alpha is separate from sample availability and scientific validity.
`build_mosaic_master` keeps aggregate coherent-data masks consistent with
finite coadd samples; `independent_band_unions` separately describes known
source supply. `require_complete=True` checks coherent same-field gri support,
not only three separate band unions. Common geometric weights preserve the
shared band contribution; no automatic background offset or second calibration
is inferred from overlap. Progressive display and lossless/lossy encoding
remain independent review obligations before publication.

Single-field and mosaic masters share `make_rgb_display`, selected through
their `display_transfer` argument. `FixedDisplayTransfer` preserves the default
5/Q8 pixels; `WholeMasterZscaleTransfer` fits the common intensity once across
coherent master samples, excluding unknown exterior data while retaining valid
zero/negative scientific samples. The pyramid reuses that RGB master rather
than fitting each crop. Empty/nonfinite support or degenerate automatic
statistics fail explicitly; a fixed transfer can still represent a valid black
field. Each master and saved quality report records the actual transfer recipe,
library version and statistical sample identity. The reviewed brighter M51
trials increase structure and noise together and remain color/encoding
candidates, not adopted image-quality repairs. See the
[shared transfer implementation and readback](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-m51-global-and-shared-transfer-2026-10-02.md)
and its
[independent boundary review](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-shared-transfer-independent-review-2026-10-02.md).

A later [task-only signed-science LOD trial](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-signed-science-lod-and-background-2026-10-03.md)
compares averaging calibrated signed samples before the same fixed display
transfer with the existing encoded-RGB box order. Its common crops conserve
signed means and the fine level is pixel-identical; the coarse encoded
background values are smaller in the observed candidate. This is not a second sky
subtraction, source mask or adopted color/PSF repair. The shared offline owner
now provides explicit `science_mean_pyramid` and
`save_candidate(..., pyramid_kind=SCIENCE_PYRAMID_KIND)` for both single-field
and mosaic producers. It requires matching complete calibrated, sky-subtracted
gri receipts and coherent support, averages signed available samples only,
then maps with the resolved fixed or whole-master transfer without fitting any
crop. Empty crops stay transparent; valid zero/negative means stay available;
alpha records available sample area rather than brightness. Means retain source
nanomaggies/native-pixel semantics, not summed coarse-pixel flux or new calibration.
The distinct candidate version binds science arrays, availability and recipe.
The default encoded RGB path remains unchanged, and the old science-optical-v2
writer explicitly rejects this new order. Actual cached PNG reproduction,
partial semantics and bounded RGB-first mutation are recorded in the
[shared owner development evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-shared-signed-science-pyramid-development-2026-10-03.md).
`publish_verified_candidate(..., pyramid_kind=SCIENCE_PYRAMID_KIND)` now makes
the distinct `science-optical-v3` publication from a pinned admitted legacy
science mother, with optional explicit `FixedDisplayTransfer`. Shared TypeScript
owns version admission and immutable hashing; Python saves exact receipt and PNG
bytes and verifies input/source stability. V3 levels bind science/joint identities
and signed-mean unit/counts, while RGB is reference only. The actual service,
client, progressive Hook and Scene accept v2/v3 without changing default discovery.
The Hook family selector is `sdss-science`; it never replaces the manifest's
version or hash. See [v3 publication and consumer evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-signed-science-publication-and-consumers-2026-10-03.md).
`SdssOpticalImageryService.publishedAssets()` now enumerates existing JPEG offers
and only its explicit science descriptors through the same validated HTTP file
owner. The standard `exportSkyPublicAssets` accepts that optional owner after its
Prepared owner; it exports the exact v2/v3 PNGs with existing SDSS headers/routes,
never receipts/science NPY/metadata or a directory crawl. Ordinary discovery is
unchanged. See [real standard static readback](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-science-standard-static-2026-10-03.md).
Full source/Back/native delivery, independent review and complete image quality
remain open. The writer's
current admitted input verifier supports the existing fixed-transfer mother,
including the original pinned single-field producer's nested receipts and
acquisition identity/URL/bytes. `reuse_frozen_zscale_reference` explicitly admits
an existing resolved whole-master recipe/reference RGB for v3 through
`verify_frozen_zscale_reference`. Original generation and frozen admission share
the raster sample receipt owner. Admission replays the original bounded sample
once to verify stretch, checks actual science/sample/index identities and complete
RGB, then performs zero full-master/LOD fits. Reference bytes and producer evidence
are pinned; no old v2 product can claim the new reference. Actual fixed partial
and complete-joint frozen-zscale publications are recorded in
[partial/frozen development evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-partial-and-frozen-science-publication-2026-10-03.md).
They do not adopt image quality or establish their own full runtime delivery.
Prepared JPEGs cannot be treated as signed calibrated measurements.

`sdss_noise_display_provenance.bind_saved_adaptive_recovery_chain` explicitly binds the executed adaptive-v1, real-halo-v2, saved other-scan supply and current recovery-v2 roles with original science/frozen credit and saved numeric readback. The noise-v1 snapshot is only an input identity role. Historical code bytes are checked at their retained archives; inspector code is separate. This consumes existing results without parsing/projecting/filtering frames or deriving PNGs again. Internal source paths and receipts stay offline; complete image quality, rights/processing review and runtime publication remain unadopted. See [current processing-chain evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-adaptive-recovery-processing-source-chain-2026-10-03.md).

`sdss_frame_quality.py` adds shared cached psField/fpM diagnosis alongside the
corrected-frame adapter. It checks canonical receipt/identity/hash/bytes,
complete bounded gzip/FITS/heaps and aggregate variable-payload expansion.
`check_frame_quality` correlates the actual field/band/native shape and known
PS_ID processing batch; missing header facts remain unknown. PSF reconstruction
uses every signed basis and its own declared orders at explicit native pixel
centres. It preserves relative kernels and actual status, without claiming
measured sharpness or applying a correction. Typed fpM flags follow the actual
enum and inclusive SPAN geometry; unsupported variants fail explicitly. Canonical
objects may extend beyond the native frame: validate the complete original
bbox/npix/order, then intersect with MASKROWS/MASKCOLS as official read_mask
does. Outside source spans remain explicit receipt statistics; no wrap or
science/opacity change is allowed. Actual M82 native flags and escaped-defect
regression are bound in [gri/native-quality evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-m82-gri-and-native-quality-2026-10-04.md). Flux
sampling and four-neighbour flag OR share `sdss_source_stencil.py`, while finite
availability, processing flags and display opacity stay independent. A flagged
sample is not automatically missing or invalid science. These readers change
no source flux, background, coadd weight, RGB or publication. See the
[source-quality owner](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-source-quality-owner-2026-10-02.md)
and [actual single-field M51 diagnosis](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-core-quality-diagnosis-2026-10-02.md).
Other contributing fields and measured-star/spatial accuracy remain separate
quality obligations; a complete input container is not image-quality adoption. Current task-local native star correspondence now distinguishes model interpolation and centroid nuisance from source shape: isolated Photutils ImagePSF/Astropy fits reuse original signed samples, never apply a fitted plane/center to science. Remaining bright-core residuals and unverified central/extended/coadded target PSF keep full matching and quality unadopted. New native image candidates in the catalog-empty fields provide actual material, but include extended/blended structure and bounded-center failures. Field3716/117 does not cover the M51 centre in the actual native WCS. Native models must be distinguished from their actual resampling/coadd response before any matching; candidate counts or convergence do not certify stars. See [new native material](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-native-compact-center-material-2026-10-03.md). Reuse these outputs before any new material trial; do not repeat unchanged local fits. See [measured native model evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-measured-native-psf-support-2026-10-03.md).

The current real colour/width diagnosis distinguishes display rectification from
a physical sky offset: a signed zero-mean control made from an existing local
patch still has a positive, red-biased encoded floor. Its channel permutations
remain exact; no channel gain or second sky subtraction is justified by that
fact. Previously inspected r-only compact peaks also need their own g/i flags
before they can support a multiband PSF or colour decision. A single task-only
Gaussian colour trial was rejected for ordinary use: exact preservation of the
encoded maximum channel did not preserve colour edges, and one exterior region
had worse blue/green scatter and unresolved colour fallback. It does not change
the signed-science/v3 recipe. See [actual diagnosis and rejected trial](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-science-colour-width-and-chroma-trial-2026-10-03.md).

`sdss_frame_noise.py` supplies native-pixel statistical noise from the admitted
frame's retained read-only CALIB/SKY metadata and an exact, byte-bound cached
Field gain/darkVariance row. Unsupported SKY extrapolation, bad calibration and
invalid variance remain unavailable, distinct from finite black/negative data.
The old frame receipt and publication contracts stay unchanged. Bilinear
variance needs squared coefficients; adjacent target samples reuse native
pixels, and same-run overlaps cannot be counted as independent exposures.
This model does not supply full coadd covariance, inverse-variance weights or
quality adoption. See [actual native noise and correlation evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-science-native-noise-2026-10-03.md).

The earlier fixed task-only common gri bilateral display trial used pairwise resampling
variance with shared-native covariance. fpM NOTCHECKED is object-detection
status, not absent science or an automatic processing rejection; recorded
SUBTRACTED does not authorize model restoration, alpha or weight changes.
INTERP/SATUR/GHOST/CR and unavailable model support keep original measurements
in this candidate. Local colour-grain improvement is not whole-field quality,
post-filter confidence or a default publication decision. Actual cross-field observation identity and conditional noise bounds need
explicit handling in mixed coadds. Repeated same-run CCD samples are not
independent exposures, and field-specific calibrated variance estimates need
not be identical. A real mixed-area trial combines within-field shared-native
difference variances with a Cauchy upper across unknown field covariance. This
is conditional on those marginal models, excludes omitted sky/systematic
uncertainty, and does not certify confidence or ordinary adoption. See [shared
observation and actual mixed display](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-science-shared-observation-and-mixed-display-2026-10-03.md). See [actual trial and qualification repair](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-science-noise-bilateral-2026-10-03.md).

`sdss_noise_display.py` now owns the explicit offline common-gri display
candidate for single/mosaic/partial sources. The earlier local/mixed scripts use
its same pair-variance, Cauchy-upper and filtering responsibilities. Admission
binds actual frame receipts, camera/PS_ID, fpM identity, positive contributors,
projected samples and original coadd values. Unknown/rejected processing keeps
original values; zero contributions are neutral. A fixed single pass consumes
real halo chunks, and cancellation returns no partial candidate. Science
availability and area alpha remain separate from processability.

`coherent_box_means` is the shared numerical mean/count owner; scientific and
display-estimate consumers retain different meanings. Candidate arrays are
display-only estimates in source units, not new measurements, photometry or
surface brightness. `noise_display_pyramid` uses the original frozen transfer
with no fit and original coherent area alpha; `save_noise_display_candidate`
writes an exclusive versioned candidate directory, never the old publisher or
default registry. Complete cached-master output and old v3 PNG compatibility
were checked. Full colour/background/weak structure/registration, processing
provenance publication, batch cost and independent review remain open. Current
candidate receipts do not replace a complete adopted publication contract.
See [shared candidate and actual full output](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-shared-noise-display-development-2026-10-03.md).

`sdss_noise_display_provenance.py` is its offline downstream source consumer.
It snapshots actual native/frame receipts, CALIB/SKY, byte-bound CAS parameters,
fpM flags/processing identity, projected data/weights, original master identity,
model limits, code and library versions. Missing model facts stay null. Caller
supplied external pins and current-input comparison protect the processing
snapshot; saved arrays/fallback and exact derived PNGs are bound without
filtering or fitting again. Same geometry/bytes cannot relabel the object:
candidate reference/center/orientation must match the actual master. The
versioned development source-chain is not rights/quality admission or an
adopted runtime publication; historical reconstruction explicitly retains the
original pinned execution inputs/code and its limited meaning. Full receipts
are offline material, not a mobile source-route payload. See [actual processing
source chain and identity regression](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-noise-display-provenance-2026-10-03.md).

Current quality research rejects applying a tone-only sRGB-shaped curve to
Lupton output: the actual saved overview gains dark grain, and physical linear
sRGB input is not established. Measured catalogue centers/colours now have
bounded asTrans/current-image comparison, but catalogue and frames share their
upstream solution. Empty central-field query results remain unavailable input,
not physical zero or automatic frame rejection. Keep scientific values and the
original linear WCS; no blind shift, repeated sky subtraction, saturation repair
from encoded255, or diffuse per-pixel DCR follows. Full colour/background, weak
structure, registration and source qualification remain open. See [tone
assessment](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-mature-display-and-tone-2026-10-03.md) and [actual measured-star
comparison](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-measured-star-registration-2026-10-03.md).

The explicit `sdss_display_recovery.py` offline owner can replace known flagged display samples only with a temporally disjoint other RUN whose positive original-weight contributors have coherent gri, actual native sampling, processing flags and camera/SKY qualification. Same-run duplicated fields, unknown dates/qualification, all-masked or absent alternatives retain the old display; source science/availability/weights and valid black/negative meanings remain unchanged. It does not claim PSF, temporal or independent-systematics equivalence. Numerical level derivation is shared with the old noise owner while admission/version/measurement meaning remain distinct. Actual cached-master recovery admitted13,323 samples;53 flags-clean candidates lacked native SKY interpolation qualification and stayed original. Saved three-level derivation/alpha and old noise PNG compatibility hold; new code hashes do not rewrite historical noise execution provenance. Current recovery snapshots bind the old filter parent separately from new execution. Known-bad scan flags require an actual matching processing ID; unknown identity cannot authorize recovery. Export retains the candidate frozen recipe. A subsequent two-guard closeout separately binds current code,18 actual identities and exact unchanged saved products without rerunning recovery/filtering. The recovery owner now reuses that externally pinned, saved supply on the current adaptive-real-halo parent: actual native/model/epoch/flags/projected/geometry inputs must match canonically, only currently unqualified centers can change, and all other latest parent values remain exact. Persisted tuple/list false rejection was reproduced and repaired through the existing canonical JSON responsibility. Explicit rebase v2 keeps baseline diagnostic and original supply execution lineage distinct; the old producer remains readable. Actual13323 alternatives,53 retained native qualification gaps and numeric three-LOD/alpha readback hold without projection/filter reruns. Saved supply counts and original execution implementation remain historical facts. Full quality/source publication/independent review and ordinary adoption are still open. See [current parent recovery](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-adaptive-saved-flag-recovery-2026-10-03.md). Different-run overlap covers only5.6281% of this master and does not certify full-image background/weak structure. Ordinary adoption, full source-rights/credit, publication and independent review remain open. See [actual cross-run and saved recovery](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-cross-run-flag-display-recovery-2026-10-03.md).

A full-master bright-SAT qualification now finds60 actual saturated samples above the frozen Astropy intensity upper, beyond the earlier four local samples. Complete SAT-region touching-border qualification supports a task-only58-sample neighbour-colour display trial; low-brightness trails and unqualified cores retain the parent. Original science, alpha and frozen recipe remain unchanged; the resulting display estimates are not photometry or actual core colour. Initial bright-only region connectivity did not establish complete SAT outer borders and is superseded explicitly, not a no-supply conclusion. Saved signed-means/RGB level derivation is exact, but actual green halos, warm background and fine grain remain. No shared production owner or ordinary adoption follows; do not broaden the bright-core rule to low-brightness/no-SAT defects. See [actual full-SAT qualification and local trial](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-bright-sat-colour-2026-10-03.md).

Use the existing pinned offline requirements and cached inputs; these owners
perform no runtime source request. Each new generation binds source receipts,
source code, arrays and images and refuses to overwrite prior trial output.
New published pixels need reviewed quality/encoding, their own geometry,
processing and immutable contract, preserved old offers, and actual painted
source attribution before switching consumers. See the task
[complete-input evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-complete-inputs-2026-10-02.md)
and [single-field independent review](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-gri-tan-independent-review-2026-10-02.md).


`publish_sdss_science.py` packages an opt-in science optical publication from an
already admitted cached candidate. Supply the exact candidate and binding
SHA256 pins, a fresh output directory, publication ID and legacy source manifest
through its CLI arguments. It verifies scientific/joint/RGB NPY identities and
source receipts, reproduces the fixed full-master RGB once, and checks the
existing complete availability PNG pyramid and exact TAN crops. The current
cached writer supports fixed transfer only; shared zscale capability remains a
separate variant requiring a supported writer path. It does not read FITS,
reproject, fetch sources, refit crops or alter old assets. Output locators are
contained before writing and prior/failed generations cannot be overwritten.

The local `pack_sdss_science_publication.mts` receives its JSON on stdin and uses
`miniapp-contracts/src/sdss-science-optical-publication.ts` as the single canonical
publication/hash and admission owner. All science/receipt/RGB/coverage/crop/PNG
identities belong to `science-optical-v2`; transport hash/download URLs are
excluded from canonical content. Full receipt/NPY identities are offline
provenance, not extra miniapp downloads. This does not change the v1 JPEG default
or register the new candidate. See the [actual writer and independent closure](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-science-publication-development-closure-2026-10-02.md).

## Prepared observation RGB sources

`prepared_rgb_observation.py` admits a caller-bound local JPEG and its exact
embedded AVM/XMP packet. Source identity, complete credit, source and policy URLs,
rights and colour meaning are explicit caller facts; admission does not approve
a new source or satisfy visible attribution. It fully decodes a bounded RGB
image, rejects unsupported orientation/truncation and retains immutable RGB
bytes. The exercised geometry is PyAVM 0.9.9 ICRS/J2000 TAN with declared scale
and rotation. Other frames, missing geometry, CD-matrix/full-header variants and
silent scale-parity corrections are rejected. PyAVM's original resize convention
and the publisher's approximate-position warning are preserved. Fresh WCS objects
are rebuilt from immutable numeric parameters, rather than serialized FITS cards.

The known empty optional `Spectral.Notes` and `Spatial.Notes` forms are structurally validated and
removed by its original XML byte span. All other packet bytes and populated
notes remain unchanged; XML namespace-registration history cannot change the
parser input identity. Raw and parser packets remain distinct processing facts.
There is no generic metadata repair or astrometric correction.

`sdss_source_stencil.bilinear_source_samples` owns shared four-neighbour
interpolation. It gathers only queried neighbours before converting values, so
small/chunked uint8 colour queries do not copy the full image to floating point.
`sdss_gri_tan.bilinear_samples` retains the existing scientific float-only API
and overflow error. Full-neighbour geometry, all-four-finite availability,
valid zero/negative science, encoded RGB and display alpha remain separate.
Prepared-image queries use zero-origin FITS coordinates and the actual JPEG row
inversion; outputs retain **UNKNOWN** scientific availability.

`prepared_rgb_tan.build_prepared_rgb_tan_master` consumes that admitted source,
uses bounded chunks and shared four-neighbour sampling, and freezes one 2048²
north-up TAN RGBA master. Binary geometric support and valid black remain
separate from UNKNOWN science. `prepared_rgb_tan_products` reuses its centred
2048/1024/512 crops and integer premultiplied box 4/2/1 to produce three 512²
PNGs. Cached-master admission rejects nonbinary alpha, hidden RGB outside support
and false support/black counts. Alpha describes discrete source-cell geometric
area, not calibrated availability, physical alignment or continuous footprint.

`publish_prepared_optical.verify_cached_prepared_generation` requires caller
pins for the actual result/before/after receipts and binds saved executed owners,
original source facts, complete master/PNG bytes and metadata. Hash and parsing
consume the same bounded buffer; NPY header/shape/dtype/payload checks precede
allocation. `publish_verified_prepared_generation` writes an exclusive output
through the shared TypeScript `prepared-optical-v1` contract and canonical hash.
Raw RGBA and NPY container identities are distinct. Exact source credit, CC BY
4.0/source/policy URLs, published colour meaning, original nominal AVM/resize and
approximate-position warning, geometry/recipe and UNKNOWN science are immutable.
CLI pins are `--generation`, `--result-sha256`, `--before-sha256`, `--after-sha256`,
`--output` and `--publication-id`; the documented cached task generations retain
their executed inputs and do not require another source download/reprojection.

Processed prepared sRGB uses a separate `prepared-display-optical-v1` contract.
It embeds the complete unmodified v1 parent and hash, retains its source/AVM and
UNKNOWN science, and records actual ICC, background/mask/execution identities,
fixed Photutils parameters, negative display clipping and unchanged geometry.
The exclusion footprint has its own full credit and role; none of its RGB is
mixed in and it does not establish a complete faint-structure or science mask.
`publish_prepared_display` verifies the full saved formula/alpha and all three
PNGs without another JPEG RGB decode, projection or background fit. NPZ member
size and fixed NPY shape/dtype/order are bounded before allocation. Both producers
reuse `prepared_optical_levels` and the exclusive Prepared publication boundary;
the raw v1 assertion/packer still reject processed display. Existing HTTP,
resource/cache/lease, adjacent-level Hook, frame/TAN/Scene and painted-source
consumers dispatch the explicit image version. Ordinary registry stays empty.
The real M82 local publication and actual page/SourceBack development evidence
do not adopt quality, native/WXML/device behavior or total resource capacity;
new display/shared extraction independent review remains missing. See
[processed identity and actual page](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-prepared-display-identity-2026-10-04.md).

Prepared historical B/V/H-alpha+[NII]/I RGB does not meet the calibrated SDSS
gri/nanomaggies contract. The opt-in server/client transport consumes only the
manifest and three PNGs through its own version/hash; the registry is empty by
default. Shared progressive Hook/frame/TAN/explicit Scene consumers preserve
source-family identity and actual ready/coarse fields. Geometric coverage remains
separate from scientific UNKNOWN; unavailable contribution observation cannot
establish completed credit. Software-GPU pixels and independent full-byte readback
confirm fine-level effect and coarse survival, while the overview photo rectangle/
background seam remains a failed adoption condition. Ordinary/default adoption
requires common finite-edge/background presentation, justified observation
resources and associated complete visible credit. Rectangular
source bounds/background, colour/PSF, full-image/native quality and adoption
remain open. See [TAN/publication development and independent evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-prepared-optical-publication-development-2026-10-03.md)
and [transport/cache evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-prepared-optical-transport-development-2026-10-03.md), plus
[exact information/manifest-link/recovery](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-prepared-optical-information-development-2026-10-03.md).
Registered family ownership is not admission/adoption; source-page provenance
props cannot certify complete attribution associated with the rendered image.

Use the pinned offline requirements and existing cached sources; the owner does
not fetch images. PyAVM and its included BSD notices are retained in
[third-party/PyAVM-LICENSE.txt](third-party/PyAVM-LICENSE.txt). See the
[actual source-adapter development](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-prepared-rgb-observation-source-adapter-2026-10-03.md)
and [independent review](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-prepared-rgb-observation-independent-review-2026-10-03.md).

SDSS source metadata now discloses i/r/g→red/green/blue as processed survey-band colour, not naked-eye natural colour. Colour alone does not establish noise, artefacts or missing observations; official mean imager response does not identify a particular green feature or supply current CCD calibration/line flux. Current controller and controlled Provenance text readback cover six legacy and two sealed explicit science publications. This source-copy change leaves images, frozen recipes and ordinary adoption unchanged, and does not close background, weak-structure, suspected halo, registration or native acceptance. See [source meaning and current consumers](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-source-colour-semantics-2026-10-03.md).

Offline cost accounting keeps original inputs, processing tools, science/diagnostic work arrays, unadopted display candidates and sealed publications separate. The existing moon cache also contains a local venv; a cache directory is not automatically raw image storage or a production dependency. Selected current retained paths now have Windows file identity/AllocationSize readback, with role refinement of the saved inventory; this neither republishes sources nor supplies cloud headroom/reclaimability. See [offline-chain allocation scope](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-offline-sky-chain-allocation-2026-10-03.md).

Shared `sdss_noise_aperture.py` now aggregates repeated native coefficients before squaring for uniform linear aperture means, then reuses conditional Cauchy field bounds. Actual three-region/fifteen-aperture stencils and a separate dense covariance readback demonstrate that target-pixel independence can overstate the conditional mean/noise ratio. It is neither a median/nonlinear-filter variance nor calibrated detection, full uncertainty, new smoothing image or ordinary adoption. Common multi-scale display still needs source-support/fallback, bright-feature cross-talk/selection-bias, lifecycle/cost and whole-image quality checks. See [actual aperture qualification](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-aperture-noise-2026-10-03.md).

`sdss_adaptive_display.py` now provides bounded common-aperture display regions from original signed coadd samples. A sign-neutral conditional ratio gate keeps strong structure in any band unchanged across all bands and excludes it from weak apertures; unknown/flagged support and cancellation preserve recovery semantics. Fixed tested radii/ratio are candidate policy, not calibrated detection or quality acceptance. Four actual local outputs show quieter peripheral grain but unchanged warm/flagged structure, with saved-support means and frozen RGB readback. Equivalent bounded native-ID batch grouping now retains the original policy/support and actual saved local outputs. Direct group reductions repair an observed tiny-coefficient cancellation defect; the actual outer kernel is0.495s versus2.003s scalar. The complete original-coadd candidate now shares source/flags/coadd projection admission with the fixed-display owner, uses real eight-pixel chunk halos, and binds diagnostics/object/source in exclusive saved output. Actual full numeric LOD readback passes; whole kernel861.55s and Windows Python peak1,118,216,192B are offline measurements only. Peripheral grain improves but the original outer halo shows a grain transition, while central DETAIL is unchanged; complete quality/adoption and independent review remain open. Actual frame-supported exterior windows now share native sampling/physical-CCD-edge weights with the old reprojection/mosaic owners. Perimeter-only v2 refinement preserves the cached interior, original science and alpha; a single-partial independent-band regression was reproduced and repaired. Four real windows update65280 targets without whole filtering; actual saved LOD readback and nine local consumers agree. The forced outer-halo grain transition is repaired where source/model support is qualified; true unknown gaps remain original. See [real halo evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-real-halo-perimeter-refinement-2026-10-03.md). Full quality/independent review and ordinary adoption remain open. See [whole candidate evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-shared-adaptive-display-2026-10-03.md). Local timing is not full-chain capacity. See [batch arithmetic evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-adaptive-batch-display-2026-10-03.md). No new full image/publication/default adoption. See [current local path](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-sdss-adaptive-local-display-2026-10-03.md).

The shared source/coadd/frozen signed-science LOD responsibilities also have an actual complete M82 consumer. All eighteen source processing associations match; native conditional noise/flags remain separate from science/area alpha. The first saved 2048-square science master and three PNG levels are retained for subsequent display processing, never regenerated to repeat a closed matrix. Actual central INTERP and no independent-RUN alternative remain original; declared source TAN/asTrans diagnostics do not supply absolute astrometry. This improves detail over the legacy JPEG plateau while full warm-background/grain/registration/PSF/quality and ordinary adoption remain open. See [M82 shared consumer](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-m82-first-science-master-2026-10-04.md).

The saved complete M82 adaptive/real-halo parent now has a real current other-scan recovery consumer. Whole-RUN positive contributions/native SKY-noise/associated flags and disjoint MJD ranges admit 13,096 centres; 42 merely flag-clean possibilities remain original. Typed adaptive admission and a separate current-v3 processing contract retain the actual parent/diagnostic identities without fabricating an old fixed-noise or saved-supply execution; old fixed-noise/saved-rebase consumers remain compatible. Full fallback/science/alpha/WCS/frozen numeric LOD checks pass, but actual grain stripes/warm/detail grain keep full quality unpassed. Saved interior roles attribute 39,876 qualified-but-unprocessed centres to blocked radius1 neighbours; raw alternate means alone do not supply new aperture native IDs/covariance. Subsequent work must use real source support and bounded increments rather than refiltering the saved whole image or treating filtered estimates as independent measurements. Ordinary adoption and the full processing/source publication chain remain open. See [M82 current recovery and aperture boundaries](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-m82-current-adaptive-recovery-2026-10-04.md).

M82 recovered-source aperture prerequisites now have bounded actual-source evidence. The raw display sampling view uses original science or admitted raw alternatives with real target-dependent RUN coefficients, native IDs and calibrated SKY/camera variance. Original coadd coefficients fail all 1,241 recovered samples in the two supplied patches; already-filtered parent estimates cannot become new raw measurements. Actual source qualification and positive conditional variance provide 302/504 newly complete weak radius1 centres; other windows retain absent supply. Ten original-frame native-address/coefficient/model and full same-ID covariance-matrix readbacks pass; naive independent target variance is lower by factors 1.656–2.028. Cross-field uncertainty remains Cauchy bounded with omitted terms unclaimed. This is task-only evidence: no production owner changes, filtering, new RGB/candidate or quality adoption. Incremental production support must share existing recovery/source/aperture ownership, preserve true unchanged values and avoid whole refiltering. See [actual recovered native apertures](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-m82-recovered-native-apertures-2026-10-04.md).

The existing `sdss_display_recovery` owner shares actual RUN/MJD/positive contributor flags/native qualification, cohort selection and raw effective coefficients across cached and real-halo samples. `refine_current_recovery_real_halo` reuses the same four-window geometry and targeted common-aperture policy as the existing consumers, binds the saved interior parent, and exports a distinct full candidate version. It changes only actual affected perimeter estimates/diagnostics; saved interior, original strong targets, truly unaffected current values and scientific coverage/frozen display recipe stay exact. Actual M82 complete raw means, native stopping witnesses and all three exported levels read back; the medium/detail PNGs remain byte-identical to the interior candidate. This is an offline candidate: warm background/fine grain quality still fails, measured stellar band registration/PSF and full rights/publication/adoption remain open. Ordinary Prepared stays empty. See [complete real-halo candidate](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-m82-recovered-complete-2026-10-04.md). Actual M82 stellar/native PSF diagnostics now reuse the current `PsfField.reconstruct` entry and cached Photutils ImagePSF/Astropy tools: all detections are retained, original native data/variance/coefficients and saved models read back. Catalog supply is absent in the central field, which retains PHOTO_STATUS3 catalogue-reduction risk; off-center relative fits do not validate central/absolute or projected/coadded target PSF. See [actual M82 star diagnostics](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-m82-measured-stars-2026-10-04.md). The catalogue-empty central field now also has actual native compact-candidate diagnostics from cached DAOStarFinder/conditional RMS/full detector support, retaining every target cut and reciprocal band association. Nonpositive/bound-centre fits and extended/neighbour residuals remain unqualified; these candidates are not confirmed stars or validated target/adaptive PSF. See [central native evidence](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-m82-central-native-2026-10-04.md).

The saved M82 target-profile consumer fits a descriptive unit amplitude and affine nuisance plane in both science and current spaces. Current nuisance terms pass through actual saved CSR aperture/strong exclusion; no independent-target noise, chi-square, calibrated flux or global PSF inference is introduced. Cached native fit residuals/statuses are retained without refitting. Actual catalogue and central provisional candidate residuals differ: extended/neighbour structures remain unmodelled, so no global matching kernel/shift or extra sky subtraction is justified. Science/candidates/ordinary adoption remain unchanged; unresolved stripes/background must be traced through native, science, display and frozen LOD consumers before repair. See [actual target profiles](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-m82-target-profile-2026-10-04.md).

The M82 recorded-display diagnostic now consumes actual recovery source cohorts, native IDs/effective coefficients, source qualification/strong exclusion and saved aperture branches. Saved science responses are reused with only necessary bounded outside model support; original current means and model arithmetic read back exactly. Common signed scales separate final f32 rounding from real conditional aperture/source changes; unknown remains unknown. These are fixed-condition relative unit responses, not nonlinear adaptive/global PSF, branch derivatives, empirical PSF adequacy or quality adoption. Subsequent target-profile residuals must preserve repeated-native coefficient/noise meaning. Production, candidates, ordinary registry and full publication status remain unchanged. See [recorded M82 display response](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-m82-fixed-display-response-2026-10-04.md).

The native-unit PSF diagnostic now shares one task helper across the M82 actual response consumer and both historical M51 runners; it reuses cached Photutils ImagePSF and the existing science sampler without adding a production dependency. Actual M82 source WCS, finite signed kernels, integer native sampling and common geometric coadd weights are verified; positive-weight unavailable model support stays unknown. This linear science response does not describe the adaptive/recovered display: its raw source cohorts, selected common aperture and saved branch conditions must be consumed explicitly. No global kernel or flux-conserving interpolation is implied, and the ordinary registry/quality/publication status stays open. See [actual M82 target response](../../.codex/work-items/cloud-sky-native-2026-09-22/evidence/experience-m82-target-response-2026-10-04.md).
