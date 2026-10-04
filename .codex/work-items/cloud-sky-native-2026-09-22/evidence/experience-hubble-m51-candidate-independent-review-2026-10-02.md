# Hubble M51 candidate: independent rights, metadata and nominal projection review

The acquired **heic0506a** candidate passes this bounded source/metadata/nominal-raster review. Commercial image reuse is supported by its specific ESA/Hubble CC BY 4.0 declaration; actual runtime attribution and accurate cross-source registration remain undelivered. Source scientific coverage, original measurement validity, image-quality adoption, publication and native acceptance remain **unknown/unadopted**. This review acquired no image, changed no production owner or old asset and applied no correction.

## Actual identity and rights

Read the actual cached origin [image page](https://esahubble.org/images/heic0506a/), its linked [specific namespace copyright policy](https://esahubble.org/copyright/), and embedded XMP. The page directly links the exact acquired Publication JPEG URL. All three original receipts show HTTP200, exact final canonical URLs, no redirect/retry; the executed acquisition source uses verified TLS. JPEG SHA256 is `7b13a932bcf54653c591d369e8d1c4cbdbeb693ecc468242facb239fde52e4c2`, 4,060,187 bytes, 4000×2776 RGB. Independent decode SHA256 `e9720f3cfcd75966deb94060b6a0711b295e094ae03c76ec1d58633a343b1710` matches; JPEG embedded XMP equals the cached XML byte for byte.

The page has no image-specific exception; XMP UsageTerms also declares CC BY 4.0. The [license](https://creativecommons.org/licenses/by/4.0/legalcode.en) permits commercial copying, adaptation and sharing, including self-hosted image distribution/display. Retain attribution and supplied notices, source/license links and modification indication; do not impose downstream restrictions on the licensed material or suggest endorsement. This does not require licensing Starward's independent engine under CC. ESA/Hubble's policy requires full, readable, unaltered credit associated with the image; its Q&A rejects hidden/disassociated credits and shortening names. Future runtime cannot count a hidden source route alone as compliance. The complete credit is:

> NASA, ESA, S. Beckwith (STScI), and The Hubble Heritage Team (STScI/AURA)

The actual observation has no identifiable person or logo artwork, but namespace logo permission is expressly separate; website code, music and papers are not covered by this image permission. No such material is adopted. This **specific ESA/Hubble image** license does not reopen the existing ESA Gaia archive or ESA all-sky Milky Way exclusions, whose distinct terms remain recorded in `project_context/external-capabilities.md`.

The isolated PyAVM0.9.9 wheel is `8bba0ee9645a8a9f215af9ceea67b494a6ee1fe380cebdc00ba99d781539ad76`. Its actual complete LICENSE (SHA `944081c839a528d7f23fda837bb0f6501b99289d8bee35189ad4e87fe00f3255`) includes MIT and adapted ESA/ESO BSD3 notices, permitting this use with notice/disclaimer retention and no endorsement. There is no production dependency/global install; image credit and software-license delivery are separate obligations.

## Metadata, axes and actual mathematical check

The published historical ACS composite uses B 435nm, V 555nm, H-alpha+[NII] 658nm and I 814nm. XMP labels I infrared and the other three optical. Its prepared colour is not SDSS gri, calibrated flux/radiance, present sky or naked-eye appearance. JPEG integer RGB and complete rectangular geometry do not establish a scientific mask, exposure completeness or physical saturation status.

Actual AVM1.1 declares ICRS/J2000 TAN, original reference dimensions 11477×7965, reference pixel [5739.5,3983.5], reference sky [202.468074158,47.213174399] degrees, scale [−1.38852130116e−5,+1.38852130116e−5] degrees/pixel and rotation −91.908150788°. Its populated Spatial.Notes explicitly warns of a roughly **5 arcsec** overlay discrepancy because coordinates were based on Simbad. Spatial.Quality=Full describes available coordinate metadata, not a tested astrometric or image-quality pass.

The raw mature parser genuinely fails on an empty optional Spectral.Notes RDF entry (`TypeError`); independent parsing removed only that proved-empty element in memory, preserved populated Spatial.Notes and left original JPEG/XML untouched. The root task does the same bounded normalization into a new derived XML.

[AVM1.1](https://www.virtualastronomy.org/avm_1.1_final_draft.pdf), sections 6.1–6.3, maps CRPIX to FITS reference pixels and explicitly prescribes multiplying reference pixels by the resize ratio and dividing scale by it. Small x/y ratio rounding differences are anticipated. [AVM1.2's clarification](https://www.astropix.org/vamp/AVM_DRAFTVersion1.2_rlh02.pdf) explicitly identifies the bottom-left pixel as (1,1). PyAVM's target_shape=(width,height) and common x ratio follow that nominal convention. Generic centre-preserving resize formulas are not grounds to silently change this AVM solution.

Measured JPEG x/y ratios are 0.3485231332229677 / 0.3485247959824231, relative difference 4.77e−6. The x-versus-y ratio reference-pixel difference is <0.00955 pixel. The mature rescaled CRPIX is [2000.3485231332231,1388.3419011936917], CDELT [−3.98401474335333e−5,+3.98401474335333e−5]. JPEG top-first row must be converted to FITS y=2775−row. Positive JPEG column points approximately north; north is right of vertical, consistent with the actual source page compass. Negative parity and rotation are preserved.

Independent explicit CROTA→CD and inverse TAN equations, without calling a WCS transform for the oracle, agree with the mature output on a 13×9 JPEG grid to **2.84e−14 degrees**. That only validates the declared mathematical conversion. JPEG sampling is 0.143424531 arcsec/pixel; 5 arcsec is about **34.86 JPEG pixels or 12.50 SDSS master pixels**, much larger than the tiny resize rounding difference. Nominal dimensions are about 9.56×6.64 arcmin.

All **11** prior independently viewed SDSS compact peaks are outside this nominal JPEG bilinear rectangle. Their exact projected coordinates are saved in the metadata review. They cannot be reused as HST matching ties; fresh dispersed foreground candidates within HST coverage are required, with source flags and real ROI inspection. Relative agreement with SDSS primary TAN would still not certify absolute astrometry.

## Actual mother and three-tier output

Independent reconstruction uses direct target TAN inverse, source TAN forward, explicit CD inversion, top-first JPEG samples and the fixed four target-pixel quadrature points. It calls neither PyAVM/WCSLIB transforms nor the shared bilinear owner. The **entire 2048² RGBA mother matches byte for byte**, C-order SHA256 `2c9790bb218556a3e2474a4101e0dad4a389c7d45c1ff441210df0678a3694a9`: zero different pixels, zero maximum byte error. The geometric support is independently 1,425,463 / 4,194,304 pixels. Unknown source science remains unknown.

Independent valid-count colour means and area-alpha reconstruction from the actual frozen mother reproduce all three decoded PNGs exactly:

| tier | source geometric crop support | PNG bytes | opaque/partial/zero output alpha |
|---|---|---|---|
|OVERVIEW|1,425,463 / 4,194,304|181,742|88,625 / 934 / 172,585|
|MEDIUM|1,014,375 / 1,048,576|529,695|253,400 / 387 / 8,357|
|DETAIL|262,144 / 262,144|603,802|262,144 / 0 / 0|

Root script creates one RGB display mother before all three fixed crops; there is no per-tier refit, new colour transfer, sharpening, sky subtraction or calibrated source mixing. Alpha means all four nominal subpixel image stencils are available and their later area fraction; it is **image geometry**, not finite/joint science availability. Outside alpha is outside this acquired JPEG sampling rectangle, not a proved missing celestial measurement. This semantic distinction must survive any later consumer/publication contract.

Actually viewed original JPEG plus nominal OVERVIEW/DETAIL: detailed spiral/companion structure is visible, and overview has a visible finite source rectangle/limited field. The view does not establish background blending, field-wide alignment, complete galaxy-wing coverage, daytime composition, source attribution UI or target-native quality. Only about 34% of overview mother geometry is covered by this observation.

## Immutable evidence and remaining scope

- Original acquired source result: `output/hubble-m51-source-quality-trial-1002-r1/result.json`, SHA `2497653ac6946c0b21e77a71539ca8d75cc7c0332de523a41b91e451d01335c9`; binding `71278a1caa481251d05d6bf9f6e3ddfd8cfdc91b89715f97d0a6468551dc5a54`.
- Root nominal projection result: `output/hubble-m51-nominal-projection-trial-1002-r1/result.json`, SHA `a209ac6e4c10aebfaa5bb2447e20c1682836046dff1a21cacc8969003f2b7994`; binding `249b8bf0a5718548d54ca8e17577575c9a124fc0ef120e29ac150906aad0d8cc`. Executed task SHA `f2d190d3dad33cb81595dcd92796c8bc60fc60b1072f3d5d39466584b10530f3`.
- Independent metadata review: `output/hubble-m51-metadata-independent-1002-r1/review.json`, SHA `3a4860d77836c75f9550b86fc11ac7b01d571d1443430d857772dcddeac16756`; binding `b75654d979183b119456eb8cb61d23dfd566cb3eab8e626847759fcdc022db9b`. Executed independent script SHA `afad0e74d5a8a9d7b61a5581ca7a866c64120c55e887c7da4780402a2cc8dfa4`.
- Independent complete raster review: `output/hubble-m51-projection-independent-1002-r1/review.json`, SHA `a9ed2be000ee7dabeab87ab2b0ff4f6be8d0c35e1cc32e0719ba2988491699d8`; binding `53755540ff6232be7b44e2689a64d6b92383ce98f19bfa4f500baa1f0b174762`. Executed independent script SHA `f6c2d8be543532a0026fbdef98916c14f224974d53227b71d89573336e83b6b1`.

Both new independent outputs preserve all referenced old source/projection bytes, all 201 published deep-sky assets and the six retained edits. The metadata review also preserves the exact isolated PyAVM generation. No new image request, production code edit, image correction, asset replacement, publication or native test occurs. Subsequent bounded multi-point registration is a separate task generation; this review does not pre-approve its transform or turn encoded image geometry into science validity.
