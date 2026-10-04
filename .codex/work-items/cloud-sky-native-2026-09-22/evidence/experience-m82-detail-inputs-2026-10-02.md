# M82 DETAIL source inputs, 2026-10-02

The original six-tile DETAIL demand is now available as checked cached scientific arrays. This closes the missing-input prerequisite for fresh DETAIL sampling; it does not yet establish a new mask, repaired dark region, image product, publication or image-quality acceptance. The original overview/medium plans still lack nine inputs.

The actual acquisition receipt is [acquisition.json](../../../../output/allwise-w3-m82-detail-acquisition-1002-r1/acquisition.json), SHA256 `3d3a0eb50571ffc7e9c4a0ac5866fe11067dedc3a9e0086fe09a1df2833ba229`. Its script is [the bounded acquisition](../scripts/experience-m82-detail-acquisition-2026-10-02.py), SHA256 `5d25ce97cdde5b0f923dd0be4479fd58f45d37ed94221a8b5df497d96b3e2c5f`. Each of the three genuinely missing tiles received one canonical IRSA request with verified TLS, no redirects or automatic retries, bounded time and response bytes. All three returned HTTP 200 and a complete 512×512 float32 scientific array. Their 2,624 missing end-padding bytes retain the actual reader warning; complete array admission is distinct from scientific/detector quality.

| Norder8 tile | Input | Bytes | SHA256 | Nonfinite source scalars |
| --- | --- | ---: | --- | ---: |
| 121705 | Original cached input reused | 1,051,456 | `2ad25c13e886f1a615953db47dd3d9bd033ae6b42c67ad00298dbbc44fa17aaf` | 0 |
| 121707 | Original cached input reused | 1,051,456 | `9e121e7d6d312503107cfa58332091cacf181c8ac93ae94f49217ad984ed0a14` | 24 |
| 121708 | Original cached input reused | 1,051,456 | `f3dc5d59976f2a179394dfa83354854f4d404b15bd02b06b5fc81373de018f40` | 0 |
| 121710 | New bounded acquisition | 1,051,456 | `fa8ecd49a64be2642397d03ca513182402a7987a333a82d117518881617de276` | 0 |
| 121793 | New bounded acquisition | 1,051,456 | `65279bf677d34c211aa2f4c2a0413f6a17cd8aec163ddd2a17ddfb7c7b99949a` | 0 |
| 121796 | New bounded acquisition | 1,051,456 | `709be8352c3da931b10b30f5344054dc5dbeee14b6eabca2a7b47b456e806f88` | 0 |

All six checked inputs total 6,308,736 bytes; new source acquisition is 3,154,368 bytes. These are offline source bytes, not phone downloads, server egress or a 200 DAU capacity measurement. The original `m82-tile.fits` is the exact 121707 alias and supplies no additional tile.

The original DETAIL plan remains SHA256 `78542d5c2b46517a893113e2ebbe3ee72419511e60ddc8baf733c17432a4332e`: ICRS north-up/east-left 512×512 TAN, 0.25° field, source order8 and CRPIX256.0. Its actually recomputed world/lookup identities are `2d6981c26f566bc56ac0ba926ab880146486a25bc18deb138d512af2755e806c` / `b0e379afaba5c36f747f4b30497503712a476f9741e3ec065fd28e2573889d4e`. Existing properties are reused unchanged, SHA256 `eddbd837ee09ded51a44dbebfbcb58b86869353acb022aa6376a6c5eb5662ac1`.

The acquisition-generation next dependency was fresh common sampling without an invented expected PNG receipt. That prerequisite is now closed by the [shared scientific sampler](experience-allwise-fresh-tan-sampling-2026-10-02.md) and [full-array independent readback](experience-m82-fresh-sampler-independent-review-2026-10-02.md), including preserved M42 pixels, metadata and QC. Actual M82 DETAIL has 262125 finite and 19 nonfinite target samples; the old core's 17 near-black pixels are finite positive measurements distinct from those 19. A subsequent [single shared-display trial](experience-m82-detail-display-trial-2026-10-02.md) was generated and viewed: its dark core and softness remain, so it is not an adopted quality repair. Those later generations do not rewrite this acquisition's original receipts. Source artifacts, display quality and complete three-level publication remain open.

Overview still lacks `Norder4/Dir0/Npix475.fits`; medium lacks order7 pixels `30415`, `30424`, `30425`, `30426`, `30427`, `30448`, `30449`, `30450`. They were not requested by this DETAIL run; their bytes remain unknown. All historical plans/receipts, old published manifest/assets and six unrelated settings/outbox files remain unchanged. This acquisition generation performed no image generation, public route replacement, deployment, device action, commit or push; later diagnostic generations are linked above.
