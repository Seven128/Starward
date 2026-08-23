# EOG VIIRS annual night-light publication

This pipeline is the only current publisher for Mini Program satellite night-light estimates. It accepts an operator-acquired EOG Annual VNL V2.2 radiance GeoTIFF and its matching cloud-free-coverage GeoTIFF. It never downloads through a hidden URL, guesses a provider session, or converts radiance directly into Bortle/SQM.

1. Acquire the current objects through the official EOG account flow and retain the product readme/licence.
2. Copy `manifest.example.json`, fill the exact filenames and SHA-256 digests, and choose the bounded trial AOI.
3. Install `requirements.txt` in an isolated Python environment.
4. Run `python publish_eog_viirs.py --manifest <manifest.json>` with `DATABASE_URL` set.

The command verifies hashes, CRS, grid alignment, AOI coverage and cloud-free counts; derives trial-region relative radiance bands; samples every stored spot; writes at most 512 coarse native-map cells; and atomically publishes the dataset. Increase `gridStridePixels` when a selected AOI would exceed that fail-closed device budget. Changed light estimates increment the affected spot revision, so prior publication assessments become stale and the normal server-owned completeness gate must be rerun before a formal spot is visible again.

The output labels are explicitly satellite-radiance estimates. They are not field measurements, exact sky brightness, Bortle classes, or a promise of naked-eye visibility.
