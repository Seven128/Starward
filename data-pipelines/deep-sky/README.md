# AllWISE W3 deep-sky imagery publication

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
