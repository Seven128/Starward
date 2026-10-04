# Actual quality inputs for the other five contributing M51 fields

Status: the exact twenty previously missing acquired sources now have complete bounded readback and field/band/processing association through the frozen shared owner. Independent batch review is a separate obligation. This supplies diagnostic inputs for all six contributing fields when combined with the original four core-field inputs; it does not accept the mosaic's scientific/image quality or apply a mask/PSF/display policy.

## Exact identity, inventory and synthetic-source boundary

The frozen mosaic `output/sdss-m51-gri-mosaic-candidate-1002-r2/candidate.json` SHA256 `73e65a693216b40079b512acdf17b32742be5db7091fb9bcf1db9de152650b52` contains the real eighteen g/r/i sources. This batch takes only the other five field identities, each with a nonzero actual common contribution:

| Rerun/run/camcol/field | Common master pixels in frozen candidate |
| --- | ---: |
| 301/3699/6/99 | 464512 |
| 301/3699/6/101 | 616585 |
| 301/3716/6/116 | 164849 |
| 301/3716/6/117 | 1121555 |
| 301/3716/6/118 | 520970 |

Core field3699/6/100, all corrected frames, Moon inputs and the noncontributing3716/camcol5/117 remain excluded from requests. The canonical redux origin follows the already verified [SDSS pipeline template](https://www.sdss4.org/dr17/imaging/pipeline/): `https://data.sdss.org/sas/dr17/eboss/photo/redux/301/{run}/objcs/6/{filename}`.

The initial `rg --files -uuu output .codex data-pipelines workers/miniapp-api/assets` inventory was preserved as `output/sdss-contributing-quality-stock-1002-r1`: nineteen raw filenames were absent, with one matching name. That matching `psField-003699-6-0101.fit` was the independent review's explicitly synthetic different-field control, SHA256 `2f59c889f66d26c4c39b73ca71ab6a8b5602340676bb0f251d1e52e2db936575`, not acquired source data. It was derived from field100 by changed metadata. Canonical-form filename/URL, local hash and single-file structural success do not turn a fixture into a provider acquisition.

The controlling stock r2 binds and excludes that exact fixture with its independent review proof. All **twenty genuine acquisition inputs** were missing. Stock r1 was not overwritten. `output/sdss-contributing-quality-stock-1002-r2/input-manifest.json` SHA256 is `64db3bc0301f977549b2d6b67c8589cbb534c2911680e5c34cc43d90e6e8b0d2`, binding `a05a1b39c7be73996e607ac4b60172a9cfbca013fa2cb294fa7e28e224d3aa6b`. Stock preparation made zero requests. Other unidentified cached matches would be retained as unknown without a new request; only this byte-bound proved fixture is excluded.

The real new field101 psField now has SHA256 `8c33bb742ed47b225990f01b713bb202de0ebb08842cbb6fa1e4063726fca939`, distinct from the retained fixture. Its real HTTP receipt and bytes, not the synthetic control's canonical-form reference, govern source reuse.

## Once-only acquisition and all twenty results

After the shared core quality owner and actual consumer passed [independent review](experience-sdss-core-quality-independent-review-2026-10-02.md), root explicitly authorized this exact batch. The executed task script is `scripts/experience-sdss-contributing-quality-inputs-2026-10-02.py`, SHA256 `1a2cc6a3ac9fa2bc5a6fa1b8b8eae3ab8bbb69d55d7e0ee1a22a55dbc29f2830`. It requires the exact versioned manifest/hash and `--execute-once`, rechecks caches before requests, and reuses the exercised task's redirect guard, atomic receipt writer and byte/table summaries. The production quality owner stayed SHA256 `0e450d57d13baa31d1029a6e66435d2dcdd420e866ffe1633b8c3f1ecb02bbeb`.

Each genuinely absent file had one canonical HTTPS attempt, default CA/hostname verification, no redirects/retries, socket30s/whole child40s, 4MiB raw and 16MiB decoded caps. Batch ceilings are eighty MiB raw and320MiB decoded, with sequential children. Each file's receipt is saved independently before/after transfer and admission; a failed file cannot erase valid neighbours. Unknown byte counts remain null. The actual outcome had no failures/unsupported variants, so no fallback, retry or guessed missing mask was generated.

Every row below returned HTTP200 with the exact canonical final URL and reached `DIAGNOSTIC_STRUCTURE_CHECKED_SCIENTIFIC_QUALITY_UNKNOWN`:

| Exact file | Received raw bytes |
| --- | ---: |
| psField-003699-6-0099.fit | 420480 |
| fpM-003699-g6-0099.fit.gz | 95392 |
| fpM-003699-r6-0099.fit.gz | 101741 |
| fpM-003699-i6-0099.fit.gz | 99996 |
| psField-003699-6-0101.fit | 423360 |
| fpM-003699-g6-0101.fit.gz | 108177 |
| fpM-003699-r6-0101.fit.gz | 110907 |
| fpM-003699-i6-0101.fit.gz | 108905 |
| psField-003716-6-0116.fit | 420480 |
| fpM-003716-g6-0116.fit.gz | 99783 |
| fpM-003716-r6-0116.fit.gz | 101958 |
| fpM-003716-i6-0116.fit.gz | 104218 |
| psField-003716-6-0117.fit | 420480 |
| fpM-003716-g6-0117.fit.gz | 99881 |
| fpM-003716-r6-0117.fit.gz | 139457 |
| fpM-003716-i6-0117.fit.gz | 43009 |
| psField-003716-6-0118.fit | 420480 |
| fpM-003716-g6-0118.fit.gz | 105515 |
| fpM-003716-r6-0118.fit.gz | 108236 |
| fpM-003716-i6-0118.fit.gz | 111593 |

Actual raw total is3644048 bytes; total decoded FITS is6546240 bytes. Real per-file raw/decode SHA256, lengths, HTTP times/final URLs, complete gzip/FITS/heap/column readback, actual headers and semantic receipts are in the immutable acquisition generation:

- `output/sdss-contributing-quality-inputs-1002-r1/acquisition.json`, SHA256 `901b671c84da7799c85f092c3a15652fc1e7eb37e508e56863a2d961d463ff31`.
- `binding.json`, SHA256 `909b985bfe897f75c0282c5c2df8d3c166c71b6711f0e32b6a065334518204ed`.
- Exact executed snapshot, approved manifest, versioned coded-child inputs, per-file request/inspection/quality-admission receipts, decoded FITS and five association readbacks are retained in that directory. No scientific/flag/kernel NPY or display PNG was produced by this acquisition task.

## Actual association and remaining quality meaning

All five new psFields have actual u/g/r/i/z order, four basis rows per band and supported51×51 eigenimages. Declared coefficients and signed basis samples pass the frozen owner; inactive NaNs survive without rejecting active terms. Actual u/g/r/i/z status vectors are field99 `[0,0,0,0,0]`, field101 `[32,0,0,0,0]`, field116 `[0,0,0,0,0]`, fields117/118 `[64,0,0,0,0]`. These are retained raw statuses, not an assessment of spatial PSF or whole-source quality. All masks passed actual enum/SPAN/heap/bbox/npix/canonical-run checks under the current zero-offset, nonempty-object qualification. Other variation support was not invented to make the batch pass.

`check_frame_quality` correlated each field's newly acquired psField and respective g/r/i fpM with the old eighteen-source cache, without any frame request. All fifteen new associations report PS_ID MATCH:3699 fields share `2009-05-26T23:29:46 08880 camCol 6`, and3716 fields share `2009-05-27T08:22:49 04865 camCol 6`. Each association explicitly retains `availability=NOT_ASSESSED`, `quality=UNKNOWN`. Header RERUN and fpM FILTER/FILTERS omissions remain actual unknowns; canonical path provenance is distinct.

Bindings verify the original four quality inputs/receipts, corrected-source cache, frozen r2 candidate, all201 published files, six unrelated retained files, code owners and synthetic fixture unchanged. No science pixels, availability, coadd weights, source quality policy, transfer mapping, PNG, publication, deployment or native session changed.

These complete inputs enable the next real six-field quality diagnostic. They do not decide rejection/weighting from flag labels, infer masks from brightness, establish true PSF/star accuracy, fix colour/softness, or certify a new mosaic/native experience. Independent batch evidence and any later scientific/display action must stay tied to their own actual inputs/owners/outputs.
